import logging
import uuid
from fastapi import APIRouter, Request, HTTPException

from ..models.schemas import (
    AnimalReportCreate,
    TelegramUpdate,
    effective_message_location,
)
from ..core.config import settings
from ..services import telegram_client, supabase_client, vision_ai
from ..services.location_from_text import resolve_location_text

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory store: user_id -> {file_id, file_unique_id}
pending_photos: dict[str, dict] = {}

LOCATION_HINT = (
    "📍 Send where you saw it:\n"
    "• Telegram: attach → Location, or\n"
    "• Paste a Google Maps link (short links work), or\n"
    "• Two numbers: latitude, longitude — e.g. 52.2297, 21.0122"
)

LOCATION_PARSE_FAIL = "❌ I couldn't read coordinates from that.\n\n" + LOCATION_HINT

WELCOME = (
    "👋 Welcome! Send me a photo of an animal you spotted and I'll identify it for you.\n"
    "Then send where you saw it — same options as below:\n\n" + LOCATION_HINT
)


def _report_success_footer() -> str:
    """Short link-out after a saved report (English copy for end users)."""
    return (
        "\n\n────────\n"
        "🌐 You can find reports from other observers, a map, and collective statistics "
        "on the project website:\n"
        f"{settings.public_dashboard_url}"
    )


async def _complete_report(
    chat_id: int | str,
    user_id: str,
    file_id: str,
    latitude: float,
    longitude: float,
) -> None:
    await telegram_client.send_message(chat_id, "🔍 Analyzing your photo, please wait...")

    step = "telegram_get_file"
    try:
        file_info = await telegram_client.get_file(file_id)
        file_path = file_info["file_path"]
        step = "telegram_download"
        image_bytes = await telegram_client.download_file(file_path)

        ext = ".jpg"
        if "." in file_path:
            tail = file_path.rsplit(".", 1)[-1].lower()
            if tail in ("jpg", "jpeg", "png", "webp", "gif"):
                ext = f".{tail}" if tail != "jpeg" else ".jpg"
        filename = f"{uuid.uuid4()}{ext}"
        step = "supabase_upload"
        photo_path, photo_url = await supabase_client.upload_photo(image_bytes, filename)

        step = "openai_vision"
        vision_result = await vision_ai.analyze_image(
            image_bytes,
            mime_type=vision_ai.mime_type_for_telegram_path(file_path),
        )

        step = "supabase_insert"
        report = AnimalReportCreate(
            telegram_user_id=user_id,
            photo_path=photo_path,
            photo_url=photo_url,
            latitude=latitude,
            longitude=longitude,
            identified_species=vision_result.identified_species,
            confidence=vision_result.confidence,
            safety_note=vision_result.safety_note,
            raw_ai_response=vision_result.model_dump(mode="json"),
        )
        await supabase_client.insert_report(report)

        confidence_str = ""
        if vision_result.confidence is not None:
            confidence_str = f" (confidence: {vision_result.confidence:.0%})"

        reply = (
            f"✅ Report saved!\n\n"
            f"🐾 Species: {vision_result.identified_species}{confidence_str}\n"
            f"⚠️ {vision_result.safety_note}"
            f"{_report_success_footer()}"
        )
        step = "telegram_reply"
        await telegram_client.send_message(chat_id, reply)
        logger.info(
            "Processed report for user %s: %s at %s,%s",
            user_id,
            vision_result.identified_species,
            latitude,
            longitude,
        )
    except Exception:
        logger.exception(
            "Report pipeline failed at step=%s user_id=%s", step, user_id)
        raise


@router.post("/webhook")
async def telegram_webhook(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    try:
        update = TelegramUpdate.model_validate(body)
    except Exception as e:
        logger.warning(
            "Could not parse Telegram update: %s | body: %s", e, body)
        return {"ok": True}

    message = update.message
    if not message:
        return {"ok": True}

    raw_chat_id = message.chat.get("id")
    if not isinstance(raw_chat_id, (int, str)):
        logger.warning(
            "Telegram update missing valid chat id: %s", message.chat)
        return {"ok": True}
    chat_id: int | str = raw_chat_id

    user_id = str(message.from_.get("id")) if message.from_ else str(chat_id)
    loc_point = effective_message_location(message)

    try:
        if message.photo:
            best_photo = max(message.photo, key=lambda p: p.width * p.height)
            pending_photos[user_id] = {
                "file_id": best_photo.file_id,
                "file_unique_id": best_photo.file_unique_id,
            }
            logger.info("Stored pending photo for user %s: %s",
                        user_id, best_photo.file_id)

            if message.caption and message.caption.strip():
                coords = await resolve_location_text(message.caption)
                if coords:
                    pending = pending_photos.pop(user_id)
                    await _complete_report(
                        chat_id,
                        user_id,
                        pending["file_id"],
                        coords.latitude,
                        coords.longitude,
                    )
                    return {"ok": True}

            await telegram_client.send_message(chat_id, LOCATION_HINT)

        elif loc_point is not None and user_id in pending_photos:
            pending = pending_photos.pop(user_id)
            await _complete_report(
                chat_id,
                user_id,
                pending["file_id"],
                loc_point.latitude,
                loc_point.longitude,
            )

        elif message.text and user_id in pending_photos:
            coords = await resolve_location_text(message.text)
            if coords:
                pending = pending_photos.pop(user_id)
                await _complete_report(
                    chat_id,
                    user_id,
                    pending["file_id"],
                    coords.latitude,
                    coords.longitude,
                )
            else:
                await telegram_client.send_message(chat_id, LOCATION_PARSE_FAIL)

        elif loc_point is not None and user_id not in pending_photos:
            await telegram_client.send_message(
                chat_id,
                "📸 Please send a photo of the animal first, then share your location.",
            )

        else:
            await telegram_client.send_message(chat_id, WELCOME)

    except Exception as e:
        logger.exception(
            "Error processing webhook update %s: %s", update.update_id, e)
        try:
            await telegram_client.send_message(
                chat_id,
                "❌ Something went wrong while processing your request. Please try again.",
            )
        except Exception:
            pass

    return {"ok": True}
