"""LEGO color name normalisation.

Maps common abbreviations and alternative names to the official LEGO/BrickLink
color names used in the Rebrickable API.  Called by moc_parts_graph and
part_mocs_graph before persisting parts to the database.
"""

from __future__ import annotations

# Mapping: lowercase key → canonical LEGO color name
_ALIASES: dict[str, str] = {
    # Light Bluish Gray variants
    "lbg": "Light Bluish Gray",
    "light bluish gray": "Light Bluish Gray",
    "light bluish grey": "Light Bluish Gray",
    "light gray": "Light Bluish Gray",
    "light grey": "Light Bluish Gray",
    "silver": "Light Bluish Gray",
    # Dark Bluish Gray variants
    "dbg": "Dark Bluish Gray",
    "dark bluish gray": "Dark Bluish Gray",
    "dark bluish grey": "Dark Bluish Gray",
    "dark gray": "Dark Bluish Gray",
    "dark grey": "Dark Bluish Gray",
    "charcoal": "Dark Bluish Gray",
    # White/Ivory
    "white": "White",
    "ivory": "White",
    "off-white": "White",
    # Black
    "black": "Black",
    # Red
    "red": "Red",
    "bright red": "Red",
    # Yellow
    "yellow": "Yellow",
    "bright yellow": "Yellow",
    # Blue
    "blue": "Blue",
    "bright blue": "Blue",
    # Green
    "green": "Green",
    "bright green": "Bright Green",
    "dark green": "Dark Green",
    # Orange
    "orange": "Orange",
    "bright orange": "Orange",
    # Brown / Tan
    "tan": "Tan",
    "sand": "Tan",
    "dark tan": "Dark Tan",
    "reddish brown": "Reddish Brown",
    "brown": "Reddish Brown",
    "dark brown": "Dark Brown",
    # Nougat / Flesh
    "nougat": "Nougat",
    "flesh": "Nougat",
    "medium nougat": "Medium Nougat",
    "dark flesh": "Dark Flesh",
    # Sand colors
    "sand green": "Sand Green",
    "sand blue": "Sand Blue",
    "sand yellow": "Dark Tan",
    # Lime
    "lime": "Lime",
    "lime green": "Lime",
    "yellow-green": "Lime",
    # Purple / Violet
    "purple": "Purple",
    "dark purple": "Dark Purple",
    "violet": "Violet",
    "lavender": "Lavender",
    "medium lavender": "Medium Lavender",
    # Pink
    "pink": "Bright Pink",
    "bright pink": "Bright Pink",
    "dark pink": "Dark Pink",
    # Transparent colors (keep as-is with Trans- prefix)
    "trans-clear": "Trans-Clear",
    "trans-blue": "Trans-Blue",
    "trans-red": "Trans-Red",
    "trans-green": "Trans-Green",
    "trans-yellow": "Trans-Yellow",
    "trans-orange": "Trans-Orange",
    "trans-black": "Trans-Black",
    # Metallic
    "gold": "Pearl Gold",
    "pearl gold": "Pearl Gold",
    "chrome silver": "Chrome Silver",
    "flat silver": "Flat Silver",
    "metallic silver": "Flat Silver",
    "dark silver": "Flat Silver",
    # Any / unspecified
    "any": "Any",
    "": "Any",
}


def normalize_color(raw: str) -> str:
    """Return the canonical LEGO color name for *raw*, or *raw* as-is if unknown."""
    key = raw.strip().lower()
    return _ALIASES.get(key, raw.strip() or "Any")


# Approximate hex codes for common LEGO colors (BrickLink reference)
_HEX: dict[str, str] = {
    "White":            "#F4F4F4",
    "Black":            "#1B2A34",
    "Red":              "#C91A09",
    "Blue":             "#0055BF",
    "Yellow":           "#F2CD37",
    "Green":            "#237841",
    "Bright Green":     "#4B9F4A",
    "Dark Green":       "#184632",
    "Orange":           "#FE8A18",
    "Tan":              "#E4CD9E",
    "Dark Tan":         "#958A73",
    "Brown":            "#583927",
    "Reddish Brown":    "#582A12",
    "Dark Brown":       "#352100",
    "Light Bluish Gray":"#A0A5A9",
    "Dark Bluish Gray": "#6C6E68",
    "Sand Green":       "#A0BCAC",
    "Sand Blue":        "#6074A1",
    "Lime":             "#BBE90B",
    "Purple":           "#81007B",
    "Dark Purple":      "#3F1F5E",
    "Violet":           "#4354A3",
    "Lavender":         "#E1D5ED",
    "Medium Lavender":  "#AC78BA",
    "Bright Pink":      "#E4ADC8",
    "Dark Pink":        "#C870A0",
    "Nougat":           "#D09168",
    "Medium Nougat":    "#AA7D55",
    "Dark Flesh":       "#7C503A",
    "Pearl Gold":       "#DCBE61",
    "Chrome Silver":    "#E0E0E0",
    "Flat Silver":      "#898788",
    "Trans-Clear":      "#EEEEEE",
    "Trans-Blue":       "#0020A0",
    "Trans-Red":        "#C91A09",
    "Trans-Green":      "#84B68D",
    "Trans-Yellow":     "#F5CD2F",
}


def color_to_hex(name: str) -> str:
    """Return the approximate hex code for a canonical LEGO color name.

    Falls back to a neutral gray for unknown colors.
    """
    return _HEX.get(normalize_color(name), "#9B9B9B")


# Rebrickable color IDs for generating CDN image URLs
_REBRICKABLE_COLOR_IDS: dict[str, int] = {
    "Black":             0,
    "Blue":              1,
    "Green":             2,
    "Red":               4,
    "Reddish Brown":     70,
    "Yellow":            14,
    "White":             15,
    "Tan":               19,
    "Orange":            24,
    "Dark Brown":        26,
    "Lime":              27,
    "Trans-Clear":       40,
    "Trans-Blue":        43,
    "Flat Silver":       65,
    "Pearl Gold":        66,
    "Dark Tan":          69,
    "Light Bluish Gray": 71,
    "Dark Bluish Gray":  72,
    "Dark Green":        80,
    "Sand Green":        48,
    "Nougat":            78,
    "Medium Nougat":     84,
    "Dark Purple":       85,
    "Trans-Red":         17,
    "Trans-Yellow":      36,
    "Bright Green":      10,
}


def color_to_rebrickable_id(name: str) -> int | None:
    """Return the Rebrickable color ID for a canonical LEGO color name, or None."""
    canonical = normalize_color(name)
    return _REBRICKABLE_COLOR_IDS.get(canonical)


_LBG_COLOR_ID = 71  # Light Bluish Gray — has renders for virtually all parts


def part_image_url(part_num: str, color: str) -> str:
    """Construct a Rebrickable CDN LDraw render URL for a part+color combo.

    Falls back to Light Bluish Gray (71) when the color has no known ID.
    """
    color_id = color_to_rebrickable_id(color)
    if color_id is None:
        color_id = _LBG_COLOR_ID
    return f"https://cdn.rebrickable.com/media/parts/ldraw/{color_id}/{part_num}.png"
