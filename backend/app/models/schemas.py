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


class TelegramMessage(BaseModel):
    message_id: int
    chat: dict
    from_: Optional[dict] = None
    photo: Optional[list[PhotoSize]] = None
    location: Optional[Location] = None

    model_config = {"populate_by_name": True}

    @classmethod
    def model_validate(cls, obj, **kwargs):
        if isinstance(obj, dict) and "from" in obj:
            obj = dict(obj)
            obj["from_"] = obj.pop("from")
        return super().model_validate(obj, **kwargs)


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
    identified_species: str
    confidence: Optional[float] = None
    safety_note: str
    raw_ai_response: dict
