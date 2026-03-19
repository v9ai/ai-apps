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

    -- Valuation
    verdict TEXT,
    confidence FLOAT,
    fair_value_eur_per_m2 INTEGER,
    price_deviation_pct FLOAT,
    reasoning TEXT,
    key_factors JSONB DEFAULT '[]'
);
"""


async def get_conn():
    return await psycopg.AsyncConnection.connect(settings.database_url, row_factory=dict_row)


async def init_db():
    async with await get_conn() as conn:
        await conn.execute(CREATE_TABLE)
        await conn.commit()


async def upsert_listing(
    url: str,
    source: str,
    listing: ListingExtraction,
    valuation: ValuationResult,
) -> dict:
    import json

    async with await get_conn() as conn:
        cursor = await conn.execute(
            """
            INSERT INTO listings (
                url, source, analyzed_at,
                title, price_eur, size_m2, price_per_m2, rooms, floor, total_floors, zone, city, condition, features,
                verdict, confidence, fair_value_eur_per_m2, price_deviation_pct, reasoning, key_factors
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (url) DO UPDATE SET
                analyzed_at = EXCLUDED.analyzed_at,
                title = EXCLUDED.title,
                price_eur = EXCLUDED.price_eur,
                size_m2 = EXCLUDED.size_m2,
                price_per_m2 = EXCLUDED.price_per_m2,
                verdict = EXCLUDED.verdict,
                confidence = EXCLUDED.confidence,
                fair_value_eur_per_m2 = EXCLUDED.fair_value_eur_per_m2,
                price_deviation_pct = EXCLUDED.price_deviation_pct,
                reasoning = EXCLUDED.reasoning,
                key_factors = EXCLUDED.key_factors
            RETURNING *
            """,
            (
                url,
                source,
                datetime.now(timezone.utc),
                listing.title,
                listing.price_eur,
                listing.size_m2,
                listing.price_per_m2,
                listing.rooms,
                listing.floor,
                listing.total_floors,
                listing.zone,
                listing.city,
                listing.condition,
                json.dumps(listing.features),
                valuation.verdict,
                valuation.confidence,
                valuation.fair_value_eur_per_m2,
                valuation.price_deviation_pct,
                valuation.reasoning,
                json.dumps(valuation.key_factors),
            ),
        )
        await conn.commit()
        return await cursor.fetchone()


async def get_recent_listings(limit: int = 20) -> list[dict]:
    async with await get_conn() as conn:
        cursor = await conn.execute(
            "SELECT * FROM listings ORDER BY analyzed_at DESC NULLS LAST LIMIT %s",
            (limit,),
        )
        return await cursor.fetchall()
