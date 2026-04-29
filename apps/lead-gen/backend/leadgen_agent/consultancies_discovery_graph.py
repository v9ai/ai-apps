# Requires: httpx, beautifulsoup4, psycopg[binary], langgraph
"""Consultancies discovery graph.

Native Python port of ``crates/consultancies`` — two discovery paths:

1. **Seed-URL path** (``discover`` node). Iterate a hard-coded list of known
   top-tier AI/ML consultancies (EU, UK, US), scrape each site's homepage
   (title + meta description + og:description + h1/h2/h3 + main/body text),
   apply a regex/heuristic classifier for consultancy + AI signal, skip
   offshore locations, then upsert a ``companies`` row with
   ``tags=["consultancy:seed", "discovery:consultancies-rs"]``.

2. **GitHub path** (``gh_discover`` node). Walk a fixed list of AI-adjacent
   topic slices via the GitHub GraphQL API, collect unique owning
   ``Organization`` accounts, score each on partnership-fit heuristics
   (consultancy language, AI language, website presence, repo count,
   recency, negative/login patterns), and upsert rows scoring above the
   cutoff with the same tag set.

Both paths write to the Neon ``companies`` table via ``psycopg`` with
``autocommit=True``, matching the Rust crate's column set and ON CONFLICT
(key) upsert semantics.

Environment:
    NEON_DATABASE_URL / DATABASE_URL  Neon connection string (required for writes).
    GITHUB_TOKEN / GH_TOKEN            GitHub token with ``public_repo`` scope
                                       (required for the gh_discover node).

The graph is a simple switch: pick ``node`` = ``"discover"`` (default) or
``"gh_discover"``. Either node runs to completion then the graph ends.
Set ``dry_run=True`` in the input state to skip Neon writes.
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
from bs4 import BeautifulSoup
from langgraph.graph import END, START, StateGraph

log = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────

_DEFAULT_PARALLELISM = 8
_FETCH_TIMEOUT_S = 10.0
_USER_AGENT = "Mozilla/5.0 (compatible; ConsultancyDiscovery/0.1)"
_MAX_TEXT_CHARS = 2_000
_DESCRIPTION_MAX_BYTES = 500

# GitHub GraphQL tuning — mirrors crates/consultancies/src/github.rs.
_GH_TOPIC_SLICES: tuple[str, ...] = (
    "topic:llm sort:updated-desc",
    "topic:rag sort:updated-desc",
    "topic:generative-ai sort:updated-desc",
    "topic:langchain sort:updated-desc",
    "topic:llamaindex sort:updated-desc",
    "topic:mlops sort:updated-desc",
    "topic:machine-learning-consulting sort:stars-desc",
    "topic:ai-consulting sort:stars-desc",
    "topic:ai-agents sort:updated-desc",
    "topic:vector-database sort:updated-desc",
    "topic:fine-tuning sort:updated-desc",
    "topic:prompt-engineering sort:stars-desc",
)
_GH_MAX_PAGES_PER_SLICE = 10
_GH_PER_PAGE = 50
_GH_PAGE_DELAY_S = 0.5
_GH_MIN_SCORE_TO_SAVE = 20
_GH_RETRY_DELAYS_S: tuple[int, ...] = (2, 4, 8, 16)

_TAGS = ["consultancy:seed", "discovery:consultancies-rs"]


# ── State ─────────────────────────────────────────────────────────────────────


def _merge_dict(left: dict | None, right: dict | None) -> dict:
    out: dict[str, Any] = dict(left or {})
    if right:
        out.update(right)
    return out


class ConsultanciesDiscoveryState(TypedDict, total=False):
    """State for the consultancies discovery graph.

    Input keys:
        node        "discover" (seed-URL path, default) or "gh_discover".
        dry_run     When true, skip all Neon writes.
        limit       Optional cap on the number of seeds/orgs processed.

    Output keys:
        upserted    Number of rows written (0 when dry_run).
        skipped     Number skipped (offshore, low score, fetch failure).
        top         Brief preview of the top-scoring candidates.
    """

    # input
    node: str
    dry_run: bool
    limit: int
    # output
    upserted: int
    skipped: int
    top: list[dict[str, Any]]
    # plumbing
    _error: str
    agent_timings: Annotated[dict[str, float], _merge_dict]
    graph_meta: Annotated[dict[str, Any], _merge_dict]


# ── Seed list ─────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class _SeedCompany:
    name: str
    website: str
    location: str


_SEEDS: tuple[_SeedCompany, ...] = (
    # Global MBB / Big-4 AI arms
    _SeedCompany("McKinsey QuantumBlack", "https://www.mckinsey.com/capabilities/quantumblack", "US/UK"),
    _SeedCompany("BCG Gamma", "https://www.bcg.com/beyond-consulting/bcg-gamma", "US"),
    _SeedCompany("Bain Advanced Analytics", "https://www.bain.com/vector-digital/advanced-analytics", "US"),
    _SeedCompany("Deloitte AI", "https://www2.deloitte.com/us/en/pages/deloitte-analytics/solutions/deloitte-analytics.html", "US"),
    _SeedCompany("Accenture AI", "https://www.accenture.com/us-en/services/ai-artificial-intelligence-index", "US"),
    _SeedCompany("Capgemini AI", "https://www.capgemini.com/service/applied-innovation-exchange/artificial-intelligence", "France"),
    _SeedCompany("PwC AI Labs", "https://www.pwc.com/gx/en/issues/data-and-analytics/artificial-intelligence.html", "US/UK"),
    _SeedCompany("EY AI", "https://www.ey.com/en_gl/ai", "UK"),
    _SeedCompany("KPMG Lighthouse", "https://kpmg.com/xx/en/home/services/advisory/management-consulting/kpmg-lighthouse.html", "US"),
    _SeedCompany("IBM Consulting", "https://www.ibm.com/consulting", "US"),
    # US pure-play consultancies & AI companies
    _SeedCompany("Thoughtworks", "https://www.thoughtworks.com", "US"),
    _SeedCompany("EPAM Systems", "https://www.epam.com", "US"),
    _SeedCompany("Slalom", "https://www.slalom.com", "US"),
    _SeedCompany("Booz Allen Hamilton", "https://www.boozallen.com", "US"),
    _SeedCompany("Palantir Technologies", "https://www.palantir.com", "US"),
    _SeedCompany("Scale AI", "https://scale.com", "US"),
    _SeedCompany("Weights & Biases", "https://wandb.ai", "US"),
    _SeedCompany("Anyscale", "https://www.anyscale.com", "US"),
    _SeedCompany("Databricks", "https://www.databricks.com", "US"),
    _SeedCompany("H2O.ai", "https://h2o.ai", "US"),
    _SeedCompany("Domino Data Lab", "https://www.dominodatalab.com", "US"),
    _SeedCompany("Snorkel AI", "https://snorkel.ai", "US"),
    _SeedCompany("Labelbox", "https://labelbox.com", "US"),
    _SeedCompany("Moveworks", "https://www.moveworks.com", "US"),
    _SeedCompany("Cohere", "https://cohere.com", "US"),
    _SeedCompany("Hugging Face", "https://huggingface.co", "US"),
    _SeedCompany("C3.ai", "https://c3.ai", "US"),
    _SeedCompany("DataRobot", "https://www.datarobot.com", "US"),
    _SeedCompany("Tecton", "https://www.tecton.ai", "US"),
    _SeedCompany("Latent AI", "https://latentai.com", "US"),
    _SeedCompany("Landing AI", "https://landing.ai", "US"),
    _SeedCompany("Anthropic", "https://www.anthropic.com", "US"),
    _SeedCompany("OpenAI", "https://openai.com", "US"),
    _SeedCompany("Modular", "https://www.modular.com", "US"),
    _SeedCompany("Determined AI", "https://www.determined.ai", "US"),
    _SeedCompany("Iguazio", "https://www.iguazio.com", "US"),
    _SeedCompany("Cognizant AI", "https://www.cognizant.com/us/en/services/ai", "US"),
    # UK consultancies & AI companies
    _SeedCompany("Faculty AI", "https://faculty.ai", "UK"),
    _SeedCompany("Datatonic", "https://datatonic.com", "UK"),
    _SeedCompany("Deeper Insights", "https://deeperinsights.com", "UK"),
    _SeedCompany("Peak AI", "https://peak.ai", "UK"),
    _SeedCompany("Cambridge Consultants", "https://www.cambridgeconsultants.com", "UK"),
    _SeedCompany("Secondmind", "https://www.secondmind.ai", "UK"),
    _SeedCompany("Quantexa", "https://www.quantexa.com", "UK"),
    _SeedCompany("Privitar", "https://www.privitar.com", "UK"),
    _SeedCompany("Mind Foundry", "https://www.mindfoundry.ai", "UK"),
    _SeedCompany("Satalia", "https://www.satalia.com", "UK"),
    _SeedCompany("InstaDeep", "https://www.instadeep.com", "UK"),
    _SeedCompany("Synthesized", "https://www.synthesized.io", "UK"),
    _SeedCompany("PolyAI", "https://poly.ai", "UK"),
    _SeedCompany("Tractable", "https://tractable.ai", "UK"),
    _SeedCompany("Wayve", "https://wayve.ai", "UK"),
    _SeedCompany("DeepMind", "https://deepmind.google", "UK"),
    _SeedCompany("Graphcore", "https://www.graphcore.ai", "UK"),
    _SeedCompany("Stability AI", "https://stability.ai", "UK"),
    # EU consultancies & AI companies
    _SeedCompany("Explosion AI", "https://explosion.ai", "Germany"),
    _SeedCompany("Rasa", "https://rasa.com", "Germany"),
    _SeedCompany("Aleph Alpha", "https://aleph-alpha.com", "Germany"),
    _SeedCompany("Merantix", "https://www.merantix.com", "Germany"),
    _SeedCompany("appliedAI Initiative", "https://www.appliedai.de", "Germany"),
    _SeedCompany("Dataiku", "https://www.dataiku.com", "France"),
    _SeedCompany("Artefact", "https://www.artefact.com", "France"),
    _SeedCompany("LightOn", "https://www.lighton.ai", "France"),
    _SeedCompany("Mistral AI", "https://mistral.ai", "France"),
    _SeedCompany("Silo AI", "https://www.silo.ai", "Finland"),
    _SeedCompany("Xebia", "https://xebia.com", "Netherlands"),
    _SeedCompany("Deepsense.ai", "https://deepsense.ai", "Poland"),
    _SeedCompany("Adesso SE", "https://www.adesso.de", "Germany"),
    _SeedCompany("Reply AI", "https://www.reply.com/en/artificial-intelligence", "Italy"),
    _SeedCompany("Aignostics", "https://www.aignostics.com", "Germany"),
    _SeedCompany("Helsing", "https://helsing.ai", "Germany"),
    _SeedCompany("Crayon", "https://www.crayon.com", "Norway"),
    _SeedCompany("Poolside AI", "https://www.poolside.ai", "France"),
    _SeedCompany("Photoroom", "https://www.photoroom.com", "France"),
    _SeedCompany("DeepL", "https://www.deepl.com", "Germany"),
)


# ── Classifier ────────────────────────────────────────────────────────────────

_STRONG_CONSULTANCY: tuple[str, ...] = (
    "consulting firm", "consultancy", "consulting services", "management consulting",
    "technology consulting", "digital transformation consulting", "strategy consulting",
    "advisory services", "professional services firm", "we help clients",
    "our consulting", "our consultants", "engagement model", "client engagements",
    "consulting practice", "consulting partner",
)

_MODERATE_CONSULTANCY: tuple[str, ...] = (
    "consulting", "advisory", "professional services", "enterprise solutions",
    "bespoke solutions", "strategic partner", "implementation partner",
    "managed services", "solution provider", "service provider",
    "we work with", "our clients", "client success", "industry expertise",
)

_ANTI_CONSULTANCY: tuple[str, ...] = (
    "recruitment agency", "staffing", "we recruit", "placing candidates",
    "job board", "submit your cv", "e-commerce", "add to cart", "marketplace",
    "download our app", "free trial", "sign up free", "casino", "gambling",
    "crypto exchange", "nft marketplace",
)

_STRONG_AI: tuple[str, ...] = (
    "machine learning", "artificial intelligence", "deep learning", "neural network",
    "natural language processing", "computer vision", "generative ai",
    "large language model", "llm", "mlops", "ml engineering", "ai strategy",
    "data science consulting", "ai consulting", "ai research", "foundation model",
    "transformer model", "reinforcement learning",
)

_MODERATE_AI: tuple[str, ...] = (
    "data science", "predictive analytics", "recommendation engine", "nlp",
    "pytorch", "tensorflow", "hugging face", "ai-powered",
    "intelligent automation", "ml platform", "model training", "model deployment",
    "feature store", "vector database", "embeddings", "fine-tuning",
    "prompt engineering",
)

_OFFSHORE_SIGNALS: tuple[str, ...] = (
    "bangalore", "bengaluru", "hyderabad", "pune", "mumbai", "chennai",
    "noida", "gurgaon", "delhi", "kolkata", "manila", "cebu", "lahore",
    "karachi", "islamabad", "dhaka", "chittagong",
    "headquartered in india", "based in india",
    "headquartered in philippines", "based in philippines",
    "headquartered in pakistan", "headquartered in bangladesh",
    "headquartered in vietnam", "ho chi minh", "hanoi",
    "tanzania", "afghanistan", "kazakhstan", "uzbekistan", "kyrgyzstan",
    "serbia", "moldova", "myanmar", "cambodia", "nigeria", "kenya",
    "ethiopia", "ghana", "egypt", "morocco",
    "bulgaria", "stara zagora", "sofia, bulgaria",
    "romania", "bucharest", "cluj", "croatia", "zagreb",
    "slovakia", "bratislava", "granada", "sevilla", "bilbao",
)


@dataclass
class _ClassificationResult:
    is_consultancy: bool = False
    is_ai_focused: bool = False
    consultancy_score: float = 0.0
    ai_score: float = 0.0
    ai_tier: int = 0
    keyword_hits: list[str] = field(default_factory=list)
    ai_keyword_hits: list[str] = field(default_factory=list)
    anti_hits: list[str] = field(default_factory=list)


def _classify(text: str) -> _ClassificationResult:
    """Rule-based classifier — direct port of ``classify.rs::classify``."""
    lower = text.lower()

    keyword_hits: list[str] = []
    strong_c = 0
    for kw in _STRONG_CONSULTANCY:
        if kw in lower:
            strong_c += 1
            keyword_hits.append(kw)
    moderate_c = 0
    for kw in _MODERATE_CONSULTANCY:
        if kw in lower:
            moderate_c += 1
            keyword_hits.append(kw)

    anti_hits: list[str] = [kw for kw in _ANTI_CONSULTANCY if kw in lower]

    ai_keyword_hits: list[str] = []
    strong_ai = 0
    for kw in _STRONG_AI:
        if kw in lower:
            strong_ai += 1
            ai_keyword_hits.append(kw)
    moderate_ai = 0
    for kw in _MODERATE_AI:
        if kw in lower:
            moderate_ai += 1
            ai_keyword_hits.append(kw)

    is_consultancy = strong_c >= 2 or (
        strong_c >= 1 and moderate_c >= 2 and not anti_hits
    )
    is_ai_focused = strong_ai >= 1 or moderate_ai >= 3

    consultancy_score = min(
        min(strong_c * 0.15 + moderate_c * 0.05, 0.5) + (0.5 if strong_c > 0 else 0.0),
        1.0,
    )
    ai_score = min(
        min(strong_ai * 0.15 + moderate_ai * 0.05, 0.5) + (0.5 if strong_ai > 0 else 0.0),
        1.0,
    )

    if strong_ai >= 2:
        ai_tier = 2
    elif strong_ai >= 1 or moderate_ai >= 3:
        ai_tier = 1
    else:
        ai_tier = 0

    return _ClassificationResult(
        is_consultancy=is_consultancy,
        is_ai_focused=is_ai_focused,
        consultancy_score=consultancy_score,
        ai_score=ai_score,
        ai_tier=ai_tier,
        keyword_hits=keyword_hits,
        ai_keyword_hits=ai_keyword_hits,
        anti_hits=anti_hits,
    )


def _is_offshore_location(text: str) -> bool:
    lower = text.lower()
    return any(sig in lower for sig in _OFFSHORE_SIGNALS)


# ── Scrape ────────────────────────────────────────────────────────────────────


async def _fetch_html(client: httpx.AsyncClient, url: str) -> str:
    resp = await client.get(
        url,
        timeout=_FETCH_TIMEOUT_S,
        headers={"User-Agent": _USER_AGENT},
        follow_redirects=True,
    )
    resp.raise_for_status()
    return resp.text


def _extract_text(html: str) -> str:
    """Extract visible text — title + meta desc + og:desc + h1-h3 + main/body."""
    soup = BeautifulSoup(html, "html.parser")
    parts: list[str] = []

    title = soup.find("title")
    if title:
        t = title.get_text(strip=True)
        if t:
            parts.append(t)

    for selector in (
        {"name": "description"},
        {"property": "og:description"},
    ):
        el = soup.find("meta", attrs=selector)
        if el:
            content = (el.get("content") or "").strip()
            if content:
                parts.append(content)

    for tag in ("h1", "h2", "h3"):
        for el in soup.find_all(tag):
            txt = el.get_text(strip=True)
            if txt:
                parts.append(txt)

    body = (
        soup.find("main")
        or soup.find("article")
        or soup.find(attrs={"role": "main"})
        or soup.find("body")
    )
    if body:
        raw = body.get_text(" ", strip=True)
        if raw:
            parts.append(raw)

    joined = " | ".join(parts)
    if len(joined) > _MAX_TEXT_CHARS:
        # Truncate without splitting in the middle of a multi-byte character;
        # since we're using the character length (not bytes) this is safe.
        joined = joined[:_MAX_TEXT_CHARS]
    return joined


async def _fetch_and_extract(client: httpx.AsyncClient, url: str) -> str:
    html = await _fetch_html(client, url)
    text = _extract_text(html)
    if not text:
        raise RuntimeError(f"no visible text extracted from {url}")
    return text


# ── DB ────────────────────────────────────────────────────────────────────────


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


_UPSERT_SQL = """
INSERT INTO companies
  (key, name, website, canonical_domain, description, location, size,
   category, tags, services, industries,
   score, score_reasons, ai_tier,
   created_at, updated_at)
