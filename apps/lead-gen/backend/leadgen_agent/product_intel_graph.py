"""Product-intelligence supervisor graph.

Orchestrates the full pipeline: ICP → competitors → pricing + GTM (parallel) →
executive report. Reuses cached data stored on the products row where possible;
invokes sub-subgraphs only when ``force_refresh`` is set.

Nodes:
    load_and_profile       — read product row, build ProductProfile
    ensure_icp             — reuse cached products.icp_analysis or run deep_icp
    ensure_competitors     — check competitor_analyses; warn if missing
      ├── run_pricing      — invoke pricing graph (reads DB directly)
      └── run_gtm          — invoke gtm graph (reads DB directly)
    synthesize_report      — produce ProductIntelReport, persist all 3 jsonbs
      → END

The pricing + gtm nodes call their built graphs via ``.ainvoke()``, so they
share the same AsyncPostgresSaver when compiled inside ``app.py``.

Partial-failure tolerance
-------------------------
Subgraph failures (pricing / gtm / positioning / ensure_icp / ensure_competitors)
are recorded in ``state["subgraph_errors"]`` and surfaced in the final report's
``graph_meta.partial_failures`` list, rather than aborting the whole supervisor.
Only fatal supervisor-level errors (``load_and_profile`` can't read the product
row, ``synthesize_report`` can't produce JSON) still set the terminal ``_error``
channel and route to ``notify_error_node``. This means a single flaky subgraph
no longer costs the user the whole run — they still get a report, with the
missing section noted. See ``subgraph_errors`` reducer and
``synthesize_report``'s user-prompt construction below.

v1 vs v2
--------
``product_intel_v2_graph`` is a separate DAG (registered as ``analyze_product_v2``
in ``langgraph.json``) that fans out three branches — deep_competitor, pricing,
gtm — in parallel and joins on positioning. It is NOT yet wired into the
Next.js frontend (which still calls ``product_intel``); v1 here is the
production supervisor. Don't delete v2 until it ships, and don't delete v1
until v2 fully subsumes it. Tracked as a consolidation follow-up.
"""

from __future__ import annotations

import json
import os
import time
from typing import Annotated, Any

import psycopg
from langgraph.graph import END, START, StateGraph

from . import (
    deep_icp_graph,
    freshness_graph,
    gtm_graph,
    positioning_graph,
    pricing_graph,
)
from ._subgraph_stream import stream_subgraph
from .deep_icp_graph import _dsn, _product_brief
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    make_llm,
    merge_node_telemetry,
)
from .notify import notify_complete, notify_error
from .product_intel_schemas import (
    ProductIntelReport,
    ProductProfile,
    product_intel_graph_meta,
)
from .state import ProductIntelState


def _first_error(left: str | None, right: str | None) -> str | None:
    """Reducer: keep the first error set by parallel fan-out nodes."""
    return left or right


def _merge_progress(
    left: dict[str, Any] | None, right: dict[str, Any] | None
) -> dict[str, Any]:
    """Reducer for the per-subgraph progress channels.

    Parallel fan-out writes from ``run_pricing`` and ``run_gtm`` land on the
    same merge step. Each writes its own key (``pricing_subgraph_progress``
    vs ``gtm_subgraph_progress``) so conflicts never overlap, but LangGraph
    still needs a reducer on every channel written by more than one node.
    The latest write wins per-key; ``completed`` lists are extended in node
    code before the dict is emitted, so we don't need list concatenation here.
    """
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


def _merge_subgraph_errors(
    left: dict[str, str] | None, right: dict[str, str] | None
) -> dict[str, str]:
    """Reducer for per-subgraph error records.

    Parallel fan-out (``run_pricing`` ∥ ``run_gtm``) can both emit a failure in
    the same step; each writes its own key (subgraph name) so merging is
    disjoint and last-write-wins is safe. Lets us record partial failures
    without collapsing them into a single ``_error`` and aborting the run.
    """
    out: dict[str, str] = dict(left or {})
    if right:
        out.update(right)
    return out


