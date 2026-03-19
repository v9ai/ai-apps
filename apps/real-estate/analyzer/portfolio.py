"""Portfolio / watchlist management — track listings over time and generate alerts."""

import psycopg
from psycopg.rows import dict_row
from datetime import datetime, timezone
from urllib.parse import unquote

from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from .config import settings


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class WatchlistItem(BaseModel):
    id: int
    url: str
    label: str | None
    city: str | None
    zone: str | None
    rooms: int | None
    price_eur: int | None
    price_per_m2: float | None
    investment_score: int | None
    deviation_pct: float | None
    verdict: str | None
    added_at: str
    last_checked: str | None
    alert_threshold_pct: float


class WatchlistAlert(BaseModel):
    id: int
    alert_type: str
    message: str
    old_value: float | None
    new_value: float | None
    created_at: str
    seen: bool


class AddToWatchlistRequest(BaseModel):
    url: str
    label: str | None = None
    alert_threshold_pct: float = -15.0


class MarkAlertsSeenRequest(BaseModel):
    alert_ids: list[int]


# ---------------------------------------------------------------------------
# SQL schemas
# ---------------------------------------------------------------------------

CREATE_WATCHLIST = """
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    label TEXT,
    city TEXT,
    zone TEXT,
    rooms INTEGER,
    price_eur INTEGER,
    price_per_m2 REAL,
    investment_score INTEGER,
    deviation_pct REAL,
    verdict TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    last_checked TIMESTAMPTZ,
    alert_threshold_pct REAL DEFAULT -15.0
);
"""

CREATE_WATCHLIST_ALERTS = """
CREATE TABLE IF NOT EXISTS watchlist_alerts (
    id SERIAL PRIMARY KEY,
    watchlist_id INTEGER REFERENCES watchlist(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    old_value REAL,
    new_value REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    seen BOOLEAN DEFAULT FALSE
);
"""


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _conn(conn_str: str):
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


def _row_to_item(row: dict) -> WatchlistItem:
    return WatchlistItem(
        id=row["id"],
        url=row["url"],
        label=row.get("label"),
        city=row.get("city"),
        zone=row.get("zone"),
        rooms=row.get("rooms"),
        price_eur=row.get("price_eur"),
        price_per_m2=row.get("price_per_m2"),
        investment_score=int(row["investment_score"]) if row.get("investment_score") is not None else None,
        deviation_pct=row.get("deviation_pct"),
        verdict=row.get("verdict"),
        added_at=str(row["added_at"]),
        last_checked=str(row["last_checked"]) if row.get("last_checked") else None,
        alert_threshold_pct=row.get("alert_threshold_pct", -15.0),
    )


def _row_to_alert(row: dict) -> WatchlistAlert:
    return WatchlistAlert(
        id=row["id"],
        alert_type=row["alert_type"],
        message=row["message"],
        old_value=row.get("old_value"),
        new_value=row.get("new_value"),
        created_at=str(row["created_at"]),
        seen=row.get("seen", False),
    )


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

async def init_watchlist_tables(conn_str: str):
    """Create watchlist and watchlist_alerts tables if they don't exist."""
    async with await _conn(conn_str) as conn:
        await conn.execute(CREATE_WATCHLIST)
        await conn.execute(CREATE_WATCHLIST_ALERTS)
        await conn.commit()


async def add_to_watchlist(req: AddToWatchlistRequest, conn_str: str) -> WatchlistItem:
    """Add a URL to the watchlist, auto-filling fields from the listings table if available."""
    async with await _conn(conn_str) as conn:
        # Try to pull existing analysis data from listings
        listing_cursor = await conn.execute(
            """
            SELECT city, zone, rooms, price_eur, price_per_m2,
                   investment_score, price_deviation_pct, verdict
            FROM listings WHERE url = %s
            """,
            (req.url,),
        )
        listing = await listing_cursor.fetchone()

        city = listing["city"] if listing else None
        zone = listing["zone"] if listing else None
        rooms = listing["rooms"] if listing else None
        price_eur = listing["price_eur"] if listing else None
        price_per_m2 = listing["price_per_m2"] if listing else None
        investment_score = (
            int(listing["investment_score"])
            if listing and listing.get("investment_score") is not None
            else None
        )
        deviation_pct = listing["price_deviation_pct"] if listing else None
        verdict = listing["verdict"] if listing else None

        cursor = await conn.execute(
            """
            INSERT INTO watchlist (
                url, label, city, zone, rooms, price_eur, price_per_m2,
                investment_score, deviation_pct, verdict, alert_threshold_pct
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url) DO UPDATE SET
                label = COALESCE(EXCLUDED.label, watchlist.label),
                alert_threshold_pct = EXCLUDED.alert_threshold_pct
            RETURNING *
            """,
            (
                req.url, req.label, city, zone, rooms, price_eur, price_per_m2,
                investment_score, deviation_pct, verdict, req.alert_threshold_pct,
            ),
        )
        row = await cursor.fetchone()
        await conn.commit()
        return _row_to_item(row)


async def remove_from_watchlist(url: str, conn_str: str) -> bool:
    """Remove a URL from the watchlist. Returns True if a row was deleted."""
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            "DELETE FROM watchlist WHERE url = %s RETURNING id",
            (url,),
        )
        row = await cursor.fetchone()
        await conn.commit()
        return row is not None


