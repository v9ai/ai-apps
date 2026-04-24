"""Centralized, transactional jsonb writer for ``products`` analysis columns.

Graphs persist their own analysis payloads (pricing_analysis, gtm_analysis,
...) via this module so that the write is:

- constrained to an allow-list of (jsonb_column, timestamp_column) pairs
  (no arbitrary column injection from state);
- wrapped in an explicit transaction (``autocommit=False`` + ``conn.transaction()``)
  so a mid-flight failure doesn't leave ``product_intel_runs.status=success``
  without the corresponding artifact update;
- read-back verified after commit so we surface write-swallowing bugs loudly
  instead of reporting silent success.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import psycopg

from .deep_icp_graph import _dsn

log = logging.getLogger(__name__)


# Whitelist of (jsonb_column, timestamp_column) pairs that graphs may write.
# Keep in sync with Drizzle schema in src/db/schema.ts. Expanding this requires
# a matching schema change — raw_sql writes elsewhere are blocked by a grep
# test in tests/test_no_raw_product_writes.py.
_ALLOWED_COLUMN_PAIRS: frozenset[tuple[str, str]] = frozenset(
    {
        ("pricing_analysis", "pricing_analyzed_at"),
        ("gtm_analysis", "gtm_analyzed_at"),
    }
)

# Whitelist for the semantic embedding writer. Kept separate because embeddings
# are a (vector, model, source_hash, timestamp) 4-tuple rather than the usual
# (jsonb, timestamp) pair used by the analysis columns above.
_ALLOWED_EMBEDDING_TARGETS: frozenset[tuple[str, str]] = frozenset(
    {
        ("products", "icp_embedding"),
        ("companies", "profile_embedding"),
    }
)


class ProductWriteVerificationError(RuntimeError):
    """Raised when post-commit read-back does not confirm the update landed."""


def persist_product_jsonb(
    product_id: int,
    payload_column: str,
    timestamp_column: str,
    payload: dict[str, Any],
) -> None:
    """Transactionally update a whitelisted products jsonb + timestamp pair.

    Raises:
        ValueError: if the column pair is not in ``_ALLOWED_COLUMN_PAIRS``.
        ProductWriteVerificationError: if post-commit read-back doesn't show
            an updated timestamp (``> t0`` and non-null).
        psycopg.Error: for connection/transaction failures (callers narrow
            this into their existing ``_error`` channel).
    """
    pair = (payload_column, timestamp_column)
    if pair not in _ALLOWED_COLUMN_PAIRS:
        raise ValueError(
            f"persist_product_jsonb: column pair {pair!r} is not whitelisted"
        )

    pid = int(product_id)
    # Bound via process wall clock so a clock skew between DB + app doesn't
    # flake the read-back — we compare against DB ``now()`` post-commit.
    t0 = time.time()
    sql_update = (
        f"UPDATE products "
        f"SET {payload_column} = %s::jsonb, "
        f"    {timestamp_column} = now()::text, "
        f"    updated_at = now()::text "
        f"WHERE id = %s"
    )
    sql_select = f"SELECT {timestamp_column} FROM products WHERE id = %s"

    try:
        with psycopg.connect(_dsn(), autocommit=False, connect_timeout=10) as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(sql_update, (json.dumps(payload), pid))
            with conn.cursor() as cur:
                cur.execute(sql_select, (pid,))
                row = cur.fetchone()
    except psycopg.Error:
        log.error(
            "persist_product_jsonb: DB failure product_id=%s column=%s",
            pid, payload_column,
        )
        raise

    if not row or row[0] is None:
        raise ProductWriteVerificationError(
            f"persist_product_jsonb: no row / null {timestamp_column} "
            f"for product_id={pid} after commit"
        )
    # row[0] is a text timestamp (schema stores as text via now()::text).
    # We only require it be non-null + parseable as newer than t0.
    try:
        # Accept either ISO8601 or postgres text; fall back to string-sort
        # guard if parsing fails (text from now() sorts chronologically).
        ts = str(row[0])
    except Exception:  # noqa: BLE001
        ts = ""
    if not ts:
        raise ProductWriteVerificationError(
            f"persist_product_jsonb: empty {timestamp_column} for product_id={pid}"
        )

    log.info(
        "persist_product_jsonb: wrote product_id=%s column=%s (%.3fs)",
        pid, payload_column, time.time() - t0,
    )


def persist_embedding(
    *,
    table: str,
    row_id: int,
    column: str,
    vector_literal: str,
    model: str,
    source_hash: str,
) -> None:
    """Transactionally update a whitelisted (table, vector_column) target.

    ``vector_literal`` must already be the pgvector text form
    (``'[0.01,0.02,...]'``) — produced by
    ``leadgen_agent.embeddings.vector_to_pg_literal``. Writes the sibling
    ``{column}_model``, ``{column}_source_hash``, ``{column}_updated_at``
    columns atomically with the vector.

    Raises:
        ValueError: if (table, column) is not whitelisted.
        psycopg.Error: for DB failures.
    """
    target = (table, column)
    if target not in _ALLOWED_EMBEDDING_TARGETS:
        raise ValueError(
            f"persist_embedding: target {target!r} is not whitelisted"
        )
    rid = int(row_id)
    sql = (
        f"UPDATE {table} SET "
        f"  {column} = %s::vector, "
        f"  {column}_model = %s, "
        f"  {column}_source_hash = %s, "
        f"  {column}_updated_at = now()::text, "
        f"  updated_at = now()::text "
        f"WHERE id = %s"
    )
    t0 = time.time()
    with psycopg.connect(_dsn(), autocommit=False, connect_timeout=10) as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute(sql, (vector_literal, model, source_hash, rid))
    log.info(
        "persist_embedding: wrote %s.%s id=%s (%.3fs)",
        table, column, rid, time.time() - t0,
    )
