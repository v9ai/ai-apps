"""
AI Features Deep Extraction (MLX)
==================================
Re-scrapes enriched lead-gen/sales companies and extracts a focused
AI features taxonomy using Qwen3-8B on Metal GPU.

Stores results in company_facts (field-level granularity for SQL filtering)
and merges ai: prefixed tags into companies.tags.

Usage:
    python extract_ai_features.py               # All BRAVE_SEARCH companies
    python extract_ai_features.py --dry-run     # Print, skip Neon writes
    python extract_ai_features.py --limit 10    # First N companies
    python extract_ai_features.py --company-id 42  # Single company debug
    python extract_ai_features.py --no-llm      # Scrape only
"""

import asyncio
import aiohttp
import argparse
import json
import logging
import os
import re
import time
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("extract-ai-features")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

MAX_CONCURRENT = 10        # slightly lower — more pages per company
REQUEST_TIMEOUT = 20
RATE_LIMIT_DELAY = 0.5
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Apple Silicon Mac OS X 14_0) "
    "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
)

# AI-content-focused pages first, then standard fallbacks
AI_SCRAPE_PATHS = [
    "",               # homepage
    "/how-it-works",
    "/platform",
    "/technology",
    "/ai",
    "/product",
    "/features",
    "/about",
    "/solutions",
    "/pricing",
]

MAX_TEXT_CHARS = 3000     # more context than enrich_brave.py (1500) for richer AI signal
MAX_CHARS_PER_PAGE = 500  # 500 × 10 pages = 5000 raw, capped at 3000

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")

SKIP_EMAIL_DOMAINS = {
    "example.com", "sentry.io", "wixpress.com", "googleapis.com",
    "cloudflare.com", "w3.org", "schema.org", "facebook.com",
    "twitter.com", "google.com", "apple.com",
}

VALID_FEATURE_CATEGORIES = {
    "intent", "enrichment", "outreach", "engagement", "analytics", "automation",
}

# Fields written to company_facts (used for idempotent DELETE on re-runs)
AI_FACT_FIELDS = {
    "ai_features", "feature", "core_differentiator", "automation_level",
}


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class CompanyRecord:
    id: int
    key: str
    name: str
    website: str
    canonical_domain: str
    existing_tags: list = field(default_factory=list)
    page_text: str = ""
    ai_features: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Neon helpers
# ---------------------------------------------------------------------------

def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return psycopg2.connect(url, sslmode="require")


def load_companies(limit: int = 0, company_id: int = 0) -> list[CompanyRecord]:
    """Load enriched BRAVE_SEARCH companies from Neon."""
    conn = get_neon_conn()
    with conn.cursor() as cur:
        if company_id > 0:
            sql = """
                SELECT id, key, name, website, canonical_domain,
                       COALESCE(tags, '[]')
                FROM companies
                WHERE id = %s AND blocked = false
            """
            cur.execute(sql, (company_id,))
        else:
            sql = """
                SELECT c.id, c.key, c.name, c.website, c.canonical_domain,
                       COALESCE(c.tags, '[]')
                FROM companies c
                JOIN company_facts cf ON cf.company_id = c.id
                WHERE cf.source_type = 'BRAVE_SEARCH'
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
        try:
            tags = json.loads(row[5] or "[]")
        except Exception:
            tags = []
        companies.append(CompanyRecord(
            id=row[0], key=row[1], name=row[2],
            website=row[3] or "", canonical_domain=row[4] or "",
            existing_tags=tags,
        ))
    log.info(f"Loaded {len(companies)} companies from Neon")
    return companies


# ---------------------------------------------------------------------------
# Async website scraping (copied verbatim from enrich_brave.py)
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
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup.select("nav, footer, script, style, header, .cookie, noscript"):
        tag.decompose()
    return soup.get_text(separator=" ", strip=True)


def extract_emails(html: str) -> list[str]:
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
    base = company.website
    if not base:
        return company
    if not base.startswith("http"):
        base = f"https://{company.canonical_domain}"

    texts = []
    for path in AI_SCRAPE_PATHS:
        url = urljoin(base, path) if path else base
        html = await fetch(session, url, sem)
        if not html:
            continue
        text = extract_text(html)
        if text and len(text) > 50:
            texts.append(text[:MAX_CHARS_PER_PAGE])
        await asyncio.sleep(RATE_LIMIT_DELAY)

    company.page_text = " | ".join(texts)[:MAX_TEXT_CHARS]
    return company


async def scrape_all(companies: list[CompanyRecord]) -> list[CompanyRecord]:
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
# AI Features prompt
# ---------------------------------------------------------------------------

AI_FEATURES_PROMPT = """You are a product analyst reviewing an AI-powered sales or lead generation software company.
Respond ONLY with valid JSON. No explanations, no markdown, no text outside the JSON object.

