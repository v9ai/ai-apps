"""Per-board Ashby ingest graph.

Pulls one Ashby public job board (``slug``) into the lead-gen Neon DB:

    fetch  →  link_company  →  upsert_opportunities  →  emit_intent_signal

State is a ``TypedDict``; **every** field a node returns must be declared
here, otherwise LangGraph silently drops it (memory:
``feedback_langgraph_typeddict_drops_fields``).

Mapping from Ashby JSON → ``opportunities``:
    url           ← applyUrl
    source        ← f"ashby:{slug}"
    raw_context   ← descriptionPlain
    metadata      ← JSON of full Ashby payload (incl. compensation)
    tags          ← JSON of [workplaceType, employmentType, "remote" if isRemote]
    title         ← title
    first_seen    ← only set on insert
    last_seen     ← refreshed every run

Idempotency: ``ON CONFLICT (url) DO UPDATE SET ...``. The unique partial
index ``opportunities_url_unique`` (migration 0082) guards this.
"""

from __future__ import annotations

import json
import logging
import math
import os
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .ashby_client import AshbyClient

log = logging.getLogger(__name__)

# Mirror src/apollo/resolvers/voyager.ts so the hiring_intent rows produced by
# Voyager and Ashby decay on the same curve.
HIRING_INTENT_DECAY_DAYS = 30
HIRING_INTENT_BASE_CONFIDENCE = 0.75


class AshbyIngestState(TypedDict, total=False):
    # input
    slug: str
    # plumbing between nodes
    jobs: list[dict[str, Any]]
    company_id: int | None
    # outputs
    inserted: int
    updated: int
    intent_signal_id: int | None
    titles: list[str]
    _error: str
    graph_meta: dict[str, Any]


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError("NEON_DATABASE_URL / DATABASE_URL not set")
    return dsn


def _opp_id() -> str:
    return f"opp_{int(time.time() * 1000)}_{secrets.token_hex(4)}"


# ── Node 1: fetch ─────────────────────────────────────────────────────────────


async def fetch(state: AshbyIngestState) -> dict[str, Any]:
    slug = (state.get("slug") or "").strip().lower()
    if not slug:
        return {"_error": "slug is required"}
    async with AshbyClient(slug) as client:
        jobs = await client.fetch_jobs()
    return {
        "jobs": [
            {
                "jobId": j.jobId,
                "title": j.title,
                "applyUrl": j.applyUrl,
                "descriptionPlain": j.descriptionPlain,
                "isRemote": j.isRemote,
                "workplaceType": j.workplaceType,
                "employmentType": j.employmentType,
                "location": j.location,
                "publishedAt": j.publishedAt,
                "compensation": j.compensation,
                "raw": j.raw,
            }
            for j in jobs
        ],
        "titles": [j.title for j in jobs],
    }


# ── Node 2: link_company ──────────────────────────────────────────────────────


