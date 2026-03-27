import logging
import httpx
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

TELEGRAM_API = f"https://api.telegram.org/bot{settings.telegram_bot_token}"
TELEGRAM_FILE_API = f"https://api.telegram.org/file/bot{settings.telegram_bot_token}"


async def get_file(file_id: str) -> dict:
    """Call Telegram getFile API and return file metadata."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{TELEGRAM_API}/getFile", params={"file_id": file_id})
        resp.raise_for_status()
        data = resp.json()
        if not data.get("ok"):
            raise RuntimeError(f"Telegram getFile error: {data}")
        return data["result"]


async def download_file(file_path: str) -> bytes:
    """Download raw bytes from Telegram CDN."""
    url = f"{TELEGRAM_FILE_API}/{file_path}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


async def send_message(chat_id: int | str, text: str) -> None:
    """Send a text message to a Telegram chat."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{TELEGRAM_API}/sendMessage",
            json={"chat_id": chat_id, "text": text},
        )
        resp.raise_for_status()
        data = resp.json()
        if not data.get("ok"):
            logger.warning("Telegram sendMessage returned not-ok: %s", data)
