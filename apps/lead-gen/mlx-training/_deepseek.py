"""Shared DeepSeek client for the mlx-training scripts.

Reads DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL from the env
(loaded from apps/lead-gen/.env.local via python-dotenv at import time so
each script doesn't have to). The two synthetic-data scripts
(generate_synthetic_emails.py, export_post_labels.py) call into this module
instead of constructing their own httpx/requests payloads.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

_LEAD_GEN_DIR = Path(__file__).resolve().parent.parent
load_dotenv(_LEAD_GEN_DIR / ".env.local")
load_dotenv(_LEAD_GEN_DIR / ".env")


def deepseek_api_key() -> str:
    key = os.environ.get("DEEPSEEK_API_KEY", "")
    if not key:
        raise RuntimeError("DEEPSEEK_API_KEY not set in .env.local or .env")
    return key


def deepseek_base_url() -> str:
    # Strip trailing slash so callers can append /chat/completions cleanly.
    return os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")


def deepseek_model() -> str:
    return os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")


def deepseek_chat_payload(
    messages: list[dict[str, str]],
    *,
    model: str | None = None,
    response_format: dict[str, str] | None = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build the JSON body for /chat/completions. Caller posts it.

    Sets reasoning_effort=high and thinking={type:enabled} by default since
    the project standardized on v4-pro thinking mode. Pass `extra` to merge
    additional fields (temperature, max_tokens, etc.).
    """
    body: dict[str, Any] = {
        "model": model or deepseek_model(),
        "messages": messages,
        "reasoning_effort": "high",
        "thinking": {"type": "enabled"},
    }
    if response_format is not None:
        body["response_format"] = response_format
    if extra:
        body.update(extra)
    return body


def deepseek_chat_url() -> str:
    return f"{deepseek_base_url()}/chat/completions"


def deepseek_auth_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {deepseek_api_key()}",
        "Content-Type": "application/json",
    }
