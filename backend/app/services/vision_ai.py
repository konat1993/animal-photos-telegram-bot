import base64
import json
import logging
from typing import Any

from openai import AsyncOpenAI
from ..core.config import settings
from ..models.schemas import VisionResult

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a wildlife field-identification AI. The user may send a live animal, a carcass, OR "
    "field sign: footprints/tracks in mud or snow, scat, feathers, fur, burrows, rubbings, etc.\n"
    "The user message may include geographic context (continent, country, region, coordinates). "
    "When the image is ambiguous, use that context to prefer species that are native or commonly "
    "found in that area. If the image clearly shows a species inconsistent with the region, trust "
    "the image and mention the inconsistency briefly in safety_note — do not force a local species.\n"
    "For TRACKS and FOOTPRINTS specifically: infer species from anatomy of the print — number and "
    "shape of toes, claws, hoof symmetry, dewclaw / interdigital marks behind cloven hooves, "
    "pad shape, gait patterns if multiple prints are visible. Name the most likely wild species "
    "(e.g. wild boar, roe deer, red deer, wolf, fox, badger) when evidence fits; use a concise "
    "common English name. Reserve \"Unknown\" only when the image has almost no usable track detail "
    "(blur, no print visible). If scale is unclear or several species overlap in appearance, still "
    "give your best hypothesis with LOWER confidence (e.g. 0.35–0.55) and say uncertainty briefly "
    "in safety_note — do not default to Unknown just to be cautious.\n"
    "Respond ONLY with valid JSON, no markdown or extra text:\n"
    '{"identified_species": "<species name or Unknown>", "confidence": <0.0-1.0 or null>, '
    '"safety_note": "<one sentence: practical caution + uncertainty if any>"}'
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


async def analyze_image(
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
    *,
    location_context: str | None = None,
) -> VisionResult:
    """Send image (and optional geographic context text) to OpenAI Vision and return VisionResult."""
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    client = get_client()

    user_content: list[dict[str, Any]] = []
    if location_context and location_context.strip():
        user_content.append({"type": "text", "text": location_context.strip()})
    user_content.append(
        {
            "type": "image_url",
            # "high" preserves small track features (dewclaws, toe edges) better than "low".
            "image_url": {"url": f"data:{mime_type};base64,{b64}", "detail": "high"},
        }
    )

    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": user_content,
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
            logger.error(
                "Could not parse OpenAI response as JSON: %s", raw_text)
            parsed = {"identified_species": "Unknown", "confidence": None,
                      "safety_note": "Could not analyze image."}

    return VisionResult(
        identified_species=parsed.get("identified_species", "Unknown"),
        confidence=parsed.get("confidence"),
        safety_note=parsed.get(
            "safety_note", "No safety information available."),
    )
