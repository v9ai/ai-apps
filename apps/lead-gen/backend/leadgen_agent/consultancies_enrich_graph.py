"""Consultancies enrichment graph.

Native Python port of ``consultancies/enrich_brave.py`` (bulk website-scrape +
LLM classification) and ``consultancies/enrich_hf_hub.py`` (HuggingFace Hub
presence signals).

Two routing nodes (selected by ``state.node``):

1. **brave** (default). Pull UNKNOWN companies (optionally restricted to those
   discovered via the ``BRAVE_SEARCH`` provenance tag), scrape a small set of
   high-signal pages with ``httpx`` + BeautifulSoup, classify with the shared
   ``make_llm()`` factory (``mlx_lm.server`` locally, DeepSeek when
   ``LLM_PROVIDER=deepseek``), compute the enrichment score, then upsert
   columns + ``company_facts`` rows into Neon.

2. **hf_hub**. Load companies that haven't been HF-enriched yet, resolve each
   to a HuggingFace organization (domain → name variants → GitHub handle →
   search), pull model / dataset / Spaces metadata, score presence on a
   100-point scale, and persist signals to Neon.

The Crawl4AI single-company deep-scrape variant (``scrape_crawl4ai.py``) is
deliberately not folded in here — it's already wrapped by
``deep_scrape_graph.py`` as an out-of-band subprocess to keep Playwright /
Chromium out of the LangGraph container image.

Environment:
    NEON_DATABASE_URL / DATABASE_URL  Neon connection string (required for writes).
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
from urllib.parse import urljoin, urlparse

import httpx
import psycopg
from bs4 import BeautifulSoup
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm

log = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

_MAX_CONCURRENT_FETCH = 12
_FETCH_TIMEOUT_S = 20.0
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)
_PER_PAGE_DELAY_S = 0.4
_SCRAPE_PATHS: tuple[str, ...] = (
    "",  # homepage
    "/about",
    "/about-us",
    "/pricing",
    "/careers",
    "/services",
    "/solutions",
    "/customers",
    "/product",
)
_PAGE_TEXT_LIMIT = 2_000
_FULL_TEXT_LIMIT = 6_000

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
_SKIP_EMAIL_DOMAINS: frozenset[str] = frozenset({
    "example.com", "sentry.io", "wixpress.com", "googleapis.com",
    "cloudflare.com", "w3.org", "schema.org", "facebook.com",
    "twitter.com", "google.com", "apple.com",
})

_HF_RATE_LIMIT_S = 1.0


# ── State ─────────────────────────────────────────────────────────────────────


def _merge_dict(left: dict | None, right: dict | None) -> dict:
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class ConsultanciesEnrichState(TypedDict, total=False):
    """State for the consultancies enrichment graph.

    Input keys:
        node                "brave" (default) or "hf_hub".
        all_unenriched      For brave: enrich any UNKNOWN, not just BRAVE_SEARCH.
        skip_llm            For brave: scrape only, skip LLM classification.
        limit               Max companies to process. 0 = no limit.
        dry_run             Skip Neon writes.

    Output keys:
        loaded              Companies pulled from Neon.
        scraped             Successfully scraped (brave only).
        classified          Successfully LLM-classified (brave only).
        resolved            HF orgs resolved (hf_hub only).
        updated             Companies updated in Neon.
        facts_inserted      Provenance facts inserted.
        top                 Brief preview of top results.
    """

    # input
    node: str
    all_unenriched: bool
    skip_llm: bool
    limit: int
    dry_run: bool
    # output
    loaded: int
    scraped: int
    classified: int
    resolved: int
    updated: int
    facts_inserted: int
    top: list[dict[str, Any]]
    # plumbing
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_dict]


# ── Data model (internal) ─────────────────────────────────────────────────────


@dataclass
class _Record:
    id: int
    key: str
    name: str
    website: str
    canonical_domain: str
    github_url: str = ""
    page_text: str = ""
    emails_found: list[str] = field(default_factory=list)
    has_careers_page: bool = False
    has_pricing_page: bool = False
    enrichment: dict[str, Any] = field(default_factory=dict)
    hf_org_name: str = ""
    hf_score: float = 0.0
    hf_reasons: list[str] = field(default_factory=list)
    hf_signals: dict[str, Any] = field(default_factory=dict)


# ── Helpers ───────────────────────────────────────────────────────────────────


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


def _extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.select("nav, footer, script, style, header, .cookie, noscript"):
        tag.decompose()
    return soup.get_text(separator=" ", strip=True)


def _extract_emails(html: str) -> list[str]:
    found = _EMAIL_RE.findall(html)
    return sorted({
        e.lower() for e in found
        if not any(skip in e.lower() for skip in _SKIP_EMAIL_DOMAINS)
        and not e.lower().endswith((".png", ".jpg", ".svg", ".gif"))
    })


# ── Brave-search enrichment ───────────────────────────────────────────────────


def _load_brave_records(all_unenriched: bool, limit: int) -> list[_Record]:
    if all_unenriched:
        sql = """
            SELECT id, key, name, COALESCE(website, ''), COALESCE(canonical_domain, '')
            FROM companies
            WHERE category = 'UNKNOWN' AND blocked = false
            ORDER BY created_at DESC
        """
    else:
        sql = """
            SELECT c.id, c.key, c.name, COALESCE(c.website, ''),
                   COALESCE(c.canonical_domain, '')
            FROM companies c
            JOIN company_facts cf ON cf.company_id = c.id
            WHERE cf.source_type = 'BRAVE_SEARCH'
              AND c.category = 'UNKNOWN'
              AND c.blocked = false
            GROUP BY c.id
            ORDER BY c.created_at DESC
        """
    if limit and limit > 0:
        sql += f" LIMIT {int(limit)}"

    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    return [
        _Record(
            id=int(r[0]), key=str(r[1]), name=str(r[2]),
            website=str(r[3] or ""), canonical_domain=str(r[4] or ""),
        )
        for r in rows
    ]


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
    emails: set[str] = set()

    for path in _SCRAPE_PATHS:
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
            texts.append(text[:_PAGE_TEXT_LIMIT])
        emails.update(_extract_emails(html))
        if path in ("/careers", "/jobs"):
            rec.has_careers_page = True
        elif path == "/pricing":
            rec.has_pricing_page = True
        await asyncio.sleep(_PER_PAGE_DELAY_S)

    rec.page_text = " | ".join(texts)[:_FULL_TEXT_LIMIT]
    rec.emails_found = sorted(emails)
    return rec


_CLASSIFY_PROMPT = (
    "Analyze this company and respond ONLY with valid JSON, no other text.\n\n"
    "Company: {name}\nWebsite: {domain}\nText from their website:\n{text}\n\n"
    "Return JSON with these exact keys:\n"
    '{{\n'
    '  "category": "PRODUCT or CONSULTANCY or AGENCY or STAFFING or UNKNOWN",\n'
    '  "ai_tier": 0 or 1 or 2,\n'
    '  "services": ["list of products/services they offer"],\n'
    '  "tech_stack": ["technologies, frameworks, AI/ML tools mentioned"],\n'
    '  "industry": "primary industry vertical (e.g. sales_tech, martech, hr_tech)",\n'
    '  "employee_range": "1-10 or 11-50 or 51-200 or 201-500 or 500+",\n'
    '  "remote_policy": "remote or hybrid or onsite or unknown",\n'
    '  "funding_stage": "bootstrapped or seed or series_a or series_b or series_c_plus or public or unknown",\n'
    '  "pricing_model": "freemium or subscription or usage_based or enterprise or unknown",\n'
    '  "target_market": "smb or mid_market or enterprise or all",\n'
    '  "key_features": ["top 5 differentiating features"],\n'
    '  "competitors": ["known competitors mentioned or implied"],\n'
    '  "one_line_summary": "What they do in 15 words or less",\n'
    '  "confidence": 0.0 to 1.0\n'
    '}}\n\n'
    "Rules:\n"
    "- ai_tier: 0=not AI, 1=AI-first (core to product), 2=AI-native (built entirely on AI/ML)\n"
    "- category: PRODUCT=SaaS, CONSULTANCY=advisory, AGENCY=services\n"
    "- Be specific with tech_stack: actual frameworks (LangChain, GPT-4, RAG)\n"
    "- For competitors, only list companies you can infer from the text"
)


async def _classify_record(rec: _Record) -> _Record:
    if not rec.page_text or len(rec.page_text) < 100:
        return rec
    provider = os.environ.get("LLM_PROVIDER", "").strip().lower() or None
    llm = make_llm(temperature=0.1, provider=provider)
    prompt = _CLASSIFY_PROMPT.format(
        name=rec.name,
        domain=rec.canonical_domain or rec.website,
        text=rec.page_text[:3000],
    )
    try:
        data = await ainvoke_json(
            llm, [{"role": "user", "content": prompt}], provider=provider,
        )
    except (httpx.HTTPError, ValueError, RuntimeError) as e:
        log.warning("[classify] %s — error: %s", rec.name, e)
        return rec
    if isinstance(data, dict):
        rec.enrichment = data
    return rec


def _compute_brave_score(
    e: dict[str, Any], has_careers: bool, has_pricing: bool,
) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    ai_tier = int(e.get("ai_tier") or 0)
    if ai_tier == 2:
        score += 0.30
        reasons.append("AI-native (tier 2)")
    elif ai_tier == 1:
        score += 0.20
        reasons.append("AI-first (tier 1)")
    else:
        reasons.append("Not AI-focused (tier 0)")

    cat = e.get("category", "UNKNOWN")
    if cat == "PRODUCT":
        score += 0.15
        reasons.append(f"Category: {cat}")
    elif cat in ("CONSULTANCY", "AGENCY"):
        score += 0.10
        reasons.append(f"Category: {cat}")

    services = e.get("services") or []
    score += min(len(services) / 5.0, 1.0) * 0.15
    reasons.append(f"{len(services)} services identified")

    tech = e.get("tech_stack") or []
    score += min(len(tech) / 5.0, 1.0) * 0.10
    reasons.append(f"{len(tech)} tech signals")

    pricing = e.get("pricing_model", "unknown")
    if pricing != "unknown":
        score += 0.10
        reasons.append(f"Pricing: {pricing}")

    if has_careers:
        score += 0.05
        reasons.append("Has careers page")
    if has_pricing:
        score += 0.05
        reasons.append("Has pricing page")

    conf = float(e.get("confidence") or 0.5)
    score += conf * 0.05
    reasons.append(f"Confidence: {conf:.0%}")

    return round(min(score, 1.0), 3), reasons


def _persist_brave_records(records: list[_Record]) -> tuple[int, int]:
    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    facts_inserted = 0
    try:
        conn = psycopg.connect(_dsn(), autocommit=False, connect_timeout=10)
    except psycopg.Error as e:
        log.error("Neon connection failed: %s", e)
        return (0, 0)
    try:
        with conn.cursor() as cur:
            for rec in records:
                e = rec.enrichment
                if not e:
                    continue
                score, score_reasons = _compute_brave_score(
                    e, rec.has_careers_page, rec.has_pricing_page,
                )
                ai_tier = int(e.get("ai_tier") or 0)
                category = e.get("category", "UNKNOWN")
                if category not in ("PRODUCT", "CONSULTANCY", "AGENCY", "STAFFING", "UNKNOWN"):
                    category = "UNKNOWN"
                try:
                    cur.execute(
                        """
                        UPDATE companies SET
                            category = %s,
                            ai_tier = %s,
                            ai_classification_reason = %s,
                            ai_classification_confidence = %s,
                            description = %s,
                            services = %s,
                            tags = %s,
                            industries = %s,
                            size = %s,
                            score = %s,
                            score_reasons = %s,
                            emails = %s,
                            updated_at = %s
                        WHERE id = %s
                        """,
                        (
                            category,
                            ai_tier,
                            e.get("one_line_summary", ""),
                            float(e.get("confidence") or 0.5),
                            e.get("one_line_summary", ""),
                            json.dumps(e.get("services") or []),
                            json.dumps(
                                (e.get("tech_stack") or [])
                                + (e.get("key_features") or [])
                                + [f"pricing:{e.get('pricing_model', 'unknown')}",
                                   f"market:{e.get('target_market', 'unknown')}",
                                   f"funding:{e.get('funding_stage', 'unknown')}"]
                            ),
                            json.dumps([e.get("industry", "unknown")]),
                            e.get("employee_range", ""),
                            score,
                            json.dumps(score_reasons),
                            json.dumps(rec.emails_found) if rec.emails_found else None,
                            now,
                            rec.id,
                        ),
                    )
                    updated += 1
                    fact_fields = [
                        ("category", category),
                        ("ai_tier", str(ai_tier)),
                        ("services", json.dumps(e.get("services") or [])),
                        ("tech_stack", json.dumps(e.get("tech_stack") or [])),
                        ("industry", e.get("industry", "")),
                        ("employee_range", e.get("employee_range", "")),
                        ("remote_policy", e.get("remote_policy", "unknown")),
                        ("funding_stage", e.get("funding_stage", "unknown")),
                        ("pricing_model", e.get("pricing_model", "unknown")),
                        ("target_market", e.get("target_market", "unknown")),
                        ("competitors", json.dumps(e.get("competitors") or [])),
                    ]
                    for field_name, value in fact_fields:
                        if not value or value in ("unknown", "UNKNOWN", "[]", '""'):
                            continue
                        cur.execute(
                            """
                            INSERT INTO company_facts
                                (company_id, field, value_text, confidence,
                                 source_type, source_url, observed_at, method)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                rec.id, field_name, value,
                                float(e.get("confidence") or 0.5),
                                "BRAVE_SEARCH",
                                rec.website or f"https://{rec.canonical_domain}",
                                now, "LLM",
                            ),
                        )
                        facts_inserted += 1
                except psycopg.Error as e2:
                    log.warning("Neon update for %s failed: %s", rec.name, e2)
                    conn.rollback()
                    continue
            conn.commit()
    finally:
        conn.close()
    return (updated, facts_inserted)


