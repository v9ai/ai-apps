"""
AI Lead-Gen Platform Enrichment (Website Scraping + MLX Classification)
=======================================================================
Async scraping → MLX Qwen3-8B classification → Neon PostgreSQL update

Enriches companies discovered via Brave Search (or any unenriched company)
by scraping their websites and extracting structured data with ML.

Usage:
    python enrich_brave.py                    # Enrich BRAVE_SEARCH companies
    python enrich_brave.py --dry-run          # Print results only
    python enrich_brave.py --all-unenriched   # Any UNKNOWN company
    python enrich_brave.py --limit 10         # Process first N
    python enrich_brave.py --no-llm           # Scrape only, skip MLX
"""

import asyncio
import aiohttp
import argparse
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("enrich-brave")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MAX_CONCURRENT = 15
REQUEST_TIMEOUT = 20
RATE_LIMIT_DELAY = 0.5
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)

# Pages to scrape per company
SCRAPE_PATHS = [
    "",              # homepage
    "/about",
    "/about-us",
    "/pricing",
    "/careers",
    "/services",
    "/solutions",
    "/customers",
    "/product",
]

EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
)

SKIP_EMAIL_DOMAINS = {
    "example.com", "sentry.io", "wixpress.com", "googleapis.com",
    "cloudflare.com", "w3.org", "schema.org", "facebook.com",
    "twitter.com", "google.com", "apple.com",
}


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class CompanyRecord:
    """Company loaded from Neon for enrichment."""
    id: int
    key: str
    name: str
    website: str
    canonical_domain: str
    # Scraped data
    page_text: str = ""
    emails_found: list = field(default_factory=list)
    has_careers_page: bool = False
    has_pricing_page: bool = False
    # MLX classification results
    enrichment: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Neon helpers
# ---------------------------------------------------------------------------

def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return psycopg2.connect(url, sslmode="require")


def load_companies(all_unenriched: bool = False, limit: int = 0) -> list[CompanyRecord]:
    """Load unenriched companies from Neon."""
    conn = get_neon_conn()
    with conn.cursor() as cur:
        if all_unenriched:
            sql = """
                SELECT id, key, name, website, canonical_domain
                FROM companies
                WHERE category = 'UNKNOWN' AND blocked = false
                ORDER BY created_at DESC
            """
        else:
            sql = """
                SELECT c.id, c.key, c.name, c.website, c.canonical_domain
                FROM companies c
                JOIN company_facts cf ON cf.company_id = c.id
                WHERE cf.source_type = 'BRAVE_SEARCH'
                  AND c.category = 'UNKNOWN'
                  AND c.blocked = false
                GROUP BY c.id
                ORDER BY c.created_at DESC
            """
        if limit > 0:
            sql += f" LIMIT {limit}"
        cur.execute(sql)
        rows = cur.fetchall()

    conn.close()
    companies = []
    for row in rows:
        companies.append(CompanyRecord(
            id=row[0], key=row[1], name=row[2],
            website=row[3] or "", canonical_domain=row[4] or "",
        ))
    log.info(f"Loaded {len(companies)} unenriched companies from Neon")
    return companies


# ---------------------------------------------------------------------------
# Async website scraping
# ---------------------------------------------------------------------------

async def fetch(session: aiohttp.ClientSession, url: str, sem: asyncio.Semaphore) -> str:
    async with sem:
        try:
            async with session.get(
                url,
                timeout=aiohttp.ClientTimeout(total=REQUEST_TIMEOUT),
                headers={"User-Agent": USER_AGENT},
                ssl=False,
            ) as resp:
                if resp.status == 200:
                    return await resp.text()
                return ""
        except Exception:
            return ""


