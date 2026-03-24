"""DeepSeek LLM client with retry logic."""

from __future__ import annotations

import asyncio
import logging
import os

from deepseek_client import DeepSeekClient, ChatMessage, DeepSeekConfig

log = logging.getLogger(__name__)

MAX_RETRIES = 2
RETRY_DELAY = 5.0

_client: DeepSeekClient | None = None


class ConfigError(Exception):
    """Raised when LLM configuration is invalid."""


class GenerationError(Exception):
    """Raised when content generation fails after retries."""


def _get_config() -> DeepSeekConfig:
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    base_url = os.environ.get("LLM_BASE_URL")
    if not api_key and not base_url:
        raise ConfigError(
            "Set DEEPSEEK_API_KEY or LLM_BASE_URL in .env.local"
        )
    return DeepSeekConfig(
        api_key=api_key,
        base_url=base_url,
        default_model=os.environ.get("LLM_MODEL", "deepseek-chat"),
        timeout=300.0,
    )


def get_client() -> DeepSeekClient:
    global _client
    if _client is None:
        _client = DeepSeekClient(_get_config())
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


async def chat(prompt: str, *, model: str | None = None) -> tuple[str, int]:
    """Single-turn chat with retry. Returns (content, total_tokens)."""
    import httpx

    client = get_client()
    messages = [ChatMessage(role="user", content=prompt)]
    last_err: Exception | None = None

    for attempt in range(MAX_RETRIES + 1):
        try:
            resp = await client.chat(messages, model=model)
            content = resp.choices[0].message.content
            tokens = resp.usage.total_tokens if resp.usage else 0
            return content, tokens
        except (TimeoutError, ConnectionError) as e:
            last_err = e
        except httpx.HTTPStatusError as e:
            if e.response.status_code not in (429, 500, 502, 503):
                raise
            last_err = e

        if attempt < MAX_RETRIES:
            delay = RETRY_DELAY * (2 ** attempt)
            log.warning("retry %d/%d after %.0fs (%s)", attempt + 1, MAX_RETRIES, delay, type(last_err).__name__)
            await asyncio.sleep(delay)

    raise GenerationError(f"LLM call failed after {MAX_RETRIES + 1} attempts") from last_err
