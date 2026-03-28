# Backend

FastAPI service for the Telegram webhook, OpenAI Vision, and Supabase.

**Documentation for setup, environment variables, and commands lives in the [root README](../README.md#local-development).**

Quick reference:

```bash
cd backend
cp .env.example .env
uv sync
export PYTHONPATH=..
uv run uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```
