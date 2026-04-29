"""Apply cached recruitment verdicts to companies via the LangGraph apply graph.

Thin CLI wrapper over ``apply_recruitment_verdicts_graph.graph`` (registered in
``core/langgraph.json`` as ``apply_recruitment_verdicts``). The graph itself
loads the CSV, filters by ``confidence >= --threshold``, and UPDATEs
``companies.category='STAFFING'`` + ``score`` + ``score_reasons``.

In-process invocation (not HTTP) sidesteps the ``langgraph dev`` single-worker
queue (see memory ``feedback_leadgen_langgraph_fanout``).

Usage (from backend/):
    python scripts/apply_recruitment_verdicts.py [--csv path] [--threshold 0.60]
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

from leadgen_agent.apply_recruitment_verdicts_graph import graph  # noqa: E402

log = logging.getLogger("apply_recruitment_verdicts")


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default="classify_recruitment_full.csv")
    parser.add_argument("--threshold", type=float, default=0.60)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    state: dict[str, Any] = {
        "csv_path": args.csv,
        "threshold": float(args.threshold),
    }

    final = await graph.ainvoke(state)

    log.info(
        "applied: eligible=%d updated=%d method=%s",
        final.get("eligible_count", 0),
        final.get("applied", 0),
        final.get("method", ""),
    )
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
