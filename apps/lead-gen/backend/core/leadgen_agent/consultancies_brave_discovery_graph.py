"""Consultancies Brave-Search discovery graph.

Native Python port of ``consultancies/discover_brave.py`` and the
``extract_domains.py`` helper.

Two routing nodes:

1. **discover** (default). Run the AI-native lead-gen / sales-platform query
   bank against the Brave Search API via
   ``langchain_community.utilities.BraveSearchWrapper``, parse hits into
   candidate ``Company`` rows, deduplicate against Neon (and optionally
   LanceDB), and upsert into ``companies`` + ``company_facts``.

2. **extract_domains**. Pull canonical domains from Neon (filtered by
   ``min_confidence``), strip aggregator/blocklist hosts, and emit a sorted
   newline-delimited list. When ``LANCE_DB_PATH`` is set and ``lancedb`` is
   importable, also unions in domains from the local ``companies`` table.

Environment:
    BRAVE_SEARCH_API_KEY              Brave Search API key (required for discover).
    NEON_DATABASE_URL / DATABASE_URL  Neon connection string (required for writes).
    LANCE_DB_PATH                     Optional path to a LanceDB store on disk
                                      (e.g. apps/lead-gen/consultancies/data/consultancies.lance).

The graph is a simple switch on ``state.node``; each node runs to completion
then the graph ends. Set ``dry_run=True`` to skip Neon/LanceDB writes.
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
from urllib.parse import urlparse

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

log = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

_DEFAULT_COUNT = 10
_RATE_LIMIT_DELAY_S = 1.0
_USER_AGENT = "Mozilla/5.0 (compatible; ConsultancyBraveDiscovery/0.1)"
_BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search"
_BRAVE_TIMEOUT_S = 20.0

_QUERIES: tuple[str, ...] = (
    # Tier 1 — direct AI lead-gen platforms
    '"AI-native" lead generation platform',
    '"AI-powered" sales automation tool',
    '"AI prospecting" platform B2B',
    "AI lead generation SaaS company",
    '"AI sales intelligence" platform',
    # Tier 2 — adjacent categories
    '"conversational AI" sales platform',
    '"AI SDR" outbound platform',
    "AI pipeline generation tool B2B",
    '"revenue intelligence" AI platform',
    # Tier 3 — specific niches
    '"AI outreach" platform email',
    '"AI-native" sales engagement platform',
    "AI-powered B2B prospecting companies",
)

_LISTICLE_NAME_RE = re.compile(
    r"^\s*(the\s+)?\d+\s+"
    r"|\bbest\s+ai\b|\btop\s+ai\b"
    r"|\bbest\s+(sales|sdr|outreach|prospect|lead\s+gen)"
    r"|\b(in|for)\s+20(2[4-9]|3[0-9])\b"
    r"|\b(guide|review|comparison|listicle|tutorial)\b"
    r"|\b(sales|sdr|outreach|prospecting)\s+tools?\b",
    re.IGNORECASE,
)

_SKIP_DOMAINS: frozenset[str] = frozenset({
    "clutch.co", "goodfirms.co", "wellfound.com", "itfirms.co",
    "linkedin.com", "twitter.com", "facebook.com", "youtube.com",
    "wikipedia.org", "crunchbase.com", "glassdoor.com", "indeed.com",
    "g2.com", "github.com", "medium.com", "substack.com",
    "reddit.com", "quora.com", "capterra.com", "getapp.com",
    "softwareadvice.com", "trustradius.com", "sourceforge.net",
    "techcrunch.com", "forbes.com", "businessinsider.com",
    "hubspot.com", "salesforce.com",
    "elfsight.com", "goconsensus.com", "guideflow.com", "scopicstudios.com",
    "skaled.com", "42dm.net", "oreateai.com", "retreva.com", "foundersgtm.com",
    "coldiq.com", "signalfire.com", "assemblyai.com", "research.aimultiple.com",
    "pipeline.zoominfo.com", "renewator.com", "knock-ai.com", "spotio.com",
    "heysam.ai", "dealcode.ai",
})

_EXTRACT_DOMAINS_SKIP: frozenset[str] = frozenset({
    "clutch.co", "goodfirms.co", "wellfound.com", "itfirms.co",
    "linkedin.com", "twitter.com", "facebook.com", "youtube.com",
    "wikipedia.org", "crunchbase.com", "glassdoor.com", "indeed.com",
    "g2.com", "github.com", "medium.com", "substack.com",
})


# ── State ─────────────────────────────────────────────────────────────────────


def _merge_dict(left: dict | None, right: dict | None) -> dict:
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class ConsultanciesBraveState(TypedDict, total=False):
    """State for the consultancies Brave-discovery graph.

    Input keys:
        node              "discover" (default) or "extract_domains".
        queries           Extra queries to append (only for "discover").
        count             Results per query (default 10, max 20).
        dry_run           When true, skip all writes.
        write_lance       Try LanceDB writes when LANCE_DB_PATH is set.
        min_confidence    Filter for "extract_domains" — drops companies below
                          ``ai_classification_confidence``. Default 0.0.

    Output keys:
        upserted          Number of new ``companies`` rows written.
        skipped           Number skipped (existing or invalid).
        top               Brief preview of the new companies.
        exported_domains  Sorted list of domains (extract_domains node).
        exported_count    ``len(exported_domains)``.
    """

    # input
    node: str
    queries: list[str]
    count: int
    dry_run: bool
    write_lance: bool
    min_confidence: float
    # output
    upserted: int
    skipped: int
    top: list[dict[str, Any]]
    exported_domains: list[str]
    exported_count: int
    # plumbing
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_dict]


# ── Data model ────────────────────────────────────────────────────────────────


@dataclass
class _Candidate:
    name: str
    website: str
    description: str = ""
    source: str = "brave_search"
    domain: str = ""
    key: str = ""


# ── Helpers ───────────────────────────────────────────────────────────────────


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


def _is_homepage(url: str) -> bool:
    try:
        return (urlparse(url).path or "").strip("/") == ""
    except ValueError:
        return False


def _extract_name(title: str) -> str:
    for sep in (" | ", " - ", " :: ", " — ", " – ", " · "):
        if sep in title:
            title = title.split(sep, 1)[0]
            break
    return title.strip()


def _should_skip(domain: str) -> bool:
    return any(skip in domain for skip in _SKIP_DOMAINS)


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


# ── Brave Search ──────────────────────────────────────────────────────────────


async def _brave_search(
    client: httpx.AsyncClient, api_key: str, query: str, count: int
) -> list[dict[str, Any]]:
    """Hit Brave Search REST API directly. Mirrors BraveSearchWrapper output."""
    resp = await client.get(
        _BRAVE_API_URL,
        headers={
            "X-Subscription-Token": api_key,
            "Accept": "application/json",
            "User-Agent": _USER_AGENT,
        },
        params={"q": query, "count": min(count, 20)},
        timeout=_BRAVE_TIMEOUT_S,
    )
    resp.raise_for_status()
    body = resp.json()
    web = (body.get("web") or {}).get("results") or []
    return [
        {
            "title": r.get("title") or "",
            "link": r.get("url") or "",
            "snippet": r.get("description") or "",
        }
        for r in web
    ]


def _extract_candidates(results: list[dict[str, Any]]) -> list[_Candidate]:
    seen: set[str] = set()
    out: list[_Candidate] = []
    for r in results:
        url = r.get("link") or ""
        title = r.get("title") or ""
        snippet = r.get("snippet") or r.get("description") or ""

        domain = _normalize_domain(url)
        if not domain or _should_skip(domain) or domain in seen:
            continue
        if not _is_homepage(url):
            continue
        seen.add(domain)

        name = _extract_name(title)
        if not name or len(name) < 2 or _LISTICLE_NAME_RE.search(name):
            continue

        out.append(_Candidate(
            name=name,
            website=url,
            description=snippet,
            domain=domain,
            key=_domain_to_key(domain),
        ))
    return out


# ── Neon dedup + insert ───────────────────────────────────────────────────────


def _dedup_against_neon(candidates: list[_Candidate]) -> list[_Candidate]:
    if not candidates:
        return candidates
    keys = [c.key for c in candidates]
    existing: set[str] = set()
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT key FROM companies WHERE key = ANY(%s)", (keys,))
                existing = {row[0] for row in cur.fetchall()}
    except psycopg.Error as e:
        log.warning("Neon dedup failed (%s) — proceeding without", e)
        return candidates
    before = len(candidates)
    out = [c for c in candidates if c.key not in existing]
    log.info("Neon dedup: %d → %d new candidates", before, len(out))
    return out


def _insert_into_neon(candidates: list[_Candidate]) -> tuple[int, int]:
    """Insert each candidate (skip on key conflict). Returns (imported, skipped)."""
    now = datetime.now(timezone.utc).isoformat()
    imported = 0
    skipped = 0
    try:
        conn = psycopg.connect(_dsn(), autocommit=False, connect_timeout=10)
    except psycopg.Error as e:
        log.warning("Neon connection failed: %s", e)
        return (0, len(candidates))

    try:
        with conn.cursor() as cur:
            for c in candidates:
                try:
                    cur.execute(
                        """
                        INSERT INTO companies
                          (key, name, website, canonical_domain, description,
                           category, ai_tier, score, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (key) DO NOTHING
                        RETURNING id
                        """,
                        (
                            c.key, c.name, c.website, c.domain, c.description,
                            "UNKNOWN", 0, 0.5, now, now,
                        ),
                    )
                    row = cur.fetchone()
                    if row is None:
                        skipped += 1
                        continue
                    company_id = int(row[0])
                    imported += 1
                    cur.execute(
                        """
                        INSERT INTO company_facts
                          (company_id, field, value_text, confidence,
                           source_type, source_url, observed_at, method)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (
                            company_id, "discovery_source",
                            f"brave_search: {c.name}", 0.7,
                            "BRAVE_SEARCH", c.website, now, "HEURISTIC",
                        ),
                    )
                except psycopg.Error as e:
                    log.warning("Neon insert error for %s: %s", c.name, e)
                    conn.rollback()
                    continue
            conn.commit()
    finally:
        conn.close()
    return (imported, skipped)


