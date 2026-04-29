"""Bulk-classify contacts for AI hiring/buying intent using classify_ai_intent_graph.

Pulls contacts (default: decision-makers with no prior intent verdict), fetches
their recent LinkedIn posts from the D1 edge worker, runs the LLM classifier
with bounded concurrency, and writes a CSV.

Default is DRY-RUN: nothing is written to Neon. Pass ``--apply`` to merge the
verdict into ``contacts.enrich_status`` JSONB under key ``ai_intent`` for rows
where ``has_ai_intent`` AND ``confidence >= --threshold``.

Usage (from backend/):
    python scripts/classify_ai_intent_contacts.py                 # dry-run, all eligible
    python scripts/classify_ai_intent_contacts.py --limit 50      # smaller pass
    python scripts/classify_ai_intent_contacts.py --apply         # write
    python scripts/classify_ai_intent_contacts.py --apply --threshold 0.7
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
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

import httpx
import psycopg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from leadgen_agent.classify_ai_intent_graph import graph as ai_intent_graph  # noqa: E402
from leadgen_agent.deep_icp_graph import _dsn  # noqa: E402

log = logging.getLogger("classify_ai_intent_contacts")

DEFAULT_THRESHOLD = 0.6
METHOD_TAG = "classify-ai-intent-heuristic-v1"
DEFAULT_EDGE_URL = "https://agenticleadgen-edge.eeeew.workers.dev"
TENANT_ID = "public"
POSTS_PER_CONTACT = 10

SELECT_SQL = """
SELECT c.id,
       c.first_name,
       c.last_name,
       c.position,
       c.linkedin_url,
       c.company AS company_text,
       co.name   AS company_name,
       c.enrich_status
FROM contacts c
LEFT JOIN companies co ON co.id = c.company_id
WHERE c.id = ANY(%s)
  AND (c.do_not_contact IS NULL OR c.do_not_contact = false)
  AND (c.enrich_status IS NULL OR (c.enrich_status -> 'ai_intent') IS NULL)
