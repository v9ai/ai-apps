"""Deep product-market ICP *team* graph.

This is a multi-agent team version of `deep_icp_graph.py`. Instead of one
linear chain, four specialist nodes fan out in parallel and a synthesizer
merges their outputs into the exact `DeepICPOutput` shape the frontend
already consumes.

Nodes:
    load_product
    ├── market_researcher    (segments, GTM)
    ├── persona_builder      (buyer personas)
    ├── anti_icp_analyst     (anti-ICP + deal breakers)
    └── criteria_scorer      (weighted rubric)
        → synthesizer        (merge → DeepICPOutput)

Registered as the `icp_team` graph in `backend/langgraph.json` and exposed
via the `enhanceProductIcpTeam()` client wrapper.
"""

from __future__ import annotations

import json
import os
import time
from typing import Any

from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _product_brief, load_product
from .icp_schemas import WEIGHTS, DeepICPOutput, GraphMeta
from .llm import ainvoke_json, make_llm
from .state import ICPTeamState

CRITERION_DESCRIPTIONS: dict[str, str] = {
    "segment_clarity": "How sharp and addressable the target segment is (industry, vertical, stage, geography).",
    "buyer_persona_specificity": "Concreteness of decision-maker persona: title, seniority, department, daily pain.",
    "pain_solution_fit": "Strength of evidence that the described pain is burning and the product solves it.",
    "distribution_gtm_signal": "PLG vs enterprise vs community, pricing clarity, self-serve vs sales-led fit.",
    "anti_icp_clarity": "How clearly we can articulate who this is NOT for (guards against false positives).",
}


async def market_researcher(state: ICPTeamState) -> dict:
    t0 = time.perf_counter()
    brief = _product_brief(state.get("product") or {})
    llm = make_llm(temperature=0.3)
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You are a B2B market-research analyst. Given a product brief, "
                    "enumerate target segments and go-to-market signals grounded "
                    "ONLY in the brief. Do not fabricate features. Return strict JSON: "
                    '{"segments": [{"name","industry","stage","geo","fit"(0..1),"reasoning"}], '
                    '"pains": [string], '
                    '"gtm_signals": {"motion":"plg"|"sales-led"|"community"|"hybrid","pricing_hint":string,"self_serve":boolean,"notes":string}}.'
                ),
            },
            {"role": "user", "content": f"Product brief:\n{brief}\n\nReturn JSON only."},
        ],
    )
    result.setdefault("segments", [])
    result.setdefault("pains", [])
    result.setdefault("gtm_signals", {})
    return {
        "market_research": result,
        "agent_timings": {"market_researcher": round(time.perf_counter() - t0, 3)},
    }


async def persona_builder(state: ICPTeamState) -> dict:
    t0 = time.perf_counter()
    brief = _product_brief(state.get("product") or {})
    llm = make_llm(temperature=0.3)
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You are a buyer-persona specialist. Given a product brief, "
                    "produce 3-5 concrete personas the product should target: "
                    "decision-maker, end user, and influencer when applicable. "
                    'Return strict JSON: {"personas": [{"title","seniority","department","pain","channel"}]}. '
                    "Ground every persona in the brief — no fabrication."
                ),
            },
            {"role": "user", "content": f"Product brief:\n{brief}\n\nReturn JSON only."},
        ],
    )
    personas = result.get("personas") or []
    if not isinstance(personas, list):
        personas = []
    return {
        "personas_research": personas,
        "agent_timings": {"persona_builder": round(time.perf_counter() - t0, 3)},
    }


