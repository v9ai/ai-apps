"""LangGraph pipeline — discover MOC build ideas for a given LEGO part.

Local-only, AI-only approach: no external API calls.
Three-step pipeline:
  1. identify_part    — classify the part from its number (name, category, typical use)
  2. generate_mocs    — generate plausible MOC builds that prominently feature this part
  3. rank_mocs        — rank by relevance/creativity, surface top picks and summary
"""

from __future__ import annotations

import re

from langgraph.graph import END, START, StateGraph

from .colors import normalize_color, part_image_url as build_part_image_url
from .graph import _get_llm, _parse_json
from .part_mocs_state import PartMocsState

_MOC_ID_RE = re.compile(r"^MOC-\d+$")


def _normalize_moc_id(raw: str, fallback_num: int) -> str:
    """Ensure the MOC ID is in MOC-XXXXXX format."""
    candidate = str(raw).strip()
    if _MOC_ID_RE.match(candidate):
        return candidate
    # Extract digits and reformat
    digits = re.sub(r"[^0-9]", "", candidate)
    if digits:
        return f"MOC-{digits}"
    return f"MOC-{10000 + fallback_num}"


# ── Known part catalog — anchors AI to real LEGO elements ─────────────────

_COMMON_PARTS: dict[str, str] = {
    "3001": "Brick 2 x 4 — the classic LEGO brick, core structural element for all build types",
    "3004": "Brick 1 x 2 — walls, greebling, detail work",
    "3005": "Brick 1 x 1 — accent pieces, gap fillers, stud details",
    "3010": "Brick 1 x 4 — walls, columns, platforms",
    "3009": "Brick 1 x 6 — longer walls, horizontal spans",
    "3008": "Brick 1 x 8 — long beams, fences, structural spans",
    "2357": "Brick 2 x 2 Corner — corner turns, L-shaped walls",
    "3039": "Slope 45° 2 x 2 — roofs, wedges, angled surfaces",
    "3040": "Slope 45° 2 x 1 — small slopes, spoilers, roof details",
    "3298": "Slope 33° 3 x 2 — gentle angled sections, hood panels",
    "3023": "Plate 1 x 2 — layering, thin connections",
    "3020": "Plate 2 x 4 — flat surfaces, floors, rooftops",
    "3024": "Plate 1 x 1 — micro-details, pixel art",
    "3022": "Plate 2 x 2 — small platforms, modular connections",
    "3460": "Plate 1 x 8 — long flat spans",
    "3832": "Plate 2 x 10 — large flat surfaces, floors",
    "3033": "Plate 6 x 10 — large baseplates",
    "3069b": "Tile 1 x 2 with Groove — smooth panels, roads, floor tiles",
    "87079": "Tile 2 x 4 — large smooth panels, car hoods",
    "6636": "Tile 1 x 6 — long smooth surfaces",
    "3070b": "Tile 1 x 1 with Groove — fine details, pixel mosaics",
    "2412b": "Tile 1 x 2 Grille — vents, radiators, windows",
    "3659": "Arch 1 x 4 — doorways, bridges, castle arches",
    "6005": "Arch 1 x 3 Curved — small windows, alcoves",
    "4733": "Brick with Studs on Side — SNOT building, 90° connections",
    "11477": "Slope Curved 2 x 1 — organic shapes, vehicle bodies, wings",
    "50950": "Slope Curved 3 x 1 — sweeping surfaces, ship hulls",
    "3747": "Slope 33° 3 x 2 — nose cones, gentle slopes",
    "2780": "Technic Pin — mechanical joints, beam connections",
    "6558": "Technic Pin 3L with Friction — firm joints in Technic builds",
    "43093": "Technic Axle Pin — axle/beam hybrid connector",
    "3648": "Gear 24T — power transmission, Technic mechanisms",
    "3647": "Gear 8T — small gear drive, Technic builds",
    "32316": "Technic Beam 5 — Technic frame construction",
    "32524": "Technic Beam 7 — longer Technic structural element",
    "3701": "Technic Brick 1 x 4 with Holes — Technic compatible brick",
    "3482": "Wheel Hub — vehicles, rolling stock",
    "4589": "Cone 1 x 1 — spires, antennae, turrets",
    "30374": "Bar 4L Light Sabre Blade — weapons, antennae, rails",
    "99780": "Bracket 1 x 2–1 x 2 — SNOT angled connections",
    "6091":  "Windscreen 2 x 6 x 2 — vehicle cockpits, bubble canopies",
    "3741": "Flower 4 Petals — botanical builds, decoration",
    "30028": "Tyre for Wheel — vehicles, all build types with wheels",
    # Extra parts from expanded moc_parts hint categories
    "3002": "Brick 2 x 3 — medium structural brick for walls and framing",
    "3003": "Brick 2 x 2 — compact structural brick for pillars and corners",
    "3030": "Plate 4 x 10 — large base plate for floors and rooftops",
    "3035": "Plate 4 x 8 — large flat surface for vehicle hoods and floors",
    "3068b": "Tile 2 x 2 with Groove — smooth floor panels and road tiles",
    "3245c": "Brick 1 x 2 x 2 — tall narrow brick for walls and window frames",
    "3710": "Plate 1 x 4 — medium plate for layering and surface connections",
    "4490": "Arch 1 x 3 — small curved archway for windows and alcoves",
    "6141": "Round Plate 1 x 1 — studs and rivets for micro detail decoration",
    "3703": "Technic Brick 1 x 8 with Holes — Technic-compatible structural brick",
    "3705": "Technic Axle 4 — short axle for gear trains and wheel attachments",
    "3713": "Technic Bush — axle locking and spacing element",
    "4265c": "Technic Bush 1/2 — half-length axle spacer",
    "32054": "Technic Pin 3L with Friction — long friction pin for firm joints",
    "32073": "Technic Axle 5 — medium axle for gear and wheel systems",
    "44294": "Technic Axle 7 — long axle for complex gear trains",
    "32269": "Gear 20T Double Bevel — differential and angled gear trains",
    "32348": "Technic Liftarm 7 — medium structural beam for Technic frames",
    "32525": "Technic Beam 11 — long structural beam for large Technic builds",
    "41239": "Technic Beam 13 — long beam for very large Technic builds",
    "2877": "Train Wheel — rolling stock, LEGO train builds",
    "2878": "Train Wheel Holder — train axle and wheel mounting bracket",
    "4519": "Technic Axle 3 — shortest common axle for compact gear systems",
    "6536": "Technic Axle 2 with Stud — combines axle and stud for hybrid connections",
    "6589": "Technic Gear 12T — small drive gear for tight gear trains",
}