VALUES
  (%s, %s, %s, %s, %s, %s, %s,
   'CONSULTANCY', %s, %s, %s,
   %s, %s, %s,
   now()::text, now()::text)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  website = COALESCE(EXCLUDED.website, companies.website),
  canonical_domain = EXCLUDED.canonical_domain,
  description = COALESCE(EXCLUDED.description, companies.description),
  location = COALESCE(EXCLUDED.location, companies.location),
  size = COALESCE(EXCLUDED.size, companies.size),
  category = 'CONSULTANCY',
  tags = EXCLUDED.tags,
  services = COALESCE(EXCLUDED.services, companies.services),
  industries = COALESCE(EXCLUDED.industries, companies.industries),
  score = EXCLUDED.score,
  score_reasons = EXCLUDED.score_reasons,
  ai_tier = EXCLUDED.ai_tier,
  updated_at = now()::text
RETURNING id
"""


def _upsert_company(cur: psycopg.Cursor, row: dict[str, Any]) -> int:
    cur.execute(
        _UPSERT_SQL,
        (
            row["key"],
            row["name"],
            row["website"],
            row["canonical_domain"],
            row["description"],
            row["location"],
            row["size"],
            json.dumps(_TAGS),
            json.dumps(row["services"]),
            json.dumps(row["industries"]),
            row["score"],
            json.dumps(row["score_reasons"]),
            row["ai_tier"],
        ),
    )
    result = cur.fetchone()
    return int(result[0]) if result else 0


# ── Helpers ───────────────────────────────────────────────────────────────────


_KEY_NON_ALNUM_RE = re.compile(r"[^a-z0-9-]")


def _extract_domain(url: str) -> str:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return ""
    if host.startswith("www."):
        host = host[4:]
    return host


def _domain_to_key(domain: str) -> str:
    cleaned = domain.replace(".", "-").lower()
    return _KEY_NON_ALNUM_RE.sub("", cleaned)


def _truncate(s: str, max_chars: int) -> str:
    return s if len(s) <= max_chars else s[:max_chars]


_SERVICE_MAP: dict[str, str] = {
    "machine learning": "Machine Learning",
    "artificial intelligence": "Artificial Intelligence",
    "deep learning": "Deep Learning",
    "natural language processing": "NLP",
    "nlp": "NLP",
    "computer vision": "Computer Vision",
    "generative ai": "Generative AI",
    "large language model": "LLM Development",
    "llm": "LLM Development",
    "mlops": "MLOps",
    "data science": "Data Science",
    "data science consulting": "Data Science",
    "ai consulting": "AI Consulting",
    "ai strategy": "AI Strategy",
    "ml engineering": "ML Engineering",
    "predictive analytics": "Predictive Analytics",
    "ai research": "AI Research",
    "foundation model": "Foundation Models",
    "reinforcement learning": "Reinforcement Learning",
    "prompt engineering": "Prompt Engineering",
    "fine-tuning": "Fine-Tuning",
}


def _extract_services(result: _ClassificationResult) -> list[str]:
    services: list[str] = []
    for kw in result.ai_keyword_hits:
        svc = _SERVICE_MAP.get(kw)
        if svc and svc not in services:
            services.append(svc)
    if not services:
        services.append("AI/ML Consulting")
    return services


def _build_row_from_seed(
    seed: _SeedCompany, text: str, result: _ClassificationResult
) -> dict[str, Any]:
    canonical_domain = _extract_domain(seed.website)
    source_bonus = 0.8
    raw_score = 0.4 * result.consultancy_score + 0.4 * result.ai_score + 0.2 * source_bonus
    return {
        "key": _domain_to_key(canonical_domain),
        "name": seed.name,
        "website": seed.website,
        "canonical_domain": canonical_domain,
        "description": _truncate(text, _DESCRIPTION_MAX_BYTES),
        "location": seed.location,
        "size": "",
        "services": _extract_services(result),
        "industries": ["Technology", "AI/ML"],
        "score": min(raw_score, 1.0),
        "score_reasons": {
            "method": "consultancy-discover-v1",
            "keyword_hits": result.keyword_hits,
            "ai_keyword_hits": result.ai_keyword_hits,
            "anti_hits": result.anti_hits,
            "source_bonus": source_bonus,
            "ai_score": result.ai_score,
            "consultancy_score": result.consultancy_score,
        },
        "ai_tier": result.ai_tier,
        "is_ai_focused": result.is_ai_focused,
    }


# ── Seed-URL discovery (main.rs path) ─────────────────────────────────────────


async def _process_seed(
    client: httpx.AsyncClient,
    seed: _SeedCompany,
    dry_run: bool,
    sem: asyncio.Semaphore,
) -> dict[str, Any] | None:
    async with sem:
        try:
            text = await _fetch_and_extract(client, seed.website)
        except Exception as e:  # noqa: BLE001 — mirrors Rust warn!("SKIP")
            log.warning("[SKIP] %s (%s): %s", seed.name, seed.website, e)
            return None

        if _is_offshore_location(text):
            log.warning("[OFFSHORE] %s — skipping", seed.name)
            return None

        result = _classify(text)
        row = _build_row_from_seed(seed, text, result)

        if dry_run:
            log.info(
                "[DRY] %s | score=%.2f ai_tier=%d consultancy=%s ai=%s",
                seed.name, row["score"], row["ai_tier"],
                result.is_consultancy, result.is_ai_focused,
            )
            return row

        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    cid = _upsert_company(cur, row)
        except psycopg.Error as e:
            log.error("[DB] %s: %s", seed.name, e)
            return None

        log.info(
            "[OK] %s → id=%d score=%.2f ai_tier=%d",
            seed.name, cid, row["score"], row["ai_tier"],
        )
        return row


async def discover(state: ConsultanciesDiscoveryState) -> dict[str, Any]:
    """Seed-URL discovery node — ports ``discovery::run`` from main.rs."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    dry_run = bool(state.get("dry_run"))
    limit = state.get("limit")
    seeds = list(_SEEDS[:limit]) if limit else list(_SEEDS)
    log.info("Processing %d consultancy seeds (dry_run=%s)", len(seeds), dry_run)

    sem = asyncio.Semaphore(_DEFAULT_PARALLELISM)
    async with httpx.AsyncClient(max_redirects=5) as client:
        tasks = [_process_seed(client, s, dry_run, sem) for s in seeds]
        results = await asyncio.gather(*tasks, return_exceptions=False)

    ok = [r for r in results if r]
    failed = len(results) - len(ok)
    ai_count = sum(1 for r in ok if r.get("is_ai_focused"))
    log.info(
        "Seeds: total=%d ok=%d ai=%d failed=%d",
        len(results), len(ok), ai_count, failed,
    )

    top = sorted(ok, key=lambda r: r["score"], reverse=True)[:10]
    top_preview = [
        {"name": r["name"], "score": round(r["score"], 3), "ai_tier": r["ai_tier"]}
        for r in top
    ]

    return {
        "upserted": 0 if dry_run else len(ok),
        "skipped": failed,
        "top": top_preview,
        "agent_timings": {"discover": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"graph": "consultancies_discovery", "version": "v1", "node": "discover"},
    }


