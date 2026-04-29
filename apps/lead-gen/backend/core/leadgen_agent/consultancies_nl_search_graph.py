"""Consultancies NL search graph.

Native Python port of ``consultancies/nl_search.py``. Takes a free-form
natural-language query, parses it into a structured filter + Brave-search
queries via ``make_llm()`` (OpenAI-compatible chat completion with JSON
response), builds a parameterized SQL query against the ``companies`` table,
and returns matching rows.

Routing:

* **search** (default). NL → JSON filters → SQL → existing ``companies`` rows.
* **search_and_discover**. ``search`` plus a Brave Search → upsert pass for
  the LLM-generated ``brave_queries`` so the result set merges existing leads
  with newly discovered ones.

The ``text_to_sql`` graph already exists and handles a more general NL→SQL
flow against the full schema. ``nl_search`` is intentionally narrower —
purpose-built for the consultancy / lead-gen vertical with a curated
filter vocabulary (category, ai_tier, intent signals, contacts, GitHub
scores, etc.) — and doubles as the entry point for the discover-on-demand
workflow.

Environment:
    NEON_DATABASE_URL / DATABASE_URL  Neon connection string (required).
    BRAVE_SEARCH_API_KEY              Required only for search_and_discover.
    DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL  Picked up by ``make_llm()``.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Annotated, Any, TypedDict
from urllib.parse import urlparse

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm

log = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

_DEFAULT_LIMIT = 20
_MAX_LIMIT = 100
_BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search"
_BRAVE_TIMEOUT_S = 20.0
_USER_AGENT = "Mozilla/5.0 (compatible; ConsultancyNLSearch/0.1)"

_NL_PROMPT = (
    "You are a B2B lead database query parser AND web search query generator.\n"
    "Convert the natural language query into a JSON object with two parts:\n"
    "1. Database filters to search existing companies\n"
    "2. Brave Search queries to discover NEW companies matching the intent\n\n"
    "Respond ONLY with valid JSON, no other text.\n\n"
    "Available filter fields and their allowed values:\n"
    '- category: "PRODUCT" | "CONSULTANCY" | "AGENCY" | "STAFFING"\n'
    "- min_ai_tier: 0 (any) | 1 (AI-first+) | 2 (AI-native only)\n"
    '- industry: "sales_tech" | "martech" | "hr_tech" | "fintech" | "devtools" | "cybersecurity" | "healthcare" | "edtech" | "ecommerce"\n'
    '- funding_stage: "bootstrapped" | "seed" | "series_a" | "series_b" | "series_c_plus" | "public"\n'
    '- employee_range: "1-10" | "11-50" | "51-200" | "201-500" | "500+"\n'
    '- remote_policy: "remote" | "hybrid" | "onsite"\n'
    '- target_market: "smb" | "mid_market" | "enterprise" | "all"\n'
    '- services_contain: ["keyword1", "keyword2"]\n'
    '- tags_contain: ["keyword1"]\n'
    "- min_score: float 0.0 to 1.0\n"
    "- min_intent_score: 0-100\n"
    "- has_hiring_intent: true\n"
    "- has_tech_adoption: true\n"
    "- has_decision_makers: true\n"
    "- min_contacts: int\n"
    "- min_github_ai_score: float 0-1\n"
    "- has_recent_jobs: true\n"
    "- never_contacted: true\n"
    '- name_contains: "substring"\n\n'
    "Rules:\n"
    "- Only include filters the user explicitly or implicitly requested.\n"
    "- 'AI companies' → min_ai_tier: 1\n"
    "- 'SaaS' or 'software' → category: 'PRODUCT'\n"
    "- 'consulting' → category: 'CONSULTANCY'\n"
    "- 'large' → employee_range: '500+' or '201-500'\n"
    "- 'small' or 'startup' → employee_range: '1-10' or '11-50'\n"
    "- 'hiring' or 'growing team' → has_hiring_intent: true\n"
    "- 'buying signals' or 'in-market' → min_intent_score: 30\n"
    "- 'with contacts' or 'reachable' → min_contacts: 1\n"
    "- 'untouched' or 'new leads' → never_contacted: true\n"
    "- If user mentions specific tech (LangChain, RAG…) → tags_contain.\n"
    "- If user mentions services (email automation, lead scoring…) → services_contain.\n"
    "- ALWAYS generate 2-3 targeted Brave Search queries.\n"
    "- sort_by: 'score' (default) | 'ai_tier' | 'intent' | 'name'.\n"
    "- limit: default 20.\n\n"
    'Query: "{user_query}"\n\n'
    'Return: {{"filters": {{}}, "brave_queries": [], "sort_by": "score", "limit": 20}}'
)


# ── State ─────────────────────────────────────────────────────────────────────


def _merge_dict(left: dict | None, right: dict | None) -> dict:
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class ConsultanciesNLSearchState(TypedDict, total=False):
    """State for the consultancies NL-search graph.

    Input keys:
        node              "search" (default) or "search_and_discover".
        query             The natural-language query (required).
        dry_run           Skip discovery + don't insert anything.

    Output keys:
        parsed            LLM-parsed JSON: {filters, brave_queries, sort_by, limit}.
        sql               The generated SQL (string, parameterized).
        sql_params        The parameter list used with ``sql``.
        existing          Matching rows from Neon (current companies).
        discovered_ids    Newly inserted company IDs (search_and_discover only).
        discovered        Rows for newly discovered companies after upsert.
        total             ``len(existing) + len(discovered)``.
    """

    node: str
    query: str
    dry_run: bool
    parsed: dict[str, Any]
    sql: str
    sql_params: list[Any]
    existing: list[dict[str, Any]]
    discovered_ids: list[int]
    discovered: list[dict[str, Any]]
    total: int
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_dict]


# ── Helpers ───────────────────────────────────────────────────────────────────


def _dsn() -> str:
    dsn = (
        os.environ.get("NEON_DATABASE_URL", "").strip()
        or os.environ.get("DATABASE_URL", "").strip()
    )
    if not dsn:
        raise RuntimeError(
            "Neither NEON_DATABASE_URL nor DATABASE_URL is set."
        )
    return dsn


_KEY_NON_ALNUM_RE = re.compile(r"[^a-z0-9-]")


def _normalize_domain(url: str) -> str:
    try:
        host = (urlparse(url).netloc or "").lower()
    except ValueError:
        return ""
    if host.startswith("www."):
        host = host[4:]
    return host if "." in host else ""


def _domain_to_key(domain: str) -> str:
    cleaned = domain.replace(".", "-").lower()
    return _KEY_NON_ALNUM_RE.sub("", cleaned)


# ── NL parsing ────────────────────────────────────────────────────────────────


async def _parse_nl(query: str) -> dict[str, Any]:
    llm = make_llm(temperature=0.1)
    prompt = _NL_PROMPT.format(user_query=query)
    try:
        data = await ainvoke_json(llm, [{"role": "user", "content": prompt}])
    except (httpx.HTTPError, ValueError, RuntimeError) as e:
        log.warning("[nl_search] LLM error: %s", e)
        data = None

    if not isinstance(data, dict):
        return {"filters": {}, "brave_queries": [], "sort_by": "score", "limit": _DEFAULT_LIMIT}

    if "filters" not in data:
        data = {"filters": data, "brave_queries": [], "sort_by": "score", "limit": _DEFAULT_LIMIT}
    data.setdefault("brave_queries", [])
    data.setdefault("sort_by", "score")
    data.setdefault("limit", _DEFAULT_LIMIT)
    return data


# ── SQL builder ───────────────────────────────────────────────────────────────


def _build_sql(parsed: dict[str, Any]) -> tuple[str, list[Any]]:
    filters: dict[str, Any] = parsed.get("filters") or {}
    sort_by: str = str(parsed.get("sort_by") or "score")
    limit: int = min(int(parsed.get("limit") or _DEFAULT_LIMIT), _MAX_LIMIT)

    clauses: list[str] = ["blocked = false", "category != 'UNKNOWN'"]
    params: list[Any] = []

    if "category" in filters:
        clauses.append("category = %s")
        params.append(str(filters["category"]))
    if "min_ai_tier" in filters:
        clauses.append("ai_tier >= %s")
        params.append(int(filters["min_ai_tier"]))
    if "industry" in filters:
        clauses.append("industries::text ILIKE %s")
        params.append(f"%{filters['industry']}%")
    if "funding_stage" in filters:
        clauses.append("tags::text ILIKE %s")
        params.append(f"%funding:{filters['funding_stage']}%")
    if "employee_range" in filters:
        clauses.append("size = %s")
        params.append(str(filters["employee_range"]))
    if "remote_policy" in filters:
        clauses.append("tags::text ILIKE %s")
        params.append(f"%{filters['remote_policy']}%")
    if "target_market" in filters:
        clauses.append("tags::text ILIKE %s")
        params.append(f"%market:{filters['target_market']}%")
    if "services_contain" in filters:
        for kw in (filters["services_contain"] or []):
            clauses.append("services::text ILIKE %s")
            params.append(f"%{kw}%")
    if "tags_contain" in filters:
        for kw in (filters["tags_contain"] or []):
            clauses.append("tags::text ILIKE %s")
            params.append(f"%{kw}%")
    if "min_score" in filters:
        clauses.append("score >= %s")
        params.append(float(filters["min_score"]))
    if "name_contains" in filters:
        clauses.append("name ILIKE %s")
        params.append(f"%{filters['name_contains']}%")
    if "min_intent_score" in filters:
        clauses.append("intent_score >= %s")
        params.append(int(filters["min_intent_score"]))

    if filters.get("has_hiring_intent"):
        clauses.append(
            "id IN (SELECT DISTINCT company_id FROM intent_signals "
            "WHERE signal_type = 'hiring_intent' AND confidence > 0.5)"
        )
    if filters.get("has_tech_adoption"):
        clauses.append(
            "id IN (SELECT DISTINCT company_id FROM intent_signals "
            "WHERE signal_type = 'tech_adoption' AND confidence > 0.5)"
        )
    if "min_contacts" in filters:
        clauses.append(
            "id IN (SELECT company_id FROM contacts "
            "WHERE do_not_contact = false "
            "GROUP BY company_id HAVING COUNT(*) >= %s)"
        )
        params.append(int(filters["min_contacts"]))
    if filters.get("has_decision_makers"):
        clauses.append(
            "id IN (SELECT company_id FROM contacts "
            "WHERE is_decision_maker = true AND do_not_contact = false)"
        )
    if "min_github_ai_score" in filters:
        clauses.append("github_ai_score >= %s")
        params.append(float(filters["min_github_ai_score"]))
    if filters.get("has_recent_jobs"):
        clauses.append(
            "id IN (SELECT company_id FROM linkedin_posts "
            "WHERE type = 'job' AND posted_at > (NOW() - INTERVAL '60 days')::text)"
        )
    if filters.get("never_contacted"):
        clauses.append(
            "id NOT IN (SELECT DISTINCT c.company_id FROM contacts c "
            "JOIN contact_emails ce ON ce.contact_id = c.id)"
        )

    where = " AND ".join(clauses)
    sort_map = {
        "score": "score DESC",
        "ai_tier": "ai_tier DESC, score DESC",
        "intent": "intent_score DESC NULLS LAST, score DESC",
        "name": "name ASC",
    }
    order = sort_map.get(sort_by, "score DESC")
    sql = (
        "SELECT id, name, canonical_domain, category, ai_tier, score, size, "
        "description, services, tags, industries, "
        "intent_score, intent_signals_count, intent_top_signal, "
        "github_ai_score, github_hiring_score, github_activity_score "
        f"FROM companies WHERE {where} ORDER BY {order} NULLS LAST LIMIT %s"
    )
    params.append(limit)
    return sql, params


def _execute_sql(sql: str, params: list[Any]) -> list[dict[str, Any]]:
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            cols = [desc.name for desc in cur.description] if cur.description else []
            rows = cur.fetchall()
    return [dict(zip(cols, row)) for row in rows]


def _existing_domains() -> set[str]:
    sql = "SELECT canonical_domain FROM companies WHERE canonical_domain IS NOT NULL"
    domains: set[str] = set()
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            for row in cur.fetchall():
                if row[0]:
                    domains.add(str(row[0]).lower())
    return domains


# ── Brave search (subset of brave_discovery for the discover branch) ──────────


_LISTICLE_NAME_RE = re.compile(
    r"^\s*(the\s+)?\d+\s+"
    r"|\bbest\s+ai\b|\btop\s+ai\b"
    r"|\bbest\s+(sales|sdr|outreach|prospect|lead\s+gen)"
    r"|\b(in|for)\s+20(2[4-9]|3[0-9])\b"
    r"|\b(guide|review|comparison|listicle|tutorial)\b",
    re.IGNORECASE,
)
_SKIP_DOMAINS: frozenset[str] = frozenset({
    "clutch.co", "goodfirms.co", "wellfound.com", "itfirms.co",
    "linkedin.com", "twitter.com", "facebook.com", "youtube.com",
    "wikipedia.org", "crunchbase.com", "github.com", "medium.com",
    "g2.com", "capterra.com", "getapp.com",
})


async def _brave_query(client: httpx.AsyncClient, api_key: str, q: str) -> list[dict[str, Any]]:
    resp = await client.get(
        _BRAVE_API_URL,
        headers={
            "X-Subscription-Token": api_key,
            "Accept": "application/json",
            "User-Agent": _USER_AGENT,
        },
        params={"q": q, "count": 5},
        timeout=_BRAVE_TIMEOUT_S,
    )
    resp.raise_for_status()
    body = resp.json()
    return [
        {
            "title": r.get("title") or "",
            "link": r.get("url") or "",
            "snippet": r.get("description") or "",
        }
        for r in (body.get("web") or {}).get("results") or []
    ]


def _extract_brave_candidates(
    results: list[dict[str, Any]], existing: set[str],
) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for r in results:
        url = r.get("link") or ""
        title = r.get("title") or ""
        snippet = r.get("snippet") or ""
        domain = _normalize_domain(url)
        if not domain or domain in existing or domain in seen:
            continue
        if any(s in domain for s in _SKIP_DOMAINS):
            continue
        seen.add(domain)
        # Strip listicle-style names
        name = title
        for sep in (" | ", " - ", " :: ", " — ", " – ", " · "):
            if sep in name:
                name = name.split(sep, 1)[0]
                break
        name = name.strip()
        if not name or len(name) < 2 or _LISTICLE_NAME_RE.search(name):
            continue
        out.append({
            "name": name,
            "domain": domain,
            "website": url,
            "description": snippet,
            "key": _domain_to_key(domain),
        })
    return out


def _insert_discovered(candidates: list[dict[str, str]]) -> list[int]:
    if not candidates:
        return []
    now = datetime.now(timezone.utc).isoformat()
    inserted: list[int] = []
    try:
        conn = psycopg.connect(_dsn(), autocommit=False, connect_timeout=10)
    except psycopg.Error as e:
        log.warning("Neon connection failed: %s", e)
        return []
    try:
        with conn.cursor() as cur:
            for c in candidates:
                try:
                    cur.execute(
                        """
                        INSERT INTO companies
                            (key, name, website, canonical_domain,
                             category, ai_tier, score, blocked,
                             created_at, updated_at)
                        VALUES (%s, %s, %s, %s,
                                'UNKNOWN', 0, 0.5, false,
                                %s, %s)
                        ON CONFLICT (key) DO NOTHING
                        RETURNING id
                        """,
                        (c["key"], c["name"], c["website"], c["domain"], now, now),
                    )
                    row = cur.fetchone()
                    if row is None:
                        continue
                    cid = int(row[0])
                    inserted.append(cid)
                    cur.execute(
                        """
                        INSERT INTO company_facts
                            (company_id, field, value_text, confidence,
                             source_type, source_url, observed_at, method)
                        VALUES (%s, 'discovery_source', %s, 0.9, 'BRAVE_SEARCH', %s, %s, 'NL_SEARCH')
                        """,
                        (cid, f"nl_search: {c['name']}", c["website"], now),
                    )
                except psycopg.Error as e:
                    log.warning("nl_search insert error for %s: %s", c["name"], e)
                    conn.rollback()
                    continue
            conn.commit()
    finally:
        conn.close()
    return inserted


def _fetch_by_ids(ids: list[int]) -> list[dict[str, Any]]:
    if not ids:
        return []
    placeholders = ",".join(["%s"] * len(ids))
    sql = (
        "SELECT id, name, canonical_domain, category, ai_tier, score, size, "
        "description, services, tags, industries, "
        "intent_score, intent_signals_count, intent_top_signal, "
        "github_ai_score, github_hiring_score, github_activity_score "
        f"FROM companies WHERE id IN ({placeholders}) ORDER BY score DESC NULLS LAST"
    )
    return _execute_sql(sql, ids)


# ── Nodes ─────────────────────────────────────────────────────────────────────


async def search(state: ConsultanciesNLSearchState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    query = (state.get("query") or "").strip()
    if not query:
        return {"_error": "search: 'query' is required"}

    parsed = await _parse_nl(query)
    sql, params = _build_sql(parsed)

    if state.get("dry_run"):
        return {
            "parsed": parsed, "sql": sql, "sql_params": params,
            "existing": [], "discovered_ids": [], "discovered": [],
            "total": 0,
            "agent_timings": {"search": round(time.perf_counter() - t0, 3)},
            "graph_meta": {
                "graph": "consultancies_nl_search", "version": "v1", "node": "search",
            },
        }

    existing = _execute_sql(sql, params)
    log.info("nl_search: %d existing matches", len(existing))
    return {
        "parsed": parsed, "sql": sql, "sql_params": params,
        "existing": existing, "discovered_ids": [], "discovered": [],
        "total": len(existing),
        "agent_timings": {"search": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "graph": "consultancies_nl_search", "version": "v1", "node": "search",
        },
    }


async def search_and_discover(state: ConsultanciesNLSearchState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    query = (state.get("query") or "").strip()
    if not query:
        return {"_error": "search_and_discover: 'query' is required"}

    parsed = await _parse_nl(query)
    sql, params = _build_sql(parsed)
    existing = _execute_sql(sql, params)
    log.info("nl_search: %d existing matches", len(existing))

    discovered_ids: list[int] = []
    discovered: list[dict[str, Any]] = []

    brave_queries = [
        str(q) for q in (parsed.get("brave_queries") or []) if q
    ]
    api_key = os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()
    if not state.get("dry_run") and brave_queries and api_key:
        existing_domains = _existing_domains()
        all_results: list[dict[str, Any]] = []
        async with httpx.AsyncClient() as client:
            for q in brave_queries[:3]:
                try:
                    hits = await _brave_query(client, api_key, q)
                    log.info("nl_search brave[%s]: %d hits", q, len(hits))
                    all_results.extend(hits)
                except (httpx.HTTPError, ValueError) as e:
                    log.warning("nl_search brave error: %s", e)
                await asyncio.sleep(1.0)
        candidates = _extract_brave_candidates(all_results, existing_domains)
        discovered_ids = _insert_discovered(candidates)
        if discovered_ids:
            discovered = _fetch_by_ids(discovered_ids)

    total = len(existing) + len(discovered)
    return {
        "parsed": parsed, "sql": sql, "sql_params": params,
        "existing": existing, "discovered_ids": discovered_ids,
        "discovered": discovered, "total": total,
        "agent_timings": {
            "search_and_discover": round(time.perf_counter() - t0, 3),
        },
        "graph_meta": {
            "graph": "consultancies_nl_search", "version": "v1",
            "node": "search_and_discover",
        },
    }


# ── Build graph ───────────────────────────────────────────────────────────────


def _route(state: ConsultanciesNLSearchState) -> str:
    node = (state.get("node") or "search").strip().lower()
    return "search_and_discover" if node == "search_and_discover" else "search"


def _build() -> Any:
    g = StateGraph(ConsultanciesNLSearchState)
    g.add_node("search", search)
    g.add_node("search_and_discover", search_and_discover)
    g.add_conditional_edges(
        START,
        _route,
        {"search": "search", "search_and_discover": "search_and_discover"},
    )
    g.add_edge("search", END)
    g.add_edge("search_and_discover", END)
    return g.compile()


graph = _build()
