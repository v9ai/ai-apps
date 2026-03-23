"""LangGraph pipeline — look up a single LEGO part by number.

Local-only, AI-only approach: no external API calls.
Single-node pipeline:
  1. lookup_part  — identify the part and return structured metadata
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph
from typing_extensions import TypedDict

from .colors import color_to_hex, normalize_color, part_image_url
from .graph import _get_llm, _parse_json
from .part_mocs_graph import _part_hint

_CATEGORY_FALLBACK_COLORS: dict[str, list[str]] = {
    "brick":    ["Light Bluish Gray", "Dark Bluish Gray", "White", "Red", "Black"],
    "plate":    ["Light Bluish Gray", "White", "Tan", "Dark Bluish Gray", "Black"],
    "tile":     ["Light Bluish Gray", "White", "Dark Bluish Gray", "Black", "Tan"],
    "slope":    ["Light Bluish Gray", "Dark Bluish Gray", "White", "Red", "Tan"],
    "arch":     ["Light Bluish Gray", "Dark Bluish Gray", "Tan", "Dark Tan", "White"],
    "technic":  ["Black", "Light Bluish Gray", "Red", "Yellow", "Dark Bluish Gray"],
    "wheel":    ["Black", "Light Bluish Gray", "Red", "Dark Bluish Gray"],
    "bar":      ["Black", "Light Bluish Gray", "Pearl Gold", "Flat Silver"],
    "plant":    ["Green", "Dark Green", "Reddish Brown", "Tan"],
    "special":  ["Light Bluish Gray", "Black", "White", "Dark Bluish Gray"],
    "window":   ["Trans-Clear", "Light Bluish Gray", "White", "Black"],
    "door":     ["Reddish Brown", "White", "Black", "Dark Bluish Gray"],
    "minifig":  ["Yellow", "Nougat", "Medium Nougat", "White"],
}


class PartInfoState(TypedDict, total=False):
    part_num: str
    # output
    name: str
    category: str        # brick|plate|tile|slope|technic|wheel|special|...
    description: str
    typical_colors: list[str]
    color_swatches: list[dict]   # [{"name": "Light Bluish Gray", "hex": "#A0A5A9"}]
    part_image_url: str | None
    part_url: str        # https://rebrickable.com/parts/{part_num}/
    error: str | None


# ── Node: lookup part ─────────────────────────────────────────────────────


async def lookup_part(state: PartInfoState) -> dict:
    part_num = state.get("part_num", "").strip()
    if not part_num:
        return {"error": "part_num is required", "name": "Unknown", "category": "special", "typical_colors": []}

    hint = _part_hint(part_num)
    llm = _get_llm()

    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO parts expert with deep knowledge of LEGO element numbers. "
                    "Given a part number, identify the part precisely and return structured metadata. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"LEGO part number: {part_num}\n"
                    f"Known hint: {hint}\n\n"
                    "Identify this LEGO element and return its metadata.\n"
                    "You MUST include at least 3 typical_colors — pick the most common colors this part "
                    "appears in among AFOL MOC builders.\n"
                    "Return JSON:\n"
                    '{"name": "Brick 2 x 4", '
                    '"category": "brick|plate|tile|slope|arch|technic|wheel|minifig|bar|plant|window|door|special", '
                    '"description": "One sentence on what the part is and how AFOLs use it in MOC builds", '
                    '"typical_colors": ["Light Bluish Gray", "Dark Bluish Gray", "Tan", "White", "Black"]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )

    try:
        data = _parse_json(resp.content)
        name = data.get("name") or hint.split("—")[0].strip() or part_num
        category = data.get("category", "special")
        description = data.get("description", hint)
        raw_colors = data.get("typical_colors", [])
        typical_colors = [normalize_color(c) for c in raw_colors if c]
        # Fall back to category defaults if AI returned no colors
        if not typical_colors:
            typical_colors = _CATEGORY_FALLBACK_COLORS.get(
                category, _CATEGORY_FALLBACK_COLORS["special"]
            )
        color_swatches = [{"name": c, "hex": color_to_hex(c)} for c in typical_colors]
        first_color = typical_colors[0] if typical_colors else "Light Bluish Gray"
        return {
            "name": name,
            "category": category,
            "description": description,
            "typical_colors": typical_colors,
            "color_swatches": color_swatches,
            "part_image_url": part_image_url(part_num, first_color),
            "part_url": f"https://rebrickable.com/parts/{part_num}/",
        }
    except Exception:
        fallback_name = hint.split("—")[0].strip() if "—" in hint else part_num
        return {
            "name": fallback_name,
            "category": "special",
            "description": hint,
            "typical_colors": [],
            "part_image_url": None,
        }


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_part_info_graph():
    builder = StateGraph(PartInfoState)
    builder.add_node("lookup_part", lookup_part)
    builder.add_edge(START, "lookup_part")
    builder.add_edge("lookup_part", END)
    return builder.compile()


part_info_graph = create_part_info_graph()
