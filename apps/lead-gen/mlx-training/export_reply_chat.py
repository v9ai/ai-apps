"""Export email reply classification training data as chat-format JSONL for MLX LoRA fine-tuning.

Queries received_emails from Neon PostgreSQL. Rows with an existing `classification`
column value use it directly; rows without classification get keyword bootstrap labels.

Outputs chat-format JSONL (system/user/assistant messages) split 80/10/10.

Usage:
  python3 mlx-training/export_reply_chat.py                                    # export all
  python3 mlx-training/export_reply_chat.py --stats                            # counts only
  python3 mlx-training/export_reply_chat.py --out-dir mlx-training/data/reply-classification
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
from pathlib import Path

# ── Constants ────────────────────────────────────────────────────────────────

CLASSIFICATION_SYSTEM_PROMPT = (
    "You are an email reply classifier for a B2B outreach platform. "
    "Classify inbound emails into exactly one of these 6 categories:\n\n"
    "1. **interested** — Positive signal. The person wants to learn more, meet, proceed, "
    "or expressed enthusiasm. Short affirmative replies (\"Yes\", \"Sure\", \"Send me details\", "
    "\"Sounds good\") are interested.\n"
    "2. **not_interested** — Explicit decline. \"No thanks\", \"Not a fit\", \"Not interested\", "
    "\"We'll pass\". Must be an active rejection, not just silence.\n"
    "3. **auto_reply** — Automated response. Out of office, vacation, maternity leave, "
    "auto-responder. No human decision expressed.\n"
    "4. **bounced** — Delivery failure. Mail delivery notifications, \"user unknown\", "
    "SMTP error codes (550, 551, etc.).\n"
    "5. **info_request** — Asking specific questions before committing. \"What does this cost?\", "
    "\"How does it work?\", \"Can you send a case study?\". Distinguished from interested by "
    "the conditional nature — they want info before deciding.\n"
    "6. **unsubscribe** — Opt-out request. \"Unsubscribe\", \"Remove me\", \"Stop emailing\", "
    "GDPR requests.\n\n"
    "## Decision rules\n\n"
    "- Short affirmative replies (< 30 words) without negative keywords → **interested** at high confidence\n"
    "- \"Send me details\" / \"Please share\" / \"Yes please\" → **interested** (NOT info_request)\n"
    "- Questions about logistics (\"When?\", \"Where?\", \"How do I sign up?\") → **interested**\n"
    "- Questions about substance (\"What does this include?\", \"What's the cost?\") → **info_request**\n"
    "- If both interest and questions present, choose based on overall tone: "
    "enthusiastic + questions = interested, cautious + questions = info_request\n"
    "- \"Who are you?\" / \"Is this legitimate?\" / verification questions → **info_request**\n"
    "- If the reply contains calendar links or meeting proposals → **interested** at 0.99\n\n"
    "## Output format\n\n"
    "Respond with ONLY valid JSON:\n"
    "{\"label\": \"<one of: interested, not_interested, auto_reply, bounced, info_request, unsubscribe>\", "
    "\"confidence\": <0.0 to 1.0>, \"reasoning\": \"<one sentence explaining why>\"}"
)

VALID_LABELS = [
    "interested",
    "not_interested",
    "auto_reply",
    "bounced",
    "info_request",
    "unsubscribe",
]

# ── Keyword lists (match TypeScript classifier + export_reply_labels.py) ─────

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
    "unsubscribe", "remove me", "opt out", "stop emailing",
    "take me off", "do not contact", "stop sending",
    "remove from list", "gdpr",
]

KEYWORD_MAP = {
    "interested": INTERESTED_KW,
    "not_interested": NOT_INTERESTED_KW,
    "auto_reply": AUTO_REPLY_KW,
    "bounced": BOUNCED_KW,
    "info_request": INFO_REQUEST_KW,
    "unsubscribe": UNSUBSCRIBE_KW,
}

# ── Quoted text stripping ────────────────────────────────────────────────────

_QUOTE_LINE_RE = re.compile(r"^>", re.MULTILINE)
_ON_WROTE_RE = re.compile(r"^On .+ wrote:\s*$", re.MULTILINE)
_SEPARATOR_RE = re.compile(r"^-{3,}", re.MULTILINE)
_FROM_RE = re.compile(r"^From:\s", re.MULTILINE)


def strip_quoted_text(text: str) -> str:
    """Remove quoted reply text (lines starting with >, 'On ... wrote:', '---', 'From:')."""
    if not text:
        return ""

    # Find the earliest quote marker and truncate there
    earliest = len(text)
    for pattern in [_QUOTE_LINE_RE, _ON_WROTE_RE, _SEPARATOR_RE, _FROM_RE]:
        m = pattern.search(text)
        if m and m.start() < earliest:
            earliest = m.start()

    stripped = text[:earliest].strip()
    return stripped if stripped else text.strip()


# ── DB connection ────────────────────────────────────────────────────────────


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    import psycopg2
    return psycopg2.connect(url)


# ── SQL ──────────────────────────────────────────────────────────────────────

QUERY = """
SELECT
  re.id,
  re.subject,
  re.text_content,
  re.classification
