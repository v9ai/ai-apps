"""LangGraph pipeline — discover real Rebrickable MOCs related to a theme.

Three-step pipeline:
  1. identify_theme        — LLM produces theme summary, keywords, and 6-10
                             real LEGO set numbers ("anchor sets") that
                             characterize the theme.
  2. fetch_alternates      — for each anchor set, call Rebrickable
                             /sets/{setNum}/alternates/ in parallel. Returns
                             real MOC IDs, real images, real part counts.
  3. rank_by_complexity    — dedupe, sort by num_parts descending, flag the
                             top 3 as top_pick.

If LLM-suggested anchors yield zero MOCs, fall back to a curated seed list.
"""

from __future__ import annotations

import asyncio

import httpx
from langgraph.graph import END, START, StateGraph

from .graph import _get_llm, _parse_json
from .rebrickable import fetch_set_alternates, search_sets
from .theme_mocs_state import ThemeMocsState

# Curated fallback anchor sets — used only if the LLM's suggestions yield
# zero alternates (e.g., the LLM picks obscure sets that have no MOCs based
# on them). Hand-picked dragon-friendly themes.
_FALLBACK_ANCHORS = [
    "71773-1",  # Ninjago — Kai's Golden Dragon Raider
    "71772-1",  # Ninjago — The Crystal King
    "70653-1",  # Ninjago — Firstbourne
    "31102-1",  # Creator 3-in-1 — Fire Dragon
    "21348-1",  # Ideas — Dungeons & Dragons (red dragon)
    "10302-1",  # Icons — Optimus Prime (high-alternates set)
    "31058-1",  # Creator 3-in-1 — Mighty Dinosaurs
    "6086-1",   # Castle — Black Knight's Castle
]


# ── Node 1: Identify theme + pick anchor sets ────────────────────────────


async def identify_theme(state: ThemeMocsState) -> dict:
    theme_name = (state.get("theme_name") or "").strip()
    if not theme_name:
        return {
            "error": "theme_name is required",
            "theme_summary": "",
            "related_keywords": [],
            "anchor_sets": [],
        }

    # 1) Ground anchor sets in real Rebrickable search results — sets whose
    #    name actually contains the theme word, ordered by parts. This avoids
    #    the LLM picking off-theme high-alternate-count sets.
    primary_query = theme_name.lower().rstrip("s") or theme_name.lower()
    found = await search_sets(primary_query, page_size=20)
    found = [s for s in found if s.get("num_parts", 0) >= 50][:10]
    anchors = [s["set_num"] for s in found]

    # 2) LLM produces summary + keywords (used only for UI + name filter).
    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO MOC curator. Given a theme name, return a short "
                    "summary and keywords. Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Theme: {theme_name}\n\n"
                    "Return JSON:\n"
                    '{"theme_summary": "2-3 sentences on what this theme covers in MOC builds", '
                    '"related_keywords": ["keyword1", "keyword2", ...]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        data = _parse_json(resp.content)
        return {
            "theme_summary": str(data.get("theme_summary", "")),
            "related_keywords": [str(k) for k in data.get("related_keywords", [])][:12],
            "anchor_sets": anchors,
        }
    except Exception:
        return {
            "theme_summary": "",
            "related_keywords": [],
            "anchor_sets": anchors,
        }


# ── Node 2: Fetch real MOCs from Rebrickable ──────────────────────────────


def _theme_match_keywords(theme_name: str, keywords: list[str]) -> list[str]:
    """Build the set of lowercase tokens we'll look for in MOC names."""
    base = {theme_name.lower().rstrip("s"), theme_name.lower()}
    for k in keywords or []:
        k = (k or "").strip().lower()
        if not k:
            continue
        base.add(k)
        base.add(k.rstrip("s"))
    return [k for k in base if k]


def _matches_theme(name: str, tokens: list[str]) -> bool:
    n = (name or "").lower()
    return any(tok and tok in n for tok in tokens)


