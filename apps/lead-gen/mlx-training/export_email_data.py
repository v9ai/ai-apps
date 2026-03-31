"""Export sent email data from Neon PostgreSQL as JSONL for MLX LoRA fine-tuning.

Joins contact_emails + contacts + companies to build chat-format training pairs.
Quality signals: reply_received (strong positive), opened (weak positive).

Usage:
  python3 mlx-training/export_email_data.py --stats
  python3 mlx-training/export_email_data.py
  python3 mlx-training/export_email_data.py --min-words 80
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

SYSTEM_PROMPT = (
    "You write B2B outreach emails for Vadim Nicolai, Senior Software Engineer "
    "(10+ years: React, TypeScript, AI/ML, Rust, Node.js, GraphQL). "
    "Never reference crypto, blockchain, trading, or Web3. "
    'Output ONLY valid JSON: {"subject": "...", "body": "..."}'
)

SEQUENCE_LABELS = {
    "initial": "initial outreach",
    "followup_1": "first follow-up",
    "followup_2": "second follow-up",
    "followup_3": "final follow-up",
}

# ── Helpers ──────────────────────────────────────────────────────────────────

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


def word_count(text: str) -> int:
    return len(text.split())


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


# ── Build training record ───────────────────────────────────────────────────


def build_user_message(row: dict) -> str:
    """Build the user turn from contact + company context."""
    seq_type = row.get("sequence_type") or "initial"
    seq_label = SEQUENCE_LABELS.get(seq_type, "initial outreach")

    parts = [f"Write a {seq_label} email."]
    parts.append("")

    # Recipient
    parts.append("RECIPIENT:")
    name = row.get("first_name") or "there"
    parts.append(f"- Name: {name}")
    if row.get("position"):
        parts.append(f"- Position: {row['position']}")
    if row.get("seniority"):
        parts.append(f"- Seniority: {row['seniority']}")
    if row.get("department"):
        parts.append(f"- Department: {row['department']}")
    parts.append("")

    # Company
    if row.get("company_name"):
        parts.append("COMPANY:")
        parts.append(f"- Name: {row['company_name']}")
        if row.get("industry"):
            parts.append(f"- Industry: {row['industry']}")
        if row.get("company_description"):
            desc = strip_html(row["company_description"])[:500]
            parts.append(f"- Description: {desc}")
        if row.get("ai_tier") and row["ai_tier"] > 0:
            tier_label = {1: "AI-first", 2: "AI-native"}.get(row["ai_tier"], "AI")
            parts.append(f"- AI tier: {tier_label}")
        if row.get("company_category") and row["company_category"] != "UNKNOWN":
            parts.append(f"- Category: {row['company_category']}")
        if row.get("company_services"):
            try:
                services = json.loads(row["company_services"])
                if services:
                    parts.append(f"- Services: {', '.join(services[:5])}")
            except (json.JSONDecodeError, TypeError):
                pass
        parts.append("")

    # Instructions
    parts.append("INSTRUCTIONS:")
    if seq_type == "initial":
        parts.append("- Cold outreach to explore engineering opportunities")
        parts.append("- Highlight relevant experience only")
        parts.append("- 100-180 words, one clear CTA")
    elif seq_type == "followup_1":
        parts.append("- First follow-up, reference previous email")
        parts.append("- Acknowledge they may be busy")
        parts.append("- 80-120 words, one question or CTA")
    elif seq_type == "followup_2":
        parts.append("- Second follow-up, brief and respectful")
        parts.append("- Offer flexibility on timing")
        parts.append("- 70-100 words")
    elif seq_type == "followup_3":
        parts.append("- Final follow-up, gracious close")
        parts.append("- Leave door open for future")
        parts.append("- 50-80 words")
    parts.append('- Use {{name}} placeholder for recipient name')

    return "\n".join(parts)


def build_assistant_message(subject: str, body: str) -> str:
    """Build assistant turn: empty think tags + JSON."""
    content = json.dumps({"subject": subject, "body": body}, ensure_ascii=False)
    return f"<think>\n</think>\n{content}"


def row_to_record(row: dict) -> dict | None:
    """Convert a DB row to a chat-format training record."""
    subject = (row.get("subject") or "").strip()
    body = strip_html(row.get("text_content") or "").strip()

    if not subject or not body:
        return None

    wc = word_count(body)
    if wc < 30 or wc > 500:
        return None

    # Skip very short subjects (likely automated/test)
    if len(subject) < 5:
        return None

    user_msg = build_user_message(row)
    assistant_msg = build_assistant_message(subject, body)

    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": assistant_msg},
        ]
    }


# ── Export ───────────────────────────────────────────────────────────────────

QUERY = """
SELECT
  ce.id,
  ce.subject,
  ce.text_content,
  ce.sequence_type,
  ce.sequence_number,
  ce.status,
  ce.opened_at IS NOT NULL AS was_opened,
  ce.reply_received,
  ce.sent_at,
  c.first_name,
  c.last_name,
  c.position,
  c.seniority,
  c.department,
  co.name AS company_name,
  co.description AS company_description,
  co.industry,
  co.ai_tier,
  co.category AS company_category,
  co.services AS company_services
