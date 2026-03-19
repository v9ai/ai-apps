"""Dynamic market reference data computed from accumulated listings.

Replaces the static EUR/m2 tables hardcoded in the valuator system prompt
with zone-level statistics derived from the listings table.
"""

import psycopg
from psycopg.rows import dict_row


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

CREATE_MARKET_REFERENCES = """
CREATE TABLE IF NOT EXISTS market_references (
    id SERIAL PRIMARY KEY,
    city TEXT NOT NULL,
    zone TEXT NOT NULL,
    avg_price_per_m2 REAL,
    median_price_per_m2 REAL,
    min_price_per_m2 REAL,
    max_price_per_m2 REAL,
    sample_count INTEGER,
    avg_investment_score REAL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(city, zone)
);
"""


# ---------------------------------------------------------------------------
# Table initialisation
# ---------------------------------------------------------------------------

async def init_market_tables(conn_str: str) -> None:
    """Create the market_references table if it does not exist."""
    async with await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row) as conn:
        await conn.execute(CREATE_MARKET_REFERENCES)
        await conn.commit()


# ---------------------------------------------------------------------------
# Refresh / recompute
# ---------------------------------------------------------------------------

REFRESH_QUERY = """
INSERT INTO market_references (
    city, zone,
    avg_price_per_m2, median_price_per_m2,
    min_price_per_m2, max_price_per_m2,
    sample_count, avg_investment_score,
    last_updated
)
SELECT
    city,
    zone,
    AVG(price_per_m2)::REAL                          AS avg_price_per_m2,
    (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_m2))::REAL
                                                      AS median_price_per_m2,
    MIN(price_per_m2)::REAL                           AS min_price_per_m2,
    MAX(price_per_m2)::REAL                           AS max_price_per_m2,
    COUNT(*)::INTEGER                                 AS sample_count,
    AVG(investment_score)::REAL                       AS avg_investment_score,
    NOW()                                             AS last_updated
FROM listings
WHERE city IS NOT NULL
  AND zone IS NOT NULL
  AND price_per_m2 IS NOT NULL
GROUP BY city, zone
HAVING COUNT(*) >= 2
ON CONFLICT (city, zone) DO UPDATE SET
    avg_price_per_m2    = EXCLUDED.avg_price_per_m2,
    median_price_per_m2 = EXCLUDED.median_price_per_m2,
    min_price_per_m2    = EXCLUDED.min_price_per_m2,
    max_price_per_m2    = EXCLUDED.max_price_per_m2,
    sample_count        = EXCLUDED.sample_count,
    avg_investment_score = EXCLUDED.avg_investment_score,
    last_updated        = EXCLUDED.last_updated;
"""


async def refresh_market_references(conn_str: str) -> None:
    """Recompute all zone stats from the listings table and upsert them."""
    async with await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row) as conn:
        await conn.execute(REFRESH_QUERY)
        await conn.commit()


# ---------------------------------------------------------------------------
# Single-zone lookup
# ---------------------------------------------------------------------------

async def get_zone_reference(city: str, zone: str, conn_str: str) -> dict | None:
    """Fetch market reference data for a single (city, zone) pair."""
    async with await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row) as conn:
        cursor = await conn.execute(
            """
            SELECT city, zone,
                   avg_price_per_m2, median_price_per_m2,
                   min_price_per_m2, max_price_per_m2,
                   sample_count, avg_investment_score, last_updated
            FROM market_references
            WHERE LOWER(city) = LOWER(%s)
              AND LOWER(zone) = LOWER(%s)
            """,
            (city, zone),
        )
        return await cursor.fetchone()


# ---------------------------------------------------------------------------
# City-wide lookup
# ---------------------------------------------------------------------------

async def get_city_references(city: str, conn_str: str) -> list[dict]:
    """Fetch all zone-level market references for a given city."""
    async with await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row) as conn:
        cursor = await conn.execute(
            """
            SELECT city, zone,
                   avg_price_per_m2, median_price_per_m2,
                   min_price_per_m2, max_price_per_m2,
                   sample_count, avg_investment_score, last_updated
            FROM market_references
            WHERE LOWER(city) = LOWER(%s)
            ORDER BY median_price_per_m2 DESC
            """,
            (city,),
        )
        return await cursor.fetchall()


# ---------------------------------------------------------------------------
# Prompt formatting
# ---------------------------------------------------------------------------

def _fmt(value: float | None) -> str:
    """Format a numeric value as a comma-separated integer string."""
    if value is None:
        return "-"
    return f"{int(round(value)):,}"


def build_reference_table_prompt(references: list[dict]) -> str:
    """Format zone references as a text table for the valuator system prompt.

    Returns a multi-line string like:

        MARKET REFERENCE DATA (computed from 42 analyzed listings):
        Zone          | Avg EUR/m2 | Med EUR/m2 | Min   | Max   | Samples
        Centru        | 1,250      | 1,200      | 900   | 1,800 | 15
        Botanica      | 980        | 950        | 700   | 1,300 | 12
    """
    if not references:
        return ""

    total_samples = sum(r.get("sample_count", 0) for r in references)

    # Column widths -- zone name is variable, numbers are fixed-width
    zone_w = max(len(r.get("zone", "")) for r in references)
    zone_w = max(zone_w, 4)  # at least "Zone"

    header_zone = "Zone".ljust(zone_w)
    header = f"{header_zone} | Avg EUR/m2 | Med EUR/m2 | Min   | Max   | Samples"
    sep = "-" * len(header)

    lines = [
        f"MARKET REFERENCE DATA (computed from {total_samples} analyzed listings):",
        header,
        sep,
    ]

    for r in references:
        zone_col = (r.get("zone") or "?").ljust(zone_w)
        avg_col = _fmt(r.get("avg_price_per_m2")).rjust(10)
        med_col = _fmt(r.get("median_price_per_m2")).rjust(10)
        min_col = _fmt(r.get("min_price_per_m2")).rjust(5)
        max_col = _fmt(r.get("max_price_per_m2")).rjust(5)
        cnt_col = str(r.get("sample_count", 0)).rjust(7)
        lines.append(f"{zone_col} | {avg_col} | {med_col} | {min_col} | {max_col} | {cnt_col}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# High-level helper
# ---------------------------------------------------------------------------

async def get_or_build_prompt_section(city: str, conn_str: str) -> str:
    """Return the dynamic market reference table for *city*.

    If no accumulated data exists for the city, returns a short fallback note
    so the valuator knows to rely on its built-in knowledge instead.
    """
    references = await get_city_references(city, conn_str)
    if not references:
        return f"No accumulated market data available for {city}."
    return build_reference_table_prompt(references)
