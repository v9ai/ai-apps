"""Export intent signal training data from Neon PostgreSQL as JSONL for MLX LoRA fine-tuning.

Sources:
  - company_snapshots.text_sample
  - linkedin_posts.content
  - company_facts.value_text (field IN description/services)

Usage:
  python3 mlx-training/export_intent_signals.py --task all
  python3 mlx-training/export_intent_signals.py --task snapshots
  python3 mlx-training/export_intent_signals.py --task posts
  python3 mlx-training/export_intent_signals.py --task facts
  python3 mlx-training/export_intent_signals.py --task all --stats  # counts only
  python3 mlx-training/export_intent_signals.py --task all --deepseek  # DeepSeek labels
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
from pathlib import Path

import psycopg2

# ── Constants ────────────────────────────────────────────────────────────────

INTENT_SIGNAL_SYSTEM = (
    "You detect buying/hiring intent signals in B2B company content.\n"
    "Analyze the text and identify all relevant signals.\n"
    'Return JSON: {"signals": [{"signal_type": "...", "confidence": 0.0-1.0, "evidence": ["..."], "decay_days": N}]}\n\n'
    "Signal types:\n"
    "- hiring_intent (decay: 30 days): Company is actively hiring or growing team\n"
    "- tech_adoption (decay: 60 days): Adopting new technology, migrating infrastructure\n"
    "- growth_signal (decay: 45 days): Funding, revenue growth, expansion, M&A\n"
    "- budget_cycle (decay: 90 days): Budget planning, vendor evaluation, procurement\n"
    "- leadership_change (decay: 60 days): New executive hires, promotions\n"
    "- product_launch (decay: 30 days): New product/feature announcements\n\n"
    'If no signals detected, return: {"signals": []}\n'
    "CRITICAL: Respond with ONLY a valid JSON object, no markdown."
)

SIGNAL_TYPES = [
    "hiring_intent",
    "tech_adoption",
    "growth_signal",
    "budget_cycle",
    "leadership_change",
    "product_launch",
]

DEFAULT_DECAY_DAYS = {
    "hiring_intent": 30,
    "tech_adoption": 60,
    "growth_signal": 45,
    "budget_cycle": 90,
    "leadership_change": 60,
    "product_launch": 30,
}

# ── Keyword lists per signal type ─────────────────────────────────────────────

HIRING_KW = [
    "we're hiring", "we are hiring", "hiring for", "looking for",
    "open role", "open position", "join our team", "join us",
    "now hiring", "apply now", "expanding team", "new hires",
    "headcount", "growing our team", "building our team",
]

TECH_KW = [
    "migrating to", "adopting", "deployed", "switched to",
    "new stack", "infrastructure upgrade", "implementing",
    "rolling out", "upgrading to", "moving to",
]

GROWTH_KW = [
    "raised", "series a", "series b", "series c", "funding",
    "revenue growth", "ipo", "acquisition", "acquired",
    "new office", "expanding to", "growth stage",
]

BUDGET_KW = [
    "q1 planning", "annual budget", "rfp", "vendor evaluation",
    "procurement", "new fiscal year", "budget approved",
    "evaluating solutions",
]

LEADERSHIP_KW = [
    "new cto", "new vp", "appointed", "joined as",
    "promoted to", "new head of", "welcome our new",
    "announcing our new",
]

PRODUCT_KW = [
    "launching", "introducing", "announcing", "new product",
    "new feature", "beta release", "ga release", "just shipped",
    "now available", "public preview",
]

KEYWORD_MAP = {
    "hiring_intent": HIRING_KW,
    "tech_adoption": TECH_KW,
    "growth_signal": GROWTH_KW,
    "budget_cycle": BUDGET_KW,
    "leadership_change": LEADERSHIP_KW,
    "product_launch": PRODUCT_KW,
}

# ── HTML stripping ───────────────────────────────────────────────────────────

_TAG_RE = re.compile(r"<[^>]+>")
_ENTITY_RE = re.compile(r"&(?:#\d+|#x[\da-fA-F]+|\w+);")
_WS_RE = re.compile(r"\s+")


def strip_html(text: str | None) -> str:
    if not text:
        return ""
    text = _TAG_RE.sub(" ", text)
    text = _ENTITY_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text)
    return text.strip()


# ── DB connection ────────────────────────────────────────────────────────────


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


# ── Bootstrap labeling ───────────────────────────────────────────────────────


def bootstrap_label(text: str) -> dict:
    """Generate intent signal labels from keyword matching.

    Counts keyword hits per signal type. A signal is positive if >= 2 hits.
    Returns a dict matching the assistant JSON output format.
    """
    lower = text.lower()
    signals = []

    for signal_type, keywords in KEYWORD_MAP.items():
        hits = sum(1 for kw in keywords if kw in lower)
        if hits >= 2:
            evidence = [kw for kw in keywords if kw in lower]
            signals.append({
                "signal_type": signal_type,
                "confidence": min(hits / len(keywords) * 2, 1.0),
                "evidence": evidence[:3],  # cap at 3 pieces of evidence
                "decay_days": DEFAULT_DECAY_DAYS[signal_type],
            })

    return {"signals": signals}


# ── Export: Company Snapshots ─────────────────────────────────────────────────


def fetch_snapshots(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute("""
        SELECT cs.id, cs.text_sample, c.name
        FROM company_snapshots cs
        LEFT JOIN companies c ON cs.company_id = c.id
        WHERE cs.text_sample IS NOT NULL
          AND length(cs.text_sample) > 50
        ORDER BY cs.id
    """)
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "text": r[1], "company": r[2], "source_type": "company_snapshot"} for r in rows]


# ── Export: LinkedIn Posts ────────────────────────────────────────────────────


def fetch_posts(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute("""
        SELECT lp.id, lp.content, c.name
        FROM linkedin_posts lp
        LEFT JOIN companies c ON lp.company_id = c.id
        WHERE lp.content IS NOT NULL
          AND length(lp.content) > 50
        ORDER BY lp.id
    """)
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "text": r[1], "company": r[2], "source_type": "linkedin_post"} for r in rows]


# ── Export: Company Facts ─────────────────────────────────────────────────────


def fetch_facts(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute("""
        SELECT cf.id, cf.value_text, c.name
        FROM company_facts cf
        LEFT JOIN companies c ON cf.company_id = c.id
        WHERE cf.field IN ('description', 'services')
          AND cf.value_text IS NOT NULL
          AND length(cf.value_text) > 50
        ORDER BY cf.id
    """)
    rows = cur.fetchall()
    cur.close()
    return [{"id": r[0], "text": r[1], "company": r[2], "source_type": "company_fact"} for r in rows]


# ── Format and export ─────────────────────────────────────────────────────────


def format_example(item: dict, label: dict) -> dict:
    """Format a single example as chat JSONL with system/user/assistant messages."""
    text_clean = strip_html(item["text"])[:3000]
    company = item.get("company") or "Unknown"
    source_type = item["source_type"]

    user_msg = (
        f"Detect intent signals in this B2B content.\n\n"
        f"Source: {source_type}\n"
        f"Company: {company}\n"
        f"Content: {text_clean}"
    )

    return {
        "messages": [
            {"role": "system", "content": INTENT_SIGNAL_SYSTEM},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": json.dumps(label)},
        ]
    }


def export_data(items: list[dict], out_dir: Path, stats_only: bool = False):
    """Label items and export to train/valid/test JSONL files."""
    if stats_only:
        print(f"  Total items: {len(items)}")
        by_source = {}
        for item in items:
            src = item["source_type"]
            by_source[src] = by_source.get(src, 0) + 1
        for src, count in sorted(by_source.items()):
            print(f"    {src}: {count}")
        # Show bootstrap label distribution
        pos_counts = {s: 0 for s in SIGNAL_TYPES}
        for item in items:
            label = bootstrap_label(item["text"])
            for sig in label["signals"]:
                pos_counts[sig["signal_type"]] += 1
        print("  Bootstrap label distribution (>= 2 keyword hits):")
        for sig_type, count in pos_counts.items():
            print(f"    {sig_type}: {count} positive ({count/max(len(items),1)*100:.1f}%)")
        return

    # Label all items
    examples = []
    for item in items:
        label = bootstrap_label(item["text"])
        example = format_example(item, label)
        examples.append(example)

    if not examples:
        print("  No examples to export.")
        return

    # Stratified 80/10/10 split
    # Separate positives (has at least one signal) from negatives (no signals)
    random.seed(42)
    positives = [ex for ex in examples if json.loads(ex["messages"][-1]["content"])["signals"]]
    negatives = [ex for ex in examples if not json.loads(ex["messages"][-1]["content"])["signals"]]
    random.shuffle(positives)
    random.shuffle(negatives)

    def split_three(data: list) -> tuple[list, list, list]:
        n = len(data)
        train_end = int(n * 0.8)
        valid_end = int(n * 0.9)
        return data[:train_end], data[train_end:valid_end], data[valid_end:]

    pos_train, pos_valid, pos_test = split_three(positives)
    neg_train, neg_valid, neg_test = split_three(negatives)

    train = pos_train + neg_train
    valid = pos_valid + neg_valid
    test = pos_test + neg_test
    random.shuffle(train)
    random.shuffle(valid)
    random.shuffle(test)

    out_dir.mkdir(parents=True, exist_ok=True)
    for name, subset in [("train", train), ("valid", valid), ("test", test)]:
        path = out_dir / f"{name}.jsonl"
        with open(path, "w") as f:
            for ex in subset:
                f.write(json.dumps(ex) + "\n")
        print(f"  {name}: {len(subset)} examples -> {path}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Export intent signal training data for MLX LoRA fine-tuning")
    parser.add_argument("--task", choices=["snapshots", "posts", "facts", "all"], default="all")
    parser.add_argument("--stats", action="store_true", help="Print counts only, don't export")
    parser.add_argument("--out-dir", type=Path, default=Path("mlx-training/data/intent-signal"))
    parser.add_argument("--deepseek", action="store_true",
                        help="Use DeepSeek API for high-quality labels")
    args = parser.parse_args()

    if args.deepseek:
        # TODO: Implement DeepSeek labeling for intent signals.
        # Follow the pattern in export_post_labels.py: call DeepSeek API with
        # INTENT_SIGNAL_SYSTEM as system prompt, parse JSON response, validate
        # signal types against SIGNAL_TYPES, and fall back to bootstrap_label
        # on API errors.
        print("ERROR: --deepseek mode not yet implemented. Use bootstrap labels for now.", file=sys.stderr)
        sys.exit(1)

    conn = get_conn()
    try:
        items: list[dict] = []

        if args.task in ("snapshots", "all"):
            print("Company Snapshots:")
            snapshots = fetch_snapshots(conn)
            print(f"  Fetched {len(snapshots)} snapshots")
            items.extend(snapshots)

        if args.task in ("posts", "all"):
            print("LinkedIn Posts:")
            posts = fetch_posts(conn)
            print(f"  Fetched {len(posts)} posts")
            items.extend(posts)

        if args.task in ("facts", "all"):
            print("Company Facts:")
            facts = fetch_facts(conn)
            print(f"  Fetched {len(facts)} facts")
            items.extend(facts)

        if not items:
            print("No data found. Check your database tables.", file=sys.stderr)
            sys.exit(1)

        print(f"\nTotal items across sources: {len(items)}")
        export_data(items, args.out_dir, args.stats)

    finally:
        conn.close()

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/")


if __name__ == "__main__":
    main()
