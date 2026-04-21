"""Deep product-market ICP graph.

4 nodes: load_product -> research_market -> score_criteria -> synthesize.

Given a product row id, produces a structured product-buyer ICP analysis
scored across 5 weighted dimensions (segment clarity, buyer persona
specificity, pain-solution fit, distribution/GTM signal, anti-ICP clarity).

Output shape mirrors `.claude/skills/research-icp/SKILL.md` so the UI and
deepeval tests can share one schema. See also `src/lib/langgraph-client.ts`
`DeepICPResult` for the TypeScript mirror.
"""

from __future__ import annotations

import json
import os
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .icp_schemas import WEIGHTS, DeepICPOutput, GraphMeta
from .llm import ainvoke_json, make_llm
from .state import DeepICPState

# WEIGHTS live in icp_schemas so the Pydantic layer can hash them into
# graph_meta. If tuning, update the dict there (single source of truth) and
# also `config/scoring/product-icp-weights.json` (Next.js side) to keep parity.

CRITERION_DESCRIPTIONS: dict[str, str] = {
    "segment_clarity": "How sharp and addressable the target segment is (industry, vertical, stage, geography).",
    "buyer_persona_specificity": "Concreteness of decision-maker persona: title, seniority, department, daily pain.",
    "pain_solution_fit": "Strength of evidence that the described pain is burning and the product solves it.",
    "distribution_gtm_signal": "PLG vs enterprise vs community, pricing clarity, self-serve vs sales-led fit.",
    "anti_icp_clarity": "How clearly we can articulate who this is NOT for (guards against false positives).",
}


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set — cannot load product."
        )
    return dsn


async def load_product(state: DeepICPState) -> dict:
    # Allow callers (notably deepeval tests) to pre-populate `product` to skip
    # the DB hop. Production callers pass only `product_id`.
    if state.get("product"):
        return {}

    product_id = state.get("product_id")
    if product_id is None:
        raise ValueError("product_id is required")

    sql = """
        SELECT id, name, url, domain, description, highlights
        FROM products
        WHERE id = %s
        LIMIT 1
    """
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (int(product_id),))
            row = cur.fetchone()
            if not row:
                raise RuntimeError(f"product id {product_id} not found")
            cols = [d[0] for d in cur.description or []]
    rec = dict(zip(cols, row))

    highlights = rec.get("highlights")
    if isinstance(highlights, str):
        try:
            highlights = json.loads(highlights)
        except json.JSONDecodeError:
            highlights = None

    return {
        "product": {
            "id": rec["id"],
            "name": rec.get("name") or "",
            "url": rec.get("url") or "",
            "domain": rec.get("domain") or "",
            "description": rec.get("description") or "",
            "highlights": highlights,
        }
    }


def _product_brief(product: dict[str, Any]) -> str:
    parts = [
        f"NAME: {product.get('name', '')}",
        f"URL: {product.get('url', '')}",
    ]
    if product.get("domain"):
        parts.append(f"DOMAIN: {product['domain']}")
    if product.get("description"):
        parts.append(f"DESCRIPTION: {product['description']}")
    highlights = product.get("highlights")
    if highlights:
        parts.append("HIGHLIGHTS: " + json.dumps(highlights)[:1200])
    return "\n".join(parts)


async def research_market(state: DeepICPState) -> dict:
    product = state.get("product") or {}
    brief = _product_brief(product)

    llm = make_llm(temperature=0.3)
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You are a B2B product strategy analyst. Given a product brief, "
                    "enumerate the ideal customer profile candidates grounded ONLY in "
                    "the brief. Do not fabricate features. Return strict JSON with keys: "
                    '"segments" (array of {name, industry, stage, geo, fit (0..1), reasoning}), '
                    '"personas" (array of {title, seniority, department, pain, channel}), '
                    '"pains" (array of strings), '
                    '"gtm_signals" (object with {motion: "plg"|"sales-led"|"community"|"hybrid", '
                    'pricing_hint: string, self_serve: boolean, notes: string}), '
                    '"anti_icp_candidates" (array of strings).'
                ),
            },
            {
                "role": "user",
                "content": f"Product brief:\n{brief}\n\nReturn JSON only.",
            },
        ],
    )

    # Defensive normalization: the local Qwen server occasionally drops keys.
    result.setdefault("segments", [])
    result.setdefault("personas", [])
    result.setdefault("pains", [])
    result.setdefault("gtm_signals", {})
    result.setdefault("anti_icp_candidates", [])
    return {"market_research": result}


