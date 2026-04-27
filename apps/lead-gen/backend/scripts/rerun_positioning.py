"""One-shot script: run competitors_team for products without competitor data,
then re-run positioning for all products.

Usage (from backend/):
    python scripts/rerun_positioning.py

Reads NEON_DATABASE_URL and DEEPSEEK_API_KEY from the project .env.local file.
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

# ── Load env vars ─────────────────────────────────────────────────────────
_ROOT = Path(__file__).resolve().parents[2]  # apps/lead-gen/
_env_local = _ROOT / ".env.local"
_env_backend = Path(__file__).resolve().parents[1] / ".env"

for _envfile in (_env_backend, _env_local):  # backend .env first, then override
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

import psycopg

# ── Import graphs (after env is set) ──────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from leadgen_agent.competitors_team_graph import build_graph as build_competitors_team
from leadgen_agent.positioning_graph import build_graph as build_positioning
from leadgen_agent.deep_icp_graph import _dsn

TENANT_ID = "vadim"
PRODUCT_IDS = [1, 2, 3]


async def ensure_competitors_for_product(
    ct_graph, conn: psycopg.AsyncConnection, product_id: int
) -> int:
    """Run competitors_team if this product has no suggested/approved/done
    competitors yet. Returns the number of competitors now available."""
    async with conn.cursor() as cur:
        await cur.execute(
            """
            SELECT COUNT(*)::int
            FROM competitor_analyses a
            JOIN competitors c ON c.analysis_id = a.id
            WHERE a.product_id = %s
              AND c.status IN ('done', 'approved', 'suggested')
            """,
            (product_id,),
        )
        row = await cur.fetchone()
        existing = (row or (0,))[0]

    if existing > 0:
        print(f"  product {product_id}: {existing} competitors already exist, skipping run")
        return existing

    print(f"  product {product_id}: no competitors found, running competitors_team …")
    result = await ct_graph.ainvoke({"product_id": product_id})
    competitors: list[dict] = result.get("competitors") or []
    if not competitors:
        print(f"  product {product_id}: competitors_team returned 0 candidates")
        return 0

    # Persist: create analysis row + insert suggested competitors
    async with conn.cursor() as cur:
        await cur.execute(
            """
            INSERT INTO competitor_analyses (tenant_id, product_id, status)
            VALUES (%s, %s, 'pending_approval')
            RETURNING id
            """,
            (TENANT_ID, product_id),
        )
        row = await cur.fetchone()
        analysis_id = row[0]

        for c in competitors:
            await cur.execute(
                """
                INSERT INTO competitors
                  (tenant_id, analysis_id, name, url, domain, description,
                   positioning_headline, positioning_tagline, target_audience, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'suggested')
                """,
                (
                    TENANT_ID,
                    analysis_id,
                    c.get("name", "")[:255],
                    c.get("url", "")[:512],
                    c.get("domain", "")[:255],
                    c.get("description", "")[:1000],
                    c.get("positioning_headline", "")[:512],
                    c.get("positioning_tagline", "")[:512],
                    c.get("target_audience", "")[:512],
                ),
            )
        await conn.commit()

    print(f"  product {product_id}: inserted {len(competitors)} suggested competitors (analysis_id={analysis_id})")
    return len(competitors)


async def run_positioning_for_product(pos_graph, product_id: int) -> bool:
    print(f"  product {product_id}: running positioning graph …")
    try:
        result = await asyncio.wait_for(
            pos_graph.ainvoke({"product_id": product_id}),
            timeout=600,
        )
        stmt = (result.get("positioning") or {}).get("positioning_statement", "")
        frame = (result.get("positioning") or {}).get("competitor_frame") or []
        print(f"  product {product_id}: done — competitor_frame={len(frame)} entries")
        if stmt:
            print(f"    statement: {stmt[:120]}…")
        return True
    except Exception as e:
        print(f"  product {product_id}: positioning FAILED — {e}")
        return False


async def main() -> None:
    dsn = _dsn()
    if not dsn:
        print("ERROR: NEON_DATABASE_URL / DATABASE_URL not set", file=sys.stderr)
        sys.exit(1)

    ct_graph = build_competitors_team()
    pos_graph = build_positioning()

    # Use an async connection for competitor inserts
    aconn = await psycopg.AsyncConnection.connect(dsn, autocommit=False)

    print("=== Phase 1: ensure competitors ===")
    for pid in PRODUCT_IDS:
        await ensure_competitors_for_product(ct_graph, aconn, pid)

    await aconn.close()

    print("\n=== Phase 2: re-run positioning ===")
    for pid in PRODUCT_IDS:
        await run_positioning_for_product(pos_graph, pid)

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
