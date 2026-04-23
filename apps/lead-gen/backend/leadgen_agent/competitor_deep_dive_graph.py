"""Composite competitor deep-dive graph.

Chains the three existing "team" graphs end-to-end for a single product:

    create_analysis_gate
        → run_team1_discovery    (invokes competitors_team; writes competitors rows)
          → fan_out_team2        (Send per competitor_id)
            → run_team2_deep     (invokes deep_competitor for one competitor)
              → finalize_team2   (updates competitor_analyses.status)
                → run_team3_pricing (invokes pricing; writes products.pricing_analysis)
                  → synthesize   → notify_complete | notify_error_node

The `python_focus` flag is threaded into Team 1's discovery_scout prompt and
also flips newly-created competitor rows to status='approved' so Team 2 runs
immediately without an admin approval gate. For non-python-focus runs, this
graph is still safe to call but leaves competitors as 'suggested' and exits
after Team 1 — matching the existing `createCompetitorAnalysis` contract.

State writes:
    - competitor_analyses.status: pending_approval → scraping → done | failed
    - competitors rows: inserted by run_team1_discovery (approved if python_focus)
    - competitor_pricing_tiers / features / integrations: by Team 2 per competitor
    - products.pricing_analysis: by Team 3

This graph is deliberately thin — it invokes the compiled sub-graphs via
``ainvoke()`` rather than duplicating their logic. Each sub-graph already owns
its own DB writes, telemetry, and error handling.
"""

from __future__ import annotations

import json
import os
import time
from typing import Annotated, Any

import psycopg
from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from . import competitors_team_graph, deep_competitor_graph, pricing_graph
from .deep_icp_graph import _dsn
from .icp_schemas import GRAPH_VERSION
from .notify import notify_complete, notify_error
from .state import CompetitorDeepDiveState

# ── 1. helpers ──────────────────────────────────────────────────

_TEAM2_COMPETITOR_LIMIT = 10  # hard cap to bound DeepSeek spend per run


def _first_error(left: str | None, right: str | None) -> str | None:
    return left or right


class _DeepDiveStateWithError(CompetitorDeepDiveState, total=False):
    _error: Annotated[str | None, _first_error]


def _set_analysis_status(analysis_id: int, status: str, error: str | None = None) -> None:
    """Update competitor_analyses.status so the polling UI sees progress."""
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE competitor_analyses
                SET status = %s,
                    error = %s,
                    updated_at = now()::text
                WHERE id = %s
                """,
                (status, error, int(analysis_id)),
            )


def _insert_competitors(
    analysis_id: int,
    competitors: list[dict[str, Any]],
    auto_approve: bool,
) -> list[int]:
    """Insert competitors rows and return their ids.

    When auto_approve=True (python_focus path), rows go in with status='approved'
    so the Team 2 fan-out can pick them up without an admin gate.
    """
    if not competitors:
        return []
    status = "approved" if auto_approve else "suggested"
    inserted_ids: list[int] = []
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for c in competitors:
                cur.execute(
                    """
                    INSERT INTO competitors (
                        analysis_id, name, url, domain, description,
                        positioning_headline, positioning_tagline,
                        target_audience, status
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        int(analysis_id),
                        c.get("name", "")[:160],
                        c.get("url", ""),
                        c.get("domain") or None,
                        c.get("description") or None,
                        c.get("positioning_headline") or None,
                        c.get("positioning_tagline") or None,
                        c.get("target_audience") or None,
                        status,
                    ),
                )
                row = cur.fetchone()
                if row:
                    inserted_ids.append(int(row[0]))
    return inserted_ids


# ── 2. nodes ────────────────────────────────────────────────────


async def create_analysis_gate(state: CompetitorDeepDiveState) -> dict:
    """Validate inputs and mark the analysis as in-progress."""
    product_id = state.get("product_id")
    analysis_id = state.get("analysis_id")
    if product_id is None or analysis_id is None:
        raise ValueError("product_id and analysis_id are required")
    _set_analysis_status(int(analysis_id), "scraping")
    return {}


