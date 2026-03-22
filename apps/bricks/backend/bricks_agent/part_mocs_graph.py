"""LangGraph pipeline — discover all MOC builds related to a given LEGO part."""

from __future__ import annotations

import json
import os
from itertools import islice

import httpx
from langgraph.graph import END, START, StateGraph

from .graph import _get_llm, _parse_json
from .part_mocs_state import PartMocsState

REBRICKABLE_API_KEY = os.environ.get("REBRICKABLE_API_KEY", "")
PARTS_URL = "https://rebrickable.com/api/v3/lego/parts"
SETS_URL = "https://rebrickable.com/api/v3/lego/sets"


def _headers() -> dict[str, str]:
    return {"Authorization": f"key {REBRICKABLE_API_KEY}"}


# ── Node 1: Resolve part ────────────────────────────────────────────────


async def resolve_part(state: PartMocsState) -> dict:
    part_num = state.get("part_num", "")
    if not part_num:
        return {"error": "part_num is required"}

    async with httpx.AsyncClient(timeout=15) as client:
        # Try as a part first
        r = await client.get(f"{PARTS_URL}/{part_num}/", headers=_headers())
        if r.status_code == 200:
            data = r.json()
            # Fetch colors
            colors = []
            cr = await client.get(f"{PARTS_URL}/{part_num}/colors/", headers=_headers())
            if cr.status_code == 200:
                colors = [
                    {
                        "id": c["color_id"],
                        "name": c["color_name"],
                        "image_url": c.get("part_img_url"),
                        "num_sets": c.get("num_sets", 0),
                    }
                    for c in cr.json().get("results", [])
                ]
            return {
                "part_name": data["name"],
                "part_image_url": data.get("part_img_url"),
                "is_set": False,
                "colors": colors,
            }

        # Fallback: try as a set
        r = await client.get(f"{SETS_URL}/{part_num}-1/", headers=_headers())
        if r.status_code == 200:
            data = r.json()
            return {
                "part_name": data["name"],
                "part_image_url": data.get("set_img_url"),
                "is_set": True,
                "colors": [],
            }

    return {"error": f"Part {part_num} not found on Rebrickable"}


# ── Node 2: Find sets containing this part ───────────────────────────────


async def find_sets(state: PartMocsState) -> dict:
    if state.get("error"):
        return {}

    part_num = state["part_num"]
    is_set = state.get("is_set", False)

    sets: list[dict] = []
    async with httpx.AsyncClient(timeout=15) as client:
        if is_set:
            # For set-type items (like SPIKE motors), find sibling sets in the
            # same theme — the main kits that contain this component.
            # Step 1: Get theme_id from the set itself
            r = await client.get(f"{SETS_URL}/{part_num}-1/", headers=_headers())
            theme_id = r.json().get("theme_id") if r.status_code == 200 else None

            if theme_id:
                # Step 2: Fetch all sets in the same theme, sorted by num_parts desc
                r = await client.get(
                    f"{SETS_URL}/",
                    params={"theme_id": theme_id, "page_size": 50},
                    headers=_headers(),
                )
                if r.status_code == 200:
                    for s in r.json().get("results", []):
                        # Skip single-part accessory sets and the item itself
                        if s.get("num_parts", 0) > 10 and s["set_num"] != f"{part_num}-1":
                            sets.append({
                                "set_num": s["set_num"],
                                "name": s["name"],
                                "year": s.get("year"),
                                "num_parts": s.get("num_parts", 0),
                                "image_url": s.get("set_img_url"),
                            })
        else:
            # For real parts, iterate through colors and collect sets
            colors = state.get("colors", [])
            # Pick colors with the most sets, cap at 5
            top_colors = sorted(colors, key=lambda c: c.get("num_sets", 0), reverse=True)
            for color in islice(top_colors, 5):
                if color.get("num_sets", 0) == 0:
                    continue
                r = await client.get(
                    f"{PARTS_URL}/{part_num}/colors/{color['id']}/sets/",
                    params={"page_size": 50},
                    headers=_headers(),
                )
                if r.status_code == 200:
                    for s in r.json().get("results", []):
                        sets.append({
                            "set_num": s["set_num"],
                            "name": s["name"],
                            "year": s.get("year"),
                            "num_parts": s.get("num_parts", 0),
                            "image_url": s.get("set_img_url"),
                        })

    # Deduplicate by set_num
    seen = set()
    unique_sets = []
    for s in sets:
        if s["set_num"] not in seen:
            seen.add(s["set_num"])
            unique_sets.append(s)

    return {"sets": unique_sets}