# ── Optional LanceDB writes ───────────────────────────────────────────────────


def _maybe_write_lance(candidates: list[_Candidate]) -> int:
    """Write candidates to a local LanceDB store if LANCE_DB_PATH is set and
    the optional ``lancedb`` package is importable. Embeddings are skipped
    when ``sentence-transformers`` is not present (zero vectors filled in).
    Returns the number of records written, or 0 when the path/dep is missing.
    """
    path = os.environ.get("LANCE_DB_PATH", "").strip()
    if not path:
        return 0
    try:
        import lancedb  # type: ignore
    except ImportError:
        log.info("lancedb not installed — skipping LanceDB write")
        return 0

    try:
        from sentence_transformers import SentenceTransformer  # type: ignore
        model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        texts = [f"{c.name}. {c.description[:500]}" for c in candidates]
        vectors = model.encode(texts, show_progress_bar=False, batch_size=32).tolist()
    except ImportError:
        log.info("sentence-transformers not installed — using zero vectors")
        vectors = [[0.0] * 384 for _ in candidates]

    records = [
        {
            "name": c.name,
            "website": c.website,
            "description": c.description,
            "source": c.source,
            "domain": c.domain,
            "vector": v,
        }
        for c, v in zip(candidates, vectors)
    ]
    db = lancedb.connect(path)
    try:
        tbl = db.open_table("companies")
        tbl.add(records)
    except Exception:
        tbl = db.create_table("companies", records)
    return len(records)


