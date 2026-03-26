"""Cleanup Jobs graph nodes — pure DB operations, no LLM."""

from __future__ import annotations

from src.db.connection import get_connection
from src.db.queries import count_stale_eligible, fetch_stale_batch
from src.db.mutations import mark_jobs_stale

from .state import CleanupState


def find_stale_jobs_node(state: CleanupState) -> dict:
    """Find jobs eligible for stale marking."""
    conn = get_connection()
    try:
        count = count_stale_eligible(conn)

        if state["dry_run"]:
            return {
                "stale_ids": [],
                "stats": {"eligible": count, "would_mark_stale": count, "marked_stale": 0},
            }

        if count == 0:
            return {
                "stale_ids": [],
                "stats": {"eligible": 0, "marked_stale": 0},
            }

        batch = fetch_stale_batch(conn)
        return {
            "stale_ids": [row["id"] for row in batch],
            "stats": {"eligible": count, "marked_stale": 0},
        }
    finally:
        conn.close()


def batch_cleanup_node(state: CleanupState) -> dict:
    """Mark stale jobs in batches until none remain."""
    conn = get_connection()
    try:
        ids = state["stale_ids"]
        total_marked = 0

        while ids:
            marked = mark_jobs_stale(conn, ids)
            total_marked += marked

            batch = fetch_stale_batch(conn)
            ids = [row["id"] for row in batch]

        return {
            "stale_ids": [],
            "stats": {"marked_stale": total_marked},
        }
    finally:
        conn.close()


def route_after_find(state: CleanupState) -> str:
    """Route to batch_cleanup if there are stale IDs, otherwise end."""
    if state["stale_ids"]:
        return "batch_cleanup"
    return "__end__"
