"""Sales-tech feature extraction LangGraph.

Per-company workflow that fans out across a marketing site's high-signal
pages (homepage, /pricing, /integrations, /customers, /security, /api …),
extracts nine evidence-anchored aspects in parallel via the cheap DeepSeek
tier, reconciles them (with one targeted refetch pass when an aspect lacks
evidence), then synthesizes a normalized ``SalesTechFeatures`` record using
the thinking-mode tier.

Persistence:
    - 10 ``company_facts`` rows per company:
        ``salestech.{overview, icp, pricing, integrations, gtm,
        differentiators, security, ai_capabilities, competitors, summary}``
      (idempotent: prior rows for the same field are deleted before insert).
    - ``companies.deep_analysis`` JSONB merged with the synthesized payload
      under the ``salestech`` key, plus run telemetry.
    - ``companies.ai_classification_confidence`` updated to overall confidence.

Input:
    {"company_id": <int>}              # required, looked up in companies table
    {"company_id": <int>, "dry_run": true}   # extract but skip persist

Output keys:
    features        — final SalesTechFeatures payload (dict)
    confidence      — float in [0,1]
    cost_usd        — total LLM spend
    model_calls     — count of LLM invocations
    elapsed_ms      — wall-clock graph time
    persisted       — bool (false on dry_run)

Registered as ``sales_tech_feature_graph`` in:
    - backend/core/langgraph.json (langgraph dev path)
    - backend/core/app.py::_build_optional_graphs (CF Containers path)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Any, TypedDict
from urllib.parse import urljoin, urlparse

import httpx
import psycopg
from bs4 import BeautifulSoup
from langgraph.graph import END, START, StateGraph

from .llm import (
    ainvoke_json_with_telemetry,
    make_deepseek_flash,
    make_deepseek_pro,
)
from .loaders import fetch_url
from .sales_tech_schemas import ASPECT_NAMES, SalesTechFeatures

log = logging.getLogger(__name__)


# ── Tunables ──────────────────────────────────────────────────────────────

_HEURISTIC_PATHS: tuple[str, ...] = (
    "",
    "/pricing",
    "/product/pricing",
    "/plans",
    "/integrations",
    "/customers",
    "/case-studies",
    "/about",
    "/platform",
    "/product",
    "/products",
    "/solutions",
    "/security",
    "/trust",
)
_HIGH_SIGNAL_ANCHORS = re.compile(
    r"\b(pricing|plans?|integrations?|case stud|customer|api docs?|developers?|"
    r"security|trust|gdpr|soc\s*2|for sdrs?|for sales|revops|product|platform|"
    r"how it works|features?|why|about|api)\b",
    re.IGNORECASE,
)
_MAX_FETCH_PAGES = 12
_MAX_FETCH_BUDGET_S = 90.0
_FETCH_TIMEOUT_S = 12.0
_MAX_PER_PAGE_CHARS = 6000
_MAX_TOTAL_PROMPT_CHARS = 18_000


# ── State ─────────────────────────────────────────────────────────────────


class SalesTechFeatureState(TypedDict, total=False):
    # input
    company_id: int
    dry_run: bool

    # loaded company row
    company_key: str
    name: str
    website: str
    existing_taxonomy: list[str]

    # discovery + fetch
    candidate_urls: list[str]
    pages: dict[str, str]
    page_titles: dict[str, str]
    failed_urls: list[str]
    refetch_done: bool

    # per-aspect outputs (each is dict with payload/evidence/completeness/refetch_suggestions)
    overview: dict
    icp: dict
    pricing: dict
    integrations: dict
    gtm: dict
    differentiators: dict
    security: dict
    ai_capabilities: dict
    competitors: dict

    # synthesis
    features: dict
    confidence: float
    contradictions: list[str]

    # telemetry
    cost_usd: float
    model_calls: int
    elapsed_ms: int
    persisted: bool

    # bail-out
    _error: str
    _started_at: float


# ── Small utilities ───────────────────────────────────────────────────────


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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _apex_host(host: str) -> str:
    h = host.lower().split(":", 1)[0]
    return h[4:] if h.startswith("www.") else h


def _normalize_url(base: str, href: str) -> str | None:
    if not href:
        return None
    href = href.strip()
    if href.startswith(("mailto:", "tel:", "javascript:", "#")):
        return None
    full = urljoin(base, href)
    p = urlparse(full)
    if p.scheme not in {"http", "https"}:
        return None
    if _apex_host(p.netloc) != _apex_host(urlparse(base).netloc):
        return None
    return p._replace(fragment="").geturl()


def _truncate(text: str, n: int) -> str:
    if len(text) <= n:
        return text
    return text[: n - 1] + "…"


def _pages_block(pages: dict[str, str], budget_chars: int = _MAX_TOTAL_PROMPT_CHARS) -> str:
    """Render the fetched pages into a single LLM-readable block, sorted so
    the most signal-dense pages come first within the char budget."""
    priority_keywords = (
        "/pricing", "/plans", "/integrations", "/customers", "/security",
        "/trust", "/api", "/docs", "/case",
    )

    def _rank(url: str) -> int:
        for i, kw in enumerate(priority_keywords):
            if kw in url:
                return i
        if url.rstrip("/").count("/") <= 2:  # root-ish
            return len(priority_keywords)
        return len(priority_keywords) + 1

    parts: list[str] = []
    used = 0
    for url, body in sorted(pages.items(), key=lambda kv: _rank(kv[0])):
        if not body:
            continue
        chunk = f"\n## {url}\n{_truncate(body, _MAX_PER_PAGE_CHARS)}\n"
        if used + len(chunk) > budget_chars:
            chunk = _truncate(chunk, max(0, budget_chars - used))
            if chunk:
                parts.append(chunk)
            break
        parts.append(chunk)
        used += len(chunk)
    return "".join(parts)


# ── Nodes ─────────────────────────────────────────────────────────────────


async def load_company(state: SalesTechFeatureState) -> dict[str, Any]:
    cid = int(state.get("company_id") or 0)
    if cid <= 0:
        return {"_error": "company_id required (>0)", "_started_at": time.perf_counter()}
    sql = """
        SELECT id, key, name, COALESCE(website, ''), COALESCE(canonical_domain, ''),
               COALESCE(service_taxonomy, '[]')
        FROM companies
        WHERE id = %s
    """
    try:
        with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (cid,))
                row = cur.fetchone()
    except psycopg.Error as exc:
        return {"_error": f"db_load_failed: {exc}", "_started_at": time.perf_counter()}

    if not row:
        return {"_error": f"company {cid} not found", "_started_at": time.perf_counter()}

    website = (row[3] or "").strip()
    if not website and row[4]:
        website = f"https://{row[4]}"
    if website and not website.startswith("http"):
        website = f"https://{website}"
    if not website:
        return {"_error": f"company {cid} has no website", "_started_at": time.perf_counter()}

    try:
        taxonomy_raw = json.loads(row[5] or "[]")
        taxonomy = [str(t) for t in taxonomy_raw] if isinstance(taxonomy_raw, list) else []
    except (json.JSONDecodeError, TypeError):
        taxonomy = []

    return {
        "_started_at": time.perf_counter(),
        "company_id": int(row[0]),
        "company_key": str(row[1]),
        "name": str(row[2]),
        "website": website,
        "existing_taxonomy": taxonomy,
        "refetch_done": False,
        "cost_usd": 0.0,
        "model_calls": 0,
    }


async def discover_urls(state: SalesTechFeatureState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    website = state["website"].rstrip("/") + "/"

    # Track each candidate's source so we can prefer evidence-of-existence
    # (sitemap, link-harvest) over speculative heuristic guesses. Many real
    # sites 404 our heuristic paths because they organize content under
    # `/product/integrations`, `/resources/customers`, etc.
    SRC_SITEMAP = 0
    SRC_LINK = 1
    SRC_HEURISTIC = 2
    sources: dict[str, int] = {}

    def _add(url: str, src: int) -> None:
        prev = sources.get(url)
        if prev is None or src < prev:
            sources[url] = src

    # 1. Heuristic paths (lowest priority — guesses)
    for path in _HEURISTIC_PATHS:
        _add(urljoin(website, path) if path else website, SRC_HEURISTIC)

    # 2. sitemap.xml (and sitemap_index.xml)
    sitemap_urls = (urljoin(website, "/sitemap.xml"), urljoin(website, "/sitemap_index.xml"))
    async with httpx.AsyncClient(
        timeout=_FETCH_TIMEOUT_S,
        follow_redirects=True,
        headers={"User-Agent": "Mozilla/5.0 (sales-tech-feature-graph)"},
    ) as client:
        for sm_url in sitemap_urls:
            try:
                resp = await client.get(sm_url)
                if resp.status_code != 200:
                    continue
                soup = BeautifulSoup(resp.text, "xml")
                for loc in soup.find_all("loc"):
                    text = (loc.text or "").strip()
                    nu = _normalize_url(website, text) if text else None
                    if nu:
                        _add(nu, SRC_SITEMAP)
                # sitemap-index files reference more sitemaps
                for sm in soup.find_all("sitemap"):
                    nested = (sm.find("loc").text or "").strip() if sm.find("loc") else ""
                    if nested:
                        try:
                            r2 = await client.get(nested)
                            if r2.status_code == 200:
                                inner = BeautifulSoup(r2.text, "xml")
                                for loc2 in inner.find_all("loc"):
                                    t2 = (loc2.text or "").strip()
                                    nu = _normalize_url(website, t2)
                                    if nu:
                                        _add(nu, SRC_SITEMAP)
                        except httpx.HTTPError:
                            continue
            except httpx.HTTPError:
                continue

        # 3. Link harvest from homepage
        try:
            home = await client.get(website)
            if home.status_code == 200:
                soup = BeautifulSoup(home.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    text = (a.get_text() or "").strip()
                    href = a["href"]
                    if not _HIGH_SIGNAL_ANCHORS.search(text or "") and not _HIGH_SIGNAL_ANCHORS.search(href):
                        continue
                    nu = _normalize_url(website, href)
                    if nu:
                        _add(nu, SRC_LINK)
        except httpx.HTTPError:
            pass

    # Sort by (source_tier, keyword_match, depth, url). Sitemap-known URLs
    # come first (they exist on the host), then anchor-harvested URLs (the
    # site links to them prominently), and only then speculative heuristics.
    _SIGNAL_KW = (
        "pricing", "plan", "integration", "customer", "case",
        "security", "trust", "platform", "product", "solution",
    )

    def _prio(u: str) -> tuple[int, int, int, str]:
        path = urlparse(u).path.lower()
        kw_rank = 0 if any(kw in path for kw in _SIGNAL_KW) else 1
        depth = path.count("/")
        return (sources.get(u, SRC_HEURISTIC), kw_rank, depth, u)

    ranked = sorted(sources.keys(), key=_prio)[: _MAX_FETCH_PAGES * 2]
    return {"candidate_urls": ranked}


async def fetch_pages(state: SalesTechFeatureState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    urls = (state.get("candidate_urls") or [])[: _MAX_FETCH_PAGES]
    if not urls:
        return {"pages": {}, "page_titles": {}, "failed_urls": []}

    deadline = time.perf_counter() + _MAX_FETCH_BUDGET_S
    sem = asyncio.Semaphore(6)

    async def _one(url: str) -> tuple[str, dict[str, Any]]:
        async with sem:
            if time.perf_counter() >= deadline:
                return url, {"markdown": "", "error": "budget_exceeded", "title": ""}
            res = await fetch_url(url, timeout=_FETCH_TIMEOUT_S)
            title = ""
            html = res.get("html") or ""
            if html:
                soup = BeautifulSoup(html, "html.parser")
                if soup.title and soup.title.string:
                    title = soup.title.string.strip()[:200]
            res["title"] = title
            return url, res

    results = await asyncio.gather(*[_one(u) for u in urls], return_exceptions=False)
    pages: dict[str, str] = {}
    titles: dict[str, str] = {}
    failed: list[str] = []
    for url, res in results:
        md = (res.get("markdown") or "").strip()
        if md:
            pages[url] = md
            titles[url] = res.get("title") or ""
        else:
            failed.append(url)
    return {"pages": pages, "page_titles": titles, "failed_urls": failed}


# ── Aspect extraction (fan-out) ───────────────────────────────────────────


_ASPECT_PROMPTS: dict[str, str] = {
    "overview": """Extract the OVERVIEW of this sales-tech product.