def _fold_subgraph_telemetry(
    supervisor_telemetry: dict[str, Any] | None,
    node_name: str,
    sub_state: Any,
) -> dict[str, Any]:
    """Fold a subgraph's ``graph_meta.telemetry`` into the supervisor telemetry
    under a namespaced key so ``compute_totals`` picks up the subgraph's cost,
    token, and latency numbers.

    The subgraph's own per-node telemetry lives in
    ``sub_state["graph_meta"]["telemetry"][<inner_node>]``. Folding each inner
    entry under a namespaced key (``f"{node_name}/{inner_node}"``) preserves
    per-inner-node granularity while avoiding collisions with other subgraphs
    (e.g. pricing's ``load_inputs`` vs gtm's ``load_inputs``).

    Safe to call with ``None`` / missing / malformed telemetry — returns the
    input unchanged. Callers don't need to null-check.
    """
    tel = dict(supervisor_telemetry or {})
    if not isinstance(sub_state, dict):
        return tel
    sub_meta = sub_state.get("graph_meta") or {}
    sub_tel = sub_meta.get("telemetry") if isinstance(sub_meta, dict) else None
    if not isinstance(sub_tel, dict):
        return tel
    for inner_node, entry in sub_tel.items():
        if not isinstance(entry, dict):
            continue
        tel[f"{node_name}/{inner_node}"] = entry
    return tel


class _ProductIntelStateWithError(ProductIntelState, total=False):
    """Local extension of ProductIntelState carrying an ad-hoc ``_error`` channel
    so exception-path routing survives across nodes without editing state.py.

    Also carries ``pricing_subgraph_progress`` / ``gtm_subgraph_progress`` which
    the subgraph-invocation nodes populate as they stream node-by-node events
    out of the compiled subgraphs. These power "4/7 nodes done" progress
    surfaces in ``notify_complete`` without changing the webhook contract.

    ``subgraph_errors`` records per-subgraph failures without aborting the
    supervisor — see module docstring for the partial-failure contract.
    """

    _error: Annotated[str, _first_error]
    pricing_subgraph_progress: Annotated[dict[str, Any], _merge_progress]
    gtm_subgraph_progress: Annotated[dict[str, Any], _merge_progress]
    subgraph_errors: Annotated[dict[str, str], _merge_subgraph_errors]


# ── Module-level subgraph compilation ──────────────────────────────────
#
# Subgraphs are compiled exactly once, at import time, with ``checkpointer=None``.
# LangGraph's composability contract says nested subgraphs inherit their
# parent's checkpointer when invoked from a parent that has one — the
# ``AsyncPostgresSaver`` used by ``backend/app.py`` flows through without
# the child needing its own binding. Recompiling on every run (the prior
# behavior) cost ~200ms per supervisor invocation, plus churned an async
# context for the saver each time.
#
# Keep this at module scope; ``build_graph()`` below wires these in as the
# async callables used by ``run_pricing`` / ``run_gtm``.
_PRICING_GRAPH = pricing_graph.build_graph(checkpointer=None)
_GTM_GRAPH = gtm_graph.build_graph(checkpointer=None)
_POSITIONING_GRAPH = positioning_graph.build_graph(checkpointer=None)

# The "real work" nodes inside each subgraph — we surface total counts so the
# progress payload can render "4/5 nodes done" without the UI having to know
# the graph topology. Excludes the terminal notify_complete / notify_error
# bookkeeping nodes because those are plumbing, not pipeline steps.
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


