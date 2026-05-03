"""Bulk sales-tech company enrichment graph.

Fans out ``sales_tech_feature_graph`` across every company under
``/companies?tab=sales-tech``. Extracts 9 evidence-anchored aspects per
company (overview, ICP, pricing, integrations, GTM, differentiators,
security, AI capabilities, competitors) and persists to ``company_facts``
and ``companies.deep_analysis``.

Flow: load_companies -> enrich_all -> summarize

Concurrency controlled via ``asyncio.Semaphore`` (default 2). Each company
spawns 10+ LLM calls internally in the subgraph, so higher values risk rate
limits.

Input:
    limit        — max companies to process. None = all eligible.
    concurrency  — semaphore width (default 2)
    dry_run      — skip persist (default False)
    force        — re-process companies that already have features (default False)

Output:
    summary — {total, eligible, skipped_fresh, succeeded, failed, total_cost_usd,
               total_model_calls, elapsed_s, errors[], per_company[]}
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .sales_tech_feature_graph import graph as _feature_graph

log = logging.getLogger(__name__)

# Mirror of src/components/companies-list.tsx:239-247
_TAXONOMY_SQL = (
    "service_taxonomy::jsonb ?|"
    " array['Sales Engagement Platform','Lead Generation Software','CRM Software']"
)


def _dsn() -> str:
    return (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )


# ── State ─────────────────────────────────────────────────────────────────


class EnrichSalesTechState(TypedDict, total=False):
    limit: int | None
    concurrency: int
    dry_run: bool
    force: bool

    company_rows: list[dict[str, Any]]
    skipped_fresh: int

    total_cost_usd: float
    total_model_calls: int
    succeeded: int
    failed: int
    errors: list[dict[str, Any]]
    per_company: list[dict[str, Any]]

    summary: dict[str, Any]


# ── Node 1: load eligible companies ───────────────────────────────────────


_SELECT_SQL = f"""\
SELECT id, key, name, canonical_domain, website, description, deep_analysis
FROM companies
WHERE {_TAXONOMY_SQL}
  AND (blocked IS NULL OR blocked = false)
  AND website IS NOT NULL
  AND website <> ''