FROM received_emails re
ORDER BY re.id
"""

COLUMNS = ["id", "subject", "text_content", "classification"]


def fetch_rows(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute(QUERY)
    raw = cur.fetchall()
    cur.close()
    return [dict(zip(COLUMNS, r)) for r in raw]


# ── Bootstrap labeling ──────────────────────────────────────────────────────


def bootstrap_label(subject: str, body: str) -> dict:
    """Classify a reply using keyword rules. Returns label, confidence, reasoning."""
    combined = f"{subject} {body}".lower()

    # Count keyword hits per class
    hits: dict[str, list[str]] = {}
    for label, keywords in KEYWORD_MAP.items():
        matched = [kw for kw in keywords if kw in combined]
        if matched:
            hits[label] = matched

    if not hits:
        # No keywords matched at all — default to interested with low confidence
        return {
            "label": "interested",
            "confidence": 0.5,
            "reasoning": "No strong keyword signals detected; defaulting to interested.",
        }

    # Best class wins by number of hits
    best_label = max(hits, key=lambda k: len(hits[k]))
    best_hits = hits[best_label]

    # Confidence = min(hits / 3, 0.95)
    confidence = round(min(len(best_hits) / 3, 0.95), 2)

    # Top 2 keywords for reasoning
    top_kw = best_hits[:2]
    reasoning = f"Matched keywords: {', '.join(top_kw)}."

    return {
        "label": best_label,
        "confidence": confidence,
        "reasoning": reasoning,
    }


def db_label_to_output(classification: str) -> dict:
    """Convert an existing DB classification value to a training label dict."""
    label = classification.lower().strip()
    # Normalise common variants
    if label in VALID_LABELS:
        return {
            "label": label,
            "confidence": 0.95,
            "reasoning": "Human-verified classification from database.",
        }
    # If unexpected value, try fuzzy match
    for valid in VALID_LABELS:
        if valid in label or label in valid:
            return {
                "label": valid,
                "confidence": 0.85,
                "reasoning": f"Mapped from DB classification: {classification}.",
            }
    # Fallback: treat as interested
    return {
        "label": "interested",
        "confidence": 0.5,
        "reasoning": f"Unknown DB classification '{classification}'; defaulted to interested.",
    }


# ── Format and export ────────────────────────────────────────────────────────


def format_example(subject: str, body: str, label_dict: dict) -> dict:
    """Format a single example as chat JSONL with system/user/assistant messages."""
    display_subject = subject.strip() if subject and subject.strip() else "(no subject)"
    stripped_body = strip_quoted_text(body or "")

    user_msg = f"Subject: {display_subject}\nBody: {stripped_body}"

    return {
        "messages": [
            {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": json.dumps(label_dict)},
        ]
    }


def export_data(rows: list[dict], out_dir: Path, stats_only: bool = False):
    """Label rows and export to train/valid/test JSONL files."""
    # Build examples
    examples = []
    label_source_counts = {"db": 0, "bootstrap": 0}
    label_dist: dict[str, int] = {l: 0 for l in VALID_LABELS}

    for row in rows:
        subject = row.get("subject") or ""
        text = row.get("text_content") or ""
        classification = row.get("classification")

        # Use existing DB classification if present; otherwise bootstrap
        if classification and classification.strip():
            label_dict = db_label_to_output(classification)
            label_source_counts["db"] += 1
        else:
            body = strip_quoted_text(text)
            label_dict = bootstrap_label(subject, body)
            label_source_counts["bootstrap"] += 1

        label_dist[label_dict["label"]] = label_dist.get(label_dict["label"], 0) + 1

        if stats_only:
            continue

        example = format_example(subject, text, label_dict)
        examples.append(example)

    # Print stats
    total = len(rows)
    print(f"  Total emails: {total}")
    print(f"  Label source: {label_source_counts['db']} from DB, "
          f"{label_source_counts['bootstrap']} bootstrapped")
    print(f"  Label distribution:")
    for label in VALID_LABELS:
        n = label_dist.get(label, 0)
        pct = n / max(total, 1) * 100
        print(f"    {label:>16s}: {n:5d} ({pct:5.1f}%)")

    if stats_only:
        return

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

    out_dir.mkdir(parents=True, exist_ok=True)
    for name, subset in [("train", train), ("valid", valid), ("test", test)]:
        path = out_dir / f"{name}.jsonl"
        with open(path, "w") as f:
            for ex in subset:
                f.write(json.dumps(ex) + "\n")
        print(f"  {name}: {len(subset)} examples -> {path}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Export email reply classification training data as chat-format JSONL"
    )
    parser.add_argument("--stats", action="store_true", help="Print counts only")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("mlx-training/data/reply-classification"),
    )
    args = parser.parse_args()

    conn = get_conn()
    try:
        rows = fetch_rows(conn)
    finally:
        conn.close()

    print(f"Fetched {len(rows)} received emails from DB\n")

    if not rows:
        print("No received emails found.", file=sys.stderr)
        sys.exit(1)

    export_data(rows, args.out_dir, args.stats)

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/")


if __name__ == "__main__":
    main()
