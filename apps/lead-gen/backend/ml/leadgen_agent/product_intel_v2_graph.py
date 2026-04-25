"""Product-intelligence supervisor graph — v2 (parallel DAG).

Rewrites ``product_intel_graph`` (sequential supervisor) as a DAG that fans out
the three heavyweight analyses (``deep_competitor_analysis``, ``pricing``,
``gtm``) concurrently, joins on a positioning step that consumes all three,
then synthesizes.

Registered as a **separate** assistant ``analyze_product_v2`` in
``langgraph.json`` — the existing ``analyze_product``/``product_intel``
assistant is untouched so the current API keeps working.

DAG shape::

    START
      └── check_freshness        (team 7 — freshness_graph, with fallback)
            ├── fresh    → load_cached_outputs → synthesize → END
            └── stale    → fan_out
                            ├── deep_competitor_analysis   (team 3)
                            ├── run_pricing                (this repo)
                            └── run_gtm                    (this repo)
                                    ⇣⇣⇣ (all three feed in)
                                 positioning              (team 4)
                                    ⇣
                                 synthesize
                                    ⇣
                                 END

Concurrency safety:
    - Each subgraph writes to a disjoint target: pricing_analysis /
      gtm_analysis / positioning_analysis jsonb columns on products, plus
      the separate ``competitor_analyses`` table that ``deep_competitor_graph``
      owns. No two parallel branches ever touch the same target, so write
      ordering doesn't matter.
    - All supervisor-level state merges use ``operator``-style reducers
      (``_merge_dict``, ``_first_error``) so concurrent updates fold cleanly
      rather than raising ``INVALID_CONCURRENT_GRAPH_UPDATE``.

Graceful import pattern:
    Teams 3, 4, 7 are building ``deep_competitor_graph`` / ``positioning_graph``
    / ``freshness_graph`` in parallel worktrees. Until they land, we import
    those modules inside ``try/except ImportError`` blocks and fall back to
    no-op passthroughs (freshness=stale, positioning=empty) so v2 still runs
    end-to-end today. When the real subgraphs land, they slot in with no other
    changes required here.
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Annotated, Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from . import gtm_graph, pricing_graph
from ._subgraph_stream import stream_subgraph
from .deep_icp_graph import _dsn
from .llm import ainvoke_json, compute_totals, make_llm
from .notify import notify_complete, notify_error
from .product_intel_schemas import (
    ProductIntelReport,
    product_intel_graph_meta,
)
from .state import ProductIntelState

# ── Graceful imports for teams 3, 4, 7 ────────────────────────────────
#
# Coupling notes — where v2 assumes DB shape that other teams ship:
#   • team 3 (deep_competitor_graph) writes to the ``competitor_analyses``
#     table (plus related child tables like competitor_pricing_tiers,
#     competitor_features, etc.) — NOT a products.* column. If those tables
#     are missing, the subgraph surfaces the error via subgraph_errors and
#     v2 still produces a partial report from pricing+gtm.
#   • team 4 (positioning_graph) writes to products.positioning_analysis.
#   • team 7 (freshness_graph) reads *_analyzed_at timestamp columns only —
#     no writes — so it's safe to run even if downstream columns are missing.
try:
    from . import deep_competitor_graph  # type: ignore[attr-defined]
except ImportError:
    deep_competitor_graph = None  # type: ignore[assignment]

try:
    from . import positioning_graph  # type: ignore[attr-defined]
except ImportError:
    positioning_graph = None  # type: ignore[assignment]

try:
    from . import freshness_graph  # type: ignore[attr-defined]
except ImportError:
    freshness_graph = None  # type: ignore[assignment]


# ── Reducers ──────────────────────────────────────────────────────────


def _first_error(left: str | None, right: str | None) -> str | None:
    """Preserve the first error that any parallel branch sets."""
    return left or right


def _merge_dict(
    left: dict[str, Any] | None, right: dict[str, Any] | None
) -> dict[str, Any]:
    """Shallow-merge parallel dict updates. Last write wins per key."""
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


def _merge_writes(
    left: list[str] | None, right: list[str] | None
) -> list[str]:
    """Append-only list reducer for ``db_writes`` — the audit log of which
    columns each parallel branch wrote. Used by tests to assert that every
    parallel branch completed its write without stomping another."""
    out: list[str] = list(left or [])
    if right:
        out.extend(right)
    return out


def _merge_subgraph_errors(
    left: dict[str, str] | None, right: dict[str, str] | None
) -> dict[str, str]:
    """Record per-subgraph failures without collapsing them into ``_error``.

    Each branch writes its own key (subgraph name) so merges are disjoint.
    Lets the DAG continue past one flaky branch and still synthesize a report.
    """
    out: dict[str, str] = dict(left or {})
    if right:
        out.update(right)
    return out


# ── State ─────────────────────────────────────────────────────────────


class ProductIntelV2State(ProductIntelState, total=False):
    """Extension of ProductIntelState with v2-specific channels.

    New channels all use reducers so the parallel fan-out (deep_competitor ∥
    pricing ∥ gtm) never raises ``INVALID_CONCURRENT_GRAPH_UPDATE``.
    """

    _error: Annotated[str, _first_error]
    # freshness verdict — True means every input is fresh, short-circuit path
    is_fresh: bool
    freshness_report: dict[str, Any]
    # team-3 output (competitor deep dive; richer than the current competitors_team)
    competitor_deep: Annotated[dict[str, Any], _merge_dict]
    # team-4 output (positioning; consumes all three parallel branches)
    positioning: dict[str, Any]
    # audit trail — which products.* columns each branch wrote to.
    db_writes: Annotated[list[str], _merge_writes]
    # per-subgraph error log; non-fatal — synthesize_report still produces a
    # report with a ``partial_failures`` marker in graph_meta.
    subgraph_errors: Annotated[dict[str, str], _merge_subgraph_errors]


# ── Module-level subgraph compilation ─────────────────────────────────


_PRICING_GRAPH = pricing_graph.build_graph(checkpointer=None)
_GTM_GRAPH = gtm_graph.build_graph(checkpointer=None)

# team-3/4/7 subgraphs compiled lazily because they may not exist at import.
_DEEP_COMPETITOR_GRAPH = (
    deep_competitor_graph.build_graph(checkpointer=None)
    if deep_competitor_graph is not None
    and hasattr(deep_competitor_graph, "build_graph")
    else None
)
_POSITIONING_GRAPH = (
    positioning_graph.build_graph(checkpointer=None)
    if positioning_graph is not None
    and hasattr(positioning_graph, "build_graph")
    else None
)
_FRESHNESS_GRAPH = (
    freshness_graph.build_graph(checkpointer=None)
    if freshness_graph is not None
    and hasattr(freshness_graph, "build_graph")
    else None
)


# Business-node sets for progress accounting via stream_subgraph. Kept in sync
# with the node lists in pricing_graph.build_graph / gtm_graph.build_graph /
# positioning_graph.build_graph / deep_competitor_graph.build_graph.
_PRICING_BUSINESS_NODES = frozenset(
    {
        "load_inputs",
        "benchmark_competitors",
        "choose_value_metric",
        "design_model",
        "write_rationale",
    }
)
_GTM_BUSINESS_NODES = frozenset(
    {
        "load_inputs",
        "pick_channels",
        "craft_pillars",
        "write_templates",
        "build_playbook",
        "draft_plan",
    }
)
_POSITIONING_BUSINESS_NODES = frozenset(
    {
        "load_inputs",
        "extract_category_conventions",
        "identify_white_space",
        "draft_positioning_statement",
        "stress_test",
    }
)
_DEEP_COMPETITOR_BUSINESS_NODES = frozenset(
    {
        "load_competitor",
        "pricing_deep",
        "features_deep",
        "integrations_deep",
        "changelog",
        "positioning_shift",
        "funding_headcount",
        "synthesize",
    }
)


# ── Nodes ─────────────────────────────────────────────────────────────


async def check_freshness(state: ProductIntelV2State) -> dict:
    """Run the freshness subgraph (team 7). If unavailable, default to stale
    so every run executes the full pipeline — the v1 supervisor's behavior."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    if state.get("force_refresh"):
        return {
            "is_fresh": False,
            "freshness_report": {"reason": "force_refresh"},
            "agent_timings": {"check_freshness": round(time.perf_counter() - t0, 3)},
        }

    if _FRESHNESS_GRAPH is None:
        return {
            "is_fresh": False,
            "freshness_report": {"reason": "freshness_graph not available — default stale"},
            "agent_timings": {"check_freshness": round(time.perf_counter() - t0, 3)},
        }

    try:
        result = await _FRESHNESS_GRAPH.ainvoke({"product_id": state["product_id"]})
    except Exception as e:  # noqa: BLE001
        return {
            "_error": f"check_freshness: {e}",
            "is_fresh": False,
            "agent_timings": {"check_freshness": round(time.perf_counter() - t0, 3)},
        }

    is_fresh = bool(result.get("is_fresh", False))
    return {
        "is_fresh": is_fresh,
        "freshness_report": result.get("freshness_report") or {},
        "agent_timings": {"check_freshness": round(time.perf_counter() - t0, 3)},
    }


