"""Shared AsyncPostgresSaver for all LangGraph graphs.

Why this file exists
--------------------
Every graph in this package was previously compiled with no `checkpointer=`,
so `app.py` setting `configurable.thread_id` was a silent no-op — node failures
restarted the run from scratch and a container sleep mid-run lost everything.
This module centralises a single `AsyncPostgresSaver` (backed by Neon Postgres)
that every graph reuses.

Why we don't use `AsyncPostgresSaver.from_conn_string`
------------------------------------------------------
In `langgraph-checkpoint-postgres>=2.0`, `from_conn_string` is an
`@asynccontextmanager` classmethod — it owns the underlying `AsyncConnection`
and tears it down on exit. That's a great fit for a script (`async with ...`),
but a poor fit for our long-lived FastAPI process where graphs are compiled
once, cached, and reused across many requests. Using it would force a
context-manager wrapper around every `graph.ainvoke(...)` call site.

Instead we open the connection ourselves with the same flags
(`autocommit=True, prepare_threshold=0, row_factory=dict_row`) that
`from_conn_string` uses internally, hand it to the saver constructor, and let
the saver live for the lifetime of the process. The OS reclaims the socket on
shutdown — no graceful close hook is wired up because FastAPI's container is
killed by Cloudflare's sleep, not by a clean SIGTERM in practice.

`setup()` is idempotent — it creates the `checkpoints*` tables on first use
via the package's bundled migrations.
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg import AsyncConnection
from psycopg.rows import dict_row

log = logging.getLogger(__name__)

_saver: Optional[AsyncPostgresSaver] = None
_conn: Optional[AsyncConnection] = None
_setup_done = False
_lock = asyncio.Lock()


async def get_checkpointer() -> Optional[AsyncPostgresSaver]:
    """Return a singleton AsyncPostgresSaver, or None if NEON_DATABASE_URL is unset.

    Returning None (instead of raising) lets unit tests, the CLI, and any
    cold-import path compile graphs without a database. Callers should treat
    a None result as "no checkpointing — best-effort run".
    """
    global _saver, _conn, _setup_done

    if _saver is not None and _setup_done:
        return _saver

    async with _lock:
        # Re-check under the lock.
        if _saver is not None and _setup_done:
            return _saver

        url = os.environ.get("NEON_DATABASE_URL")
        if not url:
            log.warning(
                "NEON_DATABASE_URL not set — graphs will run without checkpointing"
            )
            return None

        if _conn is None:
            try:
                _conn = await AsyncConnection.connect(
                    url,
                    autocommit=True,
                    prepare_threshold=0,
                    row_factory=dict_row,
                )
            except Exception as exc:  # noqa: BLE001 — bubble up as None, log below
                log.error("checkpointer connection failed: %s", exc)
                return None

        if _saver is None:
            _saver = AsyncPostgresSaver(conn=_conn)

        if not _setup_done:
            try:
                await _saver.setup()
                _setup_done = True
            except Exception as exc:  # noqa: BLE001
                log.error("checkpointer setup() failed: %s", exc)
                # Leave _saver in place; setup() is idempotent — next call retries.
                return None

        return _saver


def make_lazy_compiler(create_fn, eager_graph):
    """Return an async `get_graph()` that lazy-compiles `create_fn(cp)` once.

    `create_fn` must accept an optional checkpointer (`create_fn(cp=None)`).
    `eager_graph` is the no-checkpointer fallback returned when the saver is
    unavailable (missing env var, connection failure, tests, CLI).
    """
    cache: dict = {"graph": None}

    async def get_graph():
        if cache["graph"] is not None:
            return cache["graph"]
        cp = await get_checkpointer()
        cache["graph"] = create_fn(cp) if cp else eager_graph
        return cache["graph"]

    return get_graph


async def aclose() -> None:
    """Close the underlying connection. Call from a FastAPI lifespan handler."""
    global _saver, _conn, _setup_done
    if _conn is not None:
        try:
            await _conn.close()
        except Exception as exc:  # noqa: BLE001
            log.warning("checkpointer aclose error: %s", exc)
    _saver = None
    _conn = None
    _setup_done = False
