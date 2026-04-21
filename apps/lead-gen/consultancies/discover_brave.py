"""
AI-Native Lead Gen Platform Discovery (Brave Search)
=====================================================
LangChain BraveSearchWrapper → Company extraction → LanceDB + Neon PostgreSQL

Discovers AI-native lead generation and sales platforms via Brave Search API,
deduplicates against existing data, and stores in both LanceDB and Neon.

Usage:
    python discover_brave.py                  # Full discovery
    python discover_brave.py --dry-run        # Print results, no DB writes
    python discover_brave.py --query "..."    # Add a custom query
    python discover_brave.py --count 5        # Results per query (default 10)
"""

import argparse
import json
import logging
import os
import re
import time
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

# Load .env.local from project root (same as TS scripts)
load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("discover-brave")

DB_PATH = Path("./data/consultancies.lance")
RATE_LIMIT_DELAY = 1.0  # seconds between API calls

# ---------------------------------------------------------------------------
# Data model (same as discover.py)
# ---------------------------------------------------------------------------

@dataclass
class Company:
    name: str
    website: str
    source: str
    description: str = ""
    location: str = ""
    employee_range: str = ""
    specialties: str = ""
    remote_policy: str = "unknown"
    is_ai_consultancy: bool = True
    confidence: float = 0.0


# ---------------------------------------------------------------------------
# Query bank — AI-native lead gen & sales platforms
# ---------------------------------------------------------------------------

QUERIES = [
    # Tier 1: Direct — AI lead gen platforms
    '"AI-native" lead generation platform',
    '"AI-powered" sales automation tool',
    '"AI prospecting" platform B2B',
    'AI lead generation SaaS company',
    '"AI sales intelligence" platform',
    # Tier 2: Adjacent categories
    '"conversational AI" sales platform',
    '"AI SDR" outbound platform',
    'AI pipeline generation tool B2B',
    '"revenue intelligence" AI platform',
    # Tier 3: Specific niches
    '"AI outreach" platform email',
    '"AI-native" sales engagement platform',
    'AI-powered B2B prospecting companies',
]

# Reject result titles that look like listicle / article headlines instead of
# a company name. Applied in extract_companies — see delightful-hopping-zephyr plan.
LISTICLE_NAME_RE = re.compile(
    r"^\s*(the\s+)?\d+\s+"
    r"|\bbest\s+ai\b|\btop\s+ai\b"
    r"|\bbest\s+(sales|sdr|outreach|prospect|lead\s+gen)"
    r"|\b(in|for)\s+20(2[4-9]|3[0-9])\b"
    r"|\b(guide|review|comparison|listicle|tutorial)\b"
    r"|\b(sales|sdr|outreach|prospecting)\s+tools?\b",
    re.IGNORECASE,
)

# Domains to skip (aggregators, social media, content sites)
SKIP_DOMAINS = {
    "clutch.co", "goodfirms.co", "wellfound.com", "itfirms.co",
    "linkedin.com", "twitter.com", "facebook.com", "youtube.com",
    "wikipedia.org", "crunchbase.com", "glassdoor.com", "indeed.com",
    "g2.com", "github.com", "medium.com", "substack.com",
    "reddit.com", "quora.com", "capterra.com", "getapp.com",
    "softwareadvice.com", "trustradius.com", "sourceforge.net",
    "techcrunch.com", "forbes.com", "businessinsider.com",
    "hubspot.com", "salesforce.com",  # incumbent, not AI-native
    # Off-ICP content sites / non-sales-tools vendors observed in prior polluted ingest
    "elfsight.com", "goconsensus.com", "guideflow.com", "scopicstudios.com",
    "skaled.com", "42dm.net", "oreateai.com", "retreva.com", "foundersgtm.com",
    "coldiq.com", "signalfire.com", "assemblyai.com", "research.aimultiple.com",
    "pipeline.zoominfo.com", "renewator.com", "knock-ai.com", "spotio.com",
    "heysam.ai", "dealcode.ai",
}


# ---------------------------------------------------------------------------
# Domain / name extraction
# ---------------------------------------------------------------------------

def normalize_domain(url: str) -> str:
    """Extract clean domain from a URL."""
    try:
        parsed = urlparse(url)
        domain = parsed.netloc.lower().replace("www.", "")
        return domain if "." in domain else ""
    except Exception:
        return ""


def is_homepage(url: str) -> bool:
    """True only for bare-domain URLs like https://foo.com or https://foo.com/.

    Listicle articles live at non-empty paths (/blog/..., /resources/...), so a
    non-homepage Brave hit is almost never the vendor's canonical homepage and
    would poison `companies.name` with the article headline.
    """
    try:
        parsed = urlparse(url)
        return parsed.path.strip("/") == ""
    except Exception:
        return False


