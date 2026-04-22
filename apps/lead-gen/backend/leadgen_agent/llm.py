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


def make_llm(temperature: float | None = None) -> ChatOpenAI:
    base_url = os.environ.get("LLM_BASE_URL", "http://localhost:8080/v1")
    api_key = (
        os.environ.get("DEEPSEEK_API_KEY")
        or os.environ.get("LLM_API_KEY")
        or "local"
    )
    model = os.environ.get("LLM_MODEL", "default_model")
    temp = temperature if temperature is not None else float(os.environ.get("LLM_TEMPERATURE", "0.2"))
    return ChatOpenAI(model=model, api_key=api_key, base_url=base_url, temperature=temp)


def supports_json_mode() -> bool:
    base_url = os.environ.get("LLM_BASE_URL", "http://localhost:8080/v1")
    return not _is_local(base_url)


async def ainvoke_json(llm: ChatOpenAI, messages: list[dict[str, str]]) -> Any:
    """Invoke the LLM and parse the response as JSON.

    Uses `response_format={"type": "json_object"}` when the provider supports it,
    otherwise falls back to regex-extracting JSON from the reply (robust to
    markdown code fences that Qwen tends to emit).
    """
    kwargs: dict[str, Any] = {}
    if supports_json_mode():
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
        # Fallback: grab the first {...} or [...] block.
        match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise
