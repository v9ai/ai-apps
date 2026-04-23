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

import asyncio
import json
import logging
import os
import random
import re
import time
from typing import Any
from urllib.parse import urlparse, urlunparse

from langgraph.graph import END, START, StateGraph

from .deep_icp_graph import _product_brief, load_product
from .icp_schemas import GRAPH_VERSION
from .llm import ainvoke_json, make_llm
from .loaders import competitor_loader
from .state import CompetitorsTeamState

log = logging.getLogger(__name__)

# LLM retry budget for transient failures (rate-limit / 5xx / socket blip).
# Same shape as deep_competitor_graph / pricing_graph; JSON parse errors are
# re-raised immediately since re-running the prompt doesn't unstick them.
_MAX_LLM_ATTEMPTS = 3
_RETRY_BASE_DELAY = 0.75


async def _ainvoke_json_retry(
    llm: Any,
    messages: list[dict[str, str]],
    *,
    node: str,
) -> Any:
    last_exc: Exception | None = None
    for attempt in range(1, _MAX_LLM_ATTEMPTS + 1):
        try:
            return await ainvoke_json(llm, messages)
        except (json.JSONDecodeError, ValueError):
            raise
        except Exception as exc:  # noqa: BLE001
            last_exc = exc
            if attempt >= _MAX_LLM_ATTEMPTS:
                break
            delay = _RETRY_BASE_DELAY * (2 ** (attempt - 1))
            delay *= random.uniform(0.75, 1.25)
            log.warning(
                "competitors_team.%s: transient LLM failure (attempt %d/%d): %s "
                "— retrying in %.2fs",
                node, attempt, _MAX_LLM_ATTEMPTS, exc, delay,
            )
            await asyncio.sleep(delay)
    raise RuntimeError(
        f"LLM failed after {_MAX_LLM_ATTEMPTS} attempts: {last_exc}"
    ) from last_exc


def _extract_domain(url: str) -> str:
    try:
        host = (urlparse(url).hostname or "").lower()
        return host.removeprefix("www.")
    except Exception:
        return ""


_WS_RE = re.compile(r"\s+")


def _canonical_name(raw: str) -> str:
    """Normalize a competitor name for dedup / join stability.

    Downstream ``pricing_graph`` joins ``anchor_competitors`` and
    ``price_anchors`` entries by ``competitors.name`` string-match, so any drift
    here (trailing whitespace, collapsed case, hidden chars from scraped HTML)
    silently drops those entries from the grounding block. We keep the
    canonical name untouched in title-case for display but strip + collapse
    whitespace so round-tripping through the DB yields byte-identical strings.
    """
    cleaned = _WS_RE.sub(" ", (raw or "").strip())
    return cleaned[:160]


def _canonical_url(raw: str) -> str:
    """Canonicalize a competitor URL: scheme=https, host lowercased without
    ``www.``, no query/fragment, single trailing slash removed.

    The deep_competitor graph later joins ``urljoin(url, '/pricing')`` etc. on
    this value — any inconsistency (mixed case host, trailing slash) breaks
    downstream cache-hit detection on ``pages.pricing``/``pages.features``
    checkpoints."""
    if not raw:
        return ""
    try:
        parsed = urlparse(raw.strip())
    except Exception:
        return raw.strip()
    scheme = "https" if parsed.scheme in ("", "http") else parsed.scheme
    netloc = (parsed.hostname or "").lower().removeprefix("www.")
    if not netloc:
        return raw.strip()
    if parsed.port:
        netloc = f"{netloc}:{parsed.port}"
    path = (parsed.path or "").rstrip("/") or ""
    return urlunparse((scheme, netloc, path, "", "", ""))


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

    # Python-centric products (e.g. document-ingestion libraries, ML frameworks)
    # have Python OSS libraries as their real rivals, not SaaS platforms. The
    # generic prompt's "revenue-generating with pricing page" gate filters those
    # out, so we relax it when python_focus is requested.
    if state.get("python_focus"):
        system_prompt = (
            "You are an OSS ecosystem analyst. Given a seed product from the "
            "Python ecosystem, return 5-7 direct competitors. Prefer Python "
            "libraries / frameworks / SDKs published on PyPI or hosted on GitHub. "
            "Also include commercial products that serve the same job-to-be-done "
            "(they compete for the same user's mindshare even if open-source). "
            "For each: use the canonical docs site URL if one exists, otherwise "
            "the GitHub repo URL. "
            'Return strict JSON: {"competitors": [{"name","url","description"}]}. '
            "URLs must use https and no query params."
        )
    else:
        system_prompt = (
            "You are a B2B market analyst. Given a seed product, return 5-7 "
            "direct competitors. A direct competitor serves the same buyer, "
            "use case, and job-to-be-done, is live and revenue-generating, "
            "and has a public marketing site with pricing and features. "
            'Return strict JSON: {"competitors": [{"name","url","description"}]}. '
            "URLs must be the official marketing homepage (https, no params)."
        )

    result = await _ainvoke_json_retry(
        llm,
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Seed product:\n{brief}\n\nReturn JSON only."},
        ],
        node="discovery_scout",
    )
    raw = result.get("competitors") or []
    candidates: list[dict[str, Any]] = []
    seen_domains: set[str] = set()
    seen_names: set[str] = set()
    for c in raw:
        if not isinstance(c, dict):
            continue
        url = _canonical_url(str(c.get("url", "")))
        name = _canonical_name(str(c.get("name", "")))
        if not url or not name:
            continue
        domain = _extract_domain(url)
        if not domain or domain in seen_domains:
            continue
        # Additional dedup by normalized name: LLMs sometimes return the same
        # competitor twice at different URLs (e.g. ``apollo.io`` and
        # ``www.apollo.io/product``); the canonical-URL pass already catches
        # the www case but not the subpath variant. Keep first occurrence.
        name_key = name.lower()
        if name_key in seen_names:
            continue
        seen_domains.add(domain)
        seen_names.add(name_key)
        candidates.append(
            {
                "name": name,
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
    result = await _ainvoke_json_retry(
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
        node="differentiator",
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
    result = await _ainvoke_json_retry(
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
        node="threat_assessor",
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
    # Defensive final dedup: discovery_scout already canonicalizes, but the
    # downstream Apollo resolver will happily insert two ``competitors`` rows
    # for the same domain if both slip through. Keep the highest-threat
    # record per (domain, name_lowercased) key.
    seen: set[tuple[str, str]] = set()
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

        key = (
            (c.get("domain") or "").lower(),
            (c.get("name") or "").strip().lower(),
        )
        if key[0] and key in seen:
            continue
        if key[0]:
            seen.add(key)

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
