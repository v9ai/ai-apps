"""Neighborhood classification based on accumulated listing data."""

from __future__ import annotations

from typing import Literal

import psycopg
from psycopg.rows import dict_row
from pydantic import BaseModel, Field


class NeighborhoodProfile(BaseModel):
    zone: str
    city: str
    stage: Literal["early_growth", "maturing", "established", "declining"]
    confidence: float = Field(ge=0.0, le=1.0)
    avg_price_per_m2: float
    listing_count: int
    price_trend: Literal["rising", "stable", "falling"] | None = None
    avg_investment_score: float | None = None
    description: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _connect(conn_str: str) -> psycopg.AsyncConnection:
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


def _detect_trend(recent_avg: float | None, older_avg: float | None) -> Literal["rising", "stable", "falling"] | None:
    """Compare recent window avg price/m2 vs older window to determine trend."""
    if recent_avg is None or older_avg is None or older_avg == 0:
        return None
    change_pct = (recent_avg - older_avg) / older_avg * 100
    if change_pct > 3:
        return "rising"
    elif change_pct < -3:
        return "falling"
    return "stable"


def _classify(
    avg_price: float,
    percentiles: dict[str, float],
    trend: Literal["rising", "stable", "falling"] | None,
    avg_inv_score: float | None,
    listing_count: int,
) -> tuple[Literal["early_growth", "maturing", "established", "declining"], float, str]:
    """Return (stage, confidence, description)."""

    p25 = percentiles["p25"]
    p50 = percentiles["p50"]
    p80 = percentiles["p80"]

    # Low-data path: fewer than 3 listings -> low confidence, use absolute thresholds
    if listing_count < 3:
        confidence = round(min(0.3, listing_count * 0.1), 2)
        if avg_price >= p80:
            stage = "established"
        elif avg_price >= p50:
            stage = "established"
        elif avg_price >= p25:
            stage = "maturing"
        else:
            stage = "early_growth"
        return stage, confidence, f"Low data ({listing_count} listing{'s' if listing_count != 1 else ''}); classification based on city-wide price thresholds."

    # Sufficient data -> full classification
    inv_high = avg_inv_score is not None and avg_inv_score >= 6.0
    inv_low = avg_inv_score is not None and avg_inv_score < 5.0

    # Declining: falling prices AND low investment scores
    if trend == "falling" and inv_low:
        confidence = _data_confidence(listing_count)
        return "declining", confidence, (
            f"Prices are falling (avg {avg_price:.0f} EUR/m2) with low investment appeal "
            f"(score {avg_inv_score:.1f}/10). The zone shows signs of decline."
        )

    # Established: expensive (>p80) — mature market, whether or not investment upside is limited
    if avg_price > p80:
        confidence = _data_confidence(listing_count)
        inv_note = f" Investment score: {avg_inv_score:.1f}/10." if avg_inv_score is not None else ""
        return "established", confidence, (
            f"High price tier ({avg_price:.0f} EUR/m2, above city 80th pctl of {p80:.0f}). "
            f"Mature, established market.{inv_note}"
        )

    # Established: p50-p80, stable or rising
    if p50 <= avg_price <= p80 and trend in ("stable", "rising", None):
        confidence = _data_confidence(listing_count)
        return "established", confidence, (
            f"Mid-to-upper price range ({avg_price:.0f} EUR/m2, city p50-p80). "
            f"Prices are {trend or 'stable'} — a well-established residential zone."
        )

    # Maturing: p25-p50, rising prices or high investment scores
    if p25 <= avg_price < p50 and (trend == "rising" or inv_high):
        confidence = _data_confidence(listing_count)
        return "maturing", confidence, (
            f"Below-median pricing ({avg_price:.0f} EUR/m2) with "
            f"{'rising prices' if trend == 'rising' else f'strong investment potential (score {avg_inv_score:.1f}/10)'}. "
            f"Maturing development stage."
        )

    # Early growth: <p25, rising prices or high investment scores
    if avg_price < p25 and (trend == "rising" or inv_high):
        confidence = _data_confidence(listing_count)
        return "early_growth", confidence, (
            f"Low price tier ({avg_price:.0f} EUR/m2, below city 25th pctl of {p25:.0f}) "
            f"but showing growth signals. Early-growth opportunity zone."
        )

    # Fallback: assign by price bracket when trend/scores don't match specific rules
    if avg_price > p80:
        stage = "established"
    elif avg_price >= p50:
        stage = "established"
    elif avg_price >= p25:
        stage = "maturing"
    else:
        stage = "early_growth"

    confidence = _data_confidence(listing_count) * 0.8  # slightly lower for fallback
    return stage, round(confidence, 2), (
        f"Price level {avg_price:.0f} EUR/m2 places this zone in the '{stage}' bracket. "
        f"Trend: {trend or 'unknown'}; investment score: {avg_inv_score:.1f if avg_inv_score else 'N/A'}."
    )


