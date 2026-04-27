"""Centralised configuration — reads from .env via pydantic-settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Neon PostgreSQL
    database_url: str

    # Cloudflare R2 (research-thera consolidated bucket holds healthcare data flat)
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "research-thera"

    # LLM — DeepSeek by default (OpenAI-compatible). Override via env vars to swap.
    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_model: str = "deepseek-chat"
    llm_api_key: str = ""

    # Internal API key (shared secret between Next.js ↔ Python)
    internal_api_key: str = ""

    # Reranking
    rerank_top_k: int = 8
    rerank_min_score: float = 0.3
    rerank_enabled: bool = True

    # LlamaParse API key
    llama_cloud_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()  # type: ignore[call-arg]
