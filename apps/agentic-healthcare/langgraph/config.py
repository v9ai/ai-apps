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

    # LLM — mlx_lm.server (OpenAI-compatible, runs locally on Apple Silicon)
    # Start: mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080
    llm_base_url: str = "http://localhost:8080"
    llm_model: str = "mlx-community/Qwen2.5-7B-Instruct-4bit"
    llm_api_key: str = "unused"

    # Embedding model (must produce 1024-dim to match existing pgvector schema)
    embed_model: str = "BAAI/bge-large-en-v1.5"

    # Internal API key (shared secret between Next.js ↔ Python)
    internal_api_key: str = ""

    # LlamaParse API key
    llama_cloud_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()  # type: ignore[call-arg]
