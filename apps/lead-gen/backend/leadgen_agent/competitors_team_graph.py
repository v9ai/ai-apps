"""Competitors discovery *team* graph.

Multi-agent competitor discovery that replaces the single-shot LLM call in
`src/lib/competitors/discover.ts`. Structure:

    load_product
        → discovery_scout        (LLM → candidate list)
          ├── differentiator     (per-candidate positioning)
          └── threat_assessor    (per-candidate threat score)
            → synthesizer        (merge → competitors list)

Output shape matches the `Competitor` row the existing `/competitors/{id}`
UI already renders: {name, url, domain, description, positioning_headline,
positioning_tagline, target_audience}, plus a threat_score that the
Apollo resolver can drop into analysis JSON.
"""

from __future__ import annotations

import os
import time
from typing import Any
from urllib.parse import urlparse

from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _product_brief, load_product
from .icp_schemas import GRAPH_VERSION
from .llm import ainvoke_json, make_llm
from .loaders import competitor_loader
from .state import CompetitorsTeamState


def _extract_domain(url: str) -> str:
    try:
        host = urlparse(url).hostname or ""
        return host.removeprefix("www.")
    except Exception:
        return ""


SCRAPED_EXCERPT_CHARS = 4000


def _grounding_block(
    candidates: list[dict[str, Any]], pages: dict[str, dict[str, Any]]
) -> str:
    """Format scraped markdown per candidate for inclusion in LLM prompts."""
    if not pages:
        return ""
    parts: list[str] = []
    for c in candidates:
        url = c["url"]
        entry = pages.get(url) or {}
        md = (entry.get("markdown") or "").strip()
        if not md:
            continue
        loader = entry.get("loader", "unknown")
        parts.append(
            f"### {c['name']} ({url}) — loader={loader}\n<<<\n"
            f"{md[:SCRAPED_EXCERPT_CHARS]}\n>>>"
        )
    if not parts:
        return ""
    return "\n\nScraped content from competitor sites:\n" + "\n\n".join(parts)


async def discovery_scout(state: CompetitorsTeamState) -> dict:
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    llm = make_llm(temperature=0.3)
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You are a B2B market analyst. Given a seed product, return 5-7 "
                    "direct competitors. A direct competitor serves the same buyer, "
                    "use case, and job-to-be-done, is live and revenue-generating, "
                    "and has a public marketing site with pricing and features. "
                    'Return strict JSON: {"competitors": [{"name","url","description"}]}. '
                    "URLs must be the official marketing homepage (https, no params)."
                ),
            },
            {"role": "user", "content": f"Seed product:\n{brief}\n\nReturn JSON only."},
        ],
    )
    raw = result.get("competitors") or []
    candidates: list[dict[str, Any]] = []
    seen: set[str] = set()
    for c in raw:
        if not isinstance(c, dict):
            continue
        url = str(c.get("url", "")).strip()
        name = str(c.get("name", "")).strip()
        if not url or not name:
            continue
        domain = _extract_domain(url)
        if not domain or domain in seen:
            continue
        seen.add(domain)
        candidates.append(
            {
                "name": name[:160],
                "url": url,
                "domain": domain,
                "description": str(c.get("description", ""))[:400],
            }
        )
        if len(candidates) >= 7:
            break

    return {
        "candidates": candidates,
        "agent_timings": {"discovery_scout": round(time.perf_counter() - t0, 3)},
    }


async def differentiator(state: CompetitorsTeamState) -> dict:
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    candidates = state.get("candidates") or []
    if not candidates:
        return {"differentiation": {}}

    llm = make_llm(temperature=0.2)
    candidates_block = "\n".join(
        f"- {c['name']} ({c['url']}): {c.get('description', '')}" for c in candidates
    )
    grounding = _grounding_block(candidates, state.get("competitor_pages") or {})
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You position competitors relative to a seed product. For each "
                    "competitor, produce: positioning_headline (1 line), "
                    "positioning_tagline (short), target_audience (who buys it), "
                    "differentiation_angles (array of 2-4 angles vs the seed). "
                    "When scraped content is provided, ground every field in phrases "
                    "that actually appear on the competitor's site. "
                    'Return strict JSON: {"by_url": {<url>: {...}}}.'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Seed product:\n{brief}\n\nCompetitors:\n{candidates_block}"
                    f"{grounding}\n\nReturn JSON only."
                ),
            },
        ],
    )
    by_url = result.get("by_url") or {}
    if not isinstance(by_url, dict):
        by_url = {}
    return {
        "differentiation": by_url,
        "agent_timings": {"differentiator": round(time.perf_counter() - t0, 3)},
    }