Return JSON with keys:
  payload: {tagline, one_liner, taxonomy[], target_segments[]}
  evidence: {field_name: [{source_url, quote}]}
  completeness: 0..1
  refetch_suggestions: [urls you wished you had]

target_segments must be a subset of: SMB, Mid-Market, Enterprise, Agency.
taxonomy is a list of short tags like "sales engagement", "lead gen", "intent data",
"data enrichment", "dialer", "CRM", "B2B SDR tooling".""",
    "icp": """Extract the ICP (ideal customer profile) of this sales-tech product.
Return JSON with keys:
  payload: {industries[], company_sizes[], buyer_roles[], pain_points[], jobs_to_be_done[]}
  evidence: {field: [{source_url, quote}]}
  completeness: 0..1
  refetch_suggestions: [urls]

company_sizes use buckets like "1-10","11-50","51-200","201-1000","1001-5000","5000+".""",
    "pricing": """Extract PRICING.
Return JSON:
  payload: {pricing_model: free|freemium|paid|contact_sales|unknown,
            tiers: [{name, price_usd, billing: monthly|annual|custom|one_time, seats_included, features[]}],
            free_trial_days, money_back_guarantee, annual_minimum_usd}
  evidence: {field: [{source_url, quote}]}
  completeness: 0..1
  refetch_suggestions: [urls]