async def run_team1_discovery(state: CompetitorDeepDiveState) -> dict:
    """Invoke competitors_team graph, persist competitor rows, capture meta."""
    t0 = time.perf_counter()
    product_id = int(state["product_id"])
    analysis_id = int(state["analysis_id"])
    python_focus = bool(state.get("python_focus"))

    try:
        result = await competitors_team_graph.graph.ainvoke(
            {"product_id": product_id, "python_focus": python_focus}
        )
    except Exception as exc:
        return {"_error": f"team1 failed: {exc}"}

    competitors = result.get("competitors") or []
    competitor_ids = _insert_competitors(
        analysis_id, competitors[:_TEAM2_COMPETITOR_LIMIT], auto_approve=python_focus
    )

    team1_meta = {
        "team": "competitors_team",
        "run_at": time.time(),
        "latency_s": round(time.perf_counter() - t0, 3),
        "competitors_found": len(competitors),
        "competitors_inserted": len(competitor_ids),
        "python_focus": python_focus,
        "inner_graph_meta": result.get("graph_meta") or {},
    }
    return {"competitor_ids": competitor_ids, "team1_meta": team1_meta}


def _fan_out_team2(state: CompetitorDeepDiveState) -> list[Send]:
    """Emit one Send per competitor. Empty list routes to END (no-op)."""
    ids = state.get("competitor_ids") or []
    return [Send("run_team2_deep", {"_dd_competitor_id": int(cid)}) for cid in ids]


async def run_team2_deep(state: dict[str, Any]) -> dict:
    """Invoke deep_competitor graph for a single competitor. Errors are captured
    per-competitor, not raised — one failed competitor shouldn't abort the run."""
    t0 = time.perf_counter()
    cid = int(state.get("_dd_competitor_id", 0))
    if cid == 0:
        return {}
    try:
        result = await deep_competitor_graph.graph.ainvoke({"competitor_id": cid})
        entry = {
            "run_at": time.time(),
            "latency_s": round(time.perf_counter() - t0, 3),
            "analysis": result.get("analysis") or {},
            "inner_graph_meta": result.get("graph_meta") or {},
            "error": None,
        }
    except Exception as exc:
        entry = {
            "run_at": time.time(),
            "latency_s": round(time.perf_counter() - t0, 3),
            "analysis": {},
            "inner_graph_meta": {},
            "error": str(exc),
        }
    return {"team2_per_competitor": {cid: entry}}


async def finalize_team2(state: CompetitorDeepDiveState) -> dict:
    """Decide whether the analysis stays in 'scraping' (Team 3 still to run)."""
    # Stay in 'scraping' until Team 3 writes; the notify_complete node flips to 'done'.
    return {}


async def run_team3_pricing(state: CompetitorDeepDiveState) -> dict:
    """Invoke pricing graph. Non-fatal — pricing can't run if Team 2 filled
    zero competitor_pricing_tiers, but pricing_graph itself handles that case
    by noting the gap in the rationale."""
    t0 = time.perf_counter()
    product_id = int(state["product_id"])
    try:
        result = await pricing_graph.graph.ainvoke({"product_id": product_id})
        team3_meta = {
            "team": "pricing",
            "run_at": time.time(),
            "latency_s": round(time.perf_counter() - t0, 3),
            "inner_graph_meta": result.get("graph_meta") or {},
            "error": None,
        }
    except Exception as exc:
        team3_meta = {
            "team": "pricing",
            "run_at": time.time(),
            "latency_s": round(time.perf_counter() - t0, 3),
            "inner_graph_meta": {},
            "error": str(exc),
        }
    return {"team3_meta": team3_meta}