# ── GitHub discovery (gh_discover.rs path) ────────────────────────────────────


_CONSULTANCY_RE = re.compile(
    r"\b(consulting|consultancy|advisor[sy]?|agency|partners?|engineering\s+firm|boutique|we\s+help|client\s+work|professional\s+services|managed\s+services)\b",
    re.IGNORECASE,
)
_AI_RE = re.compile(
    r"\b(AI|ML|LLM|machine\s+learning|artificial\s+intelligence|generative|NLP|computer\s+vision|MLOps|data\s+science|RAG|agents?)\b",
    re.IGNORECASE,
)
_NEGATIVE_RE = re.compile(
    r"\b(university|college|student|research\s+lab|personal|hobby|fork\s+of|awesome[-\s]list|tutorial|course|bootcamp|open.source\s+(library|framework|tool|sdk|database|platform)|we\s+build\s+(open|tools?|libraries|frameworks?|software|products?)|mlops\s+platform|ml\s+platform|vector\s+database|data\s+infrastructure|developer\s+tools?|devtools?|open.source\s+project)\b",
    re.IGNORECASE,
)
_BAD_LOGIN_RE = re.compile(
    r"""
      (^awesome-|-tutorial|-course|-examples$)
    | ^(oracle|adobe|google|microsoft|apple|meta|amazon|ibm|sap
        |salesforce|nvidia|samsung|bytedance|alibaba|tencent|baidu
        |cloudwego|kubeflow|mlflow|mariadb|redisearch
        |ragapp|mozilla|netflix|airbnb|shopify|atlassian
        |hashicorp|elastic|redis|mongodb|couchbase-ecosystem
        |google-marketing-solutions|google-cloud-platform
        |imbue-ai|gchq|edgeandnode|hkuds|smk-is
        |basilisk-labs|zilliztech|polyaxon|tensoropsai|vinkius-labs
        |promptslab|montevive|amikos-tech)$
    """,
    re.IGNORECASE | re.VERBOSE,
)

