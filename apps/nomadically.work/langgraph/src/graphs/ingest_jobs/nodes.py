"""Ingest Jobs graph nodes — fetch jobs from ATS APIs and persist.

Ported from workers/insert-jobs.ts. Handles per-source ATS fetching
with error tracking and aggregator ingestion.
"""

from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from psycopg.rows import dict_row

from src.db.connection import get_connection

from .fetchers import ATS_FETCHERS, AGGREGATOR_FETCHERS
from .state import IngestJobsState

logger = logging.getLogger(__name__)


def _upsert_job(conn, job: dict) -> bool:
    """Upsert a single job into the jobs table. Returns True if new."""
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO jobs (external_id, source_kind, company_key, title,
                                location, url, description, posted_at, status, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'new', now(), now())
               ON CONFLICT (external_id) DO UPDATE SET
                   title = COALESCE(EXCLUDED.title, jobs.title),
                   location = COALESCE(EXCLUDED.location, jobs.location),
                   description = COALESCE(EXCLUDED.description, jobs.description),
                   posted_at = COALESCE(EXCLUDED.posted_at, jobs.posted_at),
                   updated_at = now()
               WHERE jobs.status IS NULL OR jobs.status = 'new'
               RETURNING (xmax = 0) AS is_new""",
            [
                job["external_id"],
                job["source_kind"],
                job["company_key"],
                job["title"],
                job.get("location", ""),
                job["url"],
                job.get("description", ""),
                job.get("posted_at"),
            ],
        )
        row = cur.fetchone()
        return bool(row and row[0]) if row else False


def _ensure_company(conn, company_key: str, company_name: str | None = None) -> None:
    """Auto-create company if not exists."""
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO companies (key, name, created_at, updated_at)
               VALUES (%s, %s, now(), now())
               ON CONFLICT (key) DO NOTHING""",
            [company_key, company_name or company_key],
        )


def fetch_stale_sources_node(state: IngestJobsState) -> dict:
    """Fetch sources not synced in the last 24 hours."""
    conn = get_connection()
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, source_kind, token
                   FROM job_sources
                   WHERE last_synced_at IS NULL
                      OR last_synced_at < now() - interval '24 hours'
                   ORDER BY last_synced_at ASC NULLS FIRST
                   LIMIT %s""",
                [state["limit"]],
            )
            sources = cur.fetchall()
        return {"sources": [dict(s) for s in sources]}
    finally:
        conn.close()


def ingest_batch_node(state: IngestJobsState) -> dict:
    """Ingest jobs from each stale source + aggregators."""
    conn = get_connection()
    try:
        results = []

        # Process per-source ATS boards
        for source in state["sources"]:
            kind = source["source_kind"]
            token = source["token"]
            source_id = source["id"]

            fetcher = ATS_FETCHERS.get(kind)
            if not fetcher:
                continue

            try:
                jobs = fetcher(token)
                inserted = 0
                for job in jobs:
                    _ensure_company(conn, job["company_key"], job.get("company_name"))
                    if _upsert_job(conn, job):
                        inserted += 1

                # Reset errors, update sync time
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE job_sources
                           SET last_synced_at = now(), consecutive_errors = 0, updated_at = now()
                           WHERE id = %s""",
                        [source_id],
                    )
                conn.commit()

                results.append({
                    "source": f"{kind}/{token}",
                    "fetched": len(jobs),
                    "inserted": inserted,
                    "error": None,
                })
            except Exception as e:
                logger.warning(f"Failed to ingest {kind}/{token}: {e}")
                with conn.cursor() as cur:
                    cur.execute(
                        """UPDATE job_sources
                           SET consecutive_errors = consecutive_errors + 1, updated_at = now()
                           WHERE id = %s""",
                        [source_id],
                    )
                conn.commit()
                results.append({
                    "source": f"{kind}/{token}",
                    "fetched": 0,
                    "inserted": 0,
                    "error": str(e),
                })

            time.sleep(0.3)  # Rate limiting

        # Process aggregators (not source-based)
        for agg_name, fetcher in AGGREGATOR_FETCHERS.items():
            try:
                jobs = fetcher()
                inserted = 0
                for job in jobs:
                    _ensure_company(conn, job["company_key"], job.get("company_name"))
                    if _upsert_job(conn, job):
                        inserted += 1
                conn.commit()
                results.append({
                    "source": agg_name,
                    "fetched": len(jobs),
                    "inserted": inserted,
                    "error": None,
                })
            except Exception as e:
                logger.warning(f"Aggregator {agg_name} failed: {e}")
                results.append({
                    "source": agg_name,
                    "fetched": 0,
                    "inserted": 0,
                    "error": str(e),
                })

        return {"results": results}
    finally:
        conn.close()


def summarize_node(state: IngestJobsState) -> dict:
    """Aggregate ingestion results into stats."""
    results = state.get("results", [])
    total_fetched = sum(r.get("fetched", 0) for r in results)
    total_inserted = sum(r.get("inserted", 0) for r in results)
    errors = sum(1 for r in results if r.get("error"))
    return {
        "stats": {
            "sources_processed": len(state.get("sources", [])),
            "aggregators_processed": len(AGGREGATOR_FETCHERS),
            "total_fetched": total_fetched,
            "total_inserted": total_inserted,
            "errors": errors,
        },
    }


def route_after_fetch(state: IngestJobsState) -> str:
    """Route to ingest_batch if sources found, otherwise end."""
    if state.get("sources"):
        return "ingest_batch"
    return "__end__"