async def threat_assessor(state: CompetitorsTeamState) -> dict:
    t0 = time.perf_counter()
    product = state.get("product") or {}
    brief = _product_brief(product)
    candidates = state.get("candidates") or []
    if not candidates:
        return {"threat_levels": {}}

    llm = make_llm(temperature=0.1)
    candidates_block = "\n".join(
        f"- {c['name']} ({c['url']})" for c in candidates
    )
    grounding = _grounding_block(candidates, state.get("competitor_pages") or {})
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You score how much each competitor threatens the seed product. "
                    "For each, return: threat_score (0..10), market_overlap (0..1), "
                    "rationale (1-2 sentences). When scraped content is provided, "
                    "cite concrete features/pricing/claims from it in the rationale. "
                    'Return strict JSON: {"by_url": {<url>: {threat_score,market_overlap,rationale}}}.'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Seed product:\n{brief}\n\nCompetitors:\n{candidates_block}"
                    f"{grounding}\n\nReturn JSON only."
                ),
            },
        ],
    )
    by_url = result.get("by_url") or {}
    if not isinstance(by_url, dict):
        by_url = {}
    return {
        "threat_levels": by_url,
        "agent_timings": {"threat_assessor": round(time.perf_counter() - t0, 3)},
    }


def _fan_out(_state: CompetitorsTeamState) -> list[str]:
    return ["differentiator", "threat_assessor"]


async def synthesizer(state: CompetitorsTeamState) -> dict:
    candidates = state.get("candidates") or []
    diff = state.get("differentiation") or {}
    threat = state.get("threat_levels") or {}

    competitors: list[dict[str, Any]] = []
    for c in candidates:
        url = c["url"]
        d = diff.get(url) or {}
        t = threat.get(url) or {}
        try:
            threat_score = float(t.get("threat_score", 0.0))
        except (TypeError, ValueError):
            threat_score = 0.0
        try:
            market_overlap = float(t.get("market_overlap", 0.0))
        except (TypeError, ValueError):
            market_overlap = 0.0

        angles = d.get("differentiation_angles") or []
        if not isinstance(angles, list):
            angles = []

        competitors.append(
            {
                "name": c["name"],
                "url": url,
                "domain": c.get("domain", ""),
                "description": c.get("description", "")[:400],
                "positioning_headline": str(d.get("positioning_headline", ""))[:240],
                "positioning_tagline": str(d.get("positioning_tagline", ""))[:200],
                "target_audience": str(d.get("target_audience", ""))[:240],
                "differentiation_angles": [str(a)[:240] for a in angles][:6],
                "threat_score": max(0.0, min(10.0, threat_score)),
                "market_overlap": max(0.0, min(1.0, market_overlap)),
                "threat_rationale": str(t.get("rationale", ""))[:400],
            }
        )

    competitors.sort(key=lambda c: c["threat_score"], reverse=True)

    graph_meta = {
        "version": GRAPH_VERSION,
        "team": "competitors_team",
        "model": os.environ.get("LLM_MODEL", ""),
        "agent_timings": state.get("agent_timings") or {},
    }
    return {"competitors": competitors, "graph_meta": graph_meta}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(CompetitorsTeamState)
    builder.add_node("load_product", load_product)
    builder.add_node("discovery_scout", discovery_scout)
    builder.add_node("competitor_loader", competitor_loader)
    builder.add_node("differentiator", differentiator)
    builder.add_node("threat_assessor", threat_assessor)
    builder.add_node("synthesizer", synthesizer)

    builder.add_edge(START, "load_product")
    builder.add_edge("load_product", "discovery_scout")
    builder.add_edge("discovery_scout", "competitor_loader")
    builder.add_conditional_edges(
        "competitor_loader", _fan_out, ["differentiator", "threat_assessor"]
    )
    builder.add_edge("differentiator", "synthesizer")
    builder.add_edge("threat_assessor", "synthesizer")
    builder.add_edge("synthesizer", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