def extract_text(html: str) -> str:
    """Extract clean body text from HTML."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.select("nav, footer, script, style, header, .cookie, noscript"):
        tag.decompose()
    return soup.get_text(separator=" ", strip=True)


def extract_emails(html: str) -> list[str]:
    """Extract email addresses from HTML."""
    found = EMAIL_RE.findall(html)
    return list({
        e.lower() for e in found
        if not any(skip in e.lower() for skip in SKIP_EMAIL_DOMAINS)
        and not e.endswith(".png")
        and not e.endswith(".jpg")
        and not e.endswith(".svg")
    })


async def scrape_company(
    session: aiohttp.ClientSession,
    sem: asyncio.Semaphore,
    company: CompanyRecord,
) -> CompanyRecord:
    """Scrape multiple pages from a company website."""
    base = company.website
    if not base:
        return company

    # Ensure base has protocol
    if not base.startswith("http"):
        base = f"https://{company.canonical_domain}"

    texts = []
    all_emails = set()

    for path in SCRAPE_PATHS:
        url = urljoin(base, path) if path else base
        html = await fetch(session, url, sem)
        if not html:
            continue

        text = extract_text(html)
        if text and len(text) > 50:
            texts.append(text[:2000])

        emails = extract_emails(html)
        all_emails.update(emails)

        if path in ("/careers", "/jobs"):
            company.has_careers_page = True
        if path == "/pricing":
            company.has_pricing_page = True

        await asyncio.sleep(RATE_LIMIT_DELAY)

    company.page_text = " | ".join(texts)[:6000]
    company.emails_found = sorted(all_emails)
    return company


async def scrape_all(companies: list[CompanyRecord]) -> list[CompanyRecord]:
    """Scrape all companies concurrently."""
    sem = asyncio.Semaphore(MAX_CONCURRENT)
    async with aiohttp.ClientSession() as session:
        tasks = [scrape_company(session, sem, c) for c in companies]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    scraped = []
    for r in results:
        if isinstance(r, CompanyRecord):
            scraped.append(r)
        elif isinstance(r, Exception):
            log.warning(f"Scrape error: {r}")

    with_text = [c for c in scraped if c.page_text]
    log.info(f"Scraped {len(with_text)}/{len(companies)} companies successfully")
    return scraped


# ---------------------------------------------------------------------------
# MLX LLM classification
# ---------------------------------------------------------------------------

CLASSIFY_PROMPT = """Analyze this company and respond ONLY with valid JSON, no other text.

Company: {name}
Website: {domain}
Text from their website:
{text}

Return JSON with these exact keys:
{{
  "category": "PRODUCT or CONSULTANCY or AGENCY or STAFFING or UNKNOWN",
  "ai_tier": 0 or 1 or 2,
  "services": ["list of products/services they offer"],
  "tech_stack": ["technologies, frameworks, AI/ML tools mentioned"],
  "industry": "primary industry vertical (e.g. sales_tech, martech, hr_tech, fintech, devtools)",
  "employee_range": "1-10 or 11-50 or 51-200 or 201-500 or 500+",
  "remote_policy": "remote or hybrid or onsite or unknown",
  "funding_stage": "bootstrapped or seed or series_a or series_b or series_c_plus or public or unknown",
  "pricing_model": "freemium or subscription or usage_based or enterprise or unknown",
  "target_market": "smb or mid_market or enterprise or all",
  "key_features": ["top 5 differentiating features or capabilities"],
  "competitors": ["known competitors mentioned or implied"],
  "one_line_summary": "What they do in 15 words or less",
  "confidence": 0.0 to 1.0
}}

