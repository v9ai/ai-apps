"""Bulk country classifier as a single-node LangGraph.

Loads ``companies`` rows where ``country IS NULL AND location <> ''`` (by
default scoped to sales-tech taxonomy: Sales Engagement Platform, Lead
Generation Software, CRM Software), fans out
``country_classify_graph.classify`` under an ``asyncio.Semaphore``, and —
when ``apply=True`` — UPDATEs ``companies.country`` with high-confidence
verdicts.

Invoke in-process from ``scripts/backfill_company_country.py`` or via cron
in ``_cron.py``. Don't fan out HTTP /runs/wait calls (single-worker queue —
see memory ``feedback_leadgen_langgraph_fanout``).

State shape: ``ClassifyCountryBulkState`` in ``state.py``.
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .country_classify_graph import classify
from .state import ClassifyCountryBulkState

log = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.6

SELECT_SQL = """
SELECT id, name, location
FROM companies
WHERE country IS NULL
  AND location IS NOT NULL
  AND location <> ''
"""

SALES_TECH_FILTER = (
    " AND service_taxonomy IS NOT NULL"
    " AND service_taxonomy::text ~ "
    "'Sales Engagement Platform|Lead Generation Software|CRM Software'"
)

ORDER_AND_LIMIT = " ORDER BY id"

UPDATE_SQL = (
    "UPDATE companies SET country = %s, updated_at = now()::text WHERE id = %s"
)


def _dsn() -> str:
    return (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )


async def classify_all(state: ClassifyCountryBulkState) -> dict[str, Any]:
    raw_limit = state.get("limit")
    limit = int(raw_limit) if raw_limit not in (None, 0) else None
    concurrency = int(state.get("concurrency") or 8)
    apply_writes = bool(state.get("apply"))
    only_sales_tech = state.get("only_sales_tech")
    if only_sales_tech is None:
        only_sales_tech = True
    only_sales_tech = bool(only_sales_tech)

    sql = SELECT_SQL + (SALES_TECH_FILTER if only_sales_tech else "") + ORDER_AND_LIMIT
    if limit:
        sql = sql + f" LIMIT {limit}"

    def _load_rows() -> list[dict[str, Any]]:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                cols = [d[0] for d in cur.description or []]
                return [dict(zip(cols, r)) for r in cur.fetchall()]

    rows = await asyncio.to_thread(_load_rows)
    log.info(
        "loaded %d candidates (only_sales_tech=%s)",
        len(rows),
        only_sales_tech,
    )

    if not rows:
        return {"count": 0, "classified_count": 0, "applied": 0}

    sem = asyncio.Semaphore(concurrency)
    t0 = time.perf_counter()

    async def _classify_one(row: dict[str, Any]) -> dict[str, Any]:
        async with sem:
            verdict = await classify({"location": row.get("location") or ""})
        return {**row, **verdict}

    tasks = [_classify_one(r) for r in rows]
    results: list[dict[str, Any]] = []
    done = 0
    for fut in asyncio.as_completed(tasks):
        res = await fut
        results.append(res)
        done += 1
        if done % 25 == 0 or done == len(rows):
            log.info(
                "%d/%d classified=%d elapsed=%.1fs",
                done,
                len(rows),
                sum(1 for r in results if r.get("country")),
                time.perf_counter() - t0,
            )

    classified = [
        r for r in results
        if r.get("country") and float(r.get("confidence") or 0.0) >= CONFIDENCE_THRESHOLD
    ]

    log.info(
        "verdicts: total=%d classified(>=%.2f)=%d",
        len(results),
        CONFIDENCE_THRESHOLD,
        len(classified),
    )

    applied = 0
    if apply_writes and classified:
        def _apply() -> int:
            n = 0
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    for r in classified:
                        cur.execute(UPDATE_SQL, (r["country"], int(r["id"])))
                        n += 1
            return n

        applied = await asyncio.to_thread(_apply)
        log.info("applied %d country updates", applied)

    return {
        "count": len(results),
        "classified_count": len(classified),
        "applied": applied,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ClassifyCountryBulkState)
    builder.add_node("classify_all", classify_all)
    builder.add_edge(START, "classify_all")
    builder.add_edge("classify_all", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
