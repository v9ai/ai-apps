"""DeepSeek chat completion client — replaces the openai SDK dependency."""

from __future__ import annotations

from typing import Any

from http_client import AsyncClient


async def chat_completion(
    api_key: str,
    messages: list[dict[str, str]],
    *,
    model: str = "deepseek-chat",
    response_format: dict[str, str] | None = None,
    temperature: float | None = None,
) -> str:
    """Call DeepSeek /chat/completions and return the content string."""
    body: dict[str, Any] = {"model": model, "messages": messages}
    if response_format:
        body["response_format"] = response_format
    if temperature is not None:
        body["temperature"] = temperature

    async with AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.deepseek.com/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
        )
        data = resp.json()
        return data["choices"][0]["message"]["content"] or ""