async def load_and_profile(state: ProductIntelState) -> dict:
    if state.get("_error"):
        return {}
    # Checkpoint-aware short-circuit: on resume the checkpoint already carries
    # product + product_profile. Skip the DB read + LLM profile extraction.
    if state.get("product") and state.get("product_profile"):
        return {}
    t0 = time.perf_counter()
    product_id = state.get("product_id")
    if product_id is None:
        raise ValueError("product_id is required")

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, url, domain, description, highlights,
                       icp_analysis, pricing_analysis, gtm_analysis
                FROM products
                WHERE id = %s
                LIMIT 1
                """,
                (int(product_id),),
            )
            row = cur.fetchone()
            if not row:
                raise RuntimeError(f"product id {product_id} not found")
            cols = [d[0] for d in cur.description or []]
    rec = dict(zip(cols, row))

    def _maybe_json(v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v

    highlights = _maybe_json(rec.get("highlights"))
    product = {
        "id": rec["id"],
        "name": rec.get("name") or "",
        "url": rec.get("url") or "",
        "domain": rec.get("domain") or "",
        "description": rec.get("description") or "",
        "highlights": highlights,
    }

    # Minimal LLM-driven profile extraction (no scrape — the existing highlights
    # jsonb already carries what the landing page scraper extracted during
    # initial ingest).
    try:
        llm = make_llm(temperature=0.1, provider="deepseek")
        result, tel_profile = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You extract a normalized ProductProfile from a product brief. "
                        "Stay grounded — don't invent features. If a field cannot be "
                        "inferred, leave it empty. "
                        'Return strict JSON: {"name":string,"one_liner":string,"category":string,'
                        '"core_jobs":[string],"key_features":[string],"stated_audience":string,'
                        '"visible_pricing":string,"tech_signals":[string]}'
                    ),
                },
                {"role": "user", "content": f"Product brief:\n{_product_brief(product)}\n\nReturn JSON only."},
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"load_and_profile: {e}"}
    try:
        profile = ProductProfile.model_validate(result or {}).model_dump()
    except Exception:
        profile = ProductProfile(name=product["name"]).model_dump()

    return {
        "product": product,
        "product_profile": profile,
        "icp": _maybe_json(rec.get("icp_analysis")) or {},
        "pricing": _maybe_json(rec.get("pricing_analysis")) or {},
        "gtm": _maybe_json(rec.get("gtm_analysis")) or {},
        "agent_timings": {"load_and_profile": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "load_and_profile", tel_profile)
        },
    }


async def ensure_icp(state: ProductIntelState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    cached = state.get("icp") or {}
    force = bool(state.get("force_refresh"))

    # Freshness gate: before committing to cache reuse, ask the freshness
    # graph whether the product's landing page still looks like what we
    # analyzed last time. If stale with high confidence, treat this like
    # force_refresh. See backend/leadgen_agent/freshness_graph.py.
    freshness = state.get("freshness") or {}
    if cached and not force:
        if not freshness:
            try:
                freshness = await freshness_graph.assess_product_freshness(
                    state["product_id"]
                )
            except Exception:  # noqa: BLE001 — never let freshness block the pipeline
                freshness = {"stale": False, "confidence": 0.0, "reason": "error"}
        # Only override cache when we're reasonably sure something moved.
        # Low-confidence "no baseline" or "unreachable" leave the cache in
        # place — conservative, matches existing behavior.
        if freshness.get("stale") and float(freshness.get("confidence") or 0) >= 0.7:
            force = True  # fall through to re-run below

    if cached and not force:
        return {
            "icp": cached,
            "freshness": freshness,
            "agent_timings": {"ensure_icp": round(time.perf_counter() - t0, 3)},
        }

    try:
        # Invoke the existing deep_icp subgraph to build fresh ICP.
        sub = deep_icp_graph.build_graph()
        icp = await sub.ainvoke({"product_id": state["product_id"]})
    except Exception as e:  # noqa: BLE001 — partial failure, not fatal
        # Fall back to whatever's cached (possibly {}). Record the error so the
        # final report surfaces the missing/stale ICP section, but keep going.
        return {
            "icp": cached or {},
            "freshness": freshness,
            "subgraph_errors": {"ensure_icp": str(e)[:500]},
            "agent_timings": {"ensure_icp": round(time.perf_counter() - t0, 3)},
        }

    # Persist so other graphs can pick it up immediately.
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE products
                SET icp_analysis = %s::jsonb,
                    icp_analyzed_at = now()::text,
                    updated_at = now()::text
                WHERE id = %s
                """,
                (json.dumps(icp), int(state["product_id"])),
            )
    return {
        "icp": icp,
        "freshness": freshness,
        "agent_timings": {"ensure_icp": round(time.perf_counter() - t0, 3)},
    }


