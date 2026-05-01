"""Per-board Ashby ingest graph.

Pulls one Ashby public job board (``slug``):

    fetch  →  link_company  →  post_to_d1  →  emit_intent_signal

Storage split (matches the LinkedIn-extension precedent):
- **D1** (Cloudflare, via the edge worker `agenticleadgen-edge`) is the
  canonical home for ``opportunities``. We POST batches to
  ``${LEAD_GEN_EDGE_URL}/api/jobs/d1/import`` with bearer ``JOBS_D1_TOKEN``.
- **Neon** still owns ``companies`` (``link_company``) and ``intent_signals``
  (``emit_intent_signal``) so company-level views and freshness/decay
  scoring keep working without cross-DB joins.

The edge worker accepts a per-job ``source`` field (defaults to ``linkedin``
for back-compat) — we send ``ashby:<slug>`` and a ``companyKey=<slug>``
override so the D1 ``companies`` row gets the canonical Ashby slug as its
key, not a LinkedIn-URL-derived heuristic.

State is a ``TypedDict``; **every** field a node returns must be declared
(memory: ``feedback_langgraph_typeddict_drops_fields``).
"""

from __future__ import annotations

import json
import logging
import math
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

import httpx
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


_WHITESPACE_RE = re.compile(r"\s+")


def _clean_title(s: str) -> str:
    return _WHITESPACE_RE.sub(" ", s or "").strip() or "(untitled)"


def _job_tags(job: dict[str, Any]) -> list[str]:
    tags: list[str] = []
    if job.get("workplaceType"):
        tags.append(str(job["workplaceType"]).lower())
    if job.get("employmentType"):
        tags.append(str(job["employmentType"]).lower())
    if job.get("isRemote"):
        tags.append("remote")
    # Dedup while preserving order — workplaceType="Remote" + isRemote=true
    # would otherwise emit two "remote" tags.
    return list(dict.fromkeys(tags))


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


# ── Node 3: post_to_d1 ────────────────────────────────────────────────────────


async def post_to_d1(state: AshbyIngestState) -> dict[str, Any]:
    """POST the Ashby jobs as a batch to the edge-worker D1 import route.

    The edge worker (apps/lead-gen/edge/src/index.ts → handleJobsD1Import)
    upserts companies + opportunities in D1, deduping on ``url``. We send
    ``source='ashby:<slug>'`` and ``companyKey=<slug>`` so D1's
    ``companies.key`` matches the canonical Ashby slug.
    """
    if state.get("_error"):
        return {"inserted": 0, "updated": 0}
    slug = (state.get("slug") or "").strip().lower()
    jobs = state.get("jobs") or []
    if not jobs:
        return {"inserted": 0, "updated": 0}

    edge_url = os.environ.get("LEAD_GEN_EDGE_URL", "").rstrip("/")
    token = os.environ.get("JOBS_D1_TOKEN", "").strip()
    if not edge_url or not token:
        return {"_error": "LEAD_GEN_EDGE_URL / JOBS_D1_TOKEN not set"}

    company_display = slug.replace("-", " ").title()
    payload_jobs: list[dict[str, Any]] = []
    for job in jobs:
        url = job.get("applyUrl")
        if not url:
            continue
        payload_jobs.append({
            "title": _clean_title(job.get("title") or ""),
            "company": company_display,
            "companyKey": slug,
            "source": f"ashby:{slug}",
            "url": url,
            "location": job.get("location"),
            "description": job.get("descriptionPlain"),
            "postedAt": job.get("publishedAt"),
            "workplaceType": job.get("workplaceType"),
            "employmentType": job.get("employmentType"),
            "externalApplyUrl": url,
        })

    if not payload_jobs:
        return {"inserted": 0, "updated": 0}

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{edge_url}/api/jobs/d1/import",
                headers={
                    "Authorization": f"Bearer {token}",
                    "content-type": "application/json",
                },
                json={"jobs": payload_jobs},
            )
            resp.raise_for_status()
            body = resp.json()
    except httpx.HTTPError as exc:
        log.warning("d1 import HTTP error slug=%s: %s", slug, exc)
        return {"_error": f"d1 import: {exc}"}

    inserted = int(body.get("inserted") or 0)
    detail = body.get("detail") or {}
    updated = int(detail.get("skippedExisting") or 0)
    log.info(
        "ashby_ingest→d1 slug=%s sent=%d inserted=%d existing=%d",
        slug, len(payload_jobs), inserted, updated,
    )
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
    g.add_node("post_to_d1", post_to_d1)
    g.add_node("emit_intent_signal", emit_intent_signal)
    g.add_edge(START, "fetch")
    g.add_edge("fetch", "link_company")
    g.add_edge("link_company", "post_to_d1")
    g.add_edge("post_to_d1", "emit_intent_signal")
    g.add_edge("emit_intent_signal", END)
    return g.compile(checkpointer=checkpointer)


graph = build_graph()
