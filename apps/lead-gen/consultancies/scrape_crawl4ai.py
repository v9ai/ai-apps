"""
Crawl4AI Deep Enrichment — Single-Company Website Scraper
==========================================================
Deep-crawl a company website with Crawl4AI, extract structured data via LLM,
compute enrichment score, and optionally update Neon PostgreSQL.

Complements enrich_brave.py (bulk aiohttp+BS4) for high-quality single-company
enrichment where JS rendering and deep crawling matter.

Usage:
    python scrape_crawl4ai.py https://satalia.com/                   # Crawl + LLM + write to Neon
    python scrape_crawl4ai.py https://satalia.com/ --no-llm          # Markdown only (no DB write)
    python scrape_crawl4ai.py https://satalia.com/ --dry-run         # Print results, skip DB
    python scrape_crawl4ai.py https://satalia.com/ --id 42           # Target specific company ID
    python scrape_crawl4ai.py https://satalia.com/ --pages 20 --depth 3  # Bigger crawl
"""

import asyncio
import argparse
import hashlib
import json
import logging
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("crawl4ai-enrich")

from crawl4ai import AsyncWebCrawler, CrawlerRunConfig, BrowserConfig, CacheMode
from crawl4ai.markdown_generation_strategy import DefaultMarkdownGenerator
from crawl4ai.content_filter_strategy import BM25ContentFilter
from crawl4ai.deep_crawling import BestFirstCrawlingStrategy
from crawl4ai.deep_crawling.filters import FilterChain, DomainFilter
from crawl4ai.deep_crawling.scorers import KeywordRelevanceScorer, CompositeScorer, PathDepthScorer

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

RELEVANCE_KEYWORDS = [
    "about", "services", "solutions", "team", "leadership", "expertise",
    "case-studies", "clients", "technology", "industries", "platform",
    "careers", "contact", "partners", "pricing", "products", "what-we-do",
]

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

SKIP_EMAIL_DOMAINS = {
    "example.com", "sentry.io", "wixpress.com", "googleapis.com",
    "cloudflare.com", "w3.org", "schema.org", "facebook.com",
    "twitter.com", "google.com", "apple.com", "iubenda.com",
}

CLASSIFY_PROMPT = """Analyze this company and respond ONLY with valid JSON, no other text.

Company: {name}
Website: {domain}
Text from their website (crawled from multiple pages):
{text}

Return JSON with these exact keys:
{{
  "category": "PRODUCT or CONSULTANCY or AGENCY or STAFFING or UNKNOWN",
  "ai_tier": 0 or 1 or 2,
  "services": ["list of products/services they offer"],
  "tech_stack": ["technologies, frameworks, AI/ML tools mentioned"],
  "industry": "primary industry vertical (e.g. sales-engagement-platforms, martech, hr_tech, fintech, devtools, logistics, optimization)",
  "industries": ["all industry verticals served"],
  "employee_range": "1-10 or 11-50 or 51-200 or 201-500 or 500+",
  "remote_policy": "remote or hybrid or onsite or unknown",
  "funding_stage": "bootstrapped or seed or series_a or series_b or series_c_plus or public or acquired or unknown",
  "pricing_model": "freemium or subscription or usage_based or enterprise or project_based or unknown",
  "target_market": "smb or mid_market or enterprise or all",
  "key_features": ["top 5 differentiating features or capabilities"],
  "competitors": ["known competitors mentioned or implied"],
  "parent_company": "parent company name if acquired, else null",
  "key_people": [{{"name": "...", "role": "..."}}],
  "office_locations": ["city, country"],
  "one_line_summary": "What they do in 15 words or less",
  "confidence": 0.0 to 1.0
}}

Rules:
- ai_tier: 0 = not AI-focused, 1 = AI-first (AI is core to product), 2 = AI-native (built entirely on AI/ML)
- category: PRODUCT = SaaS/software product, CONSULTANCY = sells consulting/advisory, AGENCY = provides outsourced services
- Be specific with tech_stack: list actual frameworks (LangChain, GPT-4, fine-tuning, RAG, etc.)
- For services, list what they actually sell (e.g. "AI SDR", "email automation", "lead scoring")
- For competitors, only list companies you can infer from the text
- For key_people, extract founders, CEO, CTO, leadership mentioned on the site"""


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class PageResult:
    url: str
    status_code: int
    raw_markdown: str
    fit_markdown: str
    content_hash: str
    links_internal: int = 0
    links_external: int = 0
    is_careers: bool = False
    is_pricing: bool = False
    emails: list[str] = field(default_factory=list)