# ── Node 3: Find MOC alternates for the discovered sets ──────────────────


async def find_mocs(state: PartMocsState) -> dict:
    if state.get("error"):
        return {}

    sets = state.get("sets", [])
    if not sets:
        return {"mocs": []}

    mocs: list[dict] = []
    seen = set()

    async with httpx.AsyncClient(timeout=15) as client:
        # Cap at 20 sets to avoid rate limits
        for s in islice(sets, 20):
            r = await client.get(
                f"{SETS_URL}/{s['set_num']}/alternates/",
                params={"page_size": 100},
                headers=_headers(),
            )
            if r.status_code != 200:
                continue
            for m in r.json().get("results", []):
                if m["set_num"] in seen:
                    continue
                seen.add(m["set_num"])
                mocs.append({
                    "moc_id": m["set_num"],
                    "name": m["name"],
                    "year": m.get("year"),
                    "num_parts": m.get("num_parts", 0),
                    "image_url": m.get("moc_img_url"),
                    "moc_url": m.get("moc_url", ""),
                    "designer": m.get("designer_name", ""),
                })

    return {"mocs": mocs}


# ── Node 4: Rank and categorize MOCs using LLM ──────────────────────────


async def rank_mocs(state: PartMocsState) -> dict:
    if state.get("error"):
        return {}

    mocs = state.get("mocs", [])
    if not mocs:
        return {"ranked_mocs": [], "ranking_summary": "No MOC builds found for this part."}

    part_name = state.get("part_name", state.get("part_num", "Unknown"))

    moc_listing = "\n".join(
        f"- {m['moc_id']}: \"{m['name']}\" by {m['designer']} ({m.get('year', '?')}, {m.get('num_parts', '?')} parts)"
        for m in mocs[:50]  # cap context
    )

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO MOC expert. Given a part and a list of MOC builds that use sets "
                    "containing that part, rank them by relevance and creativity. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Part: {part_name} (#{state.get('part_num', '')})\n\n"
                    f"MOC builds found:\n{moc_listing}\n\n"
                    "Return JSON with this structure:\n"
                    '{"summary": "2-3 sentence overview of what builders do with this part", '
                    '"categories": [{"name": "Category", "moc_ids": ["MOC-..."], "description": "..."}], '
                    '"top_picks": ["MOC-...", "MOC-...", "MOC-..."]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    ranking = _parse_json(resp.content)

    # Reorder mocs: top_picks first, then the rest
    top_ids = ranking.get("top_picks", [])
    moc_map = {m["moc_id"]: m for m in mocs}
    ranked = []
    for moc_id in top_ids:
        if moc_id in moc_map:
            ranked.append({**moc_map.pop(moc_id), "top_pick": True})
    for m in mocs:
        if m["moc_id"] in moc_map:
            ranked.append(m)

    return {
        "ranked_mocs": ranked,
        "ranking_summary": ranking.get("summary", ""),
    }


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_part_mocs_graph():
    builder = StateGraph(PartMocsState)
    builder.add_node("resolve_part", resolve_part)
    builder.add_node("find_sets", find_sets)
    builder.add_node("find_mocs", find_mocs)
    builder.add_node("rank_mocs", rank_mocs)

    builder.add_edge(START, "resolve_part")
    builder.add_edge("resolve_part", "find_sets")
    builder.add_edge("find_sets", "find_mocs")
    builder.add_edge("find_mocs", "rank_mocs")
    builder.add_edge("rank_mocs", END)

    return builder.compile()


part_mocs_graph = create_part_mocs_graph()