If pricing isn't published, use "contact_sales" and leave tiers empty.""",
    "integrations": """Extract INTEGRATIONS.
Return JSON:
  payload: {channels[]: subset of (email,sms,linkedin,voice,whatsapp,slack,x,instagram),
            crms_supported[], native_integrations[],
            has_public_api: bool, has_webhooks: bool, zapier_make_n8n[]}
  evidence: {field: [...]}
  completeness: 0..1
  refetch_suggestions: [urls]""",
    "gtm": """Extract GTM motion.
Return JSON:
  payload: {motion: PLG|SLG|hybrid|unknown,
            customer_logos[], case_studies[] (urls),
            partner_program: bool|null, channel_partners[]}
  evidence: {field: [...]}
  completeness: 0..1
  refetch_suggestions: [urls]""",
    "differentiators": """Extract DIFFERENTIATION.
Return JSON:
  payload: {unique_value, moats[], competitors_named[]}
  evidence: {field: [...]}
  completeness: 0..1
  refetch_suggestions: [urls]""",
    "security": """Extract SECURITY posture.
Return JSON:
  payload: {certifications[]: e.g. SOC2, ISO27001, GDPR, HIPAA, CCPA;
            data_residency[]: e.g. US, EU, UK;
            encryption_at_rest: bool|null}
  evidence: {field: [...]}
  completeness: 0..1
  refetch_suggestions: [urls]""",
    "ai_capabilities": """Extract AI capabilities.
Return JSON:
  payload: {capabilities[] (e.g. "auto-personalization","intent scoring","agent"),
            is_agentic: bool|null,
            models_referenced[] (e.g. GPT-4, Claude, in-house)}
  evidence: {field: [...]}
  completeness: 0..1
  refetch_suggestions: [urls]""",
    "competitors": """List COMPETITORS or peer products explicitly named on the company's own pages
(typically in case studies, "vs" pages, or comparison tables).
Return JSON:
  payload: {named_on_site[]}
  evidence: {field: [...]}
  completeness: 0..1
  refetch_suggestions: [urls]""",
}