async def load_cached_outputs(state: ProductIntelV2State) -> dict:
    """Fresh path: read the already-persisted jsonb columns straight off the
    products row so synthesize has everything it needs without re-running
    any analysis.

    Column parity with v1 ``load_and_profile`` + ``ensure_competitors``: also
    loads ``highlights``, ``positioning_analysis``, and the named
    ``competitors`` list so ``synthesize_report`` doesn't regress against v1
    on the cache-hit path. The deep competitor subgraph writes to the
    ``competitor_analyses`` table (not a products column), so we read
    competitors from that table to populate ``state["competitive"]``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    product_id = state["product_id"]
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, url, domain, description, highlights,
                       icp_analysis, pricing_analysis, gtm_analysis,
                       positioning_analysis
                FROM products
                WHERE id = %s
                LIMIT 1
                """,
                (int(product_id),),
            )
            row = cur.fetchone()
            cols = [d[0] for d in cur.description or []]
    if not row:
        return {"_error": f"load_cached_outputs: product {product_id} not found"}
    rec = dict(zip(cols, row))

    def _maybe_json(v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    # Mirror v1 ensure_competitors: count completed competitor_analyses and
    # fetch the named competitors list so the positioning-adjacent shape is
    # identical across v1 and v2. Safe even if the tables are empty.
    competitor_count = 0
    named_competitors: list[dict[str, Any]] = []
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)::int
                FROM competitor_analyses a
                JOIN competitors c ON c.analysis_id = a.id
                WHERE a.product_id = %s
                  AND c.status IN ('done', 'approved', 'suggested')
                """,
                (int(product_id),),
            )
            crow = cur.fetchone() or (0,)
            competitor_count = int(crow[0])
            if competitor_count:
                cur.execute(
                    """
                    SELECT c.name, c.url, c.domain, c.description,
                           c.positioning_headline, c.target_audience
                    FROM competitors c
                    JOIN competitor_analyses a ON c.analysis_id = a.id
                    WHERE a.product_id = %s
                      AND a.status = 'done'
                      AND c.status IN ('done', 'approved', 'suggested')
                    ORDER BY c.id
                    LIMIT 10
                    """,
                    (int(product_id),),
                )
                comp_rows = cur.fetchall()
                comp_cols = [d[0] for d in cur.description or []]
                for cr in comp_rows:
                    named_competitors.append(dict(zip(comp_cols, cr)))

    icp = _maybe_json(rec.get("icp_analysis")) or {}
    out: dict[str, Any] = {
        "product": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "url": rec.get("url") or "",
            "domain": rec.get("domain") or "",
            "description": rec.get("description") or "",
            "highlights": _maybe_json(rec.get("highlights")),
        },
        "icp": icp,
        "pricing": _maybe_json(rec.get("pricing_analysis")) or {},
        "gtm": _maybe_json(rec.get("gtm_analysis")) or {},
        "positioning": _maybe_json(rec.get("positioning_analysis")) or {},
        "competitive": {
            "has_completed_analysis": bool(competitor_count),
            "competitor_count": competitor_count,
            "maybe_stale": False,
            "freshness_reason": "",
            "competitors": named_competitors,
        },
        "agent_timings": {"load_cached_outputs": round(time.perf_counter() - t0, 3)},
    }
    # Partial-failure signal on the fresh path: if ICP was never run (or the
    # column is empty), flag it so synthesize_report notes the gap in the
    # TL;DR rather than silently degrading.
    if not icp:
        out["subgraph_errors"] = {"icp": "no cached ICP"}
    return out


async def run_deep_competitor(state: ProductIntelV2State) -> dict:
    """Invoke team-3 deep_competitor_graph if available, else no-op.

    Idempotent: the subgraph writes to the ``competitor_analyses`` table
    (plus related child tables — competitor_pricing_tiers, competitor_features,
    competitor_integrations, competitor_changelog, competitor_funding_events,
    competitor_positioning_snapshots, competitor_feature_parity). Our
    supervisor performs no additional writes here; we just bubble up the payload.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    if _DEEP_COMPETITOR_GRAPH is None:
        return {
            "competitor_deep": {"_unavailable": True},
            "db_writes": [],
            "agent_timings": {"run_deep_competitor": round(time.perf_counter() - t0, 3)},
        }
    try:
        result, _progress = await stream_subgraph(
            _DEEP_COMPETITOR_GRAPH,
            {"product_id": state["product_id"]},
            _DEEP_COMPETITOR_BUSINESS_NODES,
        )
    except Exception as e:  # noqa: BLE001 — partial failure; keep going
        # One flaky branch shouldn't cost the user the whole run. Emit an
        # empty payload + subgraph_errors marker so positioning/synthesize can
        # proceed and surface the gap in the final report.
        return {
            "competitor_deep": {},
            "subgraph_errors": {"run_deep_competitor": str(e)[:500]},
            "agent_timings": {"run_deep_competitor": round(time.perf_counter() - t0, 3)},
        }
    return {
        "competitor_deep": result.get("competitor_deep")
        or result.get("competitors")
        or {},
        "db_writes": ["competitor_analyses"],
        "agent_timings": {"run_deep_competitor": round(time.perf_counter() - t0, 3)},
    }


