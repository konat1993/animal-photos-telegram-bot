"""Tests for reverse geocode helpers and formatting."""

from __future__ import annotations

import httpx
import pytest
import respx

from backend.app.services.reverse_geocode import (
    LocationLabels,
    format_location_context_for_vision,
    resolve_location_labels,
)


def test_format_location_context_coords_only_when_empty_labels() -> None:
    text = format_location_context_for_vision(
        LocationLabels(), 52.12345, 21.98765
    )
    assert "reverse geocoding failed" in text.lower()
    assert "52.12345" in text
    assert "21.98765" in text


def test_format_location_context_includes_labels() -> None:
    labels = LocationLabels(
        continent="Europe",
        country="Poland",
        region="Mazovia",
    )
    text = format_location_context_for_vision(labels, 52.1, 21.0)
    assert "Europe" in text
    assert "Poland" in text
    assert "Mazovia" in text
    assert "52.10000" in text or "52.1" in text


@respx.mock
@pytest.mark.asyncio
async def test_resolve_location_labels_happy_path() -> None:
    respx.get(url__regex=r"https://nominatim\.openstreetmap\.org/reverse.*").mock(
        return_value=httpx.Response(
            200,
            json={
                "address": {
                    "country": "Poland",
                    "country_code": "pl",
                    "state": "Mazovia",
                }
            },
        )
    )
    respx.get("https://restcountries.com/v3.1/alpha/PL").mock(
        return_value=httpx.Response(
            200,
            json=[{"continents": ["Europe"]}],
        )
    )

    labels = await resolve_location_labels(52.23, 21.01)
    assert labels.country == "Poland"
    assert labels.region == "Mazovia"
    assert labels.continent == "Europe"


@respx.mock
@pytest.mark.asyncio
async def test_resolve_location_labels_nominatim_failure_returns_empty() -> None:
    respx.get(url__regex=r"https://nominatim\.openstreetmap\.org/reverse.*").mock(
        return_value=httpx.Response(500)
    )

    labels = await resolve_location_labels(0.0, 0.0)
    assert labels == LocationLabels()
