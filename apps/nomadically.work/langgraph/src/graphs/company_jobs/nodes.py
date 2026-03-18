"""Company Jobs graph nodes — discover and ingest jobs for AI companies.

Ported from workers/process-companies-cron.ts.
"""

from __future__ import annotations

import logging
import time

from psycopg.rows import dict_row

from src.db.connection import get_connection
from src.graphs.ingest_jobs.fetchers import fetch_ashby_jobs, fetch_greenhouse_jobs, fetch_lever_jobs

from .state import CompanyJobsState

logger = logging.getLogger(__name__)


def _upsert_job(conn, job: dict) -> bool:
    """Upsert a job. Returns True if new."""
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO jobs (external_id, source_kind, company_key, title,
                                location, url, description, posted_at, status, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'new', now(), now())
               ON CONFLICT (external_id) DO UPDATE SET
                   title = COALESCE(EXCLUDED.title, jobs.title),
                   location = COALESCE(EXCLUDED.location, jobs.location),
                   description = COALESCE(EXCLUDED.description, jobs.description),
                   updated_at = now()
               WHERE jobs.status IS NULL OR jobs.status = 'new'
               RETURNING (xmax = 0) AS is_new""",
            [
                job["external_id"], job["source_kind"], job["company_key"],
                job["title"], job.get("location", ""), job["url"],
                job.get("description", ""), job.get("posted_at"),
            ],
        )
        row = cur.fetchone()
        return bool(row and row[0]) if row else False


def fetch_ai_companies_node(state: CompanyJobsState) -> dict:
    """Fetch AI-tier companies added recently."""
    conn = get_connection()
    try:
        hours = state.get("hours_lookback", 24)
        limit = state.get("limit", 50)
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """SELECT id, key, name, ai_tier, ai_classification_confidence, category
                   FROM companies
                   WHERE ai_tier >= 1
                     AND (category IS NULL OR category != 'DIRECTORY')
                     AND created_at > now() - make_interval(hours => %s)
                   ORDER BY ai_tier DESC, ai_classification_confidence DESC NULLS LAST
                   LIMIT %s""",
                [hours, limit],
            )
            companies = [dict(r) for r in cur.fetchall()]
        return {"companies": companies}
    finally:
        conn.close()


def fetch_company_jobs_node(state: CompanyJobsState) -> dict:
    """Fetch jobs for each AI company from their ATS boards."""
    conn = get_connection()
    try:
        results = []
        for company in state["companies"]:
            key = company["key"]
            total_inserted = 0

            for fetcher_name, fetcher in [
                ("ashby", fetch_ashby_jobs),
                ("greenhouse", fetch_greenhouse_jobs),
                ("lever", fetch_lever_jobs),
            ]:
                try:
                    jobs = fetcher(key)
                    inserted = 0
                    for job in jobs:
                        if _upsert_job(conn, job):
                            inserted += 1
                    conn.commit()
                    total_inserted += inserted
                except Exception:
                    pass  # Not all companies have all ATS types

            results.append({
                "company": key,
                "name": company.get("name", key),
                "ai_tier": company.get("ai_tier"),
                "inserted": total_inserted,
            })

            time.sleep(0.5)  # Rate limiting

        return {"results": results}
    finally:
        conn.close()


def summarize_node(state: CompanyJobsState) -> dict:
    """Aggregate company job results."""
    results = state.get("results", [])
    total = sum(r.get("inserted", 0) for r in results)
    with_jobs = sum(1 for r in results if r.get("inserted", 0) > 0)
    return {
        "stats": {
            "companies_processed": len(results),
            "companies_with_jobs": with_jobs,
            "total_inserted": total,
        },
    }


def route_after_companies(state: CompanyJobsState) -> str:
    """Route to fetch_jobs if companies found."""
    if state.get("companies"):
        return "fetch_jobs"
    return "__end__"
