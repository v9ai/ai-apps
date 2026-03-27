"""Combine article + Q&A + scraped JSONL into train/valid/test splits.

Articles are 2x weighted (duplicated) since they're the primary target task.
Shuffled with a fixed seed for reproducibility. 90/10 train/valid split,
with a held-out test set of 20 examples (10 articles, 10 Q&A).

Usage:
    python scripts/build_splits.py            # writes data/{train,valid,test}.jsonl
    python scripts/build_splits.py --dry-run   # prints stats only
"""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path

SEED = 42
TEST_ARTICLES = 10
TEST_QA = 10
VALID_FRACTION = 0.10
ARTICLE_WEIGHT = 2  # duplicate articles N times

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

SOURCES = {
    "articles": DATA_DIR / "train-articles.jsonl",
    "qa": DATA_DIR / "train-qa.jsonl",
    "scraped": DATA_DIR / "train-scraped.jsonl",  # optional, may not exist yet
}


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    examples = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                examples.append(json.loads(line))
    return examples


def write_jsonl(path: Path, examples: list[dict]) -> None:
    with open(path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    rng = random.Random(SEED)

    articles = load_jsonl(SOURCES["articles"])
    qa = load_jsonl(SOURCES["qa"])
    scraped = load_jsonl(SOURCES["scraped"])

    print(f"Loaded: {len(articles)} articles, {len(qa)} Q&A, {len(scraped)} scraped")

    if not articles and not qa:
        print("No training data found. Run build_training_data.py and build_qa_training_data.py first.")
        sys.exit(1)

    # Shuffle each source independently before splitting
    rng.shuffle(articles)
    rng.shuffle(qa)

    # Hold out test set
    test_articles = articles[:TEST_ARTICLES]
    test_qa = qa[:TEST_QA]
    test = test_articles + test_qa

    remaining_articles = articles[TEST_ARTICLES:]
    remaining_qa = qa[TEST_QA:]

    # Apply article weighting (duplicate to emphasize article generation)
    weighted_articles = remaining_articles * ARTICLE_WEIGHT

    # Combine all remaining into trainable pool
    pool = weighted_articles + remaining_qa + scraped
    rng.shuffle(pool)

    # Split into train/valid
    n_valid = max(1, int(len(pool) * VALID_FRACTION))
    valid = pool[:n_valid]
    train = pool[n_valid:]

    print(f"\nSplit results:")
    print(f"  Train: {len(train)}")
    print(f"  Valid: {len(valid)}")
    print(f"  Test:  {len(test)} ({len(test_articles)} articles + {len(test_qa)} Q&A)")
    print(f"  Total: {len(train) + len(valid) + len(test)}")
    print(f"  (articles {ARTICLE_WEIGHT}x weighted in train/valid)")

    if dry_run:
        print("\n[dry-run] No files written.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    write_jsonl(DATA_DIR / "train.jsonl", train)
    write_jsonl(DATA_DIR / "valid.jsonl", valid)
    write_jsonl(DATA_DIR / "test.jsonl", test)

    print(f"\nWrote splits to {DATA_DIR}/{{train,valid,test}}.jsonl")


if __name__ == "__main__":
    main()
