"""Market trends aggregation from accumulated analysis data."""

from __future__ import annotations

from typing import Literal

import psycopg
from fastapi import APIRouter
from psycopg.rows import dict_row
from pydantic import BaseModel

from .config import settings

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class ZoneTrend(BaseModel):
    zone: str
    city: str
    current_avg_price_per_m2: float
    previous_avg_price_per_m2: float | None  # 30 days ago
    change_pct: float | None
    listing_count: int
    avg_investment_score: float | None
    trend: Literal["rising", "stable", "falling"]


class CityOverview(BaseModel):
    city: str
    total_listings: int
    avg_price_per_m2: float
    median_price_per_m2: float
    zones: list[ZoneTrend]
    most_undervalued_zone: str | None
    most_expensive_zone: str | None
    best_investment_zone: str | None


class PriceTimeline(BaseModel):
    zone: str
    city: str
    data_points: list[dict]  # [{date: str, avg_price_per_m2: float, count: int}]


class MarketSummary(BaseModel):
    cities: list[CityOverview]
    total_analyses: int
    latest_analysis: str | None  # ISO datetime
    top_opportunities: list[dict]  # [{url, city, zone, deviation_pct, investment_score}]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _classify_trend(change_pct: float | None) -> Literal["rising", "stable", "falling"]:
    if change_pct is None:
        return "stable"
    if change_pct > 3:
        return "rising"
    if change_pct < -3:
        return "falling"
    return "stable"


async def _get_conn(conn_str: str):
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


# ---------------------------------------------------------------------------
# Core query functions
# ---------------------------------------------------------------------------


async def get_top_opportunities(conn_str: str, limit: int = 10) -> list[dict]:
    """Listings with best deviation_pct + investment_score combo.

    Ranks by a composite score: negative deviation (undervalued) is good,
    high investment_score is good.  Composite = investment_score - deviation_pct.
    """
    async with await _get_conn(conn_str) as conn:
        cursor = await conn.execute(
            """
            SELECT url, city, zone, price_deviation_pct, investment_score,
                   title, price_eur, size_m2, price_per_m2, verdict
            FROM listings
            WHERE price_deviation_pct IS NOT NULL
              AND investment_score IS NOT NULL
            ORDER BY (investment_score - price_deviation_pct) DESC
            LIMIT %s
            """,
            (limit,),
        )
        rows = await cursor.fetchall()
        return [
            {
                "url": r["url"],
                "city": r["city"],
                "zone": r["zone"],
                "deviation_pct": r["price_deviation_pct"],
                "investment_score": r["investment_score"],
                "title": r["title"],
                "price_eur": r["price_eur"],
                "size_m2": r["size_m2"],
                "price_per_m2": r["price_per_m2"],
                "verdict": r["verdict"],
            }
            for r in rows
        ]


async def _build_zone_trends(city: str, conn_str: str) -> list[ZoneTrend]:
    """Build per-zone trend data for a single city."""
    async with await _get_conn(conn_str) as conn:
        # Current averages per zone
        cursor = await conn.execute(
            """
            SELECT
                zone,
                city,
                AVG(price_per_m2)          AS current_avg_price_per_m2,
                COUNT(*)                   AS listing_count,
                AVG(investment_score)      AS avg_investment_score
            FROM listings
            WHERE city = %s
              AND zone IS NOT NULL
              AND price_per_m2 IS NOT NULL
            GROUP BY zone, city
            ORDER BY current_avg_price_per_m2 DESC
            """,
            (city,),
        )
        current_rows = await cursor.fetchall()

        # Previous averages (listings analyzed > 30 days ago)
        cursor = await conn.execute(
            """
            SELECT
                zone,
                AVG(price_per_m2) AS previous_avg_price_per_m2
            FROM listings
            WHERE city = %s
              AND zone IS NOT NULL
              AND price_per_m2 IS NOT NULL
              AND analyzed_at < NOW() - INTERVAL '30 days'
            GROUP BY zone
            """,
            (city,),
        )
        prev_rows = await cursor.fetchall()

    prev_map: dict[str, float] = {r["zone"]: r["previous_avg_price_per_m2"] for r in prev_rows}

    trends: list[ZoneTrend] = []
    for row in current_rows:
        zone = row["zone"]
        current = row["current_avg_price_per_m2"]
        previous = prev_map.get(zone)
        change_pct: float | None = None
        if previous is not None and previous > 0:
            change_pct = round((current - previous) / previous * 100, 2)

        trends.append(
            ZoneTrend(
                zone=zone,
                city=row["city"],
                current_avg_price_per_m2=round(current, 2),
                previous_avg_price_per_m2=round(previous, 2) if previous is not None else None,
                change_pct=change_pct,
                listing_count=row["listing_count"],
                avg_investment_score=(
                    round(row["avg_investment_score"], 2) if row["avg_investment_score"] is not None else None
                ),
                trend=_classify_trend(change_pct),
            )
        )

    return trends


