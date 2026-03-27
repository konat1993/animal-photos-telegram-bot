import base64
import json
import logging
from openai import AsyncOpenAI
from backend.app.core.config import settings
from backend.app.models.schemas import VisionResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a wildlife identification AI. Analyze the image and respond ONLY with valid JSON "
    "in this exact format, no additional text:\n"
    '{"identified_species": "<species name or Unknown>", "confidence": <0.0-1.0 or null>, "safety_note": "<one sentence safety note>"}'
)

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


def mime_type_for_telegram_path(file_path: str) -> str:
    """Telegram file_path suffix reflects real bytes; wrong MIME breaks some Vision calls."""
    lower = file_path.lower()
    if lower.endswith(".png"):
        return "image/png"
    if lower.endswith(".webp"):
        return "image/webp"
    if lower.endswith(".gif"):
        return "image/gif"
    return "image/jpeg"


async def analyze_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> VisionResult:
    """Send image to OpenAI Vision and return parsed VisionResult."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    client = get_client()

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64}", "detail": "low"},
                    },
                ],
            },
        ],
        max_tokens=300,
    )

    raw_text = response.choices[0].message.content or "{}"
    logger.info("OpenAI Vision raw response: %s", raw_text)

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError:
        # Try extracting JSON from response if surrounded by markdown
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            parsed = json.loads(match.group())
        else:
            logger.error("Could not parse OpenAI response as JSON: %s", raw_text)
            parsed = {"identified_species": "Unknown", "confidence": None, "safety_note": "Could not analyze image."}

    return VisionResult(
        identified_species=parsed.get("identified_species", "Unknown"),
        confidence=parsed.get("confidence"),
        safety_note=parsed.get("safety_note", "No safety information available."),
    )
