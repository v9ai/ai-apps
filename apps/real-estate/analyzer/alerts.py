"""Listing alert system — define search criteria, scan for matching new listings."""

import json
import psycopg
from psycopg.rows import dict_row
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException
from .config import settings


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class AlertCriteria(BaseModel):
    city: str
    zones: list[str] = Field(default_factory=list)
    min_rooms: int | None = None
    max_rooms: int | None = None
    max_price_eur: int | None = None
    min_size_m2: float | None = None
    max_price_per_m2: float | None = None


class SavedAlert(BaseModel):
    id: int
    label: str | None
    criteria: AlertCriteria
    created_at: str
    last_run_at: str | None
    is_active: bool
    matches_count: int = 0


class AlertMatch(BaseModel):
    id: int
    alert_id: int
    listing_url: str
    title: str | None = None
    price_eur: int | None = None
    size_m2: float | None = None
    price_per_m2: float | None = None
    rooms: int | None = None
    zone: str | None = None
    matched_at: str
    seen: bool = False


class CreateAlertRequest(BaseModel):
    label: str | None = None
    criteria: AlertCriteria


class AlertWithMatches(BaseModel):
    alert: SavedAlert
    matches: list[AlertMatch]


# ---------------------------------------------------------------------------
# SQL schemas
# ---------------------------------------------------------------------------

CREATE_SAVED_ALERTS = """
CREATE TABLE IF NOT EXISTS saved_alerts (
    id SERIAL PRIMARY KEY,
    label TEXT,
    criteria JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_run_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);
"""

CREATE_ALERT_MATCHES = """
CREATE TABLE IF NOT EXISTS alert_matches (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER REFERENCES saved_alerts(id) ON DELETE CASCADE,
    listing_url TEXT NOT NULL,
    title TEXT,
    price_eur INTEGER,
    size_m2 REAL,
    price_per_m2 REAL,
    rooms INTEGER,
    zone TEXT,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    seen BOOLEAN DEFAULT FALSE,
    UNIQUE (alert_id, listing_url)
);
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _conn(conn_str: str):
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


def _row_to_alert(row: dict) -> SavedAlert:
    criteria = row.get("criteria")
    if isinstance(criteria, str):
        criteria = json.loads(criteria)
    return SavedAlert(
        id=row["id"],
        label=row.get("label"),
        criteria=AlertCriteria(**criteria) if isinstance(criteria, dict) else AlertCriteria(city="unknown"),
        created_at=str(row["created_at"]),
        last_run_at=str(row["last_run_at"]) if row.get("last_run_at") else None,
        is_active=row.get("is_active", True),
        matches_count=row.get("matches_count", 0),
    )


def _row_to_match(row: dict) -> AlertMatch:
    return AlertMatch(
        id=row["id"],
        alert_id=row["alert_id"],
        listing_url=row["listing_url"],
        title=row.get("title"),
        price_eur=row.get("price_eur"),
        size_m2=row.get("size_m2"),
        price_per_m2=row.get("price_per_m2"),
        rooms=row.get("rooms"),
        zone=row.get("zone"),
        matched_at=str(row["matched_at"]),
        seen=row.get("seen", False),
    )


# ---------------------------------------------------------------------------
# Init
# ---------------------------------------------------------------------------

async def init_alert_tables(conn_str: str):
    """Create saved_alerts and alert_matches tables if they don't exist."""
    async with await _conn(conn_str) as conn:
        await conn.execute(CREATE_SAVED_ALERTS)
        await conn.execute(CREATE_ALERT_MATCHES)
        await conn.commit()


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

async def create_alert(req: CreateAlertRequest, conn_str: str) -> SavedAlert:
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            """INSERT INTO saved_alerts (label, criteria, created_at, is_active)
            VALUES (%s, %s, %s, TRUE) RETURNING *""",
            (req.label, json.dumps(req.criteria.model_dump()), datetime.now(timezone.utc)),
        )
        row = await cursor.fetchone()
        await conn.commit()
    # No matches yet, add count
    row["matches_count"] = 0
    return _row_to_alert(row)