_BAD_URL_FRAGMENTS: tuple[str, ...] = (
    "discord.gg", "discord.com", "github.io", "t.me",
    "twitter.com", "linkedin.com", "youtube.com",
)


@dataclass
class _OrgCandidate:
    login: str = ""
    name: str = ""
    description: str = ""
    website: str = ""
    location: str = ""
    email: str = ""
    created_at: str = ""
    public_repos: int = 0
    ai_repo_count: int = 0
    recently_active_repos: int = 0
    total_stars: int = 0
    most_recent_push: str = ""
    pinned_summaries: list[str] = field(default_factory=list)
    topics_seen: set[str] = field(default_factory=set)
    score: int = 0
    reasons: list[str] = field(default_factory=list)


def _score_org(org: _OrgCandidate) -> tuple[int, list[str]]:
    """Score an org on partnership-fit heuristics — port of ``score_org``."""
    s = 0
    reasons: list[str] = []
    blob = f"{org.name} {org.description} {' '.join(org.pinned_summaries)}"

    if _CONSULTANCY_RE.search(blob):
        s += 30
        reasons.append("consultancy language in description/pinned")

    if _AI_RE.search(blob):
        s += 15
        reasons.append("AI language in description/pinned")

    if org.website.startswith("http"):
        if any(b in org.website for b in _BAD_URL_FRAGMENTS):
            s -= 20
            reasons.append("community/social URL instead of company website")
        else:
            s += 20
            reasons.append("has website")

    if org.ai_repo_count >= 3:
        s += 15
        reasons.append(f"{org.ai_repo_count} AI repos")
    elif org.ai_repo_count >= 1:
        s += 5

    if 5 <= org.public_repos <= 80:
        s += 10
        reasons.append(f"repo count {org.public_repos} in sweet spot")
    elif org.public_repos > 300:
        s -= 10
        reasons.append("very large org (likely product co / enterprise)")

    if org.recently_active_repos >= 3:
        s += 15
        reasons.append(f"{org.recently_active_repos} repos active in last 90d")
    elif org.recently_active_repos >= 1:
        s += 7
        reasons.append(f"{org.recently_active_repos} repo active in last 90d")
    elif org.ai_repo_count >= 2:
        s -= 10
        reasons.append("no repos active in last 90d")

    if _NEGATIVE_RE.search(blob):
        s -= 25
        reasons.append("negative keyword (academic/tutorial/personal)")

    if _BAD_LOGIN_RE.search(org.login):
        s -= 40
        reasons.append("login pattern suggests curated list / tutorial")

    return s, reasons


