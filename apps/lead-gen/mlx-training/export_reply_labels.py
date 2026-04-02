"""Export received emails from Neon PostgreSQL with bootstrap reply classification labels.

Queries received_emails, applies keyword-based classification rules (same keywords
as the TypeScript and future Rust classifiers), and outputs JSONL with 16-element
feature vectors for logistic regression training.

Usage:
  python3 mlx-training/export_reply_labels.py --stats
  python3 mlx-training/export_reply_labels.py
  python3 mlx-training/export_reply_labels.py --out mlx-training/data/reply-classifier/reply_labels.jsonl
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import psycopg2

# ── DB connection ─────────────────────────────────────────────────────────────


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


# ── Keyword lists (must match TypeScript reply-classifier.ts) ─────────────────

INTERESTED_KW = [
    "sounds great", "let's chat", "let's talk", "interested",
    "love to learn more", "would love to", "tell me more",
    "set up a call", "schedule a call", "book a time",
    "can we meet", "looking forward", "exciting",
    "count me in", "sign me up", "yes please",
    "absolutely", "definitely interested", "happy to connect",
]

NOT_INTERESTED_KW = [
    "not interested", "no thanks", "no thank you", "pass on this",
    "not a fit", "not a good fit", "not the right time",
    "already have a solution", "not looking", "please don't contact",
    "we're all set", "not in the market", "decline",
    "not for us", "we'll pass", "no need",
]

AUTO_REPLY_KW = [
    "out of office", "out of the office", "ooo", "auto-reply",
    "automatic reply", "autoreply", "currently away",
    "away from my desk", "on vacation", "on holiday",
    "limited access to email", "will respond when i return",
    "maternity leave", "paternity leave", "sabbatical",
    "delayed response", "i am currently unavailable",
]

BOUNCED_KW = [
    "delivery failed", "undeliverable", "mail delivery",
    "mailbox full", "mailbox not found", "user unknown",
    "address rejected", "does not exist", "no such user",
    "delivery status notification", "permanent failure",
    "message not delivered", "returned mail",
    "550 ", "551 ", "552 ", "553 ", "554 ",
]

INFO_REQUEST_KW = [
    "can you send", "could you share", "more details",
    "more information", "tell me more about",
    "what does this include", "how does it work",
    "pricing", "case study", "demo", "brochure",
    "send me", "forward me", "share some",
]

UNSUBSCRIBE_KW = [
    "unsubscribe", "remove me", "opt out", "opt-out",
    "stop emailing", "stop sending", "take me off",
    "remove from list", "remove from your list",
    "do not contact", "do not email", "don't email",
    "please remove", "gdpr", "cease",
]

CALENDAR_PATTERNS = ["calendly.com", "cal.com", "savvycal.com", "tidycal.com", "hubspot.com/meetings"]
SIGNATURE_PATTERNS = ["sent from my iphone", "sent from my android", "sent from outlook", "get outlook", "--\n", "best regards", "kind regards", "sincerely", "cheers,"]
GREETING_PATTERNS = ["hi ", "hey ", "hello ", "thanks ", "thank you", "dear "]


# ── Feature extraction (16 elements — must match TypeScript) ──────────────────


def extract_features(subject: str, text: str) -> np.ndarray:
    """Extract 16-element feature vector for reply classification."""
    combined = f"{subject} {text}".lower()
    words = combined.split()
    word_count = max(len(words), 1)

    def kw_density(keywords: list[str]) -> float:
        return sum(1 for kw in keywords if kw in combined) / word_count

    question_count = combined.count("?")
    exclamation_count = combined.count("!")

    return np.array([
        # 0-5: keyword densities per class
        kw_density(INTERESTED_KW),
        kw_density(NOT_INTERESTED_KW),
        kw_density(AUTO_REPLY_KW),
        kw_density(BOUNCED_KW),
        kw_density(INFO_REQUEST_KW),
        kw_density(UNSUBSCRIBE_KW),
        # 6: text_length_norm
        min(len(combined) / 2000.0, 1.0),
        # 7: subject_is_re
        1.0 if re.match(r"^re:\s", (subject or "").lower()) else 0.0,
        # 8: has_question_mark
        1.0 if question_count > 0 else 0.0,
        # 9: question_density
        question_count / word_count,
        # 10: exclamation_density
        exclamation_count / word_count,
        # 11: word_count_norm
        min(word_count / 300.0, 1.0),
        # 12: has_calendar_link
        1.0 if any(p in combined for p in CALENDAR_PATTERNS) else 0.0,
        # 13: has_signature_block
        1.0 if any(p in combined for p in SIGNATURE_PATTERNS) else 0.0,
        # 14: is_short_reply
        1.0 if word_count < 20 else 0.0,
        # 15: greeting_present
        1.0 if any(combined.startswith(p) or f"\n{p}" in combined for p in GREETING_PATTERNS) else 0.0,
    ], dtype=np.float32)


# ── Bootstrap labeling ────────────────────────────────────────────────────────


def bootstrap_label(subject: str, text: str) -> str:
    """Classify a reply using keyword rules. Returns the most likely class."""
    combined = f"{subject} {text}".lower()
    words = combined.split()
    word_count = max(len(words), 1)

    scores = {
        "interested": sum(1 for kw in INTERESTED_KW if kw in combined) / word_count,
        "not_interested": sum(1 for kw in NOT_INTERESTED_KW if kw in combined) / word_count,
        "auto_reply": sum(1 for kw in AUTO_REPLY_KW if kw in combined) / word_count,
        "bounced": sum(1 for kw in BOUNCED_KW if kw in combined) / word_count,
        "info_request": sum(1 for kw in INFO_REQUEST_KW if kw in combined) / word_count,
        "unsubscribe": sum(1 for kw in UNSUBSCRIBE_KW if kw in combined) / word_count,
    }

    # Calendar link is a strong interested signal
    if any(p in combined for p in CALENDAR_PATTERNS):
        scores["interested"] += 0.5

    best = max(scores, key=scores.get)
    if scores[best] > 0:
        return best

    # Default: if short with Re: subject → info_request; else not_interested
    if word_count < 20 and re.match(r"^re:\s", (subject or "").lower()):
        return "info_request"
    return "not_interested"


# ── SQL ───────────────────────────────────────────────────────────────────────

QUERY = """
SELECT
  re.id,
  re.resend_id,
  re.from_email,
  re.subject,
  re.text_content,
  re.html_content,
  re.received_at,
  re.classification