async def run_pricing(state: ProductIntelV2State) -> dict:
    """Invoke the pricing subgraph. The subgraph's write_rationale node
    persists ``products.pricing_analysis`` itself — supervisor does not
    re-write. Safe for parallel execution because column is disjoint from
    gtm/competitor branches."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    try:
        result, _progress = await stream_subgraph(
            _PRICING_GRAPH,
            {"product_id": state["product_id"]},
            _PRICING_BUSINESS_NODES,
        )
    except Exception as e:  # noqa: BLE001 — partial failure; keep going
        return {
            "pricing": {},
            "subgraph_errors": {"run_pricing": str(e)[:500]},
            "agent_timings": {"run_pricing": round(time.perf_counter() - t0, 3)},
        }
    return {
        "pricing": result.get("pricing") or {},
        "db_writes": ["pricing_analysis"],
        "agent_timings": {"run_pricing": round(time.perf_counter() - t0, 3)},
    }


async def run_gtm(state: ProductIntelV2State) -> dict:
    """Invoke the GTM subgraph. Writes ``products.gtm_analysis`` inside the
    subgraph; disjoint from the pricing/competitor branches."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    try:
        result, _progress = await stream_subgraph(
            _GTM_GRAPH,
            {"product_id": state["product_id"]},
            _GTM_BUSINESS_NODES,
        )
    except Exception as e:  # noqa: BLE001 — partial failure; keep going
        return {
            "gtm": {},
            "subgraph_errors": {"run_gtm": str(e)[:500]},
            "agent_timings": {"run_gtm": round(time.perf_counter() - t0, 3)},
        }
    return {
        "gtm": result.get("gtm") or {},
        "db_writes": ["gtm_analysis"],
        "agent_timings": {"run_gtm": round(time.perf_counter() - t0, 3)},
    }


