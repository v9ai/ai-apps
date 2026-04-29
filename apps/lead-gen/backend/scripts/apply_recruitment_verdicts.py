"""Apply verdicts from classify_recruitment_full.csv to companies.category.

Reads the dry-run CSV produced by ``classify_recruitment_companies.py``,
filters rows with ``is_recruitment=True`` AND ``confidence >= --threshold``,
and UPDATEs ``companies`` to set ``category='STAFFING'``, ``score``, and
``score_reasons``. Skips re-classifying — uses cached verdicts.

Usage (from backend/):
    python scripts/apply_recruitment_verdicts.py [--csv path] [--threshold 0.60]
"""

from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import sys
from pathlib import Path

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

log = logging.getLogger("apply_recruitment_verdicts")

METHOD_TAG = "classify-recruitment-llm-v1"

UPDATE_SQL = (
    "UPDATE companies SET category = %s, score = %s, score_reasons = %s, "
    "updated_at = now()::text WHERE id = %s"
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", default="classify_recruitment_full.csv")
    parser.add_argument("--threshold", type=float, default=0.60)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    csv_path = Path(args.csv)
    if not csv_path.exists():
        log.error("csv not found: %s", csv_path)
        return 1

    eligible: list[dict] = []
    with csv_path.open() as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            if (row.get("is_recruitment") or "").strip().lower() != "true":
                continue
            try:
                conf = float(row.get("confidence") or 0.0)
            except ValueError:
                continue
            if conf < args.threshold:
                continue
            eligible.append({
                "id": int(row["id"]),
                "key": row.get("key") or "",
                "name": row.get("name") or "",
                "confidence": conf,
                "reasons": [s.strip() for s in (row.get("reasons") or "").split("|") if s.strip()],
            })

    log.info("eligible (is_recruitment=True, confidence>=%.2f): %d rows", args.threshold, len(eligible))
    if not eligible:
        return 0

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for r in eligible:
                reasons = {
                    "method": METHOD_TAG,
                    "is_recruitment": True,
                    "confidence": r["confidence"],
                    "reasons": r["reasons"],
                }
                cur.execute(
                    UPDATE_SQL,
                    ("STAFFING", r["confidence"], json.dumps(reasons), r["id"]),
                )

    log.info("updated %d companies to category=STAFFING", len(eligible))
    return 0


if __name__ == "__main__":
    sys.exit(main())