_GH_QUERY = """
query FindAiOrgs($q: String!, $cursor: String, $perPage: Int!) {
  rateLimit { remaining resetAt cost }
  search(query: $q, type: REPOSITORY, first: $perPage, after: $cursor) {
    repositoryCount
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on Repository {
        nameWithOwner
        stargazerCount
        pushedAt
        primaryLanguage { name }
        repositoryTopics(first: 10) { nodes { topic { name } } }
        owner {
          __typename
          login
          ... on Organization {
            name
            description
            websiteUrl
            location
            email
            twitterUsername
            createdAt
            repositories(privacy: PUBLIC) { totalCount }
            pinnedItems(first: 6, types: REPOSITORY) {
              nodes {
                ... on Repository {
                  name
                  description
                  stargazerCount
                  repositoryTopics(first: 5) { nodes { topic { name } } }
                }
              }
            }
          }
        }
      }
    }
  }
}
"""


async def _gh_graphql(
    client: httpx.AsyncClient, token: str, variables: dict[str, Any]
) -> dict[str, Any]:
    """POST a GraphQL query with retry-on-rate-limit backoff."""
    last_err: Exception | None = None
    for attempt, delay in enumerate(_GH_RETRY_DELAYS_S):
        if attempt > 0:
            log.warning("GitHub rate-limited — retry in %ds (attempt %d)", delay, attempt)
            await asyncio.sleep(delay)
        try:
            resp = await client.post(
                "https://api.github.com/graphql",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Accept": "application/json",
                    "User-Agent": _USER_AGENT,
                },
                json={"query": _GH_QUERY, "variables": variables},
                timeout=30.0,
            )
        except httpx.HTTPError as e:
            last_err = e
            continue

        if resp.status_code == 200:
            body = resp.json()
            if "errors" in body:
                # Abuse / rate-limit style errors come back 200 with errors[].type
                err_types = {e.get("type") for e in body.get("errors") or []}
                if "RATE_LIMITED" in err_types or "ABUSE_RATE_LIMIT" in err_types:
                    last_err = RuntimeError(f"GraphQL rate-limit: {body['errors']}")
                    continue
                raise RuntimeError(f"GitHub GraphQL errors: {body['errors']}")
            return body["data"]
        if resp.status_code in (403, 429):
            last_err = RuntimeError(f"HTTP {resp.status_code}: {resp.text[:200]}")
            continue
        raise RuntimeError(f"GitHub GraphQL HTTP {resp.status_code}: {resp.text[:500]}")

    raise RuntimeError(f"GitHub GraphQL: rate limit persisted after all retries: {last_err}")


