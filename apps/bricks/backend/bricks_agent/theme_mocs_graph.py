"""LangGraph pipeline — discover MOC builds related to a curated theme.

Three-step, AI-only pipeline (no Rebrickable calls):
  1. identify_theme — distil the theme name into a focused build brief and keywords
  2. generate_mocs  — generate plausible community MOCs that fit the theme
  3. rank_mocs      — rank by fit/quality, surface top picks and a short summary
"""

from __future__ import annotations

import re

from langgraph.graph import END, START, StateGraph

from .graph import _get_llm, _parse_json
from .theme_mocs_state import ThemeMocsState

_MOC_ID_RE = re.compile(r"^MOC-\d+$")


def _normalize_moc_id(raw: str, fallback_num: int) -> str:
    candidate = str(raw).strip()
    if _MOC_ID_RE.match(candidate):
        return candidate
    digits = re.sub(r"[^0-9]", "", candidate)
    if digits:
        return f"MOC-{digits}"
    return f"MOC-{20000 + fallback_num}"


# ── Node 1: Identify the theme ────────────────────────────────────────────


async def identify_theme(state: ThemeMocsState) -> dict:
    theme_name = (state.get("theme_name") or "").strip()
    if not theme_name:
        return {
            "error": "theme_name is required",
            "theme_summary": "",
            "related_keywords": [],
        }

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO MOC curator. Given a theme name, describe what kinds of "
                    "builds and motifs the AFOL community produces under that theme, and list "
                    "concrete keywords/sub-themes that would appear in MOC titles. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Theme: {theme_name}\n\n"
                    "Return JSON:\n"
                    '{"theme_summary": "2-3 sentences on what this theme covers in MOC builds", '
                    '"related_keywords": ["keyword1", "keyword2", "..."]}'
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
        }
    except Exception:
        return {"theme_summary": "", "related_keywords": []}


# ── Node 2: Generate plausible MOCs for the theme ─────────────────────────


async def generate_mocs(state: ThemeMocsState) -> dict:
    if state.get("error"):
        return {"mocs": []}

    theme_name = state.get("theme_name", "")
    summary = state.get("theme_summary", "")
    keywords = state.get("related_keywords", []) or []

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a knowledgeable LEGO MOC community curator with deep familiarity "
                    "with AFOL (Adult Fan of LEGO) building styles. Given a theme, generate a "
                    "diverse list of plausible community MOC builds that fit that theme. "
                    "Use authentic AFOL naming conventions. Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Theme: {theme_name}\n"
                    f"Theme summary: {summary}\n"
                    f"Related keywords: {', '.join(keywords) if keywords else '(none)'}\n\n"
                    "Generate 20 plausible AFOL community MOC builds for this theme.\n"
                    "Requirements:\n"
                    "- Cover diverse interpretations and scales\n"
                    "- 3-4 different scales: micro (50-200 pcs), scene (200-800 pcs), "
                    "  large (800-2500 pcs), display (2500+ pcs)\n"
                    "- Authentic AFOL designer handles\n"
                    "- MOC IDs in MOC-XXXXXX format (numbers 10000-199999)\n"
                    "- Years between 2018-2025\n"
                    "- Description explains how the MOC realises the theme\n"
                    "Return JSON:\n"
                    '{"mocs": [{"moc_id": "MOC-42153", "name": "Smaug on the Lonely Mountain", '
                    '"designer": "MordorBuilds", "year": 2022, "num_parts": 3120, '
                    '"description": "Massive sleeping dragon coiled atop a treasure hoard"}]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        data = _parse_json(resp.content)
        raw = data.get("mocs", [])
    except Exception:
        raw = []

    normalized: list[dict] = []
    seen: set[str] = set()
    for i, m in enumerate(raw):
        if not (m.get("moc_id") and m.get("name")):
            continue
        moc_id = _normalize_moc_id(str(m["moc_id"]), i)
        if moc_id in seen:
            continue
        seen.add(moc_id)
        try:
            num_parts = max(1, int(m.get("num_parts", 100)))
        except (ValueError, TypeError):
            num_parts = 100
        normalized.append({
            "moc_id": moc_id,
            "name": str(m.get("name", "Unnamed MOC")),
            "designer": str(m.get("designer", "Unknown")),
            "year": m.get("year"),
            "num_parts": num_parts,
            "image_url": None,
            "moc_url": "",
            "description": str(m.get("description", "")),
        })

    return {"mocs": normalized, "source": "ai"}


# ── Node 3: Rank MOCs ─────────────────────────────────────────────────────


async def rank_mocs(state: ThemeMocsState) -> dict:
    if state.get("error"):
        return {"ranked_mocs": [], "ranking_summary": ""}

    mocs = state.get("mocs", [])
    if not mocs:
        return {"ranked_mocs": [], "ranking_summary": "No MOC builds found for this theme."}

    theme_name = state.get("theme_name", "")
    listing = "\n".join(
        f"- {m['moc_id']}: \"{m['name']}\" by {m['designer']} "
        f"({m.get('year', '?')}, {m.get('num_parts', '?')} parts) — {m.get('description', '')}"
        for m in mocs
    )

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO MOC community expert. Rank the MOCs by how well they "
                    "embody the theme, creativity, and variety. Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Theme: {theme_name}\n\n"
                    f"MOC builds:\n{listing}\n\n"
                    "Return JSON:\n"
                    '{"summary": "2-3 sentences on how the AFOL community interprets this theme", '
                    '"top_picks": ["MOC-...", "MOC-...", "MOC-..."], '
                    '"categories": [{"label": "Sub-theme name", "moc_ids": ["MOC-..."]}]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        ranking = _parse_json(resp.content)
    except Exception:
        ranking = {}

    label_map: dict[str, str] = {}
    for cat in ranking.get("categories", []):
        for moc_id in cat.get("moc_ids", []):
            label_map[moc_id] = cat.get("label", "")

    moc_map = {m["moc_id"]: m for m in mocs}
    ranked: list[dict] = []
    for moc_id in ranking.get("top_picks", []):
        if moc_id in moc_map:
            enriched = {**moc_map.pop(moc_id), "top_pick": True}
            if moc_id in label_map:
                enriched["sub_theme"] = label_map[moc_id]
            ranked.append(enriched)
    for m in mocs:
        if m["moc_id"] in moc_map:
            enriched = dict(m)
            if m["moc_id"] in label_map:
                enriched["sub_theme"] = label_map[m["moc_id"]]
            ranked.append(enriched)

    return {
        "ranked_mocs": ranked,
        "ranking_summary": ranking.get("summary", ""),
    }


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_theme_mocs_graph():
    builder = StateGraph(ThemeMocsState)
    builder.add_node("identify_theme", identify_theme)
    builder.add_node("generate_mocs", generate_mocs)
    builder.add_node("rank_mocs", rank_mocs)

    builder.add_edge(START, "identify_theme")
    builder.add_edge("identify_theme", "generate_mocs")
    builder.add_edge("generate_mocs", "rank_mocs")
    builder.add_edge("rank_mocs", END)

    return builder.compile()


theme_mocs_graph = create_theme_mocs_graph()
