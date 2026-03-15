"""Configuration loaded from Worker env vars."""

from dataclasses import dataclass


@dataclass
class Settings:
    account_id: str
    database_id: str
    d1_token: str
    deepseek_api_key: str
    semantic_scholar_api_key: str = ""
    openalex_api_key: str = ""


def settings_from_env(env) -> Settings:
    return Settings(
        account_id=env.CLOUDFLARE_ACCOUNT_ID,
        database_id=env.CLOUDFLARE_DATABASE_ID,
        d1_token=env.CLOUDFLARE_D1_TOKEN,
        deepseek_api_key=env.DEEPSEEK_API_KEY,
        semantic_scholar_api_key=getattr(env, "SEMANTIC_SCHOLAR_API_KEY", ""),
        openalex_api_key=getattr(env, "OPENALEX_API_KEY", ""),
    )
