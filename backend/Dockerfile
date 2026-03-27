# Build from monorepo root: docker compose build backend
FROM python:3.12-slim-bookworm

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY backend/pyproject.toml backend/uv.lock ./backend/
RUN pip install --no-cache-dir \
    "fastapi>=0.135.2" \
    "httpx>=0.28.1" \
    "openai>=2.30.0" \
    "pydantic-settings>=2.13.1" \
    "python-multipart>=0.0.22" \
    "supabase>=2.28.3" \
    "uvicorn[standard]>=0.42.0"

COPY backend/app ./backend/app

ENV PYTHONPATH=/app
WORKDIR /app/backend

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
