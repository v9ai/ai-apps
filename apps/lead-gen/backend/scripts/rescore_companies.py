"""Backfill: re-run score_verticals for every company with cached markdown.

Reads latest `classification.home` and `classification.careers` rows from
``company_facts`` (the source of truth for markdown captured during enrichment),
runs the v2 composite scorer, and UPSERTs ``company_product_signals``. Idempotent
via the ``uq_company_product_signals_pair`` unique constraint AND the
``weights_hash`` guard inside ``score_verticals`` — re-running with unchanged
ICPs is a no-op.

Usage (from backend/):
    python scripts/rescore_companies.py [--limit N] [--company-id ID]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
import time
from pathlib import Path
from typing import Any

# ── Load env vars ─────────────────────────────────────────────────────────
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

from leadgen_agent.company_enrichment_graph import score_verticals  # noqa: E402
from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402

log = logging.getLogger("rescore_companies")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _extract_home_markdown(value_json: Any) -> str:
    if isinstance(value_json, str):
        try:
            value_json = json.loads(value_json)
        except Exception:  # noqa: BLE001
            return ""
    if not isinstance(value_json, dict):
        return ""
    return str(value_json.get("home_markdown") or "")


def _extract_careers_markdown(value_json: Any) -> str:
    if isinstance(value_json, str):
        try:
            value_json = json.loads(value_json)
        except Exception:  # noqa: BLE001
            return ""
    if not isinstance(value_json, dict):
        return ""
    return str(value_json.get("careers_markdown") or "")


def _extract_classification(value_json: Any) -> dict[str, Any]:
    if isinstance(value_json, str):
        try:
            value_json = json.loads(value_json)
        except Exception:  # noqa: BLE001
            return {}
    if not isinstance(value_json, dict):
        return {}
    cls = value_json.get("classification")
    return cls if isinstance(cls, dict) else {}


def load_candidates(
    cur: Any, limit: int | None, company_id: int | None
) -> list[dict[str, Any]]:
    """Return latest home+careers rows per company — grouped by company_id."""
    if company_id is not None:
        cur.execute(
            """
            SELECT DISTINCT ON (cf.company_id, cf.field)
                cf.company_id, cf.field, cf.value_json
            FROM company_facts cf
            WHERE cf.company_id = %s
              AND cf.field IN ('classification.home', 'classification.careers')
            ORDER BY cf.company_id, cf.field, cf.observed_at DESC
            """,
            (int(company_id),),
        )
    else:
        sql = """
            SELECT DISTINCT ON (cf.company_id, cf.field)
                cf.company_id, cf.field, cf.value_json
            FROM company_facts cf
            WHERE cf.field IN ('classification.home', 'classification.careers')
            ORDER BY cf.company_id, cf.field, cf.observed_at DESC
        """
        if limit is not None:
            sql += " LIMIT %s"
            cur.execute(sql, (int(limit * 2),))
        else:
            cur.execute(sql)

    by_company: dict[int, dict[str, Any]] = {}
    for row in cur.fetchall() or []:
        cid, field, value_json = row[0], row[1], row[2]
        entry = by_company.setdefault(int(cid), {
            "company_id": int(cid),
            "home_markdown": "",
            "careers_markdown": "",
            "classification": {},
        })
        if field == "classification.home":
            entry["home_markdown"] = _extract_home_markdown(value_json)
            cls = _extract_classification(value_json)
            if cls:
                entry["classification"] = cls
        elif field == "classification.careers":
            entry["careers_markdown"] = _extract_careers_markdown(value_json)

    out = [e for e in by_company.values() if e["home_markdown"] or e["careers_markdown"]]
    if limit is not None:
        out = out[:limit]
    return out


async def rescore_one(candidate: dict[str, Any]) -> dict[str, Any]:
    state: dict[str, Any] = {
        "company_id": candidate["company_id"],
        "home_markdown": candidate["home_markdown"],
        "careers_markdown": candidate["careers_markdown"],
        "classification": candidate["classification"],
    }
    return await score_verticals(state)  # type: ignore[arg-type]


async def main() -> int:
    ap = argparse.ArgumentParser(description="Backfill company_product_signals v2.")
    ap.add_argument("--limit", type=int, default=None, help="Cap number of companies.")
    ap.add_argument("--company-id", type=int, default=None, help="Single company id.")
    args = ap.parse_args()

    dsn = _dsn()
    if not dsn:
        print("ERROR: NEON_DATABASE_URL / DATABASE_URL not set", file=sys.stderr)
        return 1

    t0 = time.time()
    with psycopg.connect(dsn, autocommit=True, connect_timeout=15) as conn:
        with conn.cursor() as cur:
            candidates = load_candidates(cur, args.limit, args.company_id)
    log.info("loaded %d candidates in %.2fs", len(candidates), time.time() - t0)

    ok = 0
    for i, cand in enumerate(candidates, 1):
        try:
            result = await rescore_one(cand)
            vs = (result or {}).get("vertical_signals") or {}
            log.info(
                "[%d/%d] company_id=%d verticals_written=%d",
                i, len(candidates), cand["company_id"], len(vs),
            )
            ok += 1
        except Exception as e:  # noqa: BLE001
            log.warning("company_id=%d FAILED: %s", cand["company_id"], e)

    log.info("done — %d/%d rescored in %.2fs", ok, len(candidates), time.time() - t0)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
