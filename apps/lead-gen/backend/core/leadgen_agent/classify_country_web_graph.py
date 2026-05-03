"""Classify country from website content for companies missing country.

Scrapes the homepage of each eligible company, extracts country/region from
page text (footer, contact, address patterns) via LLM, and updates
``companies.country`` for high-confidence verdicts.

Flow: load_candidates -> classify_all -> summarize

Only targets companies that:
  - Match sales-tech taxonomy
  - Have NULL/empty country
  - Have NULL/empty location (the ``country_classify_bulk`` graph already
    handles rows with location text)
  - Have a non-empty website URL

Input:
    limit       — max companies to process (None = all eligible)
    concurrency — semaphore width (default 4)
    apply       — actually UPDATE the DB (default True)

Output:
    summary — {total, classified, applied, elapsed_s, errors[]}
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from typing import Any, TypedDict

import psycopg
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json_with_telemetry, make_deepseek_flash
from .loaders import fetch_url

log = logging.getLogger(__name__)

_SELECT_SQL = """\
SELECT id, name, website
FROM companies
WHERE service_taxonomy IS NOT NULL
  AND service_taxonomy <> ''
  AND service_taxonomy::jsonb ?| array['Sales Engagement Platform','Lead Generation Software','CRM Software']
  AND (blocked IS NULL OR blocked = false)
  AND (country IS NULL OR country = '')
  AND (location IS NULL OR location = '')
  AND website IS NOT NULL
  AND website <> ''
ORDER BY score DESC NULLS LAST, id ASC
"""

_UPDATE_SQL = (
    "UPDATE companies SET country = %s, updated_at = now()::text WHERE id = %s"
)

_CONFIDENCE_THRESHOLD = 0.7
_PAGE_TEXT_MAX = 6000  # chars to send to LLM for country extraction


def _dsn() -> str:
    return (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )


class ClassifyCountryWebState(TypedDict, total=False):
    limit: int | None
    concurrency: int
    apply: bool
    candidates: list[dict[str, Any]]
    total: int
    classified: int
    applied: int
    errors: list[dict[str, Any]]
    summary: dict[str, Any]


# ── Node 1: load candidates ───────────────────────────────────────────────


def _load_rows(limit: int | None) -> list[dict[str, Any]]:
    sql = _SELECT_SQL
    if limit:
        sql += f" LIMIT {int(limit)}"
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            cols = [d[0] for d in cur.description or []]
            return [dict(zip(cols, r)) for r in cur.fetchall()]


async def load_candidates(state: ClassifyCountryWebState) -> dict:
    limit = state.get("limit")
    rows = await asyncio.to_thread(_load_rows, limit)
    log.info("load_candidates: %d companies need country from website", len(rows))
    return {"candidates": rows, "total": len(rows)}


# ── Node 2: classify from website ─────────────────────────────────────────


_COUNTRY_PROMPT = """\
Extract the primary country where this company is headquartered.

Return strict JSON: {"country": "XX", "confidence": 0.0-1.0, "evidence": "..."}

Rules:
- country: ISO 3166-1 alpha-2 code (US, GB, DE, FR, etc.) or null if unclear
- confidence: 0.0 to 1.0 — how sure you are
- evidence: short quote from the page that supports your answer
- Look for: footer address, "headquartered in", contact page location,
  phone country code, office addresses, "based in", legal jurisdiction
