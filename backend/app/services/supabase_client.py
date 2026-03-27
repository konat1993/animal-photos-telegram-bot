import logging
import uuid
from supabase import create_client, Client
from backend.app.core.config import settings
from backend.app.models.schemas import AnimalReportCreate

logger = logging.getLogger(__name__)

BUCKET = "animal-photos"

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_server_key)
    return _client


async def upload_photo(image_bytes: bytes, filename: str | None = None) -> tuple[str, str]:
    """Upload photo bytes to Supabase Storage. Returns (path, public_url)."""
    client = get_client()
    if filename is None:
        filename = f"{uuid.uuid4()}.jpg"

    path = f"photos/{filename}"
    client.storage.from_(BUCKET).upload(
        path,
        image_bytes,
        file_options={"content-type": "image/jpeg", "upsert": True},
    )

    public_url_resp = client.storage.from_(BUCKET).get_public_url(path)
    public_url: str = public_url_resp if isinstance(public_url_resp, str) else public_url_resp["publicUrl"]
    logger.info("Uploaded photo to %s, public URL: %s", path, public_url)
    return path, public_url


async def insert_report(report: AnimalReportCreate) -> dict:
    """Insert an animal report row into animal_reports. Returns the inserted row."""
    client = get_client()
    data = report.model_dump()
    result = client.table("animal_reports").insert(data).execute()
    if result.data:
        return result.data[0]
    raise RuntimeError(f"Supabase insert returned no data: {result}")