async def ensure_competitors(state: ProductIntelState) -> dict:
    """Check whether a completed competitor analysis exists. Don't invoke the
    team graph implicitly — competitor scraping is heavy and the existing
    approve-then-scrape workflow (``/competitors`` UI) is the expected entry
    point. We just surface whether data is available for the downstream nodes.

    Freshness-aware: if the freshness gate flags the product's own landing
    page as stale with high confidence, mark the completed competitor
    analysis as ``maybe_stale`` so downstream nodes (and the UI) can choose
    to re-trigger the competitors team graph.
    """
    if state.get("_error"):
        return {}
    # Checkpoint-aware short-circuit: cheap COUNT query, but still skippable.
    if state.get("competitive") is not None:
        return {}
    t0 = time.perf_counter()
    product_id = state["product_id"]
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
            row = cur.fetchone() or (0,)
    has_competitors = bool(row[0])

    # Surface freshness verdict so the UI can show a "re-scan competitors"
    # nudge without re-computing it. ``ensure_icp`` populates state["freshness"]
    # on its first call; if that didn't run (force_refresh from caller), we
    # don't block — just emit a neutral verdict.
    freshness = state.get("freshness") or {}
    maybe_stale = (
        has_competitors
        and bool(freshness.get("stale"))
        and float(freshness.get("confidence") or 0) >= 0.7
    )

    # Fetch named competitors so the positioning graph can build a real
    # competitor_frame rather than fabricating anti-pattern names like
    # "naive chunking" when the snapshot is empty.
    named_competitors: list[dict[str, Any]] = []
    if has_competitors:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
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

    return {
        "competitive": {
            "has_completed_analysis": has_competitors,
            "competitor_count": row[0],
            "maybe_stale": maybe_stale,
            "freshness_reason": freshness.get("reason", ""),
            "competitors": named_competitors,
        },
        "agent_timings": {"ensure_competitors": round(time.perf_counter() - t0, 3)},
    }


async def run_pricing(state: ProductIntelState) -> dict:
    """Invoke the pricing subgraph. The subgraph's write_rationale node
    persists pricing_analysis itself — no second write here.

    Uses the module-level ``_PRICING_GRAPH`` so the subgraph is compiled
    exactly once per process. Streams progress updates into
    ``pricing_subgraph_progress`` so the supervisor's notify_complete can
    surface per-node progress without changing the webhook contract.
    """
    if state.get("_error"):
        return {}
    # Checkpoint-aware short-circuit: skip the entire pricing subgraph
    # invocation when a prior resumed run already produced a pricing payload.
    existing = state.get("pricing") or {}
    if existing.get("model") or existing.get("rationale"):
        return {}
    t0 = time.perf_counter()
    try:
        result, progress = await stream_subgraph(
            _PRICING_GRAPH,
            {"product_id": state["product_id"]},
            _PRICING_BUSINESS_NODES,
        )
    except Exception as e:  # noqa: BLE001 — partial failure, not fatal
        # Report proceeds without pricing; the missing section is noted in the
        # final graph_meta.partial_failures and in the synthesize prompt.
        return {
            "pricing": existing or {},
            "subgraph_errors": {"run_pricing": str(e)[:500]},
            "agent_timings": {"run_pricing": round(time.perf_counter() - t0, 3)},
        }
    # Fold subgraph-internal telemetry into the supervisor's graph_meta so
    # intel_report.graph_meta.totals reflects real costs (not just the
    # supervisor's own LLM calls).
    sub_tel = _fold_subgraph_telemetry(None, "run_pricing", result)
    return {
        "pricing": result.get("pricing") or {},
        "pricing_subgraph_progress": progress,
        "agent_timings": {"run_pricing": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"telemetry": sub_tel} if sub_tel else {},
    }


async def run_gtm(state: ProductIntelState) -> dict:
    """Invoke the GTM subgraph. The subgraph's draft_plan node persists
    gtm_analysis itself — no second write here.

    Uses the module-level ``_GTM_GRAPH`` so the subgraph is compiled exactly
    once per process. Streams progress updates into ``gtm_subgraph_progress``.
    """
    if state.get("_error"):
        return {}
    # Checkpoint-aware short-circuit: skip the entire GTM subgraph invocation
    # when a prior resumed run already produced a gtm payload.
    existing = state.get("gtm") or {}
    if existing.get("channels") or existing.get("messaging_pillars"):
        return {}
    t0 = time.perf_counter()
    try:
        result, progress = await stream_subgraph(
            _GTM_GRAPH,
            {"product_id": state["product_id"]},
            _GTM_BUSINESS_NODES,
        )
    except Exception as e:  # noqa: BLE001 — partial failure, not fatal
        return {
            "gtm": existing or {},
            "subgraph_errors": {"run_gtm": str(e)[:500]},
            "agent_timings": {"run_gtm": round(time.perf_counter() - t0, 3)},
        }
    sub_tel = _fold_subgraph_telemetry(None, "run_gtm", result)
    return {
        "gtm": result.get("gtm") or {},
        "gtm_subgraph_progress": progress,
        "agent_timings": {"run_gtm": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"telemetry": sub_tel} if sub_tel else {},
    }


