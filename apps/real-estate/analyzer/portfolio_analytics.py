"""Portfolio analytics — aggregate data from watchlist + listings for dashboards."""

import psycopg
from psycopg.rows import dict_row
from pydantic import BaseModel
from fastapi import APIRouter

from .config import settings


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AllocationItem(BaseModel):
    label: str
    count: int
    total_value: int
    percentage: float


class YieldDistribution(BaseModel):
    bucket: str  # "<4%", "4-6%", "6-8%", ">8%"
    count: int


class PortfolioSummary(BaseModel):
    total_value: int
    total_items: int
    avg_yield: float | None
    avg_score: float | None
    avg_deviation: float | None
    allocation_by_city: list[AllocationItem]
    allocation_by_verdict: list[AllocationItem]
    yield_distribution: list[YieldDistribution]
    best_performer: dict | None
    worst_performer: dict | None


class PerformancePoint(BaseModel):
    date: str
    total_value: int
    avg_price_per_m2: float


class PortfolioPerformance(BaseModel):
    data_points: list[PerformancePoint]
    value_change_pct: float | None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _conn(conn_str: str):
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


YIELD_BUCKETS = [
    ("<4%", 0, 4),
    ("4-6%", 4, 6),
    ("6-8%", 6, 8),
    (">8%", 8, 100),
]


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

async def compute_portfolio_analytics(conn_str: str) -> PortfolioSummary:
    """Aggregate portfolio data from watchlist + listings."""
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute("""
            SELECT w.*, l.rental_estimate_eur, l.rental_yield_pct, l.net_yield_pct,
                   l.investment_score as l_score, l.price_deviation_pct, l.verdict as l_verdict
            FROM watchlist w
            LEFT JOIN listings l ON l.url = w.url
            ORDER BY w.added_at DESC
        """)
        rows = await cursor.fetchall()

    if not rows:
        return PortfolioSummary(
            total_value=0, total_items=0, avg_yield=None, avg_score=None,
            avg_deviation=None, allocation_by_city=[], allocation_by_verdict=[],
            yield_distribution=[YieldDistribution(bucket=b, count=0) for b, _, _ in YIELD_BUCKETS],
            best_performer=None, worst_performer=None,
        )

    total_value = sum(r.get("price_eur") or 0 for r in rows)
    total_items = len(rows)

    # Average yield
    yields = [r["rental_yield_pct"] for r in rows if r.get("rental_yield_pct") is not None]
    avg_yield = sum(yields) / len(yields) if yields else None

    # Average score
    scores = [
        float(r.get("l_score") or r.get("investment_score") or 0)
        for r in rows
        if (r.get("l_score") or r.get("investment_score")) is not None
    ]
    avg_score = sum(scores) / len(scores) if scores else None

    # Average deviation
    devs = [
        float(r.get("price_deviation_pct") or r.get("deviation_pct") or 0)
        for r in rows
        if (r.get("price_deviation_pct") or r.get("deviation_pct")) is not None
    ]
    avg_deviation = sum(devs) / len(devs) if devs else None

    # Allocation by city
    city_groups: dict[str, list[dict]] = {}
    for r in rows:
        city = r.get("city") or "Unknown"
        city_groups.setdefault(city, []).append(r)

    allocation_by_city = []
    for city, items in city_groups.items():
        city_value = sum(i.get("price_eur") or 0 for i in items)
        allocation_by_city.append(AllocationItem(
            label=city,
            count=len(items),
            total_value=city_value,
            percentage=round(city_value / total_value * 100, 1) if total_value > 0 else 0,
        ))

    # Allocation by verdict
    verdict_groups: dict[str, list[dict]] = {}
    for r in rows:
        verdict = r.get("l_verdict") or r.get("verdict") or "unknown"
        verdict_groups.setdefault(verdict, []).append(r)

    allocation_by_verdict = []
    for verdict, items in verdict_groups.items():
        v_value = sum(i.get("price_eur") or 0 for i in items)
        allocation_by_verdict.append(AllocationItem(
            label=verdict,
            count=len(items),
            total_value=v_value,
            percentage=round(v_value / total_value * 100, 1) if total_value > 0 else 0,
        ))

    # Yield distribution
    yield_dist = []
    for bucket_label, lo, hi in YIELD_BUCKETS:
        count = sum(
            1 for r in rows
            if r.get("rental_yield_pct") is not None
            and lo <= float(r["rental_yield_pct"]) < hi
        )
        yield_dist.append(YieldDistribution(bucket=bucket_label, count=count))

    # Best / worst performer by investment score
    scored = [
        r for r in rows
        if (r.get("l_score") or r.get("investment_score")) is not None
    ]
    best_performer = None
    worst_performer = None
    if scored:
        def _score(r: dict) -> float:
            return float(r.get("l_score") or r.get("investment_score") or 0)

        best = max(scored, key=_score)
        worst = min(scored, key=_score)
        best_performer = {
            "url": best["url"],
            "label": best.get("label"),
            "score": _score(best),
            "yield": best.get("rental_yield_pct"),
        }
        worst_performer = {
            "url": worst["url"],
            "label": worst.get("label"),
            "score": _score(worst),
            "yield": worst.get("rental_yield_pct"),
        }

    return PortfolioSummary(
        total_value=total_value,
        total_items=total_items,
        avg_yield=round(avg_yield, 2) if avg_yield is not None else None,
        avg_score=round(avg_score, 2) if avg_score is not None else None,
        avg_deviation=round(avg_deviation, 2) if avg_deviation is not None else None,
        allocation_by_city=allocation_by_city,
        allocation_by_verdict=allocation_by_verdict,
        yield_distribution=yield_dist,
        best_performer=best_performer,
        worst_performer=worst_performer,
    )


async def get_portfolio_performance(conn_str: str) -> PortfolioPerformance:
    """Track portfolio value over time using price_snapshots."""
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute("""
            SELECT
                DATE_TRUNC('week', ps.scraped_at)::date AS week,
                SUM(ps.price_eur)::int AS total_value,
                AVG(ps.price_per_m2)::float AS avg_price_per_m2
            FROM price_snapshots ps
            INNER JOIN watchlist w ON w.url = ps.url
            GROUP BY week
            ORDER BY week ASC
        """)
        rows = await cursor.fetchall()

    data_points = [
        PerformancePoint(
            date=str(r["week"]),
            total_value=r["total_value"] or 0,
            avg_price_per_m2=round(r["avg_price_per_m2"] or 0, 2),
        )
        for r in rows
    ]

    value_change_pct = None
    if len(data_points) >= 2:
        first_val = data_points[0].total_value
        last_val = data_points[-1].total_value
        if first_val > 0:
            value_change_pct = round((last_val - first_val) / first_val * 100, 2)

    return PortfolioPerformance(data_points=data_points, value_change_pct=value_change_pct)


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

analytics_router = APIRouter(prefix="/portfolio", tags=["portfolio-analytics"])


@analytics_router.get("/analytics", response_model=PortfolioSummary)
async def portfolio_analytics():
    return await compute_portfolio_analytics(settings.database_url)


@analytics_router.get("/performance", response_model=PortfolioPerformance)
async def portfolio_performance():
    return await get_portfolio_performance(settings.database_url)
