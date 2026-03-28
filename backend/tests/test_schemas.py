"""Tests for Pydantic Telegram models and helpers."""

from __future__ import annotations

from backend.app.models.schemas import (
    Location,
    TelegramMessage,
    TelegramUpdate,
    effective_message_location,
)


def test_telegram_message_parses_from_alias() -> None:
    raw = {
        "message_id": 1,
        "chat": {"id": 42, "type": "private"},
        "from": {"id": 99, "is_bot": False, "first_name": "U"},
        "text": "hi",
    }
    msg = TelegramMessage.model_validate(raw)
    assert msg.from_ is not None
    assert msg.from_["id"] == 99
    assert msg.text == "hi"


def test_effective_message_location_prefers_pinned_location() -> None:
    msg = TelegramMessage.model_validate(
        {
            "message_id": 1,
            "chat": {"id": 1},
            "location": {"latitude": 52.0, "longitude": 21.0},
        }
    )
    assert effective_message_location(msg) == Location(latitude=52.0, longitude=21.0)


def test_effective_message_location_uses_venue_when_no_location() -> None:
    msg = TelegramMessage.model_validate(
        {
            "message_id": 1,
            "chat": {"id": 1},
            "venue": {
                "location": {"latitude": 50.0, "longitude": 19.0},
            },
        }
    )
    assert effective_message_location(msg) == Location(latitude=50.0, longitude=19.0)


def test_effective_message_location_none_without_coords() -> None:
    msg = TelegramMessage.model_validate(
        {
            "message_id": 1,
            "chat": {"id": 1},
            "text": "hello",
        }
    )
    assert effective_message_location(msg) is None


def test_telegram_update_minimal() -> None:
    u = TelegramUpdate.model_validate({"update_id": 1})
    assert u.update_id == 1
    assert u.message is None