FROM received_emails re
ORDER BY re.id
"""

COLUMNS = [
    "id", "resend_id", "from_email", "subject",
    "text_content", "html_content", "received_at", "classification",
]


def fetch_rows(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute(QUERY)
    raw = cur.fetchall()
    cur.close()
    return [dict(zip(COLUMNS, r)) for r in raw]


# ── Export ────────────────────────────────────────────────────────────────────

DEFAULT_OUT = Path("mlx-training/data/reply-classifier/reply_labels.jsonl")


def export_labels(rows: list[dict], out_path: Path) -> list[dict]:
    records = []
    for row in rows:
        subject = row.get("subject") or ""
        text = row.get("text_content") or row.get("html_content") or ""
        label = bootstrap_label(subject, text)
        features = extract_features(subject, text)

        records.append({
            "email_id": row["id"],
            "subject": subject,
            "text": text[:500],  # truncate for storage
            "from_email": row.get("from_email") or "",
            "label": label,
            "features": features.tolist(),
            "existing_classification": row.get("classification"),
        })

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Wrote {len(records)} reply labels → {out_path}")
    return records


def print_stats(rows: list[dict]):
    total = len(rows)
    if total == 0:
        print("No received emails found.")
        return

    buckets: dict[str, int] = defaultdict(int)
    for row in rows:
        subject = row.get("subject") or ""
        text = row.get("text_content") or row.get("html_content") or ""
        label = bootstrap_label(subject, text)
        buckets[label] += 1

    print(f"Reply classification distribution ({total} emails):\n")
    for label in ["interested", "not_interested", "auto_reply", "bounced", "info_request", "unsubscribe"]:
        n = buckets.get(label, 0)
        pct = n / total * 100 if total else 0
        bar = "█" * int(pct / 2)
        print(f"  {label:>16s}: {n:5d} ({pct:5.1f}%) {bar}")

    already_classified = sum(1 for r in rows if r.get("classification"))
    print(f"\n  Already classified in DB: {already_classified}/{total}")


def main():
    parser = argparse.ArgumentParser(
        description="Export reply classification labels from received emails"
    )
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"Output JSONL (default: {DEFAULT_OUT})")
    parser.add_argument("--stats", action="store_true", help="Print distribution only")
    args = parser.parse_args()

    conn = get_conn()
    try:
        rows = fetch_rows(conn)
    finally:
        conn.close()

    print(f"Fetched {len(rows)} received emails from DB\n")

    if args.stats:
        print_stats(rows)
        return

    records = export_labels(rows, args.out)
    print()
    print_stats(rows)


if __name__ == "__main__":
    main()