Rules:
- ai_tier: 0 = not AI-focused, 1 = AI-first (AI is core to product), 2 = AI-native (built entirely on AI/ML)
- category: PRODUCT = SaaS/software product, CONSULTANCY = sells consulting/advisory, AGENCY = provides outsourced services
- Be specific with tech_stack: list actual frameworks (LangChain, GPT-4, fine-tuning, RAG, etc.)
- For services, list what they actually sell (e.g. "AI SDR", "email automation", "lead scoring")
- For competitors, only list companies you can infer from the text
/no_think"""


def classify_with_mlx(companies: list[CompanyRecord]) -> list[CompanyRecord]:
    """Classify companies using Qwen3-8B on Metal GPU."""
    try:
        from mlx_lm import load, generate
    except ImportError:
        log.warning("mlx-lm not installed. Skipping LLM classification.")
        return companies

    log.info("Loading Qwen3 8B on Metal GPU...")
    model, tokenizer = load("mlx-community/Qwen3-8B-4bit")
    log.info("Model loaded. Classifying companies...")

    for i, c in enumerate(companies):
        if not c.page_text or len(c.page_text) < 100:
            log.info(f"  [{i+1}/{len(companies)}] {c.name} — skipped (no text)")
            continue

        prompt = CLASSIFY_PROMPT.format(
            name=c.name,
            domain=c.canonical_domain,
            text=c.page_text[:3000],
        )

        messages = [{"role": "user", "content": prompt}]
        prompt_text = tokenizer.apply_chat_template(
            messages, add_generation_prompt=True
        )

        try:
            response = generate(
                model, tokenizer, prompt=prompt_text, max_tokens=500, verbose=False
            )
            # Extract JSON from response
            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                data = json.loads(json_match.group())
                c.enrichment = data
                log.info(
                    f"  [{i+1}/{len(companies)}] {c.name} → "
                    f"{data.get('category', '?')} | "
                    f"ai_tier={data.get('ai_tier', '?')} | "
                    f"{data.get('one_line_summary', '')[:50]}"
                )
            else:
                log.warning(f"  [{i+1}/{len(companies)}] {c.name} — no JSON in response")
        except Exception as e:
            log.warning(f"  [{i+1}/{len(companies)}] {c.name} — LLM error: {e}")

    enriched = [c for c in companies if c.enrichment]
    log.info(f"Classified {len(enriched)}/{len(companies)} companies")
    return companies


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------

def compute_score(enrichment: dict, has_careers: bool, has_pricing: bool) -> tuple[float, list[str]]:
    """Compute enrichment score (0-1) with reasons."""
    score = 0.0
    reasons = []

    # AI tier (30%)
    ai_tier = enrichment.get("ai_tier", 0)
    if ai_tier == 2:
        score += 0.30
        reasons.append("AI-native (tier 2)")
    elif ai_tier == 1:
        score += 0.20
        reasons.append("AI-first (tier 1)")
    else:
        reasons.append("Not AI-focused (tier 0)")

    # Category (15%)
    cat = enrichment.get("category", "UNKNOWN")
    if cat == "PRODUCT":
        score += 0.15
        reasons.append(f"Category: {cat}")
    elif cat in ("CONSULTANCY", "AGENCY"):
        score += 0.10
        reasons.append(f"Category: {cat}")

    # Services richness (15%)
    services = enrichment.get("services", [])
    svc_score = min(len(services) / 5.0, 1.0) * 0.15
    score += svc_score
    reasons.append(f"{len(services)} services identified")

    # Tech stack (10%)
    tech = enrichment.get("tech_stack", [])
    tech_score = min(len(tech) / 5.0, 1.0) * 0.10
    score += tech_score
    reasons.append(f"{len(tech)} tech signals")

    # Pricing (10%)
    pricing = enrichment.get("pricing_model", "unknown")
    if pricing != "unknown":
        score += 0.10
        reasons.append(f"Pricing: {pricing}")

    # Careers page (5%)
    if has_careers:
        score += 0.05
        reasons.append("Has careers page")

    # Pricing page (5%)
    if has_pricing:
        score += 0.05
        reasons.append("Has pricing page")

    # Confidence (10%)
    conf = enrichment.get("confidence", 0.5)
    score += conf * 0.10
    reasons.append(f"Confidence: {conf:.0%}")

    return round(min(score, 1.0), 3), reasons


# ---------------------------------------------------------------------------
# Neon update
# ---------------------------------------------------------------------------

def update_neon(companies: list[CompanyRecord]):
    """Update enriched companies in Neon PostgreSQL."""
    conn = get_neon_conn()
    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    facts_inserted = 0

    with conn.cursor() as cur:
        for c in companies:
            e = c.enrichment
            if not e:
                continue

            score, score_reasons = compute_score(e, c.has_careers_page, c.has_pricing_page)

            ai_tier = e.get("ai_tier", 0)
            if not isinstance(ai_tier, int):
                ai_tier = 0
            category = e.get("category", "UNKNOWN")
            if category not in ("PRODUCT", "CONSULTANCY", "AGENCY", "STAFFING", "UNKNOWN"):
                category = "UNKNOWN"

            try:
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
                        json.dumps([e.get("industry", "unknown")]),
                        e.get("employee_range", ""),
                        score,
                        json.dumps(score_reasons),
                        json.dumps(c.emails_found) if c.emails_found else None,
                        now,
                        c.id,
                    ),
                )
                updated += 1

                # Insert provenance facts for key fields
                fact_fields = [
                    ("category", category),
                    ("ai_tier", str(ai_tier)),
                    ("services", json.dumps(e.get("services", []))),
                    ("tech_stack", json.dumps(e.get("tech_stack", []))),
                    ("industry", e.get("industry", "")),
                    ("employee_range", e.get("employee_range", "")),
                    ("remote_policy", e.get("remote_policy", "unknown")),
                    ("funding_stage", e.get("funding_stage", "unknown")),
                    ("pricing_model", e.get("pricing_model", "unknown")),
                    ("target_market", e.get("target_market", "unknown")),
                    ("competitors", json.dumps(e.get("competitors", []))),
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
                            c.id, field_name, value,
                            e.get("confidence", 0.5),
                            "BRAVE_SEARCH",
                            c.website or f"https://{c.canonical_domain}",
                            now, "LLM",
                        ),
                    )
                    facts_inserted += 1

            except Exception as ex:
                log.warning(f"Neon update error for {c.name}: {ex}")
                conn.rollback()
                continue

        conn.commit()

    conn.close()
    log.info(f"Neon: {updated} companies updated, {facts_inserted} facts inserted")


# ---------------------------------------------------------------------------
# Print summary
# ---------------------------------------------------------------------------

def print_summary(companies: list[CompanyRecord]):
    enriched = [c for c in companies if c.enrichment]
    print(f"\n{'='*70}")
    print(f"  Enrichment Results: {len(enriched)}/{len(companies)} classified")
    print(f"{'='*70}\n")

    for i, c in enumerate(enriched, 1):
        e = c.enrichment
        score, reasons = compute_score(e, c.has_careers_page, c.has_pricing_page)
        print(f"  {i:3d}. {c.name} ({c.canonical_domain})")
        print(f"       Category: {e.get('category', '?')} | AI Tier: {e.get('ai_tier', '?')} | Score: {score:.0%}")
        print(f"       {e.get('one_line_summary', 'N/A')}")
        print(f"       Services: {', '.join(e.get('services', [])[:5])}")
        print(f"       Tech: {', '.join(e.get('tech_stack', [])[:5])}")
        print(f"       Size: {e.get('employee_range', '?')} | Funding: {e.get('funding_stage', '?')} | Pricing: {e.get('pricing_model', '?')}")
        print(f"       Market: {e.get('target_market', '?')} | Remote: {e.get('remote_policy', '?')}")
        if c.emails_found:
            print(f"       Emails: {', '.join(c.emails_found[:3])}")
        if e.get("competitors"):
            print(f"       Competitors: {', '.join(e.get('competitors', [])[:5])}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Enrich companies via website scraping + MLX classification"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Print results without updating Neon")
    parser.add_argument("--all-unenriched", action="store_true",
                        help="Enrich any UNKNOWN company, not just BRAVE_SEARCH")
    parser.add_argument("--limit", type=int, default=0,
                        help="Max companies to process (0 = all)")
    parser.add_argument("--no-llm", action="store_true",
                        help="Scrape only, skip MLX classification")
    args = parser.parse_args()

    t0 = time.time()

    # Phase 1: Load from Neon
    companies = load_companies(
        all_unenriched=args.all_unenriched,
        limit=args.limit,
    )
    if not companies:
        log.info("No unenriched companies found.")
        return

    # Phase 2: Async scrape
    log.info(f"Phase 2: Scraping {len(companies)} company websites...")
    companies = asyncio.run(scrape_all(companies))

    # Phase 3: MLX classification
    if not args.no_llm:
        log.info("Phase 3: MLX classification...")
        companies = classify_with_mlx(companies)

    # Print summary
    print_summary(companies)

    elapsed = time.time() - t0
    log.info(f"Pipeline completed in {elapsed:.0f}s")

    # Phase 4: Update Neon
    if args.dry_run:
        log.info("Dry run — skipping Neon update.")
        return

    enriched = [c for c in companies if c.enrichment]
    if not enriched:
        log.info("No enrichment data to save.")
        return

    update_neon(companies)
    log.info("Done.")


if __name__ == "__main__":
    main()
