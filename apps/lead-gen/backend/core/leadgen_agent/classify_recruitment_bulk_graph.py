"""Bulk recruitment/staffing classifier as a single-node LangGraph.

Wraps the per-company ``classify_recruitment_graph.classify`` in a fan-out
loop bounded by ``asyncio.Semaphore``. Loads candidates from ``companies``
(either the unclassified subset or every row, controlled by ``include_all``),
classifies each, writes a CSV, and optionally applies high-confidence
verdicts back to ``companies.category``.

Invoke via ``langgraph dev`` :8002::

    curl -s -X POST http://127.0.0.1:8002/runs/wait \\
      -H 'content-type: application/json' \\
      -d '{"assistant_id":"classify_recruitment_bulk",
           "input":{"include_all":true,"limit":5,
                    "out_path":"classify_recruitment_all_sample.csv"}}'

State shape: ``ClassifyRecruitmentBulkState`` in ``state.py``.
"""

from __future__ import annotations

import asyncio
import csv
import json
import logging
import time
from pathlib import Path
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .classify_recruitment_graph import classify
from .deep_icp_graph import _dsn
from .state import ClassifyRecruitmentBulkState

log = logging.getLogger(__name__)

CONFIDENCE_THRESHOLD = 0.6
METHOD_TAG = "classify-recruitment-llm-v1"

_HAS_INPUT = """(
    (name IS NOT NULL AND name <> '')
    OR (website IS NOT NULL AND website <> '')
    OR (description IS NOT NULL AND description <> '')
)"""

SELECT_SQL_UNCLASSIFIED = f"""
SELECT id, key, name, website, description
FROM companies
WHERE (category IS NULL OR category = '' OR category = 'UNKNOWN')
  AND {_HAS_INPUT}
ORDER BY id
"""

SELECT_SQL_ALL = f"""
SELECT id, key, name, website, description
FROM companies
WHERE {_HAS_INPUT}
ORDER BY id
"""

UPDATE_SQL = (
    "UPDATE companies SET category = %s, score = %s, score_reasons = %s, "
    "updated_at = now()::text WHERE id = %s"
)


async def classify_all(state: ClassifyRecruitmentBulkState) -> dict[str, Any]:
    include_all = bool(state.get("include_all"))
    raw_limit = state.get("limit")
    limit = int(raw_limit) if raw_limit not in (None, 0) else None
    concurrency = int(state.get("concurrency") or 8)
    out_path_str = state.get("out_path") or (
        "classify_recruitment_all.csv" if include_all else "classify_recruitment_results.csv"
    )
    apply_writes = bool(state.get("apply"))

    sql = SELECT_SQL_ALL if include_all else SELECT_SQL_UNCLASSIFIED
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
        "loaded %d companies (mode=%s)",
        len(rows),
        "all" if include_all else "unclassified",
    )

    out_path = Path(out_path_str)
    if not out_path.is_absolute():
        out_path = Path.cwd() / out_path

    if not rows:
        return {
            "count": 0,
            "is_recruitment_count": 0,
            "high_confidence_count": 0,
            "csv_path": str(out_path),
            "applied": 0,
        }

    sem = asyncio.Semaphore(concurrency)
    t0 = time.perf_counter()

    async def _classify_one(row: dict[str, Any]) -> dict[str, Any]:
        async with sem:
            verdict = await classify(
                {
                    "name": row.get("name") or "",
                    "website": row.get("website") or "",
                    "description": row.get("description") or "",
                }
            )
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
                "%d/%d hits=%d elapsed=%.1fs",
                done,
                len(rows),
                sum(1 for r in results if r.get("is_recruitment")),
                time.perf_counter() - t0,
            )

    results.sort(key=lambda r: r["id"])

    def _write_csv() -> None:
        with out_path.open("w", newline="") as fh:
            writer = csv.writer(fh)
            writer.writerow(
                ["id", "key", "name", "website", "is_recruitment", "confidence", "reasons"]
            )
            for r in results:
                writer.writerow(
                    [
                        r["id"],
                        r.get("key") or "",
                        r.get("name") or "",
                        r.get("website") or "",
                        bool(r.get("is_recruitment")),
                        float(r.get("confidence") or 0.0),
                        " | ".join(r.get("reasons") or []),
                    ]
                )

    await asyncio.to_thread(_write_csv)

    hits = [r for r in results if r.get("is_recruitment")]
    high_conf = [r for r in hits if float(r.get("confidence") or 0.0) >= CONFIDENCE_THRESHOLD]
    log.info(
        "verdicts: total=%d recruitment=%d high_conf(>=%.2f)=%d csv=%s",
        len(results),
        len(hits),
        CONFIDENCE_THRESHOLD,
        len(high_conf),
        out_path,
    )

    applied = 0
    if apply_writes and high_conf:

        def _apply() -> int:
            n = 0
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    for r in high_conf:
                        reasons = {
                            "method": METHOD_TAG,
                            "is_recruitment": True,
                            "confidence": float(r["confidence"]),
                            "reasons": r.get("reasons") or [],
                        }
                        cur.execute(
                            UPDATE_SQL,
                            (
                                "STAFFING",
                                float(r["confidence"]),
                                json.dumps(reasons),
                                int(r["id"]),
                            ),
                        )
                        n += 1
            return n

        applied = await asyncio.to_thread(_apply)
        log.info("applied %d STAFFING updates", applied)

    return {
        "count": len(results),
        "is_recruitment_count": len(hits),
        "high_confidence_count": len(high_conf),
        "csv_path": str(out_path),
        "applied": applied,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ClassifyRecruitmentBulkState)
    builder.add_node("classify_all", classify_all)
    builder.add_edge(START, "classify_all")
    builder.add_edge("classify_all", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
