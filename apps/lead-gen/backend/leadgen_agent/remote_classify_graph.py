"""Classify D1 pending opportunities as remote and fully remote.

Reads open, unarchived opportunities from the edge-worker D1 list endpoint,
runs the pure rule-based remote detectors from :mod:`ai_role_taxonomy`, and
returns a summary report with both ``is_remote`` (any remote) and
``is_fully_remote`` (global, no region restrictions). Does NOT write back
to D1 — this is a read-only classification pass.

    fetch_d1  →  classify  →  report  →  END

State is a ``TypedDict``; **every** field a node returns must be declared
(memory: ``feedback_langgraph_typeddict_drops_fields``).
"""

from __future__ import annotations

import logging
import os
from typing import Any, TypedDict

import httpx
from langgraph.graph import END, START, StateGraph

from .ai_role_taxonomy import is_ai_role as check_ai_role, is_remote, is_fully_remote

log = logging.getLogger(__name__)

_EDGE_TIMEOUT_S = 30.0
_DEFAULT_LIMIT = 500


class RemoteClassifyState(TypedDict, total=False):
    # ── Input ──────────────────────────────────────────────────────────
    limit: int                # max D1 rows to fetch (1–2000, default 500)
    company_key: str | None   # optional filter by D1 company key

    # ── Working ────────────────────────────────────────────────────────
    opportunities: list[dict[str, Any]]       # raw D1 rows
    classifications: list[dict[str, Any]]     # per-row classification

    # ── Output ─────────────────────────────────────────────────────────
    total: int
    any_remote: int           # any kind of remote (incl. US-only)
    any_not_remote: int
    fully_remote: int         # truly global remote
    ai_fully_remote: int      # fully_remote AND AI role
    ai_any_remote: int        # any_remote AND AI role
    sample_remote: list[dict[str, Any]]       # first 10 fully_remote
    sample_not_remote: list[dict[str, Any]]   # first 10 not fully_remote

    _error: str
    graph_meta: dict[str, Any]


# ── Node 1: fetch_d1 ────────────────────────────────────────────────────────


async def fetch_d1(state: RemoteClassifyState) -> dict[str, Any]:
    """GET open opportunities from the D1 edge worker."""
    edge_url = os.environ.get("LEAD_GEN_EDGE_URL", "").rstrip("/")
    token = os.environ.get("JOBS_D1_TOKEN", "").strip()
    if not edge_url or not token:
        return {"_error": "LEAD_GEN_EDGE_URL / JOBS_D1_TOKEN not set"}

    limit = min(max(state.get("limit") or _DEFAULT_LIMIT, 1), 2000)

    try:
        async with httpx.AsyncClient(timeout=_EDGE_TIMEOUT_S) as client:
            resp = await client.get(
                f"{edge_url}/api/jobs/d1/opportunities",
                params={"limit": limit},
                headers={"Authorization": f"Bearer {token}"},
            )
            resp.raise_for_status()
            body = resp.json()
    except httpx.HTTPError as exc:
        log.warning("fetch_d1: %s", exc)
        return {"_error": f"fetch_d1: {exc}"}

    rows: list[dict[str, Any]] = body.get("rows") or []
    company_key = state.get("company_key")
    if company_key:
        rows = [r for r in rows if (r.get("company_key") or "") == company_key]

    return {"opportunities": rows, "total": len(rows)}


# ── Node 2: classify ────────────────────────────────────────────────────────


