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
      "model": "deepseek-v4-pro",
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

import asyncio
import functools
import json
import logging
import os
import random
import time
from pathlib import Path
from typing import Any

import httpx
from dotenv import dotenv_values, load_dotenv
from langchain_openai import ChatOpenAI

log = logging.getLogger(__name__)

# ── env loading ────────────────────────────────────────────────────────────
#
# Run at import time so callers that read env (e.g. ``deep_icp_graph._dsn``)
# see the values without having to call ``make_llm`` first. ``load_dotenv``
# does NOT clobber shell exports, and the second pass via ``dotenv_values``
# only fills keys that are still unset — so a test monkeypatching env via
# ``monkeypatch.setenv`` continues to win because its export already exists by
# the time the test imports this module.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_LOADED = False


def _load_env_once() -> None:
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    load_dotenv(_BACKEND_DIR / ".env")
    for _k, _v in dotenv_values(_BACKEND_DIR.parent / ".env.local").items():
        if _v and not os.environ.get(_k):
            os.environ[_k] = _v
    _ENV_LOADED = True


# Eager load so other modules don't need to call _load_env_once explicitly.
_load_env_once()


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
        model = os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-v4-pro")
    else:
        model = os.environ.get("DEEPSEEK_MODEL", "deepseek-v4-pro")
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


def _llm_http_timeout() -> float:
    try:
        return float(os.environ.get("LLM_HTTP_TIMEOUT_S", "90"))
    except ValueError:
        return 90.0


