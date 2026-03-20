import psycopg
from psycopg.rows import dict_row
from datetime import datetime, timezone
from .config import settings
from .models import ListingExtraction, ValuationResult

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    url TEXT UNIQUE NOT NULL,
    source TEXT NOT NULL,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    analyzed_at TIMESTAMPTZ,

    -- Extracted data
    title TEXT,
    price_eur INTEGER,
    size_m2 FLOAT,
    price_per_m2 FLOAT,
    rooms INTEGER,
    floor INTEGER,
    total_floors INTEGER,
    zone TEXT,
    city TEXT,
    condition TEXT,
    features JSONB DEFAULT '[]',
    parking_included BOOLEAN,
    parking_price_eur INTEGER,

    -- Core valuation
    verdict TEXT,
    confidence FLOAT,
    fair_value_eur_per_m2 INTEGER,
    price_deviation_pct FLOAT,
    reasoning TEXT,
    key_factors JSONB DEFAULT '[]',

    -- Extended valuation
    investment_score FLOAT,
    recommendation TEXT,
    market_context TEXT,
    risk_factors JSONB DEFAULT '[]',
    opportunity_factors JSONB DEFAULT '[]',
    rental_estimate_eur INTEGER,
    rental_yield_pct FLOAT,
    negotiation_margin_pct FLOAT,
    total_cost_eur INTEGER,
    liquidity TEXT,
    price_trend TEXT,

    -- Enriched metrics (v2)
    score_breakdown JSONB,
    fair_price_eur INTEGER,
    net_yield_pct FLOAT,
    breakeven_years FLOAT,
    appreciation_pct_1y FLOAT,

    -- Research-grounded metrics (v3)
    fair_value_low_eur_per_m2 INTEGER,
    fair_value_high_eur_per_m2 INTEGER,
    price_to_rent_ratio FLOAT,
    time_on_market_weeks FLOAT,
    renovation_upside_pct FLOAT,
    neighborhood_stage TEXT
);
"""

MIGRATE_TABLE = """
DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS parking_included BOOLEAN;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS parking_price_eur INTEGER;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS investment_score FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS recommendation TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS market_context TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS risk_factors JSONB DEFAULT '[]';
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS opportunity_factors JSONB DEFAULT '[]';
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS rental_estimate_eur INTEGER;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS rental_yield_pct FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS negotiation_margin_pct FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS total_cost_eur INTEGER;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS liquidity TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_trend TEXT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS score_breakdown JSONB;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS fair_price_eur INTEGER;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS net_yield_pct FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS breakeven_years FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS appreciation_pct_1y FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS fair_value_low_eur_per_m2 INTEGER;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS fair_value_high_eur_per_m2 INTEGER;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_to_rent_ratio FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS time_on_market_weeks FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS renovation_upside_pct FLOAT;
  ALTER TABLE listings ADD COLUMN IF NOT EXISTS neighborhood_stage TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;
"""

CREATE_RENTAL_SNAPSHOTS = """
CREATE TABLE IF NOT EXISTS rental_snapshots (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    city TEXT, zone TEXT, rooms INTEGER,
    monthly_rent_eur INTEGER, size_m2 REAL, rent_per_m2 REAL,
    scraped_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(url, monthly_rent_eur)
);
"""

MIGRATE_WATCHLIST_PIPELINE = """
DO $$ BEGIN
  ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'discovered';
  ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS target_price_eur INTEGER;
  ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
EXCEPTION WHEN others THEN NULL;
END $$;
"""

CREATE_ALERTS_TABLES = """
CREATE TABLE IF NOT EXISTS saved_alerts (
    id SERIAL PRIMARY KEY, label TEXT,
    criteria JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ, is_active BOOLEAN DEFAULT TRUE
);
"""

CREATE_ALERT_MATCHES = """
CREATE TABLE IF NOT EXISTS alert_matches (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES saved_alerts(id) ON DELETE CASCADE,
    listing_url TEXT NOT NULL,
    title TEXT, price_eur INTEGER, size_m2 REAL, price_per_m2 REAL,
    rooms INTEGER, zone TEXT,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    seen BOOLEAN DEFAULT FALSE,
    UNIQUE(alert_id, listing_url)
);
"""

CREATE_CHAT_SESSIONS = """
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    messages JSONB DEFAULT '[]',
    context_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
