"""Cron job runners — invoked by ``POST /cron/tick`` in ``core/app.py``.

The CF Worker cron trigger (``triggers.crons`` in ``backend/core/wrangler.jsonc``)
fires the Worker's ``scheduled()`` handler, which does nothing but POST a
single wake-up request at this endpoint. All logic lives here in Python.

Three recurring jobs plus one weekly heavy-lift:

- ``ashby-nightly`` — daily at 06:17 UTC. Discovers new Ashby slugs via
  Brave Search (focus: AI-engineer keywords), then ingests each one
  sequentially. Idempotent.
- ``ashby-weekly`` — Mondays 06:47 UTC, signalled by ``full_refresh=True``.
  Skips discovery and re-ingests every slug already in ``ashby_slugs``.
  Catches new postings on boards that don't surface in Brave for AI-engineer
  queries.
- ``country-classify-nightly`` — every 6h at :23. Backfills
  ``companies.country`` for sales-tech companies with NULL country.
- ``remote-classify`` — every 4h at :37. Classifies D1 opportunities as
  remote/fully remote (rule-based, no LLM).
- ``enrich-sales-tech`` — weekly Sundays at 06:57 UTC. Fans out
  ``sales_tech_feature_graph`` across all sales-tech companies with websites.
  Heavy job (HTTP fetches + LLM calls per company) — runs weekly to keep
  feature profiles fresh.

Sequential ingest is non-negotiable per ``feedback_leadgen_langgraph_fanout``:
parallel calls against ``langgraph dev``-style single-worker runtimes poison
the queue when one is dropped. Same constraint applies to in-process
``ainvoke`` only because the Neon pool is conservatively sized.
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

import psycopg

log = logging.getLogger(__name__)


def _config() -> dict[str, Any]:
    """Build the per-call config LangGraph's AsyncPostgresSaver requires.

    Without a ``thread_id`` the checkpointer raises ``ValueError`` before
    the first node runs. We mint a fresh UUID per ``ainvoke`` since cron
    runs are stateless — the discovery/ingest graphs don't read prior
    checkpoint state, they just need a thread to write under.
    """
    return {"configurable": {"thread_id": str(uuid.uuid4())}}


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
            disc_state = await discovery.ainvoke(
                {
                    "keywords": list(_ASHBY_NIGHTLY_KEYWORDS),
                    "max_pages": 10,
                    "count": 20,
                    "skip_known": False,  # let ingest dedupe; we want freshness
                },
                config=_config(),
            )
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
            result = await ingest.ainvoke({"slug": slug}, config=_config())
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


async def run_country_classify_nightly(
    graphs: dict[str, Any],
) -> dict[str, Any]:
    """Backfill ``companies.country`` from ``location`` text via LangGraph.

    Scope: rows where ``country IS NULL AND location <> ''`` and the service
    taxonomy includes a sales-tech entry (Sales Engagement Platform / Lead
    Generation Software / CRM Software). The sales-tech tab applies a
    ``country_in: US+EU+UK+EEA`` predicate, so any row missing ``country``
    drops out of that tab — this cron mops them up.

    Sequential semantics: the bulk graph fans out internally under an
    ``asyncio.Semaphore``; we only call ``ainvoke`` once here so the
    ``feedback_leadgen_langgraph_fanout`` constraint (single-worker queue
    poisoning) doesn't apply.
    """
    started = time.monotonic()
    bulk = graphs.get("country_classify_bulk")
    if bulk is None:
        return {
            "ok": False,
            "error": "country_classify_bulk graph not compiled",
            "available": sorted(graphs.keys()),
        }

    try:
        result = await bulk.ainvoke(
            {
                "concurrency": 8,
                "apply": True,
                "only_sales_tech": True,
            },
            config=_config(),
        )
    except Exception as exc:  # noqa: BLE001
        log.exception("country-classify-nightly: bulk graph failed")
        return {
            "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
            "elapsed_s": round(time.monotonic() - started, 1),
        }

    summary = {
        "ok": True,
        "job": "country-classify-nightly",
        "count": int(result.get("count") or 0),
        "classified": int(result.get("classified_count") or 0),
        "applied": int(result.get("applied") or 0),
        "elapsed_s": round(time.monotonic() - started, 1),
    }
    log.info(
        "country-classify-nightly done count=%d classified=%d applied=%d elapsed=%.1fs",
        summary["count"], summary["classified"], summary["applied"], summary["elapsed_s"],
    )
    return summary


async def run_remote_classify(
    graphs: dict[str, Any],
) -> dict[str, Any]:
    """Classify D1 opportunities as remote / fully remote.

    Calls the ``remote_classify`` graph with ``limit=2000`` (max) to scan
    every open, unarchived D1 opportunity. Pure rule-based — no LLM calls.
    Result is logged; the graph does not write back to D1.
    """
    started = time.monotonic()
    graph = graphs.get("remote_classify")
    if graph is None:
        return {
            "ok": False,
            "error": "remote_classify graph not compiled",
            "available": sorted(graphs.keys()),
        }

    try:
        result = await graph.ainvoke({"limit": 2000}, config=_config())
    except Exception as exc:  # noqa: BLE001
        log.exception("remote-classify: graph failed")
        return {
            "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
            "elapsed_s": round(time.monotonic() - started, 1),
        }

    meta = result.get("graph_meta") or {}
    summary = {
        "ok": True,
        "job": "remote-classify",
        "total": int(result.get("total") or 0),
        "any_remote": int(result.get("any_remote") or 0),
        "fully_remote": int(result.get("fully_remote") or 0),
        "ai_any_remote": int(result.get("ai_any_remote") or 0),
        "ai_fully_remote": int(result.get("ai_fully_remote") or 0),
        "summary": meta.get("summary"),
        "elapsed_s": round(time.monotonic() - started, 1),
    }
    log.info(
        "remote-classify done total=%d any_remote=%d fully_remote=%d ai_fully=%d elapsed=%.1fs",
        summary["total"], summary["any_remote"], summary["fully_remote"],
        summary["ai_fully_remote"], summary["elapsed_s"],
    )
    return summary


async def run_enrich_sales_tech(
    graphs: dict[str, Any],
) -> dict[str, Any]:
    """Extract sales-tech feature profiles for every company with a website.

    Fans out ``sales_tech_feature_graph`` across all companies matching the
    sales-tech taxonomy filter (Sales Engagement Platform, Lead Generation
    Software, CRM Software) that have a ``website`` set. Skips companies that
    already have ``salestech`` features in ``deep_analysis`` (idempotent).

    This is a heavy job — each company takes 90-180s (HTTP fetches + 10 LLM
    calls). Runs weekly to keep profiles fresh without burning budget.
    """
    started = time.monotonic()
    graph = graphs.get("enrich_sales_tech")
    if graph is None:
        return {
            "ok": False,
            "error": "enrich_sales_tech graph not compiled",
            "available": sorted(graphs.keys()),
        }

    try:
        result = await graph.ainvoke({
            "concurrency": 2,
            "dry_run": False,
            "force": False,
        }, config=_config())
    except Exception as exc:  # noqa: BLE001
        log.exception("enrich-sales-tech: graph failed")
        return {
            "ok": False,
            "error": f"{type(exc).__name__}: {exc}",
            "elapsed_s": round(time.monotonic() - started, 1),
        }

    summary = result.get("summary") or {}
    return {
        "ok": True,
        "job": "enrich-sales-tech",
        **{k: v for k, v in summary.items() if k != "errors"},
        "errors": summary.get("errors") or [],
        "elapsed_s": round(time.monotonic() - started, 1),
    }
