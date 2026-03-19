"""Neon (Postgres) client for persisting research papers."""
from __future__ import annotations

import json
import os

import psycopg


def _get_conn_str() -> str:
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return url


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
) -> int:
    """Insert or skip a research paper into Neon therapy_research table."""
    conn_str = _get_conn_str()
    authors_json = json.dumps(authors or [])
    findings_json = json.dumps(key_findings or [])
    techniques_json = json.dumps(therapeutic_techniques or [])
    score = int(relevance_score * 100) if relevance_score <= 1 else int(relevance_score)

    # Build dedup condition based on which id is provided
    if issue_id is not None:
        dedup_col, dedup_val = "issue_id", issue_id
    elif feedback_id is not None:
        dedup_col, dedup_val = "feedback_id", feedback_id
    else:
        dedup_col, dedup_val = "goal_id", goal_id

    async with await psycopg.AsyncConnection.connect(conn_str) as conn:
        async with conn.cursor() as cur:
            # Deduplicate by DOI
            if doi:
                await cur.execute(
                    f"SELECT id FROM therapy_research WHERE doi = %s AND {dedup_col} = %s LIMIT 1",
                    (doi, dedup_val),
                )
                row = await cur.fetchone()
                if row:
                    return row[0]

            # Deduplicate by title
            await cur.execute(
                f"SELECT id FROM therapy_research WHERE title = %s AND {dedup_col} = %s LIMIT 1",
                (title, dedup_val),
            )
            row = await cur.fetchone()
            if row:
                return row[0]

            # Insert
            await cur.execute(
                """INSERT INTO therapy_research (
                    goal_id, feedback_id, issue_id, therapeutic_goal_type, title, authors, year, doi, url,
                    abstract, key_findings, therapeutic_techniques, evidence_level,
                    relevance_score, extracted_by, extraction_confidence,
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                ) RETURNING id""",
                (
                    goal_id, feedback_id, issue_id, therapeutic_goal_type, title, authors_json,
                    year, doi, url, abstract, findings_json, techniques_json,
                    evidence_level, score, "langgraph:deepseek-chat:v1", 75,
                ),
            )
            row = await cur.fetchone()
            return row[0] if row else 0