async def list_alerts(conn_str: str) -> list[SavedAlert]:
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute("""
            SELECT sa.*, COALESCE(COUNT(am.id), 0) as matches_count
            FROM saved_alerts sa
            LEFT JOIN alert_matches am ON am.alert_id = sa.id
            GROUP BY sa.id ORDER BY sa.created_at DESC
        """)
        rows = await cursor.fetchall()
    return [_row_to_alert(r) for r in rows]


async def delete_alert(alert_id: int, conn_str: str) -> bool:
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            "DELETE FROM saved_alerts WHERE id = %s RETURNING id", (alert_id,)
        )
        row = await cursor.fetchone()
        await conn.commit()
    return row is not None


async def get_alert_matches(alert_id: int, conn_str: str) -> list[AlertMatch]:
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            "SELECT * FROM alert_matches WHERE alert_id = %s ORDER BY matched_at DESC",
            (alert_id,),
        )
        rows = await cursor.fetchall()
    return [_row_to_match(r) for r in rows]


async def run_alert_scan(alert_id: int, conn_str: str) -> list[AlertMatch]:
    """Run a single alert: fetch listings matching criteria, save new matches."""
    from .scraper_search import fetch_comparables

    async with await _conn(conn_str) as conn:
        cursor = await conn.execute("SELECT * FROM saved_alerts WHERE id = %s", (alert_id,))
        row = await cursor.fetchone()

    if not row:
        return []

    criteria_raw = row["criteria"]
    if isinstance(criteria_raw, str):
        criteria_raw = json.loads(criteria_raw)
    criteria = AlertCriteria(**criteria_raw)

    results = await fetch_comparables(
        city=criteria.city,
        zone=criteria.zones[0] if criteria.zones else None,
        rooms=criteria.min_rooms,
        size_m2=criteria.min_size_m2,
        listing_type="sale",
        max_results=20,
    )

    # Filter by criteria
    matches = []
    for item in results:
        if criteria.max_price_eur and item.get("price_eur") and item["price_eur"] > criteria.max_price_eur:
            continue
        if criteria.min_size_m2 and item.get("size_m2") and item["size_m2"] < criteria.min_size_m2:
            continue
        if criteria.max_price_per_m2 and item.get("price_per_m2") and item["price_per_m2"] > criteria.max_price_per_m2:
            continue
        if criteria.zones and item.get("zone") and item["zone"].lower() not in [z.lower() for z in criteria.zones]:
            continue
        matches.append(item)

    # Save matches
    new_matches = []
    async with await _conn(conn_str) as conn:
        for m in matches:
            url = m.get("url") or ""
            if not url:
                continue
            try:
                cursor = await conn.execute(
                    """INSERT INTO alert_matches (alert_id, listing_url, title, price_eur, size_m2, price_per_m2, rooms, zone)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (alert_id, listing_url) DO NOTHING
                    RETURNING *""",
                    (alert_id, url, m.get("title"), m.get("price_eur"), m.get("size_m2"),
                     m.get("price_per_m2"), m.get("rooms"), m.get("zone")),
                )
                match_row = await cursor.fetchone()
                if match_row:
                    new_matches.append(_row_to_match(match_row))
            except Exception:
                continue

        await conn.execute(
            "UPDATE saved_alerts SET last_run_at = %s WHERE id = %s",
            (datetime.now(timezone.utc), alert_id),
        )
        await conn.commit()

    return new_matches


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

alerts_router = APIRouter(prefix="/alerts", tags=["alerts"])


@alerts_router.post("", response_model=SavedAlert, status_code=201)
async def create_alert_endpoint(req: CreateAlertRequest):
    return await create_alert(req, settings.database_url)


@alerts_router.get("", response_model=list[SavedAlert])
async def list_alerts_endpoint():
    return await list_alerts(settings.database_url)


@alerts_router.delete("/{alert_id}")
async def delete_alert_endpoint(alert_id: int):
    ok = await delete_alert(alert_id, settings.database_url)
    if not ok:
        raise HTTPException(404, "Alert not found")
    return {"deleted": True}


@alerts_router.get("/{alert_id}/matches", response_model=list[AlertMatch])
async def get_matches_endpoint(alert_id: int):
    return await get_alert_matches(alert_id, settings.database_url)


@alerts_router.post("/{alert_id}/scan", response_model=list[AlertMatch])
async def scan_alert_endpoint(alert_id: int):
    return await run_alert_scan(alert_id, settings.database_url)
