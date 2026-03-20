"""Rental market analysis — stats from real comparables + validated yield."""

import statistics
import logging
from pydantic import BaseModel
from fastapi import APIRouter

from .rental_search import fetch_rental_comparables, fetch_rental_comparables_ro

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RentalComparable(BaseModel):
    title: str
    monthly_rent_eur: int
    size_m2: float | None = None
    rent_per_m2: float | None = None
    rooms: int | None = None
    zone: str | None = None
    url: str | None = None


class RentalMarketData(BaseModel):
    avg_rent: int
    median_rent: int
    min_rent: int
    max_rent: int
    sample_count: int
    rent_per_m2_avg: float | None = None
    comparables: list[RentalComparable] = []


class ValidatedYield(BaseModel):
    gross_yield_pct: float
    net_yield_pct: float
    market_rent: int
    llm_estimate: int | None
    rent_confidence: str


class RentalAnalysisRequest(BaseModel):
    city: str | None = None
    zone: str | None = None
    rooms: int | None = None
    size_m2: float | None = None
    purchase_price: int | None = None
    llm_estimate: int | None = None


class RentalAnalysisResponse(BaseModel):
    rental_data: RentalMarketData | None = None
    validated_yield: ValidatedYield | None = None


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

async def analyze_rental_market(
    city: str | None,
    zone: str | None,
    rooms: int | None,
    size_m2: float | None,
    url: str = "",
) -> RentalMarketData | None:
    """Fetch rental comparables and compute stats."""
    all_comps: list[dict] = []

    # Fetch from 999.md (Moldova)
    md_comps = await fetch_rental_comparables(city, zone, rooms, size_m2)
    all_comps.extend(md_comps)

    # Fetch from imobiliare.ro (Romania) if city is provided
    if city:
        try:
            ro_comps = await fetch_rental_comparables_ro(
                city, rooms or 2, size_m2 or 60.0, zone
            )
            all_comps.extend(ro_comps)
        except Exception as exc:
            logger.warning("imobiliare.ro rental fetch failed: %s", exc)

    if not all_comps:
        return None

    rents = [c["monthly_rent_eur"] for c in all_comps if c.get("monthly_rent_eur")]
    if not rents:
        return None

    rent_per_m2_vals = [c["rent_per_m2"] for c in all_comps if c.get("rent_per_m2")]

    comparables = [
        RentalComparable(
            title=c.get("title", ""),
            monthly_rent_eur=c["monthly_rent_eur"],
            size_m2=c.get("size_m2"),
            rent_per_m2=c.get("rent_per_m2"),
            rooms=c.get("rooms"),
            zone=c.get("zone"),
            url=c.get("url"),
        )
        for c in all_comps
        if c.get("monthly_rent_eur")
    ]

    return RentalMarketData(
        avg_rent=int(statistics.mean(rents)),
        median_rent=int(statistics.median(rents)),
        min_rent=min(rents),
        max_rent=max(rents),
        sample_count=len(rents),
        rent_per_m2_avg=round(statistics.mean(rent_per_m2_vals), 1) if rent_per_m2_vals else None,
        comparables=comparables,
    )


def compute_validated_yield(
    purchase_price: int,
    rental_data: RentalMarketData,
    llm_estimate: int | None = None,
) -> ValidatedYield:
    """Compute gross+net yield from real rental market data."""
    market_rent = rental_data.median_rent
    annual_rent = market_rent * 12

    gross_yield = round(annual_rent / purchase_price * 100, 2) if purchase_price > 0 else 0.0

    # Net yield: subtract ~20% for vacancy, management, maintenance
    net_annual = annual_rent * 0.80
    net_yield = round(net_annual / purchase_price * 100, 2) if purchase_price > 0 else 0.0

    # Confidence based on sample count
    count = rental_data.sample_count
    if count >= 5:
        confidence = "high"
    elif count >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    return ValidatedYield(
        gross_yield_pct=gross_yield,
        net_yield_pct=net_yield,
        market_rent=market_rent,
        llm_estimate=llm_estimate,
        rent_confidence=confidence,
    )


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

rental_router = APIRouter(tags=["rental"])


@rental_router.post("/rental-analysis", response_model=RentalAnalysisResponse)
async def rental_analysis_endpoint(req: RentalAnalysisRequest):
    rental_data = await analyze_rental_market(
        req.city, req.zone, req.rooms, req.size_m2
    )

    validated_yield = None
    if rental_data and req.purchase_price and req.purchase_price > 0:
        validated_yield = compute_validated_yield(
            req.purchase_price, rental_data, req.llm_estimate
        )

    return RentalAnalysisResponse(
        rental_data=rental_data,
        validated_yield=validated_yield,
    )
