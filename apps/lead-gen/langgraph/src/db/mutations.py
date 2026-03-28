"""All UPDATE/INSERT/DELETE mutations used by the pipeline graphs.

PostgreSQL syntax (parameterised with %s, native BOOLEAN, now()).
"""

from __future__ import annotations

from datetime import datetime, timezone

import psycopg
from psycopg.rows import dict_row


# ---------------------------------------------------------------------------
# Process Jobs — Phase 1 (enhance)
# ---------------------------------------------------------------------------

def promote_new_jobs(conn: psycopg.Connection) -> int:
    """Promote all new jobs directly to 'enhanced'."""
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE jobs SET status = 'enhanced', updated_at = now()
               WHERE status IS NULL OR status = 'new'"""
        )
        conn.commit()
        return cur.rowcount


def update_job_enhanced(
    conn: psycopg.Connection, job_id: int, cols: list[str], vals: list
) -> None:
    """Update a job with enrichment data and set status to 'enhanced'."""
    set_parts = [f"{c} = %s" for c in cols]
    set_parts += ["status = %s", "updated_at = now()"]
    vals = list(vals) + ["enhanced", job_id]
    sql = f"UPDATE jobs SET {', '.join(set_parts)} WHERE id = %s"
    with conn.cursor() as cur:
        cur.execute(sql, vals)
    conn.commit()


def advance_job_to_enhanced(conn: psycopg.Connection, job_id: int) -> None:
    """Advance a job to 'enhanced' without enrichment data."""
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE jobs SET status = 'enhanced', updated_at = now() WHERE id = %s",
            [job_id],
        )
    conn.commit()


# ---------------------------------------------------------------------------
# Process Jobs — Phase 2 (role tagging)
# ---------------------------------------------------------------------------

def persist_role_tags(
    conn: psycopg.Connection,
    job_id: int,
    is_frontend_react: bool,
    is_ai_engineer: bool,
    confidence: str,
    reason: str,
    source: str,
    next_status: str,
) -> None:
    """Write role tag columns and new status."""
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE jobs
               SET role_ai_engineer    = %s,
                   role_confidence     = %s,
                   role_reason         = %s,
                   role_source         = %s,
                   status              = %s,
                   updated_at          = now()
               WHERE id = %s""",
            [
                is_ai_engineer or is_frontend_react,
                confidence,
                reason,
                source,
                next_status,
                job_id,
            ],
        )
    conn.commit()


# ---------------------------------------------------------------------------
# Process Jobs — Phase 3 (skill extraction)
# ---------------------------------------------------------------------------

def upsert_job_skills(
    conn: psycopg.Connection,
    job_id: int,
    skills: list[dict],
) -> int:
    """Delete existing skills and insert fresh batch. Returns count."""
    now = datetime.now(timezone.utc).isoformat()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM job_skill_tags WHERE job_id = %s", [job_id])
        for s in skills:
            cur.execute(
                """INSERT INTO job_skill_tags
                   (job_id, tag, level, confidence, evidence, extracted_at, version)
                   VALUES (%s, %s, %s, %s, %s, %s, 'skills-v1')
                   ON CONFLICT (job_id, tag) DO UPDATE SET
                       level = EXCLUDED.level,
                       confidence = EXCLUDED.confidence,
                       evidence = EXCLUDED.evidence,
                       extracted_at = EXCLUDED.extracted_at,
                       version = EXCLUDED.version""",
                [
                    job_id,
                    s["tag"],
                    s["level"],
                    round(s["confidence"], 3),
                    s["evidence"],
                    now,
                ],
            )
    conn.commit()
    return len(skills)


# ---------------------------------------------------------------------------
# Cleanup Jobs
# ---------------------------------------------------------------------------

# Columns NULLed on stale — everything except identity/conflict keys.
_STALE_COLUMNS = [
    "location", "description", "score", "score_reason",
    "company_id", "absolute_url", "internal_job_id",
    "requisition_id", "company_name", "first_published", "language",
    "metadata", "departments", "offices", "questions",
    "location_questions", "compliance", "demographic_questions",
    "data_compliance", "categories", "workplace_type", "country",
    "opening", "opening_plain", "description_body",
    "description_body_plain", "additional", "additional_plain",
    "lists",
]


# ---------------------------------------------------------------------------
# Contacts — upsert from email outreach pipeline
# ---------------------------------------------------------------------------

def upsert_contact(
    conn: psycopg.Connection,
    *,
    first_name: str,
    last_name: str,
    email: str | None = None,
    position: str | None = None,
    company: str | None = None,
    linkedin_url: str | None = None,
    tags: str | None = None,
) -> int | None:
    """Insert a contact or return existing ID if email/name already exists."""
    with conn.cursor(row_factory=dict_row) as cur:
        # Check for existing contact by email first, then by name
        if email:
            cur.execute(
                "SELECT id FROM contacts WHERE email = %s LIMIT 1",
                [email],
            )
            row = cur.fetchone()
            if row:
                # Update position/company if they were empty
                cur.execute(
                    """UPDATE contacts
                       SET position = COALESCE(NULLIF(position, ''), %s),
                           company = COALESCE(NULLIF(company, ''), %s),
                           linkedin_url = COALESCE(NULLIF(linkedin_url, ''), %s),
                           updated_at = now()::text
                       WHERE id = %s""",
                    [position, company, linkedin_url, row["id"]],
                )
                conn.commit()
                return row["id"]

        # Check by name
        cur.execute(
            """SELECT id FROM contacts
               WHERE first_name ILIKE %s AND last_name ILIKE %s
               LIMIT 1""",
            [first_name, last_name],
        )
        row = cur.fetchone()
        if row:
            cur.execute(
                """UPDATE contacts
                   SET email = COALESCE(NULLIF(email, ''), %s),
                       position = COALESCE(NULLIF(position, ''), %s),
                       company = COALESCE(NULLIF(company, ''), %s),
                       linkedin_url = COALESCE(NULLIF(linkedin_url, ''), %s),
                       updated_at = now()::text
                   WHERE id = %s""",
                [email, position, company, linkedin_url, row["id"]],
            )
            conn.commit()
            return row["id"]

        # Insert new contact
        cur.execute(
            """INSERT INTO contacts
               (first_name, last_name, email, position, company, linkedin_url, tags)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING id""",
            [first_name, last_name, email, position, company, linkedin_url, tags],
        )
        new_row = cur.fetchone()
        conn.commit()
        return new_row["id"] if new_row else None


def mark_jobs_stale(conn: psycopg.Connection, job_ids: list[int]) -> int:
    """Mark a batch of jobs as stale: null data columns, delete skill tags."""
    if not job_ids:
        return 0

    now = datetime.now(timezone.utc).isoformat()
    placeholders = ",".join(["%s"] * len(job_ids))

    null_sets = ", ".join(f"{c} = NULL" for c in _STALE_COLUMNS)

    with conn.cursor() as cur:
        # Delete skill tags
        cur.execute(
            f"DELETE FROM job_skill_tags WHERE job_id IN ({placeholders})",
            job_ids,
        )
        # Null out data columns, set sentinel values
        cur.execute(
            f"""UPDATE jobs SET
                    status = 'stale',
                    title = '[stale]',
                    url = '',
                    posted_at = '1970-01-01T00:00:00Z',
                    {null_sets},
                    updated_at = %s
                WHERE id IN ({placeholders})""",
            [now, *job_ids],
        )
    conn.commit()
    return len(job_ids)