def _fan_out_pricing_gtm(_state: ProductIntelState) -> list[str]:
    return ["run_pricing", "run_gtm"]


async def run_positioning(state: ProductIntelState) -> dict:
    """Synthesize positioning after pricing/GTM finish.

    Feeds the already-loaded product, icp, competitive, pricing, and gtm
    dicts straight into the positioning subgraph — no second DB round-trip.
    The subgraph's ``stress_test`` node persists to ``products.positioning_analysis``
    so the read path is ready before ``synthesize_report`` runs.
    """
    if state.get("_error"):
        return {}
    existing = state.get("positioning") or {}
    if existing.get("positioning_statement"):
        return {}  # checkpoint-aware short-circuit
    t0 = time.perf_counter()
    try:
        result, _progress = await stream_subgraph(
            _POSITIONING_GRAPH,
            {
                "product_id": state["product_id"],
                "product": state.get("product") or {},
                "icp": state.get("icp") or {},
                "competitive": state.get("competitive") or {},
                "pricing": state.get("pricing") or {},
                "gtm": state.get("gtm") or {},
            },
            _POSITIONING_BUSINESS_NODES,
        )
    except Exception as e:  # noqa: BLE001 — partial failure, not fatal
        # Positioning is a bonus — never block the main report on its failure.
        # Record it so the report notes the missing section.
        return {
            "positioning": {},
            "subgraph_errors": {"run_positioning": str(e)[:500]},
            "agent_timings": {"run_positioning": round(time.perf_counter() - t0, 3)},
        }
    sub_tel = _fold_subgraph_telemetry(None, "run_positioning", result)
    return {
        "positioning": result.get("positioning") or {},
        "agent_timings": {"run_positioning": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"telemetry": sub_tel} if sub_tel else {},
    }


