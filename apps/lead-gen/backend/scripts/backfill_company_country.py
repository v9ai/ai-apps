"""Backfill ``companies.country`` via the country_classify_bulk LangGraph.

Default scope: rows where ``country IS NULL AND location <> ''`` and the
service taxonomy includes a sales-tech taxonomy (Sales Engagement Platform,
Lead Generation Software, CRM Software). Pass ``--all`` to relax the
taxonomy filter and classify every row with a non-empty location.

In-process invocation (not HTTP) sidesteps the langgraph dev single-worker
queue (memory ``feedback_leadgen_langgraph_fanout``).

Usage (from backend/):
    python scripts/backfill_company_country.py            # dry-run, sales-tech only
    python scripts/backfill_company_country.py --apply    # write country to DB
    python scripts/backfill_company_country.py --limit 50 # smaller pass
    python scripts/backfill_company_country.py --all      # relax taxonomy filter
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
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

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from leadgen_agent.country_classify_bulk_graph import graph  # noqa: E402

log = logging.getLogger("backfill_company_country")


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="cap rows for testing")
    parser.add_argument("--concurrency", type=int, default=8)
    parser.add_argument("--apply", action="store_true", help="write country to DB")
    parser.add_argument(
        "--all",
        action="store_true",
        help="classify every NULL-country row, not just sales-tech taxonomies",
    )
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    state: dict[str, Any] = {
        "concurrency": int(args.concurrency),
        "apply": bool(args.apply),
        "only_sales_tech": not bool(args.all),
    }
    if args.limit:
        state["limit"] = int(args.limit)

    final = await graph.ainvoke(state)

    log.info(
        "verdicts: total=%d classified=%d applied=%d",
        final.get("count", 0),
        final.get("classified_count", 0),
        final.get("applied", 0),
    )
    if not args.apply:
        log.info("dry-run: no DB writes. re-run with --apply to persist.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