async def _run_gh_slice(
    client: httpx.AsyncClient, token: str, query: str
) -> dict[str, _OrgCandidate]:
    orgs: dict[str, _OrgCandidate] = {}
    cursor: str | None = None

    for page in range(_GH_MAX_PAGES_PER_SLICE):
        variables: dict[str, Any] = {"q": query, "cursor": cursor, "perPage": _GH_PER_PAGE}
        data = await _gh_graphql(client, token, variables)
        rate = data.get("rateLimit") or {}
        search = data.get("search") or {}
        nodes = search.get("nodes") or []
        q_short = query[:40]
        log.info(
            "  [%-40s] page %d orgs=%d rate_remaining=%s",
            q_short, page + 1, len(orgs), rate.get("remaining"),
        )

        for node in nodes:
            if not node:
                continue
            owner = node.get("owner") or {}
            if owner.get("__typename") != "Organization":
                continue
            login = owner.get("login")
            if not login:
                continue

            cand = orgs.get(login)
            if cand is None:
                pinned_summaries: list[str] = []
                pinned_nodes = (
                    (owner.get("pinnedItems") or {}).get("nodes") or []
                )
                for p in pinned_nodes:
                    if not p:
                        continue
                    pname = p.get("name") or ""
                    pdesc = p.get("description") or ""
                    if pname:
                        pinned_summaries.append(f"{pname}: {pdesc}")

                cand = _OrgCandidate(
                    login=login,
                    name=owner.get("name") or "",
                    description=owner.get("description") or "",
                    website=owner.get("websiteUrl") or "",
                    location=owner.get("location") or "",
                    email=owner.get("email") or "",
                    created_at=owner.get("createdAt") or "",
                    public_repos=int(((owner.get("repositories") or {}).get("totalCount")) or 0),
                    pinned_summaries=pinned_summaries,
                )
                orgs[login] = cand

            cand.ai_repo_count += 1
            cand.total_stars += int(node.get("stargazerCount") or 0)

            pushed = node.get("pushedAt") or ""
            if pushed > cand.most_recent_push:
                cand.most_recent_push = pushed
            if pushed:
                try:
                    dt = datetime.fromisoformat(pushed.replace("Z", "+00:00"))
                    if (datetime.now(timezone.utc) - dt).days < 90:
                        cand.recently_active_repos += 1
                except ValueError:
                    pass

            topic_nodes = (
                (node.get("repositoryTopics") or {}).get("nodes") or []
            )
            for t in topic_nodes:
                name = ((t or {}).get("topic") or {}).get("name")
                if name:
                    cand.topics_seen.add(name)

        page_info = search.get("pageInfo") or {}
        if not page_info.get("hasNextPage"):
            break
        cursor = page_info.get("endCursor")
        await asyncio.sleep(_GH_PAGE_DELAY_S)

    return orgs