ORDER BY score DESC NULLS LAST, id ASC
"""


def _load_rows(limit: int | None) -> list[dict[str, Any]]:
    sql = _SELECT_SQL
    if limit:
        sql += f" LIMIT {int(limit)}"
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cols = [d[0] for d in cur.description or []]
            return [dict(zip(cols, r)) for r in cur.fetchall()]


def _has_existing_features(deep_analysis: Any) -> bool:
    """True if ``deep_analysis`` already contains a ``salestech`` key with
    non-trivial data, meaning ``sales_tech_feature_graph`` already ran."""
    if deep_analysis is None:
        return False
    if isinstance(deep_analysis, str):
        import json
        try:
            deep_analysis = json.loads(deep_analysis)
        except (json.JSONDecodeError, TypeError):
            return False
    if not isinstance(deep_analysis, dict):
        return False
    st = deep_analysis.get("salestech")
    return isinstance(st, dict) and bool(st.get("overview") or st.get("summary"))


async def load_companies(state: EnrichSalesTechState) -> dict:
    limit = state.get("limit")
    force = bool(state.get("force"))

    rows = await asyncio.to_thread(_load_rows, limit)

    if not force:
        eligible = [r for r in rows if not _has_existing_features(r.get("deep_analysis"))]
        skipped = len(rows) - len(eligible)
    else:
        eligible = rows
        skipped = 0

    log.info(
        "load_companies: %d total, %d eligible, %d skipped (already enriched)",
        len(rows), len(eligible), skipped,
    )
    return {"company_rows": eligible, "skipped_fresh": skipped}


# ── Node 2: fan-out enrichment ────────────────────────────────────────────


_PER_COMPANY_TIMEOUT = 300  # seconds — a single company's feature extraction


async def enrich_all(state: EnrichSalesTechState) -> dict:
    rows = state.get("company_rows") or []
    concurrency = max(1, int(state.get("concurrency") or 2))
    dry_run = bool(state.get("dry_run"))

    if not rows:
        return {
            "succeeded": 0, "failed": 0,
            "total_cost_usd": 0.0, "total_model_calls": 0,
            "errors": [], "per_company": [],
        }

    sem = asyncio.Semaphore(concurrency)
    errors: list[dict[str, Any]] = []
    per_company: list[dict[str, Any]] = []
    succeeded = 0
    failed = 0
    total_cost = 0.0
    total_calls = 0
    t0 = time.perf_counter()

    async def _enrich_one(row: dict[str, Any]) -> dict[str, Any]:
        cid = int(row["id"])
        name = row.get("name") or f"id={cid}"
        async with sem:
            try:
                result = await asyncio.wait_for(
                    _feature_graph.ainvoke({
                        "company_id": cid,
                        "dry_run": dry_run,
                    }),
                    timeout=_PER_COMPANY_TIMEOUT,
                )
            except asyncio.TimeoutError:
                return {"id": cid, "name": name, "error": "timeout", "ok": False}
            except Exception as exc:
                return {"id": cid, "name": name, "error": f"{type(exc).__name__}: {exc}", "ok": False}

        err = result.get("_error")
        if err:
            return {"id": cid, "name": name, "error": err, "ok": False}

        return {
            "id": cid,
            "name": name,
            "ok": True,
            "confidence": result.get("confidence"),
            "persisted": result.get("persisted"),
            "cost_usd": result.get("cost_usd") or 0.0,
            "model_calls": result.get("model_calls") or 0,
        }

    tasks = [_enrich_one(r) for r in rows]
    done = 0
    for fut in asyncio.as_completed(tasks):
        res = await fut
        done += 1
        per_company.append(res)

        if res.get("ok"):
            succeeded += 1
            total_cost += float(res.get("cost_usd") or 0)
            total_calls += int(res.get("model_calls") or 0)
            log.info(
                "enrich[%d] %s ok confidence=%.2f cost=$%.4f calls=%d",
                res["id"], res["name"],
                res.get("confidence") or 0,
                res.get("cost_usd") or 0,
                res.get("model_calls") or 0,
            )
        else:
            failed += 1
            err_entry = {
                "company_id": res["id"],
                "company_name": res["name"],
                "error": res.get("error", "unknown"),
            }
            errors.append(err_entry)
            log.warning("enrich[%d] %s FAILED: %s", res["id"], res["name"], res.get("error"))

        if done % 10 == 0 or done == len(rows):
            elapsed = time.perf_counter() - t0
            rate = done / elapsed if elapsed > 0 else 0
            log.info(
                "%d/%d ok=%d fail=%d cost=$%.4f calls=%d elapsed=%.1fs (%.1f/min)",
                done, len(rows), succeeded, failed,
                total_cost, total_calls, elapsed, rate * 60,
            )

    return {
        "succeeded": succeeded,
        "failed": failed,
        "total_cost_usd": round(total_cost, 6),
        "total_model_calls": total_calls,
        "errors": errors,
        "per_company": per_company,
    }


# ── Node 3: summarize ─────────────────────────────────────────────────────


async def summarize(state: EnrichSalesTechState) -> dict:
    summary = {
        "total_loaded": len(state.get("company_rows") or []),
        "skipped_fresh": int(state.get("skipped_fresh") or 0),
        "succeeded": int(state.get("succeeded") or 0),
        "failed": int(state.get("failed") or 0),
        "total_cost_usd": float(state.get("total_cost_usd") or 0),
        "total_model_calls": int(state.get("total_model_calls") or 0),
        "dry_run": bool(state.get("dry_run")),
        "force": bool(state.get("force")),
        "concurrency": int(state.get("concurrency") or 2),
        "error_count": len(state.get("errors") or []),
        "errors": state.get("errors") or [],
    }
    log.info("enrich_sales_tech done: %s", {k: v for k, v in summary.items() if k != "errors"})
    return {"summary": summary}


# ── Graph ─────────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(EnrichSalesTechState)
    builder.add_node("load_companies", load_companies)
    builder.add_node("enrich_all", enrich_all)
    builder.add_node("summarize", summarize)

    builder.add_edge(START, "load_companies")
    builder.add_edge("load_companies", "enrich_all")
    builder.add_edge("enrich_all", "summarize")
    builder.add_edge("summarize", END)

    if checkpointer is not None:
        return builder.compile(checkpointer=checkpointer)
    return builder.compile()


graph = build_graph()
