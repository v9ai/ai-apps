"""Janitor graph nodes — board sync, spam purge, dead source cleanup.

Ported from workers/janitor.ts. Pure DB operations, no LLM.
"""

from __future__ import annotations

import re

from src.db.connection import get_connection

from .state import JanitorState


def _is_spam_token(token: str) -> bool:
    """Token is spam if >40% of characters are digits."""
    if not token:
        return True
    digits = sum(1 for c in token if c.isdigit())
    return digits / len(token) > 0.4


def sync_boards_node(state: JanitorState) -> dict:
    """Phase 1: Sync boards from ats_boards into job_sources."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Sync ats_boards entries into job_sources
            cur.execute(
                """INSERT INTO job_sources (source_kind, token, created_at, updated_at)
                   SELECT vendor, board_slug, now(), now()
                   FROM ats_boards
                   WHERE board_slug IS NOT NULL AND board_slug != ''
                   ON CONFLICT (source_kind, token) DO NOTHING"""
            )
            synced = cur.rowcount
        conn.commit()
        return {
            "phase_results": [{"phase": "sync_boards", "synced": synced}],
        }
    finally:
        conn.close()


def purge_spam_node(state: JanitorState) -> dict:
    """Phase 1b: Remove spam board tokens (>40% digits)."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, token FROM job_sources")
            rows = cur.fetchall()

        spam_ids = [r[0] for r in rows if _is_spam_token(r[1])]
        purged = 0

        if spam_ids:
            placeholders = ",".join(["%s"] * len(spam_ids))
            with conn.cursor() as cur:
                # Archive jobs from spam sources
                cur.execute(
                    f"""UPDATE jobs SET status = 'archived', updated_at = now()
                        WHERE company_key IN (
                            SELECT token FROM job_sources WHERE id IN ({placeholders})
                        ) AND status != 'archived'""",
                    spam_ids,
                )
                # Delete spam sources
                cur.execute(
                    f"DELETE FROM job_sources WHERE id IN ({placeholders})",
                    spam_ids,
                )
                purged = cur.rowcount
            conn.commit()

        return {
            "phase_results": [{"phase": "purge_spam", "purged": purged}],
        }
    finally:
        conn.close()


def cleanup_dead_node(state: JanitorState) -> dict:
    """Phase 2: Remove sources with consecutive_errors >= 5, archive their jobs."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Find dead sources
            cur.execute(
                "SELECT id, token FROM job_sources WHERE consecutive_errors >= 5"
            )
            dead = cur.fetchall()

        if not dead:
            return {
                "phase_results": [{"phase": "cleanup_dead", "removed": 0, "archived_jobs": 0}],
            }

        dead_ids = [r[0] for r in dead]
        dead_tokens = [r[1] for r in dead]
        placeholders_ids = ",".join(["%s"] * len(dead_ids))
        placeholders_tokens = ",".join(["%s"] * len(dead_tokens))

        with conn.cursor() as cur:
            # Archive jobs from dead sources
            cur.execute(
                f"""UPDATE jobs SET status = 'archived', updated_at = now()
                    WHERE company_key IN ({placeholders_tokens})
                      AND status NOT IN ('archived', 'stale')""",
                dead_tokens,
            )
            archived = cur.rowcount

            # Delete dead sources
            cur.execute(
                f"DELETE FROM job_sources WHERE id IN ({placeholders_ids})",
                dead_ids,
            )
            removed = cur.rowcount

        conn.commit()

        return {
            "phase_results": [
                {"phase": "cleanup_dead", "removed": removed, "archived_jobs": archived}
            ],
        }
    finally:
        conn.close()
