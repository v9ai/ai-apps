"""Neon (Postgres) client — replaces the old Cloudflare D1 HTTP client."""
from __future__ import annotations

import json
import os
from typing import Optional

import psycopg
from psycopg import sql
from psycopg_pool import AsyncConnectionPool

from .d1 import (
    ContactFeedback,
    FamilyMember,
    Issue,
    ResearchPaper,
)

# Whitelist of dedup columns allowed in dynamic SQL composition.
# Any value composed via psycopg.sql.Identifier into a query MUST be checked
# against this set first — defence in depth against future regressions that
# might allow caller-controlled column names to flow into SQL.
_ALLOWED_DEDUP_COLS = frozenset(
    {"journal_entry_id", "issue_id", "feedback_id", "goal_id", "medication_id"}
)


# Module-level pool. Initialized in the FastAPI lifespan in ``app.py``. When
# ``None`` (e.g. CLI scripts, tests, ad-hoc usage) ``_conn_ctx`` falls back to a
# direct connect so callers don't have to know about pool wiring.
POOL: AsyncConnectionPool | None = None


def _get_conn_str() -> str:
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return url


def _conn_ctx():
    """Return an async context manager yielding a pooled connection.

    If the module-level ``POOL`` has been initialized (production / FastAPI
    lifespan), borrow from it; otherwise open a one-shot connection so CLI
    scripts and tests still work without pool wiring.
    """
    if POOL is not None:
        return POOL.connection()
    return _OneShotConn()


class _OneShotConn:
    """Tiny async-context wrapper that opens-and-closes a single connection.

    Mirrors ``async with await psycopg.AsyncConnection.connect(...) as conn``
    so call sites can use the same ``async with _conn_ctx() as conn`` shape
    regardless of whether the pool is active.
    """

    def __init__(self) -> None:
        self._conn: psycopg.AsyncConnection | None = None

    async def __aenter__(self) -> psycopg.AsyncConnection:
        self._conn = await psycopg.AsyncConnection.connect(_get_conn_str())
        return self._conn

    async def __aexit__(self, exc_type, exc, tb) -> None:
        if self._conn is not None:
            await self._conn.close()
            self._conn = None


# Public alias so external callers (graph modules) don't dip into the leading
# underscore. Both names resolve to the same callable.
connection = _conn_ctx


async def fetch_contact_feedback(feedback_id: int) -> ContactFeedback:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, contact_id, family_member_id, subject, content, "
                "feedback_date, tags, source, extracted_issues "
                "FROM contact_feedbacks WHERE id = %s",
                (feedback_id,),
            )
            row = await cur.fetchone()
    if not row:
        raise ValueError(f"feedback {feedback_id} not found")
    return ContactFeedback(
        id=row[0], contact_id=row[1], family_member_id=row[2],
        subject=row[3], content=row[4], feedback_date=str(row[5]),
        tags=row[6], source=row[7], extracted_issues=row[8],
    )


async def fetch_issues_for_feedback(feedback_id: int) -> list[Issue]:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, title, description, category, severity, recommendations "
                "FROM issues WHERE feedback_id = %s ORDER BY severity DESC",
                (feedback_id,),
            )
            rows = await cur.fetchall()
    return [
        Issue(id=r[0], title=r[1], description=r[2], category=r[3],
              severity=r[4], recommendations=r[5])
        for r in rows
    ]


async def fetch_family_member(family_member_id: int) -> FamilyMember:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id, \"firstName\", name, date_of_birth, age_years "
                "FROM family_members WHERE id = %s",
                (family_member_id,),
            )
            row = await cur.fetchone()
    if not row:
        raise ValueError(f"family_member {family_member_id} not found")
    return FamilyMember(id=row[0], first_name=row[1], name=row[2],
                        date_of_birth=str(row[3]) if row[3] else None, age_years=row[4])


async def fetch_first_goal_id(family_member_id: int) -> Optional[int]:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id FROM goals WHERE family_member_id = %s ORDER BY created_at DESC LIMIT 1",
                (family_member_id,),
            )
            row = await cur.fetchone()
    return row[0] if row else None


