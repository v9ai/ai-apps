"""Cron job runners — invoked by ``POST /cron/tick`` in ``core/app.py``.

The CF Worker cron trigger (``triggers.crons`` in ``backend/core/wrangler.jsonc``)
fires the Worker's ``scheduled()`` handler, which does nothing but POST a
single wake-up request at this endpoint. All logic lives here in Python.

Two jobs:

- ``ashby-nightly`` — daily at 06:17 UTC. Discovers new Ashby slugs via
  Brave Search (focus: AI-engineer keywords), then ingests each one
  sequentially. Idempotent.
- ``ashby-weekly`` — Mondays 06:47 UTC, signalled by ``full_refresh=True``.
  Skips discovery and re-ingests every slug already in ``ashby_slugs``.
  Catches new postings on boards that don't surface in Brave for AI-engineer
  queries.

Sequential ingest is non-negotiable per ``feedback_leadgen_langgraph_fanout``:
parallel calls against ``langgraph dev``-style single-worker runtimes poison
the queue when one is dropped. Same constraint applies to in-process
``ainvoke`` only because the Neon pool is conservatively sized.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any

import psycopg

log = logging.getLogger(__name__)


# Keywords focused on the user's ICP — remote-friendly AI engineering roles.
# "ai engineer" alone yielded 31 distinct slugs in the last manual run; the
# others widen coverage into adjacent surfaces (LLMs, agent frameworks,
# eval/observability, infrastructure).
_ASHBY_NIGHTLY_KEYWORDS: tuple[str, ...] = (
    "ai engineer",
    "machine learning engineer",
    "llm engineer",
    "agents",
    "langgraph",
    "rag",
    "ml infrastructure",
    "developer tools",
)


def _dsn() -> str:
    return (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )


async def _fetch_known_slugs() -> list[str]:
    """Read every slug we've ever discovered, oldest-first.

    Used by the weekly full refresh. Returns ``[]`` if the table is empty
    or if the DB is unreachable (logged, not raised — the cron will simply
    no-op rather than fail the whole tick).
    """
    dsn = _dsn()
    if not dsn:
        log.warning("ashby-weekly: no DSN, skipping")
        return []
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT slug FROM ashby_slugs ORDER BY last_seen ASC"
                )
                return [row[0] for row in cur.fetchall()]
    except psycopg.Error as exc:
        log.warning("ashby-weekly: ashby_slugs query failed: %s", exc)
        return []


async def run_ashby_nightly(
    graphs: dict[str, Any], *, full_refresh: bool = False
) -> dict[str, Any]:
    """Run the Ashby discover → ingest pipeline.

    Args:
        graphs: ``app.state.graphs`` — already-compiled LangGraphs.
        full_refresh: When True, skip discovery and ingest every slug from
            ``ashby_slugs`` instead. Used by the Monday cron.

    Returns a summary dict suitable for both logging and a JSON response.
    """
    started = time.monotonic()
    discovery = graphs.get("ashby_discovery")
    ingest = graphs.get("ashby_ingest")
    if discovery is None or ingest is None:
        return {
            "ok": False,
            "error": "ashby_discovery or ashby_ingest graph not compiled",
            "available": sorted(graphs.keys()),
        }

    # ── Phase 1: pick the slug list ────────────────────────────────────
    if full_refresh:
        slugs = await _fetch_known_slugs()
        discovery_summary: dict[str, Any] = {
            "skipped": True,
            "reason": "full_refresh",
            "known_slugs": len(slugs),
        }
    else:
        try:
            disc_state = await discovery.ainvoke({
                "keywords": list(_ASHBY_NIGHTLY_KEYWORDS),
                "max_pages": 10,
                "count": 20,
                "skip_known": False,  # let ingest dedupe; we want freshness
            })
        except Exception as exc:  # noqa: BLE001
            log.exception("ashby-nightly: discovery failed")
            return {
                "ok": False,
                "stage": "discovery",
                "error": f"{type(exc).__name__}: {exc}",
                "elapsed_s": round(time.monotonic() - started, 1),
            }
        slugs = list(disc_state.get("slugs") or [])
        discovery_summary = {
            "queries_run": disc_state.get("queries_run") or 0,
            "results_seen": disc_state.get("results_seen") or 0,
            "slugs": len(slugs),
            "new_slugs": len(disc_state.get("new_slugs") or []),
        }

    # ── Phase 2: sequential ingest ─────────────────────────────────────
    per_slug: list[dict[str, Any]] = []
    total_in = total_up = total_jobs = 0
    errors: list[str] = []
    for slug in slugs:
        try:
            result = await ingest.ainvoke({"slug": slug})
            ins = int(result.get("inserted") or 0)
            upd = int(result.get("updated") or 0)
            jobs = len(result.get("jobs") or [])
            err = result.get("_error") or ""
            total_in += ins
            total_up += upd
            total_jobs += jobs
            if err:
                errors.append(f"{slug}: {err}")
            per_slug.append({
                "slug": slug, "jobs": jobs, "inserted": ins, "updated": upd,
                "error": err or None,
            })
            log.info(
                "ashby-nightly slug=%s jobs=%d ins=%d upd=%d err=%s",
                slug, jobs, ins, upd, err or "-",
            )
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{slug}: {type(exc).__name__}: {exc}")
            per_slug.append({
                "slug": slug, "error": f"{type(exc).__name__}: {exc}",
            })
            log.exception("ashby-nightly slug=%s crashed", slug)

    summary = {
        "ok": True,
        "job": "ashby-nightly",
        "full_refresh": full_refresh,
        "discovery": discovery_summary,
        "ingest": {
            "slugs": len(slugs),
            "jobs_total": total_jobs,
            "jobs_inserted": total_in,
            "jobs_existing": total_up,
            "errors": len(errors),
        },
        "errors": errors[:20],  # cap so the response stays small
        "per_slug": per_slug,
        "elapsed_s": round(time.monotonic() - started, 1),
    }
    log.info(
        "ashby-nightly done full_refresh=%s slugs=%d ins=%d existing=%d "
        "errors=%d elapsed=%.1fs",
        full_refresh, len(slugs), total_in, total_up, len(errors),
        summary["elapsed_s"],
    )
    return summary
