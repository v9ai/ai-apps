"""Bulk deep-scrape every company under the sales-tech tab.

Pulls every company whose ``service_taxonomy`` JSON contains
``Sales Engagement Platform`` or ``Lead Generation Software`` (the same
filter ``src/components/companies-list.tsx`` uses for ``?tab=sales-tech``)
and invokes ``deep_scrape_graph`` in-process under a semaphore. The graph
shells out to ``consultancies/scrape_crawl4ai.py``, which UPDATEs the
``companies`` row and INSERTs into ``company_facts`` + ``company_snapshots``
itself — this driver only orchestrates and writes a CSV verdict.

In-process invocation (not HTTP) sidesteps the ``langgraph dev``
single-worker queue (see memory ``feedback_leadgen_langgraph_fanout``).

Usage (from backend/):
    uv run python scripts/bulk_deep_scrape_sales_tech.py [--limit N] \\
        [--concurrency 1] [--pages 15] [--depth 2] \\
        [--provider anthropic/claude-sonnet-4-6] [--dry-run] \\
        [--out bulk_deep_scrape_sales_tech.csv]
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

from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402
from leadgen_agent.deep_scrape_graph import graph  # noqa: E402

log = logging.getLogger("bulk_deep_scrape_sales_tech")

SELECT_SQL = """
SELECT id, key, name, canonical_domain, website
FROM companies
WHERE service_taxonomy IS NOT NULL
  AND service_taxonomy <> ''
  AND service_taxonomy::jsonb ?| array['Sales Engagement Platform','Lead Generation Software']
  AND COALESCE(canonical_domain, website, '') <> ''
ORDER BY id
"""


async def run_one(
    row: dict[str, Any],
    sem: asyncio.Semaphore,
    pages: int,
    depth: int,
    provider: str,
    dry_run: bool,
) -> dict[str, Any]:
    async with sem:
        t0 = time.perf_counter()
        try:
            final = await graph.ainvoke(
                {
                    "company_id": int(row["id"]),
                    "max_pages": pages,
                    "max_depth": depth,
                    "provider": provider,
                    "dry_run": dry_run,
                }
            )
            err = final.get("_error") or ""
            enrichment = final.get("enrichment") or {}
            emails = final.get("emails") or []
            return {
                **row,
                "pages_crawled": final.get("pages_crawled", 0),
                "emails_n": len(emails),
                "has_careers": bool(final.get("has_careers")),
                "has_pricing": bool(final.get("has_pricing")),
                "category": enrichment.get("category") or "",
                "ai_tier": enrichment.get("ai_tier"),
                "score": final.get("score"),
                "error": err,
                "elapsed": round(time.perf_counter() - t0, 2),
            }
        except Exception as exc:  # noqa: BLE001
            return {
                **row,
                "pages_crawled": 0,
                "emails_n": 0,
                "has_careers": False,
                "has_pricing": False,
                "category": "",
                "ai_tier": None,
                "score": None,
                "error": f"{type(exc).__name__}: {str(exc)[:200]}",
                "elapsed": round(time.perf_counter() - t0, 2),
            }


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument(
        "--concurrency",
        type=int,
        default=1,
        help="Max parallel deep scrapes. Each spawns Playwright; keep low (1-2).",
    )
    parser.add_argument("--pages", type=int, default=15, help="Max pages per company (default 15)")
    parser.add_argument("--depth", type=int, default=2, help="Max crawl depth (default 2)")
    parser.add_argument(
        "--provider",
        default="anthropic/claude-sonnet-4-6",
        help="LLM provider for enrichment extraction (default: anthropic/claude-sonnet-4-6)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Skip Neon writes")
    parser.add_argument("--out", default="bulk_deep_scrape_sales_tech.csv")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    if args.concurrency > 2:
        log.warning(
            "concurrency=%d is high for Playwright subprocesses; clamping to 2",
            args.concurrency,
        )
        args.concurrency = 2

    sql = SELECT_SQL
    if args.limit:
        sql = sql + f" LIMIT {int(args.limit)}"

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cols = [d[0] for d in cur.description or []]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]

    log.info("eligible sales-tech companies: %d", len(rows))
    if not rows:
        return 0

    sem = asyncio.Semaphore(args.concurrency)
    t0 = time.perf_counter()
    counts: Counter[str] = Counter()
    errors = 0
    results: list[dict[str, Any]] = []

    tasks = [
        run_one(r, sem, args.pages, args.depth, args.provider, args.dry_run) for r in rows
    ]
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
        log.info(
            "%d/%d  id=%s  %s  pages=%s emails=%s err=%s elapsed=%.1fs",
            done,
            len(rows),
            res.get("id"),
            res.get("category") or "—",
            res.get("pages_crawled"),
            res.get("emails_n"),
            (res.get("error") or "")[:60],
            res.get("elapsed") or 0.0,
        )

    results.sort(key=lambda r: r["id"])

    out_path = Path(args.out)
    with out_path.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            [
                "id",
                "key",
                "name",
                "canonical_domain",
                "website",
                "pages_crawled",
                "emails_n",
                "has_careers",
                "has_pricing",
                "category",
                "ai_tier",
                "score",
                "error",
                "elapsed_s",
            ]
        )
        for r in results:
            writer.writerow(
                [
                    r["id"],
                    r.get("key") or "",
                    r.get("name") or "",
                    r.get("canonical_domain") or "",
                    r.get("website") or "",
                    r.get("pages_crawled") if r.get("pages_crawled") is not None else "",
                    r.get("emails_n") if r.get("emails_n") is not None else "",
                    "Y" if r.get("has_careers") else "",
                    "Y" if r.get("has_pricing") else "",
                    r.get("category") or "",
                    r.get("ai_tier") if r.get("ai_tier") is not None else "",
                    r.get("score") if r.get("score") is not None else "",
                    r.get("error") or "",
                    r.get("elapsed") if r.get("elapsed") is not None else "",
                ]
            )

    log.info(
        "done. %d rows. distribution=%s errors=%d elapsed=%.1fs csv=%s",
        len(results),
        dict(counts),
        errors,
        time.perf_counter() - t0,
        out_path,
    )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
