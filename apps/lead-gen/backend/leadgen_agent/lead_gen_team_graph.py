"""Lead-generation team graph — per (product, segment) discovery.

One run = one team. Given a ``product_id`` and a ``segment_index`` (0-based
into ``products.icp_analysis.segments``), the graph asks deepseek-v4-pro
for 12–15 real companies that fit the segment, deduplicates them against
existing ``companies`` rows by ``canonical_domain``, and inserts the rest
with ``tenant_id='nyx'``.

Dispatched by ``POST /dispatch/lead-gen-teams`` in ``backend/app.py``, which
fans out (3 products × 3 segments) = 9 background runs.

Flow:

    load_inputs         — product + icp_analysis.segments[segment_index]
        ↓
    generate_candidates — deepseek-v4-pro JSON list of real companies
        ↓
    dedupe              — strike rows whose canonical_domain already exists
        ↓
    persist             — INSERT ON CONFLICT (key) DO NOTHING
        ↓
    notify_complete / notify_error
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Annotated, Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _dsn
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    deepseek_model_name,
    make_llm,
    merge_node_telemetry,
)
from .notify import notify_complete, notify_error
from .product_intel_schemas import product_intel_graph_meta
from .state import _merge_dict, _merge_graph_meta


# ── State ────────────────────────────────────────────────────────────────

class LeadGenTeamState(TypedDict, total=False):
    # input
    product_id: int
    segment_index: int
    # loaded
    product: dict[str, Any]
    segment: dict[str, Any]
    # working
    candidates: list[dict[str, Any]]
    filtered: list[dict[str, Any]]
    inserted_ids: list[int]
    summary: dict[str, Any]
    # plumbing
    app_run_id: str
    webhook_url: str
    webhook_secret: str
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_graph_meta]


_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _canonicalize_domain(raw: str) -> str:
    """Strip scheme, www, path, query from a domain-ish string."""
    d = str(raw or "").strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = re.sub(r"^www\.", "", d)
    d = d.split("/")[0].split("?")[0].strip(".")
    return d


def _slugify(s: str) -> str:
    return _SLUG_RE.sub("-", (s or "").lower()).strip("-")


def _load_product_row(product_id: int, segment_index: int) -> dict[str, Any]:
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, slug, url, domain, description,
                       icp_analysis, positioning_analysis
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

    icp = _maybe_json(rec.get("icp_analysis")) or {}
    positioning = _maybe_json(rec.get("positioning_analysis")) or {}
    segments = icp.get("segments") or []
    if not isinstance(segments, list) or len(segments) <= segment_index:
        raise RuntimeError(
            f"product {product_id} has no icp_analysis.segments[{segment_index}] "
            f"(only {len(segments) if isinstance(segments, list) else 0} segments)"
        )
    segment = segments[segment_index] if isinstance(segments[segment_index], dict) else {}

    return {
        "product": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "slug": rec.get("slug") or "",
            "url": rec.get("url") or "",
            "domain": rec.get("domain") or "",
            "description": rec.get("description") or "",
            "positioning_statement": positioning.get("positioning_statement") or "",
            "category": positioning.get("category") or "",
        },
        "segment": segment,
    }


# ── Nodes ────────────────────────────────────────────────────────────────

async def load_inputs(state: LeadGenTeamState) -> dict:
    if state.get("_error"):
        return {}
    if state.get("product") and state.get("segment"):
        return {}
    try:
        product_id = int(state["product_id"])
        segment_index = int(state.get("segment_index", 0))
    except (KeyError, TypeError, ValueError) as e:
        return {"_error": f"load_inputs: {e}"}
    try:
        loaded = _load_product_row(product_id, segment_index)
    except Exception as e:  # noqa: BLE001
        return {"_error": f"load_inputs: {e}"}
    return loaded


async def generate_candidates(state: LeadGenTeamState) -> dict:
    if state.get("_error"):
        return {}
    if state.get("candidates"):
        return {}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    segment = state.get("segment") or {}

    try:
        llm = make_llm(temperature=0.2, provider="deepseek", tier="deep")
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You are a B2B lead researcher. Given a product and a target "
                        "ICP segment, name 12-15 real, currently-operating companies "
                        "that fit the segment. Each must have a resolvable primary "
                        "domain. Do NOT fabricate domains — if you aren't confident "
                        "the company exists or the domain is real, skip it. Do NOT "
                        "list the product itself or its direct competitors. "
                        'Return strict JSON: {"candidates":[{"name":string,'
                        '"domain":string,"one_line_reason":string}]}. Each reason '
                        "is ≤ 20 words and cites the concrete signal tying the "
                        "company to the segment (hiring, funding, product line, "
                        "compliance regime, etc.)."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Product:\n"
                        f"  Name: {product.get('name')}\n"
                        f"  Category: {product.get('category')}\n"
                        f"  Description: {product.get('description')}\n"
                        f"  Positioning: {product.get('positioning_statement')}\n\n"
                        "Target segment (from the product's ICP analysis):\n"
                        f"  Name: {segment.get('name')}\n"
                        f"  Industry: {segment.get('industry')}\n"
                        f"  Stage: {segment.get('stage')}\n"
                        f"  Geo: {segment.get('geo')}\n"
                        f"  Reasoning: {segment.get('reasoning')}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"generate_candidates: {e}"}

    payload = result if isinstance(result, dict) else {}
    raw = payload.get("candidates") or []
    if not isinstance(raw, list):
        raw = []

    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()
    for c in raw:
        if not isinstance(c, dict):
            continue
        name = str(c.get("name") or "").strip()
        domain = _canonicalize_domain(str(c.get("domain") or ""))
        reason = str(c.get("one_line_reason") or "").strip()[:300]
        if not name or not domain or "." not in domain:
            continue
        if domain in seen:
            continue
        seen.add(domain)
        cleaned.append({"name": name[:240], "domain": domain, "one_line_reason": reason})

    return {
        "candidates": cleaned[:15],
        "agent_timings": {"generate_candidates": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "generate_candidates", tel),
        },
    }


async def dedupe(state: LeadGenTeamState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    candidates = state.get("candidates") or []
    if not candidates:
        return {"filtered": []}

    domains = [c["domain"] for c in candidates]
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT DISTINCT canonical_domain FROM companies "
                    "WHERE canonical_domain = ANY(%s)",
                    (domains,),
                )
                existing = {row[0] for row in cur.fetchall() if row[0]}
    except psycopg.Error as e:
        return {"_error": f"dedupe: {e}"}

    kept = [c for c in candidates if c["domain"] not in existing]
    return {
        "filtered": kept,
        "agent_timings": {"dedupe": round(time.perf_counter() - t0, 3)},
    }


async def persist(state: LeadGenTeamState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    product = state.get("product") or {}
    segment = state.get("segment") or {}
    filtered = state.get("filtered") or []

    inserted_ids: list[int] = []
    product_slug = product.get("slug") or f"product-{product.get('id')}"
    seg_key = _slugify(str(segment.get("name") or "segment"))[:40] or "segment"
    tags_list = ["lead-gen", product_slug, seg_key]
    try:
        fit_score = float(segment.get("fit") or 0.6)
    except (TypeError, ValueError):
        fit_score = 0.6

    if filtered:
        rows: list[tuple[Any, ...]] = []
        for c in filtered:
            key = f"nyx:{product_slug}-{seg_key}-{_slugify(c['domain'])}"[:200]
            rows.append(
                (
                    "nyx",
                    key,
                    c["name"],
                    c["domain"],
                    f"https://{c['domain']}",
                    "PRODUCT",
                    0,
                    json.dumps(tags_list),
                    fit_score,
                    json.dumps([c["one_line_reason"]]),
                )
            )

        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    cur.executemany(
                        """
                        INSERT INTO companies
                          (tenant_id, key, name, canonical_domain, website,
                           category, ai_tier, tags, score, score_reasons,
                           created_at, updated_at)
                        VALUES
                          (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                           now()::text, now()::text)
                        ON CONFLICT (key) DO NOTHING
                        """,
                        rows,
                    )
                    keys = [r[1] for r in rows]
                    cur.execute(
                        "SELECT id FROM companies WHERE key = ANY(%s)",
                        (keys,),
                    )
                    inserted_ids = [int(r[0]) for r in cur.fetchall()]
        except psycopg.Error as e:
            return {"_error": f"persist: {e}"}

    model = deepseek_model_name("deep")
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    meta = product_intel_graph_meta(
        graph="lead_gen_team",
        model=model,
        agent_timings=state.get("agent_timings") or {},
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )

    summary = {
        "product_id": product.get("id"),
        "product_slug": product_slug,
        "segment_index": state.get("segment_index"),
        "segment_name": segment.get("name"),
        "candidates_count": len(state.get("candidates") or []),
        "filtered_count": len(filtered),
        "inserted_count": len(inserted_ids),
        "inserted_ids": inserted_ids,
        "graph_meta": meta,
    }

    return {
        "inserted_ids": inserted_ids,
        "summary": summary,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


async def notify_error_node(state: LeadGenTeamState) -> dict:
    err = state.get("_error") or "unknown error"
    await notify_error(state, err)
    return {}


def _route_after_persist(state: LeadGenTeamState) -> str:
    if state.get("_error"):
        return "notify_error_node"
    return "notify_complete"


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(LeadGenTeamState)
    builder.add_node("load_inputs", load_inputs)
    builder.add_node("generate_candidates", generate_candidates)
    builder.add_node("dedupe", dedupe)
    builder.add_node("persist", persist)
    builder.add_node("notify_complete", notify_complete)
    builder.add_node("notify_error_node", notify_error_node)

    builder.add_edge(START, "load_inputs")
    builder.add_edge("load_inputs", "generate_candidates")
    builder.add_edge("generate_candidates", "dedupe")
    builder.add_edge("dedupe", "persist")
    builder.add_conditional_edges(
        "persist",
        _route_after_persist,
        ["notify_complete", "notify_error_node"],
    )
    builder.add_edge("notify_complete", END)
    builder.add_edge("notify_error_node", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