async def get_city_overview(city: str, conn_str: str) -> CityOverview:
    """Single city deep dive with zone-level trends."""
    async with await _get_conn(conn_str) as conn:
        cursor = await conn.execute(
            """
            SELECT
                COUNT(*)                                      AS total_listings,
                AVG(price_per_m2)                             AS avg_price_per_m2,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price_per_m2) AS median_price_per_m2
            FROM listings
            WHERE city = %s AND price_per_m2 IS NOT NULL
            """,
            (city,),
        )
        agg = await cursor.fetchone()

    zones = await _build_zone_trends(city, conn_str)

    # Derived highlights
    most_undervalued: str | None = None
    most_expensive: str | None = None
    best_investment: str | None = None

    if zones:
        # Most undervalued = zone with largest negative change (falling prices = cheaper to buy)
        # or, more usefully, lowest current avg price
        cheapest = min(zones, key=lambda z: z.current_avg_price_per_m2)
        most_undervalued = cheapest.zone

        expensive = max(zones, key=lambda z: z.current_avg_price_per_m2)
        most_expensive = expensive.zone

        scored = [z for z in zones if z.avg_investment_score is not None]
        if scored:
            best = max(scored, key=lambda z: z.avg_investment_score)  # type: ignore[arg-type]
            best_investment = best.zone

    return CityOverview(
        city=city,
        total_listings=agg["total_listings"] if agg else 0,
        avg_price_per_m2=round(agg["avg_price_per_m2"], 2) if agg and agg["avg_price_per_m2"] else 0,
        median_price_per_m2=round(agg["median_price_per_m2"], 2) if agg and agg["median_price_per_m2"] else 0,
        zones=zones,
        most_undervalued_zone=most_undervalued,
        most_expensive_zone=most_expensive,
        best_investment_zone=best_investment,
    )


async def get_zone_timeline(city: str, zone: str, conn_str: str) -> PriceTimeline:
    """Price history for a zone using price_snapshots grouped by week.

    Joins price_snapshots with listings to resolve zone/city from the URL,
    then buckets by ISO week.
    """
    async with await _get_conn(conn_str) as conn:
        cursor = await conn.execute(
            """
            SELECT
                DATE_TRUNC('week', ps.scraped_at)::date AS week,
                AVG(ps.price_per_m2)                    AS avg_price_per_m2,
                COUNT(*)                                AS count
            FROM price_snapshots ps
            JOIN listings l ON l.url = ps.url
            WHERE l.city = %s
              AND l.zone = %s
              AND ps.price_per_m2 IS NOT NULL
            GROUP BY week
            ORDER BY week ASC
            """,
            (city, zone),
        )
        rows = await cursor.fetchall()

    return PriceTimeline(
        zone=zone,
        city=city,
        data_points=[
            {
                "date": r["week"].isoformat(),
                "avg_price_per_m2": round(r["avg_price_per_m2"], 2),
                "count": r["count"],
            }
            for r in rows
        ],
    )


async def get_market_summary(conn_str: str) -> MarketSummary:
    """Aggregate market data across all cities."""
    async with await _get_conn(conn_str) as conn:
        # Global stats
        cursor = await conn.execute(
            """
            SELECT
                COUNT(*)                      AS total_analyses,
                MAX(analyzed_at)::text        AS latest_analysis
            FROM listings
            """
        )
        stats = await cursor.fetchone()

        # Distinct cities
        cursor = await conn.execute(
            "SELECT DISTINCT city FROM listings WHERE city IS NOT NULL ORDER BY city"
        )
        city_rows = await cursor.fetchall()

    cities: list[CityOverview] = []
    for row in city_rows:
        overview = await get_city_overview(row["city"], conn_str)
        cities.append(overview)

    opportunities = await get_top_opportunities(conn_str, limit=10)

    return MarketSummary(
        cities=cities,
        total_analyses=stats["total_analyses"] if stats else 0,
        latest_analysis=stats["latest_analysis"] if stats else None,
        top_opportunities=opportunities,
    )


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

trends_router = APIRouter(tags=["trends"])


@trends_router.get("/trends/opportunities", response_model=list[dict])
async def api_top_opportunities(limit: int = 10):
    """Top investment opportunities across all cities."""
    return await get_top_opportunities(settings.database_url, limit=limit)


@trends_router.get("/trends/{city}/{zone}", response_model=PriceTimeline)
async def api_zone_timeline(city: str, zone: str):
    """Weekly price timeline for a specific zone."""
    return await get_zone_timeline(city, zone, settings.database_url)


@trends_router.get("/trends/{city}", response_model=CityOverview)
async def api_city_overview(city: str):
    """Deep dive into a single city's market."""
    return await get_city_overview(city, settings.database_url)


@trends_router.get("/trends", response_model=MarketSummary)
async def api_market_summary():
    """Full market summary across all cities."""
    return await get_market_summary(settings.database_url)
