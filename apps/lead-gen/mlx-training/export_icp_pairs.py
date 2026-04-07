"""
Export ICP Training Pairs from Neon — for Contrastive ICP Learning
==================================================================
Exports (company_text, label) pairs for training the ContrastiveProjectionHead
in salescue/modules/icp.py.

Labels:
  - positive: companies that led to meetings/replies (closed-won or engaged)
  - negative: companies that were disqualified or bounced
  - neutral: companies still in pipeline (no outcome yet)

Usage:
    python export_icp_pairs.py                   # Export all labeled pairs
    python export_icp_pairs.py --min-contacts 1  # Only companies with contacts
    python export_icp_pairs.py --output data/icp_pairs.jsonl
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env.local")

LOG_FMT = "%(asctime)s [%(levelname)s] %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FMT)
log = logging.getLogger("export-icp")

DEFAULT_OUTPUT = Path(__file__).parent / "data" / "icp_pairs.jsonl"

# Label mapping based on engagement signals
LABEL_MAP = {
    "positive": 1,   # led to engagement
    "negative": -1,  # disqualified
    "neutral": 0,    # in pipeline
}


def get_neon_conn():
    import psycopg2
    url = os.environ.get("NEON_DATABASE_URL", "")
    if not url:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return psycopg2.connect(url, sslmode="require")


def build_company_text(row: dict) -> str:
    """Build a rich text description from company fields for embedding."""
    parts = []

    if row["name"]:
        parts.append(row["name"])

    if row["description"]:
        parts.append(row["description"])

    if row["category"] and row["category"] != "UNKNOWN":
        parts.append(f"Category: {row['category']}")

    if row["size"]:
        parts.append(f"Size: {row['size']} employees")

    if row["industries"]:
        try:
            industries = json.loads(row["industries"])
            if industries:
                parts.append(f"Industries: {', '.join(industries)}")
        except (json.JSONDecodeError, TypeError):
            pass

    if row["services"]:
        try:
            services = json.loads(row["services"])
            if services:
                parts.append(f"Services: {', '.join(services[:5])}")
        except (json.JSONDecodeError, TypeError):
            pass

    if row["tags"]:
        try:
            tags = json.loads(row["tags"])
            if tags:
                parts.append(f"Tech: {', '.join(tags[:5])}")
        except (json.JSONDecodeError, TypeError):
            pass

    if row["ai_tier"]:
        tier_labels = {0: "not AI-focused", 1: "AI-first", 2: "AI-native"}
        parts.append(f"AI tier: {tier_labels.get(row['ai_tier'], 'unknown')}")

    return ". ".join(parts)


def determine_label(row: dict) -> str:
    """Determine the engagement label for a company.

    Uses contact engagement signals to classify:
    - positive: has contacts that replied with interest or meeting booked
    - negative: blocked, all contacts bounced, or explicitly disqualified
    - neutral: no clear signal yet
    """
    if row.get("blocked"):
        return "negative"

    # Check contact engagement
    reply_class = row.get("best_reply_class", "")
    if reply_class in ("interested", "meeting_request", "info_request"):
        return "positive"
    if reply_class in ("not_interested", "unsubscribe", "bounced"):
        return "negative"

    # Score-based heuristic
    score = row.get("score", 0) or 0
    confidence = row.get("confidence", 0.5) or 0.5

    if score >= 0.8 and confidence >= 0.7:
        return "positive"
    if score <= 0.2:
        return "negative"

    return "neutral"


def export_pairs(min_contacts: int = 0, output: Path = DEFAULT_OUTPUT):
    """Export labeled ICP pairs to JSONL."""
    conn = get_neon_conn()

    with conn.cursor() as cur:
        # Fetch companies with engagement data
        cur.execute("""
            SELECT
                c.id, c.name, c.description, c.category, c.size,
                c.industries, c.services, c.tags, c.ai_tier,
                c.score, c.ai_classification_confidence,
                c.blocked,
                (SELECT ct.reply_classification
                 FROM contacts ct
                 WHERE ct.company_id = c.id
                   AND ct.reply_classification IS NOT NULL
                 ORDER BY
                   CASE ct.reply_classification
                     WHEN 'interested' THEN 1
                     WHEN 'meeting_request' THEN 2
                     WHEN 'info_request' THEN 3
                     WHEN 'not_interested' THEN 4
                     WHEN 'unsubscribe' THEN 5
                     WHEN 'bounced' THEN 6
                     ELSE 7
                   END
                 LIMIT 1
                ) AS best_reply_class,
                (SELECT COUNT(*)
                 FROM contacts ct
                 WHERE ct.company_id = c.id
                ) AS contact_count
            FROM companies c
            WHERE c.category != 'UNKNOWN'
        """)

        columns = [desc[0] for desc in cur.description]
        rows = [dict(zip(columns, row)) for row in cur.fetchall()]

    conn.close()

    # Filter by min contacts
    if min_contacts > 0:
        rows = [r for r in rows if (r.get("contact_count") or 0) >= min_contacts]

    log.info(f"Processing {len(rows)} companies")

    # Build pairs
    pairs = []
    label_counts = {"positive": 0, "negative": 0, "neutral": 0}

    for row in rows:
        text = build_company_text(row)
        if len(text) < 10:
            continue

        label = determine_label(row)
        label_counts[label] += 1

        pairs.append({
            "text": text,
            "label": label,
            "label_id": LABEL_MAP[label],
            "company_id": row["id"],
            "company_name": row["name"],
            "score": row.get("score", 0),
        })

    # Write JSONL
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w") as f:
        for pair in pairs:
            f.write(json.dumps(pair) + "\n")

    log.info(f"\nExported {len(pairs)} pairs to {output}")
    log.info(f"  Positive: {label_counts['positive']}")
    log.info(f"  Negative: {label_counts['negative']}")
    log.info(f"  Neutral:  {label_counts['neutral']}")

    # Class balance warning
    total = sum(label_counts.values())
    if total > 0:
        for label, count in label_counts.items():
            pct = count / total * 100
            if pct < 10:
                log.warning(f"  Class '{label}' is underrepresented ({pct:.1f}%)")


def main():
    parser = argparse.ArgumentParser(description="Export ICP training pairs")
    parser.add_argument("--min-contacts", type=int, default=0)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    export_pairs(min_contacts=args.min_contacts, output=args.output)


if __name__ == "__main__":
    main()