_GH_TOPIC_SERVICE_MAP: dict[str, str] = {
    "llm": "LLM Development",
    "large-language-models": "LLM Development",
    "rag": "RAG",
    "retrieval-augmented-generation": "RAG",
    "generative-ai": "Generative AI",
    "machine-learning-consulting": "AI Consulting",
    "ai-consulting": "AI Consulting",
    "mlops": "MLOps",
    "vector-database": "Vector Database",
    "vector-search": "Vector Database",
    "fine-tuning": "Fine-Tuning",
    "prompt-engineering": "Prompt Engineering",
    "langchain": "LangChain",
    "ai-agents": "AI Agents",
}


def _gh_candidate_to_row(c: _OrgCandidate) -> dict[str, Any]:
    if c.website.startswith("http"):
        parsed_host = _extract_domain(c.website)
        canonical_domain = parsed_host or c.login
    else:
        canonical_domain = c.login
    key = _domain_to_key(canonical_domain)

    score_normalized = max(0.0, min(1.0, c.score / 90.0))
    if c.score >= 60:
        ai_tier = 2
    elif c.score >= 30:
        ai_tier = 1
    else:
        ai_tier = 0

    services: list[str] = []
    for t in c.topics_seen:
        mapped = _GH_TOPIC_SERVICE_MAP.get(t)
        if mapped and mapped not in services:
            services.append(mapped)
    if not services:
        services = ["AI/ML"]

    return {
        "key": key,
        "name": c.name or c.login,
        "website": c.website,
        "canonical_domain": canonical_domain,
        "description": c.description,
        "location": c.location,
        "size": "",
        "services": services,
        "industries": ["Technology"],
        "score": score_normalized,
        "score_reasons": {
            "method": "github-discover-v1",
            "keyword_hits": c.reasons,
            "ai_keyword_hits": sorted(c.topics_seen),
            "anti_hits": [],
            "source_bonus": 0.6,
            "ai_score": score_normalized,
            "consultancy_score": score_normalized,
        },
        "ai_tier": ai_tier,
        "is_ai_focused": c.score >= 15,
    }


