"""Centralised configuration — reads from .env via pydantic-settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Neon PostgreSQL
    database_url: str

    # Cloudflare R2
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str = "healthcare-blood-tests"

    # DeepSeek LLM
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"

    # Embedding model (must produce 1024-dim to match existing pgvector schema)
    embed_model: str = "BAAI/bge-large-en-v1.5"

    # Internal API key (shared secret between Next.js ↔ Python)
    internal_api_key: str = ""

    # Unstructured API (optional — omit to run locally)
    unstructured_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()  # type: ignore[call-arg]
