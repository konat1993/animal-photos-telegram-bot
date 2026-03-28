"""Reverse geocoding: continent, country, region for storage and Vision context."""

import logging
from dataclasses import dataclass
from typing import Any

import httpx

from ..core.config import settings

logger = logging.getLogger(__name__)

NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"
RESTCOUNTRIES_ALPHA = "https://restcountries.com/v3.1/alpha"


@dataclass
class LocationLabels:
    """Human-readable labels from coordinates (best effort; may be empty)."""

    continent: str | None = None
    country: str | None = None
    region: str | None = None


def _pick_region(address: dict[str, Any]) -> str | None:
    """Prefer state/province, then county, then region."""
    for key in ("state", "region", "county", "state_district"):
        val = address.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


async def _continent_for_country_code(country_code: str) -> str | None:
    cc = country_code.strip().upper()
    if len(cc) != 2:
        return None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(f"{RESTCOUNTRIES_ALPHA}/{cc}")
            if r.status_code != 200:
                return None
            data = r.json()
            if not isinstance(data, list) or not data:
                return None
            continents = data[0].get("continents") or []
            if continents and isinstance(continents[0], str):
                return continents[0]
    except Exception:
        logger.warning("restcountries lookup failed for %s", cc, exc_info=True)
    return None


async def resolve_location_labels(latitude: float, longitude: float) -> LocationLabels:
    """
    Resolve continent, country, and region from coordinates.
    Returns empty LocationLabels if reverse geocoding fails.
    """
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                NOMINATIM_REVERSE,
                params={
                    "lat": latitude,
                    "lon": longitude,
                    "format": "json",
                    "accept-language": "en",
                },
                headers={"User-Agent": settings.geocoding_user_agent},
            )
            r.raise_for_status()
            payload = r.json()
    except Exception:
        logger.warning(
            "Nominatim reverse failed for %s,%s", latitude, longitude, exc_info=True
        )
        return LocationLabels()

    address = payload.get("address") or {}
    if not isinstance(address, dict):
        address = {}

    country = address.get("country")
    if isinstance(country, str):
        country = country.strip() or None
    else:
        country = None

    country_code = address.get("country_code")
    if isinstance(country_code, str):
        country_code = country_code.strip().lower() or None
    else:
        country_code = None

    region = _pick_region(address)

    continent: str | None = None
    if country_code:
        continent = await _continent_for_country_code(country_code)

    return LocationLabels(continent=continent, country=country, region=region)


def format_location_context_for_vision(
    labels: LocationLabels, latitude: float, longitude: float
) -> str:
    """English block for OpenAI Vision (same semantics as before refactor)."""
    coord_line = f"Coordinates (WGS84): {latitude:.5f}, {longitude:.5f}"
    if not labels.continent and not labels.country and not labels.region:
        return (
            "Geographic context (coordinates only; reverse geocoding failed):\n"
            f"{coord_line}"
        )

    lines = [
        "Geographic context for this observation (approximate, from coordinates):",
    ]
    if labels.continent:
        lines.append(f"- Continent: {labels.continent}")
    if labels.country:
        lines.append(f"- Country: {labels.country}")
    if labels.region:
        lines.append(f"- Region / area: {labels.region}")
    lines.append(f"- {coord_line}")
    return "\n".join(lines)


async def build_location_context_for_vision(latitude: float, longitude: float) -> str:
    """Convenience: resolve labels and format for Vision (single call)."""
    labels = await resolve_location_labels(latitude, longitude)
    return format_location_context_for_vision(labels, latitude, longitude)