FROM contact_emails ce
JOIN contacts c ON c.id = ce.contact_id
LEFT JOIN companies co ON co.id = ce.company_id
WHERE ce.text_content IS NOT NULL
  AND ce.status IN ('sent', 'delivered')
ORDER BY ce.id
"""

COLUMNS = [
    "id", "subject", "text_content", "sequence_type", "sequence_number",
    "status", "was_opened", "reply_received", "sent_at",
    "first_name", "last_name", "position", "seniority", "department",
    "company_name", "company_description", "industry", "ai_tier",
    "company_category", "company_services",
]


def export_emails(conn, out_dir: Path, stats_only: bool = False):
    cur = conn.cursor()
    cur.execute(QUERY)
    raw_rows = cur.fetchall()
    cur.close()

    rows = [dict(zip(COLUMNS, r)) for r in raw_rows]

    if stats_only:
        replied = sum(1 for r in rows if r.get("reply_received"))
        opened = sum(1 for r in rows if r.get("was_opened") and not r.get("reply_received"))
        rest = len(rows) - replied - opened
        print(f"outreach-email: {len(rows)} total emails")
        print(f"  replied: {replied} (strong positive)")
        print(f"  opened (no reply): {opened} (weak positive)")
        print(f"  sent only: {rest}")

        # Breakdown by sequence type
        by_seq = {}
        for r in rows:
            st = r.get("sequence_type") or "initial"
            by_seq[st] = by_seq.get(st, 0) + 1
        print("  by sequence:", dict(sorted(by_seq.items())))
        return

    # Convert to training records
    records = []
    skipped = 0
    for row in rows:
        rec = row_to_record(row)
        if rec:
            # Tag quality for potential weighting
            rec["_quality"] = (
                "replied" if row.get("reply_received")
                else "opened" if row.get("was_opened")
                else "sent"
            )
            records.append(rec)
        else:
            skipped += 1

    print(f"  converted: {len(records)} records ({skipped} skipped)")

    # Stratified split: 85/15 train/valid, stratify by quality
    random.seed(42)
    by_quality = {"replied": [], "opened": [], "sent": []}
    for rec in records:
        q = rec.pop("_quality")
        by_quality[q].append(rec)

    train, valid = [], []
    for q_label, q_records in by_quality.items():
        random.shuffle(q_records)
        split_idx = max(1, int(len(q_records) * 0.85))
        train.extend(q_records[:split_idx])
        valid.extend(q_records[split_idx:])
        print(f"  {q_label}: {len(q_records)} total → {split_idx} train / {len(q_records) - split_idx} valid")

    random.shuffle(train)
    random.shuffle(valid)

    for name, subset in [("train", train), ("valid", valid)]:
        path = out_dir / "outreach-email" / f"{name}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for rec in subset:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(f"  {name}: {len(subset)} examples → {path}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Export email training data for MLX LoRA fine-tuning")
    parser.add_argument("--stats", action="store_true", help="Print counts only, don't export")
    parser.add_argument("--out-dir", type=Path, default=Path("mlx-training/data"))
    args = parser.parse_args()

    conn = get_conn()
    try:
        print("Outreach Email:")
        export_emails(conn, args.out_dir, args.stats)
    finally:
        conn.close()

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/outreach-email/")


if __name__ == "__main__":
    main()
