"""Synchronous DeepSeek API client for the person research pipeline."""

import json
import os
from typing import Any

import httpx

_API_URL = "https://api.deepseek.com/v1/chat/completions"


def _api_key() -> str:
    key = os.getenv("DEEPSEEK_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY not set")
    return key


def chat(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 4_000,
    temperature: float = 0.3,
) -> str:
    """Send a chat completion request and return the content string."""
    resp = httpx.post(
        _API_URL,
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
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"]


def chat_json(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 8_192,
    temperature: float = 0.2,
) -> Any:
    """Send a JSON-mode chat completion request and parse the response."""
    resp = httpx.post(
        _API_URL,
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
        timeout=120,
    )
    resp.raise_for_status()
    data = resp.json()
    return json.loads(data["choices"][0]["message"]["content"])