async def anti_icp_analyst(state: ICPTeamState) -> dict:
    t0 = time.perf_counter()
    brief = _product_brief(state.get("product") or {})
    llm = make_llm(temperature=0.2)
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You identify who a product is NOT for and hard disqualifiers. "
                    "Return strict JSON: "
                    '{"anti_icp": [string], '
                    '"deal_breakers": [{"name","severity":"low"|"medium"|"high","reason"}]}. '
                    "Be decisive — at least 2 anti_icp entries and 1 deal_breaker."
                ),
            },
            {"role": "user", "content": f"Product brief:\n{brief}\n\nReturn JSON only."},
        ],
    )
    anti_icp = result.get("anti_icp") or []
    if not isinstance(anti_icp, list):
        anti_icp = []
    deal_breakers = result.get("deal_breakers") or []
    if not isinstance(deal_breakers, list):
        deal_breakers = []
    return {
        "anti_icp_research": {"anti_icp": anti_icp, "deal_breakers": deal_breakers},
        "agent_timings": {"anti_icp_analyst": round(time.perf_counter() - t0, 3)},
    }


async def criteria_scorer(state: ICPTeamState) -> dict:
    t0 = time.perf_counter()
    brief = _product_brief(state.get("product") or {})
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
                    "(1-2 sentences), evidence (array of short quotes/facts from the brief). "
                    'Return strict JSON: {"criteria_scores": {<criterion>: {score,confidence,justification,evidence:[]}}}. '
                    "Use ONLY these criterion names: " + ", ".join(WEIGHTS.keys())
                ),
            },
            {
                "role": "user",
                "content": f"Product brief:\n{brief}\n\nRubric:\n{rubric}\n\nReturn JSON only.",
            },
        ],
    )
    scores = result.get("criteria_scores") or {}
    normalized: dict[str, dict[str, Any]] = {}
    for name in WEIGHTS:
        entry = scores.get(name) or {}
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
    timings = dict(state.get("agent_timings") or {})
    timings["criteria_scorer"] = round(time.perf_counter() - t0, 3)
    return {"criteria_research": normalized, "agent_timings": timings}


def _fan_out(_state: ICPTeamState) -> list[str]:
    return ["market_researcher", "persona_builder", "anti_icp_analyst", "criteria_scorer"]


async def synthesizer(state: ICPTeamState) -> dict:
    research = state.get("market_research") or {}
    personas_raw = state.get("personas_research") or []
    anti = state.get("anti_icp_research") or {}
    criteria = state.get("criteria_research") or {}

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
    for per in personas_raw[:6]:
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
        for x in (anti.get("anti_icp") or [])
        if isinstance(x, (str, int, float))
    ][:8]
    if not anti_icp:
        anti_icp = ["Unknown — analyst could not articulate an anti-ICP from the brief."]

    deal_breakers_raw = anti.get("deal_breakers") or []
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

    model_name = os.environ.get("LLM_MODEL", "")
    meta = GraphMeta(model=model_name).model_dump()
    meta["team"] = "icp_team"
    meta["agent_timings"] = state.get("agent_timings") or {}

    validated = DeepICPOutput.model_validate(
        {
            "criteria_scores": criteria,
            "weighted_total": weighted_total,
            "segments": segments,
            "personas": personas,
            "anti_icp": anti_icp,
            "deal_breakers": deal_breakers,
            "graph_meta": meta,
        }
    )
    dumped = validated.model_dump()
    # Re-apply the extra meta keys (Pydantic GraphMeta drops unknown keys).
    dumped["graph_meta"] = {**dumped.get("graph_meta", {}), "team": "icp_team",
                           "agent_timings": state.get("agent_timings") or {}}
    return dumped


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ICPTeamState)
    builder.add_node("load_product", load_product)
    builder.add_node("market_researcher", market_researcher)
    builder.add_node("persona_builder", persona_builder)
    builder.add_node("anti_icp_analyst", anti_icp_analyst)
    builder.add_node("criteria_scorer", criteria_scorer)
    builder.add_node("synthesizer", synthesizer)

    builder.add_edge(START, "load_product")
    builder.add_conditional_edges(
        "load_product",
        _fan_out,
        ["market_researcher", "persona_builder", "anti_icp_analyst", "criteria_scorer"],
    )
    builder.add_edge("market_researcher", "synthesizer")
    builder.add_edge("persona_builder", "synthesizer")
    builder.add_edge("anti_icp_analyst", "synthesizer")
    builder.add_edge("criteria_scorer", "synthesizer")
    builder.add_edge("synthesizer", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