def _aspect_node(aspect: str):
    """Factory: build a per-aspect extraction node."""
    prompt_template = _ASPECT_PROMPTS[aspect]

    async def _node(state: SalesTechFeatureState) -> dict[str, Any]:
        if state.get("_error"):
            return {}
        pages = state.get("pages") or {}
        if not pages:
            return {aspect: {"payload": {}, "evidence": {}, "completeness": 0.0,
                             "refetch_suggestions": []}}

        block = _pages_block(pages)
        company_name = state.get("name") or "(unknown)"
        website = state.get("website") or ""

        sys = (
            "You are an analyst extracting structured B2B sales-tech product features. "
            "Use ONLY information present in the provided pages. Quote the source URL "
            "and a short verbatim snippet for every non-empty field. Output strict JSON."
        )
        user = (
            f"Company: {company_name}\nWebsite: {website}\n\n"
            f"{prompt_template}\n\n"
            f"Pages:\n{block}"
        )
        llm = make_deepseek_flash(temperature=0.1)
        try:
            parsed, tel = await ainvoke_json_with_telemetry(
                llm,
                [{"role": "system", "content": sys}, {"role": "user", "content": user}],
                provider="deepseek",
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("aspect %s extraction failed: %s", aspect, exc)
            return {aspect: {"payload": {}, "evidence": {}, "completeness": 0.0,
                             "refetch_suggestions": [], "error": str(exc)[:240]}}

        if not isinstance(parsed, dict):
            parsed = {}
        payload = parsed.get("payload") if isinstance(parsed.get("payload"), dict) else {}
        evidence = parsed.get("evidence") if isinstance(parsed.get("evidence"), dict) else {}
        try:
            completeness = float(parsed.get("completeness") or 0.0)
        except (TypeError, ValueError):
            completeness = 0.0
        completeness = max(0.0, min(1.0, completeness))
        refetch = parsed.get("refetch_suggestions") or []
        if not isinstance(refetch, list):
            refetch = []
        # Bound refetch suggestions to same-host URLs
        refetch_clean: list[str] = []
        for u in refetch:
            if isinstance(u, str):
                nu = _normalize_url(website + "/", u)
                if nu:
                    refetch_clean.append(nu)

        # Cost / call accounting — additive over fan-out (LangGraph reducers
        # would be cleaner, but we add via the synthesize join below).
        return {
            aspect: {
                "payload": payload,
                "evidence": evidence,
                "completeness": completeness,
                "refetch_suggestions": refetch_clean,
                "_telemetry": tel,
            }
        }

    _node.__name__ = f"extract_{aspect}"
    return _node


# Build the 9 fan-out nodes once
_ASPECT_NODES = {name: _aspect_node(name) for name in ASPECT_NAMES}


# ── Reconcile + targeted refetch ──────────────────────────────────────────


async def reconcile(state: SalesTechFeatureState) -> dict[str, Any]:
    """Inspect aspects, accumulate telemetry, fetch any URLs that aspects
    asked for (single pass, dedup'd), and re-run weak aspects against the
    enlarged page set.
    """
    if state.get("_error"):
        return {}
    pages = dict(state.get("pages") or {})
    cost = float(state.get("cost_usd") or 0.0)
    calls = int(state.get("model_calls") or 0)

    # Accumulate telemetry from the fan-out pass
    refetch_pool: set[str] = set()
    weak_aspects: list[str] = []
    for name in ASPECT_NAMES:
        a = state.get(name) or {}
        tel = a.get("_telemetry") or {}
        if isinstance(tel, dict):
            cost += float(tel.get("cost_usd") or 0.0)
            calls += 1
        for u in a.get("refetch_suggestions") or []:
            if u not in pages:
                refetch_pool.add(u)
        if float(a.get("completeness") or 0.0) < 0.4:
            weak_aspects.append(name)

    updates: dict[str, Any] = {"cost_usd": round(cost, 6), "model_calls": calls}

    if state.get("refetch_done") or not refetch_pool or not weak_aspects:
        updates["refetch_done"] = True
        return updates

    # Single refetch pass — bounded
    targets = list(refetch_pool)[:5]
    deadline = time.perf_counter() + 30.0
    sem = asyncio.Semaphore(4)

    async def _one(url: str) -> tuple[str, str]:
        async with sem:
            if time.perf_counter() >= deadline:
                return url, ""
            res = await fetch_url(url, timeout=_FETCH_TIMEOUT_S)
            return url, (res.get("markdown") or "").strip()

    results = await asyncio.gather(*[_one(u) for u in targets], return_exceptions=False)
    for u, md in results:
        if md:
            pages[u] = md
    updates["pages"] = pages

    # Re-run weak aspects against the enlarged page set
    re_run: dict[str, Any] = {}
    enlarged_state = {**state, "pages": pages}
    re_results = await asyncio.gather(
        *[_ASPECT_NODES[name](enlarged_state) for name in weak_aspects],
        return_exceptions=True,
    )
    for name, out in zip(weak_aspects, re_results):
        if isinstance(out, Exception):
            log.warning("refetch re-run for %s failed: %s", name, out)
            continue
        # _aspect_node returns {aspect: {...}}
        aspect_payload = out.get(name) if isinstance(out, dict) else None
        if aspect_payload:
            re_run[name] = aspect_payload
            tel = aspect_payload.get("_telemetry") or {}
            if isinstance(tel, dict):
                cost += float(tel.get("cost_usd") or 0.0)
                calls += 1

    updates.update(re_run)
    updates["cost_usd"] = round(cost, 6)
    updates["model_calls"] = calls
    updates["refetch_done"] = True
    return updates


# ── Synthesize ────────────────────────────────────────────────────────────


def _aspect_payloads(state: SalesTechFeatureState) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    for name in ASPECT_NAMES:
        a = state.get(name) or {}
        out[name] = {
            "payload": a.get("payload") or {},
            "completeness": a.get("completeness") or 0.0,
            "evidence": a.get("evidence") or {},
        }
    return out


async def synthesize(state: SalesTechFeatureState) -> dict[str, Any]:
    if state.get("_error"):
        return {}

    aspects = _aspect_payloads(state)
    company_name = state.get("name") or "(unknown)"
    website = state.get("website") or ""

    sys = (
        "You are a senior B2B sales-tech analyst. Merge the per-aspect extractions "
        "into a single normalized record. Resolve contradictions explicitly. Produce "
        "strict JSON matching the SalesTechFeatures shape. Do not invent fields not "
        "supported by the per-aspect evidence; leave them empty/null."
    )
    schema_hint = """JSON schema:
{
  "tagline": str|null, "one_liner": str|null,
  "taxonomy": [str], "target_segments": [str],
  "icp_industries": [str], "icp_company_sizes": [str],
  "icp_buyer_roles": [str], "pain_points": [str], "jobs_to_be_done": [str],
  "pricing_model": "free|freemium|paid|contact_sales|unknown",
  "pricing_tiers": [{"name": str, "price_usd": num|null, "billing": str|null,
                     "seats_included": int|null, "features": [str]}],
  "free_trial_days": int|null, "money_back_guarantee": bool|null,
  "annual_minimum_usd": num|null,
  "channels": [str], "crms_supported": [str], "native_integrations": [str],
  "has_public_api": bool|null, "has_webhooks": bool|null, "zapier_make_n8n": [str],
  "gtm_motion": "PLG|SLG|hybrid|unknown", "customer_logos": [str],
  "case_studies": [str], "partner_program": bool|null, "channel_partners": [str],
  "unique_value": str|null, "moats": [str], "competitors_named": [str],
  "certifications": [str], "data_residency": [str], "encryption_at_rest": bool|null,
  "ai_capabilities": [str], "ai_is_agentic": bool|null, "models_referenced": [str],
  "evidence_index": {field: [{source_url, quote}]},
  "overall_confidence": 0..1,
  "contradictions": [str]
}"""
    user = (
        f"Company: {company_name}\nWebsite: {website}\n\n"
        f"Per-aspect extractions:\n{json.dumps(aspects, ensure_ascii=False)[:14000]}\n\n"
        f"{schema_hint}\n\n"
        "Return ONLY the JSON object."
    )

    llm = make_deepseek_pro(temperature=0.1)
    cost = float(state.get("cost_usd") or 0.0)
    calls = int(state.get("model_calls") or 0)
    try:
        parsed, tel = await ainvoke_json_with_telemetry(
            llm,
            [{"role": "system", "content": sys}, {"role": "user", "content": user}],
            provider="deepseek",
        )
    except Exception as exc:  # noqa: BLE001
        log.warning("synthesize failed: %s", exc)
        return {"_error": f"synthesize_failed: {exc}"}

    if isinstance(tel, dict):
        cost += float(tel.get("cost_usd") or 0.0)
        calls += 1

    if not isinstance(parsed, dict):
        return {"_error": "synthesize returned non-dict"}

    # Coerce via Pydantic so the persist layer always sees a clean shape
    try:
        validated = SalesTechFeatures.model_validate(parsed)
        features = validated.model_dump(mode="json")
        confidence = validated.overall_confidence
        contradictions = validated.contradictions
    except Exception as exc:  # noqa: BLE001  (ValidationError + anything goofy)
        log.warning("synthesize validation lenient — using raw payload: %s", exc)
        features = parsed
        try:
            confidence = float(parsed.get("overall_confidence") or 0.0)
        except (TypeError, ValueError):
            confidence = 0.0
        contradictions = parsed.get("contradictions") or []

    return {
        "features": features,
        "confidence": max(0.0, min(1.0, confidence)),
        "contradictions": contradictions if isinstance(contradictions, list) else [],
        "cost_usd": round(cost, 6),
        "model_calls": calls,
    }


# ── Persist ───────────────────────────────────────────────────────────────


_FACT_FIELDS: tuple[str, ...] = tuple(f"salestech.{n}" for n in ASPECT_NAMES) + ("salestech.summary",)


def _persist_sync(
    company_id: int,
    aspects: dict[str, dict[str, Any]],
    features: dict[str, Any],
    confidence: float,
    cost_usd: float,
    model_calls: int,
    source_url: str,
) -> tuple[int, int]:
    """DELETE prior salestech.* facts, INSERT fresh, update companies row.
    Returns (facts_inserted, facts_deleted)."""
    now = _now_iso()
    inserted = 0
    deleted = 0
    conn = psycopg.connect(_dsn(), autocommit=False, connect_timeout=10)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM company_facts "
                "WHERE company_id = %s AND field = ANY(%s) AND method = 'LLM'",
                (company_id, list(_FACT_FIELDS)),
            )
            deleted = cur.rowcount

            for name in ASPECT_NAMES:
                a = aspects.get(name) or {}
                payload = {
                    "payload": a.get("payload") or {},
                    "evidence": a.get("evidence") or {},
                    "completeness": a.get("completeness") or 0.0,
                }
                cur.execute(
                    """
                    INSERT INTO company_facts
                        (company_id, field, value_text, confidence,
                         source_type, source_url, observed_at, method)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        company_id,
                        f"salestech.{name}",
                        json.dumps(payload, ensure_ascii=False),
                        max(0.0, min(1.0, float(a.get("completeness") or 0.0))),
                        "WEBSITE",
                        source_url,
                        now,
                        "LLM",
                    ),
                )
                inserted += 1

            cur.execute(
                """
                INSERT INTO company_facts
                    (company_id, field, value_text, confidence,
                     source_type, source_url, observed_at, method)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    company_id,
                    "salestech.summary",
                    json.dumps(features, ensure_ascii=False),
                    confidence,
                    "WEBSITE",
                    source_url,
                    now,
                    "LLM",
                ),
            )
            inserted += 1

            # ``companies.deep_analysis`` is a free-form Markdown text column
            # populated by the company-enrichment graph — don't overwrite it.
            # Canonical structured store is the per-aspect ``company_facts``
            # rows above plus the ``salestech.summary`` row. Just refresh the
            # confidence column so /companies UI sees a recent value.
            cur.execute(
                "UPDATE companies SET ai_classification_confidence = %s, updated_at = %s "
                "WHERE id = %s",
                (confidence, now, company_id),
            )
            conn.commit()
    except psycopg.Error as exc:
        conn.rollback()
        log.warning("persist failed: %s", exc)
        raise
    finally:
        conn.close()
    return inserted, deleted


