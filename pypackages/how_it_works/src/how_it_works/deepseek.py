"""DeepSeek API client used by analyze and generate nodes."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx


def _api_key() -> str:
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY not set")
    return key


async def chat(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 4_000,
    temperature: float = 0.3,
) -> str:
    """Send a chat completion request and return the content string."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {_api_key()}",
            },
            json={
                "model": "deepseek-chat",
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


async def chat_json(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 8_192,
    temperature: float = 0.2,
) -> Any:
    """Send a JSON-mode chat completion request and parse the response."""
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            "https://api.deepseek.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {_api_key()}",
            },
            json={
                "model": "deepseek-chat",
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return json.loads(data["choices"][0]["message"]["content"])
