"""Consultancies AI-features extraction graph.

Native Python port of ``consultancies/extract_ai_features.py``. For a set of
already-enriched lead-gen / sales companies, re-scrapes a richer page list
(``/how-it-works``, ``/platform``, ``/technology``, ``/ai``, ``/product``,
``/features``, ``/about``, ``/solutions``, ``/pricing``), extracts a focused
AI-features taxonomy via the shared ``make_llm()`` factory, and idempotently
upserts results into ``company_facts`` (scoped to the AI-fact field set so
re-runs cleanly replace prior extractions).

Persistence:
    - DELETE FROM company_facts WHERE company_id IN ... AND field IN
      {ai_features, feature, core_differentiator, automation_level}
      AND method = 'LLM'
    - INSERT one row per top-level field + one row per feature (SQL-filterable).
    - Merge ``feature:<slug>`` tags (and ``feature:realtime``) into
      ``companies.tags``.

Environment:
    NEON_DATABASE_URL / DATABASE_URL  Neon connection string.
    LLM_BASE_URL / LLM_API_KEY / LLM_MODEL  Picked up by ``make_llm()``.
    LLM_PROVIDER                     Optional ``"deepseek"`` to pin DeepSeek.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Annotated, Any, TypedDict
from urllib.parse import urljoin

import httpx
import psycopg
from bs4 import BeautifulSoup
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm

log = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

_MAX_CONCURRENT_FETCH = 10
_FETCH_TIMEOUT_S = 20.0
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
_PER_PAGE_DELAY_S = 0.4
_AI_SCRAPE_PATHS: tuple[str, ...] = (
    "",
    "/how-it-works",
    "/platform",
    "/technology",
    "/ai",
    "/product",
    "/features",
    "/about",
    "/solutions",
    "/pricing",
)
_MAX_TEXT_CHARS = 3000
_MAX_CHARS_PER_PAGE = 500

_VALID_FEATURE_CATEGORIES: frozenset[str] = frozenset({
    "intent", "enrichment", "outreach", "engagement", "analytics", "automation",
})
_VALID_AUTOMATION: frozenset[str] = frozenset({
    "assisted", "semi-auto", "autonomous", "agentic",
})
_AI_FACT_FIELDS: tuple[str, ...] = (
    "ai_features", "feature", "core_differentiator", "automation_level",
)


# ── State ─────────────────────────────────────────────────────────────────────


def _merge_dict(left: dict | None, right: dict | None) -> dict:
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class ConsultanciesFeaturesState(TypedDict, total=False):
    """State for the AI-features extraction graph.

    Input keys:
        company_id   When set (>0), process only that single company.
        limit        Max companies to process when company_id is unset.
        skip_llm     Scrape only, don't extract.
        dry_run      Skip Neon writes.

    Output keys:
        loaded            Companies pulled from Neon.
        scraped           Successfully scraped (page text > 100 chars).
        extracted         Companies with extracted AI features.
        companies_updated Companies with refreshed tags + facts.
        facts_inserted    Total ``company_facts`` rows inserted.
        facts_deleted     Old AI-fact rows replaced.
        top               Brief preview of the top-feature companies.
    """

    # input
    company_id: int
    limit: int
    skip_llm: bool
    dry_run: bool
    # output
    loaded: int
    scraped: int
    extracted: int
    companies_updated: int
    facts_inserted: int
    facts_deleted: int
    top: list[dict[str, Any]]
    # plumbing
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_dict]


@dataclass
class _Record:
    id: int
    key: str
    name: str
    website: str
    canonical_domain: str
    existing_tags: list[str] = field(default_factory=list)
    page_text: str = ""
    ai_features: dict[str, Any] = field(default_factory=dict)


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set — cannot persist."
        )
    return dsn


def _load_records(company_id: int, limit: int) -> list[_Record]:
    if company_id and company_id > 0:
        sql = """
            SELECT id, key, name, COALESCE(website, ''),
                   COALESCE(canonical_domain, ''), COALESCE(tags, '[]')
            FROM companies
            WHERE id = %s AND blocked = false
        """
        params: tuple[Any, ...] = (company_id,)
    else:
        sql = """
            SELECT c.id, c.key, c.name, COALESCE(c.website, ''),
                   COALESCE(c.canonical_domain, ''), COALESCE(c.tags, '[]')
            FROM companies c
            JOIN company_facts cf ON cf.company_id = c.id
            WHERE cf.source_type = 'BRAVE_SEARCH'
              AND c.blocked = false
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """
        if limit and limit > 0:
            sql += f" LIMIT {int(limit)}"
        params = ()

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            rows = cur.fetchall()
    out: list[_Record] = []
    for r in rows:
        try:
            tags_raw = json.loads(r[5] or "[]")
            tags = [str(t) for t in tags_raw] if isinstance(tags_raw, list) else []
        except (json.JSONDecodeError, TypeError):
            tags = []
        out.append(_Record(
            id=int(r[0]), key=str(r[1]), name=str(r[2]),
            website=str(r[3] or ""), canonical_domain=str(r[4] or ""),
            existing_tags=tags,
        ))
    return out


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.select("nav, footer, script, style, header, .cookie, noscript"):
        tag.decompose()
    return soup.get_text(separator=" ", strip=True)


async def _scrape_record(
    client: httpx.AsyncClient, sem: asyncio.Semaphore, rec: _Record,
) -> _Record:
    base = rec.website
    if not base and rec.canonical_domain:
        base = f"https://{rec.canonical_domain}"
    if not base:
        return rec
    if not base.startswith("http"):
        base = f"https://{base}"

    texts: list[str] = []
    for path in _AI_SCRAPE_PATHS:
        url = urljoin(base, path) if path else base
        async with sem:
            try:
                resp = await client.get(
                    url,
                    timeout=_FETCH_TIMEOUT_S,
                    headers={"User-Agent": _USER_AGENT},
                    follow_redirects=True,
                )
                if resp.status_code != 200:
                    continue
                html = resp.text
            except (httpx.HTTPError, ValueError):
                continue
        text = _extract_text(html)
        if text and len(text) > 50:
            texts.append(text[:_MAX_CHARS_PER_PAGE])
        await asyncio.sleep(_PER_PAGE_DELAY_S)

    rec.page_text = " | ".join(texts)[:_MAX_TEXT_CHARS]
    return rec


_FEATURES_PROMPT = (
    "You are a product analyst reviewing an AI-powered sales or lead generation "
    "software company.\nRespond ONLY with valid JSON. No explanations, no markdown, "
    "no text outside the JSON object.\n\n"
    "Company: {name}\nDomain: {domain}\nWebsite content:\n{text}\n\n"
    "Extract every specific product feature and how it is implemented. Return this exact JSON:\n"
    "{{\n"
    '  "features": [\n'
    "    {{\n"
    '      "name": "feature name (e.g. Buyer Intent Detection, AI Email Writer)",\n'
    '      "category": "intent or enrichment or outreach or engagement or analytics or automation",\n'
    '      "description": "what this feature does for the user in 1 sentence",\n'
    '      "ai_implementation": "exactly how AI/ML powers it",\n'
    '      "data_sources": ["list data inputs"],\n'
    '      "is_realtime": false\n'
    "    }}\n"
    "  ],\n"
    '  "core_differentiator": "what makes this company\'s AI uniquely better in max 20 words",\n'
    '  "automation_level": "assisted or semi-auto or autonomous or agentic"\n'
    "}}\n\n"
    "Category definitions:\n"
    "- intent: buyer intent signals, purchase likelihood scoring\n"
    "- enrichment: lead research, company/contact data enrichment\n"
    "- outreach: email writing, sequence building, personalisation\n"
    "- engagement: live chat AI, voice call AI, conversation handling\n"
    "- analytics: call analytics, pipeline forecasting, revenue intelligence\n"
    "- automation: workflow automation, AI SDR, meeting scheduling\n\n"
    "Rules:\n"
    "- Extract every distinct named feature you can find (aim for 3-10 features).\n"
    "- ai_implementation must be specific — describe the actual AI/ML technique, not marketing language.\n"
    "- is_realtime = true only for features that act during a live interaction.\n"
    "- automation_level: assisted=human approves all, semi-auto=AI drafts, autonomous=AI acts alone, agentic=multi-step agent."
)


def _normalize_features(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {}
    features: list[dict[str, Any]] = []
    for item in (raw.get("features") or []):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()
        if not name:
            continue
        cat = str(item.get("category") or "")
        if cat not in _VALID_FEATURE_CATEGORIES:
            cat = "automation"
        features.append({
            "name": name,
            "category": cat,
            "description": str(item.get("description") or "")[:300],
            "ai_implementation": str(item.get("ai_implementation") or "")[:500],
            "data_sources": [str(s) for s in (item.get("data_sources") or []) if s][:10],
            "is_realtime": bool(item.get("is_realtime")),
        })

    automation = str(raw.get("automation_level") or "assisted")
    if automation not in _VALID_AUTOMATION:
        automation = "assisted"

    return {
        "features": features[:12],
        "core_differentiator": str(raw.get("core_differentiator") or "")[:300],
        "automation_level": automation,
    }


async def _extract_record(rec: _Record) -> _Record:
    if not rec.page_text or len(rec.page_text) < 100:
        return rec
    provider = os.environ.get("LLM_PROVIDER", "").strip().lower() or None
    llm = make_llm(temperature=0.1, provider=provider)
    prompt = _FEATURES_PROMPT.format(
        name=rec.name,
        domain=rec.canonical_domain or rec.website,
        text=rec.page_text,
    )
    try:
        data = await ainvoke_json(
            llm, [{"role": "user", "content": prompt}], provider=provider,
        )
    except (httpx.HTTPError, ValueError, RuntimeError) as e:
        log.warning("[features] %s — error: %s", rec.name, e)
        return rec
    rec.ai_features = _normalize_features(data)
    return rec


def _slug(s: str) -> str:
    return re.sub(r"[^a-z0-9-]+", "-", s.lower()).strip("-")


def _persist(records: list[_Record]) -> tuple[int, int, int]:
    """Idempotent persist: DELETE old AI-facts then INSERT fresh, merge tags."""
    now = datetime.now(timezone.utc).isoformat()
    companies_updated = 0
    facts_deleted = 0
    facts_inserted = 0
    try:
        conn = psycopg.connect(_dsn(), autocommit=False, connect_timeout=10)
    except psycopg.Error as e:
        log.error("Neon connection failed: %s", e)
        return (0, 0, 0)
    try:
        with conn.cursor() as cur:
            for rec in records:
                f = rec.ai_features
                if not f or not f.get("features"):
                    continue
                source_url = rec.website or f"https://{rec.canonical_domain}"
                try:
                    cur.execute(
                        "DELETE FROM company_facts "
                        "WHERE company_id = %s AND field = ANY(%s) AND method = 'LLM'",
                        (rec.id, list(_AI_FACT_FIELDS)),
                    )
                    facts_deleted += cur.rowcount

                    cur.execute(
                        """
                        INSERT INTO company_facts
                            (company_id, field, value_text, confidence,
                             source_type, source_url, observed_at, method)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (rec.id, "ai_features", json.dumps(f), 0.85,
                         "BRAVE_SEARCH", source_url, now, "LLM"),
                    )
                    facts_inserted += 1

                    for feat in f.get("features") or []:
                        cur.execute(
                            """
                            INSERT INTO company_facts
                                (company_id, field, value_text, confidence,
                                 source_type, source_url, observed_at, method)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (rec.id, "feature", json.dumps(feat), 0.85,
                             "BRAVE_SEARCH", source_url, now, "LLM"),
                        )
                        facts_inserted += 1

                    for field_name, value in (
                        ("core_differentiator", f.get("core_differentiator", "")),
                        ("automation_level", f.get("automation_level", "")),
                    ):
                        if not value:
                            continue
                        cur.execute(
                            """
                            INSERT INTO company_facts
                                (company_id, field, value_text, confidence,
                                 source_type, source_url, observed_at, method)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (rec.id, field_name, value, 0.85,
                             "BRAVE_SEARCH", source_url, now, "LLM"),
                        )
                        facts_inserted += 1

                    feature_tags: list[str] = list(dict.fromkeys(
                        f"feature:{_slug(feat['name'])}"
                        for feat in (f.get("features") or [])
                    ))
                    if any(ft.get("is_realtime") for ft in (f.get("features") or [])):
                        feature_tags.append("feature:realtime")
                    merged_tags = list(dict.fromkeys(rec.existing_tags + feature_tags))

                    cur.execute(
                        "UPDATE companies SET tags = %s, updated_at = %s WHERE id = %s",
                        (json.dumps(merged_tags), now, rec.id),
                    )
                    companies_updated += 1
                    conn.commit()
                except psycopg.Error as e2:
                    log.warning("[features] Neon error for %s: %s", rec.name, e2)
                    conn.rollback()
                    continue
    finally:
        conn.close()
    return (companies_updated, facts_inserted, facts_deleted)


