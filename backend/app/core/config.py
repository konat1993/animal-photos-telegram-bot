from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    telegram_bot_token: str
    supabase_url: str
    supabase_secret_key: str | None = None
    supabase_service_role_key: str | None = None
    openai_api_key: str
    openai_model: str = "gpt-4o"

    @property
    def supabase_server_key(self) -> str:
        """Return preferred backend key with backward compatibility."""
        key = self.supabase_secret_key or self.supabase_service_role_key
        if not key:
            raise ValueError(
                "Set SUPABASE_SECRET_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY (legacy)."
            )
        return key


# Env vars supply required fields at runtime (BaseSettings); Pyright cannot see that.
settings = Settings()  # pyright: ignore[reportCallIssue]
