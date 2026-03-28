# Animal photos — Telegram bot and dashboard

[![CI](https://github.com/konat1993/animal-photos-telegram-bot/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/konat1993/animal-photos-telegram-bot/actions/workflows/ci.yml)

Monorepo: **FastAPI** backend (Telegram webhook, OpenAI Vision, Supabase) and **Next.js** dashboard (maps, filters, stats).

## Tests

| Area | Command | Notes |
|------|---------|--------|
| Backend | `cd backend && uv sync --group dev && uv run pytest` | |
| Frontend unit | `cd frontend && npm run test` | Vitest + Testing Library |
| Frontend E2E | `cd frontend && NEXT_PUBLIC_DEMO_MODE=true npm run build && npx playwright install chromium && npm run test:e2e` | Playwright; needs a production build first. Uses demo data (no Supabase). Server runs on port **3001**. |

CI runs backend tests, frontend lint, Vitest, production build, then Playwright against the standalone Node server (`npm run start:standalone`).

See [docs/deploy-droplet.md](docs/deploy-droplet.md) for deployment.