async def link_company(state: AshbyIngestState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    slug = (state.get("slug") or "").strip().lower()
    if not slug:
        return {"_error": "slug is required"}

    company_id: int | None = None
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM companies WHERE key = %s", (slug,))
                row = cur.fetchone()
                if row:
                    company_id = int(row[0])
                else:
                    now = datetime.now(timezone.utc).isoformat()
                    cur.execute(
                        """
                        INSERT INTO companies
                          (key, name, job_board_url, category, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (key) DO UPDATE SET updated_at = EXCLUDED.updated_at
                        RETURNING id
                        """,
                        (
                            slug,
                            slug.replace("-", " ").title(),
                            f"https://jobs.ashbyhq.com/{slug}",
                            "UNKNOWN",
                            now,
                            now,
                        ),
                    )
                    fetched = cur.fetchone()
                    company_id = int(fetched[0]) if fetched else None
    except psycopg.Error as exc:
        log.warning("link_company failed slug=%s: %s", slug, exc)
        return {"_error": f"link_company: {exc}"}
    return {"company_id": company_id}


# ── Node 3: upsert_opportunities ──────────────────────────────────────────────


async def upsert_opportunities(state: AshbyIngestState) -> dict[str, Any]:
    if state.get("_error"):
        return {"inserted": 0, "updated": 0}
    slug = (state.get("slug") or "").strip().lower()
    jobs = state.get("jobs") or []
    company_id = state.get("company_id")
    if not jobs:
        return {"inserted": 0, "updated": 0}

    inserted = 0
    updated = 0
    now = datetime.now(timezone.utc).isoformat()
    source = f"ashby:{slug}"

    try:
        conn = psycopg.connect(_dsn(), autocommit=False, connect_timeout=10)
    except psycopg.Error as exc:
        log.warning("opportunities connect failed: %s", exc)
        return {"_error": f"opportunities connect: {exc}"}

    try:
        with conn.cursor() as cur:
            for job in jobs:
                url = job.get("applyUrl")
                if not url:
                    continue
                title = job.get("title") or "(untitled)"
                raw_context = job.get("descriptionPlain") or ""
                metadata = json.dumps({
                    "ashby": {k: v for k, v in job.items() if k != "raw"},
                    "source_slug": slug,
                })
                tags_arr = []
                if job.get("workplaceType"):
                    tags_arr.append(str(job["workplaceType"]).lower())
                if job.get("employmentType"):
                    tags_arr.append(str(job["employmentType"]).lower())
                if job.get("isRemote"):
                    tags_arr.append("remote")
                tags = json.dumps(tags_arr)

                cur.execute(
                    """
                    INSERT INTO opportunities
                      (id, title, url, source, status, raw_context, metadata,
                       tags, company_id, first_seen, last_seen, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, 'open', %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (url) DO UPDATE SET
                      title       = EXCLUDED.title,
                      source      = EXCLUDED.source,
                      raw_context = EXCLUDED.raw_context,
                      metadata    = EXCLUDED.metadata,
                      tags        = EXCLUDED.tags,
                      company_id  = COALESCE(opportunities.company_id, EXCLUDED.company_id),
                      last_seen   = EXCLUDED.last_seen,
                      updated_at  = EXCLUDED.updated_at
                    RETURNING (xmax = 0) AS inserted
                    """,
                    (
                        _opp_id(), title, url, source, raw_context, metadata, tags,
                        company_id, now, now, now, now,
                    ),
                )
                row = cur.fetchone()
                if row and row[0]:
                    inserted += 1
                else:
                    updated += 1
        conn.commit()
    except psycopg.Error as exc:
        conn.rollback()
        log.warning("opportunities upsert failed: %s", exc)
        return {"_error": f"opportunities upsert: {exc}"}
    finally:
        conn.close()

    log.info("ashby_ingest slug=%s inserted=%d updated=%d", slug, inserted, updated)
    return {"inserted": inserted, "updated": updated}


# ── Node 4: emit_intent_signal ────────────────────────────────────────────────


async def emit_intent_signal(state: AshbyIngestState) -> dict[str, Any]:
    if state.get("_error"):
        return {"intent_signal_id": None}
    company_id = state.get("company_id")
    titles = state.get("titles") or []
    slug = (state.get("slug") or "").strip().lower()
    if not company_id or not titles:
        return {"intent_signal_id": None}

    job_count = len(titles)
    confidence = min(
        HIRING_INTENT_BASE_CONFIDENCE + math.log1p(job_count) * 0.08,
        0.98,
    )
    now = datetime.now(timezone.utc)
    decays_at = now + timedelta(days=HIRING_INTENT_DECAY_DAYS)
    raw_text = (
        f"{job_count} open posting{'s' if job_count != 1 else ''} on Ashby "
        f"({slug}): {', '.join(titles[:10])}"
        + ("…" if job_count > 10 else "")
    )
    evidence = json.dumps([
        f"{job_count} open Ashby postings",
        f"Source: api.ashbyhq.com posting-api ({slug})",
        f"Synced at {now.isoformat()}",
    ])
    metadata = json.dumps({"slug": slug, "job_count": job_count, "titles": titles})

    signal_id: int | None = None
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO intent_signals
                      (company_id, signal_type, source_type, source_url,
                       raw_text, evidence, confidence,
                       detected_at, decays_at, decay_days,
                       metadata, model_version, created_at)
                    VALUES (%s, 'hiring_intent', 'job_posting', %s,
                            %s, %s, %s,
                            %s, %s, %s,
                            %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        company_id,
                        f"https://jobs.ashbyhq.com/{slug}",
                        raw_text,
                        evidence,
                        confidence,
                        now.isoformat(),
                        decays_at.isoformat(),
                        HIRING_INTENT_DECAY_DAYS,
                        metadata,
                        "ashby-ingest-v1",
                        now.isoformat(),
                    ),
                )
                row = cur.fetchone()
                signal_id = int(row[0]) if row else None
    except psycopg.Error as exc:
        log.warning("intent_signal insert failed: %s", exc)
        return {"intent_signal_id": None}
    return {"intent_signal_id": signal_id}


# ── Build graph ───────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    g = StateGraph(AshbyIngestState)
    g.add_node("fetch", fetch)
    g.add_node("link_company", link_company)
    g.add_node("upsert_opportunities", upsert_opportunities)
    g.add_node("emit_intent_signal", emit_intent_signal)
    g.add_edge(START, "fetch")
    g.add_edge("fetch", "link_company")
    g.add_edge("link_company", "upsert_opportunities")
    g.add_edge("upsert_opportunities", "emit_intent_signal")
    g.add_edge("emit_intent_signal", END)
    return g.compile(checkpointer=checkpointer)


graph = build_graph()
