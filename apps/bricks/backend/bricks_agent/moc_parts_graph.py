"""LangGraph pipeline — extract LEGO parts list for a MOC.

Local-only approach: no external API calls.
Three-step AI pipeline:
  1. infer_build_type  — classify the MOC category from name + image URL
  2. generate_parts    — produce a realistic, category-specific parts list
  3. validate_parts    — normalize, deduplicate, and sanity-check quantities
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from .colors import color_to_hex, normalize_color, part_image_url
from .graph import _get_llm, _parse_json


class MocPartsState(TypedDict, total=False):
    moc_id: str
    moc_name: str
    designer: str
    image_url: str | None
    # intermediate
    build_type: str          # e.g. "castle", "technic car", "spaceship"
    build_scale: str         # "micro" | "minifig" | "display"
    build_notes: str         # colours, sub-assemblies, construction notes
    # output
    moc_summary: str         # 1-2 sentence plain-English description of the build
    parts: list[dict]
    total_pieces: int        # sum of all part quantities
    parts_palette: str       # e.g. "Light Bluish Gray, Dark Bluish Gray, Tan · 32 parts · ~403 pcs"
    source: str
    error: str | None


# ── Part number pools per category — keeps the AI grounded in real parts ──

_PART_HINTS: dict[str, str] = {
    "castle": (
        "Common castle parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3005 (Brick 1x1), "
        "3010 (Brick 1x4), 3009 (Brick 1x6), 3008 (Brick 1x8), 3002 (Brick 2x3), "
        "2357 (Brick 2x2 Corner), 3245c (Brick 1x2x2), 4733 (Brick with Studs on Side), "
        "3039 (Slope 45 2x2), 3040 (Slope 45 2x1), 3298 (Slope 33 3x2), 3747 (Slope 33 3x2 Inverted), "
        "11477 (Slope Curved 2x1), 3659 (Arch 1x4), 6005 (Arch 1x3 Curved), 4490 (Arch 1x3), "
        "3024 (Plate 1x1), 3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), "
        "3460 (Plate 1x8), 3832 (Plate 2x10), 3030 (Plate 4x10), 3035 (Plate 4x8), "
        "3069b (Tile 1x2), 6636 (Tile 1x6), 3068b (Tile 2x2), 2412b (Tile 1x2 Grille), "
        "4589 (Cone 1x1), 30374 (Bar 4L), 3741 (Flower 4 Petals), 6141 (Round Plate 1x1). "
        "Dominant colors: Light Bluish Gray, Dark Bluish Gray, Tan, Dark Tan, Sand Green, Reddish Brown."
    ),
    "vehicle": (
        "Common vehicle parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3005 (Brick 1x1), "
        "3002 (Brick 2x3), 3003 (Brick 2x2), 3010 (Brick 1x4), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), 3024 (Plate 1x1), "
        "3460 (Plate 1x8), 3832 (Plate 2x10), 3035 (Plate 4x8), "
        "3040 (Slope 45 2x1), 3039 (Slope 45 2x2), 3298 (Slope 33 3x2), "
        "3747 (Slope 33 3x2 Inverted), 11477 (Slope Curved 2x1), 50950 (Slope Curved 3x1), "
        "87079 (Tile 2x4), 3069b (Tile 1x2), 3068b (Tile 2x2), 2412b (Tile 1x2 Grille), "
        "6636 (Tile 1x6), 3070b (Tile 1x1), "
        "6091 (Windscreen), 99780 (Bracket 1x2), 4733 (Brick with Studs on Side), "
        "3482 (Wheel Hub), 30028 (Tyre), 6141 (Round Plate 1x1). "
        "Dominant colors: Red, Blue, White, Black, Yellow, Light Bluish Gray."
    ),
    "spaceship": (
        "Common spaceship parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3005 (Brick 1x1), "
        "3002 (Brick 2x3), 4733 (Brick with Studs on Side), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), 3024 (Plate 1x1), "
        "3460 (Plate 1x8), 3710 (Plate 1x4), 3035 (Plate 4x8), "
        "3040 (Slope 45 2x1), 3039 (Slope 45 2x2), 3298 (Slope 33 3x2), "
        "3747 (Slope 33 3x2 Inverted), 11477 (Slope Curved 2x1), 50950 (Slope Curved 3x1), "
        "3069b (Tile 1x2), 87079 (Tile 2x4), 3068b (Tile 2x2), 2412b (Tile 1x2 Grille), "
        "3070b (Tile 1x1), 6636 (Tile 1x6), "
        "4589 (Cone 1x1), 99780 (Bracket 1x2), 43093 (Technic Axle Pin), "
        "6141 (Round Plate 1x1), 30374 (Bar 4L). "
        "Dominant colors: Light Bluish Gray, Dark Bluish Gray, Trans-Blue, White, Black."
    ),
    "technic": (
        "Common Technic parts: 2780 (Pin), 6558 (Pin 3L with Friction), 32054 (Pin 3L), "
        "43093 (Axle Pin), 6536 (Axle 2 with Stud), 3713 (Bush), 4265c (Bush 1/2), "
        "3648 (Gear 24T), 3647 (Gear 8T), 32269 (Gear 20T Double Bevel), 6589 (Gear 12T), "
        "32316 (Beam 5), 32524 (Beam 7), 32348 (Liftarm 7), 32525 (Beam 11), 41239 (Beam 13), "
        "3701 (Technic Brick 1x4), 3703 (Technic Brick 1x8), "
        "4519 (Axle 3), 3705 (Axle 4), 32073 (Axle 5), 44294 (Axle 7), "
        "3482 (Wheel Hub), 30028 (Tyre), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), "
        "3069b (Tile 1x2), 2412b (Tile 1x2 Grille). "
        "Dominant colors: Black, Light Bluish Gray, Red, Yellow, Dark Bluish Gray."
    ),
    "mech": (
        "Common mech/robot parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3005 (Brick 1x1), "
        "3002 (Brick 2x3), 3245c (Brick 1x2x2), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), 3024 (Plate 1x1), "
        "3040 (Slope 45 2x1), 3039 (Slope 45 2x2), 3298 (Slope 33 3x2), "
        "11477 (Slope Curved 2x1), 50950 (Slope Curved 3x1), "
        "2780 (Technic Pin), 6558 (Technic Pin 3L), 3648 (Gear 24T), 43093 (Axle Pin), "
        "99780 (Bracket 1x2), 4733 (Brick with Studs on Side), "
        "3069b (Tile 1x2), 87079 (Tile 2x4), 3068b (Tile 2x2), 2412b (Tile 1x2 Grille), "
        "4589 (Cone 1x1), 6141 (Round Plate 1x1), 30374 (Bar 4L), 3460 (Plate 1x8). "
        "Dominant colors: Dark Bluish Gray, Light Bluish Gray, Black, Red, White."
    ),
    "train": (
        "Common train parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3002 (Brick 2x3), "
        "3010 (Brick 1x4), 3009 (Brick 1x6), 3008 (Brick 1x8), "
        "3005 (Brick 1x1), 2357 (Brick 2x2 Corner), 3245c (Brick 1x2x2), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), "
        "3460 (Plate 1x8), 3832 (Plate 2x10), 3033 (Plate 6x10), 3030 (Plate 4x10), "
        "3040 (Slope 45 2x1), 3039 (Slope 45 2x2), 3298 (Slope 33 3x2), 3747 (Slope 33 3x2 Inverted), "
        "2412b (Tile 1x2 Grille), 3069b (Tile 1x2), 87079 (Tile 2x4), 6636 (Tile 1x6), "
        "6091 (Windscreen), 4733 (Brick with Studs on Side), 99780 (Bracket 1x2), "
        "2878 (Wheel Holder), 2877 (Wheel). "
        "Dominant colors: Red, Black, Dark Bluish Gray, White, Blue."
    ),
    "building": (
        "Common architectural parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3002 (Brick 2x3), "
        "3010 (Brick 1x4), 3009 (Brick 1x6), 3008 (Brick 1x8), "
        "3005 (Brick 1x1), 2357 (Brick 2x2 Corner), 3245c (Brick 1x2x2), "
        "4733 (Brick with Studs on Side), 99780 (Bracket 1x2), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), 3024 (Plate 1x1), "
        "3460 (Plate 1x8), 3832 (Plate 2x10), 3033 (Plate 6x10), 3030 (Plate 4x10), "
        "3040 (Slope 45 2x1), 3039 (Slope 45 2x2), 3298 (Slope 33 3x2), 3747 (Slope 33 3x2 Inverted), "
        "3659 (Arch 1x4), 6005 (Arch 1x3 Curved), "
        "3069b (Tile 1x2), 6636 (Tile 1x6), 87079 (Tile 2x4), 3068b (Tile 2x2), 3070b (Tile 1x1), "
        "6141 (Round Plate 1x1), 4589 (Cone 1x1). "
        "Dominant colors: Light Bluish Gray, Tan, Dark Tan, White, Reddish Brown, Sand Green."
    ),
    "animal": (
        "Common AFOL animal/creature parts: 3004 (Brick 1x2), 3005 (Brick 1x1), "
        "3002 (Brick 2x3), 3001 (Brick 2x4), "
        "3023 (Plate 1x2), 3024 (Plate 1x1), 3022 (Plate 2x2), 3020 (Plate 2x4), "
        "6141 (Round Plate 1x1), 3040 (Slope 45 2x1), 3039 (Slope 45 2x2), "
        "3298 (Slope 33 3x2), 11477 (Slope Curved 2x1), 50950 (Slope Curved 3x1), "
        "3747 (Slope 33 3x2 Inverted), "
        "4589 (Cone 1x1), 30374 (Bar 4L), 3741 (Flower 4 Petals), "
        "3069b (Tile 1x2), 3070b (Tile 1x1), 3068b (Tile 2x2), "
        "4733 (Brick with Studs on Side), 99780 (Bracket 1x2), "
        "3460 (Plate 1x8), 3832 (Plate 2x10), "
        "2412b (Tile 1x2 Grille), 87079 (Tile 2x4), 3010 (Brick 1x4). "
        "Dominant colors: Reddish Brown, Tan, Dark Tan, White, Black, Medium Nougat."
    ),
    "city": (
        "Common city/urban parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3002 (Brick 2x3), "
        "3010 (Brick 1x4), 3009 (Brick 1x6), 3005 (Brick 1x1), "
        "2357 (Brick 2x2 Corner), 3245c (Brick 1x2x2), 4733 (Brick with Studs on Side), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), 3024 (Plate 1x1), "
        "3460 (Plate 1x8), 3832 (Plate 2x10), 3033 (Plate 6x10), "
        "3040 (Slope 45 2x1), 3039 (Slope 45 2x2), 3298 (Slope 33 3x2), "
        "3069b (Tile 1x2), 87079 (Tile 2x4), 6636 (Tile 1x6), 3068b (Tile 2x2), "
        "3070b (Tile 1x1), 2412b (Tile 1x2 Grille), "
        "6091 (Windscreen), 3482 (Wheel Hub), 30028 (Tyre), "
        "3741 (Flower), 99780 (Bracket 1x2), 6141 (Round Plate 1x1). "
        "Dominant colors: White, Light Bluish Gray, Reddish Brown, Tan, Dark Bluish Gray."
    ),
    "pirate": (
        "Common pirate/nautical parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3002 (Brick 2x3), "
        "3010 (Brick 1x4), 3009 (Brick 1x6), 3008 (Brick 1x8), "
        "3005 (Brick 1x1), 2357 (Brick 2x2 Corner), 3245c (Brick 1x2x2), "
        "4733 (Brick with Studs on Side), 3040 (Slope 45 2x1), 3039 (Slope 45 2x2), "
        "3298 (Slope 33 3x2), 11477 (Slope Curved 2x1), 50950 (Slope Curved 3x1), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), "
        "3460 (Plate 1x8), 3832 (Plate 2x10), 3033 (Plate 6x10), "
        "3659 (Arch 1x4), 6005 (Arch 1x3 Curved), "
        "3069b (Tile 1x2), 87079 (Tile 2x4), 6636 (Tile 1x6), 3068b (Tile 2x2), "
        "4589 (Cone 1x1), 30374 (Bar 4L), 3741 (Flower 4 Petals). "
        "Dominant colors: Reddish Brown, Dark Bluish Gray, Tan, White, Black."
    ),
    "modular": (
        "Common modular building parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3002 (Brick 2x3), "
        "3010 (Brick 1x4), 3009 (Brick 1x6), 3008 (Brick 1x8), "
        "3005 (Brick 1x1), 2357 (Brick 2x2 Corner), 3245c (Brick 1x2x2), "
        "4733 (Brick with Studs on Side), 99780 (Bracket 1x2), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), 3024 (Plate 1x1), "
        "3033 (Plate 6x10), 3030 (Plate 4x10), 3460 (Plate 1x8), 3832 (Plate 2x10), "
        "3069b (Tile 1x2), 6636 (Tile 1x6), 87079 (Tile 2x4), 3070b (Tile 1x1), 3068b (Tile 2x2), "
        "3040 (Slope 45 2x1), 3039 (Slope 45 2x2), 3298 (Slope 33 3x2), "
        "3659 (Arch 1x4), 6005 (Arch 1x3 Curved), "
        "6141 (Round Plate 1x1), 4589 (Cone 1x1), 3741 (Flower 4 Petals). "
        "Dominant colors: White, Light Bluish Gray, Reddish Brown, Tan, Dark Tan, Dark Green."
    ),
    "fantasy": (
        "Common fantasy/magical build parts: 3001 (Brick 2x4), 3004 (Brick 1x2), 3002 (Brick 2x3), "
        "3005 (Brick 1x1), 3010 (Brick 1x4), 3008 (Brick 1x8), "
        "2357 (Brick 2x2 Corner), 3245c (Brick 1x2x2), 4733 (Brick with Studs on Side), "
        "3039 (Slope 45 2x2), 3040 (Slope 45 2x1), 3298 (Slope 33 3x2), 3747 (Slope 33 3x2 Inverted), "
        "11477 (Slope Curved 2x1), 50950 (Slope Curved 3x1), "
        "3659 (Arch 1x4), 6005 (Arch 1x3 Curved), 4490 (Arch 1x3), 4589 (Cone 1x1), "
        "3023 (Plate 1x2), 3020 (Plate 2x4), 3022 (Plate 2x2), 3024 (Plate 1x1), "
        "3460 (Plate 1x8), 6141 (Round Plate 1x1), "
        "3069b (Tile 1x2), 6636 (Tile 1x6), 3070b (Tile 1x1), 3068b (Tile 2x2), "
        "4733 (Brick with Studs on Side), 3741 (Flower 4 Petals), "
        "30374 (Bar 4L), 99780 (Bracket 1x2). "
        "Dominant colors: Dark Purple, Medium Lavender, Sand Green, Reddish Brown, Tan, Trans-Clear, Pearl Gold."
    ),
}

# "other" uses "building" as a reasonable fallback
_PART_HINTS["other"] = _PART_HINTS["building"]


# ── Node 1: infer build type from MOC metadata ─────────────────────────────


async def infer_build_type(state: MocPartsState) -> dict:
    moc_id = state.get("moc_id", "")
    if not moc_id:
        return {"error": "moc_id is required", "build_type": "other", "build_notes": ""}

    moc_name = state.get("moc_name") or moc_id
    designer = state.get("designer") or "Unknown"
    image_url = state.get("image_url") or ""

    llm = _get_llm()

    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO MOC expert. Given a MOC name, designer, and image URL, "
                    "classify the build category and describe its key visual characteristics. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"MOC ID: {moc_id}\n"
                    f"Name: {moc_name}\n"
                    f"Designer: {designer}\n"
                    f"Image: {image_url}\n\n"
                    "Classify this LEGO MOC.\n"
                    "Return JSON:\n"
                    '{"build_type": "castle|vehicle|spaceship|mech|animal|building|train|technic|city|pirate|modular|fantasy|other", '
                    '"dominant_colors": ["Light Bluish Gray", "Dark Bluish Gray"], '
                    '"sub_assemblies": ["crenellated walls", "gatehouse", "tower"], '
                    '"scale": "micro|minifig|display", '
                    '"summary": "1-2 sentences describing the build concept and visual style for an AFOL audience", '
                    '"notes": "2-3 sentences describing the likely construction style and part categories"}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        data = _parse_json(resp.content)
        build_type = data.get("build_type", "other")
        # Normalise to a known category
        if build_type not in _PART_HINTS:
            build_type = "other"
        colors = data.get("dominant_colors", [])
        assemblies = data.get("sub_assemblies", [])
        scale = data.get("scale", "minifig")
        if scale not in ("micro", "minifig", "display"):
            scale = "minifig"
        notes = data.get("notes", "")
        build_notes = (
            f"Colors: {', '.join(colors)}. "
            f"Sub-assemblies: {', '.join(assemblies)}. "
            f"{notes}"
        )
        moc_summary = data.get("summary") or notes or f"A {build_type} MOC build by {designer}."
        return {
            "build_type": build_type,
            "build_scale": scale,
            "build_notes": build_notes,
            "moc_summary": moc_summary,
        }
    except Exception:
        return {"build_type": "other", "build_scale": "minifig", "build_notes": "", "moc_summary": ""}


# ── Node 2: generate a category-specific parts list ──────────────────────


# Scale-specific generation parameters
_SCALE_GUIDANCE: dict[str, str] = {
    "micro": (
        "This is a MICRO-SCALE build (total pieces 50-250). "
        "Generate AT LEAST 14 unique elements. Quantities: 1x1/1x2 bricks: 6-15x, plates: 4-10x, "
        "tiles/slopes/accents: 1-4x. Total pieces should sum to 80-200."
    ),
    "minifig": (
        "This is a MINIFIG-SCALE build (total pieces 300-1200). "
        "Generate AT LEAST 28 unique elements. "
        "Quantities: main structural bricks (2x4, 1x4, 1x6): 12-20x each; "
        "secondary bricks (1x2, 1x1, corner): 6-14x each; "
        "plates: 6-14x each; slopes: 3-8x each; tiles/accents: 2-5x each. "
        "Total pieces should sum to 350-800."
    ),
    "display": (
        "This is a DISPLAY/LARGE-SCALE build (total pieces 1500-5000+). "
        "Generate AT LEAST 40 unique elements. "
        "Quantities: main structural bricks: 20-40x each; secondary bricks: 10-20x each; "
        "plates: 12-25x each; slopes: 6-15x each; tiles/accents: 3-8x each. "
        "Total pieces should sum to 1500-3000."
    ),
}


async def generate_parts(state: MocPartsState) -> dict:
    if state.get("error"):
        return {"parts": [], "source": "ai"}

    moc_name = state.get("moc_name") or state.get("moc_id", "Unknown MOC")
    designer = state.get("designer") or "Unknown"
    build_type = state.get("build_type", "other")
    build_scale = state.get("build_scale", "minifig")
    build_notes = state.get("build_notes", "")
    hints = _PART_HINTS.get(build_type, _PART_HINTS["other"])
    scale_guidance = _SCALE_GUIDANCE.get(build_scale, _SCALE_GUIDANCE["minifig"])

    llm = _get_llm()

    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a master LEGO builder and parts librarian. "
                    "Given a MOC description and build context, produce a precise, "
                    "realistic bill of materials using real LEGO part numbers. "
                    "Every part number must be from the provided hints list. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"MOC: {moc_name}\n"
                    f"Designer: {designer}\n"
                    f"Build category: {build_type}\n"
                    f"Build context: {build_notes}\n\n"
                    f"Scale guidance: {scale_guidance}\n\n"
                    f"Available parts for this category:\n{hints}\n\n"
                    "Generate a precise LEGO parts list for this MOC following the scale guidance above.\n"
                    "Rules:\n"
                    "- ONLY use part numbers from the hints above\n"
                    "- Match colors to the dominant colors in build context\n"
                    "- Do NOT repeat the exact same partNum+color combination\n"
                    "- Variety requirements: include AT LEAST 3 slope/curved/arch parts, AT LEAST 2 tile types, "
                    "  AT LEAST 2 plate types; plain bricks must be LESS THAN 40% of all rows\n"
                    "- Use multiple colors — at least 3 different canonical LEGO color names\n"
                    "- Important: select from as many different part numbers in the hints as possible\n"
                    "Return JSON:\n"
                    '{"parts": [{"partNum": "3001", "name": "Brick 2 x 4", "color": "Light Bluish Gray", "qty": 12}]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        data = _parse_json(resp.content)
        raw_parts = data.get("parts", [])
    except Exception:
        raw_parts = []

    normalized = []
    for p in raw_parts:
        part_num = str(p.get("partNum", p.get("part_num", ""))).strip()
        if not part_num:
            continue
        color = normalize_color(str(p.get("color", "Any")))
        normalized.append({
            "partNum": part_num,
            "name": str(p.get("name", "")),
            "color": color,
            "colorHex": color_to_hex(color),
            "qty": max(1, int(p.get("qty", p.get("quantity", 1)))),
            "imageUrl": part_image_url(part_num, color),
            "partUrl": f"https://rebrickable.com/parts/{part_num}/",
        })

    return {"parts": normalized, "source": "ai"}


# ── Node 3: validate and deduplicate the parts list ───────────────────────


_SCALE_MIN_PIECES: dict[str, int] = {"micro": 80, "minifig": 350, "display": 1400}
_SCALE_MAX_PIECES: dict[str, int] = {"micro": 200, "minifig": 800, "display": 3000}


_TIER_STRUCTURAL = frozenset({
    "3001", "3002", "3003", "3004", "3005", "3008", "3009", "3010",
    "2357", "3033", "3832", "3245c", "4733",
})
_TIER_PLATES = frozenset({
    "3023", "3020", "3024", "3022", "3460", "3710",
    "3030", "3035", "3033", "3832", "6141",
})
_TIER_SLOPES = frozenset({
    "3039", "3040", "3298", "3747", "11477", "50950",
    "3659", "6005", "4490",  # arches sort with slopes
})
_TIER_TILES = frozenset({"3069b", "87079", "6636", "3070b", "2412b", "3068b"})


def _part_sort_key(p: dict) -> tuple[int, int, str]:
    """Sort parts: high-qty structural first, low-qty accent last."""
    part_num = str(p.get("partNum", ""))
    qty = p.get("qty", 1)
    if part_num in _TIER_STRUCTURAL:
        priority = 0
    elif part_num in _TIER_PLATES:
        priority = 1
    elif part_num in _TIER_SLOPES:
        priority = 2
    elif part_num in _TIER_TILES:
        priority = 3
    else:
        priority = 4
    return (priority, -qty, part_num)


async def validate_parts(state: MocPartsState) -> dict:
    """Deduplicate by partNum+color, filter empties, sort by structural role."""
    parts = state.get("parts", [])
    if not parts:
        return {"parts": []}

    # Normalize colors, then deduplicate by partNum+color (sum qty)
    seen: dict[tuple[str, str], dict] = {}
    for p in parts:
        normalized_color = normalize_color(p.get("color", "Any"))
        part_num = str(p.get("partNum", "")).strip()
        key = (part_num, normalized_color)
        if key in seen:
            seen[key]["qty"] += p.get("qty", 1)
        else:
            seen[key] = {
                **p,
                "partNum": part_num,
                "color": normalized_color,
                "colorHex": color_to_hex(normalized_color),
                "imageUrl": part_image_url(part_num, normalized_color),
                "partUrl": f"https://rebrickable.com/parts/{part_num}/",
            }

    deduped = [p for p in seen.values() if p["partNum"].strip()]

    # Sort: structural bricks first (by priority tier), then by qty desc
    deduped.sort(key=_part_sort_key)

    # Scale quantities if total falls below the scale target
    scale = state.get("build_scale", "minifig")
    min_pieces = _SCALE_MIN_PIECES.get(scale, 350)
    total_pieces = sum(p.get("qty", 1) for p in deduped)
    if total_pieces < min_pieces and deduped:
        factor = min_pieces / total_pieces
        for p in deduped:
            p["qty"] = max(1, round(p["qty"] * factor))
        total_pieces = sum(p["qty"] for p in deduped)

    # Build a human-readable palette summary
    colors_used = sorted({p["color"] for p in deduped if p["color"] and p["color"] != "Any"})
    palette_colors = ", ".join(colors_used[:5])
    if len(colors_used) > 5:
        palette_colors += f" +{len(colors_used) - 5} more"
    parts_palette = f"{palette_colors} · {len(deduped)} parts · ~{total_pieces} pcs"

    return {"parts": deduped, "total_pieces": total_pieces, "parts_palette": parts_palette}


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_moc_parts_graph():
    builder = StateGraph(MocPartsState)
    builder.add_node("infer_build_type", infer_build_type)
    builder.add_node("generate_parts", generate_parts)
    builder.add_node("validate_parts", validate_parts)

    builder.add_edge(START, "infer_build_type")
    builder.add_edge("infer_build_type", "generate_parts")
    builder.add_edge("generate_parts", "validate_parts")
    builder.add_edge("validate_parts", END)

    return builder.compile()


moc_parts_graph = create_moc_parts_graph()
