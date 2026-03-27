"""
Resolve latitude/longitude from user text: Google Maps URLs, plain coords, OpenAI fallback.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from urllib.parse import parse_qs, unquote, urlparse

import httpx
from openai import AsyncOpenAI

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None


def _get_openai() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _client


@dataclass(frozen=True)
class ResolvedCoords:
    latitude: float
    longitude: float


def _valid_lat_lng(lat: float, lng: float) -> bool:
    return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0


def _pair_from_strings(lat_s: str, lng_s: str) -> ResolvedCoords | None:
    try:
        lat = float(lat_s.replace(",", "."))
        lng = float(lng_s.replace(",", "."))
    except ValueError:
        return None
    if _valid_lat_lng(lat, lng):
        return ResolvedCoords(latitude=lat, longitude=lng)
    return None


def _coords_from_query_value(raw: str) -> ResolvedCoords | None:
    raw = raw.strip()
    parts = re.split(r"[\s,;]+", raw, maxsplit=1)
    if len(parts) != 2:
        return None
    if re.match(r"^-?\d+\.?\d*$", parts[0]) and re.match(r"^-?\d+\.?\d*$", parts[1]):
        return _pair_from_strings(parts[0], parts[1])
    return None


def _extract_from_url_text(text: str) -> ResolvedCoords | None:
    """Parse coordinates embedded in a URL or long string (no HTTP)."""
    m = re.search(r"!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)", text)
    if m:
        found = _pair_from_strings(m.group(1), m.group(2))
        if found:
            return found

    m = re.search(r"@(-?\d+\.?\d*),(-?\d+\.?\d*)", text)
    if m:
        found = _pair_from_strings(m.group(1), m.group(2))
        if found:
            return found

    m = re.search(r"[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)", text, re.I)
    if m:
        found = _pair_from_strings(m.group(1), m.group(2))
        if found:
            return found

    if text.startswith("http"):
        parsed = urlparse(text)
        qs = parse_qs(parsed.query)
        for key in ("q", "query"):
            if key not in qs:
                continue
            raw = unquote(qs[key][0]).strip()
            found = _coords_from_query_value(raw)
            if found:
                return found

    return None


def _plain_coords_line(text: str) -> ResolvedCoords | None:
    t = text.strip()
    m = re.match(
        r"^\s*(-?\d+\.?\d*)\s*[,;]\s*(-?\d+\.?\d*)\s*$",
        t,
    )
    if m:
        return _pair_from_strings(m.group(1), m.group(2))
    m = re.match(r"^\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*$", t)
    if m:
        return _pair_from_strings(m.group(1), m.group(2))
    return None


def _extract_urls(text: str) -> list[str]:
    return re.findall(r"https?://[^\s<>\[\]()]+", text, re.I)


def _short_maps_link(url: str) -> bool:
    try:
        h = urlparse(url).netloc.lower()
    except Exception:
        return False
    return h == "goo.gl" or h.endswith(".goo.gl") or h == "maps.app.goo.gl"


def _is_safe_post_redirect_url(url: str) -> bool:
    p = urlparse(url)
    if p.scheme not in ("http", "https"):
        return False
    h = (p.hostname or "").lower()
    if not h or h == "localhost":
        return False
    return h == "maps.google.com" or h.endswith(".google.com") or h.endswith(".google.pl")


async def _expand_short_url(url: str) -> str:
    if not _short_maps_link(url):
        return url

    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            max_redirects=8,
            timeout=15.0,
            headers={"User-Agent": "AnimalReportsBot/1.0"},
        ) as client:
            r = await client.get(url)
            final = str(r.url)
            if _is_safe_post_redirect_url(final):
                return final
            logger.warning("Short URL redirect ended on disallowed host, ignoring: %s", final)
            return url
    except Exception as e:
        logger.warning("Could not expand URL %s: %s", url, e)
        return url


async def _parse_after_expand(text: str) -> ResolvedCoords | None:
    for raw_url in _extract_urls(text):
        cleaned = raw_url.strip().rstrip(").,;")
        expanded = await _expand_short_url(cleaned)
        found = _extract_from_url_text(expanded)
        if found:
            return found
        found = _extract_from_url_text(cleaned)
        if found:
            return found
    return None


_LOCATION_AI_SYSTEM = (
    "You extract geographic coordinates from a short user message. "
    "The user is trying to specify a map location (e.g. Google Maps link text, "
    "decimal coordinates, or coordinates embedded in a messy string). "
    "Respond ONLY with compact JSON, no markdown:\n"
    '{"latitude": <number or null>, "longitude": <number or null>, "confidence": "high"|"medium"|"low"|"none"}\n'
    "Rules: latitude must be -90..90, longitude -180..180. "
    "If the message is only a place name with no numbers, use null, null, confidence none. "
    "Prefer the primary / most likely pin from a maps-style string."
)


async def _infer_with_openai(text: str) -> ResolvedCoords | None:
    if not text.strip():
        return None
    client = _get_openai()
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": _LOCATION_AI_SYSTEM},
                {"role": "user", "content": text[:4000]},
            ],
            max_tokens=120,
        )
    except Exception as e:
        logger.warning("OpenAI location inference failed: %s", e)
        return None

    raw = (response.choices[0].message.content or "").strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{[^{}]*\}", raw, re.DOTALL)
        if not m:
            return None
        try:
            parsed = json.loads(m.group())
        except json.JSONDecodeError:
            return None

    lat = parsed.get("latitude")
    lng = parsed.get("longitude")
    conf = (parsed.get("confidence") or "none").lower()
    if lat is None or lng is None or conf == "none":
        return None
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        return None
    if not _valid_lat_lng(lat_f, lng_f):
        return None
    return ResolvedCoords(latitude=lat_f, longitude=lng_f)


async def resolve_location_text(text: str) -> ResolvedCoords | None:
    if not text or not text.strip():
        return None

    stripped = text.strip()

    plain = _plain_coords_line(stripped)
    if plain:
        return plain

    url_result = await _parse_after_expand(stripped)
    if url_result:
        return url_result

    blob = _extract_from_url_text(stripped)
    if blob:
        return blob

    return await _infer_with_openai(stripped)