async def gh_discover(state: ConsultanciesDiscoveryState) -> dict[str, Any]:
    """GitHub-based discovery node — ports ``github::run`` from gh_discover.rs."""
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    dry_run = bool(state.get("dry_run"))

    token = (os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or "").strip()
    if not token:
        return {"_error": "gh_discover: GITHUB_TOKEN / GH_TOKEN not set"}

    orgs: dict[str, _OrgCandidate] = {}
    async with httpx.AsyncClient() as client:
        slice_results = await asyncio.gather(
            *[_run_gh_slice(client, token, q) for q in _GH_TOPIC_SLICES],
            return_exceptions=True,
        )

    for query, result in zip(_GH_TOPIC_SLICES, slice_results):
        if isinstance(result, BaseException):
            log.warning("slice %s failed: %s", query, result)
            continue
        before = len(orgs)
        for k, v in result.items():
            orgs.setdefault(k, v)
        log.info("slice %s contributed %d new orgs (total %d)", query, len(orgs) - before, len(orgs))

    log.info("Discovered %d unique orgs, scoring...", len(orgs))

    candidates: list[_OrgCandidate] = []
    for c in orgs.values():
        if _is_offshore_location(c.location):
            log.info("[GH] %s skipped — offshore: %s", c.login, c.location)
            continue
        score, reasons = _score_org(c)
        c.score = score
        c.reasons = reasons
        candidates.append(c)

    candidates.sort(key=lambda x: x.score, reverse=True)
    for c in candidates[:10]:
        log.info("  %4d  %-30s  %s", c.score, c.login, c.website)

    to_upsert = [c for c in candidates if c.score >= _GH_MIN_SCORE_TO_SAVE]
    skipped = len(candidates) - len(to_upsert)

    limit = state.get("limit")
    if limit:
        to_upsert = to_upsert[:limit]

    inserted = 0
    if not dry_run and to_upsert:
        try:
            with psycopg.connect(_dsn(), autocommit=True, connect_timeout=10) as conn:
                with conn.cursor() as cur:
                    for c in to_upsert:
                        row = _gh_candidate_to_row(c)
                        try:
                            cid = _upsert_company(cur, row)
                            log.info("[GH] %s → id=%d score=%d", c.login, cid, c.score)
                            inserted += 1
                        except psycopg.Error as e:
                            log.warning("[GH-DB] %s: %s", c.login, e)
        except psycopg.Error as e:
            return {"_error": f"gh_discover: {e}"}
    elif dry_run:
        log.info("[DRY] skipping DB upsert for %d orgs", len(to_upsert))

    log.info(
        "GitHub: total=%d upserted=%d skipped=%d",
        len(candidates), inserted, skipped,
    )

    top_preview = [
        {"login": c.login, "score": c.score, "website": c.website}
        for c in candidates[:10]
    ]

    return {
        "upserted": 0 if dry_run else inserted,
        "skipped": skipped,
        "top": top_preview,
        "agent_timings": {"gh_discover": round(time.perf_counter() - t0, 3)},
        "graph_meta": {"graph": "consultancies_discovery", "version": "v1", "node": "gh_discover"},
    }


# ── Build graph ───────────────────────────────────────────────────────────────


def _route(state: ConsultanciesDiscoveryState) -> str:
    node = (state.get("node") or "discover").strip().lower()
    return "gh_discover" if node == "gh_discover" else "discover"


def _build() -> Any:
    g = StateGraph(ConsultanciesDiscoveryState)
    g.add_node("discover", discover)
    g.add_node("gh_discover", gh_discover)
    g.add_conditional_edges(
        START,
        _route,
        {"discover": "discover", "gh_discover": "gh_discover"},
    )
    g.add_edge("discover", END)
    g.add_edge("gh_discover", END)
    return g.compile()


graph = _build()
