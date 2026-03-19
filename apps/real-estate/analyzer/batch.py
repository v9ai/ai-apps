import asyncio
from pydantic import BaseModel, Field
from typing import Literal
from fastapi import APIRouter, HTTPException

from .models import ListingExtraction, ValuationResult, ComparableListing, ZoneStats
from .scraper import scrape_listing, detect_source
from .agent import analyze_listing
from .db import upsert_listing, record_price_snapshot

MAX_BATCH_SIZE = 10
BATCH_TIMEOUT_SECONDS = 120


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class BatchRequest(BaseModel):
    urls: list[str] = Field(..., min_length=1, max_length=MAX_BATCH_SIZE)


class BatchItemResult(BaseModel):
    url: str
    status: Literal["success", "error"]
    listing: ListingExtraction | None = None
    valuation: ValuationResult | None = None
    comparables: list[ComparableListing] = []
    zone_stats: ZoneStats | None = None
    error: str | None = None


class BatchComparison(BaseModel):
    best_value: str  # URL of best value listing (most negative deviation)
    best_investment_score: str  # URL of highest investment score
    cheapest_per_m2: str
    rankings: list[dict]  # [{url, rank, investment_score, deviation_pct, price_per_m2}]


class BatchResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    results: list[BatchItemResult]
    comparison: BatchComparison | None = None


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------

async def _analyze_single(url: str) -> BatchItemResult:
    """Scrape + analyze a single listing, returning a BatchItemResult."""
    try:
        source = detect_source(url)
        scraped = await scrape_listing(url)
        listing, valuation, comparables, zone_stats = await analyze_listing(
            scraped["text"], url
        )
        await upsert_listing(url, source, listing, valuation)
        await record_price_snapshot(url, listing.price_eur, listing.price_per_m2)

        return BatchItemResult(
            url=url,
            status="success",
            listing=listing,
            valuation=valuation,
            comparables=comparables,
            zone_stats=zone_stats,
        )
    except Exception as e:
        return BatchItemResult(url=url, status="error", error=str(e))


def build_comparison(results: list[BatchItemResult]) -> BatchComparison | None:
    """Build cross-listing comparison from successful results with valuation data.

    Returns None if fewer than 2 results have both valuation and listing data.
    """
    scoreable = [
        r for r in results
        if r.status == "success"
        and r.valuation is not None
        and r.listing is not None
    ]
    if len(scoreable) < 2:
        return None

    # Build ranking entries
    entries = []
    for r in scoreable:
        entries.append({
            "url": r.url,
            "investment_score": r.valuation.investment_score,
            "deviation_pct": r.valuation.price_deviation_pct,
            "price_per_m2": r.listing.price_per_m2,
        })

    # Sort by investment_score descending (None treated as -inf)
    entries.sort(
        key=lambda e: e["investment_score"] if e["investment_score"] is not None else float("-inf"),
        reverse=True,
    )
    for rank, entry in enumerate(entries, start=1):
        entry["rank"] = rank

    # Best value = most negative deviation_pct (biggest undervaluation)
    with_deviation = [e for e in entries if e["deviation_pct"] is not None]
    best_value_url = (
        min(with_deviation, key=lambda e: e["deviation_pct"])["url"]
        if with_deviation
        else entries[0]["url"]
    )

    # Best investment score = rank 1
    best_investment_url = entries[0]["url"]

    # Cheapest per m2
    with_price = [e for e in entries if e["price_per_m2"] is not None]
    cheapest_url = (
        min(with_price, key=lambda e: e["price_per_m2"])["url"]
        if with_price
        else entries[0]["url"]
    )

    return BatchComparison(
        best_value=best_value_url,
        best_investment_score=best_investment_url,
        cheapest_per_m2=cheapest_url,
        rankings=entries,
    )


async def analyze_batch(urls: list[str]) -> BatchResponse:
    """Analyze multiple listings concurrently.

    Raises ValueError if more than MAX_BATCH_SIZE URLs are provided.
    """
    if len(urls) > MAX_BATCH_SIZE:
        raise ValueError(f"Maximum {MAX_BATCH_SIZE} URLs allowed per batch")

    # Deduplicate while preserving order
    seen: set[str] = set()
    unique_urls: list[str] = []
    for url in urls:
        if url not in seen:
            seen.add(url)
            unique_urls.append(url)

    tasks = [_analyze_single(url) for url in unique_urls]
    results: list[BatchItemResult] = await asyncio.gather(*tasks, return_exceptions=True)

    # Convert any unhandled exceptions to error results
    clean_results: list[BatchItemResult] = []
    for url, result in zip(unique_urls, results):
        if isinstance(result, Exception):
            clean_results.append(
                BatchItemResult(url=url, status="error", error=str(result))
            )
        else:
            clean_results.append(result)

    succeeded = sum(1 for r in clean_results if r.status == "success")
    failed = len(clean_results) - succeeded

    comparison = build_comparison(clean_results)

    return BatchResponse(
        total=len(clean_results),
        succeeded=succeeded,
        failed=failed,
        results=clean_results,
        comparison=comparison,
    )


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

batch_router = APIRouter()


@batch_router.post("/analyze-batch", response_model=BatchResponse)
async def analyze_batch_endpoint(req: BatchRequest):
    try:
        response = await asyncio.wait_for(
            analyze_batch(req.urls),
            timeout=BATCH_TIMEOUT_SECONDS,
        )
        return response
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=504,
            detail=f"Batch analysis timed out after {BATCH_TIMEOUT_SECONDS}s",
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