async def fetch_research_papers(
    feedback_id: Optional[int] = None,
    goal_id: Optional[int] = None,
) -> list[ResearchPaper]:
    if feedback_id is not None:
        where, val = "feedback_id = %s", feedback_id
    elif goal_id is not None:
        where, val = "goal_id = %s", goal_id
    else:
        return []
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                f"SELECT id, title, authors, year, key_findings, therapeutic_techniques, "
                f"evidence_level, relevance_score FROM therapy_research "
                f"WHERE {where} ORDER BY relevance_score DESC LIMIT 10",
                (val,),
            )
            rows = await cur.fetchall()
    return [
        ResearchPaper(id=r[0], title=r[1], authors=r[2], year=r[3],
                      key_findings=r[4], therapeutic_techniques=r[5],
                      evidence_level=r[6], relevance_score=r[7])
        for r in rows
    ]


async def insert_story(
    goal_id: Optional[int],
    feedback_id: Optional[int],
    language: str,
    minutes: int,
    content: str,
) -> int:
    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO stories (goal_id, feedback_id, user_id, content, language, minutes, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                (goal_id, feedback_id, "system", content, language, minutes),
            )
            row = await cur.fetchone()
    return row[0] if row else 0


async def upsert_research_paper(
    therapeutic_goal_type: str,
    title: str,
    authors: list[str],
    year: int | None,
    doi: str | None,
    url: str | None,
    abstract: str | None,
    key_findings: list[str],
    therapeutic_techniques: list[str],
    evidence_level: str | None,
    relevance_score: float,
    feedback_id: int | None = None,
    issue_id: int | None = None,
    goal_id: int | None = None,
    journal_entry_id: int | None = None,
    medication_id: str | None = None,
) -> int:
    """Insert or skip a research paper into Neon therapy_research table."""
    authors_json = json.dumps(authors or [])
    findings_json = json.dumps(key_findings or [])
    techniques_json = json.dumps(therapeutic_techniques or [])
    score = int(relevance_score * 100) if relevance_score <= 1 else int(relevance_score)
    # Derive confidence from abstract quality + key findings count
    has_abstract = bool(abstract and len(abstract.strip()) >= 100)
    has_findings = len(key_findings) >= 2
    has_techniques = len(therapeutic_techniques) >= 1
    confidence = 40 + (has_abstract * 25) + (has_findings * 20) + (has_techniques * 15)

    # Build dedup condition based on which id is provided
    if medication_id is not None:
        dedup_col, dedup_val = "medication_id", medication_id
    elif journal_entry_id is not None:
        dedup_col, dedup_val = "journal_entry_id", journal_entry_id
    elif issue_id is not None:
        dedup_col, dedup_val = "issue_id", issue_id
    elif feedback_id is not None:
        dedup_col, dedup_val = "feedback_id", feedback_id
    else:
        dedup_col, dedup_val = "goal_id", goal_id

    # Defence in depth: even though dedup_col is set from a closed set above,
    # validate against the explicit whitelist before composing it into SQL via
    # psycopg.sql.Identifier. Prevents future regressions where a careless
    # edit lets caller-controlled column names flow into the query.
    if dedup_col not in _ALLOWED_DEDUP_COLS:
        raise ValueError(f"invalid dedup_col: {dedup_col!r}")
    dedup_ident = sql.Identifier(dedup_col)

    async with _conn_ctx() as conn:
        async with conn.cursor() as cur:
            # Deduplicate by DOI
            if doi:
                doi_query = sql.SQL(
                    "SELECT id FROM therapy_research WHERE doi = %s AND {} = %s LIMIT 1"
                ).format(dedup_ident)
                await cur.execute(doi_query, (doi, dedup_val))
                row = await cur.fetchone()
                if row:
                    return row[0]

            # Deduplicate by title
            title_query = sql.SQL(
                "SELECT id FROM therapy_research WHERE title = %s AND {} = %s LIMIT 1"
            ).format(dedup_ident)
            await cur.execute(title_query, (title, dedup_val))
            row = await cur.fetchone()
            if row:
                return row[0]

            # Insert
            await cur.execute(
                """INSERT INTO therapy_research (
                    goal_id, feedback_id, issue_id, journal_entry_id, medication_id, therapeutic_goal_type, title, authors, year, doi, url,
                    abstract, key_findings, therapeutic_techniques, evidence_level,
                    relevance_score, extracted_by, extraction_confidence,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                ) RETURNING id""",
                (
                    goal_id, feedback_id, issue_id, journal_entry_id, medication_id, therapeutic_goal_type, title, authors_json,
                    year, doi, url, abstract, findings_json, techniques_json,
                    evidence_level, score, "langgraph:deepseek-chat:v1", confidence,
                ),
            )
            row = await cur.fetchone()
            return row[0] if row else 0
