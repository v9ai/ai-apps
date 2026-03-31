"""Export sent email data from Neon PostgreSQL as JSONL for MLX LoRA fine-tuning.

Joins contact_emails + contacts + companies to build chat-format training pairs.
Quality signals: reply_received (strong positive), opened (weak positive).

Usage:
  python3 mlx-training/export_email_data.py --stats
  python3 mlx-training/export_email_data.py
  python3 mlx-training/export_email_data.py --no-oversample
"""

from __future__ import annotations

import argparse
import copy
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
            parts.append("- Tech focus: AI/ML")
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


def quality_score_for_row(row: dict) -> float:
    """Compute quality_score: 1.0 replied, 0.5 opened, 0.0 otherwise."""
    if row.get("reply_received"):
        return 1.0
    if row.get("was_opened"):
        return 0.5
    return 0.0


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
        ],
        "quality_score": quality_score_for_row(row),
    }


# ── Weighted sampling ─────────────────────────────────────────────────────────

OVERSAMPLE_WEIGHTS = {"replied": 3, "opened": 1.5, "sent": 1}


def _shuffle_message_keys(record: dict) -> dict:
    """Return a deep copy with top-level dict keys in shuffled order to avoid
    exact-duplicate lines in JSONL (messages content stays identical)."""
    rec = copy.deepcopy(record)
    keys = list(rec.keys())
    random.shuffle(keys)
    return {k: rec[k] for k in keys}


def oversample(records: list[dict], quality_labels: list[str]) -> list[dict]:
    """Duplicate records according to OVERSAMPLE_WEIGHTS. First copy is the
    original; additional copies get key-reordered to avoid identical lines."""
    out: list[dict] = []
    for rec, q_label in zip(records, quality_labels):
        weight = OVERSAMPLE_WEIGHTS.get(q_label, 1)
        # First copy is always the original
        out.append(rec)
        # Integer part minus the original
        full_copies = int(weight) - 1
        for _ in range(full_copies):
            out.append(_shuffle_message_keys(rec))
        # Fractional part: probabilistic extra copy
        frac = weight - int(weight)
        if frac > 0 and random.random() < frac:
            out.append(_shuffle_message_keys(rec))
    return out


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


def export_emails(conn, out_dir: Path, stats_only: bool = False,
                   do_oversample: bool = True):
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

        # Quality score stats
        scores = [quality_score_for_row(r) for r in rows]
        if scores:
            by_score = {}
            for s in scores:
                by_score[s] = by_score.get(s, 0) + 1
            mean_qs = sum(scores) / len(scores)
            print(f"  quality_score breakdown: {dict(sorted(by_score.items()))}")
            print(f"  quality_score mean: {mean_qs:.3f}")
        return

    # Convert to training records, keeping quality labels for oversampling
    records = []
    quality_labels = []
    skipped = 0
    for row in rows:
        rec = row_to_record(row)
        if rec:
            q_label = (
                "replied" if row.get("reply_received")
                else "opened" if row.get("was_opened")
                else "sent"
            )
            records.append(rec)
            quality_labels.append(q_label)
        else:
            skipped += 1

    print(f"  converted: {len(records)} records ({skipped} skipped)")

    # Write resend_weighted.jsonl — ALL records with quality_score (before split)
    weighted_path = out_dir / "outreach-email" / "resend_weighted.jsonl"
    weighted_path.parent.mkdir(parents=True, exist_ok=True)
    if do_oversample:
        weighted_records = oversample(records, quality_labels)
    else:
        weighted_records = list(records)
    random.seed(42)
    random.shuffle(weighted_records)
    with open(weighted_path, "w") as f:
        for rec in weighted_records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"  resend_weighted: {len(weighted_records)} examples → {weighted_path}")

    # Stratified split: 85/15 train/valid, stratify by quality
    random.seed(42)
    by_quality: dict[str, list[dict]] = {"replied": [], "opened": [], "sent": []}
    for rec, q_label in zip(records, quality_labels):
        by_quality[q_label].append(rec)

    train, train_labels = [], []
    valid: list[dict] = []
    for q_label, q_records in by_quality.items():
        random.shuffle(q_records)
        split_idx = max(1, int(len(q_records) * 0.85))
        train.extend(q_records[:split_idx])
        train_labels.extend([q_label] * split_idx)
        valid.extend(q_records[split_idx:])
        print(f"  {q_label}: {len(q_records)} total → {split_idx} train / {len(q_records) - split_idx} valid")

    # Apply oversampling to training set only
    if do_oversample:
        train = oversample(train, train_labels)
        print(f"  oversampled train: {len(train)} examples")

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
    parser.add_argument("--no-oversample", action="store_true",
                        help="Disable weighted oversampling (replied 3×, opened 1.5×)")
    args = parser.parse_args()

    conn = get_conn()
    try:
        print("Outreach Email:")
        export_emails(conn, args.out_dir, args.stats,
                      do_oversample=not args.no_oversample)
    finally:
        conn.close()

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/outreach-email/")


if __name__ == "__main__":
    main()