@dataclass
class CrawlOutput:
    domain: str
    url: str
    pages: list[PageResult] = field(default_factory=list)
    combined_text: str = ""
    all_emails: list[str] = field(default_factory=list)
    has_careers: bool = False
    has_pricing: bool = False
    enrichment: dict = field(default_factory=dict)
    score: float = 0.0
    score_reasons: list[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Phase 1: Deep crawl
# ---------------------------------------------------------------------------

async def crawl_site(url: str, max_pages: int = 15, max_depth: int = 2) -> CrawlOutput:
    domain = urlparse(url).netloc
    output = CrawlOutput(domain=domain, url=url)

    browser_config = BrowserConfig(headless=True, verbose=False)

    content_filter = BM25ContentFilter(
        user_query="company about services products team technology AI optimization consulting industries clients",
        bm25_threshold=0.8,
    )

    markdown_generator = DefaultMarkdownGenerator(content_filter=content_filter)

    scorer = CompositeScorer(scorers=[
        KeywordRelevanceScorer(keywords=RELEVANCE_KEYWORDS, weight=0.7),
        PathDepthScorer(optimal_depth=1, weight=0.3),
    ])

    crawl_strategy = BestFirstCrawlingStrategy(
        max_depth=max_depth,
        max_pages=max_pages,
        filter_chain=FilterChain([DomainFilter(allowed_domains=[domain])]),
        url_scorer=scorer,
    )

    run_config = CrawlerRunConfig(
        deep_crawl_strategy=crawl_strategy,
        markdown_generator=markdown_generator,
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        excluded_tags=["nav", "footer", "header", "aside", "script", "style", "form", "iframe"],
        verbose=False,
    )

    log.info(f"Deep crawl: {url} (max_pages={max_pages}, max_depth={max_depth})")

    async with AsyncWebCrawler(config=browser_config) as crawler:
        results = await crawler.arun(url=url, config=run_config)
        if not isinstance(results, list):
            results = [results]

        for result in results:
            if not result.success:
                log.warning(f"  FAIL: {result.url} — {result.error_message}")
                continue

            raw_md = result.markdown.raw_markdown if result.markdown else ""
            fit_md = result.markdown.fit_markdown if result.markdown else ""
            content = fit_md or raw_md

            page_url = result.url.lower()
            is_careers = any(k in page_url for k in ("/careers", "/jobs", "/hiring", "/join"))
            is_pricing = any(k in page_url for k in ("/pricing", "/plans", "/packages"))

            emails = extract_emails(raw_md)

            page = PageResult(
                url=result.url,
                status_code=result.status_code,
                raw_markdown=raw_md,
                fit_markdown=fit_md,
                content_hash=hashlib.md5(raw_md.encode()).hexdigest(),
                links_internal=len(result.links.get("internal", [])) if result.links else 0,
                links_external=len(result.links.get("external", [])) if result.links else 0,
                is_careers=is_careers,
                is_pricing=is_pricing,
                emails=emails,
            )
            output.pages.append(page)

            if is_careers:
                output.has_careers = True
            if is_pricing:
                output.has_pricing = True
            output.all_emails.extend(emails)

            log.info(
                f"  {result.url} — {result.status_code} | "
                f"raw={len(raw_md)} fit={len(fit_md)} "
                f"{'[careers]' if is_careers else ''}"
                f"{'[pricing]' if is_pricing else ''}"
                f"{f' emails={emails}' if emails else ''}"
            )

    output.all_emails = sorted(set(output.all_emails))
    output.combined_text = build_combined_text(output.pages)
    log.info(f"Crawled {len(output.pages)} pages | {len(output.combined_text)} chars combined | {len(output.all_emails)} emails")
    return output


def extract_emails(text: str) -> list[str]:
    found = EMAIL_RE.findall(text)
    valid = []
    for email in found:
        domain = email.split("@")[1].lower()
        if domain not in SKIP_EMAIL_DOMAINS and not domain.endswith(".png"):
            valid.append(email.lower())
    return sorted(set(valid))


def build_combined_text(pages: list[PageResult]) -> str:
    parts = []
    for p in pages:
        content = p.fit_markdown or p.raw_markdown
        if not content.strip():
            continue
        clean = strip_boilerplate(content)
        if len(clean) > 50:
            parts.append(f"## Page: {p.url}\n\n{clean}")
    return "\n\n---\n\n".join(parts)


def strip_boilerplate(text: str) -> str:
    lines = text.split("\n")
    filtered = []
    for line in lines:
        lower = line.lower().strip()
        if any(skip in lower for skip in [
            "cookie", "privacy policy", "close this notice",
            "we and selected third parties",
            "join our community now for the latest",
            "specified in the", "consent",
        ]):
            continue
        filtered.append(line)
    return "\n".join(filtered).strip()


# ---------------------------------------------------------------------------
# Phase 2: LLM extraction (Crawl4AI LLMExtractionStrategy or direct Anthropic)
# ---------------------------------------------------------------------------

async def classify_with_llm(output: CrawlOutput, provider: str) -> dict:
    if not output.combined_text or len(output.combined_text) < 100:
        return {"error": "Insufficient content for classification"}

    name_guess = output.domain.split(".")[0].replace("-", " ").title()
    prompt = CLASSIFY_PROMPT.format(
        name=name_guess,
        domain=output.domain,
        text=output.combined_text[:8000],
    )

    if provider.startswith("anthropic/"):
        return await _classify_anthropic(prompt, provider)
    else:
        return await _classify_crawl4ai(output.url, output.combined_text, provider)


async def _classify_anthropic(prompt: str, provider: str) -> dict:
    import anthropic

    model = provider.replace("anthropic/", "")
    client = anthropic.AsyncAnthropic()

    response = await client.messages.create(
        model=model,
        max_tokens=1500,
        temperature=0.1,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text
    return _parse_llm_json(content) or {"error": "No JSON in LLM response", "raw": content[:500]}


async def _classify_crawl4ai(url: str, combined_text: str, provider: str) -> dict:
    from crawl4ai.extraction_strategy import LLMExtractionStrategy
    from crawl4ai.async_configs import LLMConfig
    from pydantic import BaseModel

    class CompanyProfile(BaseModel):
        category: str = "UNKNOWN"
        ai_tier: int = 0
        services: list[str] = []
        tech_stack: list[str] = []
        industry: str = ""
        industries: list[str] = []
        employee_range: str = ""
        remote_policy: str = "unknown"
        funding_stage: str = "unknown"
        pricing_model: str = "unknown"
        target_market: str = "unknown"
        key_features: list[str] = []
        competitors: list[str] = []
        parent_company: Optional[str] = None
        key_people: list[dict] = []
        office_locations: list[str] = []
        one_line_summary: str = ""
        confidence: float = 0.5

    strategy = LLMExtractionStrategy(
        llm_config=LLMConfig(provider=provider, api_token="env:ANTHROPIC_API_KEY"),
        schema=CompanyProfile.model_json_schema(),
        extraction_type="schema",
        instruction="Extract a comprehensive company profile. Merge information across all pages.",
        chunk_token_threshold=4096,
        overlap_rate=0.1,
        force_json_response=True,
    )

    async with AsyncWebCrawler(config=BrowserConfig(headless=True)) as crawler:
        result = await crawler.arun(
            url=f"raw://{combined_text}",
            config=CrawlerRunConfig(extraction_strategy=strategy, cache_mode=CacheMode.BYPASS),
        )

    if result.extracted_content:
        try:
            data = json.loads(result.extracted_content)
            return data if isinstance(data, dict) else data[0] if data else {}
        except (json.JSONDecodeError, IndexError):
            pass
    return {"error": "LLM extraction returned no content"}


def _parse_llm_json(text: str) -> dict | None:
    match = re.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None
    return None


# ---------------------------------------------------------------------------
# Scoring (mirrors enrich_brave.py compute_score)
# ---------------------------------------------------------------------------

def compute_score(
    enrichment: dict,
    has_careers: bool,
    has_pricing: bool,
    hf_presence_score: float = 0.0,
) -> tuple[float, list[str]]:
    score = 0.0
    reasons = []

    ai_tier = enrichment.get("ai_tier", 0)
    if ai_tier == 2:
        score += 0.30
        reasons.append("AI-native (tier 2)")
    elif ai_tier == 1:
        score += 0.20
        reasons.append("AI-first (tier 1)")
    else:
        reasons.append("Not AI-focused (tier 0)")

    cat = enrichment.get("category", "UNKNOWN")
    if cat == "PRODUCT":
        score += 0.15
        reasons.append(f"Category: {cat}")
    elif cat in ("CONSULTANCY", "AGENCY"):
        score += 0.10
        reasons.append(f"Category: {cat}")

    services = enrichment.get("services", [])
    score += min(len(services) / 5.0, 1.0) * 0.15
    reasons.append(f"{len(services)} services identified")

    tech = enrichment.get("tech_stack", [])
    score += min(len(tech) / 5.0, 1.0) * 0.10
    reasons.append(f"{len(tech)} tech signals")

    pricing = enrichment.get("pricing_model", "unknown")
    if pricing != "unknown":
        score += 0.10
        reasons.append(f"Pricing: {pricing}")

    if has_careers:
        score += 0.05
        reasons.append("Has careers page")

    if hf_presence_score > 0:
        score += min(hf_presence_score / 100.0, 1.0) * 0.05
        reasons.append(f"HF presence: {hf_presence_score:.0f}/100")

    if has_pricing:
        score += 0.05
        reasons.append("Has pricing page")

    conf = enrichment.get("confidence", 0.5)
    score += conf * 0.05
    reasons.append(f"Confidence: {conf:.0%}")

    return round(min(score, 1.0), 3), reasons


# ---------------------------------------------------------------------------
# Phase 3: Neon DB update
# ---------------------------------------------------------------------------

def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set in .env.local")
    return psycopg2.connect(url, sslmode="require")


def lookup_company(domain: str, company_id: int | None = None) -> dict | None:
    conn = get_neon_conn()
    with conn.cursor() as cur:
        if company_id:
            cur.execute("SELECT id, key, name, website, canonical_domain FROM companies WHERE id = %s", (company_id,))
        else:
            clean = domain.removeprefix("www.")
            cur.execute(
                "SELECT id, key, name, website, canonical_domain FROM companies WHERE canonical_domain = %s",
                (clean,),
            )
        row = cur.fetchone()
    conn.close()
    if row:
        return {"id": row[0], "key": row[1], "name": row[2], "website": row[3], "canonical_domain": row[4]}
    return None


def update_neon(company: dict, output: CrawlOutput):
    conn = get_neon_conn()
    now = datetime.now(timezone.utc).isoformat()
    e = output.enrichment
    cid = company["id"]

    ai_tier = e.get("ai_tier", 0)
    if not isinstance(ai_tier, int):
        ai_tier = 0
    category = e.get("category", "UNKNOWN")
    if category not in ("PRODUCT", "CONSULTANCY", "AGENCY", "STAFFING", "UNKNOWN"):
        category = "UNKNOWN"

    with conn.cursor() as cur:
        # Update company record
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
                deep_analysis = %s,
                updated_at = %s
            WHERE id = %s
            """,
            (
                category,
                ai_tier,
                e.get("one_line_summary", ""),
                e.get("confidence", 0.5),
                e.get("one_line_summary", ""),
                json.dumps(e.get("services", [])),
                json.dumps(
                    e.get("tech_stack", [])
                    + e.get("key_features", [])
                    + [f"pricing:{e.get('pricing_model', 'unknown')}"]
                    + [f"market:{e.get('target_market', 'unknown')}"]
                    + [f"funding:{e.get('funding_stage', 'unknown')}"]
                ),
                json.dumps(e.get("industries", [e.get("industry", "unknown")])),
                e.get("employee_range", ""),
                output.score,
                json.dumps(output.score_reasons),
                json.dumps(output.all_emails) if output.all_emails else None,
                build_deep_analysis(output),
                now,
                cid,
            ),
        )

        # Insert provenance facts
        fact_fields = [
            ("category", category),
            ("ai_tier", str(ai_tier)),
            ("services", json.dumps(e.get("services", []))),
            ("tech_stack", json.dumps(e.get("tech_stack", []))),
            ("industry", e.get("industry", "")),
            ("industries", json.dumps(e.get("industries", []))),
            ("employee_range", e.get("employee_range", "")),
            ("remote_policy", e.get("remote_policy", "unknown")),
            ("funding_stage", e.get("funding_stage", "unknown")),
            ("pricing_model", e.get("pricing_model", "unknown")),
            ("target_market", e.get("target_market", "unknown")),
            ("competitors", json.dumps(e.get("competitors", []))),
            ("parent_company", e.get("parent_company") or ""),
            ("key_people", json.dumps(e.get("key_people", []))),
            ("office_locations", json.dumps(e.get("office_locations", []))),
        ]

        facts_inserted = 0
        for field_name, value in fact_fields:
            if not value or value in ("unknown", "UNKNOWN", "[]", '""', "null"):
                continue
            cur.execute(
                """
                INSERT INTO company_facts
                    (company_id, field, value_text, confidence,
                     source_type, source_url, observed_at, method)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (cid, field_name, value, e.get("confidence", 0.5),
                 "LIVE_FETCH", output.url, now, "LLM"),
            )
            facts_inserted += 1

        # Store page snapshots
        snapshots_inserted = 0
        for page in output.pages:
            cur.execute(
                """
                INSERT INTO company_snapshots
                    (company_id, source_url, fetched_at, http_status,
                     content_hash, text_sample, source_type, method)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT DO NOTHING
                """,
                (cid, page.url, now, page.status_code,
                 page.content_hash, (page.fit_markdown or page.raw_markdown)[:5000],
                 "LIVE_FETCH", "DOM"),
            )
            snapshots_inserted += 1

        conn.commit()

    conn.close()
    log.info(f"Neon: company {cid} updated | {facts_inserted} facts | {snapshots_inserted} snapshots")


def build_deep_analysis(output: CrawlOutput) -> str:
    e = output.enrichment
    if not e:
        return ""

    lines = [
        f"# {e.get('one_line_summary', output.domain)}",
        "",
        f"**Category:** {e.get('category', 'UNKNOWN')} | **AI Tier:** {e.get('ai_tier', 0)} | **Score:** {output.score:.0%}",
        "",
    ]

    if e.get("parent_company"):
        lines.append(f"**Parent Company:** {e['parent_company']}")
        lines.append("")

    if e.get("services"):
        lines.append("## Services")
        for svc in e["services"]:
            lines.append(f"- {svc}")
        lines.append("")

    if e.get("industries"):
        lines.append(f"**Industries:** {', '.join(e['industries'])}")
        lines.append("")

    if e.get("tech_stack"):
        lines.append(f"**Tech Stack:** {', '.join(e['tech_stack'])}")
        lines.append("")

    if e.get("ai_capabilities") or e.get("key_features"):
        feats = e.get("ai_capabilities", []) or e.get("key_features", [])
        lines.append("## Key Capabilities")
        for f in feats:
            lines.append(f"- {f}")
        lines.append("")

    if e.get("key_people"):
        lines.append("## Leadership")
        for person in e["key_people"]:
            lines.append(f"- **{person.get('name', '?')}** — {person.get('role', '?')}")
        lines.append("")

    if e.get("office_locations"):
        lines.append(f"**Locations:** {', '.join(e['office_locations'])}")
        lines.append("")

    if e.get("competitors"):
        lines.append(f"**Competitors:** {', '.join(e['competitors'])}")
        lines.append("")

    meta = []
    if e.get("employee_range"):
        meta.append(f"Size: {e['employee_range']}")
    if e.get("funding_stage") and e["funding_stage"] != "unknown":
        meta.append(f"Funding: {e['funding_stage']}")
    if e.get("pricing_model") and e["pricing_model"] != "unknown":
        meta.append(f"Pricing: {e['pricing_model']}")
    if e.get("remote_policy") and e["remote_policy"] != "unknown":
        meta.append(f"Remote: {e['remote_policy']}")
    if meta:
        lines.append(f"**{' | '.join(meta)}**")
        lines.append("")

    lines.append(f"*Enriched via Crawl4AI deep crawl ({len(output.pages)} pages) on {datetime.now().strftime('%Y-%m-%d')}*")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

def print_summary(output: CrawlOutput, company: dict | None = None):
    e = output.enrichment
    name = company["name"] if company else output.domain

    print(f"\n{'='*70}")
    print(f"  CRAWL4AI ENRICHMENT: {name} ({output.domain})")
    print(f"  Pages: {len(output.pages)} | Emails: {len(output.all_emails)} | "
          f"Careers: {'Y' if output.has_careers else 'N'} | Pricing: {'Y' if output.has_pricing else 'N'}")
    print(f"{'='*70}")

    # Page summary
    for i, p in enumerate(output.pages, 1):
        flags = []
        if p.is_careers:
            flags.append("careers")
        if p.is_pricing:
            flags.append("pricing")
        if p.emails:
            flags.append(f"emails:{len(p.emails)}")
        flag_str = f" [{', '.join(flags)}]" if flags else ""
        print(f"  {i:2d}. {p.url}")
        print(f"      {p.status_code} | raw={len(p.raw_markdown):,} fit={len(p.fit_markdown):,} chars{flag_str}")

    if not e or "error" in e:
        print(f"\n  LLM: {e.get('error', 'skipped')}")
        return

    print(f"\n{'─'*70}")
    print(f"  CLASSIFICATION")
    print(f"{'─'*70}")
    print(f"  Category: {e.get('category', '?')} | AI Tier: {e.get('ai_tier', '?')} | Score: {output.score:.0%}")
    print(f"  {e.get('one_line_summary', 'N/A')}")

    if e.get("parent_company"):
        print(f"  Parent: {e['parent_company']}")

    print(f"  Services: {', '.join(e.get('services', []))}")
    print(f"  Tech: {', '.join(e.get('tech_stack', []))}")
    print(f"  Industries: {', '.join(e.get('industries', [e.get('industry', '?')]))}")

    print(f"  Size: {e.get('employee_range', '?')} | Funding: {e.get('funding_stage', '?')} | Pricing: {e.get('pricing_model', '?')}")
    print(f"  Market: {e.get('target_market', '?')} | Remote: {e.get('remote_policy', '?')}")

    if e.get("key_features"):
        print(f"  Key Features: {', '.join(e['key_features'])}")
    if e.get("office_locations"):
        print(f"  Locations: {', '.join(e['office_locations'])}")
    if output.all_emails:
        print(f"  Emails: {', '.join(output.all_emails[:5])}")
    if e.get("competitors"):
        print(f"  Competitors: {', '.join(e['competitors'])}")
    if e.get("key_people"):
        for person in e["key_people"]:
            print(f"  Person: {person.get('name', '?')} — {person.get('role', '?')}")

    print(f"\n  Score Breakdown:")
    for reason in output.score_reasons:
        print(f"    - {reason}")

    # Markdown preview from top 3 pages
    print(f"\n{'─'*70}")
    print(f"  TOP PAGE CONTENT (fit_markdown)")
    print(f"{'─'*70}")
    top_pages = sorted(output.pages, key=lambda p: len(p.fit_markdown), reverse=True)[:3]
    for p in top_pages:
        content = strip_boilerplate(p.fit_markdown)
        if len(content) < 50:
            continue
        print(f"\n  --- {p.url} ---")
        lines = content.split("\n")[:30]
        for line in lines:
            print(f"  {line}")
        if len(content.split("\n")) > 30:
            print(f"  ... ({len(content.split(chr(10))) - 30} more lines)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    parser = argparse.ArgumentParser(description="Crawl4AI Deep Enrichment")
    parser.add_argument("url", help="Company website URL to crawl")
    parser.add_argument("--no-llm", action="store_true", help="Skip LLM classification")
    parser.add_argument("--pages", type=int, default=15, help="Max pages to crawl (default: 15)")
    parser.add_argument("--depth", type=int, default=2, help="Max crawl depth (default: 2)")
    parser.add_argument("--provider", default="anthropic/claude-sonnet-4-6",
                        help="LLM provider (default: anthropic/claude-sonnet-4-6)")
    parser.add_argument("--dry-run", action="store_true", help="Print results without writing to Neon")
    parser.add_argument("--id", type=int, default=None, help="Company ID in Neon (auto-lookup if omitted)")
    parser.add_argument("--json", action="store_true", help="Output raw JSON only")
    args = parser.parse_args()

    # Phase 1: Deep crawl
    output = await crawl_site(url=args.url, max_pages=args.pages, max_depth=args.depth)

    if not output.pages:
        log.error("No pages crawled successfully")
        sys.exit(1)

    # Phase 2: LLM classification
    if not args.no_llm:
        output.enrichment = await classify_with_llm(output, args.provider)
        output.score, output.score_reasons = compute_score(
            output.enrichment, output.has_careers, output.has_pricing
        )

    # Lookup company in DB
    domain = urlparse(args.url).netloc.removeprefix("www.")
    company = lookup_company(domain, args.id)
    if not company:
        log.warning(f"Company not found in Neon for domain={domain} id={args.id} — skipping DB write")

    # Phase 3: Write to Neon (unless --dry-run)
    if not args.dry_run and company and output.enrichment:
        update_neon(company, output)

    # Output
    if args.json:
        result = {
            "domain": output.domain,
            "url": output.url,
            "pages_crawled": len(output.pages),
            "pages": [p.url for p in output.pages],
            "emails": output.all_emails,
            "has_careers": output.has_careers,
            "has_pricing": output.has_pricing,
            "enrichment": output.enrichment,
            "score": output.score,
            "score_reasons": output.score_reasons,
        }
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print_summary(output, company)


if __name__ == "__main__":
    asyncio.run(main())
