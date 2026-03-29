"""
Extract domains from LanceDB consultancies table → domains.txt for Rust pipeline.

Usage:
    python extract_domains.py                          # default output
    python extract_domains.py -o data/ai-consultancies.txt     # custom output
    python extract_domains.py --min-confidence 0.7     # filter by confidence
"""

import argparse
import json
from pathlib import Path
from urllib.parse import urlparse


DB_PATH = Path("./data/consultancies.lance")
DEFAULT_OUTPUT = Path("./data/ai-consultancies.txt")


def extract_domains(min_confidence: float = 0.0, output: Path = DEFAULT_OUTPUT):
    """Read LanceDB, extract unique domains, write one per line."""

    domains = set()

    # Try LanceDB first
    try:
        import lancedb
        db = lancedb.connect(str(DB_PATH))
        tbl = db.open_table("companies")
        df = tbl.to_pandas()

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

        print(f"LanceDB: {len(domains)} domains extracted (confidence >= {min_confidence})")

    except (ImportError, Exception) as e:
        print(f"LanceDB not available ({e}), trying JSON fallback...")

        # JSON fallback
        json_path = Path("./data/consultancies.json")
        if json_path.exists():
            with open(json_path) as f:
                companies = json.load(f)
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
            print(f"JSON: {len(domains)} domains extracted")
        else:
            print("No data source found. Run discover.py first.")
            return

    # Filter out aggregator/directory domains
    skip_domains = {
        "clutch.co", "goodfirms.co", "wellfound.com", "itfirms.co",
        "linkedin.com", "twitter.com", "facebook.com", "youtube.com",
        "wikipedia.org", "crunchbase.com", "glassdoor.com", "indeed.com",
        "g2.com", "github.com", "medium.com", "substack.com",
    }
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
