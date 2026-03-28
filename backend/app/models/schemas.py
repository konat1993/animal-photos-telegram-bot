from __future__ import annotations

from typing import Optional
from pydantic import BaseModel


class PhotoSize(BaseModel):
    file_id: str
    file_unique_id: str
    width: int
    height: int
    file_size: Optional[int] = None


class Location(BaseModel):
    latitude: float
    longitude: float


class Venue(BaseModel):
    """Telegram POI — coordinates are in venue.location."""

    location: Location


class TelegramMessage(BaseModel):
    message_id: int
    chat: dict
    from_: Optional[dict] = None
    photo: Optional[list[PhotoSize]] = None
    location: Optional[Location] = None
    venue: Optional[Venue] = None
    text: Optional[str] = None
    caption: Optional[str] = None

    model_config = {"populate_by_name": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if isinstance(obj, dict) and "from" in obj:
            obj = dict(obj)
            obj["from_"] = obj.pop("from")
        return super().model_validate(obj, **kwargs)


def effective_message_location(message: "TelegramMessage") -> Optional[Location]:
    """Pinned location or venue (place) from the map — both carry coordinates."""
    if message.location is not None:
        return message.location
    if message.venue is not None:
        return message.venue.location
    return None


class TelegramUpdate(BaseModel):
    update_id: int
    message: Optional[TelegramMessage] = None


class VisionResult(BaseModel):
    identified_species: str
    confidence: Optional[float] = None
    safety_note: str


class AnimalReportCreate(BaseModel):
    telegram_user_id: str
    photo_path: str
    photo_url: str
    latitude: float
    longitude: float
    location_continent: Optional[str] = None
    location_country: Optional[str] = None
    location_region: Optional[str] = None
    identified_species: str
    confidence: Optional[float] = None
    safety_note: str
    raw_ai_response: dict
