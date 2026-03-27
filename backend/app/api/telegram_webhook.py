import logging
import uuid
from fastapi import APIRouter, Request, HTTPException

from backend.app.models.schemas import TelegramUpdate, AnimalReportCreate
from backend.app.services import telegram_client, supabase_client, vision_ai

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store: user_id -> {file_id, file_unique_id}
pending_photos: dict[str, dict] = {}


@router.post("/webhook")
async def telegram_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        update = TelegramUpdate.model_validate(body)
    except Exception as e:
        logger.warning("Could not parse Telegram update: %s | body: %s", e, body)
        return {"ok": True}

    message = update.message
    if not message:
        return {"ok": True}

    chat_id = message.chat.get("id")
    user_id = str(message.from_.get("id")) if message.from_ else str(chat_id)

    try:
        if message.photo:
            # User sent a photo – store best quality and ask for location
            best_photo = max(message.photo, key=lambda p: p.width * p.height)
            pending_photos[user_id] = {
                "file_id": best_photo.file_id,
                "file_unique_id": best_photo.file_unique_id,
            }
            logger.info("Stored pending photo for user %s: %s", user_id, best_photo.file_id)
            await telegram_client.send_message(
                chat_id,
                "📍 Great! Now please share your location so I can record where you spotted this animal.",
            )

        elif message.location and user_id in pending_photos:
            # User sent location and we have a pending photo – process full flow
            location = message.location
            pending = pending_photos.pop(user_id)
            file_id = pending["file_id"]

            await telegram_client.send_message(chat_id, "🔍 Analyzing your photo, please wait...")

            # 1. Download photo from Telegram
            file_info = await telegram_client.get_file(file_id)
            file_path = file_info["file_path"]
            image_bytes = await telegram_client.download_file(file_path)

            # 2. Upload to Supabase Storage
            filename = f"{uuid.uuid4()}.jpg"
            photo_path, photo_url = await supabase_client.upload_photo(image_bytes, filename)

            # 3. Analyze with OpenAI Vision
            vision_result = await vision_ai.analyze_image(image_bytes)

            # 4. Insert report into DB
            report = AnimalReportCreate(
                telegram_user_id=user_id,
                photo_path=photo_path,
                photo_url=photo_url,
                latitude=location.latitude,
                longitude=location.longitude,
                identified_species=vision_result.identified_species,
                confidence=vision_result.confidence,
                safety_note=vision_result.safety_note,
                raw_ai_response=vision_result.model_dump(),
            )
            await supabase_client.insert_report(report)

            # 5. Reply to user
            confidence_str = ""
            if vision_result.confidence is not None:
                confidence_str = f" (confidence: {vision_result.confidence:.0%})"

            reply = (
                f"✅ Report saved!\n\n"
                f"🐾 Species: {vision_result.identified_species}{confidence_str}\n"
                f"⚠️ {vision_result.safety_note}"
            )
            await telegram_client.send_message(chat_id, reply)
            logger.info(
                "Processed report for user %s: %s at %s,%s",
                user_id,
                vision_result.identified_species,
                location.latitude,
                location.longitude,
            )

        elif message.location and user_id not in pending_photos:
            await telegram_client.send_message(
                chat_id,
                "📸 Please send a photo of the animal first, then share your location.",
            )

        else:
            # Any other message
            await telegram_client.send_message(
                chat_id,
                "👋 Welcome! Send me a photo of an animal you spotted and I'll identify it for you.\n"
                "Then share your location and I'll save the report.",
            )

    except Exception as e:
        logger.exception("Error processing webhook update %s: %s", update.update_id, e)
        try:
            await telegram_client.send_message(
                chat_id,
                "❌ Something went wrong while processing your request. Please try again.",
            )
        except Exception:
            pass

    return {"ok": True}