Company: {name}
Domain: {domain}
Website content:
{text}

Extract every specific product feature and how it is implemented. Return this exact JSON:
{{
  "features": [
    {{
      "name": "feature name (e.g. Buyer Intent Detection, AI Email Writer, Meeting Intelligence)",
      "category": "intent or enrichment or outreach or engagement or analytics or automation",
      "description": "what this feature does for the user in 1 sentence",
      "ai_implementation": "exactly how AI/ML powers it (e.g. 'trains ML model on web visit signals and job postings to score purchase likelihood'; 'LLM generates personalised email using LinkedIn profile + company news'; 'real-time speech-to-text + sentiment classifier on live calls')",
      "data_sources": ["list data inputs: web signals, CRM data, LinkedIn, email threads, call recordings, job postings, technographic data, etc."],
      "is_realtime": false
    }}
  ],
  "core_differentiator": "what makes this company's AI uniquely better than competitors in max 20 words",
  "automation_level": "assisted or semi-auto or autonomous or agentic"
}}

Category definitions:
- intent: buyer intent signals, purchase likelihood scoring, behavioural tracking
- enrichment: lead research, company/contact data enrichment, prospect profiling
- outreach: email writing, sequence building, personalisation at scale
- engagement: live chat AI, voice call AI, conversation handling
- analytics: call analytics, pipeline forecasting, revenue intelligence, win/loss
- automation: workflow automation, AI SDR, meeting scheduling, follow-up automation

