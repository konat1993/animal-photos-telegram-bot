# Backend — Telegram + Vision AI + Supabase

FastAPI service: Telegram webhook, photo download, Supabase Storage upload, OpenAI Vision analysis, Postgres persistence.

## Requirements

- Python ≥ 3.10  
- [uv](https://docs.astral.sh/uv/)  
- Supabase project (`animal_reports` table, `animal-photos` bucket)  
- Telegram bot (`@BotFather`) + OpenAI API key  

## Configuration

```bash
cp .env.example .env
```

Fill in variables (names must be **UPPERCASE**, as in `.env.example`):

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from BotFather |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Service role / secret key for server-side use; legacy alternative: `SUPABASE_SERVICE_ROLE_KEY` |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | e.g. `gpt-4o-mini` or `gpt-4o` |

## Dependencies

```bash
uv sync
```

In **zsh**, quote extras when adding packages: `uv add "uvicorn[standard]"`.

## Running the server

Imports use `backend.app.*`, so Python must resolve the `backend` package. Set **`PYTHONPATH` to the monorepo root** (parent of `backend/`). Easiest workflow: stay in `backend/`:

```bash
cd backend
uv sync
export PYTHONPATH=..
uv run uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

Then `pydantic-settings` loads `backend/.env` relative to the current working directory.

**Alternative from monorepo root:** `export PYTHONPATH="$PWD"` and `uv run --directory backend uvicorn backend.app.main:app ...` — then `.env` must match the process CWD (e.g. copy to root or export variables in your shell).

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/telegram/webhook` | Telegram webhook (configure in Telegram API + public HTTPS, e.g. ngrok) |

## Code layout

- `app/main.py` — FastAPI app  
- `app/api/telegram_webhook.py` — Update handling, photo → location dialog  
- `app/services/` — Telegram API, Supabase, OpenAI Vision  
- `app/core/config.py` — Environment-backed settings  
- `app/models/schemas.py` — Pydantic models  

## Monorepo

Next.js dashboard lives in `../frontend`. SQL migrations: `../supabase/migrations/`.
