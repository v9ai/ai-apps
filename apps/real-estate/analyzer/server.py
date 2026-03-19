from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone

from .models import AnalysisRequest, AnalysisResponse
from .scraper import scrape_listing, detect_source
from .agent import analyze_listing
from .db import init_db, upsert_listing, get_recent_listings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Real Estate Analyzer", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3005"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(req: AnalysisRequest):
    source = detect_source(req.url)

    try:
        scraped = await scrape_listing(req.url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to scrape listing: {e}")

    try:
        listing, valuation, comparables, zone_stats = await analyze_listing(scraped["text"], req.url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")

    await upsert_listing(req.url, source, listing, valuation)

    return AnalysisResponse(
        url=req.url,
        source=source,
        listing=listing,
        valuation=valuation,
        analyzed_at=datetime.now(timezone.utc),
        comparables=comparables,
        zone_stats=zone_stats,
    )


@app.get("/listings")
async def listings(limit: int = 20):
    return await get_recent_listings(limit)


@app.get("/health")
async def health():
    return {"status": "ok"}