Rules:
- Extract every distinct named feature you can find in the content (aim for 3-10 features)
- ai_implementation must be specific — describe the actual AI/ML technique, not marketing language
- If buyer intent is a feature, describe exactly what signals feed the model and how scoring works
- is_realtime = true only if the feature acts during a live interaction (call, chat, website visit)
- automation_level: assisted=human approves all, semi-auto=AI drafts human approves, autonomous=AI acts alone, agentic=multi-step AI agent
/no_think"""


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

def normalise_features(raw: dict) -> dict:
    """Validate and clean extracted features."""
    features = []
    for item in raw.get("features", []):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        if not name:
            continue
        cat = item.get("category", "")
        features.append({
            "name": name,
            "category": cat if cat in VALID_FEATURE_CATEGORIES else "automation",
            "description": str(item.get("description", ""))[:300],
            "ai_implementation": str(item.get("ai_implementation", ""))[:500],
            "data_sources": [str(s) for s in item.get("data_sources", []) if s][:10],
            "is_realtime": bool(item.get("is_realtime", False)),
        })

    automation = raw.get("automation_level", "assisted")
    if automation not in {"assisted", "semi-auto", "autonomous", "agentic"}:
        automation = "assisted"

    return {
        "features": features[:12],
        "core_differentiator": str(raw.get("core_differentiator", ""))[:300],
        "automation_level": automation,
    }


# ---------------------------------------------------------------------------
# MLX classification
# ---------------------------------------------------------------------------

def classify_ai_features(companies: list[CompanyRecord]) -> list[CompanyRecord]:
    """Extract AI features using Qwen3-8B on Metal GPU."""
    try:
        from mlx_lm import load, generate
    except ImportError:
        log.warning("mlx-lm not installed. Skipping MLX classification.")
        return companies

    log.info("Loading Qwen3 8B on Metal GPU...")
    model, tokenizer = load("mlx-community/Qwen3-8B-4bit")
    log.info("Model loaded. Extracting AI features...")

    for i, c in enumerate(companies):
        if not c.page_text or len(c.page_text) < 100:
            log.info(f"  [{i+1}/{len(companies)}] {c.name} — skipped (no text)")
            continue

        prompt = AI_FEATURES_PROMPT.format(
            name=c.name,
            domain=c.canonical_domain,
            text=c.page_text,
        )
        messages = [{"role": "user", "content": prompt}]
        prompt_text = tokenizer.apply_chat_template(messages, add_generation_prompt=True)

        try:
            response = generate(model, tokenizer, prompt=prompt_text, max_tokens=500, verbose=False)
            json_match = re.search(r"\{[\s\S]*\}", response)
            if json_match:
                raw = json.loads(json_match.group())
                c.ai_features = normalise_features(raw)
                f = c.ai_features
                feature_names = [ft["name"] for ft in f.get("features", [])][:4]
                log.info(
                    f"  [{i+1}/{len(companies)}] {c.name} → "
                    f"{len(f.get('features', []))} features | "
                    f"automation={f.get('automation_level')} | "
                    f"{', '.join(feature_names)}"
                )
            else:
                log.warning(f"  [{i+1}/{len(companies)}] {c.name} — no JSON in response")
        except Exception as e:
            log.warning(f"  [{i+1}/{len(companies)}] {c.name} — error: {e}")

    enriched = [c for c in companies if c.ai_features]
    log.info(f"Extracted AI features for {len(enriched)}/{len(companies)} companies")
    return companies


# ---------------------------------------------------------------------------
# Neon update (idempotent — DELETE + INSERT per company)
# ---------------------------------------------------------------------------

def update_neon(companies: list[CompanyRecord]):
    conn = get_neon_conn()
    now = datetime.now(timezone.utc).isoformat()
    companies_updated = 0
    facts_deleted = 0
    facts_inserted = 0

    with conn.cursor() as cur:
        for c in companies:
            f = c.ai_features
            if not f:
                continue

            try:
                # 1. Delete old AI facts (idempotent re-run)
                cur.execute(
                    "DELETE FROM company_facts WHERE company_id = %s AND field = ANY(%s) AND method = 'LLM'",
                    (c.id, list(AI_FACT_FIELDS)),
                )
                facts_deleted += cur.rowcount

                source_url = c.website or f"https://{c.canonical_domain}"

                # 2. Full blob — easy retrieval of everything
                cur.execute(
                    """
                    INSERT INTO company_facts
                        (company_id, field, value_text, confidence,
                         source_type, source_url, observed_at, method)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (c.id, "ai_features", json.dumps(f), 0.85,
                     "BRAVE_SEARCH", source_url, now, "LLM"),
                )
                facts_inserted += 1

                # 3. One row per feature — SQL-filterable by feature name/category
                for feat in f.get("features", []):
                    cur.execute(
                        """
                        INSERT INTO company_facts
                            (company_id, field, value_text, confidence,
                             source_type, source_url, observed_at, method)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (c.id, "feature", json.dumps(feat), 0.85,
                         "BRAVE_SEARCH", source_url, now, "LLM"),
                    )
                    facts_inserted += 1

                # 4. Scalar fields
                for field_name, value in [
                    ("core_differentiator", f.get("core_differentiator", "")),
                    ("automation_level", f.get("automation_level", "")),
                ]:
                    if value:
                        cur.execute(
                            """
                            INSERT INTO company_facts
                                (company_id, field, value_text, confidence,
                                 source_type, source_url, observed_at, method)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (c.id, field_name, value, 0.85,
                             "BRAVE_SEARCH", source_url, now, "LLM"),
                        )
                        facts_inserted += 1

                # 5. Merge feature: tags into companies.tags
                feature_tags = list(dict.fromkeys(
                    f"feature:{feat['name'].lower().replace(' ', '-')}"
                    for feat in f.get("features", [])
                ))
                realtime_features = [ft for ft in f.get("features", []) if ft.get("is_realtime")]
                if realtime_features:
                    feature_tags.append("feature:realtime")
                merged = list(dict.fromkeys(c.existing_tags + feature_tags))

                cur.execute(
                    "UPDATE companies SET tags = %s, updated_at = %s WHERE id = %s",
                    (json.dumps(merged), now, c.id),
                )
                companies_updated += 1
                conn.commit()

            except Exception as ex:
                log.warning(f"Neon update error for {c.name}: {ex}")
                conn.rollback()
                continue

    conn.close()
    log.info(
        f"Neon: {companies_updated} companies updated, "
        f"{facts_inserted} facts inserted ({facts_deleted} old facts replaced)"
    )


# ---------------------------------------------------------------------------
# Save to file
# ---------------------------------------------------------------------------

