"""Persistence layer for LangGraph run-level metadata.

Backs the FastAPI harness in ``app.py``. Replaces the in-process ``_THREADS``
dict that vanished on container sleep / redeploy / OOM. Schema lives in
``migrations/001_langgraph_runs.sql``.

All functions borrow connections from the shared ``neon.connection()`` pool
helper — no separate pool is opened here.
"""
from __future__ import annotations

import json
from typing import Any

from . import neon


_VALID_STATUSES = frozenset(
    {"pending", "running", "success", "error", "interrupted", "cancelled"}
)


async def insert_run(
    run_id: str,
    thread_id: str,
    assistant_id: str,
    user_email: str | None = None,
) -> None:
    """Insert a new run row with status='pending'.

    Idempotent on the run_id PK via ON CONFLICT DO NOTHING — protects against
    a race where the same run_id is submitted twice.

    ``user_email`` is the row owner used by per-user authorization in app.py.
    Non-null values are normalized (trim + lower) by the caller (see app.py
    ``create_run``); we store whatever we're given.
    """
    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO langgraph_runs (run_id, thread_id, assistant_id, status, user_email) "
                "VALUES (%s, %s, %s, 'pending', %s) "
                "ON CONFLICT (run_id) DO NOTHING",
                (run_id, thread_id, assistant_id, user_email),
            )


async def update_run_status(
    run_id: str,
    status: str,
    *,
    values: dict[str, Any] | None = None,
    error: str | None = None,
) -> None:
    """Update a run's status, optionally storing final values and/or error."""
    if status not in _VALID_STATUSES:
        raise ValueError(f"invalid status: {status!r}")
    values_json = json.dumps(values) if values is not None else None
    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE langgraph_runs "
                "SET status = %s, values = COALESCE(%s::jsonb, values), "
                "    error = COALESCE(%s, error), updated_at = NOW() "
                "WHERE run_id = %s",
                (status, values_json, error, run_id),
            )


async def get_run(thread_id: str, run_id: str) -> dict[str, Any] | None:
    """Fetch a single run by (thread_id, run_id). Returns None if not found."""
    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT run_id, thread_id, assistant_id, status, values, error, "
                "       created_at, updated_at "
                "FROM langgraph_runs "
                "WHERE thread_id = %s AND run_id = %s",
                (thread_id, run_id),
            )
            row = await cur.fetchone()
    if row is None:
        return None
    return {
        "run_id": row[0],
        "thread_id": row[1],
        "assistant_id": row[2],
        "status": row[3],
        "values": row[4] or {},
        "error": row[5],
        "created_at": row[6].isoformat() if row[6] else None,
        "updated_at": row[7].isoformat() if row[7] else None,
    }


async def get_run_with_owner(thread_id: str, run_id: str) -> dict[str, Any] | None:
    """Fetch a single run by (thread_id, run_id), including the ``user_email``
    owner column used for per-user authorization.

    Returns None if not found. Used by the GET / DELETE / state handlers in
    app.py to enforce IDOR protection: a request bearing a different
    ``X-User-Email`` than the row's stored owner is rejected with 403.
    """
    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT run_id, thread_id, assistant_id, status, values, error, "
                "       user_email, created_at, updated_at "
                "FROM langgraph_runs "
                "WHERE thread_id = %s AND run_id = %s",
                (thread_id, run_id),
            )
            row = await cur.fetchone()
    if row is None:
        return None
    return {
        "run_id": row[0],
        "thread_id": row[1],
        "assistant_id": row[2],
        "status": row[3],
        "values": row[4] or {},
        "error": row[5],
        "user_email": row[6],
        "created_at": row[7].isoformat() if row[7] else None,
        "updated_at": row[8].isoformat() if row[8] else None,
    }


async def get_latest_completed_values(thread_id: str) -> dict[str, Any]:
    """Return the values dict of the most recently completed run on a thread.

    "Completed" = status in ('success','error'). If the thread has no completed
    runs yet, returns an empty dict (mirrors the prior in-memory default).
    """
    async with neon.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT values FROM langgraph_runs "
                "WHERE thread_id = %s AND status IN ('success','error') "
                "ORDER BY updated_at DESC LIMIT 1",
                (thread_id,),
            )
            row = await cur.fetchone()
    if row is None or row[0] is None:
        return {}
    return row[0]