async def brave(state: ConsultanciesEnrichState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    all_unenriched = bool(state.get("all_unenriched"))
    limit = int(state.get("limit") or 0)
    skip_llm = bool(state.get("skip_llm"))
    dry_run = bool(state.get("dry_run"))

    records = _load_brave_records(all_unenriched, limit)
    log.info("brave: loaded %d records", len(records))
    if not records:
        return {
            "loaded": 0, "scraped": 0, "classified": 0, "updated": 0,
            "facts_inserted": 0, "top": [],
            "agent_timings": {"brave": round(time.perf_counter() - t0, 3)},
            "graph_meta": {"graph": "consultancies_enrich", "version": "v1", "node": "brave"},
        }

    sem = asyncio.Semaphore(_MAX_CONCURRENT_FETCH)
    async with httpx.AsyncClient() as client:
        records = await asyncio.gather(*[_scrape_record(client, sem, r) for r in records])
    scraped = sum(1 for r in records if r.page_text)
    log.info("brave: scraped %d/%d", scraped, len(records))

    classified = 0
    if not skip_llm:
        for r in records:
            await _classify_record(r)
            if r.enrichment:
                classified += 1
        log.info("brave: classified %d/%d", classified, len(records))

    if dry_run:
        top = [
            {"id": r.id, "name": r.name,
             "category": r.enrichment.get("category"),
             "ai_tier": r.enrichment.get("ai_tier")}
            for r in records if r.enrichment
        ][:10]
        return {
            "loaded": len(records), "scraped": scraped, "classified": classified,
            "updated": 0, "facts_inserted": 0, "top": top,
            "agent_timings": {"brave": round(time.perf_counter() - t0, 3)},
            "graph_meta": {"graph": "consultancies_enrich", "version": "v1", "node": "brave"},
        }

    enriched = [r for r in records if r.enrichment]
    updated, facts_inserted = _persist_brave_records(enriched) if enriched else (0, 0)
    log.info("brave: updated=%d facts_inserted=%d", updated, facts_inserted)

    top = [
        {"id": r.id, "name": r.name,
         "category": r.enrichment.get("category"),
         "ai_tier": r.enrichment.get("ai_tier")}
        for r in enriched
    ][:10]
    return {
        "loaded": len(records), "scraped": scraped, "classified": classified,
        "updated": updated, "facts_inserted": facts_inserted, "top": top,
        "agent_timings": {"brave": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"graph": "consultancies_enrich", "version": "v1", "node": "brave"},
    }


# ── HF Hub enrichment ─────────────────────────────────────────────────────────


def _normalize_hf_candidates(name: str) -> list[str]:
    candidates: list[str] = []
    clean = name.strip()
    lower = clean.lower()
    for suffix in (
        " inc", " inc.", " ltd", " ltd.", " llc", " gmbh",
        " co.", " co", " corp", " corp.", " ai", " labs",
        " technologies", " technology", " software",
    ):
        if lower.endswith(suffix):
            lower = lower[: -len(suffix)].strip()
    kebab = re.sub(r"[^a-z0-9]+", "-", lower).strip("-")
    candidates.append(kebab)
    no_sep = re.sub(r"[^a-z0-9]", "", lower)
    candidates.append(no_sep)
    if not kebab.endswith("-ai"):
        candidates.append(f"{kebab}-ai")
        candidates.append(f"{no_sep}ai")
    candidates.extend([
        f"{no_sep}forai", f"{kebab}-for-ai",
        f"{no_sep}labs", f"{kebab}-labs",
        f"{no_sep}-hf", f"{no_sep}research",
    ])
    pascal = re.sub(r"[^a-zA-Z0-9]", "", clean)
    if pascal.lower() not in [c.lower() for c in candidates]:
        candidates.append(pascal)
    seen: set[str] = set()
    out: list[str] = []
    for c in candidates:
        cl = c.lower()
        if c and cl not in seen:
            seen.add(cl)
            out.append(c)
    return out


def _domain_to_hf_candidates(domain: str) -> list[str]:
    if not domain:
        return []
    d = domain.lower().replace("www.", "")
    parts = d.split(".")
    return [parts[0]] if len(parts) >= 2 else []


def _github_to_hf_candidates(github_url: str) -> list[str]:
    if not github_url:
        return []
    parsed = urlparse(github_url)
    parts = (parsed.path or "").strip("/").split("/")
    return [parts[0].lower()] if parts and parts[0] else []


def _jaccard(a: str, b: str) -> float:
    sa, sb = set(a), set(b)
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _resolve_hf_org(api: Any, rec: _Record) -> str | None:
    candidates = (
        _domain_to_hf_candidates(rec.canonical_domain)
        + _normalize_hf_candidates(rec.name)
        + _github_to_hf_candidates(rec.github_url)
    )
    seen: set[str] = set()
    unique: list[str] = []
    for c in candidates:
        cl = c.lower()
        if cl not in seen:
            seen.add(cl)
            unique.append(c)

    for cand in unique[:12]:
        try:
            models = list(api.list_models(author=cand, limit=1))
            if models:
                return cand
            time.sleep(0.3)
        except Exception:  # noqa: BLE001 — HF API exceptions vary
            continue

    try:
        models = list(api.list_models(search=rec.name, limit=10))
        authors: dict[str, int] = {}
        for m in models:
            author = (getattr(m, "author", None) or "")
            if not author and getattr(m, "id", None) and "/" in m.id:
                author = m.id.split("/")[0]
            if author:
                authors[author] = authors.get(author, 0) + 1
        if authors:
            best = max(authors, key=lambda k: authors[k])
            name_l = rec.name.lower().replace(" ", "")
            best_l = best.lower().replace("-", "").replace("_", "")
            if name_l in best_l or best_l in name_l or _jaccard(name_l, best_l) > 0.4:
                return best
    except Exception:  # noqa: BLE001 — HF API exceptions vary
        pass
    return None


def _format_params(n: int) -> str:
    if n >= 1_000_000_000:
        return f"{n / 1e9:.1f}B"
    if n >= 1_000_000:
        return f"{n / 1e6:.0f}M"
    if n >= 1_000:
        return f"{n / 1e3:.0f}K"
    return str(n)


def _extract_hf_signals(api: Any, org: str) -> dict[str, Any]:
    out: dict[str, Any] = {
        "org_name": org, "model_count": 0, "dataset_count": 0,
        "space_count": 0, "total_downloads": 0, "total_likes": 0,
        "task_diversity": [], "last_modified": "", "paper_count": 0,
        "model_sizes": [], "top_models": [],
    }
    try:
        models = list(api.list_models(author=org, limit=500))
        out["model_count"] = len(models)
        tasks: set[str] = set()
        latest = ""
        papers = 0
        sizes: list[str] = []
        top: list[tuple[int, dict[str, Any]]] = []
        for m in models:
            tag = getattr(m, "pipeline_tag", None)
            if tag:
                tasks.add(tag)
            out["total_downloads"] += int(getattr(m, "downloads", 0) or 0)
            out["total_likes"] += int(getattr(m, "likes", 0) or 0)
            modified = getattr(m, "last_modified", "") or ""
            if modified and str(modified) > latest:
                latest = str(modified)
            mtags = getattr(m, "tags", None) or []
            for t in mtags:
                if isinstance(t, str) and t.startswith("arxiv:"):
                    papers += 1
                    break
            safetensors = getattr(m, "safetensors", None)
            if safetensors:
                params = int(getattr(safetensors, "total", 0) or 0)
                if params > 0:
                    sizes.append(_format_params(params))
            top.append((
                int(getattr(m, "downloads", 0) or 0),
                {"id": getattr(m, "id", ""),
                 "downloads": int(getattr(m, "downloads", 0) or 0),
                 "pipeline_tag": tag or ""},
            ))
        out["task_diversity"] = sorted(tasks)
        out["last_modified"] = latest
        out["paper_count"] = papers
        out["model_sizes"] = sizes[:10]
        top.sort(key=lambda x: x[0], reverse=True)
        out["top_models"] = [t[1] for t in top[:5]]
    except Exception as e:  # noqa: BLE001 — HF API exceptions vary
        log.warning("HF list_models(%s) failed: %s", org, e)

    time.sleep(_HF_RATE_LIMIT_S)
    try:
        ds = list(api.list_datasets(author=org, limit=500))
        out["dataset_count"] = len(ds)
    except Exception as e:  # noqa: BLE001
        log.warning("HF list_datasets(%s) failed: %s", org, e)

    time.sleep(0.5)
    try:
        spaces = list(api.list_spaces(author=org, limit=500))
        out["space_count"] = len(spaces)
    except Exception as e:  # noqa: BLE001
        log.warning("HF list_spaces(%s) failed: %s", org, e)

    return out


def _compute_hf_score(s: dict[str, Any]) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []
    if s.get("org_name"):
        score += 20
        reasons.append(f"HF org: {s['org_name']}")
    else:
        return score, ["No HF org found"]

    mc = int(s.get("model_count") or 0)
    if mc >= 20:
        score += 15; reasons.append(f"{mc} models (extensive)")
    elif mc >= 5:
        score += 10; reasons.append(f"{mc} models (moderate)")
    elif mc >= 1:
        score += 5; reasons.append(f"{mc} model(s)")

    dl = int(s.get("total_downloads") or 0)
    if dl >= 1_000_000:
        score += 15; reasons.append(f"{dl:,} total downloads (massive)")
    elif dl >= 10_000:
        score += 10; reasons.append(f"{dl:,} total downloads (significant)")
    elif dl >= 100:
        score += 5; reasons.append(f"{dl:,} total downloads")
    elif dl > 0:
        score += 2

    td = len(s.get("task_diversity") or [])
    if td >= 5:
        score += 15
    elif td >= 3:
        score += 10
    elif td >= 1:
        score += 5
    if td:
        reasons.append(f"{td} task type(s)")

    last = s.get("last_modified") or ""
    if last:
        try:
            dt = datetime.fromisoformat(str(last).replace("Z", "+00:00"))
            days = (datetime.now(timezone.utc) - dt).days
            if days < 30:
                score += 10; reasons.append(f"Active in last 30 days ({days}d ago)")
            elif days < 90:
                score += 7; reasons.append(f"Active in last 90 days ({days}d ago)")
            elif days < 365:
                score += 3; reasons.append(f"Active in last year ({days}d ago)")
        except (ValueError, TypeError):
            pass

    dc = int(s.get("dataset_count") or 0)
    if dc >= 5:
        score += 10; reasons.append(f"{dc} datasets (strong data signal)")
    elif dc >= 1:
        score += 6; reasons.append(f"{dc} dataset(s)")

    pc = int(s.get("paper_count") or 0)
    if pc >= 5:
        score += 10; reasons.append(f"{pc} papers linked (research org)")
    elif pc >= 1:
        score += 5; reasons.append(f"{pc} paper(s) linked")

    sc = int(s.get("space_count") or 0)
    if sc >= 3:
        score += 5; reasons.append(f"{sc} Spaces (product demos)")
    elif sc >= 1:
        score += 3; reasons.append(f"{sc} Space(s)")

    return min(score, 100.0), reasons


def _load_hf_records(limit: int) -> list[_Record]:
    sql = """
        SELECT id, key, name, COALESCE(website, ''), COALESCE(canonical_domain, ''),
               COALESCE(github_url, '')
        FROM companies
        WHERE blocked = false
          AND (hf_presence_score IS NULL OR hf_presence_score = 0)
        ORDER BY score DESC NULLS LAST, created_at DESC
    """
    if limit and limit > 0:
        sql += f" LIMIT {int(limit)}"
    with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()
    return [
        _Record(
            id=int(r[0]), key=str(r[1]), name=str(r[2]),
            website=str(r[3] or ""), canonical_domain=str(r[4] or ""),
            github_url=str(r[5] or ""),
        )
        for r in rows
    ]


def _persist_hf_records(records: list[_Record]) -> tuple[int, int]:
    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    facts_inserted = 0
    try:
        conn = psycopg.connect(_dsn(), autocommit=False, connect_timeout=10)
    except psycopg.Error as e:
        log.error("Neon connection failed: %s", e)
        return (0, 0)
    try:
        with conn.cursor() as cur:
            for rec in records:
                if not rec.hf_signals:
                    continue
                s = rec.hf_signals
                try:
                    cur.execute(
                        """
                        UPDATE companies SET
                            hf_org_name = %s,
                            hf_presence_score = %s,
                            updated_at = %s
                        WHERE id = %s
                        """,
                        (s.get("org_name") or None, rec.hf_score, now, rec.id),
                    )
                    if rec.hf_score >= 60:
                        cur.execute(
                            """
                            UPDATE companies SET
                                ai_tier = 2,
                                ai_classification_reason = COALESCE(ai_classification_reason, '')
                                    || ' [HF presence: ' || %s || ']'
                            WHERE id = %s AND ai_tier < 2
                            """,
                            (str(round(rec.hf_score)), rec.id),
                        )
                    updated += 1
                    fact_fields = [
                        ("hf_presence_score", str(rec.hf_score)),
                        ("hf_org_name", s.get("org_name") or ""),
                        ("hf_model_count", str(s.get("model_count") or 0)),
                        ("hf_total_downloads", str(s.get("total_downloads") or 0)),
                        ("hf_task_diversity", json.dumps(s.get("task_diversity") or [])),
                        ("hf_last_activity", s.get("last_modified") or ""),
                        ("hf_details", json.dumps(s)),
                    ]
                    for field_name, value in fact_fields:
                        if not value or value in ("0", "[]", ""):
                            continue
                        cur.execute(
                            """
                            INSERT INTO company_facts
                                (company_id, field, value_text, confidence,
                                 source_type, source_url, observed_at, method)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (
                                rec.id, field_name, value,
                                min(rec.hf_score / 100.0, 1.0),
                                "HF_HUB",
                                f"https://huggingface.co/{s.get('org_name') or ''}",
                                now, "API",
                            ),
                        )
                        facts_inserted += 1
                except psycopg.Error as e2:
                    log.warning("Neon HF update for %s failed: %s", rec.name, e2)
                    conn.rollback()
                    continue
            conn.commit()
    finally:
        conn.close()
    return (updated, facts_inserted)


async def hf_hub(state: ConsultanciesEnrichState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    try:
        from huggingface_hub import HfApi  # type: ignore
    except ImportError:
        return {"_error": "huggingface_hub package not installed"}

    api = HfApi()
    limit = int(state.get("limit") or 0)
    dry_run = bool(state.get("dry_run"))
    records = _load_hf_records(limit)
    log.info("hf_hub: loaded %d records", len(records))
    if not records:
        return {
            "loaded": 0, "resolved": 0, "updated": 0, "facts_inserted": 0, "top": [],
            "agent_timings": {"hf_hub": round(time.perf_counter() - t0, 3)},
            "graph_meta": {"graph": "consultancies_enrich", "version": "v1", "node": "hf_hub"},
        }

    resolved = 0
    for rec in records:
        org = _resolve_hf_org(api, rec)
        if not org:
            rec.hf_signals = {"org_name": ""}
            rec.hf_score = 0.0
            rec.hf_reasons = ["No HF org found"]
            continue
        signals = _extract_hf_signals(api, org)
        signals["resolved_via"] = "multi-step"
        rec.hf_org_name = org
        rec.hf_signals = signals
        score, reasons = _compute_hf_score(signals)
        rec.hf_score = score
        rec.hf_reasons = reasons
        resolved += 1
        time.sleep(_HF_RATE_LIMIT_S)
    log.info("hf_hub: resolved %d/%d", resolved, len(records))

    enriched = [r for r in records if r.hf_signals.get("org_name")]
    if dry_run or not enriched:
        top = [
            {"id": r.id, "name": r.name, "org": r.hf_signals.get("org_name"),
             "score": round(r.hf_score, 1)}
            for r in sorted(enriched, key=lambda r: r.hf_score, reverse=True)[:10]
        ]
        return {
            "loaded": len(records), "resolved": resolved,
            "updated": 0, "facts_inserted": 0, "top": top,
            "agent_timings": {"hf_hub": round(time.perf_counter() - t0, 3)},
            "graph_meta": {"graph": "consultancies_enrich", "version": "v1", "node": "hf_hub"},
        }

    updated, facts_inserted = _persist_hf_records(enriched)
    log.info("hf_hub: updated=%d facts_inserted=%d", updated, facts_inserted)

    top = [
        {"id": r.id, "name": r.name, "org": r.hf_signals.get("org_name"),
         "score": round(r.hf_score, 1)}
        for r in sorted(enriched, key=lambda r: r.hf_score, reverse=True)[:10]
    ]
    return {
        "loaded": len(records), "resolved": resolved,
        "updated": updated, "facts_inserted": facts_inserted, "top": top,
        "agent_timings": {"hf_hub": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"graph": "consultancies_enrich", "version": "v1", "node": "hf_hub"},
    }


# ── Build graph ───────────────────────────────────────────────────────────────


def _route(state: ConsultanciesEnrichState) -> str:
    node = (state.get("node") or "brave").strip().lower()
    return "hf_hub" if node == "hf_hub" else "brave"


def _build() -> Any:
    g = StateGraph(ConsultanciesEnrichState)
    g.add_node("brave", brave)
    g.add_node("hf_hub", hf_hub)
    g.add_conditional_edges(
        START,
        _route,
        {"brave": "brave", "hf_hub": "hf_hub"},
    )
    g.add_edge("brave", END)
    g.add_edge("hf_hub", END)
    return g.compile()


graph = _build()