async def persist(state: SalesTechFeatureState) -> dict[str, Any]:
    if state.get("_error"):
        return {}
    started = state.get("_started_at") or time.perf_counter()
    elapsed_ms = int((time.perf_counter() - started) * 1000)

    if state.get("dry_run"):
        return {"persisted": False, "elapsed_ms": elapsed_ms}

    aspects = {name: state.get(name) or {} for name in ASPECT_NAMES}
    features = state.get("features") or {}
    confidence = float(state.get("confidence") or 0.0)
    cost_usd = float(state.get("cost_usd") or 0.0)
    model_calls = int(state.get("model_calls") or 0)

    try:
        inserted, deleted = await asyncio.to_thread(
            _persist_sync,
            int(state["company_id"]),
            aspects,
            features,
            confidence,
            cost_usd,
            model_calls,
            state.get("website") or "",
        )
        log.info(
            "salestech persist company_id=%s inserted=%d deleted=%d cost=$%.4f calls=%d",
            state.get("company_id"), inserted, deleted, cost_usd, model_calls,
        )
        return {"persisted": True, "elapsed_ms": elapsed_ms}
    except Exception as exc:  # noqa: BLE001
        return {"_error": f"persist_failed: {exc}", "elapsed_ms": elapsed_ms}


# ── Build graph ───────────────────────────────────────────────────────────