def _data_confidence(listing_count: int) -> float:
    """Confidence ramps from 0.3 at 3 listings to 1.0 at 15+."""
    if listing_count >= 15:
        return 1.0
    return round(0.3 + 0.7 * (listing_count - 3) / 12, 2)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_city_percentiles(city: str, conn_str: str) -> dict[str, float]:
    """Return p25, p50, p75, p80 of price_per_m2 for a city from the listings table."""
    async with await _connect(conn_str) as conn:
        cursor = await conn.execute(
            """
            SELECT
                PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price_per_m2) AS p25,
                PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY price_per_m2) AS p50,
                PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price_per_m2) AS p75,
                PERCENTILE_CONT(0.80) WITHIN GROUP (ORDER BY price_per_m2) AS p80
            FROM listings
            WHERE city = %s AND price_per_m2 IS NOT NULL
            """,
            (city,),
        )
        row = await cursor.fetchone()

    if row is None or row["p50"] is None:
        # No data at all — return neutral defaults so callers don't crash
        return {"p25": 0.0, "p50": 0.0, "p75": 0.0, "p80": 0.0}

    return {
        "p25": float(row["p25"]),
        "p50": float(row["p50"]),
        "p75": float(row["p75"]),
        "p80": float(row["p80"]),
    }


async def classify_neighborhood(city: str, zone: str, conn_str: str) -> NeighborhoodProfile:
    """Classify a single neighborhood (city + zone) into a development stage."""

    async with await _connect(conn_str) as conn:
        # 1. Aggregate stats from listings
        cursor = await conn.execute(
            """
            SELECT
                COUNT(*)::int                    AS listing_count,
                AVG(price_per_m2)                AS avg_price_per_m2,
                AVG(investment_score)            AS avg_investment_score
            FROM listings
            WHERE city = %s AND zone = %s AND price_per_m2 IS NOT NULL
            """,
            (city, zone),
        )
        stats = await cursor.fetchone()

        # 2. Price trend from price_snapshots (JOIN on url to filter by city+zone)
        #    Recent window: last 30 days.  Older window: 60-90 days ago.
        cursor = await conn.execute(
            """
            SELECT
                AVG(CASE WHEN ps.scraped_at >= NOW() - INTERVAL '30 days'
                         THEN ps.price_per_m2 END) AS recent_avg,
                AVG(CASE WHEN ps.scraped_at >= NOW() - INTERVAL '90 days'
                          AND ps.scraped_at <  NOW() - INTERVAL '60 days'
                         THEN ps.price_per_m2 END) AS older_avg
            FROM price_snapshots ps
            JOIN listings l ON l.url = ps.url
            WHERE l.city = %s AND l.zone = %s AND ps.price_per_m2 IS NOT NULL
            """,
            (city, zone),
        )
        trend_row = await cursor.fetchone()

    listing_count: int = stats["listing_count"] if stats else 0
    avg_price: float = float(stats["avg_price_per_m2"]) if stats and stats["avg_price_per_m2"] else 0.0
    avg_inv: float | None = float(stats["avg_investment_score"]) if stats and stats["avg_investment_score"] else None

    trend = _detect_trend(
        trend_row["recent_avg"] if trend_row else None,
        trend_row["older_avg"] if trend_row else None,
    )

    percentiles = await get_city_percentiles(city, conn_str)

    if listing_count == 0:
        return NeighborhoodProfile(
            zone=zone,
            city=city,
            stage="early_growth",
            confidence=0.0,
            avg_price_per_m2=0.0,
            listing_count=0,
            price_trend=None,
            avg_investment_score=None,
            description="No listing data available for this neighborhood.",
        )

    stage, confidence, description = _classify(
        avg_price, percentiles, trend, avg_inv, listing_count,
    )

    return NeighborhoodProfile(
        zone=zone,
        city=city,
        stage=stage,
        confidence=confidence,
        avg_price_per_m2=round(avg_price, 2),
        listing_count=listing_count,
        price_trend=trend,
        avg_investment_score=round(avg_inv, 2) if avg_inv is not None else None,
        description=description,
    )


async def list_neighborhoods(city: str, conn_str: str) -> list[NeighborhoodProfile]:
    """Return classified profiles for every zone with data in the given city."""
    async with await _connect(conn_str) as conn:
        cursor = await conn.execute(
            """
            SELECT DISTINCT zone
            FROM listings
            WHERE city = %s AND zone IS NOT NULL AND price_per_m2 IS NOT NULL
            ORDER BY zone
            """,
            (city,),
        )
        rows = await cursor.fetchall()

    profiles: list[NeighborhoodProfile] = []
    for row in rows:
        profile = await classify_neighborhood(city, row["zone"], conn_str)
        profiles.append(profile)

    # Sort by stage priority (established first) then by avg price descending
    stage_order = {"established": 0, "maturing": 1, "early_growth": 2, "declining": 3}
    profiles.sort(key=lambda p: (stage_order.get(p.stage, 5), -p.avg_price_per_m2))

    return profiles
