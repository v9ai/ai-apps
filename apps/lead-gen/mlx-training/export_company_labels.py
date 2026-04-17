"""Export company classification training data as JSONL for MLX LoRA fine-tuning.

Queries the companies table from Neon PostgreSQL. For companies that already
have category/ai_tier labels, uses those directly. For unlabeled companies,
applies keyword bootstrap classification matching the TypeScript
company-classifier.ts logic.

Usage:
  python3 mlx-training/export_company_labels.py                                 # export all
  python3 mlx-training/export_company_labels.py --stats                         # counts only
  python3 mlx-training/export_company_labels.py --out-dir mlx-training/data/company-vertical
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path

# ── Constants ────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You classify B2B companies by vertical and AI tier.\n\n"
    "Verticals:\n"
    "- AI-first product company\n"
    "- AI-native technology company\n"
    "- Non-AI software product company\n"
    "- IT consulting and services company\n"
    "- Staffing and recruitment agency\n"
    "- Marketing or creative agency\n"
    "- Enterprise SaaS platform\n"
    "- Developer tools and infrastructure\n\n"
    "AI tiers:\n"
    "- 0: Company does not use AI as a core product\n"
    "- 1: Company uses AI as a significant product feature\n"
    "- 2: Company is AI-first or AI-native\n\n"
    'Respond with ONLY valid JSON:\n'
    '{"vertical": "...", "aiTier": 0, "confidence": 0.85, "reasons": ["reason1", "reason2"]}'
)

# Map from DB category enum → closest vertical label
CATEGORY_TO_VERTICAL = {
    "CONSULTANCY": "IT consulting and services company",
    "STAFFING": "Staffing and recruitment agency",
    "AGENCY": "Marketing or creative agency",
    "PRODUCT": "Non-AI software product company",  # refined by ai_tier below
    "UNKNOWN": None,  # fall through to bootstrap
}

# ── Keyword dictionaries (matches TypeScript company-classifier.ts) ──────

AI_CORE_TERMS = [
    "artificial intelligence", "machine learning", "deep learning",
    "neural network", "large language model", "llm", "nlp",
    "natural language processing", "computer vision", "generative ai",
    "foundation model", "transformer", "diffusion model", "reinforcement learning",
    "mlops", "ai-first", "ai-native", "ai platform", "ai infrastructure",
]

AI_FEATURE_TERMS = [
    "ai-powered", "ai powered", "ai-driven", "ai driven",
    "machine learning powered", "intelligent automation",
    "predictive analytics", "smart automation", "chatbot",
    "recommendation engine", "ai features", "ai capabilities",
    "ai assistant", "copilot",
]

CONSULTING_TERMS = [
    "consulting", "consultancy", "advisory", "professional services",
    "managed services", "outsourcing", "it services", "digital transformation",
    "systems integrator", "implementation partner",
]

STAFFING_TERMS = [
    "staffing", "recruitment", "recruiting", "talent acquisition",
    "headhunting", "placement", "temp agency", "employment agency",
    "job board", "hiring platform",
]

AGENCY_TERMS = [
    "marketing agency", "creative agency", "design agency", "digital agency",
    "advertising agency", "branding agency", "pr agency", "media agency",
    "content agency", "seo agency",
]

SAAS_TERMS = [
    "saas", "software as a service", "cloud platform", "enterprise software",
    "crm", "erp", "enterprise platform", "business software",
]

DEVTOOLS_TERMS = [
    "developer tools", "devtools", "dev tools", "infrastructure",
    "open source", "api platform", "sdk", "framework", "developer platform",
    "ci/cd", "observability", "monitoring", "orchestration",
]

# ── DB connection ────────────────────────────────────────────────────────────


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    try:
        import psycopg2
        return psycopg2.connect(url)
    except Exception as e:
        print(f"ERROR: Cannot connect to Neon: {e}", file=sys.stderr)
        sys.exit(1)


# ── Keyword counting ─────────────────────────────────────────────────────────


def count_hits(text: str, terms: list[str]) -> int:
    hits = 0
    for term in terms:
        if term in text:
            hits += 1
    return hits


# ── Bootstrap classification (matches TypeScript computeClassification) ───


def bootstrap_classify(name: str, description: str, website: str | None) -> dict:
    """Classify a company using keyword heuristics.

    Mirrors the computeClassification logic from src/ml/company-classifier.ts.
    """
    parts = [name or "", description or ""]
    if website:
        parts.append(website)
    text = " ".join(parts).lower()

    ai_core_hits = count_hits(text, AI_CORE_TERMS)
    ai_feature_hits = count_hits(text, AI_FEATURE_TERMS)
    consulting_hits = count_hits(text, CONSULTING_TERMS)
    staffing_hits = count_hits(text, STAFFING_TERMS)
    agency_hits = count_hits(text, AGENCY_TERMS)
    saas_hits = count_hits(text, SAAS_TERMS)
    devtools_hits = count_hits(text, DEVTOOLS_TERMS)

    reasons: list[str] = []

    # ── AI tier scoring ───────────────────────────────────────────────────
    ai_tier = 0
    if ai_core_hits >= 3:
        ai_tier = 2
        reasons.append(f"Strong AI-core signal ({ai_core_hits} core terms)")
    elif ai_core_hits >= 1:
        ai_tier = 2 if ai_feature_hits >= 1 else 1
        reasons.append(
            f"AI signal: {ai_core_hits} core, {ai_feature_hits} feature terms"
        )
    elif ai_feature_hits >= 2:
        ai_tier = 1
        reasons.append(f"AI-feature signal ({ai_feature_hits} feature terms)")

    # ── Vertical scoring ──────────────────────────────────────────────────
    scores = [
        ("AI-first product company", 0.9 if ai_core_hits >= 3 else (0.5 if ai_core_hits >= 1 else 0)),
        ("AI-native technology company", 0.7 if ai_tier == 2 else 0),
        ("IT consulting and services company", consulting_hits * 0.3),
        ("Staffing and recruitment agency", staffing_hits * 0.35),
        ("Marketing or creative agency", agency_hits * 0.35),
        ("Enterprise SaaS platform", saas_hits * 0.25),
        ("Developer tools and infrastructure", devtools_hits * 0.25),
        ("Non-AI software product company", 0.1),  # default baseline
    ]

    scores.sort(key=lambda x: x[1], reverse=True)
    best_label, best_score = scores[0]
    vertical = best_label if best_score > 0.1 else "Non-AI software product company"
    confidence = min(best_score, 1.0)
    reasons.append(f"Top vertical: {vertical} (score {confidence:.2f})")

    return {
        "vertical": vertical,
        "aiTier": ai_tier,
        "confidence": round(confidence, 2),
        "reasons": reasons,
    }


# ── Label from existing DB fields ────────────────────────────────────────────


def label_from_db(category: str, ai_tier: int, name: str, description: str,
                  website: str | None) -> dict:
    """Build a label from existing DB category + ai_tier fields.

    Uses the DB category to determine the vertical, then refines PRODUCT
    companies based on ai_tier. Generates reasons from the DB-stored labels.
    """
    vertical = CATEGORY_TO_VERTICAL.get(category)

    # For PRODUCT companies, refine vertical based on AI tier
    if category == "PRODUCT":
        if ai_tier == 2:
            vertical = "AI-first product company"
        elif ai_tier == 1:
            vertical = "AI-native technology company"
        else:
            # Run bootstrap to pick between SaaS, DevTools, Non-AI software
            bootstrap = bootstrap_classify(name, description, website)
            if bootstrap["vertical"] in (
                "Enterprise SaaS platform",
                "Developer tools and infrastructure",
            ):
                vertical = bootstrap["vertical"]
            else:
                vertical = "Non-AI software product company"

    # If UNKNOWN or unmapped, fall through to full bootstrap
    if vertical is None:
        return bootstrap_classify(name, description, website)

    reasons = [f"DB category: {category}"]
    if ai_tier > 0:
        tier_label = "AI-first/AI-native" if ai_tier == 2 else "AI as significant feature"
        reasons.append(f"DB ai_tier: {ai_tier} ({tier_label})")

    # Compute confidence from DB labels (labeled data is higher confidence)
    confidence = 0.90 if ai_tier > 0 else 0.85

    return {
        "vertical": vertical,
        "aiTier": ai_tier,
        "confidence": confidence,
        "reasons": reasons,
    }


# ── Fetch companies ──────────────────────────────────────────────────────────


def fetch_companies(conn) -> list[dict]:
    """Fetch companies from Neon PostgreSQL."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id, name, description, website, category, ai_tier
        FROM companies
        WHERE blocked = false
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()
    return [
        {
            "id": r[0],
            "name": r[1],
            "description": r[2],
            "website": r[3],
            "category": r[4],
            "ai_tier": r[5],
        }
        for r in rows
    ]