async def fetch_alternates(state: ThemeMocsState) -> dict:
    if state.get("error"):
        return {"mocs": []}

    anchors = state.get("anchor_sets") or []
    if not anchors:
        anchors = list(_FALLBACK_ANCHORS)

    async def _gather(anchor_list: list[str]) -> list[dict]:
        async with httpx.AsyncClient(timeout=20.0) as client:
            tasks = [fetch_set_alternates(s, client=client) for s in anchor_list]
            return await asyncio.gather(*tasks)

    results = await _gather(anchors)
    flat: list[dict] = [m for batch in results for m in batch]

    # Fallback if the LLM picked obscure sets with no alternates
    if not flat and anchors != list(_FALLBACK_ANCHORS):
        results = await _gather(list(_FALLBACK_ANCHORS))
        flat = [m for batch in results for m in batch]

    # Drop trivial entries
    flat = [m for m in flat if m.get("num_parts", 0) >= 50]

    # Filter by theme name match in the MOC title (avoids unrelated
    # alternates that share an anchor set — e.g. Optimus Prime alternates
    # from set 10302-1 leaking into a 'Dragons' search). Try strict match
    # on the theme name first; only fall back to the broader keyword set
    # if the strict pass leaves us with too few results.
    name_lower = state.get("theme_name", "").lower()
    primary = [name_lower, name_lower.rstrip("s")]
    primary = [p for p in primary if p]
    keyword_tokens = _theme_match_keywords(
        state.get("theme_name", ""),
        state.get("related_keywords") or [],
    )

    strict = [m for m in flat if _matches_theme(m["name"], primary)]
    if len(strict) >= 3:
        flat = strict
    elif keyword_tokens:
        broad = [m for m in flat if _matches_theme(m["name"], keyword_tokens)]
        if len(broad) >= 5:
            flat = broad

    # Dedupe by moc_id (first occurrence wins)
    seen: set[str] = set()
    deduped: list[dict] = []
    for m in flat:
        mid = m["moc_id"]
        if mid in seen:
            continue
        seen.add(mid)
        deduped.append(m)

    return {"mocs": deduped, "source": "rebrickable"}


# ── Node 3: Rank by complexity ────────────────────────────────────────────


async def rank_by_complexity(state: ThemeMocsState) -> dict:
    if state.get("error"):
        return {"ranked_mocs": [], "ranking_summary": ""}

    mocs = state.get("mocs", []) or []
    if not mocs:
        return {
            "ranked_mocs": [],
            "ranking_summary": "No MOCs found for this theme on Rebrickable.",
        }

    sorted_mocs = sorted(mocs, key=lambda m: m.get("num_parts", 0), reverse=True)

    ranked: list[dict] = []
    for i, m in enumerate(sorted_mocs):
        enriched = dict(m)
        if i < 3:
            enriched["top_pick"] = True
        ranked.append(enriched)

    anchors_used = sorted({m.get("anchor_set") for m in ranked if m.get("anchor_set")})
    smallest = ranked[-1].get("num_parts") if ranked else 0
    largest = ranked[0].get("num_parts") if ranked else 0
    summary = (
        f"Found {len(ranked)} MOCs across {len(anchors_used)} anchor sets, "
        f"ranging from {smallest:,} to {largest:,} parts."
    )

    return {"ranked_mocs": ranked, "ranking_summary": summary}


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_theme_mocs_graph():
    builder = StateGraph(ThemeMocsState)
    builder.add_node("identify_theme", identify_theme)
    builder.add_node("fetch_alternates", fetch_alternates)
    builder.add_node("rank_by_complexity", rank_by_complexity)

    builder.add_edge(START, "identify_theme")
    builder.add_edge("identify_theme", "fetch_alternates")
    builder.add_edge("fetch_alternates", "rank_by_complexity")
    builder.add_edge("rank_by_complexity", END)

    return builder.compile()


theme_mocs_graph = create_theme_mocs_graph()