async def synthesize_report(state: ProductIntelState) -> dict:
    if state.get("_error"):
        return {}
    # Checkpoint-aware short-circuit: terminal report writer. Skip the deep-tier
    # LLM call + products UPDATE when a prior resumed run already produced it.
    existing_report = state.get("report") or {}
    if existing_report.get("tldr"):
        return {}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    profile = state.get("product_profile") or {}
    icp = state.get("icp") or {}
    pricing = state.get("pricing") or {}
    gtm = state.get("gtm") or {}
    competitive = state.get("competitive") or {}
    positioning = state.get("positioning") or {}
    subgraph_errors = dict(state.get("subgraph_errors") or {})

    # Build a human-readable partial-failure note so the LLM acknowledges
    # missing sections in its TL;DR / priorities rather than hallucinating
    # around gaps. Each entry maps subgraph→short reason; we truncate the
    # reason so the prompt stays bounded.
    missing_lines: list[str] = []
    if subgraph_errors:
        for name, reason in subgraph_errors.items():
            label = {
                "ensure_icp": "ICP",
                "run_pricing": "pricing",
                "run_gtm": "GTM",
                "run_positioning": "positioning",
            }.get(name, name)
            missing_lines.append(f"- {label}: {str(reason)[:160]}")
    partial_note = (
        "IMPORTANT: Some upstream analyses failed — do NOT invent content for "
        "these; acknowledge the gap and focus the TL;DR + priorities on what IS "
        "available:\n" + "\n".join(missing_lines) + "\n\n"
        if missing_lines
        else ""
    )

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result, tel_synth = await ainvoke_json_with_telemetry(
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
                        "TL;DR (e.g. \"pricing not yet analyzed\") rather than making up numbers. "
                        'Return strict JSON: {"tldr":string,"top_3_priorities":[string],'
                        '"key_risks":[string],"quick_wins":[string]}'
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"{partial_note}"
                        f"Product: {product.get('name', '?')} — {product.get('url', '?')}\n"
                        f"Profile one-liner: {profile.get('one_liner', '')}\n\n"
                        f"ICP summary: weighted_total={icp.get('weighted_total', '?')}, "
                        f"segments={len(icp.get('segments') or [])}, personas={len(icp.get('personas') or [])}\n\n"
                        f"Competitor data available: {competitive.get('has_completed_analysis', False)} "
                        f"(count={competitive.get('competitor_count', 0)})\n\n"
                        f"Pricing recommendation: "
                        f"{(pricing.get('rationale') or {}).get('recommendation', 'none yet')}\n\n"
                        f"GTM channels chosen: "
                        f"{', '.join([c.get('name', '') for c in (gtm.get('channels') or [])][:5])}\n\n"
                        f"Positioning statement: {positioning.get('positioning_statement', 'not yet synthesized')}\n"
                        f"Differentiators: {json.dumps(positioning.get('differentiators') or [])[:400]}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"synthesize_report: {e}"}

    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    telemetry = merge_node_telemetry(telemetry, "synthesize_report", tel_synth)
    totals = compute_totals(telemetry)
    meta = product_intel_graph_meta(
        graph="product_intel",
        model=os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-reasoner"),
        agent_timings=state.get("agent_timings") or {},
        telemetry=telemetry,
        totals=totals,
    )
    # Stamp partial-failure list into graph_meta so consumers (UI, webhook,
    # analytics) can surface "X section missing" without re-parsing the TL;DR.
    # Non-breaking: ProductIntelReport.graph_meta is a loose jsonb dict.
    if subgraph_errors:
        meta["partial_failures"] = [
            {"subgraph": k, "reason": str(v)[:500]} for k, v in subgraph_errors.items()
        ]
    report = ProductIntelReport.model_validate(
        {
            **(result if isinstance(result, dict) else {}),
            "product_profile": profile,
            "positioning": positioning or None,
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
            # Mirror run-level cost into product_intel_runs so it's queryable
            # without unpacking the jsonb. Best-effort: a missing app_run_id
            # (sync /runs/wait invocation) skips the update silently.
            run_id = state.get("app_run_id")
            if run_id:
                try:
                    cur.execute(
                        """
                        UPDATE product_intel_runs
                        SET total_cost_usd = %s
                        WHERE id = %s
                        """,
                        (totals.get("total_cost_usd", 0.0), str(run_id)),
                    )
                except Exception:  # noqa: BLE001 — cost accounting is best-effort
                    pass

    return {
        "report": dumped,
        "graph_meta": {"telemetry": telemetry, **{k: v for k, v in meta.items() if k != "telemetry"}},
        "agent_timings": {"synthesize_report": round(time.perf_counter() - t0, 3)},
    }


async def notify_error_node(state: ProductIntelState) -> dict:
    err = state.get("_error") or "unknown error"
    await notify_error(state, err)
    return {}


def _route_final(state: ProductIntelState) -> str:
    return "notify_error_node" if state.get("_error") else "notify_complete"


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(_ProductIntelStateWithError)
    builder.add_node("load_and_profile", load_and_profile)
    builder.add_node("ensure_icp", ensure_icp)
    builder.add_node("ensure_competitors", ensure_competitors)
    builder.add_node("run_pricing", run_pricing)
    builder.add_node("run_gtm", run_gtm)
    builder.add_node("run_positioning", run_positioning)
    builder.add_node("synthesize_report", synthesize_report)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "load_and_profile")
    builder.add_edge("load_and_profile", "ensure_icp")
    builder.add_edge("ensure_icp", "ensure_competitors")
    builder.add_conditional_edges(
        "ensure_competitors", _fan_out_pricing_gtm, ["run_pricing", "run_gtm"]
    )
    builder.add_edge("run_pricing", "run_positioning")
    builder.add_edge("run_gtm", "run_positioning")
    builder.add_edge("run_positioning", "synthesize_report")
    builder.add_conditional_edges(
        "synthesize_report", _route_final, ["notify_complete", "notify_error_node"]
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
