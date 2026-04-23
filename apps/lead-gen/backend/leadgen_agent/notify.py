"""Webhook notifier used as the final node of async-launched graphs.

Reads `webhook_url` / `webhook_secret` / `app_run_id` from state (set by
``startGraphRun`` in ``src/lib/langgraph-client.ts``) and POSTs the final
output with an HMAC-SHA256 signature over the raw JSON body.

Failures are swallowed — the DB write earlier in the graph (in
``write_rationale``/``draft_plan``/``synthesize_report``) is the source of
truth; the webhook is best-effort UI notification. The stale-run sweeper cron
catches runs whose webhook was lost.

When the three webhook_ keys are absent from state (sync invocation via
``/runs/wait`` or tests with pre-populated state), these nodes are no-ops.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
from typing import Any

import httpx

log = logging.getLogger(__name__)

# Keys from final state that each graph writes, mapped to the shape the Next.js
# webhook expects. Order matters: first hit wins, so put the most specific key
# (report) before more generic ones.
_OUTPUT_KEYS: tuple[str, ...] = ("report", "pricing", "gtm", "icp")

# Infra keys that must never appear in the publicly-readable output jsonb.
# Defense-in-depth — the Pydantic PricingStrategy/GTMStrategy/ProductIntelReport
# schemas already whitelist which fields serialize, but recursively scrubbing
# guards against accidental pass-through from state blobs or graph_meta dicts.
_PRIVATE_KEYS: frozenset[str] = frozenset({
    "webhook_url",
    "webhook_secret",
    "app_run_id",
    "langsmith_trace_url",
    "langsmith_run_id",
    "tenant_id",
    "lg_run_id",
    "lg_thread_id",
})


def _scrub(v: Any) -> Any:
    if isinstance(v, list):
        return [_scrub(x) for x in v]
    if isinstance(v, dict):
        return {k: _scrub(val) for k, val in v.items() if k not in _PRIVATE_KEYS}
    return v


def _build_payload(state: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {"status": "success"}
    for key in _OUTPUT_KEYS:
        value = state.get(key)
        if value:
            payload["output"] = {key: _scrub(value)}
            break
    return payload


async def _post(url: str, secret: str, app_run_id: str, body: bytes) -> None:
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                url,
                content=body,
                headers={
                    "content-type": "application/json",
                    "x-app-signature": sig,
                    "x-app-run-id": app_run_id,
                },
            )
            if r.status_code >= 400:
                log.warning("webhook non-2xx: %s %s", r.status_code, r.text[:200])
    except httpx.HTTPError as e:
        log.warning("webhook post failed (non-fatal): %s", e)


async def notify_complete(state: dict[str, Any]) -> dict[str, Any]:
    url = state.get("webhook_url")
    secret = state.get("webhook_secret")
    app_run_id = state.get("app_run_id")
    if not (url and secret and app_run_id):
        return {}  # sync invocation — no webhook configured

    payload = _build_payload(state)
    body = json.dumps(payload, default=str).encode()
    await _post(url, secret, app_run_id, body)
    return {}


async def notify_error(state: dict[str, Any], err: str) -> dict[str, Any]:
    """Emit an error-status webhook. Call from graph error-handling edges."""
    url = state.get("webhook_url")
    secret = state.get("webhook_secret")
    app_run_id = state.get("app_run_id")
    if not (url and secret and app_run_id):
        return {}
    body = json.dumps({"status": "error", "error": err[:1000]}).encode()
    await _post(url, secret, app_run_id, body)
    return {}


# ── Streaming progress updates ────────────────────────────────────────────
#
# Each graph node writes a lightweight JSON snapshot to
# product_intel_runs.progress (migration 0063) on entry. Vercel polls
# productIntelRun(id).progress from the browser, avoiding a direct LangGraph
# call.
#
# Writes are fire-and-forget: a failed UPDATE must never crash a graph node,
# so we log and swallow every error path below. The helper is async but the
# DB work runs in a thread executor (psycopg v3 sync driver — same pattern as
# the rest of the graph modules).


def _progress_dsn() -> str | None:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    return dsn or None


def _write_progress_sync(run_id: str, payload: dict[str, Any]) -> None:
    """Blocking psycopg UPDATE — intended to be called via asyncio.to_thread."""
    import psycopg  # local import so test paths that stub psycopg still work

    dsn = _progress_dsn()
    if not dsn:
        return
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE product_intel_runs
                    SET progress = %s::jsonb
                    WHERE id = %s
                    """,
                    (json.dumps(payload), run_id),
                )
    except Exception as e:  # noqa: BLE001 — progress writes are best-effort
        log.warning("progress update failed (non-fatal): %s", e)


async def update_progress(
    state: dict[str, Any],
    *,
    stage: str,
    subgraph_node: str | None = None,
    completed_stages: list[str] | None = None,
) -> None:
    """Persist a progress snapshot for the current run.

    Parameters
    ----------
    state
        Full graph state. ``app_run_id`` (set by ``startGraphRun``) is the
        product_intel_runs PK; absent on sync /runs/wait calls, in which case
        this helper no-ops.
    stage
        Human-readable node name (pass ``__name__`` / ``fn.__name__`` at the
        top of each node).
    subgraph_node
        For the supervisor graph: the name of the currently executing
        sub-subgraph node. Optional.
    completed_stages
        Ordered list of stages already finished. Optional — callers that
        already maintain ``agent_timings`` typically derive it from keys.

    The function never raises — DB failures are logged and swallowed.
    """
    run_id = state.get("app_run_id")
    if not run_id:
        return  # sync invocation — no run row to update

    start_raw = state.get("_progress_started_at")
    try:
        start = float(start_raw) if start_raw is not None else None
    except (TypeError, ValueError):
        start = None
    elapsed_ms: int | None = None
    if start is not None:
        elapsed_ms = int((time.time() - start) * 1000)

    payload: dict[str, Any] = {"stage": stage}
    if subgraph_node:
        payload["subgraph_node"] = subgraph_node
    if elapsed_ms is not None:
        payload["elapsed_ms"] = elapsed_ms
    if completed_stages:
        payload["completed_stages"] = list(completed_stages)

    try:
        await asyncio.to_thread(_write_progress_sync, str(run_id), payload)
    except Exception as e:  # noqa: BLE001 — belt-and-braces; never crash node
        log.warning("update_progress dispatch failed (non-fatal): %s", e)


def progress_start_marker() -> dict[str, Any]:
    """Seed state returned from the first node so elapsed_ms is meaningful.

    Use in the first node of each graph:

        return {"_progress_started_at": time.time(), ...}
    """
    return {"_progress_started_at": time.time()}