- If multiple offices exist, pick the headquarters / primary location
- If truly unclear, return null country with low confidence
"""

_FETCH_TIMEOUT = 15  # seconds per HTTP fetch


async def classify_all(state: ClassifyCountryWebState) -> dict:
    candidates = state.get("candidates") or []
    concurrency = max(1, int(state.get("concurrency") or 4))
    apply_writes = bool(state.get("apply") if state.get("apply") is not None else True)

    if not candidates:
        return {"classified": 0, "applied": 0, "errors": []}

    sem = asyncio.Semaphore(concurrency)
    t0 = time.perf_counter()
    errors: list[dict[str, Any]] = []
    classified = 0
    results: list[dict[str, Any]] = []

    async def _process_one(row: dict[str, Any]) -> dict[str, Any]:
        cid = int(row["id"])
        name = row.get("name") or f"id={cid}"
        website = (row.get("website") or "").strip()

        if not website:
            return {"id": cid, "name": name, "country": None, "confidence": 0, "error": "no website"}

        async with sem:
            # 1. Fetch homepage
            try:
                page = await asyncio.wait_for(fetch_url(website, timeout=_FETCH_TIMEOUT), timeout=_FETCH_TIMEOUT + 5)
            except asyncio.TimeoutError:
                return {"id": cid, "name": name, "website": website, "country": None, "confidence": 0, "error": "fetch timeout"}
            except Exception as exc:
                return {"id": cid, "name": name, "website": website, "country": None, "confidence": 0, "error": f"fetch: {exc}"}

            markdown = (page.get("markdown") or "")[:_PAGE_TEXT_MAX]
            if len(markdown) < 100:
                return {"id": cid, "name": name, "website": website, "country": None, "confidence": 0, "error": "page too small"}

            # 2. Extract country via LLM
            try:
                llm = make_deepseek_flash(temperature=0.1)
                verdict, _tel = await ainvoke_json_with_telemetry(
                    llm,
                    [
                        {"role": "system", "content": _COUNTRY_PROMPT},
                        {"role": "user", "content": f"Company: {name}\nWebsite: {website}\n\nHomepage content:\n{markdown}"},
                    ],
                    provider="deepseek",
                )
            except Exception as exc:
                return {"id": cid, "name": name, "website": website, "country": None, "confidence": 0, "error": f"llm: {exc}"}

            country = (verdict.get("country") or "").strip().upper() if isinstance(verdict, dict) else None
            confidence = float(verdict.get("confidence") or 0) if isinstance(verdict, dict) else 0
            evidence = (verdict.get("evidence") or "")[:200] if isinstance(verdict, dict) else ""

            return {
                "id": cid, "name": name, "website": website,
                "country": country if country and country != "NULL" else None,
                "confidence": round(confidence, 2),
                "evidence": evidence,
            }

    tasks = [_process_one(r) for r in candidates]
    done = 0
    for fut in asyncio.as_completed(tasks):
        res = await fut
        done += 1
        results.append(res)

        if res.get("error"):
            errors.append({"company_id": res["id"], "company_name": res["name"], "error": res["error"]})
            log.warning("country_web[%d] %s: %s", res["id"], res["name"], res["error"])
        elif res.get("country") and res.get("confidence", 0) >= _CONFIDENCE_THRESHOLD:
            classified += 1
            log.info("country_web[%d] %s -> %s (%.2f)", res["id"], res["name"], res["country"], res["confidence"])
        else:
            log.info("country_web[%d] %s -> low confidence (%.2f)", res["id"], res["name"], res.get("confidence", 0))

        if done % 20 == 0 or done == len(candidates):
            elapsed = time.perf_counter() - t0
            log.info("%d/%d classified=%d elapsed=%.1fs", done, len(candidates), classified, elapsed)

    # 3. Apply high-confidence results
    applied = 0
    if apply_writes:
        to_apply = [r for r in results if r.get("country") and r.get("confidence", 0) >= _CONFIDENCE_THRESHOLD]
        if to_apply:
            try:
                with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                    with conn.cursor() as cur:
                        for r in to_apply:
                            cur.execute(_UPDATE_SQL, (r["country"], r["id"]))
                            applied += 1
                log.info("applied %d country updates", applied)
            except psycopg.Error as exc:
                log.error("apply failed: %s", exc)
                errors.append({"error": f"apply: {exc}"})

    return {
        "classified": classified,
        "applied": applied,
        "errors": errors,
    }


# ── Node 3: summarize ─────────────────────────────────────────────────────


async def summarize(state: ClassifyCountryWebState) -> dict:
    summary = {
        "total": int(state.get("total") or 0),
        "classified": int(state.get("classified") or 0),
        "applied": int(state.get("applied") or 0),
        "concurrency": int(state.get("concurrency") or 4),
        "error_count": len(state.get("errors") or []),
    }
    log.info("classify_country_web done: %s", summary)
    return {"summary": summary}


# ── Build graph ───────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ClassifyCountryWebState)
    builder.add_node("load_candidates", load_candidates)
    builder.add_node("classify_all", classify_all)
    builder.add_node("summarize", summarize)

    builder.add_edge(START, "load_candidates")
    builder.add_edge("load_candidates", "classify_all")
    builder.add_edge("classify_all", "summarize")
    builder.add_edge("summarize", END)

    if checkpointer is not None:
        return builder.compile(checkpointer=checkpointer)
    return builder.compile()


graph = build_graph()