# ── Node 1: discover ──────────────────────────────────────────────────────────


async def discover(state: ConsultanciesBraveState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()

    api_key = os.environ.get("BRAVE_SEARCH_API_KEY", "").strip()
    if not api_key:
        return {"_error": "BRAVE_SEARCH_API_KEY is not set"}

    queries = list(_QUERIES) + list(state.get("queries") or [])
    count = int(state.get("count") or _DEFAULT_COUNT)
    dry_run = bool(state.get("dry_run"))

    all_results: list[dict[str, Any]] = []
    async with httpx.AsyncClient() as client:
        for i, q in enumerate(queries):
            log.info("[%d/%d] Brave: %s", i + 1, len(queries), q)
            try:
                hits = await _brave_search(client, api_key, q, count)
                log.info("  → %d results", len(hits))
                all_results.extend(hits)
            except (httpx.HTTPError, ValueError) as e:
                log.warning("  → error: %s", e)
            if i < len(queries) - 1:
                await asyncio.sleep(_RATE_LIMIT_DELAY_S)

    candidates = _extract_candidates(all_results)
    log.info("Extracted %d unique candidates from %d hits",
             len(candidates), len(all_results))

    if not dry_run:
        candidates = _dedup_against_neon(candidates)

    if dry_run:
        log.info("[DRY] %d candidates", len(candidates))
        top = [
            {"name": c.name, "domain": c.domain, "website": c.website}
            for c in candidates[:10]
        ]
        return {
            "upserted": 0,
            "skipped": 0,
            "top": top,
            "agent_timings": {"discover": round(time.perf_counter() - t0, 3)},
            "graph_meta": {
                "graph": "consultancies_brave_discovery",
                "version": "v1",
                "node": "discover",
            },
        }

    imported, skipped = _insert_into_neon(candidates)

    if state.get("write_lance") and candidates:
        try:
            wrote = _maybe_write_lance(candidates)
            log.info("LanceDB: wrote %d records", wrote)
        except Exception as e:  # noqa: BLE001 — LanceDB is best-effort
            log.warning("LanceDB write failed: %s", e)

    top = [
        {"name": c.name, "domain": c.domain, "website": c.website}
        for c in candidates[:10]
    ]
    log.info("Brave discovery: imported=%d skipped=%d", imported, skipped)
    return {
        "upserted": imported,
        "skipped": skipped,
        "top": top,
        "agent_timings": {"discover": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "graph": "consultancies_brave_discovery",
            "version": "v1",
            "node": "discover",
        },
    }


# ── Node 2: extract_domains ───────────────────────────────────────────────────


def _domains_from_neon(min_confidence: float) -> set[str]:
    domains: set[str] = set()
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT canonical_domain, website, ai_classification_confidence
                    FROM companies
                    WHERE blocked = false
                      AND category != 'UNKNOWN'
                      AND (canonical_domain IS NOT NULL OR website IS NOT NULL)
                    """
                )
                for canonical_domain, website, confidence in cur.fetchall():
                    if min_confidence > 0 and (confidence or 0) < min_confidence:
                        continue
                    if canonical_domain and "." in canonical_domain:
                        domains.add(canonical_domain.lower().replace("www.", ""))
                    elif website:
                        d = _normalize_domain(website)
                        if d:
                            domains.add(d)
    except psycopg.Error as e:
        log.warning("Neon extract_domains failed: %s", e)
    return domains


def _domains_from_lance() -> set[str]:
    path = os.environ.get("LANCE_DB_PATH", "").strip()
    if not path:
        return set()
    try:
        import lancedb  # type: ignore
    except ImportError:
        return set()
    domains: set[str] = set()
    try:
        db = lancedb.connect(path)
        tbl = db.open_table("companies")
        df = tbl.to_pandas()
        for _, row in df.iterrows():
            website = row.get("website") or ""
            if website:
                d = _normalize_domain(website)
                if d:
                    domains.add(d)
    except Exception as e:  # noqa: BLE001 — best effort
        log.warning("LanceDB extract_domains failed: %s", e)
    return domains


async def extract_domains(state: ConsultanciesBraveState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    min_confidence = float(state.get("min_confidence") or 0.0)

    domains = _domains_from_neon(min_confidence) | _domains_from_lance()
    domains = {d for d in domains if not any(s in d for s in _EXTRACT_DOMAINS_SKIP)}
    sorted_domains = sorted(domains)

    log.info("extract_domains: %d unique domains (min_confidence=%.2f)",
             len(sorted_domains), min_confidence)

    return {
        "exported_domains": sorted_domains,
        "exported_count": len(sorted_domains),
        "agent_timings": {"extract_domains": round(time.perf_counter() - t0, 3)},
        "graph_meta": {
            "graph": "consultancies_brave_discovery",
            "version": "v1",
            "node": "extract_domains",
        },
    }


# ── Build graph ───────────────────────────────────────────────────────────────


def _route(state: ConsultanciesBraveState) -> str:
    node = (state.get("node") or "discover").strip().lower()
    return "extract_domains" if node == "extract_domains" else "discover"


def _build() -> Any:
    g = StateGraph(ConsultanciesBraveState)
    g.add_node("discover", discover)
    g.add_node("extract_domains", extract_domains)
    g.add_conditional_edges(
        START,
        _route,
        {"discover": "discover", "extract_domains": "extract_domains"},
    )
    g.add_edge("discover", END)
    g.add_edge("extract_domains", END)
    return g.compile()


graph = _build()
