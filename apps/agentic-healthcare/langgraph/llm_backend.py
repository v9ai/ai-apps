"""Raw httpx LLM client — OpenAI-compatible chat completions with no SDK wrapper.

Talks directly to the /v1/chat/completions endpoint served by mlx_lm.server
(Apple Silicon) or any other OpenAI-compatible server.
No openai package in the hot path; only httpx is required.

Start local inference:
  ./serve.sh   (or: mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080)

Configure via env (or .env):
  LLM_BASE_URL   (default: http://localhost:8080)
  LLM_MODEL      (default: mlx-community/Qwen2.5-7B-Instruct-4bit)
  LLM_API_KEY    (default: unused)
"""

from __future__ import annotations

import asyncio
import logging
import time

import httpx

from config import settings

logger = logging.getLogger(__name__)

_RETRY_STATUSES = {429, 502, 503, 504}
_MAX_RETRIES = 3


def _base_url() -> str:
    url = settings.llm_base_url.rstrip("/")
    if not url.endswith("/v1"):
        url += "/v1"
    return url


def _auth_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }


# -- Client singletons (lazy init) ----------------------------------------

_sync_client: httpx.Client | None = None
_async_client: httpx.AsyncClient | None = None


def _get_sync_client() -> httpx.Client:
    global _sync_client
    if _sync_client is None:
        _sync_client = httpx.Client(
            base_url=_base_url(),
            headers=_auth_headers(),
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=30.0, pool=5.0),
        )
        logger.info("vLLM sync client ready: %s  model=%s", _base_url(), settings.llm_model)
    return _sync_client


def _get_async_client() -> httpx.AsyncClient:
    global _async_client
    if _async_client is None:
        _async_client = httpx.AsyncClient(
            base_url=_base_url(),
            headers=_auth_headers(),
            timeout=httpx.Timeout(connect=5.0, read=120.0, write=30.0, pool=5.0),
        )
        logger.info("vLLM async client ready: %s  model=%s", _base_url(), settings.llm_model)
    return _async_client


# -- Payload builder -------------------------------------------------------


def _payload(messages: list[dict], temperature: float, max_tokens: int) -> dict:
    return {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }


def _extract_content(data: dict) -> str:
    return data["choices"][0]["message"]["content"] or ""


# -- Sync call -------------------------------------------------------------


def llm_call(system: str, user: str, temperature: float = 0.0, max_tokens: int = 1024) -> str:
    """Synchronous chat completion — drop-in for graph.py _llm_call.

    Retries up to 3× on transient HTTP errors (429/502/503/504) with
    exponential back-off (2s, 4s, 8s).
    """
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    payload = _payload(messages, temperature, max_tokens)
    client = _get_sync_client()

    t0 = time.perf_counter()
    for attempt in range(_MAX_RETRIES + 1):
        try:
            resp = client.post("/chat/completions", json=payload)
            resp.raise_for_status()
            break
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES:
                wait = 2 ** (attempt + 1)
                logger.warning(
                    "vLLM HTTP %d, retry %d/%d in %ds",
                    exc.response.status_code,
                    attempt + 1,
                    _MAX_RETRIES,
                    wait,
                )
                time.sleep(wait)
                continue
            raise
        except httpx.TransportError as exc:
            if attempt < _MAX_RETRIES:
                wait = 2 ** (attempt + 1)
                logger.warning("vLLM transport error %s, retry %d/%d in %ds", exc, attempt + 1, _MAX_RETRIES, wait)
                time.sleep(wait)
                continue
            raise

    latency_ms = (time.perf_counter() - t0) * 1000
    data = resp.json()
    usage = data.get("usage", {})
    logger.info(
        "vLLM  %.0fms  prompt=%d  completion=%d",
        latency_ms,
        usage.get("prompt_tokens", 0),
        usage.get("completion_tokens", 0),
    )
    return _extract_content(data)


# -- Async call ------------------------------------------------------------


async def allm_call(
    system: str, user: str, temperature: float = 0.0, max_tokens: int = 1024
) -> str:
    """Async chat completion with the same retry semantics as llm_call."""
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    payload = _payload(messages, temperature, max_tokens)
    client = _get_async_client()

    t0 = time.perf_counter()
    for attempt in range(_MAX_RETRIES + 1):
        try:
            resp = await client.post("/chat/completions", json=payload)
            resp.raise_for_status()
            break
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code in _RETRY_STATUSES and attempt < _MAX_RETRIES:
                wait = 2 ** (attempt + 1)
                logger.warning(
                    "vLLM HTTP %d, retry %d/%d in %ds",
                    exc.response.status_code,
                    attempt + 1,
                    _MAX_RETRIES,
                    wait,
                )
                await asyncio.sleep(wait)
                continue
            raise
        except httpx.TransportError as exc:
            if attempt < _MAX_RETRIES:
                wait = 2 ** (attempt + 1)
                logger.warning("vLLM transport error %s, retry %d/%d in %ds", exc, attempt + 1, _MAX_RETRIES, wait)
                await asyncio.sleep(wait)
                continue
            raise

    latency_ms = (time.perf_counter() - t0) * 1000
    data = resp.json()
    usage = data.get("usage", {})
    logger.info(
        "vLLM  %.0fms  prompt=%d  completion=%d",
        latency_ms,
        usage.get("prompt_tokens", 0),
        usage.get("completion_tokens", 0),
    )
    return _extract_content(data)


# -- Async streaming call --------------------------------------------------


async def allm_stream(
    system: str, user: str, temperature: float = 0.0, max_tokens: int = 1024
):
    """Async generator that yields content chunks from a streaming response."""
    import json as _json

    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    payload = {**_payload(messages, temperature, max_tokens), "stream": True}
    client = _get_async_client()

    async with client.stream("POST", "/chat/completions", json=payload) as resp:
        resp.raise_for_status()
        async for line in resp.aiter_lines():
            if not line.startswith("data: "):
                continue
            raw = line[6:]
            if raw.strip() == "[DONE]":
                return
            try:
                chunk = _json.loads(raw)
            except _json.JSONDecodeError:
                continue
            delta = chunk["choices"][0].get("delta", {})
            content = delta.get("content")
            if content:
                yield content


# -- LlamaIndex shim -------------------------------------------------------


def get_llama_index_llm():
    """Return an OpenAILike instance pointing at the configured vLLM endpoint.

    Used by chat_server.py for the legacy ContextChatEngine path.
    OpenAILike requires the openai package internally (pulled in via llama-index).
    """
    from llama_index.llms.openai_like import OpenAILike

    return OpenAILike(
        model=settings.llm_model,
        api_base=_base_url(),
        api_key=settings.llm_api_key,
        is_chat_model=True,
        temperature=0.0,
        max_tokens=1024,
    )
