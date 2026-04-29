"""Bulk-classify companies for recruitment/staffing via the LangGraph bulk graph.

Thin CLI wrapper over ``classify_recruitment_bulk_graph.graph`` (registered in
``core/langgraph.json`` as ``classify_recruitment_bulk``). The graph itself
loads candidates, fan-outs ``classify(...)`` under an ``asyncio.Semaphore``,
writes the CSV, and — when ``--apply`` is set — UPDATEs
``companies.category='STAFFING'`` for verdicts with ``confidence >= 0.6``.

In-process invocation (not HTTP) sidesteps the ``langgraph dev`` single-worker
queue (see memory ``feedback_leadgen_langgraph_fanout``).

Usage (from backend/):
    python scripts/classify_recruitment_companies.py             # dry-run
    python scripts/classify_recruitment_companies.py --apply     # write
    python scripts/classify_recruitment_companies.py --limit 50  # smaller pass
    python scripts/classify_recruitment_companies.py --include-all  # every row, not just NULL/UNKNOWN
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

from leadgen_agent.classify_recruitment_bulk_graph import graph  # noqa: E402

log = logging.getLogger("classify_recruitment_companies")


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="cap rows for testing")
    parser.add_argument("--concurrency", type=int, default=8)
    parser.add_argument("--apply", action="store_true", help="write verdicts to DB")
    parser.add_argument("--include-all", action="store_true",
                        help="classify every row, not just unclassified")
    parser.add_argument("--out", default=None,
                        help="CSV output path (defaults differ by mode; see graph)")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    state: dict[str, Any] = {
        "include_all": bool(args.include_all),
        "concurrency": int(args.concurrency),
        "apply": bool(args.apply),
    }
    if args.limit:
        state["limit"] = int(args.limit)
    if args.out:
        state["out_path"] = args.out

    final = await graph.ainvoke(state)

    log.info(
        "verdicts: total=%d recruitment=%d high_conf=%d csv=%s applied=%d",
        final.get("count", 0),
        final.get("is_recruitment_count", 0),
        final.get("high_confidence_count", 0),
        final.get("csv_path", ""),
        final.get("applied", 0),
    )
    if not args.apply:
        log.info("dry-run: no DB writes. re-run with --apply to persist.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
