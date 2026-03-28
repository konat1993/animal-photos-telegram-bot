"""Tests for coordinate parsing from plain text and map URLs (no external APIs)."""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest

from backend.app.services.location_from_text import (
    ResolvedCoords,
    _extract_from_url_text,
    _plain_coords_line,
    resolve_location_text,
)


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("52.2297, 21.0122", (52.2297, 21.0122)),
        ("52.2297;21.0122", (52.2297, 21.0122)),
        ("-33.8688, 151.2093", (-33.8688, 151.2093)),
    ],
)
def test_plain_coords_line(text: str, expected: tuple[float, float]) -> None:
    got = _plain_coords_line(text)
    assert got is not None
    assert got.latitude == pytest.approx(expected[0])
    assert got.longitude == pytest.approx(expected[1])


@pytest.mark.parametrize(
    "blob",
    [
        "https://www.google.com/maps/@52.2297,21.0122,15z",
        "something !3d52.2297!4d21.0122 end",
        "?ll=52.2297,21.0122",
    ],
)
def test_extract_from_url_text_patterns(blob: str) -> None:
    found = _extract_from_url_text(blob)
    assert found is not None
    assert found.latitude == pytest.approx(52.2297)
    assert found.longitude == pytest.approx(21.0122)


@pytest.mark.asyncio
async def test_resolve_location_text_plain_strips_whitespace() -> None:
    with patch(
        "backend.app.services.location_from_text._infer_with_openai",
        new_callable=AsyncMock,
    ) as infer:
        r = await resolve_location_text("  10.0 , 20.0  ")
        assert r == ResolvedCoords(latitude=10.0, longitude=20.0)
        infer.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_location_text_google_maps_at_pattern() -> None:
    with patch(
        "backend.app.services.location_from_text._infer_with_openai",
        new_callable=AsyncMock,
    ) as infer:
        r = await resolve_location_text(
            "https://www.google.com/maps/@48.8566,2.3522,12z"
        )
        assert r is not None
        assert r.latitude == pytest.approx(48.8566)
        assert r.longitude == pytest.approx(2.3522)
        infer.assert_not_called()


@pytest.mark.asyncio
async def test_resolve_location_text_empty_returns_none() -> None:
    assert await resolve_location_text("") is None
    assert await resolve_location_text("   ") is None


@pytest.mark.asyncio
async def test_resolve_location_text_fallback_openai() -> None:
    infer = AsyncMock(
        return_value=ResolvedCoords(latitude=1.0, longitude=2.0)
    )
    with patch(
        "backend.app.services.location_from_text._infer_with_openai", infer
    ):
        r = await resolve_location_text("some place name only")
    assert r == ResolvedCoords(latitude=1.0, longitude=2.0)
    infer.assert_awaited_once()
