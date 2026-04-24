"""Shared LLM factory + JSON helpers.

`make_llm()` reads LLM_BASE_URL / LLM_API_KEY / LLM_MODEL from env and returns a
ChatOpenAI client. Defaults point at local `mlx_lm.server` on :8080, which is
OpenAI-compatible but does NOT support the `response_format={"type": "json_object"}`
parameter — so we prompt-enforce JSON instead of using structured output when
the base URL is localhost.

Cost + latency telemetry
------------------------
``ainvoke_json_with_telemetry`` wraps ``ainvoke_json`` and returns
``(parsed_json, telemetry_dict)`` where ``telemetry_dict`` has the shape::

    {
      "model": "deepseek-chat",
      "input_tokens":   123,
      "output_tokens":  456,
      "total_tokens":   579,
      "cost_usd":       0.0001471,
      "latency_ms":     2134,
    }

Nodes in the product-intel family of graphs accumulate these per-node into
``state["graph_meta"]["telemetry"][node_name]`` (see ``record_node_telemetry``
below). The terminal node computes ``graph_meta.totals`` and copies
``total_cost_usd`` into ``product_intel_runs.total_cost_usd`` (migration 0066).

``MODEL_PRICING`` is the per-1M-token price table keyed by model name. Update
when DeepSeek (or any other provider we add) changes list prices. Check current
rates at https://api-docs.deepseek.com/quick_start/pricing . If a model isn't in
the dict, ``_cost_usd`` returns 0.0 and logs a warning — the run still
completes, we just miss cost accounting for that call.
"""

from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Any

from dotenv import dotenv_values, load_dotenv
from langchain_openai import ChatOpenAI

log = logging.getLogger(__name__)

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


def _email_llm_cfg() -> tuple[str, str, str]:
    """Resolve (base_url, api_key, model) for the email-llm CF Worker provider.

    Points at `workers/email-llm/` — an OpenAI-compatible `/v1/chat/completions`
    proxy to Workers AI (Mistral-7B-Instruct-v0.2, optionally LoRA-adapted on
    outreach email data). Kept separate from the DeepSeek / default paths so
    only the three email graphs opt in and every other graph keeps its current
    provider.
    """
    base_url = os.environ.get(
        "EMAIL_LLM_BASE_URL",
        "https://lead-gen-email-llm.eeeew.workers.dev/v1",
    )
    api_key = os.environ.get("EMAIL_LLM_API_KEY", "")
    model = os.environ.get("EMAIL_LLM_MODEL", "mistral-email-lora")
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
    elif provider == "email_llm":
        base_url, api_key, model = _email_llm_cfg()
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
    if provider == "email_llm":
        # Mistral-7B-Instruct-v0.2 on Workers AI does not honor OpenAI-style
        # response_format={"type":"json_object"}. Fall through to the regex /
        # json_repair path in _parse_json().
        return False
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
    parsed, _telemetry = await ainvoke_json_with_telemetry(
        llm, messages, provider=provider
    )
    return parsed


# ── Cost + latency telemetry ─────────────────────────────────────────────
#
# Per-1M-token list pricing (USD). Keep in sync with provider pricing pages
# when rates change. Verified 2026-04 from the DeepSeek pricing docs:
#   https://api-docs.deepseek.com/quick_start/pricing
# (Cache-hit / off-peak discounts are NOT factored in — this is the pessimistic
# price, so real spend is ≤ computed cost_usd. Close enough for "which node is
# expensive" questions; swap in actual billed amounts if/when we ingest the
# provider's billing API.)
MODEL_PRICING: dict[str, dict[str, float]] = {
    # DeepSeek — standard per-API-call pricing, cache-miss tier.
    "deepseek-chat":     {"input_per_1m": 0.27, "output_per_1m": 1.10},
    "deepseek-reasoner": {"input_per_1m": 0.55, "output_per_1m": 2.19},
    # Cloudflare Workers AI — @cf/mistral/mistral-7b-instruct-v0.2-lora behind
    # workers/email-llm. CF bills $0.011 / 1000 Neurons; per the pricing page
    # (https://developers.cloudflare.com/workers-ai/platform/pricing/) the
    # documented v0.1 variant lists 10,000 Neurons/M input + 17,300 Neurons/M
    # output → $0.110 / $0.190 per 1M tokens. v0.2-lora isn't in the table
    # yet; assume parity with v0.1 until CF publishes updated numbers.
    "mistral-email-lora": {"input_per_1m": 0.11, "output_per_1m": 0.19},
    # Placeholders for the local Qwen/MLX mode — zero cost, but we still want
    # token counts to flow through the same pipeline for "which prompt balloons
    # output tokens" diagnostics.
    "qwen2.5-3b":        {"input_per_1m": 0.0, "output_per_1m": 0.0},
    "default_model":     {"input_per_1m": 0.0, "output_per_1m": 0.0},
}


