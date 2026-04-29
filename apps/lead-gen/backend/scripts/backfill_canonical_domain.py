"""Backfill ``companies.canonical_domain`` from ``companies.website``.

``company_enrichment_graph`` requires ``canonical_domain`` and bails at its
load node when the column is empty. Most of the UNKNOWN bucket has a
``website`` but no derived ``canonical_domain`` — this script closes that
gap by reusing ``canonicalize_domain()`` from blocklist.py.

Usage (from backend/):
    python scripts/backfill_canonical_domain.py
"""

from __future__ import annotations

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

from leadgen_agent.blocklist import canonicalize_domain  # noqa: E402
from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402

log = logging.getLogger("backfill_canonical_domain")


SELECT_SQL = """
SELECT id, website
FROM companies
WHERE (canonical_domain IS NULL OR canonical_domain = '')
  AND website IS NOT NULL
  AND website <> ''
ORDER BY id
"""

UPDATE_SQL = "UPDATE companies SET canonical_domain = %s WHERE id = %s"


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(SELECT_SQL)
            rows = cur.fetchall()

    log.info("eligible rows (no canonical_domain, has website): %d", len(rows))
    if not rows:
        return 0

    updated = 0
    skipped = 0
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for company_id, website in rows:
                domain = canonicalize_domain(website)
                if not domain:
                    skipped += 1
                    continue
                cur.execute(UPDATE_SQL, (domain, int(company_id)))
                updated += 1

    log.info("updated %d rows; skipped %d (empty after canonicalization)", updated, skipped)
    return 0


if __name__ == "__main__":
    sys.exit(main())
