"""Shared LLM factory + JSON helpers.

`make_llm()` reads LLM_BASE_URL / LLM_API_KEY / LLM_MODEL from env and returns a
ChatOpenAI client. Defaults point at local `mlx_lm.server` on :8080, which is
OpenAI-compatible but does NOT support the `response_format={"type": "json_object"}`
parameter — so we prompt-enforce JSON instead of using structured output when
the base URL is localhost.
"""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from dotenv import dotenv_values, load_dotenv
from langchain_openai import ChatOpenAI

# Load backend/.env first (LLM + auth secrets) without clobbering shell exports,
# then fill in any missing keys (e.g. NEON_DATABASE_URL) from the Next.js
# app's .env.local. Using `dotenv_values` for the second pass lets us only set
# keys that are empty/unset — backend/.env ships with NEON_DATABASE_URL= as a
# placeholder which would otherwise shadow the real value.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_DIR / ".env")
for _k, _v in dotenv_values(_BACKEND_DIR.parent / ".env.local").items():
    if _v and not os.environ.get(_k):
        os.environ[_k] = _v


def _is_local(base_url: str) -> bool:
    return "localhost" in base_url or "127.0.0.1" in base_url


def _deepseek_cfg(tier: str | None) -> tuple[str, str, str]:
    """Resolve (base_url, api_key, model) for the DeepSeek provider.

    Used by the new product-intel graphs (pricing / gtm / product_intel) which
    pin to DeepSeek without disturbing existing graphs that still default to
    local Qwen via LLM_BASE_URL.
    """
    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if tier == "deep":
        model = os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-reasoner")
    else:
        model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    return base_url, api_key, model


def make_llm(
    temperature: float | None = None,
    *,
    provider: str | None = None,
    tier: str | None = None,
) -> ChatOpenAI:
    """Build a ChatOpenAI client.

    Default (``provider=None``) reads ``LLM_BASE_URL`` / ``LLM_API_KEY`` /
    ``LLM_MODEL`` — the existing path, points at local Qwen for legacy graphs.

    ``provider="deepseek"`` pins to DeepSeek's public API (or the proxy set via
    ``DEEPSEEK_BASE_URL``). ``tier="deep"`` swaps ``deepseek-chat`` for
    ``deepseek-reasoner`` — use for higher-reasoning nodes (value metric,
    differentiation, pricing rationale, GTM pillars, final synthesis).
    """
    if provider == "deepseek":
        base_url, api_key, model = _deepseek_cfg(tier)
    else:
        base_url = os.environ.get("LLM_BASE_URL", "http://localhost:8080/v1")
        api_key = (
            os.environ.get("DEEPSEEK_API_KEY")
            or os.environ.get("LLM_API_KEY")
            or "local"
        )
        model = os.environ.get("LLM_MODEL", "default_model")
    temp = temperature if temperature is not None else float(os.environ.get("LLM_TEMPERATURE", "0.2"))
    return ChatOpenAI(model=model, api_key=api_key, base_url=base_url, temperature=temp)


def supports_json_mode(*, provider: str | None = None) -> bool:
    if provider == "deepseek":
        return True
    base_url = os.environ.get("LLM_BASE_URL", "http://localhost:8080/v1")
    return not _is_local(base_url)


async def ainvoke_json(
    llm: ChatOpenAI,
    messages: list[dict[str, str]],
    *,
    provider: str | None = None,
) -> Any:
    """Invoke the LLM and parse the response as JSON.

    Uses `response_format={"type": "json_object"}` when the provider supports it,
    otherwise falls back to regex-extracting JSON from the reply (robust to
    markdown code fences that Qwen tends to emit).

    Pass ``provider="deepseek"`` when the llm was built via
    ``make_llm(provider="deepseek")`` so JSON mode is enabled regardless of the
    legacy ``LLM_BASE_URL`` env.
    """
    kwargs: dict[str, Any] = {}
    if supports_json_mode(provider=provider):
        kwargs["response_format"] = {"type": "json_object"}
    resp = await llm.ainvoke(messages, **kwargs)
    return _parse_json(resp.content)


def _parse_json(text: str) -> Any:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Fallback 1: grab the first balanced {...} or [...] block.
    block = _extract_json_block(text)
    if block:
        try:
            return json.loads(block)
        except json.JSONDecodeError:
            text = block
    # Fallback 2: json-repair handles unescaped quotes, trailing commas,
    # truncated output, and similar Qwen/MLX quirks.
    from json_repair import repair_json  # lazy import

    repaired = repair_json(text, return_objects=True)
    if repaired in ("", None):
        raise json.JSONDecodeError("Unrecoverable JSON", text, 0)
    return repaired


def _extract_json_block(text: str) -> str | None:
    """Find the largest brace/bracket-balanced span. Ignores braces inside
    double-quoted strings (with \\ escapes)."""
    start = None
    open_ch = None
    for i, ch in enumerate(text):
        if ch in "{[":
            start = i
            open_ch = ch
            break
    if start is None:
        return None
    close_ch = "}" if open_ch == "{" else "]"
    depth = 0
    in_str = False
    escape = False
    for i in range(start, len(text)):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
            continue
        if ch == open_ch:
            depth += 1
        elif ch == close_ch:
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    return None
