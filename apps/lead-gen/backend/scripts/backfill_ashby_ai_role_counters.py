"""Backfill ``companies.ai_role_count_30d`` and ``companies.remote_ai_role_count_30d``
from already-ingested Ashby intent_signals.

Reads the most-recent ``signal_type='hiring_intent' AND source_type='job_posting'``
row per company, recovers the Ashby ``slug`` from its ``metadata`` JSON,
re-fetches the live job board via :class:`AshbyClient`, classifies each
job through :func:`classify_job` (the same path the live ingest graph
uses), aggregates the two counters and UPDATEs ``companies``.

Re-fetching from Ashby costs an extra ~30 minutes vs. classifying titles
from ``intent_signals.metadata`` alone, but it's required for the remote
signal to be accurate — ``metadata.titles`` doesn't carry
``workplaceType`` / ``isRemote`` / ``location`` / ``descriptionPlain``,
so a title-only fallback would systematically undercount remote roles
for any company that uses ``workplaceType=Remote`` without "remote" in
the title.

Usage (from backend/):
    uv run python scripts/backfill_ashby_ai_role_counters.py            # dry-run
    ADMIN_BACKFILL=1 uv run python scripts/backfill_ashby_ai_role_counters.py --apply

Safety:
    - ``--apply`` requires ``ADMIN_BACKFILL=1`` (CLI mirror of ``isAdminEmail``).
    - UPDATEs are scoped by ``id``; only touches companies that have an
      Ashby hiring_intent signal.
    - Counters are RECOMPUTED, not incremented — re-runs converge.
    - Concurrency is capped at 4 to be polite to Ashby's public API.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import sys
from pathlib import Path

# ── env loading (matches backfill_canonical_domain.py) ──────────────────────
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

from leadgen_agent.ai_role_taxonomy import classify_job  # noqa: E402
from leadgen_agent.ashby_client import AshbyClient  # noqa: E402
from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402

log = logging.getLogger("backfill_ashby_ai_role_counters")

ASHBY_CONCURRENCY = 4

SELECT_SQL = """
SELECT DISTINCT ON (s.company_id)
       s.company_id,
       c.key,
       s.metadata
FROM intent_signals s
JOIN companies c ON c.id = s.company_id
WHERE s.signal_type = 'hiring_intent'
  AND s.source_type = 'job_posting'
ORDER BY s.company_id, s.detected_at DESC
"""

UPDATE_SQL = """
UPDATE companies
SET ai_role_count_30d = %s,
    remote_ai_role_count_30d = %s,
    updated_at = now()::text
WHERE id = %s
"""


def _slug_from_metadata(metadata: str | None) -> str | None:
    if not metadata:
        return None
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError:
        return None
    slug = meta.get("slug") if isinstance(meta, dict) else None
    if not slug or not isinstance(slug, str):
        return None
    return slug.strip().lower()


async def _classify_slug(
    slug: str,
    sem: asyncio.Semaphore,
) -> tuple[int, int, list[str]]:
    """Fetch a single Ashby board, classify each job, return aggregates."""
    async with sem:
        try:
            async with AshbyClient(slug) as client:
                jobs = await client.fetch_jobs()
        except Exception as exc:
            log.warning("Ashby fetch failed slug=%s: %s", slug, exc)
            return 0, 0, []

    ai_count = 0
    remote_ai_count = 0
    matched_titles: list[str] = []
    for job in jobs:
        verdict = classify_job(
            {
                "title": job.title,
                "descriptionPlain": job.descriptionPlain,
                "workplaceType": job.workplaceType,
                "isRemote": job.isRemote,
                "location": job.location,
            }
        )
        if verdict.is_ai_role:
            ai_count += 1
            matched_titles.append(job.title)
            if verdict.is_remote:
                remote_ai_count += 1
    return ai_count, remote_ai_count, matched_titles


async def main_async(apply_changes: bool) -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    if apply_changes and os.environ.get("ADMIN_BACKFILL") != "1":
        print(
            "--apply requires ADMIN_BACKFILL=1 in env. Refusing to write.\n"
            "  uv run python scripts/backfill_ashby_ai_role_counters.py             # dry-run\n"
            "  ADMIN_BACKFILL=1 uv run python scripts/backfill_ashby_ai_role_counters.py --apply",
            file=sys.stderr,
        )
        return 1

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(SELECT_SQL)
            rows = cur.fetchall()

    log.info("loaded %d latest hiring_intent signals", len(rows))

    targets: list[tuple[int, str, str]] = []  # (company_id, key, slug)
    for company_id, key, metadata in rows:
        slug = _slug_from_metadata(metadata)
        if not slug:
            continue
        targets.append((int(company_id), key or f"id={company_id}", slug))
    log.info("targets with valid slug: %d", len(targets))

    sem = asyncio.Semaphore(ASHBY_CONCURRENCY)
    tasks = [_classify_slug(slug, sem) for _company_id, _key, slug in targets]
    results = await asyncio.gather(*tasks, return_exceptions=False)

    samples: list[tuple[str, int, int, int, list[str]]] = []
    with_ai = 0
    with_remote_ai = 0
    updated = 0

    apply_conn = (
        psycopg.connect(_dsn(), autocommit=True, connect_timeout=10)
        if apply_changes
        else None
    )
    try:
        cur = apply_conn.cursor() if apply_conn is not None else None
        for (company_id, key, slug), (ai_count, remote_ai_count, matched) in zip(
            targets, results, strict=True
        ):
            if ai_count == 0 and remote_ai_count == 0:
                # Still update (recompute to 0) when applying — keeps counters
                # honest as roles close. Skip for dry-run noise.
                if apply_changes and cur is not None:
                    cur.execute(UPDATE_SQL, (0, 0, company_id))
                    updated += 1
                continue

            if ai_count > 0:
                with_ai += 1
            if remote_ai_count > 0:
                with_remote_ai += 1

            if len(samples) < 5:
                samples.append(
                    (key, company_id, ai_count, remote_ai_count, matched[:5])
                )

            if apply_changes and cur is not None:
                cur.execute(UPDATE_SQL, (ai_count, remote_ai_count, company_id))
                updated += 1
                if updated % 25 == 0:
                    log.info("...updated %d so far", updated)
    finally:
        if apply_conn is not None:
            apply_conn.close()

    print("")
    print("Sample matches (top 5 with non-zero AI roles):")
    for key, cid, ai, remote_ai, titles in samples:
        print(f"  {key} (id={cid}) — ai={ai}, remoteAi={remote_ai}")
        for t in titles:
            print(f"    · {t}")
    print("")
    print(
        f"Done. signals_scanned={len(rows)} targets={len(targets)} "
        f"ai_role_companies={with_ai} remote_ai_role_companies={with_remote_ai}"
        + (f" updated={updated}" if apply_changes else "  (dry-run — no DB writes)")
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write counter updates to companies (requires ADMIN_BACKFILL=1)",
    )
    args = parser.parse_args()
    return asyncio.run(main_async(apply_changes=args.apply))


if __name__ == "__main__":
    sys.exit(main())