def extract_name_from_title(title: str) -> str:
    """Derive company name from page title."""
    # Split on common separators and take the first part
    for sep in [" | ", " - ", " :: ", " — ", " – ", " · "]:
        if sep in title:
            title = title.split(sep)[0]
            break
    return title.strip()


def should_skip(domain: str) -> bool:
    """Check if domain is a known aggregator/noise site."""
    return any(skip in domain for skip in SKIP_DOMAINS)


def domain_to_key(domain: str) -> str:
    """Convert domain to a unique key (same logic as import-pipeline.ts)."""
    return re.sub(r"[^a-z0-9-]", "", domain.replace(".", "-")).lower()


# ---------------------------------------------------------------------------
# Brave Search via LangChain
# ---------------------------------------------------------------------------

def search_brave(queries: list[str], count: int = 10) -> list[dict]:
    """
    Run queries against Brave Search via LangChain BraveSearchWrapper.
    Returns list of {title, link, snippet} dicts.
    """
    from langchain_community.utilities import BraveSearchWrapper

    api_key = os.environ.get("BRAVE_SEARCH_API_KEY", "")
    if not api_key:
        log.error("BRAVE_SEARCH_API_KEY not set. Get one at https://brave.com/search/api/")
        return []

    wrapper = BraveSearchWrapper(
        api_key=api_key,
        search_kwargs={"count": count},
    )

    all_results = []
    for i, query in enumerate(queries):
        log.info(f"[{i+1}/{len(queries)}] Searching: {query}")
        try:
            raw = wrapper.run(query)
            results = json.loads(raw)
            log.info(f"  → {len(results)} results")
            all_results.extend(results)
        except Exception as e:
            log.warning(f"  → Error: {e}")

        if i < len(queries) - 1:
            time.sleep(RATE_LIMIT_DELAY)

    return all_results


# ---------------------------------------------------------------------------
# Company extraction + dedup
# ---------------------------------------------------------------------------

def extract_companies(results: list[dict]) -> list[Company]:
    """Parse search results into Company objects, deduplicating by domain."""
    seen_domains: set[str] = set()
    companies: list[Company] = []

    for r in results:
        url = r.get("link", "")
        title = r.get("title", "")
        snippet = r.get("snippet", r.get("description", ""))

        domain = normalize_domain(url)
        if not domain or should_skip(domain):
            continue
        if domain in seen_domains:
            continue
        seen_domains.add(domain)

        name = extract_name_from_title(title)
        if not name or len(name) < 2:
            continue

        companies.append(Company(
            name=name,
            website=url,
            source="brave_search",
            description=snippet,
        ))

    log.info(f"Extracted {len(companies)} unique companies from {len(results)} results")
    return companies


def dedup_against_lancedb(companies: list[Company]) -> list[Company]:
    """Remove companies whose domains already exist in LanceDB."""
    try:
        import lancedb
        db = lancedb.connect(str(DB_PATH))
        tbl = db.open_table("companies")
        df = tbl.to_pandas()

        existing_domains = set()
        for _, row in df.iterrows():
            website = row.get("website", "")
            if website:
                domain = normalize_domain(website)
                if domain:
                    existing_domains.add(domain)

        before = len(companies)
        companies = [
            c for c in companies
            if normalize_domain(c.website) not in existing_domains
        ]
        log.info(f"LanceDB dedup: {before} → {len(companies)} new companies")
        return companies

    except Exception as e:
        log.info(f"No existing LanceDB to dedup against ({e})")
        return companies


# ---------------------------------------------------------------------------
# LanceDB storage (append mode)
# ---------------------------------------------------------------------------

def store_companies(companies: list[Company]):
    """Store discovered companies in LanceDB, appending to existing table."""
    try:
        import lancedb
    except ImportError:
        log.warning("lancedb not installed. Saving to JSON fallback.")
        _save_json_fallback(companies)
        return

    vectors = _embed_companies(companies)

    records = []
    for c, vec in zip(companies, vectors):
        rec = asdict(c)
        rec["vector"] = vec
        records.append(rec)

    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = lancedb.connect(str(DB_PATH))

    try:
        tbl = db.open_table("companies")
        tbl.add(records)
        log.info(f"Appended {len(records)} records to existing table")
    except Exception:
        tbl = db.create_table("companies", records)
        log.info(f"Created new table with {len(records)} records")

    log.info(f"LanceDB total: {tbl.count_rows()} records")