async def score_criteria(state: DeepICPState) -> dict:
    product = state.get("product") or {}
    research = state.get("market_research") or {}
    brief = _product_brief(product)

    rubric = "\n".join(
        f"- {name} (weight {weight:.2f}): {CRITERION_DESCRIPTIONS[name]}"
        for name, weight in WEIGHTS.items()
    )

    llm = make_llm(temperature=0.1)
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You score product-market ICP quality across 5 weighted criteria. "
                    "Each criterion gets: score (0..1), confidence (0..1), justification "
                    "(1-2 sentences), evidence (array of short quotes or facts from the brief/research). "
                    "Also emit deal_breakers: an array of {name, severity ('low'|'medium'|'high'), reason} "
                    "for hard disqualifiers in the product's positioning (e.g. regulated industry gap, "
                    "missing pricing signal that blocks PLG). Return strict JSON with keys: "
                    '"criteria_scores" (object keyed by criterion name) and "deal_breakers" (array). '
                    "Use ONLY these criterion names: "
                    + ", ".join(WEIGHTS.keys())
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Product brief:\n{brief}\n\n"
                    f"Market research:\n{json.dumps(research)[:4000]}\n\n"
                    f"Rubric:\n{rubric}\n\n"
                    "Return JSON only."
                ),
            },
        ],
    )

    criteria_scores = result.get("criteria_scores") or {}
    # Coerce to the expected shape; fill any missing criterion with a safe zero.
    normalized: dict[str, dict[str, Any]] = {}
    for name in WEIGHTS:
        entry = criteria_scores.get(name) or {}
        try:
            score = float(entry.get("score", 0.0))
        except (TypeError, ValueError):
            score = 0.0
        try:
            confidence = float(entry.get("confidence", 0.5))
        except (TypeError, ValueError):
            confidence = 0.5
        normalized[name] = {
            "score": max(0.0, min(1.0, score)),
            "confidence": max(0.0, min(1.0, confidence)),
            "justification": str(entry.get("justification", ""))[:600],
            "evidence": [str(e)[:240] for e in (entry.get("evidence") or [])][:6],
        }

    deal_breakers_raw = result.get("deal_breakers") or []
    deal_breakers: list[dict[str, Any]] = []
    for db in deal_breakers_raw:
        if not isinstance(db, dict):
            continue
        sev = str(db.get("severity", "medium")).lower()
        if sev not in {"low", "medium", "high"}:
            sev = "medium"
        deal_breakers.append(
            {
                "name": str(db.get("name", ""))[:120],
                "severity": sev,
                "reason": str(db.get("reason", ""))[:400],
            }
        )

    return {
        "criterion_analyses": normalized,
        "criteria_scores": normalized,
        "deal_breakers": deal_breakers,
    }


async def synthesize(state: DeepICPState) -> dict:
    criteria = state.get("criteria_scores") or {}
    research = state.get("market_research") or {}

    weighted_total = 0.0
    for name, weight in WEIGHTS.items():
        entry = criteria.get(name) or {}
        try:
            s = float(entry.get("score", 0.0))
        except (TypeError, ValueError):
            s = 0.0
        weighted_total += s * weight
    weighted_total = round(max(0.0, min(1.0, weighted_total)), 4)

    segments: list[dict[str, Any]] = []
    for seg in (research.get("segments") or [])[:6]:
        if not isinstance(seg, dict):
            continue
        try:
            fit = float(seg.get("fit", 0.5))
        except (TypeError, ValueError):
            fit = 0.5
        segments.append(
            {
                "name": str(seg.get("name", ""))[:120],
                "industry": str(seg.get("industry", ""))[:120],
                "stage": str(seg.get("stage", ""))[:80],
                "geo": str(seg.get("geo", ""))[:80],
                "fit": max(0.0, min(1.0, fit)),
                "reasoning": str(seg.get("reasoning", ""))[:400],
            }
        )

    personas: list[dict[str, Any]] = []
    for per in (research.get("personas") or [])[:6]:
        if not isinstance(per, dict):
            continue
        personas.append(
            {
                "title": str(per.get("title", ""))[:120],
                "seniority": str(per.get("seniority", ""))[:60],
                "department": str(per.get("department", ""))[:80],
                "pain": str(per.get("pain", ""))[:400],
                "channel": str(per.get("channel", ""))[:120],
            }
        )

    anti_icp = [
        str(x)[:240]
        for x in (research.get("anti_icp_candidates") or [])
        if isinstance(x, (str, int, float))
    ][:8]
    if not anti_icp:
        # Guarantee at least one entry so downstream consumers can always render
        # the "not-for" section; a deterministic eval metric also requires >= 1.
        anti_icp = ["Unknown — analyst could not articulate an anti-ICP from the brief."]

    model_name = os.environ.get("LLM_MODEL", "")
    validated = DeepICPOutput.model_validate(
        {
            "criteria_scores": state.get("criteria_scores") or {},
            "weighted_total": weighted_total,
            "segments": segments,
            "personas": personas,
            "anti_icp": anti_icp,
            "deal_breakers": state.get("deal_breakers") or [],
            "graph_meta": GraphMeta(model=model_name),
        }
    )
    return validated.model_dump()


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(DeepICPState)
    builder.add_node("load_product", load_product)
    builder.add_node("research_market", research_market)
    builder.add_node("score_criteria", score_criteria)
    builder.add_node("synthesize", synthesize)
    builder.add_edge(START, "load_product")
    builder.add_edge("load_product", "research_market")
    builder.add_edge("research_market", "score_criteria")
    builder.add_edge("score_criteria", "synthesize")
    builder.add_edge("synthesize", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
