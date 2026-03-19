"""Configurable hedonic adjustment weights and valuation parameters, backed by a DB table."""

import json
import psycopg
from psycopg.rows import dict_row

# ---------------------------------------------------------------------------
# Table DDL
# ---------------------------------------------------------------------------

CREATE_VALUATION_CONFIG_TABLE = """
CREATE TABLE IF NOT EXISTS valuation_config (
    id SERIAL PRIMARY KEY,
    config_key TEXT NOT NULL UNIQUE,
    config_value JSONB NOT NULL,
    description TEXT,
    source TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
"""

# ---------------------------------------------------------------------------
# Default seed values
# ---------------------------------------------------------------------------

DEFAULTS: dict[str, dict] = {
    "floor_adjustments": {
        "value": {
            "first_floor_discount_pct": -7.5,
            "last_floor_premium_pct": -3.0,
            "mid_high_floor_premium_pct": 3.0,
            "top_floor_penthouse_premium_pct": 5.0,
        },
        "description": "Floor-level hedonic price adjustments (% of fair value)",
        "source": "agent-11 AVM Gradient Boosting research",
    },
    "condition_adjustments": {
        "value": {
            "euro_repair_premium_pct": 12.0,
            "cosmetic_repair_premium_pct": 5.0,
            "needs_renovation_discount_pct": -15.0,
            "new_building_premium_pct": 10.0,
        },
        "description": "Condition-based hedonic price adjustments (% of fair value)",
        "source": "agent-13 Explainable AVM research",
    },
    "parking_values": {
        "value": {
            "included_premium_pct": 6.0,
            "separate_typical_eur": {"chisinau": 8000, "bucharest": 15000, "cluj": 12000},
        },
        "description": "Parking valuation: premium when included, typical separate cost by city",
        "source": "market data",
    },
    "building_age_adjustments": {
        "value": {
            "pre_1970_discount_pct": -8.0,
            "1970_1990_discount_pct": -4.0,
            "1990_2010_neutral_pct": 0.0,
            "post_2010_premium_pct": 6.0,
            "post_2020_premium_pct": 10.0,
        },
        "description": "Building age hedonic adjustments (% of fair value)",
        "source": "agent-81 Valuation Intelligence Synthesis",
    },
    "size_efficiency": {
        "value": {
            "optimal_range_m2": [45, 90],
            "small_unit_premium_per_m2_pct": 8.0,
            "large_unit_discount_per_m2_pct": -5.0,
        },
        "description": "Size-efficiency curve: small units command premium per m2, large units discount",
        "source": "agent-15 Mass Appraisal Systems",
    },
    "confidence_thresholds": {
        "value": {
            "high_quality_data": 0.90,
            "moderate_data": 0.75,
            "low_data": 0.55,
            "minimal_data": 0.40,
        },
        "description": "Confidence score thresholds by data-quality tier",
        "source": "agent-13 Explainable AVM",
    },
}

# ---------------------------------------------------------------------------
# Async DB helpers
# ---------------------------------------------------------------------------


async def _connect(conn_str: str):
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


async def init_valuation_config(conn_str: str) -> None:
    """Create the valuation_config table and seed defaults (skip existing keys)."""
    async with await _connect(conn_str) as conn:
        await conn.execute(CREATE_VALUATION_CONFIG_TABLE)

        for key, entry in DEFAULTS.items():
            await conn.execute(
                """
                INSERT INTO valuation_config (config_key, config_value, description, source)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (config_key) DO NOTHING
                """,
                (key, json.dumps(entry["value"]), entry["description"], entry["source"]),
            )

        await conn.commit()


async def get_config(key: str, conn_str: str) -> dict:
    """Return config_value for a single key. Falls back to in-code default if not in DB."""
    async with await _connect(conn_str) as conn:
        cur = await conn.execute(
            "SELECT config_value FROM valuation_config WHERE config_key = %s",
            (key,),
        )
        row = await cur.fetchone()

    if row is not None:
        return row["config_value"]

    # Fallback to compiled defaults
    if key in DEFAULTS:
        return DEFAULTS[key]["value"]

    raise KeyError(f"Unknown valuation config key: {key}")