async def get_watchlist(conn_str: str) -> list[WatchlistItem]:
    """Return the full watchlist ordered by most-recently added first."""
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            "SELECT * FROM watchlist ORDER BY added_at DESC"
        )
        rows = await cursor.fetchall()
        return [_row_to_item(r) for r in rows]


async def check_watchlist_updates(conn_str: str) -> list[WatchlistAlert]:
    """Re-check each watchlist item against current listings data and generate alerts."""
    now = datetime.now(timezone.utc)
    alerts: list[WatchlistAlert] = []

    async with await _conn(conn_str) as conn:
        # Fetch all watchlist items
        cursor = await conn.execute("SELECT * FROM watchlist")
        items = await cursor.fetchall()

        for item in items:
            # Get latest analysis from listings
            lcur = await conn.execute(
                """
                SELECT price_eur, price_per_m2, price_deviation_pct, verdict, investment_score
                FROM listings WHERE url = %s
                """,
                (item["url"],),
            )
            listing = await lcur.fetchone()
            if not listing:
                continue

            new_alerts: list[tuple[str, str, float | None, float | None]] = []

            # Check for price changes
            old_price = item.get("price_eur")
            new_price = listing.get("price_eur")
            if old_price and new_price and old_price != new_price:
                pct_change = (new_price - old_price) / old_price * 100
                if pct_change < -2:
                    new_alerts.append((
                        "price_drop",
                        f"Price dropped {pct_change:+.1f}% ({old_price} -> {new_price} EUR)",
                        float(old_price),
                        float(new_price),
                    ))
                elif pct_change > 2:
                    new_alerts.append((
                        "price_increase",
                        f"Price increased {pct_change:+.1f}% ({old_price} -> {new_price} EUR)",
                        float(old_price),
                        float(new_price),
                    ))

            # Check deviation vs threshold
            new_deviation = listing.get("price_deviation_pct")
            old_deviation = item.get("deviation_pct")
            threshold = item.get("alert_threshold_pct", -15.0)
            if (
                new_deviation is not None
                and threshold is not None
                and new_deviation <= threshold
                and (old_deviation is None or old_deviation > threshold)
            ):
                new_alerts.append((
                    "now_undervalued",
                    f"Deviation hit {new_deviation:+.1f}% (threshold {threshold:+.1f}%)",
                    float(old_deviation) if old_deviation is not None else None,
                    float(new_deviation),
                ))

            # Persist alerts
            for alert_type, message, old_val, new_val in new_alerts:
                acur = await conn.execute(
                    """
                    INSERT INTO watchlist_alerts (watchlist_id, alert_type, message, old_value, new_value)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (item["id"], alert_type, message, old_val, new_val),
                )
                alert_row = await acur.fetchone()
                alerts.append(_row_to_alert(alert_row))

            # Update watchlist item with latest data
            await conn.execute(
                """
                UPDATE watchlist SET
                    price_eur = %s,
                    price_per_m2 = %s,
                    deviation_pct = %s,
                    verdict = %s,
                    investment_score = %s,
                    last_checked = %s
                WHERE id = %s
                """,
                (
                    new_price,
                    listing.get("price_per_m2"),
                    new_deviation,
                    listing.get("verdict"),
                    int(listing["investment_score"]) if listing.get("investment_score") is not None else None,
                    now,
                    item["id"],
                ),
            )

        await conn.commit()

    return alerts


async def get_unseen_alerts(conn_str: str) -> list[WatchlistAlert]:
    """Return all unseen alerts, newest first."""
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            """
            SELECT wa.* FROM watchlist_alerts wa
            JOIN watchlist w ON wa.watchlist_id = w.id
            WHERE wa.seen = FALSE
            ORDER BY wa.created_at DESC
            """
        )
        rows = await cursor.fetchall()
        return [_row_to_alert(r) for r in rows]


async def mark_alerts_seen(alert_ids: list[int], conn_str: str):
    """Mark the given alert IDs as seen."""
    if not alert_ids:
        return
    async with await _conn(conn_str) as conn:
        # psycopg supports tuple-in for ANY()
        await conn.execute(
            "UPDATE watchlist_alerts SET seen = TRUE WHERE id = ANY(%s)",
            (alert_ids,),
        )
        await conn.commit()


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

portfolio_router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@portfolio_router.get("", response_model=list[WatchlistItem])
async def list_watchlist():
    return await get_watchlist(settings.database_url)


@portfolio_router.post("", response_model=WatchlistItem, status_code=201)
async def add_watchlist_item(req: AddToWatchlistRequest):
    try:
        return await add_to_watchlist(req, settings.database_url)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


@portfolio_router.delete("/{url:path}")
async def delete_watchlist_item(url: str):
    decoded = unquote(url)
    removed = await remove_from_watchlist(decoded, settings.database_url)
    if not removed:
        raise HTTPException(status_code=404, detail="URL not found in watchlist")
    return {"removed": True}


@portfolio_router.get("/alerts", response_model=list[WatchlistAlert])
async def list_alerts():
    return await get_unseen_alerts(settings.database_url)


@portfolio_router.post("/alerts/seen")
async def seen_alerts(req: MarkAlertsSeenRequest):
    await mark_alerts_seen(req.alert_ids, settings.database_url)
    return {"marked": len(req.alert_ids)}
