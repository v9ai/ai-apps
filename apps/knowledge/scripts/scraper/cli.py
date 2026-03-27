"""CLI entry point for the scraping pipeline.

Usage:
    python -m scraper.cli --sources blogs --limit 10
    python -m scraper.cli --sources blogs --limit 20 --dry-run
    python -m scraper.cli --rebuild-splits
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
DATA_DIR = ROOT / "data"
SCRAPED_DIR = DATA_DIR / "scraped"
OUTPUT_PATH = DATA_DIR / "train-scraped.jsonl"

sys.path.insert(0, str(ROOT / "scripts"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Scraping pipeline for training data")
    parser.add_argument("--sources", default="blogs", choices=["blogs"],
                        help="Sources to scrape (default: blogs)")
    parser.add_argument("--limit", type=int, default=10,
                        help="Max articles per source (default: 10)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Scrape and clean but don't write JSONL")
    parser.add_argument("--rebuild-splits", action="store_true",
                        help="After scraping, rebuild train/valid/test splits")
    args = parser.parse_args()

    if args.sources == "blogs":
        from scraper.blog_scraper import scrape_blogs
        from scraper.cleaner import clean_articles
        from scraper.to_jsonl import articles_to_jsonl

        print(f"Scraping blogs (limit {args.limit} per source)...\n")
        raw_articles = asyncio.run(scrape_blogs(limit_per_source=args.limit))
        print(f"Raw articles fetched: {len(raw_articles)}")

        for a in raw_articles[:5]:
            print(f"  - [{a.source}] {a.title} ({a.word_count} words)")
        if len(raw_articles) > 5:
            print(f"  ... and {len(raw_articles) - 5} more")

        cleaned = clean_articles(raw_articles)
        print(f"\nAfter cleaning/filtering: {len(cleaned)} articles")

        if args.dry_run:
            print("\n[dry-run] Would write to", OUTPUT_PATH)
            for c in cleaned[:5]:
                print(f"  - [{c.source}] {c.title} ({c.word_count} words)")
            return

        n_examples = articles_to_jsonl(cleaned, OUTPUT_PATH)
        print(f"\nWrote {n_examples} training examples to {OUTPUT_PATH}")

    if args.rebuild_splits:
        print("\nRebuilding splits...")
        import subprocess
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build_splits.py")], check=True)


if __name__ == "__main__":
    main()
