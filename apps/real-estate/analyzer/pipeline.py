"""Investment pipeline -- track listings through acquisition stages."""

import psycopg
from psycopg.rows import dict_row
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException
from urllib.parse import unquote

from .config import settings

PIPELINE_STAGES = ["discovered", "analyzed", "shortlisted", "viewing", "offer", "closed", "rejected"]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class PipelineUpdate(BaseModel):
    stage: str


class NotesUpdate(BaseModel):
    notes: str


class PipelineItem(BaseModel):
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
    pipeline_stage: str
    notes: str | None
    target_price_eur: int | None
    tags: list[str]


class PipelineView(BaseModel):
    stages: dict[str, list[PipelineItem]]
    total: int
    by_stage: dict[str, int]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _conn(conn_str: str):
    return await psycopg.AsyncConnection.connect(conn_str, row_factory=dict_row)


def _row_to_item(row: dict) -> PipelineItem:
    return PipelineItem(
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
        pipeline_stage=row.get("pipeline_stage") or "discovered",
        notes=row.get("notes"),
        target_price_eur=row.get("target_price_eur"),
        tags=row.get("tags") or [],
    )


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

async def get_pipeline(conn_str: str) -> PipelineView:
    """Return all watchlist items grouped by pipeline stage."""
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            "SELECT * FROM watchlist ORDER BY added_at DESC"
        )
        rows = await cursor.fetchall()

    stages: dict[str, list[PipelineItem]] = {s: [] for s in PIPELINE_STAGES}
    for row in rows:
        stage = row.get("pipeline_stage") or "discovered"
        if stage not in stages:
            stage = "discovered"
        stages[stage].append(_row_to_item(row))

    by_stage = {s: len(items) for s, items in stages.items()}
    total = sum(by_stage.values())
    return PipelineView(stages=stages, total=total, by_stage=by_stage)


async def update_stage(url: str, stage: str, conn_str: str) -> bool:
    if stage not in PIPELINE_STAGES:
        raise ValueError(f"Invalid stage: {stage}")
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            "UPDATE watchlist SET pipeline_stage = %s WHERE url = %s RETURNING id",
            (stage, url),
        )
        row = await cursor.fetchone()
        await conn.commit()
        return row is not None


async def update_notes(url: str, notes: str, conn_str: str) -> bool:
    async with await _conn(conn_str) as conn:
        cursor = await conn.execute(
            "UPDATE watchlist SET notes = %s WHERE url = %s RETURNING id",
            (notes, url),
        )
        row = await cursor.fetchone()
        await conn.commit()
        return row is not None


# ---------------------------------------------------------------------------
# FastAPI router
# ---------------------------------------------------------------------------

pipeline_router = APIRouter(prefix="/portfolio", tags=["pipeline"])


@pipeline_router.get("/pipeline", response_model=PipelineView)
async def get_pipeline_view():
    return await get_pipeline(settings.database_url)


@pipeline_router.patch("/{url:path}/stage")
async def patch_stage(url: str, body: PipelineUpdate):
    decoded = unquote(url)
    if body.stage not in PIPELINE_STAGES:
        raise HTTPException(400, f"Invalid stage. Must be one of: {', '.join(PIPELINE_STAGES)}")
    ok = await update_stage(decoded, body.stage, settings.database_url)
    if not ok:
        raise HTTPException(404, "URL not in watchlist")
    return {"updated": True}


@pipeline_router.patch("/{url:path}/notes")
async def patch_notes(url: str, body: NotesUpdate):
    decoded = unquote(url)
    ok = await update_notes(decoded, body.notes, settings.database_url)
    if not ok:
        raise HTTPException(404, "URL not in watchlist")
    return {"updated": True}
