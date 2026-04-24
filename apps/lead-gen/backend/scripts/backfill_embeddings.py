"""Backfill: populate products.icp_embedding and companies.profile_embedding.

Idempotent — skips rows whose ``*_source_hash`` already matches the current
composed text. Calls the local ``icp-embed`` Rust/Candle HTTP server in
batches of 32.

Usage (from backend/):
    python scripts/backfill_embeddings.py [--what products|companies|all]
                                           [--limit N]
                                           [--batch 32]
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parents[2]
_env_local = _ROOT / ".env.local"
_env_backend = Path(__file__).resolve().parents[1] / ".env"

for _envfile in (_env_backend, _env_local):
    if _envfile.exists():
        for line in _envfile.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k and k not in os.environ:
                os.environ[k] = v

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import psycopg  # noqa: E402

from leadgen_agent.db_columns import persist_embedding  # noqa: E402
from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402
from leadgen_agent.embeddings import (  # noqa: E402
    EMBED_MODEL,
    compose_company_profile_text,
    compose_product_icp_text,
    content_hash,
    embed_texts,
    vector_to_pg_literal,
)

log = logging.getLogger("backfill_embeddings")


def _iter_products(limit: int | None) -> list[dict[str, Any]]:
    sql = """
        SELECT id, icp_analysis, icp_embedding_source_hash
        FROM products
        WHERE icp_analysis IS NOT NULL
        ORDER BY id ASC
    """
    if limit:
        sql += f" LIMIT {int(limit)}"
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall() or []
            cols = [d[0] for d in cur.description or []]
    return [dict(zip(cols, r)) for r in rows]


def _iter_companies(limit: int | None) -> list[dict[str, Any]]:
    sql = """
        SELECT c.id, c.description, c.industry, c.tags,
               c.profile_embedding_source_hash,
               (
                 SELECT value_json
                 FROM company_facts f
                 WHERE f.company_id = c.id
                   AND f.field = 'classification.home'
                 ORDER BY f.created_at DESC
                 LIMIT 1
               ) AS home_fact,
               (
                 SELECT value_json
                 FROM company_facts f
                 WHERE f.company_id = c.id
                   AND f.field = 'classification.about'
                 ORDER BY f.created_at DESC
                 LIMIT 1
               ) AS about_fact
        FROM companies c
        WHERE c.blocked = false
        ORDER BY c.id ASC
    """
    if limit:
        sql += f" LIMIT {int(limit)}"
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall() or []
            cols = [d[0] for d in cur.description or []]
    return [dict(zip(cols, r)) for r in rows]


async def _embed_in_batches(
    items: list[tuple[int, str, str]],
    batch: int,
    table: str,
    column: str,
) -> int:
    """items: list of (row_id, text, hash). Returns count persisted."""
    written = 0
    for i in range(0, len(items), batch):
        chunk = items[i : i + batch]
        texts = [t[1] for t in chunk]
        try:
            vectors = await embed_texts(texts)
        except Exception as e:  # noqa: BLE001
            log.error("embed batch failed (%s-%s): %s", i, i + batch, e)
            continue
        for (row_id, _text, h), vec in zip(chunk, vectors):
            try:
                persist_embedding(
                    table=table,
                    row_id=row_id,
                    column=column,
                    vector_literal=vector_to_pg_literal(vec),
                    model=EMBED_MODEL,
                    source_hash=h,
                )
                written += 1
            except Exception as e:  # noqa: BLE001
                log.error("persist %s id=%s: %s", table, row_id, e)
        log.info("%s: wrote %s/%s", table, written, len(items))
    return written


async def backfill_products(limit: int | None, batch: int) -> int:
    rows = _iter_products(limit)
    pending: list[tuple[int, str, str]] = []
    for r in rows:
        icp = r.get("icp_analysis")
        if isinstance(icp, str):
            try:
                import json as _json
                icp = _json.loads(icp)
            except Exception:  # noqa: BLE001
                icp = None
        text = compose_product_icp_text(icp or {})
        if not text.strip() or text == "passage: ":
            continue
        h = content_hash(text)
        if r.get("icp_embedding_source_hash") == h:
            continue
        pending.append((int(r["id"]), text, h))
    log.info("products: %s rows to embed", len(pending))
    return await _embed_in_batches(pending, batch, "products", "icp_embedding")


async def backfill_companies(limit: int | None, batch: int) -> int:
    rows = _iter_companies(limit)
    pending: list[tuple[int, str, str]] = []
    for r in rows:
        facts = []
        if r.get("home_fact"):
            facts.append({"field": "classification.home", "value_json": r["home_fact"]})
        if r.get("about_fact"):
            facts.append({"field": "classification.about", "value_json": r["about_fact"]})
        company_row = {
            "description": r.get("description") or "",
            "industry": r.get("industry") or "",
            "tags": r.get("tags"),
        }
        text = compose_company_profile_text(company_row, facts)
        if not text.strip() or text == "query: ":
            continue
        h = content_hash(text)
        if r.get("profile_embedding_source_hash") == h:
            continue
        pending.append((int(r["id"]), text, h))
    log.info("companies: %s rows to embed", len(pending))
    return await _embed_in_batches(
        pending, batch, "companies", "profile_embedding"
    )


async def main() -> int:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    p = argparse.ArgumentParser()
    p.add_argument("--what", choices=["products", "companies", "all"], default="all")
    p.add_argument("--limit", type=int, default=None)
    p.add_argument("--batch", type=int, default=32)
    args = p.parse_args()

    total = 0
    if args.what in ("products", "all"):
        total += await backfill_products(args.limit, args.batch)
    if args.what in ("companies", "all"):
        total += await backfill_companies(args.limit, args.batch)
    log.info("done: wrote %s embeddings", total)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