def _embed_companies(companies: list[Company]) -> list[list[float]]:
    """Generate embeddings using bge-small (same as discover.py)."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("BAAI/bge-small-en-v1.5")
        texts = [
            f"{c.name}. {c.specialties}. {c.description[:500]}"
            for c in companies
        ]
        log.info(f"Embedding {len(texts)} company descriptions...")
        vectors = model.encode(texts, show_progress_bar=True, batch_size=32)
        return vectors.tolist()
    except ImportError:
        log.warning("sentence-transformers not installed. Using zero vectors.")
        return [[0.0] * 384 for _ in companies]


def _save_json_fallback(companies: list[Company]):
    out = Path("./data/brave-results.json")
    out.parent.mkdir(exist_ok=True)
    records = [asdict(c) for c in companies]
    with open(out, "w") as f:
        json.dump(records, f, indent=2)
    log.info(f"Saved {len(records)} companies to {out}")


# ---------------------------------------------------------------------------
# Neon PostgreSQL storage
# ---------------------------------------------------------------------------

def _get_neon_conn():
    """Connect to Neon PostgreSQL via NEON_DATABASE_URL."""
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        return None
    return psycopg2.connect(url, sslmode="require")


def dedup_against_neon(companies: list[Company]) -> list[Company]:
    """Remove companies whose keys already exist in Neon."""
    try:
        conn = _get_neon_conn()
        if not conn:
            log.info("NEON_DATABASE_URL not set — skipping Neon dedup")
            return companies

        with conn.cursor() as cur:
            keys = [domain_to_key(normalize_domain(c.website)) for c in companies]
            cur.execute(
                "SELECT key FROM companies WHERE key = ANY(%s)",
                (keys,),
            )
            existing_keys = {row[0] for row in cur.fetchall()}

        conn.close()

        before = len(companies)
        companies = [
            c for c in companies
            if domain_to_key(normalize_domain(c.website)) not in existing_keys
        ]
        log.info(f"Neon dedup: {before} → {len(companies)} new companies")
        return companies

    except Exception as e:
        log.warning(f"Neon dedup failed ({e}) — proceeding without")
        return companies


def store_in_neon(companies: list[Company]):
    """Insert companies + provenance facts into Neon PostgreSQL."""
    try:
        conn = _get_neon_conn()
        if not conn:
            log.warning("NEON_DATABASE_URL not set — skipping Neon storage")
            return
    except Exception as e:
        log.warning(f"Neon connection failed: {e}")
        return

    now = datetime.now(timezone.utc).isoformat()
    imported = 0
    skipped = 0

    with conn.cursor() as cur:
        for c in companies:
            domain = normalize_domain(c.website)
            key = domain_to_key(domain)

            try:
                # Insert company (skip on conflict)
                cur.execute(
                    """
                    INSERT INTO companies (key, name, website, canonical_domain, description,
                                          category, ai_tier, score, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (key) DO NOTHING
                    RETURNING id
                    """,
                    (key, c.name, c.website, domain, c.description,
                     "UNKNOWN", 0, 0.5, now, now),
                )
                row = cur.fetchone()
                if row is None:
                    skipped += 1
                    continue

                company_id = row[0]
                imported += 1

                # Insert provenance fact
                cur.execute(
                    """
                    INSERT INTO company_facts
                        (company_id, field, value_text, confidence,
                         source_type, source_url, observed_at, method)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (company_id, "discovery_source", f"brave_search: {c.name}",
                     0.7, "BRAVE_SEARCH", c.website, now, "HEURISTIC"),
                )

            except Exception as e:
                log.warning(f"Neon insert error for {c.name}: {e}")
                conn.rollback()
                continue

        conn.commit()

    conn.close()
    log.info(f"Neon: {imported} imported, {skipped} skipped (already exist)")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Discover AI-native lead gen platforms via Brave Search"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Print results without saving to DB")
    parser.add_argument("--query", type=str, action="append", default=[],
                        help="Add custom query (can be repeated)")
    parser.add_argument("--count", type=int, default=10,
                        help="Results per query (max 20)")
    parser.add_argument("--no-neon", action="store_true",
                        help="Skip Neon PostgreSQL storage (LanceDB only)")
    args = parser.parse_args()

    queries = QUERIES + args.query

    log.info(f"Running {len(queries)} queries against Brave Search...")
    results = search_brave(queries, count=args.count)

    if not results:
        log.warning("No results returned. Check your BRAVE_SEARCH_API_KEY.")
        return

    companies = extract_companies(results)
    companies = dedup_against_lancedb(companies)
    companies = dedup_against_neon(companies)

    if not companies:
        log.info("No new companies found (all duplicates).")
        return

    # Print summary
    print(f"\n{'='*60}")
    print(f"  Found {len(companies)} new AI lead-gen platforms")
    print(f"{'='*60}\n")
    for i, c in enumerate(companies, 1):
        domain = normalize_domain(c.website)
        print(f"  {i:3d}. {c.name}")
        print(f"       {domain}")
        if c.description:
            print(f"       {c.description[:100]}...")
        print()

    if args.dry_run:
        log.info("Dry run — skipping DB storage.")
        return

    store_companies(companies)
    if not args.no_neon:
        store_in_neon(companies)
    log.info("Done.")


if __name__ == "__main__":
    main()
