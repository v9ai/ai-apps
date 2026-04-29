"""Bulk-sweep UNKNOWN companies through ``company_enrichment_graph``.

Pulls every company with ``category IN ('','UNKNOWN')`` AND a non-empty
``canonical_domain``, invokes the compiled graph in-process under a
semaphore, and writes a CSV of verdicts. The graph itself persists to
``companies`` / ``company_facts`` / ``company_product_signals`` and the
profile embedding — this driver does no DB writes of its own.

In-process invocation (not HTTP) sidesteps the ``langgraph dev`` single-worker
queue (see memory ``feedback_leadgen_langgraph_fanout``).

Usage (from backend/):
    python scripts/classify_unknown_companies.py [--limit N] [--concurrency 4]
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import logging
import os
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parents[2]
_env_local = _ROOT / ".env.local"
_env_backend = Path(__file__).resolve().parents[1] / ".env"

for _envfile in (_env_backend, _env_local):
    if _envfile.exists():
        for line in _envfile.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v

import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from leadgen_agent.company_enrichment_graph import graph  # noqa: E402
from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402

log = logging.getLogger("classify_unknown_companies")

SELECT_SQL = """
SELECT id, key, name, canonical_domain
FROM companies
WHERE UPPER(COALESCE(category, '')) IN ('', 'UNKNOWN')
  AND canonical_domain IS NOT NULL
  AND canonical_domain <> ''
ORDER BY id
"""


async def run_one(row: dict[str, Any], sem: asyncio.Semaphore) -> dict[str, Any]:
    async with sem:
        t0 = time.perf_counter()
        try:
            final = await graph.ainvoke(
                {"company_id": int(row["id"]), "force_refresh": True}
            )
            err = final.get("_error") or ""
            classification = final.get("classification") or {}
            return {
                **row,
                "category": classification.get("category") or "",
                "ai_tier": classification.get("ai_tier"),
                "confidence": classification.get("confidence"),
                "reason": classification.get("reason") or "",
                "error": err,
                "elapsed": round(time.perf_counter() - t0, 2),
            }
        except Exception as exc:  # noqa: BLE001
            return {
                **row,
                "category": "",
                "ai_tier": None,
                "confidence": None,
                "reason": "",
                "error": f"{type(exc).__name__}: {str(exc)[:200]}",
                "elapsed": round(time.perf_counter() - t0, 2),
            }


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--out", default="classify_unknown_results.csv")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    sql = SELECT_SQL
    if args.limit:
        sql = sql + f" LIMIT {int(args.limit)}"

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cols = [d[0] for d in cur.description or []]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    log.info("eligible companies: %d", len(rows))
    if not rows:
        return 0

    sem = asyncio.Semaphore(args.concurrency)
    t0 = time.perf_counter()
    counts: Counter[str] = Counter()
    errors = 0
    results: list[dict[str, Any]] = []

    tasks = [run_one(r, sem) for r in rows]
    done = 0
    for fut in asyncio.as_completed(tasks):
        res = await fut
        results.append(res)
        done += 1
        if res.get("error"):
            errors += 1
            counts["ERROR"] += 1
        else:
            counts[res.get("category") or "EMPTY"] += 1
        if done % 25 == 0 or done == len(rows):
            log.info(
                "%d/%d  %s  errors=%d  elapsed=%.1fs",
                done,
                len(rows),
                dict(counts),
                errors,
                time.perf_counter() - t0,
            )

    results.sort(key=lambda r: r["id"])

    out_path = Path(args.out)
    with out_path.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            ["id", "key", "name", "canonical_domain", "category", "ai_tier",
             "confidence", "reason", "error", "elapsed_s"]
        )
        for r in results:
            writer.writerow([
                r["id"],
                r.get("key") or "",
                r.get("name") or "",
                r.get("canonical_domain") or "",
                r.get("category") or "",
                r.get("ai_tier") if r.get("ai_tier") is not None else "",
                r.get("confidence") if r.get("confidence") is not None else "",
                r.get("reason") or "",
                r.get("error") or "",
                r.get("elapsed") if r.get("elapsed") is not None else "",
            ])

    log.info(
        "done. %d rows. distribution=%s errors=%d csv=%s",
        len(results),
        dict(counts),
        errors,
        out_path,
    )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
