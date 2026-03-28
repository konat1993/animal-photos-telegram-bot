"""Pytest setup: test env before any import of backend.app.core.config (settings singleton)."""

from __future__ import annotations

import os


def _ensure_test_env() -> None:
    defaults = {
        "TELEGRAM_BOT_TOKEN": "test-token",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SECRET_KEY": "test-secret-key",
        "OPENAI_API_KEY": "sk-test",
        "OPENAI_MODEL": "gpt-4o-mini",
        "PUBLIC_DASHBOARD_URL": "https://example.com",
    }
    for key, value in defaults.items():
        os.environ.setdefault(key, value)


_ensure_test_env()