_PART_HINT_FALLBACK = (
    "a standard LEGO element used in structural, decorative, or mechanical roles "
    "across many different build categories"
)


def _part_hint(part_num: str) -> str:
    return _COMMON_PARTS.get(part_num, _PART_HINT_FALLBACK)


# ── Node 1: Identify the part ──────────────────────────────────────────────


async def identify_part(state: PartMocsState) -> dict:
    part_num = state.get("part_num", "")
    if not part_num:
        return {"error": "part_num is required", "part_name": "Unknown", "part_category": "unknown", "part_description": ""}

    hint = _part_hint(part_num)
    llm = _get_llm()

    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a master LEGO parts librarian. Given a LEGO element number and hint, "
                    "identify it precisely and describe how AFOL builders typically use it in MOC builds. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Part number: {part_num}\n"
                    f"Known hint: {hint}\n\n"
                    "Identify this LEGO element and describe its typical MOC use.\n"
                    "Return JSON:\n"
                    '{"part_name": "Official LEGO element name", '
                    '"category": "brick|plate|tile|slope|arch|technic|wheel|minifig|bar|plant|window|door|special", '
                    '"typical_colors": ["Red", "Light Bluish Gray", "Black"], '
                    '"build_categories": ["castle", "city", "spaceship", "vehicle"], '
                    '"moc_role": "2-3 sentences on how AFOLs use this part in creative MOC builds"}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        data = _parse_json(resp.content)
        part_name = data.get("part_name") or hint.split("—")[0].strip() or part_num
        category = data.get("category", "special")
        moc_role = data.get("moc_role", "")
        typical_colors = data.get("typical_colors", [])
        colors_str = ", ".join(typical_colors)
        builds_str = ", ".join(data.get("build_categories", []))
        description = f"Typical colors: {colors_str}. Popular in: {builds_str}. {moc_role}"
        first_color = normalize_color(typical_colors[0]) if typical_colors else "Light Bluish Gray"
        img_url = build_part_image_url(part_num, first_color)
        return {
            "part_name": part_name,
            "part_category": category,
            "part_description": description,
            "part_image_url": img_url,
            "part_url": f"https://rebrickable.com/parts/{part_num}/",
        }
    except Exception:
        img_url = build_part_image_url(part_num, "Light Bluish Gray")
        return {
            "part_name": hint.split("—")[0].strip() if "—" in hint else part_num,
            "part_category": "special",
            "part_description": hint,
            "part_image_url": img_url,
            "part_url": f"https://rebrickable.com/parts/{part_num}/",
        }


# ── Node 2: Generate plausible MOC builds that feature this part ───────────