ORDER BY c.id
"""

POSTS_PAGE_SIZE = 1000
POSTS_MAX_PAGES = 20  # 20 * 1000 = 20k posts scanned for contact_ids

UPDATE_SQL = (
    "UPDATE contacts "
    "SET enrich_status = COALESCE(enrich_status, '{}'::jsonb) "
    "                    || jsonb_build_object('ai_intent', %s::jsonb), "
    "    updated_at = now()::text "
    "WHERE id = %s"
)


def resolve_edge_url() -> str:
    return (
        os.environ.get("LEAD_GEN_EDGE_URL")
        or os.environ.get("EDGE_WORKER_URL")
        or DEFAULT_EDGE_URL
    )


def edge_token() -> str:
    tok = os.environ.get("JOBS_D1_TOKEN")
    if not tok:
        raise RuntimeError("JOBS_D1_TOKEN not set in env")
    return tok


async def fetch_contact_ids_with_posts(client: httpx.AsyncClient) -> list[int]:
    """Page through D1 /api/posts/d1 and collect distinct non-null contact_ids."""
    base = resolve_edge_url()
    headers = {"authorization": f"Bearer {edge_token()}"}
    seen: set[int] = set()
    for page in range(POSTS_MAX_PAGES):
        params = {
            "tenantId": TENANT_ID,
            "type": "post",
            "limit": str(POSTS_PAGE_SIZE),
            "offset": str(page * POSTS_PAGE_SIZE),
        }
        r = await client.get(
            f"{base}/api/posts/d1", params=params, headers=headers, timeout=60.0
        )
        if r.status_code != 200:
            log.warning("posts page %d -> %d: %s", page, r.status_code, r.text[:120])
            break
        rows = r.json().get("posts") or []
        if not rows:
            break
        for row in rows:
            cid = row.get("contact_id")
            if isinstance(cid, int) and cid > 0:
                seen.add(cid)
        if len(rows) < POSTS_PAGE_SIZE:
            break
    return sorted(seen)


async def fetch_posts(client: httpx.AsyncClient, contact_id: int) -> list[str]:
    base = resolve_edge_url()
    params = {
        "contactId": str(contact_id),
        "tenantId": TENANT_ID,
        "type": "post",
        "limit": str(POSTS_PER_CONTACT),
    }
    r = await client.get(
        f"{base}/api/posts/d1",
        params=params,
        headers={"authorization": f"Bearer {edge_token()}"},
        timeout=30.0,
    )
    if r.status_code != 200:
        log.warning("posts fetch %s -> %d: %s", contact_id, r.status_code, r.text[:120])
        return []
    payload = r.json()
    rows = payload.get("posts") or []
    texts: list[str] = []
    for row in rows:
        text = (row.get("post_text") or row.get("content") or "").strip()
        if text:
            texts.append(text)
    return texts


async def classify_one(
    row: dict[str, Any],
    sem: asyncio.Semaphore,
    client: httpx.AsyncClient,
) -> dict[str, Any]:
    async with sem:
        try:
            posts = await fetch_posts(client, int(row["id"]))
        except Exception as exc:  # noqa: BLE001
            log.warning("posts fetch failed for %s: %s", row["id"], exc)
            posts = []

        full_name = " ".join(
            p for p in [row.get("first_name"), row.get("last_name")] if p
        ).strip()
        company_name = (row.get("company_name") or row.get("company_text") or "").strip()

        final_state = await ai_intent_graph.ainvoke(
            {
                "contact_id": int(row["id"]),
                "name": full_name,
                "headline": row.get("position") or "",
                "company_name": company_name,
                "posts": posts,
            }
        )
        verdict = {
            "has_ai_intent": bool(final_state.get("has_ai_intent")),
            "intent_kind": final_state.get("intent_kind") or "none",
            "confidence": float(final_state.get("confidence") or 0.0),
            "reasons": final_state.get("reasons") or [],
        }
    return {
        **row,
        **verdict,
        "post_count": len(posts),
    }


async def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="cap rows for testing")
    parser.add_argument("--concurrency", type=int, default=8)
    parser.add_argument("--apply", action="store_true", help="write verdicts to DB")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help=f"min confidence to apply (default {DEFAULT_THRESHOLD})",
    )
    parser.add_argument("--out", default="classify_ai_intent_results.csv")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    sql = SELECT_SQL
    if args.limit:
        sql = sql + f" LIMIT {int(args.limit)}"

    sem = asyncio.Semaphore(args.concurrency)
    t0 = time.perf_counter()

    async with httpx.AsyncClient() as client:
        candidate_ids = await fetch_contact_ids_with_posts(client)
        log.info("D1 reports %d contacts with posts", len(candidate_ids))
        if not candidate_ids:
            log.info("no contacts have posts in D1 — nothing to classify.")
            return 0

        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (candidate_ids,))
                cols = [d[0] for d in cur.description or []]
                rows = [dict(zip(cols, r)) for r in cur.fetchall()]

        log.info("loaded %d eligible contacts (with posts)", len(rows))
        if not rows:
            return 0

        tasks = [classify_one(r, sem, client) for r in rows]
        done = 0
        results: list[dict[str, Any]] = []
        for fut in asyncio.as_completed(tasks):
            res = await fut
            results.append(res)
            done += 1
            if done % 25 == 0 or done == len(rows):
                log.info(
                    "%d/%d  hits=%d  elapsed=%.1fs",
                    done,
                    len(rows),
                    sum(1 for r in results if r.get("has_ai_intent")),
                    time.perf_counter() - t0,
                )

    results.sort(key=lambda r: r["id"])

    out_path = Path(args.out)
    with out_path.open("w", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(
            [
                "id",
                "name",
                "position",
                "company",
                "post_count",
                "has_ai_intent",
                "intent_kind",
                "confidence",
                "reasons",
            ]
        )
        for r in results:
            full_name = " ".join(
                p for p in [r.get("first_name"), r.get("last_name")] if p
            ).strip()
            writer.writerow(
                [
                    r["id"],
                    full_name,
                    r.get("position") or "",
                    r.get("company_name") or r.get("company_text") or "",
                    r.get("post_count") or 0,
                    bool(r.get("has_ai_intent")),
                    r.get("intent_kind") or "none",
                    float(r.get("confidence") or 0.0),
                    " | ".join(r.get("reasons") or []),
                ]
            )

    hits = [r for r in results if r.get("has_ai_intent")]
    high_conf = [r for r in hits if float(r.get("confidence") or 0.0) >= args.threshold]
    log.info(
        "verdicts: total=%d  has_ai_intent=%d  high_conf(>=%.2f)=%d  csv=%s",
        len(results),
        len(hits),
        args.threshold,
        len(high_conf),
        out_path,
    )

    if not args.apply:
        log.info("dry-run: no DB writes. re-run with --apply to persist.")
        return 0

    log.info("applying %d ai_intent updates to DB...", len(high_conf))
    now_iso = datetime.now(timezone.utc).isoformat()
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            for r in high_conf:
                payload = {
                    "method": METHOD_TAG,
                    "has_ai_intent": True,
                    "intent_kind": r.get("intent_kind") or "none",
                    "confidence": float(r["confidence"]),
                    "reasons": r.get("reasons") or [],
                    "post_count": int(r.get("post_count") or 0),
                    "classified_at": now_iso,
                }
                cur.execute(UPDATE_SQL, (json.dumps(payload), int(r["id"])))
    log.info("done.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
