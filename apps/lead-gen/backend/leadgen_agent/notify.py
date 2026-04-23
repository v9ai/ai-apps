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

import hashlib
import hmac
import json
import logging
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