async def classify(state: RemoteClassifyState) -> dict[str, Any]:
    """Run remote + fully-remote + AI-role classification on every opportunity.

    Pure rule-based — no LLM calls.
    """
    if state.get("_error"):
        return {}

    opportunities = state.get("opportunities") or []
    if not opportunities:
        return {
            "classifications": [],
            "any_remote": 0, "any_not_remote": 0,
            "fully_remote": 0, "ai_fully_remote": 0, "ai_any_remote": 0,
            "sample_remote": [], "sample_not_remote": [],
        }

    results: list[dict[str, Any]] = []
    any_remote_count = 0
    any_not_remote_count = 0
    fully_remote_count = 0
    ai_fully_remote_count = 0
    ai_any_remote_count = 0
    sample_remote: list[dict[str, Any]] = []
    sample_not_remote: list[dict[str, Any]] = []

    for row in opportunities:
        job: dict[str, Any] = {
            "title": row.get("title"),
            "workplaceType": row.get("workplace_type"),
            "location": row.get("location"),
        }
        remote = is_remote(job)
        fully = is_fully_remote(job)
        ai, pattern = check_ai_role(row.get("title"))

        result = {
            "id": row.get("id"),
            "title": row.get("title"),
            "company_name": row.get("company_name"),
            "company_key": row.get("company_key"),
            "location": row.get("location"),
            "source": row.get("source"),
            "workplace_type": row.get("workplace_type"),
            "is_remote": remote,
            "is_fully_remote": fully,
            "is_ai_role": ai,
            "matched_pattern": pattern,
        }
        results.append(result)

        # any remote
        if remote:
            any_remote_count += 1
            if ai:
                ai_any_remote_count += 1
        else:
            any_not_remote_count += 1

        # fully remote samples (distinct from any-remote)
        if fully:
            fully_remote_count += 1
            if len(sample_remote) < 10:
                sample_remote.append(result)
            if ai:
                ai_fully_remote_count += 1
        else:
            if len(sample_not_remote) < 10:
                sample_not_remote.append(result)

    log.info(
        "remote_classify: total=%d any_remote=%d fully_remote=%d ai_any=%d ai_fully=%d",
        len(opportunities), any_remote_count, fully_remote_count,
        ai_any_remote_count, ai_fully_remote_count,
    )

    return {
        "classifications": results,
        "any_remote": any_remote_count,
        "any_not_remote": any_not_remote_count,
        "fully_remote": fully_remote_count,
        "ai_any_remote": ai_any_remote_count,
        "ai_fully_remote": ai_fully_remote_count,
        "sample_remote": sample_remote,
        "sample_not_remote": sample_not_remote,
    }


# ── Node 3: report ──────────────────────────────────────────────────────────


async def report(state: RemoteClassifyState) -> dict[str, Any]:
    """Produce a human-readable summary."""
    if state.get("_error"):
        return {"graph_meta": {"error": state["_error"]}}

    total = state.get("total") or 0
    any_remote = state.get("any_remote") or 0
    any_not_remote = state.get("any_not_remote") or 0
    fully_remote = state.get("fully_remote") or 0
    ai_any = state.get("ai_any_remote") or 0
    ai_fully = state.get("ai_fully_remote") or 0

    pct_any = round(any_remote / total * 100, 1) if total else 0
    pct_fully = round(fully_remote / total * 100, 1) if total else 0
    summary = (
        f"{total} scanned. "
        f"{any_remote} any remote ({pct_any}%), "
        f"{fully_remote} global remote ({pct_fully}%), "
        f"{any_not_remote} not remote. "
        f"AI roles: {ai_any} any-remote, {ai_fully} global-remote."
    )

    return {
        "graph_meta": {
            "summary": summary,
            "total": total,
            "any_remote": any_remote,
            "any_not_remote": any_not_remote,
            "fully_remote": fully_remote,
            "ai_any_remote": ai_any,
            "ai_fully_remote": ai_fully,
            "pct_any_remote": pct_any,
            "pct_fully_remote": pct_fully,
        },
    }


# ── Build graph ─────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    g = StateGraph(RemoteClassifyState)
    g.add_node("fetch_d1", fetch_d1)
    g.add_node("classify", classify)
    g.add_node("report", report)
    g.add_edge(START, "fetch_d1")
    g.add_edge("fetch_d1", "classify")
    g.add_edge("classify", "report")
    g.add_edge("report", END)
    return g.compile(checkpointer=checkpointer)


graph = build_graph()