@functools.lru_cache(maxsize=32)
def _make_llm_cached(
    provider: str | None,
    tier: str | None,
    temp_key: float,
) -> ChatOpenAI:
    """Build (and cache) the ChatOpenAI client for a (provider, tier, temp) tuple.

    Caching avoids rebuilding the underlying httpx connection pool on every node
    invocation — the prior behaviour churned 20+ pools per supervisor run. Env
    is read here so tests that mutate env between calls still see fresh values
    on the first lookup of a new (provider, tier, temp) combination.
    """
    _load_env_once()
    extra_kwargs: dict[str, Any] = {}
    if provider == "deepseek":
        base_url, api_key, model = _deepseek_cfg(tier)
        # Thinking mode silently ignores temperature / top_p / penalties.
        extra_kwargs["reasoning_effort"] = "high"
        extra_kwargs["model_kwargs"] = {"extra_body": {"thinking": {"type": "enabled"}}}
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

    timeout = _llm_http_timeout()
    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url,
        temperature=temp_key,
        # We own retries via ainvoke_json_with_telemetry. Without max_retries=0
        # the openai SDK silently retried 2× on top of our 3, amplifying load
        # under transient outages and turning a flaky upstream into a 9-attempt
        # storm.
        max_retries=0,
        timeout=httpx.Timeout(timeout, connect=10.0, read=timeout),
        **extra_kwargs,
    )


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
    ``DEEPSEEK_BASE_URL``). Both tiers default to ``deepseek-v4-pro`` (the
    latest v4 model). ``tier="deep"`` reads ``DEEPSEEK_MODEL_DEEP`` so deployed
    environments can override deep-reasoning nodes to a different model
    independently of the standard ``DEEPSEEK_MODEL`` knob.
    """
    _load_env_once()
    if temperature is None:
        try:
            temperature = float(os.environ.get("LLM_TEMPERATURE", "0.2"))
        except ValueError:
            temperature = 0.2
    # Round so float-noise doesn't blow the cache (0.2000001 vs 0.2).
    return _make_llm_cached(provider, tier, round(temperature, 3))


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
    # DeepSeek v4 — current models, cache-miss tier.
    "deepseek-v4-flash": {"input_per_1m": 0.27, "output_per_1m": 1.10},
    "deepseek-v4-pro":   {"input_per_1m": 0.55, "output_per_1m": 2.19},
    # Legacy IDs — deprecated 2026-07-24, retained so historical telemetry and
    # any in-flight calls still cost-account correctly.
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


# ── Retry / backoff ──────────────────────────────────────────────────────
#
# Transient DeepSeek failures (502/503/504, request timeouts, TCP resets) are
# common enough that every graph was effectively flaking on them. The retry
# policy below bounds attempts and applies exponential backoff with jitter —
# never retries 4xx validation errors (the prompt is the problem, not the
# network) and never retries auth/permission errors (401/403/404/422).
#
# Tunable via env:
#   LLM_MAX_RETRIES     – total attempts per call, default 3 (i.e. up to 2 retries)
#   LLM_BACKOFF_BASE_S  – initial sleep before the first retry, default 1.0
#   LLM_BACKOFF_CAP_S   – cap per individual sleep, default 20.0
#
# Tests can set LLM_MAX_RETRIES=1 to disable retries entirely (single attempt)
# or LLM_BACKOFF_BASE_S=0 to run retries with zero delay.
_RETRYABLE_STATUS = frozenset({408, 409, 425, 429, 500, 502, 503, 504, 520, 522, 524})


def _is_retryable_exception(exc: BaseException) -> bool:
    """True if ``exc`` is a transient error worth retrying.

    Covers the openai-python exception hierarchy (APIConnectionError /
    APITimeoutError / APIStatusError with retryable status), raw httpx network
    errors, and plain asyncio.TimeoutError. 4xx validation / auth errors are
    NOT retryable — the prompt is the problem.
    """
    # Plain timeouts
    if isinstance(exc, asyncio.TimeoutError):
        return True

    # openai-python exceptions — import lazily so this module stays importable
    # even if openai is not installed (it ships via langchain-openai).
    try:
        from openai import APIConnectionError, APIStatusError, APITimeoutError
    except ImportError:  # pragma: no cover — openai always installed alongside langchain-openai
        APIConnectionError = APIStatusError = APITimeoutError = ()  # type: ignore[misc,assignment]

    if APIConnectionError and isinstance(exc, (APIConnectionError, APITimeoutError)):
        return True
    if APIStatusError and isinstance(exc, APIStatusError):
        status = getattr(exc, "status_code", None)
        return status in _RETRYABLE_STATUS

    # httpx network errors surface when the openai client isn't wrapping them
    try:
        import httpx

        if isinstance(exc, (httpx.TimeoutException, httpx.ConnectError, httpx.RemoteProtocolError)):
            return True
        if isinstance(exc, httpx.HTTPStatusError):
            return exc.response.status_code in _RETRYABLE_STATUS
    except ImportError:  # pragma: no cover
        pass

    return False


def _retry_config() -> tuple[int, float, float]:
    """Read retry tuning from env. Returns (max_attempts, base_seconds, cap_seconds)."""
    try:
        max_attempts = max(1, int(os.environ.get("LLM_MAX_RETRIES", "3")))
    except ValueError:
        max_attempts = 3
    try:
        base = max(0.0, float(os.environ.get("LLM_BACKOFF_BASE_S", "1.0")))
    except ValueError:
        base = 1.0
    try:
        cap = max(base, float(os.environ.get("LLM_BACKOFF_CAP_S", "20.0")))
    except ValueError:
        cap = 20.0
    return max_attempts, base, cap


def _retry_after_seconds(exc: BaseException, cap: float) -> float | None:
    """Extract a ``Retry-After`` hint from a 429/503 response, if present.

    Honors both the integer-seconds form (``Retry-After: 30``) and the HTTP-date
    form. Returns ``None`` when the header is absent or unparseable so the
    caller falls back to the standard jittered backoff. The value is clamped
    to ``cap`` so a buggy server can't park us for an hour.
    """
    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if not headers:
        return None
    raw = headers.get("retry-after") or headers.get("Retry-After")
    if not raw:
        return None
    try:
        return min(cap, max(0.0, float(raw)))
    except (TypeError, ValueError):
        pass
    # HTTP-date form — parse via email.utils so we don't pull a heavy dep.
    try:
        from email.utils import parsedate_to_datetime

        target = parsedate_to_datetime(raw)
    except (TypeError, ValueError):
        return None
    if target is None:
        return None
    import datetime as _dt

    now = _dt.datetime.now(target.tzinfo) if target.tzinfo else _dt.datetime.utcnow()
    delta = (target - now).total_seconds()
    if delta <= 0:
        return 0.0
    return min(cap, delta)


async def _sleep_with_backoff(
    attempt: int,
    base: float,
    cap: float,
    *,
    exc: BaseException | None = None,
) -> None:
    """Exponential backoff with full jitter. ``attempt`` is the 1-indexed
    failed attempt count — 1 after the first failure, 2 after the second, …

    When the upstream returns a ``Retry-After`` header (typical for 429 and
    occasionally 503) we honor it instead of the jittered backoff so we don't
    keep hammering past the rate-limit window.
    """
    if exc is not None:
        hint = _retry_after_seconds(exc, cap)
        if hint is not None:
            await asyncio.sleep(hint)
            return
    if base <= 0:
        return
    high = min(cap, base * (2 ** (attempt - 1)))
    delay = random.uniform(0, high)
    await asyncio.sleep(delay)


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

    Automatically retries transient upstream failures (connection resets,
    timeouts, 5xx, 429) with exponential backoff + full jitter — up to
    ``LLM_MAX_RETRIES`` attempts. ``latency_ms`` in the telemetry reflects the
    total wall-clock time across retries so cost-per-node diagnostics still
    surface pathologically slow nodes.
    """
    kwargs: dict[str, Any] = {}
    if supports_json_mode(provider=provider):
        kwargs["response_format"] = {"type": "json_object"}

    max_attempts, base, cap = _retry_config()
    t0 = time.perf_counter()
    last_exc: BaseException | None = None
    resp = None
    for attempt in range(1, max_attempts + 1):
        try:
            resp = await llm.ainvoke(messages, **kwargs)
            break
        except BaseException as exc:  # noqa: BLE001 — we selectively re-raise
            if not _is_retryable_exception(exc) or attempt >= max_attempts:
                raise
            last_exc = exc
            log.warning(
                "LLM call transient failure (attempt %d/%d): %s: %s — retrying",
                attempt,
                max_attempts,
                type(exc).__name__,
                str(exc)[:200],
            )
            await _sleep_with_backoff(attempt, base, cap, exc=exc)
    if resp is None:  # pragma: no cover — loop invariant: either break or raise
        raise RuntimeError(f"LLM call failed after retries: {last_exc!r}")

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
        # Emitting calls=1 here makes the single-call case explicit — before,
        # merge_node_telemetry was the only place calls ever got set, so nodes
        # that bypassed merge_node_telemetry recorded zero calls. Safe to sum
        # in merge_node_telemetry (it reads calls with a 0 default).
        "calls": 1,
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

    ``call`` may carry a ``calls`` field (as emitted by
    ``ainvoke_json_with_telemetry``); we honor it so batch-merged telemetry
    (e.g. fan-in of parallel branches into a single node's record) doesn't
    under-count. Falls back to +1 for callers that pre-date the calls field.
    """
    tel = dict(existing or {})
    prev = tel.get(node_name) or {}
    call_delta = int(call.get("calls", 1) or 1)
    tel[node_name] = {
        "model": call.get("model") or prev.get("model") or "unknown",
        "input_tokens": int(prev.get("input_tokens", 0)) + int(call.get("input_tokens", 0)),
        "output_tokens": int(prev.get("output_tokens", 0)) + int(call.get("output_tokens", 0)),
        "total_tokens": int(prev.get("total_tokens", 0)) + int(call.get("total_tokens", 0)),
        "cost_usd": round(
            float(prev.get("cost_usd", 0.0)) + float(call.get("cost_usd", 0.0)), 7
        ),
        "latency_ms": int(prev.get("latency_ms", 0)) + int(call.get("latency_ms", 0)),
        "calls": int(prev.get("calls", 0)) + call_delta,
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
    """Parse an LLM-emitted response as JSON, tolerating common quirks.

    Ladder of fallbacks, each more forgiving than the last:
      1. Strip ```json``` fences, try ``json.loads`` on the whole blob.
      2. Extract the outermost balanced ``{...}`` or ``[...]`` span — handles
         DeepSeek/Qwen preamble ("Here's the JSON: ...") and trailing commentary.
      3. ``json_repair`` — heals unescaped quotes, trailing commas, truncated
         output. Only called when earlier passes have something parseable.

    Raises ``json.JSONDecodeError`` on truly unparseable input (empty string,
    garbage) so callers can surface a clear error rather than silently getting
    ``None`` or an empty string from ``json_repair``.
    """
    if text is None:
        raise json.JSONDecodeError("Empty LLM response (None)", "", 0)
    text = text.strip()
    if not text:
        raise json.JSONDecodeError("Empty LLM response", text, 0)
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