# ── Format and export ────────────────────────────────────────────────────────


def format_example(company: dict, label: dict) -> dict:
    """Format a single company as chat JSONL with system/user/assistant messages."""
    name = company["name"] or "Unknown"
    description = company["description"] or "N/A"
    website = company["website"] or "N/A"

    # Truncate long descriptions to keep training context manageable
    if len(description) > 1200:
        description = description[:1200].rstrip()

    user_msg = (
        f"Classify this company:\n"
        f"Name: {name}\n"
        f"Description: {description}\n"
        f"Website: {website}"
    )

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": json.dumps(label)},
        ]
    }


def export_data(items: list[dict], out_dir: Path, stats_only: bool = False):
    """Label items and export to train/valid/test JSONL files."""
    if stats_only:
        print(f"  Total companies: {len(items)}")

        # Count by label source
        db_labeled = 0
        bootstrapped = 0
        for item in items:
            cat = item["category"]
            ai = item["ai_tier"]
            has_label = (cat is not None and cat != "UNKNOWN") or (ai is not None and ai > 0)
            if has_label:
                db_labeled += 1
            else:
                bootstrapped += 1
        print(f"  DB-labeled: {db_labeled}")
        print(f"  Bootstrap-labeled: {bootstrapped}")

        # Vertical distribution
        vertical_counts: dict[str, int] = {}
        tier_counts = {0: 0, 1: 0, 2: 0}
        for item in items:
            label = _compute_label(item)
            v = label["vertical"]
            vertical_counts[v] = vertical_counts.get(v, 0) + 1
            tier_counts[label["aiTier"]] = tier_counts.get(label["aiTier"], 0) + 1

        print("  Vertical distribution:")
        for v, count in sorted(vertical_counts.items(), key=lambda x: -x[1]):
            pct = count / max(len(items), 1) * 100
            print(f"    {v}: {count} ({pct:.1f}%)")

        print("  AI tier distribution:")
        for tier in (0, 1, 2):
            count = tier_counts[tier]
            pct = count / max(len(items), 1) * 100
            print(f"    tier {tier}: {count} ({pct:.1f}%)")
        return

    # Label all items and build examples
    examples = []
    for item in items:
        label = _compute_label(item)
        example = format_example(item, label)
        examples.append(example)

    if not examples:
        print("  No examples to export.")
        return

    # 80/10/10 split with seed 42
    random.seed(42)
    random.shuffle(examples)
    n = len(examples)
    train_end = int(n * 0.8)
    valid_end = int(n * 0.9)

    train = examples[:train_end]
    valid = examples[train_end:valid_end]
    test = examples[valid_end:]

    # Shuffle each split independently
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

    # Print vertical distribution in train set
    print(f"\n  Train set vertical distribution:")
    train_verticals: dict[str, int] = {}
    train_tiers = {0: 0, 1: 0, 2: 0}
    for ex in train:
        label = json.loads(ex["messages"][-1]["content"])
        v = label["vertical"]
        train_verticals[v] = train_verticals.get(v, 0) + 1
        train_tiers[label["aiTier"]] = train_tiers.get(label["aiTier"], 0) + 1

    for v, count in sorted(train_verticals.items(), key=lambda x: -x[1]):
        print(f"    {v}: {count}")
    print(f"  Train set AI tier distribution:")
    for tier in (0, 1, 2):
        print(f"    tier {tier}: {train_tiers[tier]}")


