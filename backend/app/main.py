import logging
from fastapi import FastAPI
from backend.app.api.telegram_webhook import router as telegram_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s – %(message)s",
)

app = FastAPI(title="Telegram AI Animal Bot", version="1.0.0")

app.include_router(telegram_router, prefix="/telegram")


@app.get("/health")
async def health():
    return {"status": "ok"}
