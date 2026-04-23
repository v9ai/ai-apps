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
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from . import deep_icp_graph, gtm_graph, pricing_graph
from .deep_icp_graph import _dsn, _product_brief
from .llm import ainvoke_json, make_llm
from .notify import notify_complete
from .product_intel_schemas import (
    ProductIntelReport,
    ProductProfile,
    product_intel_graph_meta,
)
from .state import ProductIntelState


async def load_and_profile(state: ProductIntelState) -> dict:
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
    llm = make_llm(temperature=0.1, provider="deepseek")
    result = await ainvoke_json(
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
    }


async def ensure_icp(state: ProductIntelState) -> dict:
    t0 = time.perf_counter()
    cached = state.get("icp") or {}
    force = bool(state.get("force_refresh"))
    if cached and not force:
        return {
            "icp": cached,
            "agent_timings": {"ensure_icp": round(time.perf_counter() - t0, 3)},
        }

    # Invoke the existing deep_icp subgraph to build fresh ICP.
    sub = deep_icp_graph.build_graph()
    icp = await sub.ainvoke({"product_id": state["product_id"]})

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
        "agent_timings": {"ensure_icp": round(time.perf_counter() - t0, 3)},
    }


async def ensure_competitors(state: ProductIntelState) -> dict:
    """Check whether a completed competitor analysis exists. Don't invoke the
    team graph implicitly — competitor scraping is heavy and the existing
    approve-then-scrape workflow (``/competitors`` UI) is the expected entry
    point. We just surface whether data is available for the downstream nodes."""
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
                  AND a.status = 'done'
                """,
                (int(product_id),),
            )
            row = cur.fetchone() or (0,)
    has_competitors = bool(row[0])
    return {
        "competitive": {"has_completed_analysis": has_competitors, "competitor_count": row[0]},
        "agent_timings": {"ensure_competitors": round(time.perf_counter() - t0, 3)},
    }


async def run_pricing(state: ProductIntelState) -> dict:
    """Invoke the pricing subgraph. The subgraph's write_rationale node
    persists pricing_analysis itself — no second write here."""
    t0 = time.perf_counter()
    sub = pricing_graph.build_graph()
    result = await sub.ainvoke({"product_id": state["product_id"]})
    return {
        "pricing": result.get("pricing") or {},
        "agent_timings": {"run_pricing": round(time.perf_counter() - t0, 3)},
    }


async def run_gtm(state: ProductIntelState) -> dict:
    """Invoke the GTM subgraph. The subgraph's draft_plan node persists
    gtm_analysis itself — no second write here."""
    t0 = time.perf_counter()
    sub = gtm_graph.build_graph()
    result = await sub.ainvoke({"product_id": state["product_id"]})
    return {
        "gtm": result.get("gtm") or {},
        "agent_timings": {"run_gtm": round(time.perf_counter() - t0, 3)},
    }


def _fan_out_pricing_gtm(_state: ProductIntelState) -> list[str]:
    return ["run_pricing", "run_gtm"]


async def synthesize_report(state: ProductIntelState) -> dict:
    t0 = time.perf_counter()
    product = state.get("product") or {}
    profile = state.get("product_profile") or {}
    icp = state.get("icp") or {}
    pricing = state.get("pricing") or {}
    gtm = state.get("gtm") or {}
    competitive = state.get("competitive") or {}

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
                    'Return strict JSON: {"tldr":string,"top_3_priorities":[string],'
                    '"key_risks":[string],"quick_wins":[string]}'
                ),
            },
            {
                "role": "user",
                "content": (
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
                    "Return JSON only."
                ),
            },
        ],
        provider="deepseek",
    )

    meta = product_intel_graph_meta(
        graph="product_intel",
        model=os.environ.get("DEEPSEEK_MODEL_DEEP", "deepseek-reasoner"),
        agent_timings=state.get("agent_timings") or {},
    )
    report = ProductIntelReport.model_validate(
        {
            **(result if isinstance(result, dict) else {}),
            "product_profile": profile,
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

    return {
        "report": dumped,
        "graph_meta": meta,
        "agent_timings": {"synthesize_report": round(time.perf_counter() - t0, 3)},
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ProductIntelState)
    builder.add_node("load_and_profile", load_and_profile)
    builder.add_node("ensure_icp", ensure_icp)
    builder.add_node("ensure_competitors", ensure_competitors)
    builder.add_node("run_pricing", run_pricing)
    builder.add_node("run_gtm", run_gtm)
    builder.add_node("synthesize_report", synthesize_report)

    builder.add_edge(START, "load_and_profile")
    builder.add_edge("load_and_profile", "ensure_icp")
    builder.add_edge("ensure_icp", "ensure_competitors")
    builder.add_conditional_edges(
        "ensure_competitors", _fan_out_pricing_gtm, ["run_pricing", "run_gtm"]
    )
    builder.add_edge("run_pricing", "synthesize_report")
    builder.add_edge("run_gtm", "synthesize_report")
    builder.add_edge("synthesize_report", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
