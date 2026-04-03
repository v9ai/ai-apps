"""
Extract domains from LanceDB consultancies table → domains.txt for Rust pipeline.

Usage:
    python extract_domains.py                          # default output
    python extract_domains.py -o data/ai-consultancies.txt     # custom output
    python extract_domains.py --min-confidence 0.7     # filter by confidence
"""

import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

DB_PATH = Path("./data/consultancies.lance")
DEFAULT_OUTPUT = Path("./data/ai-consultancies.txt")


def _domains_from_neon(min_confidence: float) -> set[str]:
    """Pull enriched company domains from Neon PostgreSQL."""
    try:
        import psycopg2
    except ImportError:
        return set()

    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        return set()

    domains: set[str] = set()
    try:
        conn = psycopg2.connect(url, sslmode="require")
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT canonical_domain, website, ai_classification_confidence
                FROM companies
                WHERE blocked = false
                  AND category != 'UNKNOWN'
                  AND (canonical_domain IS NOT NULL OR website IS NOT NULL)
                """,
            )
            for canonical_domain, website, confidence in cur.fetchall():
                if min_confidence > 0 and (confidence or 0) < min_confidence:
                    continue
                # Prefer canonical_domain, fall back to parsed website
                if canonical_domain and "." in canonical_domain:
                    domains.add(canonical_domain.lower().replace("www.", ""))
                elif website:
                    parsed = urlparse(website).netloc.lower().replace("www.", "")
                    if parsed and "." in parsed:
                        domains.add(parsed)
        conn.close()
        print(f"Neon: {len(domains)} domains extracted (confidence >= {min_confidence})")
    except Exception as e:
        print(f"Neon query failed ({e}), skipping")

    return domains


def extract_domains(min_confidence: float = 0.0, output: Path = DEFAULT_OUTPUT):
    """Read LanceDB + Neon, extract unique domains, write one per line."""

    domains: set[str] = set()

    # Source 1: Neon (enriched companies)
    neon_domains = _domains_from_neon(min_confidence)
    domains.update(neon_domains)

    # Source 2: LanceDB (discover.py output)
    try:
        import lancedb
        db = lancedb.connect(str(DB_PATH))
        tbl = db.open_table("companies")
        df = tbl.to_pandas()

        lance_count = 0
        for _, row in df.iterrows():
            if min_confidence > 0 and row.get("confidence", 0) < min_confidence:
                continue
            if not row.get("is_ai_consultancy", True):
                continue
            website = row.get("website", "")
            if website:
                domain = urlparse(website).netloc.lower().replace("www.", "")
                if domain and "." in domain:
                    domains.add(domain)
                    lance_count += 1

        print(f"LanceDB: {lance_count} domains extracted (confidence >= {min_confidence})")

    except (ImportError, Exception) as e:
        print(f"LanceDB not available ({e}), trying JSON fallback...")

        # JSON fallback
        json_path = Path("./data/consultancies.json")
        if json_path.exists():
            with open(json_path) as f:
                companies = json.load(f)
            json_count = 0
            for c in companies:
                if min_confidence > 0 and c.get("confidence", 0) < min_confidence:
                    continue
                if not c.get("is_ai_consultancy", True):
                    continue
                website = c.get("website", "")
                if website:
                    domain = urlparse(website).netloc.lower().replace("www.", "")
                    if domain and "." in domain:
                        domains.add(domain)
                        json_count += 1
            print(f"JSON: {json_count} domains extracted")
        elif not neon_domains:
            print("No data source found. Run discover.py or discover_brave.py first.")
            return

    # Filter out aggregator/directory domains
    skip_domains = {
        "clutch.co", "goodfirms.co", "wellfound.com", "itfirms.co",
        "linkedin.com", "twitter.com", "facebook.com", "youtube.com",
        "wikipedia.org", "crunchbase.com", "glassdoor.com", "indeed.com",
        "g2.com", "github.com", "medium.com", "substack.com",
    }

    # Load user blocklist
    blocklist_path = Path("./data/blocklist.txt")
    if blocklist_path.exists():
        for line in blocklist_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                skip_domains.add(line.lower())

    domains = {d for d in domains if not any(s in d for s in skip_domains)}

    # Sort and write
    sorted_domains = sorted(domains)
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w") as f:
        for d in sorted_domains:
            f.write(d + "\n")

    print(f"Wrote {len(sorted_domains)} domains to {output}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract domains for Rust pipeline")
    parser.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--min-confidence", type=float, default=0.0)
    args = parser.parse_args()
    extract_domains(min_confidence=args.min_confidence, output=args.output)