def _route_after_load(state: SalesTechFeatureState) -> str:
    return "halt" if state.get("_error") else "discover_urls"


def _route_after_synthesize(state: SalesTechFeatureState) -> str:
    return "halt" if state.get("_error") else "persist"


async def halt(state: SalesTechFeatureState) -> dict[str, Any]:
    started = state.get("_started_at") or time.perf_counter()
    return {"elapsed_ms": int((time.perf_counter() - started) * 1000)}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(SalesTechFeatureState)

    builder.add_node("load_company", load_company)
    builder.add_node("discover_urls", discover_urls)
    builder.add_node("fetch_pages", fetch_pages)
    for name, node in _ASPECT_NODES.items():
        builder.add_node(f"extract_{name}", node)
    builder.add_node("reconcile", reconcile)
    builder.add_node("synthesize", synthesize)
    builder.add_node("persist", persist)
    builder.add_node("halt", halt)

    builder.add_edge(START, "load_company")
    builder.add_conditional_edges(
        "load_company", _route_after_load, ["halt", "discover_urls"]
    )
    builder.add_edge("discover_urls", "fetch_pages")
    # fan-out: fetch_pages → 9 aspects in parallel
    for name in ASPECT_NAMES:
        builder.add_edge("fetch_pages", f"extract_{name}")
        builder.add_edge(f"extract_{name}", "reconcile")
    builder.add_edge("reconcile", "synthesize")
    builder.add_conditional_edges(
        "synthesize", _route_after_synthesize, ["halt", "persist"]
    )
    builder.add_edge("persist", END)
    builder.add_edge("halt", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