"""


async def get_conn():
    return await psycopg.AsyncConnection.connect(settings.database_url, row_factory=dict_row)


async def init_db():
    async with await get_conn() as conn:
        await conn.execute(CREATE_TABLE)
        await conn.execute(MIGRATE_TABLE)
        await conn.execute(CREATE_RENTAL_SNAPSHOTS)
        await conn.execute(MIGRATE_WATCHLIST_PIPELINE)
        await conn.execute(CREATE_ALERTS_TABLES)
        await conn.execute(CREATE_ALERT_MATCHES)
        await conn.execute(CREATE_CHAT_SESSIONS)
        await conn.commit()


async def upsert_listing(
    url: str,
    source: str,
    listing: ListingExtraction,
    valuation: ValuationResult,
) -> dict:
    import json

    score_bd = valuation.score_breakdown.model_dump() if valuation.score_breakdown else None

    async with await get_conn() as conn:
        cursor = await conn.execute(
            """
            INSERT INTO listings (
                url, source, analyzed_at,
                title, price_eur, size_m2, price_per_m2, rooms, floor, total_floors,
                zone, city, condition, features, parking_included, parking_price_eur,
                verdict, confidence, fair_value_eur_per_m2, price_deviation_pct,
                reasoning, key_factors,
                investment_score, recommendation, market_context,
                risk_factors, opportunity_factors,
                rental_estimate_eur, rental_yield_pct, negotiation_margin_pct,
                total_cost_eur, liquidity, price_trend,
                score_breakdown, fair_price_eur, net_yield_pct, breakeven_years, appreciation_pct_1y,
                fair_value_low_eur_per_m2, fair_value_high_eur_per_m2,
                price_to_rent_ratio, time_on_market_weeks, renovation_upside_pct, neighborhood_stage
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s, %s
            )
            ON CONFLICT (url) DO UPDATE SET
                analyzed_at = EXCLUDED.analyzed_at,
                title = EXCLUDED.title,
                price_eur = EXCLUDED.price_eur,
                size_m2 = EXCLUDED.size_m2,
                price_per_m2 = EXCLUDED.price_per_m2,
                rooms = EXCLUDED.rooms,
                floor = EXCLUDED.floor,
                total_floors = EXCLUDED.total_floors,
                zone = COALESCE(EXCLUDED.zone, listings.zone),
                city = COALESCE(EXCLUDED.city, listings.city),
                condition = EXCLUDED.condition,
                features = EXCLUDED.features,
                parking_included = EXCLUDED.parking_included,
                parking_price_eur = EXCLUDED.parking_price_eur,
                verdict = EXCLUDED.verdict,
                confidence = EXCLUDED.confidence,
                fair_value_eur_per_m2 = EXCLUDED.fair_value_eur_per_m2,
                price_deviation_pct = EXCLUDED.price_deviation_pct,
                reasoning = EXCLUDED.reasoning,
                key_factors = EXCLUDED.key_factors,
                investment_score = EXCLUDED.investment_score,
                recommendation = EXCLUDED.recommendation,
                market_context = EXCLUDED.market_context,
                risk_factors = EXCLUDED.risk_factors,
                opportunity_factors = EXCLUDED.opportunity_factors,
                rental_estimate_eur = EXCLUDED.rental_estimate_eur,
                rental_yield_pct = EXCLUDED.rental_yield_pct,
                negotiation_margin_pct = EXCLUDED.negotiation_margin_pct,
                total_cost_eur = EXCLUDED.total_cost_eur,
                liquidity = EXCLUDED.liquidity,
                price_trend = EXCLUDED.price_trend,
                score_breakdown = EXCLUDED.score_breakdown,
                fair_price_eur = EXCLUDED.fair_price_eur,
                net_yield_pct = EXCLUDED.net_yield_pct,
                breakeven_years = EXCLUDED.breakeven_years,
                appreciation_pct_1y = EXCLUDED.appreciation_pct_1y,
                fair_value_low_eur_per_m2 = EXCLUDED.fair_value_low_eur_per_m2,
                fair_value_high_eur_per_m2 = EXCLUDED.fair_value_high_eur_per_m2,
                price_to_rent_ratio = EXCLUDED.price_to_rent_ratio,
                time_on_market_weeks = EXCLUDED.time_on_market_weeks,
                renovation_upside_pct = EXCLUDED.renovation_upside_pct,
                neighborhood_stage = EXCLUDED.neighborhood_stage
            RETURNING *
            """,
            (
                url, source, datetime.now(timezone.utc),
                listing.title, listing.price_eur, listing.size_m2, listing.price_per_m2,
                listing.rooms, listing.floor, listing.total_floors,
                listing.zone, listing.city, listing.condition,
                json.dumps(listing.features), listing.parking_included, listing.parking_price_eur,
                valuation.verdict, valuation.confidence, valuation.fair_value_eur_per_m2,
                valuation.price_deviation_pct, valuation.reasoning,
                json.dumps(valuation.key_factors),
                valuation.investment_score, valuation.recommendation, valuation.market_context,
                json.dumps(valuation.risk_factors), json.dumps(valuation.opportunity_factors),
                valuation.rental_estimate_eur, valuation.rental_yield_pct,
                valuation.negotiation_margin_pct, valuation.total_cost_eur,
                valuation.liquidity, valuation.price_trend,
                json.dumps(score_bd) if score_bd else None,
                valuation.fair_price_eur, valuation.net_yield_pct,
                valuation.breakeven_years, valuation.appreciation_pct_1y,
                valuation.fair_value_low_eur_per_m2, valuation.fair_value_high_eur_per_m2,
                valuation.price_to_rent_ratio, valuation.time_on_market_weeks,
                valuation.renovation_upside_pct, valuation.neighborhood_stage,
            ),
        )
        await conn.commit()
        return await cursor.fetchone()


async def record_price_snapshot(url: str, price_eur: int | None, price_per_m2: float | None):
    """Record a price snapshot. Unique on (url, price_eur) so only price changes create new rows."""
    if price_eur is None:
        return
    async with await get_conn() as conn:
        await conn.execute(
            """
            INSERT INTO price_snapshots (url, price_eur, price_per_m2)
            VALUES (%s, %s, %s)
            ON CONFLICT (url, price_eur) DO NOTHING
            """,
            (url, price_eur, price_per_m2),
        )
        await conn.commit()


async def get_price_history(url: str) -> list[dict]:
    """Get all price snapshots for a URL, ordered oldest-first."""
    async with await get_conn() as conn:
        cursor = await conn.execute(
            "SELECT price_eur, price_per_m2, scraped_at FROM price_snapshots WHERE url = %s ORDER BY scraped_at ASC",
            (url,),
        )
        return await cursor.fetchall()


async def record_rental_snapshot(
    url: str, city: str | None, zone: str | None, rooms: int | None,
    monthly_rent_eur: int, size_m2: float | None,
):
    """Record a rental listing snapshot."""
    rent_per_m2 = round(monthly_rent_eur / size_m2, 2) if size_m2 and size_m2 > 0 else None
    async with await get_conn() as conn:
        await conn.execute(
            """
            INSERT INTO rental_snapshots (url, city, zone, rooms, monthly_rent_eur, size_m2, rent_per_m2)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url, monthly_rent_eur) DO NOTHING
            """,
            (url, city, zone, rooms, monthly_rent_eur, size_m2, rent_per_m2),
        )
        await conn.commit()


async def get_recent_listings(limit: int = 20) -> list[dict]:
    async with await get_conn() as conn:
        cursor = await conn.execute(
            "SELECT * FROM listings ORDER BY analyzed_at DESC NULLS LAST LIMIT %s",
            (limit,),
        )
        return await cursor.fetchall()