async def generate_mocs(state: PartMocsState) -> dict:
    if state.get("error"):
        return {"mocs": []}

    part_num = state.get("part_num", "")
    part_name = state.get("part_name", part_num)
    part_category = state.get("part_category", "special")
    part_description = state.get("part_description", "")

    llm = _get_llm()

    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a knowledgeable LEGO MOC community curator with deep familiarity "
                    "with AFOL (Adult Fan of LEGO) building styles, techniques, and community trends. "
                    "Given a LEGO element, generate a diverse, rich list of plausible community MOC builds "
                    "that showcase the part's versatility across different themes and scales. "
                    "Use authentic AFOL naming conventions and building jargon. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Part: {part_name} (#{part_num})\n"
                    f"Category: {part_category}\n"
                    f"Build context: {part_description}\n\n"
                    "Generate 20 plausible AFOL community MOC builds that prominently feature this element.\n"
                    "Requirements:\n"
                    "- Cover diverse themes: castle, city, space, train, Technic, modular, micro, etc.\n"
                    "- Include 3-4 different scales: micro (50-200 pcs), scene (200-800 pcs), "
                    "  large (800-2500 pcs), display (2500+ pcs)\n"
                    "- AFOL designer names should feel authentic (e.g. 'BrickVault', 'StoneworksMOC', "
                    "  'Th3_Br1ck_Man', 'plastiqueFabricant')\n"
                    "- MOC IDs in the format MOC-XXXXXX (numbers between 10000-199999)\n"
                    "- Years between 2018-2025\n"
                    "- Each description explains what specific role the part plays in that build\n"
                    "Return JSON:\n"
                    '{"mocs": [{"moc_id": "MOC-42153", "name": "Gondola Canal Scene", '
                    '"designer": "VeniceBuilds_IT", "year": 2022, "num_parts": 876, '
                    '"description": "Arch bricks form the iconic bridge crossings over the narrow canals"}]}'
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

    normalized = []
    seen_ids: set[str] = set()
    for i, m in enumerate(raw):
        if not (m.get("moc_id") and m.get("name")):
            continue
        moc_id = _normalize_moc_id(str(m["moc_id"]), i)
        # Deduplicate MOC IDs
        if moc_id in seen_ids:
            continue
        seen_ids.add(moc_id)
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
            "moc_url": "",  # AI-generated IDs are not real Rebrickable entries
            "description": str(m.get("description", "")),
        })

    return {"mocs": normalized, "source": "ai"}


# ── Node 3: Rank MOCs by quality and relevance ────────────────────────────


async def rank_mocs(state: PartMocsState) -> dict:
    if state.get("error"):
        return {"ranked_mocs": [], "ranking_summary": ""}

    mocs = state.get("mocs", [])
    if not mocs:
        return {"ranked_mocs": [], "ranking_summary": "No MOC builds found for this part."}

    part_name = state.get("part_name", state.get("part_num", "Unknown"))

    moc_listing = "\n".join(
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
                    "You are a LEGO MOC community expert. Given a part and a list of MOC builds, "
                    "rank them by creativity, variety, and how well they showcase the part's potential. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Part: {part_name} (#{state.get('part_num', '')})\n\n"
                    f"MOC builds:\n{moc_listing}\n\n"
                    "Rank these MOCs, group by theme, and provide community context.\n"
                    "Return JSON:\n"
                    '{"summary": "2-3 sentences on how the LEGO community uses this part across different styles", '
                    '"top_picks": ["MOC-...", "MOC-...", "MOC-..."], '
                    '"categories": [{"theme": "Medieval / Castle", "moc_ids": ["MOC-..."]}, '
                    '{"theme": "Sci-Fi / Space", "moc_ids": ["MOC-..."]}]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        ranking = _parse_json(resp.content)
    except Exception:
        ranking = {}

    # Build theme lookup from categories
    theme_map: dict[str, str] = {}
    for cat in ranking.get("categories", []):
        for moc_id in cat.get("moc_ids", []):
            theme_map[moc_id] = cat.get("theme", "")

    moc_map = {m["moc_id"]: m for m in mocs}

    ranked = []
    for moc_id in ranking.get("top_picks", []):
        if moc_id in moc_map:
            enriched = {**moc_map.pop(moc_id), "top_pick": True}
            if moc_id in theme_map:
                enriched["theme"] = theme_map[moc_id]
            ranked.append(enriched)
    for m in mocs:
        if m["moc_id"] in moc_map:
            enriched = dict(m)
            if m["moc_id"] in theme_map:
                enriched["theme"] = theme_map[m["moc_id"]]
            ranked.append(enriched)

    return {
        "ranked_mocs": ranked,
        "ranking_summary": ranking.get("summary", ""),
    }


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_part_mocs_graph():
    builder = StateGraph(PartMocsState)
    builder.add_node("identify_part", identify_part)
    builder.add_node("generate_mocs", generate_mocs)
    builder.add_node("rank_mocs", rank_mocs)

    builder.add_edge(START, "identify_part")
    builder.add_edge("identify_part", "generate_mocs")
    builder.add_edge("generate_mocs", "rank_mocs")
    builder.add_edge("rank_mocs", END)

    return builder.compile()


part_mocs_graph = create_part_mocs_graph()
