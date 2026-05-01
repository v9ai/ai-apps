"""Ashby slug discovery via Brave Search.

Harvests ``jobs.ashbyhq.com/<slug>`` URLs from the open web by issuing
``site:jobs.ashbyhq.com [keyword]`` queries against the Brave Search API,
extracts the slug from each result URL, dedupes, and persists into the
``ashby_slugs`` table (migration 0082).

Companion of ``ashby_ingest_graph``. This graph **does not** ingest jobs —
it returns a list of slugs and the caller (a shell loop, per
``feedback_leadgen_langgraph_fanout``) fans them into ``ashby_ingest`` one
at a time.

Brave is the same provider already wired for
``consultancies_brave_discovery_graph``; the API key lives in
``BRAVE_SEARCH_API_KEY``.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any, TypedDict
from urllib.parse import urlparse

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

log = logging.getLogger(__name__)

_BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search"
_BRAVE_TIMEOUT_S = 20.0
_RATE_LIMIT_DELAY_S = 1.0
_DEFAULT_COUNT = 20  # Brave max per page
_DEFAULT_MAX_PAGES = 5
_USER_AGENT = "Mozilla/5.0 (compatible; LeadgenAshbyDiscovery/0.1)"

_DEFAULT_KEYWORDS: tuple[str, ...] = (
    "",  # bare site: query
    "engineer",
    "ai",
    "agents",
    "llm",
    "developer-tools",
    "data",
    "infrastructure",
)

# Slugs we never want to ingest as if they were companies.
_SLUG_BLOCKLIST: frozenset[str] = frozenset({
    "api", "apply", "search", "embed", "static", "_next", "favicon.ico",
})

_SLUG_RE = re.compile(r"^/([a-zA-Z0-9_-]+)(?:/|$)")


class AshbyDiscoveryState(TypedDict, total=False):
    # input
    keywords: list[str]
    count: int
    max_pages: int
    skip_known: bool
    dry_run: bool
    # output
    slugs: list[str]
    new_slugs: list[str]
    queries_run: int
    results_seen: int
    # plumbing
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


def _extract_slug(url: str) -> str | None:
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    host = (parsed.netloc or "").lower()
    if host != "jobs.ashbyhq.com":
        return None
    m = _SLUG_RE.match(parsed.path or "")
    if not m:
        return None
    slug = m.group(1).lower()
    if slug in _SLUG_BLOCKLIST:
        return None
    return slug


async def _brave_search(
    client: httpx.AsyncClient, api_key: str, query: str, count: int, offset: int
) -> list[dict[str, Any]]:
    resp = await client.get(
        _BRAVE_API_URL,
        headers={
            "X-Subscription-Token": api_key,
            "Accept": "application/json",
            "User-Agent": _USER_AGENT,
        },
        params={"q": query, "count": min(count, 20), "offset": offset},
        timeout=_BRAVE_TIMEOUT_S,
    )
    resp.raise_for_status()
    body = resp.json()
    web = (body.get("web") or {}).get("results") or []
    return web


# ── Node 1: discover ──────────────────────────────────────────────────────────


async def discover(state: AshbyDiscoveryState) -> dict[str, Any]:
    if state.get("_error"):
        return {}

    api_key = os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()
    if not api_key:
        return {"_error": "BRAVE_SEARCH_API_KEY is not set"}

    raw_keywords = state.get("keywords")
    keywords: list[str] = list(raw_keywords) if raw_keywords else list(_DEFAULT_KEYWORDS)
    count = int(state.get("count") or _DEFAULT_COUNT)
    max_pages = int(state.get("max_pages") or _DEFAULT_MAX_PAGES)
    skip_known = bool(state.get("skip_known", True))
    dry_run = bool(state.get("dry_run"))

    queries: list[str] = []
    for kw in keywords:
        kw = (kw or "").strip()
        queries.append(f"site:jobs.ashbyhq.com {kw}".strip())

    seen_slugs: dict[str, str] = {}  # slug → first URL where seen
    results_seen = 0
    queries_run = 0

    async with httpx.AsyncClient() as client:
        for query in queries:
            for page in range(max_pages):
                offset = page * count
                try:
                    hits = await _brave_search(client, api_key, query, count, offset)
                except (httpx.HTTPError, ValueError) as exc:
                    log.warning("Brave error q=%r page=%d: %s", query, page, exc)
                    break
                queries_run += 1
                results_seen += len(hits)
                if not hits:
                    break
                added = 0
                for hit in hits:
                    url = hit.get("url") or ""
                    slug = _extract_slug(url)
                    if not slug or slug in seen_slugs:
                        continue
                    seen_slugs[slug] = url
                    added += 1
                log.info("Brave q=%r page=%d hits=%d new_slugs=%d",
                         query, page, len(hits), added)
                # If a page added zero slugs we've likely hit aggregator pages —
                # bail out of pagination for this keyword to save quota.
                if added == 0 and page > 0:
                    break
                await asyncio.sleep(_RATE_LIMIT_DELAY_S)

    all_slugs = sorted(seen_slugs.keys())

    new_slugs: list[str] = []
    if not dry_run and all_slugs:
        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    if skip_known:
                        cur.execute(
                            "SELECT key FROM companies WHERE key = ANY(%s)",
                            (all_slugs,),
                        )
                        known = {row[0] for row in cur.fetchall()}
                    else:
                        known = set()
                    new_slugs = [s for s in all_slugs if s not in known]

                    now = datetime.now(timezone.utc)
                    for slug in all_slugs:
                        cur.execute(
                            """
                            INSERT INTO ashby_slugs (slug, first_seen, last_seen)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (slug) DO UPDATE SET last_seen = EXCLUDED.last_seen
                            """,
                            (slug, now, now),
                        )
        except psycopg.Error as exc:
            log.warning("ashby_slugs persist failed: %s", exc)
            new_slugs = list(all_slugs)
    elif dry_run:
        new_slugs = list(all_slugs)

    log.info("ashby_discovery slugs=%d new=%d queries=%d results=%d",
             len(all_slugs), len(new_slugs), queries_run, results_seen)
    return {
        "slugs": all_slugs,
        "new_slugs": new_slugs,
        "queries_run": queries_run,
        "results_seen": results_seen,
        "graph_meta": {"graph": "ashby_discovery", "version": "v1"},
    }


# ── Build graph ───────────────────────────────────────────────────────────────


def build_graph(checkpointer: Any = None) -> Any:
    g = StateGraph(AshbyDiscoveryState)
    g.add_node("discover", discover)
    g.add_edge(START, "discover")
    g.add_edge("discover", END)
    return g.compile(checkpointer=checkpointer)


graph = build_graph()
