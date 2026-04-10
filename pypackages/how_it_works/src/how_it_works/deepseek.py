"""DeepSeek API client used by analyze and generate nodes."""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any

import httpx

MAX_RETRIES = 3
RETRY_STATUS_CODES = {429, 500, 502, 503, 504}


def _api_key() -> str:
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY not set")
    return key


async def _request_with_retry(
    payload: dict[str, Any],
    *,
    parse_json: bool = False,
) -> Any:
    """Send a request with exponential backoff retry for transient failures."""
    t0 = time.monotonic()
    last_exc: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                resp = await client.post(
                    "https://api.deepseek.com/v1/chat/completions",
                    headers={
                        "Content-Type": "application/json",
                        "Authorization": f"Bearer {_api_key()}",
                    },
                    json=payload,
                )
                if resp.status_code in RETRY_STATUS_CODES and attempt < MAX_RETRIES - 1:
                    delay = 2 ** attempt
                    print(f"  ↻   DeepSeek {resp.status_code}, retry in {delay}s...")
                    await asyncio.sleep(delay)
                    continue
                resp.raise_for_status()

            elapsed = time.monotonic() - t0
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            print(f"  ⏱   DeepSeek responded in {elapsed:.1f}s")
            return json.loads(content) if parse_json else content

        except httpx.TimeoutException as exc:
            last_exc = exc
            if attempt < MAX_RETRIES - 1:
                delay = 2 ** attempt
                print(f"  ↻   DeepSeek timeout, retry in {delay}s...")
                await asyncio.sleep(delay)
            else:
                raise

        except httpx.HTTPStatusError:
            raise

    raise last_exc  # type: ignore[misc]


async def chat(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 4_000,
    temperature: float = 0.3,
) -> str:
    """Send a chat completion request and return the content string."""
    return await _request_with_retry(
        {
            "model": "deepseek-chat",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        },
    )


async def chat_json(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 8_192,
    temperature: float = 0.2,
) -> Any:
    """Send a JSON-mode chat completion request and parse the response."""
    return await _request_with_retry(
        {
            "model": "deepseek-chat",
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        },
        parse_json=True,
    )