def save_to_file(companies: list[CompanyRecord]):
    """Save all extracted features to consultancies/data/ai-features.json."""
    out = Path(__file__).parent / "data" / "ai-features.json"
    out.parent.mkdir(parents=True, exist_ok=True)

    records = []
    for c in companies:
        if not c.ai_features:
            continue
        records.append({
            "id": c.id,
            "key": c.key,
            "name": c.name,
            "domain": c.canonical_domain,
            "website": c.website,
            "core_differentiator": c.ai_features.get("core_differentiator", ""),
            "automation_level": c.ai_features.get("automation_level", ""),
            "features": c.ai_features.get("features", []),
        })

    with open(out, "w") as fh:
        json.dump(records, fh, indent=2)
    log.info(f"Saved {len(records)} records to {out}")


# ---------------------------------------------------------------------------
# Print summary
# ---------------------------------------------------------------------------

def print_summary(companies: list[CompanyRecord]):
    enriched = [c for c in companies if c.ai_features]
    print(f"\n{'='*70}")
    print(f"  Product Feature Extraction: {len(enriched)}/{len(companies)} classified")
    print(f"{'='*70}\n")

    for i, c in enumerate(enriched, 1):
        f = c.ai_features
        features = f.get("features", [])
        print(f"  {i:3d}. {c.name} ({c.canonical_domain})")
        print(f"       Automation: {f.get('automation_level')} | {len(features)} features")
        if f.get("core_differentiator"):
            print(f"       Differentiator: {f['core_differentiator']}")
        for feat in features:
            realtime_tag = " [realtime]" if feat.get("is_realtime") else ""
            print(f"       • [{feat.get('category','?')}] {feat['name']}{realtime_tag}")
            if feat.get("ai_implementation"):
                print(f"         → {feat['ai_implementation'][:120]}")
        print()

    # Aggregate stats
    if enriched:
        print(f"{'─'*70}")
        all_features = [
            ft for c in enriched for ft in c.ai_features.get("features", [])
        ]
        feature_name_counts = Counter(ft["name"] for ft in all_features)
        category_counts = Counter(ft.get("category", "?") for ft in all_features)
        automation_counts = Counter(c.ai_features.get("automation_level", "assisted") for c in enriched)
        realtime_count = sum(1 for ft in all_features if ft.get("is_realtime"))

        print(f"  Total features extracted: {len(all_features)} across {len(enriched)} companies")
        print(f"  Avg features/company:     {len(all_features)/len(enriched):.1f}")
        top_features = feature_name_counts.most_common(10)
        if top_features:
            print(f"  Most common features:")
            for name, cnt in top_features:
                print(f"    {cnt:3d}×  {name}")
        print(f"  By category: {dict(category_counts)}")
        print(f"  Automation:  {dict(automation_counts)}")
        print(f"  Realtime features: {realtime_count}")
        print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Deep-extract AI features from enriched lead-gen companies"
    )
    parser.add_argument("--limit", type=int, default=0,
                        help="Max companies to process (0 = all)")
    parser.add_argument("--company-id", type=int, default=0,
                        help="Process a single company by DB id (debug)")
    parser.add_argument("--no-llm", action="store_true",
                        help="Scrape only, skip MLX classification")
    args = parser.parse_args()

    t0 = time.time()

    # Phase 1: Load from Neon
    companies = load_companies(limit=args.limit, company_id=args.company_id)
    if not companies:
        log.info("No companies found.")
        return

    # Phase 2: Async re-scrape (AI-focused pages)
    log.info(f"Phase 2: Scraping {len(companies)} company websites (AI-focused pages)...")
    companies = asyncio.run(scrape_all(companies))

    # Phase 3: MLX AI feature extraction
    if not args.no_llm:
        log.info("Phase 3: MLX AI feature extraction...")
        companies = classify_ai_features(companies)

    # Print summary
    print_summary(companies)

    elapsed = time.time() - t0
    log.info(f"Completed in {elapsed:.0f}s")

    classified = [c for c in companies if c.ai_features]
    if not classified:
        log.info("No AI features extracted.")
        return

    # Phase 4: Save to file
    save_to_file(classified)

    # Phase 5: Update Neon
    update_neon(classified)
    log.info("Done.")


if __name__ == "__main__":
    main()
