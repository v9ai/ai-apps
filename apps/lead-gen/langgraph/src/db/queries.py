"""All SELECT queries used by the pipeline graphs.

Each function takes a psycopg connection and returns typed results.
PostgreSQL syntax (parameterised with %s, native BOOLEAN, now()).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import psycopg
from psycopg.rows import dict_row


# ---------------------------------------------------------------------------
# Process Jobs — Phase 1 (enhance)
# ---------------------------------------------------------------------------

def fetch_new_jobs(conn: psycopg.Connection, limit: int = 50) -> list[dict]:
    """Jobs with status='new' that need ATS enhancement."""
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """SELECT id, external_id, source_kind, company_key
               FROM jobs
               WHERE status IS NULL OR status = 'new'
               ORDER BY created_at DESC
               LIMIT %s""",
            [limit],
        )
        return cur.fetchall()


def fetch_new_ats_jobs(conn: psycopg.Connection, limit: int = 50) -> list[dict]:
    """New jobs from ATS sources (greenhouse, lever, ashby)."""
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """SELECT id, external_id, source_kind, company_key
               FROM jobs
               WHERE (status IS NULL OR status = 'new')
                 AND source_kind IN ('greenhouse', 'lever', 'ashby')
               ORDER BY created_at DESC
               LIMIT %s""",
            [limit],
        )
        return cur.fetchall()


# ---------------------------------------------------------------------------
# Process Jobs — Phase 2 (role tagging)
# ---------------------------------------------------------------------------

def fetch_enhanced_jobs(conn: psycopg.Connection, limit: int = 100) -> list[dict]:
    """Jobs with status='enhanced' ready for role tagging."""
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """SELECT id, title, location, description
               FROM jobs
               WHERE status = 'enhanced'
               ORDER BY created_at DESC
               LIMIT %s""",
            [limit],
        )
        return cur.fetchall()


# ---------------------------------------------------------------------------
# Process Jobs — Phase 3 (skill extraction)
# ---------------------------------------------------------------------------

def fetch_classified_jobs_without_skills(
    conn: psycopg.Connection, limit: int = 100
) -> list[dict]:
    """Role-matched jobs that have no skill tags yet."""
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """SELECT j.id, j.title, j.description
               FROM jobs j
               LEFT JOIN job_skill_tags t ON t.job_id = j.id
               WHERE j.status = 'role-match'
                 AND j.description IS NOT NULL
                 AND t.job_id IS NULL
               ORDER BY j.created_at DESC
               LIMIT %s""",
            [limit],
        )
        return cur.fetchall()


# ---------------------------------------------------------------------------
# Job Matcher
# ---------------------------------------------------------------------------

def fetch_candidate_jobs_by_skills(
    conn: psycopg.Connection,
    skills: list[str],
    max_candidates: int = 50,
) -> list[dict]:
    """Candidate jobs that have at least one matching skill tag."""
    placeholders = ",".join(["%s"] * len(skills))
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            f"""SELECT DISTINCT jst.job_id, j.title
                FROM job_skill_tags jst
                JOIN jobs j ON j.id = jst.job_id
                WHERE jst.tag IN ({placeholders})
                LIMIT %s""",
            [*skills, max_candidates],
        )
        return cur.fetchall()


def fetch_skill_tags_for_jobs(
    conn: psycopg.Connection, job_ids: list[int]
) -> list[dict]:
    """All skill tags for a set of job IDs."""
    placeholders = ",".join(["%s"] * len(job_ids))
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            f"SELECT job_id, tag FROM job_skill_tags WHERE job_id IN ({placeholders})",
            job_ids,
        )
        return cur.fetchall()


def fetch_jobs_by_ids(conn: psycopg.Connection, job_ids: list[int]) -> list[dict]:
    """Full job rows for a set of IDs."""
    placeholders = ",".join(["%s"] * len(job_ids))
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            f"""SELECT id, title, url, location, posted_at, company_id, company_key
                FROM jobs WHERE id IN ({placeholders})""",
            job_ids,
        )
        return cur.fetchall()


# ---------------------------------------------------------------------------
# Cleanup Jobs
# ---------------------------------------------------------------------------

CUTOFF_DAYS = 30
BATCH_SIZE = 50


def count_stale_eligible(conn: psycopg.Connection) -> int:
    """Count jobs eligible for cleanup (old + not recently updated)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=CUTOFF_DAYS)).isoformat()
    recent_cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """SELECT count(*) as cnt FROM jobs
               WHERE posted_at < %s
                 AND (updated_at IS NULL OR updated_at < %s)
                 AND (status IS NULL OR status != 'stale')""",
            [cutoff, recent_cutoff],
        )
        row = cur.fetchone()
        return row["cnt"] if row else 0


def fetch_stale_batch(conn: psycopg.Connection) -> list[dict]:
    """Fetch a batch of job IDs eligible for stale marking."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=CUTOFF_DAYS)).isoformat()
    recent_cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """SELECT id FROM jobs
               WHERE posted_at < %s
                 AND (updated_at IS NULL OR updated_at < %s)
                 AND (status IS NULL OR status != 'stale')
               LIMIT %s""",
            [cutoff, recent_cutoff, BATCH_SIZE],
        )
        return cur.fetchall()


def get_stale_stats(conn: psycopg.Connection) -> dict:
    """Return counts of stale-eligible, already-stale, and total jobs."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=CUTOFF_DAYS)).isoformat()
    recent_cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """SELECT count(*) as cnt FROM jobs
               WHERE posted_at < %s
                 AND (updated_at IS NULL OR updated_at < %s)
                 AND (status IS NULL OR status != 'stale')""",
            [cutoff, recent_cutoff],
        )
        eligible = cur.fetchone()["cnt"]

        cur.execute("SELECT count(*) as cnt FROM jobs WHERE status = 'stale'")
        already_stale = cur.fetchone()["cnt"]

        cur.execute("SELECT count(*) as cnt FROM jobs")
        total = cur.fetchone()["cnt"]

    return {
        "eligible_for_cleanup": eligible,
        "already_stale": already_stale,
        "total_jobs": total,
        "cutoff": cutoff,
        "cutoff_days": CUTOFF_DAYS,
    }