async def run_positioning(state: ProductIntelV2State) -> dict:
    """Join step. Consumes ``competitor_deep`` + ``pricing`` + ``gtm`` from
    state (LangGraph guarantees parallel branches have flushed before this
    node runs, because it has incoming edges from all three).

    Team 4 owns the subgraph; we pass all three inputs through.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    if _POSITIONING_GRAPH is None:
        return {
            "positioning": {"_unavailable": True},
            "agent_timings": {"run_positioning": round(time.perf_counter() - t0, 3)},
        }
    try:
        result, _progress = await stream_subgraph(
            _POSITIONING_GRAPH,
            {
                "product_id": state["product_id"],
                "competitor_deep": state.get("competitor_deep") or {},
                "pricing": state.get("pricing") or {},
                "gtm": state.get("gtm") or {},
            },
            _POSITIONING_BUSINESS_NODES,
        )
    except Exception as e:  # noqa: BLE001 — partial failure; keep going
        return {
            "positioning": {},
            "subgraph_errors": {"run_positioning": str(e)[:500]},
            "agent_timings": {"run_positioning": round(time.perf_counter() - t0, 3)},
        }
    return {
        "positioning": result.get("positioning") or result,
        "db_writes": ["positioning_analysis"],
        "agent_timings": {"run_positioning": round(time.perf_counter() - t0, 3)},
    }


async def synthesize_report(state: ProductIntelV2State) -> dict:
    """Final step — identical contract to v1 ``synthesize_report``: writes
    the rolled-up ``products.intel_report`` jsonb. Adds positioning +
    competitor_deep into the executive TL;DR when available.

    Partial-failure aware: upstream subgraph errors recorded in
    ``state["subgraph_errors"]`` are surfaced both in the prompt (so the LLM
    doesn't hallucinate around gaps) and in ``graph_meta.partial_failures``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    icp = state.get("icp") or {}
    pricing = state.get("pricing") or {}
    gtm = state.get("gtm") or {}
    competitor_deep = state.get("competitor_deep") or {}
    positioning = state.get("positioning") or {}
    subgraph_errors = dict(state.get("subgraph_errors") or {})

    # Shared with v1 — see product_intel_graph.synthesize_report for the
    # reasoning on the partial_note pattern.
    missing_lines: list[str] = []
    if subgraph_errors:
        for name, reason in subgraph_errors.items():
            label = {
                "icp": "ICP",
                "run_pricing": "pricing",
                "run_gtm": "GTM",
                "run_deep_competitor": "competitor deep dive",
                "run_positioning": "positioning",
            }.get(name, name)
            missing_lines.append(f"- {label}: {str(reason)[:160]}")
    partial_note = (
        "IMPORTANT: Some upstream analyses failed — do NOT invent content for "
        "these; acknowledge the gap and focus on what IS available:\n"
        + "\n".join(missing_lines)
        + "\n\n"
        if missing_lines
        else ""
    )

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result = await ainvoke_json(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You synthesize an executive product-intelligence report. Be ruthless — "
                        "founders read only the TL;DR. "
                        "tldr: 3-4 sentences — who we serve, how we win, what to charge, where to start. "
                        "top_3_priorities: single most important thing this week, this month, this quarter. "
                        "key_risks: max 3, ordered by severity. "
                        "quick_wins: 3-5 things doable THIS WEEK with a small team. "
                        "If any upstream analysis is missing or failed, name the gap explicitly in the "
                        "TL;DR rather than making up numbers. "
                        'Return strict JSON: {"tldr":string,"top_3_priorities":[string],'
                        '"key_risks":[string],"quick_wins":[string]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"{partial_note}"
                        f"Product: {product.get('name', '?')} — {product.get('url', '?')}\n"
                        f"ICP weighted_total: {icp.get('weighted_total', '?')}\n"
                        f"Pricing rec: {(pricing.get('rationale') or {}).get('recommendation', 'none')}\n"
                        f"GTM channels: "
                        f"{', '.join(c.get('name', '') for c in (gtm.get('channels') or [])[:5])}\n"
                        f"Deep competitor signals: {len(competitor_deep) if isinstance(competitor_deep, dict) else 0}\n"
                        f"Positioning: {json.dumps(positioning, default=str)[:400]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"synthesize_report: {e}"}

    # Aggregate telemetry across the whole run — the parallel branches each
    # carry their own telemetry in state["graph_meta"]["telemetry"] via the
    # _merge_graph_meta reducer in state.py. compute_totals(None) returns
    # zeros, so this is safe when no branch recorded telemetry.
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    totals = compute_totals(telemetry) if telemetry else None
    meta = product_intel_graph_meta(
        graph="product_intel_v2",
        model=os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-reasoner"),
        agent_timings=state.get("agent_timings") or {},
        telemetry=telemetry if telemetry else None,
        totals=totals,
    )
    meta["graph_version"] = "v2"
    if subgraph_errors:
        meta["partial_failures"] = [
            {"subgraph": k, "reason": str(v)[:500]} for k, v in subgraph_errors.items()
        ]
    report = ProductIntelReport.model_validate(
        {
            **(result if isinstance(result, dict) else {}),
            "graph_meta": meta,
        }
    )
    dumped = report.model_dump()

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE products
                SET intel_report = %s::jsonb,
                    intel_report_at = now()::text,
                    updated_at = now()::text
                WHERE id = %s
                """,
                (json.dumps(dumped), int(state["product_id"])),
            )
            # Mirror run-level cost into product_intel_runs — parity with v1.
            run_id = state.get("app_run_id")
            if run_id:
                try:
                    cur.execute(
                        """
                        UPDATE product_intel_runs
                        SET total_cost_usd = %s
                        WHERE id = %s
                        """,
                        ((totals or {}).get("total_cost_usd", 0.0), str(run_id)),
                    )
                except Exception:  # noqa: BLE001 — cost accounting is best-effort
                    pass

    return {
        "report": dumped,
        "graph_meta": meta,
        "db_writes": ["intel_report"],
        "agent_timings": {"synthesize_report": round(time.perf_counter() - t0, 3)},
    }


async def notify_error_node(state: ProductIntelV2State) -> dict:
    err = state.get("_error") or "unknown error"
    await notify_error(state, err)
    return {}


# ── Routing ───────────────────────────────────────────────────────────


def _route_freshness(state: ProductIntelV2State) -> str:
    """Short-circuit to cache-load if fresh, else kick off the parallel DAG."""
    if state.get("_error"):
        return "notify_error_node"
    return "load_cached_outputs" if state.get("is_fresh") else "fan_out"


def _fan_out_analyses(_state: ProductIntelV2State) -> list[str]:
    """Kick off all three heavyweight branches concurrently. LangGraph
    schedules these as parallel tasks; their writes merge via the reducers
    on ProductIntelV2State."""
    return ["run_deep_competitor", "run_pricing", "run_gtm"]


async def fan_out(_state: ProductIntelV2State) -> dict:
    """Marker node — all the real work happens in the three branches fanned
    out from here via conditional edges. Kept as an explicit node so the
    DAG diagram is readable and LangGraph can attach the conditional edge."""
    return {}


def _route_final(state: ProductIntelV2State) -> str:
    return "notify_error_node" if state.get("_error") else "notify_complete"


# ── Build ─────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    """Compile the v2 DAG.

    Edges:
        START → check_freshness
        check_freshness → load_cached_outputs  (fresh path)
        check_freshness → fan_out              (stale path)
        fan_out ⇒ {run_deep_competitor, run_pricing, run_gtm}  (parallel)
        {all three} → run_positioning          (join — waits for all 3)
        load_cached_outputs → synthesize_report
        run_positioning → synthesize_report
        synthesize_report → notify_complete | notify_error_node
    """
    builder = StateGraph(ProductIntelV2State)
    builder.add_node("check_freshness", check_freshness)
    builder.add_node("load_cached_outputs", load_cached_outputs)
    builder.add_node("fan_out", fan_out)
    builder.add_node("run_deep_competitor", run_deep_competitor)
    builder.add_node("run_pricing", run_pricing)
    builder.add_node("run_gtm", run_gtm)
    builder.add_node("run_positioning", run_positioning)
    builder.add_node("synthesize_report", synthesize_report)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "check_freshness")
    builder.add_conditional_edges(
        "check_freshness",
        _route_freshness,
        ["load_cached_outputs", "fan_out", "notify_error_node"],
    )

    # stale path — fan out three-ways in parallel
    builder.add_conditional_edges(
        "fan_out",
        _fan_out_analyses,
        ["run_deep_competitor", "run_pricing", "run_gtm"],
    )

    # all three branches converge on positioning (join)
    builder.add_edge("run_deep_competitor", "run_positioning")
    builder.add_edge("run_pricing", "run_positioning")
    builder.add_edge("run_gtm", "run_positioning")

    # both paths rejoin at synthesize
    builder.add_edge("load_cached_outputs", "synthesize_report")
    builder.add_edge("run_positioning", "synthesize_report")

    builder.add_conditional_edges(
        "synthesize_report",
        _route_final,
        ["notify_complete", "notify_error_node"],
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