def _compute_label(item: dict) -> dict:
    """Compute label for a company, using DB fields if available, else bootstrap."""
    cat = item["category"]
    ai = item["ai_tier"]
    has_db_label = (cat is not None and cat != "UNKNOWN") or (ai is not None and ai > 0)

    if has_db_label:
        return label_from_db(
            category=cat or "UNKNOWN",
            ai_tier=ai or 0,
            name=item["name"] or "",
            description=item["description"] or "",
            website=item.get("website"),
        )
    else:
        return bootstrap_classify(
            name=item["name"] or "",
            description=item["description"] or "",
            website=item.get("website"),
        )


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Export company classification training data for MLX LoRA fine-tuning"
    )
    parser.add_argument("--stats", action="store_true", help="Print counts only")
    parser.add_argument(
        "--out-dir", type=Path, default=Path("mlx-training/data/company-vertical")
    )
    args = parser.parse_args()

    print("Neon PostgreSQL:")
    conn = get_conn()
    try:
        companies = fetch_companies(conn)
        print(f"  Fetched {len(companies)} companies")
    finally:
        conn.close()

    # Skip rows where both name AND description are NULL/empty
    before = len(companies)
    companies = [
        c for c in companies
        if (c["name"] and c["name"].strip()) or (c["description"] and c["description"].strip())
    ]
    skipped = before - len(companies)
    if skipped > 0:
        print(f"  Skipped {skipped} companies (no name and no description)")

    if not companies:
        print("No usable companies found.", file=sys.stderr)
        sys.exit(1)

    print(f"\nTotal usable companies: {len(companies)}")
    export_data(companies, args.out_dir, args.stats)

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/")


if __name__ == "__main__":
    main()
