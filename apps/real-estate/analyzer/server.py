import time
import logging
from contextlib import asynccontextmanager
from urllib.parse import urlparse

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime, timezone

from .models import (
    AnalysisRequest,
    AnalysisResponse,
    AnalysisMeta,
    ErrorResponse,
    PriceSnapshot,
    AggregateStats,
    VerdictDistribution,
    ZoneSummary,
)
from .scraper import scrape_listing, detect_source
from .agent import analyze_listing_v2
from .db import init_db, upsert_listing, get_recent_listings, record_price_snapshot, get_price_history, get_conn
from .predict_london import LondonPredictionRequest, LondonPredictionResponse, predict_london
from .batch import batch_router
from .portfolio import portfolio_router, init_watchlist_tables
from .trends import trends_router
from .market_data import init_market_tables
from .valuation_config import init_valuation_config
from .models import QualityAssessment, FeatureSummary, EnvironmentalContextResponse, EnvironmentalHazardResponse

logger = logging.getLogger("analyzer.server")

# ---------------------------------------------------------------------------
# Allowed URL patterns
# ---------------------------------------------------------------------------
_ALLOWED_DOMAINS = {"999.md", "m.999.md", "imobiliare.ro", "www.imobiliare.ro"}

_ALLOWED_ORIGINS = [
    "http://localhost:3005",
    "http://localhost:3000",
]
_ALLOWED_ORIGIN_REGEX = r"https://.*\.vercel\.app"


def _validate_listing_url(url: str) -> str | None:
    """Return None if the URL is valid, or an error message otherwise."""
    try:
        parsed = urlparse(url)
    except Exception:
        return "Malformed URL"
    if parsed.scheme not in ("http", "https"):
        return "URL must use http or https"
    domain = (parsed.netloc or "").lower().split(":")[0]
    if not any(domain == d or domain.endswith("." + d) for d in _ALLOWED_DOMAINS):
        return f"Only listings from {', '.join(sorted(_ALLOWED_DOMAINS))} are supported"
    return None


def _sanitize_url(url: str) -> str:
    """Strip fragments and dangerous characters, enforce https."""
    url = url.strip()
    parsed = urlparse(url)
    # Upgrade http to https
    scheme = "https" if parsed.scheme in ("http", "https") else parsed.scheme
    # Drop fragment, keep query
    sanitized = parsed._replace(scheme=scheme, fragment="")
    return sanitized.geturl()


# ---------------------------------------------------------------------------
# Data-quality heuristic
# ---------------------------------------------------------------------------
_QUALITY_FIELDS = [
    "price_eur", "size_m2", "price_per_m2", "rooms",
    "floor", "zone", "city", "condition",
]


def _compute_data_quality(listing) -> float:
    """Return 0-1 score based on how many key fields are non-null."""
    filled = sum(1 for f in _QUALITY_FIELDS if getattr(listing, f, None) is not None)
    # condition == "unknown" counts as missing
    if getattr(listing, "condition", "unknown") == "unknown":
        filled = max(0, filled - 1)
    return round(filled / len(_QUALITY_FIELDS), 2)


# ---------------------------------------------------------------------------
# Error-response helper
# ---------------------------------------------------------------------------
def _error_response(
    status: int,
    error_code: str,
    error: str,
    detail: str | None = None,
    hint: str | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        error=error,
        error_code=error_code,  # type: ignore[arg-type]
        detail=detail,
        hint=hint,
    )
    return JSONResponse(status_code=status, content=body.model_dump())


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    from .config import settings
    await init_db()
    await init_market_tables(settings.database_url)
    await init_watchlist_tables(settings.database_url)
    await init_valuation_config(settings.database_url)
    yield


