"""Run-completion notifier used as the final node of async-launched graphs.

Reads `webhook_url` / `webhook_secret` / `app_run_id` from state (set by
``startGraphRun`` in ``src/lib/langgraph-client.ts``) and POSTs the final
output to the Cloudflare gateway's `/internal/run-finished` endpoint with an
HMAC-SHA256 signature over the raw JSON body.

The gateway then:
  1. Updates `product_intel_runs` (status, finished_at, error, output)
  2. If success, patches the `products` jsonb column for the run kind
  3. Broadcasts to subscribed WebSocket clients via the JobPubSub Durable Object

The previous Vercel webhook (`/api/webhooks/langgraph`) was removed — all
run completion now flows through the gateway. The DB writes earlier in the
graph (in ``write_rationale``/``draft_plan``/``synthesize_report``) remain
the truth for `products` jsonb; the gateway's `products` patch is
defense-in-depth.

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


def _build_payload(state: dict[str, Any], app_run_id: str) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "appRunId": app_run_id,
        "status": "success",
    }
    for key in _OUTPUT_KEYS:
        value = state.get(key)
        if value:
            payload["output"] = {key: _scrub(value)}
            break
    return payload


async def _post(url: str, secret: str, body: bytes) -> None:
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(
                url,
                content=body,
                headers={
                    "content-type": "application/json",
                    "x-signature": sig,
                },
            )
            if r.status_code >= 400:
                log.warning(
                    "gateway run-finished non-2xx: %s %s",
                    r.status_code,
                    r.text[:200],
                )
    except httpx.HTTPError as e:
        log.warning("gateway run-finished post failed (non-fatal): %s", e)


async def notify_complete(state: dict[str, Any]) -> dict[str, Any]:
    url = state.get("webhook_url")
    secret = state.get("webhook_secret")
    app_run_id = state.get("app_run_id")
    if not (url and secret and app_run_id):
        return {}  # sync invocation — no gateway configured

    payload = _build_payload(state, app_run_id)
    body = json.dumps(payload, default=str).encode()
    await _post(url, secret, body)
    return {}


async def notify_error(state: dict[str, Any], err: str) -> dict[str, Any]:
    """Emit an error-status notification. Call from graph error-handling edges."""
    url = state.get("webhook_url")
    secret = state.get("webhook_secret")
    app_run_id = state.get("app_run_id")
    if not (url and secret and app_run_id):
        return {}
    body = json.dumps(
        {"appRunId": app_run_id, "status": "error", "error": err[:1000]}
    ).encode()
    await _post(url, secret, body)
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


async def _push_progress_to_gateway(
    run_id: str,
    payload: dict[str, Any],
) -> None:
    """Best-effort POST to the gateway's /internal/progress endpoint.

    Drives live ``Subscription.intelRunProgress`` events to subscribed
    clients. Signed with the same global GATEWAY_HMAC used by
    notify_complete. Failures are swallowed.
    """
    gateway_url = os.environ.get("GATEWAY_URL", "").rstrip("/")
    secret = os.environ.get("GATEWAY_HMAC", "")
    if not gateway_url or not secret:
        return
    body_payload: dict[str, Any] = {"appRunId": run_id, "stage": payload["stage"]}
    if payload.get("subgraph_node"):
        body_payload["subgraphNode"] = payload["subgraph_node"]
    if payload.get("elapsed_ms") is not None:
        body_payload["elapsedMs"] = payload["elapsed_ms"]
    if payload.get("completed_stages"):
        body_payload["completedStages"] = payload["completed_stages"]
    body = json.dumps(body_payload).encode()
    sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    try:
        async with httpx.AsyncClient(timeout=2) as client:
            await client.post(
                f"{gateway_url}/internal/progress",
                content=body,
                headers={
                    "content-type": "application/json",
                    "x-signature": sig,
                },
            )
    except Exception as e:  # noqa: BLE001
        log.warning("gateway progress push failed (non-fatal): %s", e)


async def update_progress(
    state: dict[str, Any],
    *,
    stage: str,
    subgraph_node: str | None = None,
    completed_stages: list[str] | None = None,
) -> None:
    """Persist a progress snapshot for the current run.

    Two side effects:
      1. Writes the snapshot to ``product_intel_runs.progress`` (legacy path
         — used as authoritative state for replay / SSR).
      2. Pushes the snapshot to the Cloudflare gateway's ``/internal/progress``
         endpoint, which broadcasts it to graphql-ws subscribers.

    Both are best-effort and never raise.
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

    # Live push — independent of DB write so a transient gateway error doesn't
    # block subsequent nodes.
    try:
        await _push_progress_to_gateway(str(run_id), payload)
    except Exception as e:  # noqa: BLE001
        log.warning("gateway progress push dispatch failed (non-fatal): %s", e)


def progress_start_marker() -> dict[str, Any]:
    """Seed state returned from the first node so elapsed_ms is meaningful.

    Use in the first node of each graph:

        return {"_progress_started_at": time.time(), ...}
    """
    return {"_progress_started_at": time.time()}