def _cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    """Compute USD cost for a single call. Returns 0.0 for unknown models with
    a single warning (de-duped via log handler). Rounded to 7 decimal places so
    accumulated totals don't carry float-noise into the DB."""
    p = MODEL_PRICING.get(model)
    if not p:
        log.warning(
            "no pricing entry for model=%r — cost recorded as 0.0. "
            "Update leadgen_agent.llm.MODEL_PRICING when new models land.",
            model,
        )
        return 0.0
    cost = (input_tokens * p["input_per_1m"] + output_tokens * p["output_per_1m"]) / 1_000_000.0
    return round(cost, 7)


def _extract_usage(resp: Any) -> tuple[int, int]:
    """Pull (input_tokens, output_tokens) from a LangChain AIMessage response.

    Handles both the modern ``usage_metadata`` attribute (dict with
    ``input_tokens`` / ``output_tokens``) and the legacy OpenAI-style
    ``response_metadata['token_usage']`` with ``prompt_tokens`` /
    ``completion_tokens``. Returns ``(0, 0)`` if neither is present so a missing
    counter never crashes a graph run.
    """
    meta = getattr(resp, "usage_metadata", None)
    if isinstance(meta, dict):
        return (
            int(meta.get("input_tokens", 0) or 0),
            int(meta.get("output_tokens", 0) or 0),
        )
    rm = getattr(resp, "response_metadata", None) or {}
    tu = rm.get("token_usage") if isinstance(rm, dict) else None
    if isinstance(tu, dict):
        return (
            int(tu.get("prompt_tokens", 0) or 0),
            int(tu.get("completion_tokens", 0) or 0),
        )
    return (0, 0)


async def ainvoke_json_with_telemetry(
    llm: ChatOpenAI,
    messages: list[dict[str, str]],
    *,
    provider: str | None = None,
) -> tuple[Any, dict[str, Any]]:
    """Same as ``ainvoke_json`` but also returns a telemetry record.

    Callers that want cost + latency per node wrap like so::

        parsed, tel = await ainvoke_json_with_telemetry(llm, msgs, provider="deepseek")
        return {
            ...,
            "graph_meta": {"telemetry": {node_name: tel}},
        }

    The ``_merge_graph_meta_telemetry`` reducer on ``graph_meta`` (see state.py)
    folds per-node entries without clobbering parallel writes.
    """
    kwargs: dict[str, Any] = {}
    if supports_json_mode(provider=provider):
        kwargs["response_format"] = {"type": "json_object"}

    t0 = time.perf_counter()
    resp = await llm.ainvoke(messages, **kwargs)
    latency_ms = int((time.perf_counter() - t0) * 1000)

    input_tokens, output_tokens = _extract_usage(resp)
    model = getattr(llm, "model_name", None) or getattr(llm, "model", None) or "unknown"
    telemetry = {
        "model": str(model),
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
        "cost_usd": _cost_usd(str(model), input_tokens, output_tokens),
        "latency_ms": latency_ms,
    }
    return _parse_json(resp.content), telemetry


def merge_node_telemetry(
    existing: dict[str, Any] | None,
    node_name: str,
    call: dict[str, Any],
) -> dict[str, Any]:
    """Fold a single LLM call's telemetry into the per-node aggregate.

    When a node makes multiple LLM calls (rare — most do one) we sum tokens,
    cost, and latency so the per-node totals stay meaningful. Callers pass the
    current ``state["graph_meta"].get("telemetry")`` dict (or None) and get back
    an updated dict they can drop straight into the returned state fragment.
    """
    tel = dict(existing or {})
    prev = tel.get(node_name) or {}
    tel[node_name] = {
        "model": call.get("model") or prev.get("model") or "unknown",
        "input_tokens": int(prev.get("input_tokens", 0)) + int(call.get("input_tokens", 0)),
        "output_tokens": int(prev.get("output_tokens", 0)) + int(call.get("output_tokens", 0)),
        "total_tokens": int(prev.get("total_tokens", 0)) + int(call.get("total_tokens", 0)),
        "cost_usd": round(
            float(prev.get("cost_usd", 0.0)) + float(call.get("cost_usd", 0.0)), 7
        ),
        "latency_ms": int(prev.get("latency_ms", 0)) + int(call.get("latency_ms", 0)),
        "calls": int(prev.get("calls", 0)) + 1,
    }
    return tel


def compute_totals(telemetry: dict[str, Any] | None) -> dict[str, Any]:
    """Aggregate per-node telemetry into run-level totals.

    Returns the dict stored as ``graph_meta.totals`` on the terminal node and
    mirrored to ``product_intel_runs.total_cost_usd`` (see migration 0066).
    Safe to call with ``None`` or an empty dict — returns zeros in that case so
    terminal nodes don't need to null-check.
    """
    total_in = 0
    total_out = 0
    total_cost = 0.0
    total_latency = 0
    for entry in (telemetry or {}).values():
        if not isinstance(entry, dict):
            continue
        total_in += int(entry.get("input_tokens", 0) or 0)
        total_out += int(entry.get("output_tokens", 0) or 0)
        total_cost += float(entry.get("cost_usd", 0.0) or 0.0)
        total_latency += int(entry.get("latency_ms", 0) or 0)
    return {
        "total_input_tokens": total_in,
        "total_output_tokens": total_out,
        "total_tokens": total_in + total_out,
        "total_cost_usd": round(total_cost, 6),
        "total_latency_ms_llm": total_latency,
    }


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