async def synthesize(state: CompetitorDeepDiveState) -> dict:
    """Aggregate per-team meta into a single graph_meta payload and flip the
    analysis row to done/failed."""
    analysis_id = int(state["analysis_id"])
    team1 = state.get("team1_meta") or {}
    team2_per_competitor = state.get("team2_per_competitor") or {}
    team3 = state.get("team3_meta") or {}

    team2_errors = [
        {"competitor_id": cid, "error": e["error"]}
        for cid, e in team2_per_competitor.items()
        if e.get("error")
    ]
    team2_success = [cid for cid, e in team2_per_competitor.items() if not e.get("error")]

    graph_meta = {
        "version": GRAPH_VERSION,
        "orchestrator": "competitor_deep_dive",
        "model": os.environ.get("LLM_MODEL", ""),
        "teams": {
            "team_1_discovery": team1,
            "team_2_deep": {
                "run_at": max(
                    (e.get("run_at") or 0.0) for e in team2_per_competitor.values()
                ) if team2_per_competitor else None,
                "competitors_analyzed": len(team2_success),
                "errors": team2_errors,
                "per_competitor_latency_s": {
                    cid: e.get("latency_s") for cid, e in team2_per_competitor.items()
                },
            },
            "team_3_pricing": team3,
        },
    }

    # Status: failed only if Team 1 failed entirely or Team 2 succeeded for zero
    # competitors AND Team 3 failed. Partial Team 2 failures are still 'done'.
    any_team2_success = len(team2_success) > 0
    team3_ok = not team3.get("error")
    final_status = "done" if (any_team2_success or team3_ok) else "failed"
    _set_analysis_status(analysis_id, final_status)

    # Persist the orchestrator meta on the analysis row's error column? No —
    # use a dedicated jsonb. For now the UI reads graph_meta from each team's
    # underlying tables; the orchestrator meta is returned in graph output and
    # delivered via the webhook. A follow-up could add competitor_analyses.meta.
    return {"graph_meta": graph_meta}


async def notify_error_node(state: _DeepDiveStateWithError) -> dict:
    err = state.get("_error") or "unknown error"
    analysis_id = state.get("analysis_id")
    if analysis_id is not None:
        _set_analysis_status(int(analysis_id), "failed", error=str(err)[:500])
    await notify_error(state, err)
    return {}


def _route_after_team1(state: _DeepDiveStateWithError) -> str:
    if state.get("_error"):
        return "notify_error_node"
    # Non-python-focus runs leave competitors as 'suggested' and need admin
    # approval before Team 2 — exit early via synthesize.
    if not state.get("python_focus"):
        return "synthesize"
    return "fan_out"


def _fan_out_router(state: CompetitorDeepDiveState) -> list[Send]:
    sends = _fan_out_team2(state)
    if not sends:
        return [Send("finalize_team2", {})]
    return sends


def _route_final(state: _DeepDiveStateWithError) -> str:
    return "notify_error_node" if state.get("_error") else "notify_complete"


# ── 3. build_graph ──────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(_DeepDiveStateWithError)
    builder.add_node("create_analysis_gate", create_analysis_gate)
    builder.add_node("run_team1_discovery", run_team1_discovery)
    builder.add_node("run_team2_deep", run_team2_deep)
    builder.add_node("finalize_team2", finalize_team2)
    builder.add_node("run_team3_pricing", run_team3_pricing)
    builder.add_node("synthesize", synthesize)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "create_analysis_gate")
    builder.add_edge("create_analysis_gate", "run_team1_discovery")

    builder.add_conditional_edges(
        "run_team1_discovery",
        _route_after_team1,
        ["fan_out", "synthesize", "notify_error_node"],
    )
    # "fan_out" is a virtual target — the router above returns it, and we map
    # it to the actual Send fan-out via a second conditional edge below. This
    # is the standard LangGraph pattern for conditional-then-Send routing.
    builder.add_conditional_edges(
        "run_team1_discovery",
        _fan_out_router,
        ["run_team2_deep", "finalize_team2"],
    )

    builder.add_edge("run_team2_deep", "finalize_team2")
    builder.add_edge("finalize_team2", "run_team3_pricing")
    builder.add_edge("run_team3_pricing", "synthesize")
    builder.add_conditional_edges(
        "synthesize", _route_final, ["notify_complete", "notify_error_node"]
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