async def get_all_configs(conn_str: str) -> dict[str, dict]:
    """Return all config entries keyed by config_key."""
    async with await _connect(conn_str) as conn:
        cur = await conn.execute(
            "SELECT config_key, config_value, source FROM valuation_config ORDER BY config_key"
        )
        rows = await cur.fetchall()

    configs: dict[str, dict] = {}
    for row in rows:
        configs[row["config_key"]] = {
            "value": row["config_value"],
            "source": row["source"],
        }

    # Merge in any compiled defaults not yet in DB
    for key, entry in DEFAULTS.items():
        if key not in configs:
            configs[key] = {"value": entry["value"], "source": entry["source"]}

    return configs


async def update_config(key: str, value: dict, source: str, conn_str: str) -> None:
    """Upsert a config entry."""
    description = DEFAULTS.get(key, {}).get("description")

    async with await _connect(conn_str) as conn:
        await conn.execute(
            """
            INSERT INTO valuation_config (config_key, config_value, source, description, last_updated)
            VALUES (%s, %s, %s, %s, NOW())
            ON CONFLICT (config_key) DO UPDATE SET
                config_value = EXCLUDED.config_value,
                source = EXCLUDED.source,
                last_updated = NOW()
            """,
            (key, json.dumps(value), source, description),
        )
        await conn.commit()


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------


def build_adjustment_prompt(configs: dict[str, dict]) -> str:
    """Format all configs into a text section suitable for injection into the valuator prompt.

    ``configs`` is the dict returned by ``get_all_configs`` —
    ``{key: {"value": {...}, "source": ...}}``.
    """
    lines: list[str] = ["HEDONIC ADJUSTMENT WEIGHTS (research-backed):"]

    def _v(key: str) -> dict:
        return configs.get(key, {}).get("value", DEFAULTS.get(key, {}).get("value", {}))

    # Floor adjustments
    f = _v("floor_adjustments")
    lines.append(
        f"  Floor: first floor {f.get('first_floor_discount_pct', 0):+.1f}%, "
        f"mid-high {f.get('mid_high_floor_premium_pct', 0):+.1f}%, "
        f"top floor {f.get('last_floor_premium_pct', 0):+.1f}%, "
        f"penthouse {f.get('top_floor_penthouse_premium_pct', 0):+.1f}%"
    )

    # Condition adjustments
    c = _v("condition_adjustments")
    lines.append(
        f"  Condition: euro repair {c.get('euro_repair_premium_pct', 0):+.1f}%, "
        f"cosmetic {c.get('cosmetic_repair_premium_pct', 0):+.1f}%, "
        f"new building {c.get('new_building_premium_pct', 0):+.1f}%, "
        f"needs renovation {c.get('needs_renovation_discount_pct', 0):+.1f}%"
    )

    # Building age
    b = _v("building_age_adjustments")
    lines.append(
        f"  Building age: pre-1970 {b.get('pre_1970_discount_pct', 0):+.1f}%, "
        f"1970-1990 {b.get('1970_1990_discount_pct', 0):+.1f}%, "
        f"1990-2010 {b.get('1990_2010_neutral_pct', 0):+.1f}%, "
        f"post-2010 {b.get('post_2010_premium_pct', 0):+.1f}%, "
        f"post-2020 {b.get('post_2020_premium_pct', 0):+.1f}%"
    )

    # Parking
    p = _v("parking_values")
    sep = p.get("separate_typical_eur", {})
    city_parts = ", ".join(f"{city} EUR {val:,}" for city, val in sep.items()) if sep else "N/A"
    lines.append(
        f"  Parking: included {p.get('included_premium_pct', 0):+.1f}% | "
        f"separate typical: {city_parts}"
    )

    # Size efficiency
    s = _v("size_efficiency")
    optimal = s.get("optimal_range_m2", [45, 90])
    lines.append(
        f"  Size: optimal {optimal[0]}-{optimal[1]} m2 | "
        f"small unit premium {s.get('small_unit_premium_per_m2_pct', 0):+.1f}%/m2, "
        f"large unit {s.get('large_unit_discount_per_m2_pct', 0):+.1f}%/m2"
    )

    # Confidence thresholds
    t = _v("confidence_thresholds")
    lines.append(
        f"  Confidence thresholds: high {t.get('high_quality_data', 0)}, "
        f"moderate {t.get('moderate_data', 0)}, "
        f"low {t.get('low_data', 0)}, "
        f"minimal {t.get('minimal_data', 0)}"
    )

    return "\n".join(lines)
