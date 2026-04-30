"""Seed-query → company candidates discovery graph.

Takes a fuzzy seed query (e.g. "AI consultancies in Europe doing RAG"),
expands it into facets, brainstorms 12-20 real companies via deepseek-v4-pro,
deduplicates against existing DB rows, applies a keyword heuristic pre-score,
and INSERTs survivors into the ``companies`` table with ``tags=['discovery-candidate']``.
"""

from __future__ import annotations

import json
import os
import re
import time
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from . import blocklist
from .deep_icp_graph import _dsn
from .llm import (
    ainvoke_json_with_telemetry,
    compute_totals,
    deepseek_model_name,
    make_deepseek_pro,
    merge_node_telemetry,
)
from .product_intel_schemas import product_intel_graph_meta
from .state import CompanyDiscoveryState


# ── Helpers ──────────────────────────────────────────────────────────────

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(s: str) -> str:
    return _SLUG_RE.sub("-", (s or "").lower()).strip("-")


# ── Nodes ────────────────────────────────────────────────────────────────

async def expand_seed(state: CompanyDiscoveryState) -> dict:
    if state.get("_error"):
        return {}
    # Skip if caller already supplied both vertical and keywords.
    if state.get("vertical") and state.get("keywords"):
        return {}
    t0 = time.perf_counter()
    try:
        llm = make_deepseek_pro(temperature=0.2)
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "Extract B2B lead-gen facets from a user query. "
                        'Return strict JSON: {"vertical": string|null, "geography": string|null, '
                        '"size_band": string|null, "keywords": [string]}. '
                        "size_band is one of: seed, startup, smb, midmarket, enterprise, or null."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Query: {state['seed_query']}\n\nReturn JSON only.",
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"expand_seed: {e}"}

    payload = result if isinstance(result, dict) else {}
    vertical = payload.get("vertical") or state.get("vertical")
    geography = payload.get("geography") or state.get("geography")
    size_band = payload.get("size_band") or state.get("size_band")
    keywords = payload.get("keywords") or state.get("keywords") or []
    if not isinstance(keywords, list):
        keywords = []

    return {
        "vertical": vertical,
        "geography": geography,
        "size_band": size_band,
        "keywords": keywords,
        "agent_timings": {"expand_seed": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "expand_seed", tel),
        },
    }


async def brainstorm(state: CompanyDiscoveryState) -> dict:
    if state.get("_error"):
        return {}
    if state.get("candidates"):
        return {}
    t0 = time.perf_counter()
    vertical = state.get("vertical") or ""
    geography = state.get("geography") or ""
    size_band = state.get("size_band") or ""
    keywords = state.get("keywords") or []

    try:
        llm = make_deepseek_pro(temperature=0.2)
        result, tel = await ainvoke_json_with_telemetry(
            llm,
            [
                {
                    "role": "system",
                    "content": (
                        "You are a B2B lead researcher. Given a vertical, geography, size, "
                        "and keywords, name 12-20 real, currently-operating companies. "
                        "Each must have a resolvable primary domain. Do NOT fabricate domains. "
                        "No marketplaces, no Fortune 500, no listicle aggregators. "
                        'Return strict JSON: {"candidates":[{"name": string, "domain": string, "why": string}]}. '
                        "Each why is ≤ 20 words and cites a concrete signal "
                        "(hiring, product line, technical focus)."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"Vertical: {vertical}\n"
                        f"Geography: {geography}\n"
                        f"Size band: {size_band}\n"
                        f"Keywords: {', '.join(keywords)}\n\n"
                        "Return JSON only."
                    ),
                },
            ],
            provider="deepseek",
        )
    except Exception as e:  # noqa: BLE001
        return {"_error": f"brainstorm: {e}"}

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
        domain = blocklist.canonicalize_domain(str(c.get("domain") or ""))
        why = str(c.get("why") or "").strip()[:300]
        if not name or not domain or "." not in domain:
            continue
        if domain in seen:
            continue
        seen.add(domain)
        cleaned.append({"name": name[:240], "domain": domain, "why": why})

    prior_tel = (state.get("graph_meta") or {}).get("telemetry")
    return {
        "candidates": cleaned[:20],
        "agent_timings": {"brainstorm": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "telemetry": merge_node_telemetry(prior_tel, "brainstorm", tel),
        },
    }


async def dedupe(state: CompanyDiscoveryState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    candidates = state.get("candidates") or []
    if not candidates:
        return {"filtered": [], "skipped_existing": 0}

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
        "skipped_existing": len(candidates) - len(kept),
        "agent_timings": {"dedupe": round(time.perf_counter() - t0, 3)},
    }


