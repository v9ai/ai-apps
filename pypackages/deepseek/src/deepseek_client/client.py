"""DeepSeek API client. Mirrors packages/deepseek/src/client.ts."""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator

import httpx

from .constants import DEEPSEEK_API_BASE_URL, DEEPSEEK_API_BETA_URL, DEEPSEEK_MODELS, DEFAULT_CONFIG
from .types import (
    ChatCompletionRequest,
    ChatCompletionResponse,
    ChatCompletionStreamChunk,
    ChatMessage,
    DeepSeekConfig,
    FIMCompletionRequest,
    FIMCompletionResponse,
)


class DeepSeekClient:
    """Async DeepSeek API client using httpx.

    Example::

        async with DeepSeekClient() as client:
            resp = await client.chat([
                ChatMessage(role="user", content="Hello!")
            ])
            print(resp.choices[0].message.content)
    """

    def __init__(self, config: DeepSeekConfig | None = None) -> None:
        cfg = config or DeepSeekConfig()
        self._api_key = cfg.api_key or os.environ.get("DEEPSEEK_API_KEY", "")
        if not self._api_key:
            raise ValueError("DEEPSEEK_API_KEY environment variable is required")

        default_base = DEEPSEEK_API_BETA_URL if cfg.use_beta else DEEPSEEK_API_BASE_URL
        self._base_url = cfg.base_url or default_base
        self._max_retries = cfg.max_retries
        self._timeout = cfg.timeout
        self._default_model = cfg.default_model
        self._default_temperature = cfg.default_temperature
        self._default_max_tokens = cfg.default_max_tokens

        self._http = httpx.AsyncClient(
            base_url=self._base_url,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=self._timeout,
        )

    async def __aenter__(self) -> DeepSeekClient:
        return self

    async def __aexit__(self, *exc) -> None:
        await self.close()

    async def close(self) -> None:
        await self._http.aclose()

    # ── Chat ─────────────────────────────────────────────────────────

    async def chat(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        tools: list | None = None,
        tool_choice: str | dict | None = None,
        response_format: dict | None = None,
        **kwargs,
    ) -> ChatCompletionResponse:
        """Create a chat completion."""
        payload = ChatCompletionRequest(
            model=model or self._default_model,
            messages=messages,
            temperature=temperature or self._default_temperature,
            max_tokens=max_tokens or self._default_max_tokens,
            tools=tools,
            tool_choice=tool_choice,
            response_format=response_format,
            stream=False,
            **kwargs,
        )
        data = await self._request("/chat/completions", payload.model_dump(exclude_none=True))
        return ChatCompletionResponse.model_validate(data)

    async def chat_stream(
        self,
        messages: list[ChatMessage],
        *,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        **kwargs,
    ) -> AsyncIterator[ChatCompletionStreamChunk]:
        """Create a streaming chat completion."""
        payload = ChatCompletionRequest(
            model=model or self._default_model,
            messages=messages,
            temperature=temperature or self._default_temperature,
            max_tokens=max_tokens or self._default_max_tokens,
            stream=True,
            **kwargs,
        )
        async for chunk in self._stream_request("/chat/completions", payload.model_dump(exclude_none=True)):
            yield chunk

    async def chat_simple(
        self,
        message: str,
        *,
        system_prompt: str | None = None,
        model: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        """Quick single-message chat. Returns the assistant's text."""
        messages: list[ChatMessage] = []
        if system_prompt:
            messages.append(ChatMessage(role="system", content=system_prompt))
        messages.append(ChatMessage(role="user", content=message))
        resp = await self.chat(messages, model=model, temperature=temperature, max_tokens=max_tokens)
        return resp.choices[0].message.content

    # ── FIM (Beta) ───────────────────────────────────────────────────

    async def fim(
        self,
        prompt: str,
        *,
        suffix: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        **kwargs,
    ) -> FIMCompletionResponse:
        """Fill-in-the-middle completion (beta). Requires use_beta=True."""
        payload = FIMCompletionRequest(
            model=model or self._default_model,
            prompt=prompt,
            suffix=suffix,
            max_tokens=max_tokens,
            stream=False,
            **kwargs,
        )
        data = await self._request("/completions", payload.model_dump(exclude_none=True))
        return FIMCompletionResponse.model_validate(data)

    # ── Internal ─────────────────────────────────────────────────────

    async def _request(self, endpoint: str, body: dict, *, attempt: int = 0) -> dict:
        try:
            resp = await self._http.post(endpoint, json=body)
        except httpx.TimeoutException:
            raise TimeoutError("Request to DeepSeek API timed out")

        if resp.status_code == 429 or resp.status_code >= 500:
            if attempt < self._max_retries:
                import asyncio
                delay = min(1.0 * (2**attempt), 10.0)
                await asyncio.sleep(delay)
                return await self._request(endpoint, body, attempt=attempt + 1)

        if not resp.is_success:
            error_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
            msg = error_data.get("error", {}).get("message", f"HTTP {resp.status_code}: {resp.reason_phrase}")
            raise httpx.HTTPStatusError(msg, request=resp.request, response=resp)

        return resp.json()

    async def _stream_request(self, endpoint: str, body: dict) -> AsyncIterator[ChatCompletionStreamChunk]:
        async with self._http.stream("POST", endpoint, json=body) as resp:
            if not resp.is_success:
                await resp.aread()
                error_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
                msg = error_data.get("error", {}).get("message", f"HTTP {resp.status_code}: {resp.reason_phrase}")
                raise httpx.HTTPStatusError(msg, request=resp.request, response=resp)

            buffer = ""
            async for text in resp.aiter_text():
                buffer += text
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line or line == "data: [DONE]":
                        continue
                    if line.startswith("data: "):
                        data = json.loads(line[6:])
                        yield ChatCompletionStreamChunk.model_validate(data)


def create_client(config: DeepSeekConfig | None = None) -> DeepSeekClient:
    """Create a DeepSeek client instance."""
    return DeepSeekClient(config)


async def chat(
    message: str,
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> str:
    """Quick one-shot chat. Creates a temporary client, calls chat_simple, closes."""
    async with DeepSeekClient() as client:
        return await client.chat_simple(
            message, system_prompt=system_prompt, model=model,
            temperature=temperature, max_tokens=max_tokens,
        )