async def features(state: ConsultanciesFeaturesState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    company_id = int(state.get("company_id") or 0)
    limit = int(state.get("limit") or 0)
    skip_llm = bool(state.get("skip_llm"))
    dry_run = bool(state.get("dry_run"))

    records = _load_records(company_id, limit)
    log.info("features: loaded %d records", len(records))
    if not records:
        return {
            "loaded": 0, "scraped": 0, "extracted": 0,
            "companies_updated": 0, "facts_inserted": 0, "facts_deleted": 0,
            "top": [],
            "agent_timings": {"features": round(time.perf_counter() - t0, 3)},
            "graph_meta": {"graph": "consultancies_features", "version": "v1", "node": "features"},
        }

    sem = asyncio.Semaphore(_MAX_CONCURRENT_FETCH)
    async with httpx.AsyncClient() as client:
        records = await asyncio.gather(*[_scrape_record(client, sem, r) for r in records])
    scraped = sum(1 for r in records if r.page_text)
    log.info("features: scraped %d/%d", scraped, len(records))

    extracted = 0
    if not skip_llm:
        for r in records:
            await _extract_record(r)
            if r.ai_features.get("features"):
                extracted += 1
        log.info("features: extracted %d/%d", extracted, len(records))

    enriched = [r for r in records if r.ai_features.get("features")]
    top = [
        {
            "id": r.id, "name": r.name,
            "feature_count": len(r.ai_features.get("features") or []),
            "automation_level": r.ai_features.get("automation_level"),
        }
        for r in enriched
    ][:10]

    if dry_run or not enriched:
        return {
            "loaded": len(records), "scraped": scraped, "extracted": extracted,
            "companies_updated": 0, "facts_inserted": 0, "facts_deleted": 0,
            "top": top,
            "agent_timings": {"features": round(time.perf_counter() - t0, 3)},
            "graph_meta": {"graph": "consultancies_features", "version": "v1", "node": "features"},
        }

    companies_updated, facts_inserted, facts_deleted = _persist(enriched)
    log.info("features: companies=%d facts_inserted=%d facts_deleted=%d",
             companies_updated, facts_inserted, facts_deleted)

    return {
        "loaded": len(records), "scraped": scraped, "extracted": extracted,
        "companies_updated": companies_updated,
        "facts_inserted": facts_inserted, "facts_deleted": facts_deleted,
        "top": top,
        "agent_timings": {"features": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"graph": "consultancies_features", "version": "v1", "node": "features"},
    }


def _build() -> Any:
    g = StateGraph(ConsultanciesFeaturesState)
    g.add_node("features", features)
    g.add_edge(START, "features")
    g.add_edge("features", END)
    return g.compile()


graph = _build()
