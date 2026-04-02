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

# ---------------------------------------------------------------------------
# Enum sets for normalisation (constrained output → reliable SQL filtering)
# ---------------------------------------------------------------------------

VALID_AUTOMATION = {"assisted", "semi-auto", "autonomous", "agentic"}
VALID_MATURITY = {"wrapper", "enhanced", "custom", "cutting-edge"}
VALID_ARCHITECTURE = {
    "RAG", "agentic-workflows", "fine-tuned", "embeddings",
    "multi-modal", "voice-AI", "multi-agent",
}
VALID_CAPABILITIES = {
    "lead-scoring", "email-personalization", "conversation-intelligence",
    "intent-detection", "meeting-summary", "pipeline-forecasting",
    "lookalike-search", "signal-detection", "auto-research",
    "objection-handling", "voice-outreach", "chat-outreach",
    "sequence-automation", "data-enrichment",
}

# Fields written to company_facts (used for idempotent DELETE on re-runs)
AI_FACT_FIELDS = {
    "ai_features", "ai_models", "llm_providers", "ai_architecture",
    "ai_sales_capabilities", "automation_level", "ai_maturity",
    "ai_differentiator", "is_proprietary_model", "uses_public_llms", "realtime_ai",
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

AI_FEATURES_PROMPT = """You are analyzing an AI-powered sales or lead generation software company.
Respond ONLY with valid JSON. No explanations, no markdown, no text outside the JSON object.

Company: {name}
Domain: {domain}
Website content:
{text}

Extract AI capabilities and return this exact JSON structure:
{{
  "ai_models": [],
  "llm_providers": [],
  "ai_architecture": [],
  "ai_sales_capabilities": [],
  "automation_level": "assisted",
  "is_proprietary_model": false,
  "uses_public_llms": false,
  "realtime_ai": false,
  "ai_maturity": "wrapper",
  "ai_differentiator": ""
}}

Field instructions:
- ai_models: specific model names detected (e.g. "GPT-4o", "Claude 3.5 Sonnet", "Gemini 1.5", "Llama 3", "proprietary")
- llm_providers: API providers used (e.g. "OpenAI", "Anthropic", "Google", "Meta", "Mistral", "Cohere", "Bedrock", "Azure-OpenAI")
- ai_architecture: architectural patterns used — choose from: "RAG", "agentic-workflows", "fine-tuned", "embeddings", "multi-modal", "voice-AI", "multi-agent"
- ai_sales_capabilities: sales automation features — choose from: "lead-scoring", "email-personalization", "conversation-intelligence", "intent-detection", "meeting-summary", "pipeline-forecasting", "lookalike-search", "signal-detection", "auto-research", "objection-handling", "voice-outreach", "chat-outreach", "sequence-automation", "data-enrichment"
- automation_level: "assisted" (human in loop), "semi-auto" (AI drafts, human approves), "autonomous" (AI acts independently), "agentic" (multi-step AI agent)
- is_proprietary_model: true only if they train or fine-tune their own model on proprietary data
- uses_public_llms: true if they use OpenAI, Anthropic, Google, or other public LLM APIs
- realtime_ai: true if AI operates in real-time during live sales calls or live website interactions
- ai_maturity: "wrapper" (thin API wrapper only), "enhanced" (prompt engineering + RAG), "custom" (fine-tuned or custom embeddings), "cutting-edge" (novel AI architecture or research-level)
- ai_differentiator: one sentence max 20 words describing their unique AI advantage; empty string if not clear
/no_think"""


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

def normalise_ai_features(raw: dict) -> dict:
    """Clamp enum values to known sets; coerce types; strip unknowns."""
    return {
        "ai_models": [str(x) for x in raw.get("ai_models", []) if x][:10],
        "llm_providers": [str(x) for x in raw.get("llm_providers", []) if x][:10],
        "ai_architecture": [x for x in raw.get("ai_architecture", []) if x in VALID_ARCHITECTURE],
        "ai_sales_capabilities": [x for x in raw.get("ai_sales_capabilities", []) if x in VALID_CAPABILITIES],
        "automation_level": (
            raw.get("automation_level", "assisted")
            if raw.get("automation_level") in VALID_AUTOMATION
            else "assisted"
        ),
        "is_proprietary_model": bool(raw.get("is_proprietary_model", False)),
        "uses_public_llms": bool(raw.get("uses_public_llms", False)),
        "realtime_ai": bool(raw.get("realtime_ai", False)),
        "ai_maturity": (
            raw.get("ai_maturity", "wrapper")
            if raw.get("ai_maturity") in VALID_MATURITY
            else "wrapper"
        ),
        "ai_differentiator": str(raw.get("ai_differentiator", ""))[:200],
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
                c.ai_features = normalise_ai_features(raw)
                f = c.ai_features
                log.info(
                    f"  [{i+1}/{len(companies)}] {c.name} → "
                    f"maturity={f.get('ai_maturity')} | "
                    f"automation={f.get('automation_level')} | "
                    f"caps={len(f.get('ai_sales_capabilities', []))} | "
                    f"providers={','.join(f.get('llm_providers', [])[:3])}"
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
    tags_merged = 0

    with conn.cursor() as cur:
        for c in companies:
            f = c.ai_features
            if not f:
                continue

            try:
                # 1. Delete old AI facts (re-run safety)
                cur.execute(
                    """
                    DELETE FROM company_facts
                    WHERE company_id = %s
                      AND field = ANY(%s)
                      AND method = 'LLM'
                    """,
                    (c.id, list(AI_FACT_FIELDS)),
                )
                facts_deleted += cur.rowcount

                source_url = c.website or f"https://{c.canonical_domain}"

                # 2. Aggregate row — full JSON blob for easy retrieval
                cur.execute(
                    """
                    INSERT INTO company_facts
                        (company_id, field, value_text, confidence,
                         source_type, source_url, observed_at, method)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (c.id, "ai_features", json.dumps(f), 0.8,
                     "BRAVE_SEARCH", source_url, now, "LLM"),
                )
                facts_inserted += 1

                # 3. Individual rows per list item (SQL-filterable)
                list_fields = [
                    ("ai_models", f.get("ai_models", [])),
                    ("llm_providers", f.get("llm_providers", [])),
                    ("ai_architecture", f.get("ai_architecture", [])),
                    ("ai_sales_capabilities", f.get("ai_sales_capabilities", [])),
                ]
                for field_name, values in list_fields:
                    for v in values:
                        if not v:
                            continue
                        cur.execute(
                            """
                            INSERT INTO company_facts
                                (company_id, field, value_text, confidence,
                                 source_type, source_url, observed_at, method)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            """,
                            (c.id, field_name, str(v), 0.8,
                             "BRAVE_SEARCH", source_url, now, "LLM"),
                        )
                        facts_inserted += 1

                # Scalar fields
                scalar_fields = [
                    ("automation_level", f.get("automation_level", "")),
                    ("ai_maturity", f.get("ai_maturity", "")),
                    ("ai_differentiator", f.get("ai_differentiator", "")),
                    ("is_proprietary_model", str(f.get("is_proprietary_model", False)).lower()),
                    ("uses_public_llms", str(f.get("uses_public_llms", False)).lower()),
                    ("realtime_ai", str(f.get("realtime_ai", False)).lower()),
                ]
                for field_name, value in scalar_fields:
                    if not value or value in ("", "false"):
                        continue
                    cur.execute(
                        """
                        INSERT INTO company_facts
                            (company_id, field, value_text, confidence,
                             source_type, source_url, observed_at, method)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        """,
                        (c.id, field_name, value, 0.8,
                         "BRAVE_SEARCH", source_url, now, "LLM"),
                    )
                    facts_inserted += 1

                # 4. Merge ai: tags into companies.tags
                new_ai_tags = (
                    [f"ai:{p}" for p in f.get("llm_providers", [])]
                    + [f"ai:{a}" for a in f.get("ai_architecture", [])]
                    + ([f"ai:proprietary"] if f.get("is_proprietary_model") else [])
                    + ([f"ai:realtime"] if f.get("realtime_ai") else [])
                )
                # Only tag enhanced/custom/cutting-edge maturity (not "wrapper" — too noisy)
                maturity = f.get("ai_maturity", "wrapper")
                if maturity and maturity != "wrapper":
                    new_ai_tags.append(f"ai:maturity:{maturity}")

                new_ai_tags = [t for t in new_ai_tags if t]
                merged = list(dict.fromkeys(c.existing_tags + new_ai_tags))

                cur.execute(
                    "UPDATE companies SET tags = %s, updated_at = %s WHERE id = %s",
                    (json.dumps(merged), now, c.id),
                )
                tags_merged += 1
                companies_updated += 1

                conn.commit()

            except Exception as ex:
                log.warning(f"Neon update error for {c.name}: {ex}")
                conn.rollback()
                continue

    conn.close()
    log.info(
        f"Neon: {companies_updated} companies updated, "
        f"{facts_inserted} facts inserted "
        f"({facts_deleted} old facts replaced), "
        f"{tags_merged} tags merged"
    )


# ---------------------------------------------------------------------------
# Save to file
# ---------------------------------------------------------------------------

def save_to_file(companies: list[CompanyRecord]):
    """Save all extracted AI features to consultancies/data/ai-features.json."""
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
            **c.ai_features,
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
    print(f"  AI Features Extraction: {len(enriched)}/{len(companies)} classified")
    print(f"{'='*70}\n")

    for i, c in enumerate(enriched, 1):
        f = c.ai_features
        print(f"  {i:3d}. {c.name} ({c.canonical_domain})")
        print(f"       Maturity: {f.get('ai_maturity')} | Automation: {f.get('automation_level')} | Realtime: {'yes' if f.get('realtime_ai') else 'no'}")
        if f.get("llm_providers"):
            print(f"       LLM Providers: {', '.join(f['llm_providers'])}")
        if f.get("ai_models"):
            print(f"       Models: {', '.join(f['ai_models'][:5])}")
        if f.get("ai_architecture"):
            print(f"       Architecture: {', '.join(f['ai_architecture'])}")
        caps = f.get("ai_sales_capabilities", [])
        if caps:
            print(f"       Sales Caps ({len(caps)}): {', '.join(caps[:7])}")
        if f.get("ai_differentiator"):
            print(f"       Differentiator: {f['ai_differentiator']}")
        print()

    # Aggregate stats
    if enriched:
        print(f"{'─'*70}")
        provider_counts = Counter(
            p for c in enriched for p in c.ai_features.get("llm_providers", [])
        )
        arch_counts = Counter(
            a for c in enriched for a in c.ai_features.get("ai_architecture", [])
        )
        maturity_counts = Counter(c.ai_features.get("ai_maturity", "wrapper") for c in enriched)
        automation_counts = Counter(c.ai_features.get("automation_level", "assisted") for c in enriched)

        if provider_counts:
            top = ", ".join(f"{p} ({n})" for p, n in provider_counts.most_common(5))
            print(f"  Top LLM Providers:  {top}")
        if arch_counts:
            top = ", ".join(f"{a} ({n})" for a, n in arch_counts.most_common(5))
            print(f"  Top Architectures:  {top}")
        print(f"  Maturity:           {dict(maturity_counts)}")
        print(f"  Automation levels:  {dict(automation_counts)}")
        realtime = sum(1 for c in enriched if c.ai_features.get("realtime_ai"))
        proprietary = sum(1 for c in enriched if c.ai_features.get("is_proprietary_model"))
        print(f"  Realtime AI: {realtime}  |  Proprietary model: {proprietary}")
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
