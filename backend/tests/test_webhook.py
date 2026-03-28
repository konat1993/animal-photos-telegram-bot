"""Integration-style tests for FastAPI app and Telegram webhook (external APIs mocked)."""

from __future__ import annotations

from unittest.mock import AsyncMock

import httpx
import pytest
from pytest_mock import MockerFixture

from backend.app.api import telegram_webhook as tw
from backend.app.main import app
from backend.app.models.schemas import VisionResult
from backend.app.services.reverse_geocode import LocationLabels


@pytest.fixture(autouse=True)
def clear_pending_photos() -> None:
    tw.pending_photos.clear()
    yield
    tw.pending_photos.clear()


@pytest.mark.asyncio
async def test_health() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_webhook_invalid_json_returns_400() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        r = await client.post(
            "/telegram/webhook",
            content=b"not-json",
            headers={"content-type": "application/json"},
        )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_webhook_malformed_update_returns_ok() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        r = await client.post(
            "/telegram/webhook",
            json={"update_id": 1},
        )
    assert r.status_code == 200
    assert r.json().get("ok") is True


@pytest.mark.asyncio
async def test_photo_then_location_completes_pipeline(mocker: MockerFixture) -> None:
    send = mocker.patch(
        "backend.app.api.telegram_webhook.telegram_client.send_message",
        new_callable=AsyncMock,
    )
    mocker.patch(
        "backend.app.api.telegram_webhook.telegram_client.get_file",
        return_value={"file_path": "photos/file.jpg"},
    )
    mocker.patch(
        "backend.app.api.telegram_webhook.telegram_client.download_file",
        return_value=b"\xff\xd8\xff\xd9",
    )
    mocker.patch(
        "backend.app.api.telegram_webhook.supabase_client.upload_photo",
        return_value=("photos/x.jpg", "https://cdn.example/x.jpg"),
    )
    insert = mocker.patch(
        "backend.app.api.telegram_webhook.supabase_client.insert_report",
        new_callable=AsyncMock,
        return_value={"id": "1"},
    )
    mocker.patch(
        "backend.app.api.telegram_webhook.resolve_location_labels",
        new_callable=AsyncMock,
        return_value=LocationLabels(
            continent="Europe",
            country="Poland",
            region="Mazovia",
        ),
    )
    vision = mocker.patch(
        "backend.app.api.telegram_webhook.vision_ai.analyze_image",
        new_callable=AsyncMock,
        return_value=VisionResult(
            identified_species="Red fox",
            confidence=0.9,
            safety_note="Observe from distance.",
            species_fact="Red foxes often cache surplus prey near their dens.",
        ),
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://test"
    ) as client:
        await client.post(
            "/telegram/webhook",
            json={
                "update_id": 10,
                "message": {
                    "message_id": 1,
                    "chat": {"id": 555, "type": "private"},
                    "from": {"id": 777, "is_bot": False},
                    "photo": [
                        {
                            "file_id": "f1",
                            "file_unique_id": "u1",
                            "width": 50,
                            "height": 50,
                        },
                        {
                            "file_id": "f2",
                            "file_unique_id": "u2",
                            "width": 200,
                            "height": 200,
                        },
                    ],
                },
            },
        )
        await client.post(
            "/telegram/webhook",
            json={
                "update_id": 11,
                "message": {
                    "message_id": 2,
                    "chat": {"id": 555, "type": "private"},
                    "from": {"id": 777, "is_bot": False},
                    "location": {"latitude": 52.4, "longitude": 21.0},
                },
            },
        )

    assert vision.await_count == 1
    assert insert.await_count == 1
    assert send.await_count >= 2