app = FastAPI(title="Real Estate Analyzer", version="0.3.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_origin_regex=_ALLOWED_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include new routers
app.include_router(batch_router)
app.include_router(portfolio_router)
app.include_router(trends_router)


# ---------------------------------------------------------------------------
# POST /analyze
# ---------------------------------------------------------------------------
@app.post(
    "/analyze",
    response_model=AnalysisResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid URL"},
        422: {"model": ErrorResponse, "description": "Scraping failed"},
        500: {"model": ErrorResponse, "description": "Analysis failed"},
    },
)
async def analyze(req: AnalysisRequest):
    # --- Input validation ---
    url_error = _validate_listing_url(req.url)
    if url_error:
        return _error_response(
            400,
            "invalid_url",
            url_error,
            detail=req.url,
            hint="Provide a full listing URL from 999.md or imobiliare.ro",
        )

    url = _sanitize_url(req.url)
    source = detect_source(url)

    t_total_start = time.monotonic()

    # --- Scrape ---
    t_scrape_start = time.monotonic()
    try:
        scraped = await scrape_listing(url)
    except Exception as e:
        logger.warning("Scrape failed for %s: %s", url, e)
        return _error_response(
            422,
            "scrape_failed",
            "Could not fetch the listing page",
            detail=str(e),
            hint="Check that the URL is accessible and the listing has not been removed",
        )
    scrape_ms = int((time.monotonic() - t_scrape_start) * 1000)
    # Adopt canonical (post-redirect) URL from scraper — short URLs resolve to full paths with zone segments
    url = scraped["url"]

    # --- Analyze ---
    t_analysis_start = time.monotonic()
    try:
        listing, valuation, comparables, zone_stats, extras = await analyze_listing_v2(scraped["text"], url)
    except Exception as e:
        logger.error("Analysis failed for %s: %s", url, e, exc_info=True)
        return _error_response(
            500,
            "analysis_failed",
            "AI analysis could not complete",
            detail=str(e),
            hint="The listing text may be too short or in an unsupported format. Try again.",
        )
    analysis_ms = int((time.monotonic() - t_analysis_start) * 1000)
    total_ms = int((time.monotonic() - t_total_start) * 1000)

    # --- Persist ---
    try:
        await upsert_listing(url, source, listing, valuation)
        await record_price_snapshot(url, listing.price_eur, listing.price_per_m2)
    except Exception as e:
        # Non-fatal — log but still return the analysis
        logger.error("DB persist failed for %s: %s", url, e, exc_info=True)

    # --- Price history ---
    try:
        history_rows = await get_price_history(url)
        price_history = [
            PriceSnapshot(price_eur=r["price_eur"], price_per_m2=r["price_per_m2"], scraped_at=r["scraped_at"])
            for r in history_rows
        ]
    except Exception:
        price_history = []

    # Build quality/citation/feature extras
    quality_data = None
    if extras.get("quality"):
        q = extras["quality"]
        quality_data = QualityAssessment(
            quality_score=q.quality_score,
            warnings=q.warnings,
            flags=[str(f) for f in q.flags],
            recommendation=q.recommendation,
        )

    feature_data = None
    if extras.get("feature_summary"):
        feature_data = FeatureSummary(**extras["feature_summary"])

    citations_data = extras.get("citations")

    env_data = None
    if extras.get("environmental"):
        env = extras["environmental"]
        env_data = EnvironmentalContextResponse(
            hazards=[
                EnvironmentalHazardResponse(
                    name=h.name, hazard_type=h.hazard_type,
                    distance_m=h.distance_m, impact=h.impact,
                )
                for h in env.hazards
            ],
            noise_level=env.noise_level,
            air_quality_risk=env.air_quality_risk,
            adjustment_pct=env.adjustment_pct,
            summary=env.summary,
        )

    return AnalysisResponse(
        url=url,
        source=source,
        listing=listing,
        valuation=valuation,
        analyzed_at=datetime.now(timezone.utc),
        comparables=comparables,
        zone_stats=zone_stats,
        price_history=price_history,
        quality=quality_data,
        citations=citations_data,
        feature_summary=feature_data,
        environmental=env_data,
        meta=AnalysisMeta(
            processing_time_ms=total_ms,
            scrape_time_ms=scrape_ms,
            analysis_time_ms=analysis_ms,
            model_used="deepseek-chat",
            data_quality_score=_compute_data_quality(listing),
        ),
    )


# ---------------------------------------------------------------------------
# GET /listings
# ---------------------------------------------------------------------------
@app.get("/listings")
async def listings(limit: int = 20):
    return await get_recent_listings(limit)


# ---------------------------------------------------------------------------
# GET /stats — aggregate statistics across all analyzed listings
# ---------------------------------------------------------------------------
@app.get("/stats", response_model=AggregateStats)
async def stats():
    async with await get_conn() as conn:
        cur = await conn.execute(
            """
            SELECT
                COUNT(*)                          AS total,
                AVG(price_eur)::float              AS avg_price,
                AVG(price_per_m2)::float           AS avg_ppm2,
                AVG(investment_score)::float       AS avg_inv,
                COUNT(*) FILTER (WHERE verdict = 'undervalued')  AS n_under,
                COUNT(*) FILTER (WHERE verdict = 'fair')         AS n_fair,
                COUNT(*) FILTER (WHERE verdict = 'overvalued')   AS n_over
            FROM listings
            """
        )
        row = await cur.fetchone()

        cur2 = await conn.execute(
            "SELECT DISTINCT city FROM listings WHERE city IS NOT NULL ORDER BY city"
        )
        city_rows = await cur2.fetchall()

    return AggregateStats(
        total_listings=row["total"],
        avg_price_eur=round(row["avg_price"], 2) if row["avg_price"] else None,
        avg_price_per_m2=round(row["avg_ppm2"], 2) if row["avg_ppm2"] else None,
        avg_investment_score=round(row["avg_inv"], 2) if row["avg_inv"] else None,
        verdict_distribution=VerdictDistribution(
            undervalued=row["n_under"],
            fair=row["n_fair"],
            overvalued=row["n_over"],
        ),
        cities=[r["city"] for r in city_rows],
    )


# ---------------------------------------------------------------------------
# GET /zones — unique zones with counts and average prices
# ---------------------------------------------------------------------------
@app.get("/zones", response_model=list[ZoneSummary])
async def zones():
    async with await get_conn() as conn:
        cur = await conn.execute(
            """
            SELECT
                zone,
                COUNT(*)                    AS cnt,
                AVG(price_per_m2)::float    AS avg_ppm2,
                MIN(price_per_m2)::float    AS min_ppm2,
                MAX(price_per_m2)::float    AS max_ppm2,
                AVG(investment_score)::float AS avg_inv
            FROM listings
            WHERE zone IS NOT NULL
            GROUP BY zone
            ORDER BY cnt DESC, zone
            """
        )
        rows = await cur.fetchall()

    return [
        ZoneSummary(
            zone=r["zone"],
            count=r["cnt"],
            avg_price_per_m2=round(r["avg_ppm2"], 2) if r["avg_ppm2"] else None,
            min_price_per_m2=round(r["min_ppm2"], 2) if r["min_ppm2"] else None,
            max_price_per_m2=round(r["max_ppm2"], 2) if r["max_ppm2"] else None,
            avg_investment_score=round(r["avg_inv"], 2) if r["avg_inv"] else None,
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# POST /predict/london
# ---------------------------------------------------------------------------
@app.post("/predict/london", response_model=LondonPredictionResponse)
async def predict_london_endpoint(req: LondonPredictionRequest):
    try:
        return await predict_london(req)
    except Exception as e:
        return _error_response(
            500,
            "internal_error",
            "Prediction failed",
            detail=str(e),
        )


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok"}