async def pre_score(state: CompanyDiscoveryState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    filtered = state.get("filtered") or []

    scored: list[dict[str, Any]] = []
    for c in filtered:
        why_lower = (c.get("why") or "").lower()
        s = 0.0
        if any(kw in why_lower for kw in {"ai", "ml", "llm", "genai", "agent", "rag", "foundation"}):
            s += 0.4
        if any(kw in why_lower for kw in {"consult", "agency", "services", "studio", "advisor"}):
            s += 0.3
        if any(kw in why_lower for kw in {"remote", "distributed", "global"}):
            s += 0.2
        s = min(s, 1.0)
        if s < 0.2:
            continue
        scored.append({**c, "pre_score": round(s, 2)})

    scored.sort(key=lambda x: x["pre_score"], reverse=True)
    return {
        "scored": scored,
        "agent_timings": {"pre_score": round(time.perf_counter() - t0, 3)},
    }


async def persist(state: CompanyDiscoveryState) -> dict:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    scored = state.get("scored") or []
    vertical = state.get("vertical") or None
    geography = state.get("geography") or None

    # Drop blocklisted domains before INSERT — the LLM brainstorm path
    # bypasses the blocklist that pipeline_graph.run_discover applies on
    # the explicit-domains path.
    blocked_skipped = 0
    try:
        blocked = {b.domain for b in blocklist.list_all()}
    except (psycopg.Error, RuntimeError):
        blocked = set()
    if blocked:
        before = len(scored)
        scored = [c for c in scored if c["domain"] not in blocked]
        blocked_skipped = before - len(scored)

    inserted_ids: list[int] = []
    existing_ids: list[int] = []

    if scored:
        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    for c in scored:
                        tags_list: list[str] = ["discovery-candidate"]
                        if vertical:
                            tags_list.append(vertical)
                        if geography:
                            tags_list.append(geography)
                        key = _slugify(c["domain"])[:200]
                        cur.execute(
                            """
                            INSERT INTO companies
                              (tenant_id, key, name, canonical_domain, website,
                               category, ai_tier, tags, score, score_reasons,
                               created_at, updated_at)
                            VALUES
                              (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                               now()::text, now()::text)
                            ON CONFLICT (key) DO NOTHING
                            RETURNING id, (xmax = 0) AS inserted
                            """,
                            (
                                "vadim",
                                key,
                                c["name"],
                                c["domain"],
                                f"https://{c['domain']}",
                                "UNKNOWN",
                                0,
                                json.dumps(tags_list),
                                c["pre_score"],
                                json.dumps([c["why"]]),
                            ),
                        )
                        row = cur.fetchone()
                        if row is None:
                            # ON CONFLICT DO NOTHING with no RETURNING row means
                            # an existing row collided on key — look it up so the
                            # summary still reports the id.
                            cur.execute(
                                "SELECT id FROM companies WHERE key = %s",
                                (key,),
                            )
                            existing = cur.fetchone()
                            if existing:
                                existing_ids.append(int(existing[0]))
                            continue
                        company_id, was_inserted = int(row[0]), bool(row[1])
                        if was_inserted:
                            inserted_ids.append(company_id)
                        else:
                            existing_ids.append(company_id)
        except psycopg.Error as e:
            return {"_error": f"persist: {e}"}

    model = deepseek_model_name("deep")
    telemetry = (state.get("graph_meta") or {}).get("telemetry") or {}
    agent_timings_so_far = dict(state.get("agent_timings") or {})
    agent_timings_so_far["persist"] = round(time.perf_counter() - t0, 3)
    meta = product_intel_graph_meta(
        graph="company_discovery",
        model=model,
        agent_timings=agent_timings_so_far,
        telemetry=telemetry,
        totals=compute_totals(telemetry),
    )

    summary: dict[str, Any] = {
        "seed_query": state.get("seed_query"),
        "keywords": state.get("keywords") or [],
        "vertical": vertical,
        "candidates_count": len(state.get("candidates") or []),
        "filtered_count": len(state.get("filtered") or []),
        "scored_count": len(scored),
        "inserted_count": len(inserted_ids),
        "inserted_ids": inserted_ids,
        "existing_ids": existing_ids,
        "skipped_existing": state.get("skipped_existing") or 0,
        "skipped_blocked": blocked_skipped,
        "graph_meta": meta,
    }

    return {
        "inserted_ids": inserted_ids,
        "skipped_existing": state.get("skipped_existing") or 0,
        "summary": summary,
        "agent_timings": {"persist": round(time.perf_counter() - t0, 3)},
    }


# ── Graph builder ─────────────────────────────────────────────────────────

def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompanyDiscoveryState)
    builder.add_node("expand_seed", expand_seed)
    builder.add_node("brainstorm", brainstorm)
    builder.add_node("dedupe", dedupe)
    builder.add_node("pre_score", pre_score)
    builder.add_node("persist", persist)
    builder.add_edge(START, "expand_seed")
    builder.add_edge("expand_seed", "brainstorm")
    builder.add_edge("brainstorm", "dedupe")
    builder.add_edge("dedupe", "pre_score")
    builder.add_edge("pre_score", "persist")
    builder.add_edge("persist", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
