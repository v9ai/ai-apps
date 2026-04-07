"""Export spam-labeled email data from Neon PostgreSQL as JSONL for training.

Sources:
  - sent_emails table: emails with delivery status -> label inference
  - received_emails table: inbound with reply classification
  - email_campaigns table: campaign-level metrics

Tasks:
  spam-labels    -- Export emails with spam/not-spam labels from delivery data
  ai-detection   -- Export AI-generated emails (from emailgen) vs human-written
  provider-data  -- Export deliverability data per provider

Usage:
  python3 mlx-training/export_spam_data.py --task spam-labels
  python3 mlx-training/export_spam_data.py --task all
  python3 mlx-training/export_spam_data.py --task spam-labels --output /path/to/file.jsonl
"""

from __future__ import annotations

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

# ── Constants ────────────────────────────────────────────────────────────────

SPAM_CATEGORIES = [
    "clean", "template_spam", "ai_generated", "low_effort",
    "role_account", "domain_suspect", "content_violation",
]

# Role account prefixes (noreply, info, etc.)
ROLE_ACCOUNT_PREFIXES = [
    "noreply", "no-reply", "no_reply", "donotreply", "do-not-reply",
    "info@", "info+", "support@", "support+", "admin@", "admin+",
    "webmaster@", "postmaster@", "mailer-daemon@", "marketing@",
    "sales@", "hello@", "contact@", "team@", "help@", "billing@",
    "notifications@", "alerts@", "news@", "newsletter@",
]

# Spam keyword list (matches Rust SPAM_KEYWORDS)
SPAM_KEYWORDS = [
    "free", "act now", "limited time", "guaranteed", "no obligation",
    "click here", "buy now", "discount", "winner", "congratulations",
    "exclusive deal", "risk free", "no cost", "earn money",
    "100% free", "double your", "cash bonus", "credit card",
    "order now", "lowest price", "best price", "special promotion",
    "apply now", "instant access", "fast cash", "make money",
    "million dollars", "no fees", "one time offer", "prize",
    "unsecured", "urgent", "while supplies last",
]

# Urgency keywords (matches Rust URGENCY_KEYWORDS)
URGENCY_KEYWORDS = [
    "urgent", "immediately", "act now", "limited time",
    "expires", "deadline", "last chance", "hurry",
    "don't miss", "final notice", "time sensitive",
    "respond immediately", "action required", "asap",
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


# ── Label inference ──────────────────────────────────────────────────────────


def is_role_account(email: str) -> bool:
    """Check if email address is a role account."""
    if not email:
        return False
    lower = email.lower()
    return any(lower.startswith(prefix) for prefix in ROLE_ACCOUNT_PREFIXES)


def compute_personalization_score(text: str) -> float:
    """Estimate personalization level of email content (0.0-1.0).

    Looks for placeholder tokens, named references, specific company mentions.
    """
    if not text:
        return 0.0

    score = 0.0
    lower = text.lower()

    # Placeholder tokens = generic template
    if "{{" in text or "{%" in text:
        return 0.1

    # Named references suggest personalization
    if re.search(r"\bhi [A-Z][a-z]+\b", text):
        score += 0.3
    if re.search(r"\b(your team|your company|your work)\b", lower):
        score += 0.2

    # Specific references to projects, repos, articles
    if re.search(r"(I saw|I noticed|I read|I came across)\b", text):
        score += 0.3

    # Questions about the recipient
    if "?" in text and re.search(r"\byou\b", lower):
        score += 0.2

    return min(score, 1.0)


def compute_spam_score(text: str) -> float:
    """Estimate spam score from keyword density (0.0-1.0)."""
    if not text:
        return 0.0
    lower = text.lower()
    hits = sum(1 for kw in SPAM_KEYWORDS if kw in lower)
    urgency_hits = sum(1 for kw in URGENCY_KEYWORDS if kw in lower)
    return min((hits + urgency_hits * 1.5) / 10.0, 1.0)


def infer_label(record: dict) -> str:
    """Infer spam category label from email record fields.

    Priority order:
      1. role_account   -- to_address starts with role prefix
      2. ai_generated   -- generated_by = "emailgen"
      3. template_spam  -- template_id set and low personalization
      4. content_violation -- spam_score > 0.7
      5. low_effort     -- word_count < 30 and no personalization
      6. clean          -- default
    """
    to_addr = record.get("to_email", "") or ""
    status = record.get("status", "") or ""
    text = record.get("text_content", "") or ""
    subject = record.get("subject", "") or ""
    full_text = f"{subject} {text}"
    word_count = len(full_text.split())

    # Role account bounce
    if status == "bounced" and is_role_account(to_addr):
        return "role_account"
    if is_role_account(to_addr):
        return "role_account"

    # AI-generated (from emailgen pipeline)
    generated_by = record.get("generated_by", "") or ""
    if generated_by == "emailgen":
        return "ai_generated"

    # Template spam (low personalization)
    template_id = record.get("template_id")
    personalization = compute_personalization_score(full_text)
    if template_id and personalization < 0.3:
        return "template_spam"

    # Content violation (high spam score)
    spam_score = compute_spam_score(full_text)
    if spam_score > 0.7:
        return "content_violation"

    # Low effort
    if word_count < 30 and personalization < 0.2:
        return "low_effort"

    return "clean"


def extract_send_hour(sent_at: str | None) -> int:
    """Extract hour from ISO timestamp string."""
    if not sent_at:
        return 12  # default noon
    try:
        # ISO format: 2024-01-15T14:30:00Z or similar
        match = re.search(r"T(\d{2}):", sent_at)
        if match:
            return int(match.group(1))
    except Exception:
        pass
    return 12


# ── Export functions ─────────────────────────────────────────────────────────


def fetch_outbound_emails(conn, limit: int | None = None) -> list[dict]:
    """Fetch outbound emails from contact_emails table."""
    cur = conn.cursor()
    query = """
        SELECT
            ce.id, ce.from_email, ce.to_emails, ce.subject, ce.text_content,
            ce.status, ce.sent_at, ce.sequence_type, ce.html_content,
            ce.reply_classification, ce.headers, ce.tags
        FROM contact_emails ce
        WHERE ce.text_content IS NOT NULL
          AND length(ce.text_content) > 10
        ORDER BY ce.id
    """
    if limit:
        query += f" LIMIT {limit}"
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()

    records = []
    for r in rows:
        to_emails = r[2] or "[]"
        try:
            to_list = json.loads(to_emails) if isinstance(to_emails, str) else to_emails
            to_email = to_list[0] if to_list else ""
        except (json.JSONDecodeError, IndexError):
            to_email = to_emails if isinstance(to_emails, str) else ""

        headers = {}
        if r[10]:
            try:
                headers = json.loads(r[10]) if isinstance(r[10], str) else r[10]
            except json.JSONDecodeError:
                pass

        records.append({
            "id": r[0],
            "from_email": r[1],
            "to_email": to_email,
            "subject": r[3],
            "text_content": r[4],
            "status": r[5],
            "sent_at": r[6],
            "sequence_type": r[7] or "initial",
            "html_content": r[8],
            "reply_classification": r[9],
            "headers": headers,
            "source": "outbound",
        })
    return records


def fetch_received_emails(conn, limit: int | None = None) -> list[dict]:
    """Fetch inbound emails from received_emails table."""
    cur = conn.cursor()
    query = """
        SELECT
            re.id, re.from_email, re.to_emails, re.subject, re.text_content,
            re.classification, re.received_at, re.html_content
        FROM received_emails re
        WHERE re.text_content IS NOT NULL
          AND length(re.text_content) > 10
        ORDER BY re.id
    """
    if limit:
        query += f" LIMIT {limit}"
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()

    records = []
    for r in rows:
        to_emails = r[2] or "[]"
        try:
            to_list = json.loads(to_emails) if isinstance(to_emails, str) else to_emails
            to_email = to_list[0] if to_list else ""
        except (json.JSONDecodeError, IndexError):
            to_email = to_emails if isinstance(to_emails, str) else ""

        records.append({
            "id": r[0],
            "from_email": r[1],
            "to_email": to_email,
            "subject": r[3],
            "text_content": r[4],
            "status": r[5] or "received",
            "sent_at": r[6],
            "sequence_type": "inbound",
            "html_content": r[7],
            "headers": {},
            "source": "inbound",
        })
    return records


def fetch_campaign_metadata(conn) -> dict:
    """Fetch campaign-level metrics for provider data."""
    cur = conn.cursor()
    cur.execute("""
        SELECT
            id, name, status, from_email,
            total_recipients, emails_sent, emails_failed,
            add_unsubscribe_headers
        FROM email_campaigns
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    campaigns = {}
    for r in rows:
        campaigns[r[0]] = {
            "id": r[0],
            "name": r[1],
            "status": r[2],
            "from_email": r[3],
            "total_recipients": r[4],
            "emails_sent": r[5],
            "emails_failed": r[6],
            "add_unsubscribe_headers": bool(r[7]),
        }
    return campaigns


def format_spam_record(record: dict) -> dict:
    """Format a single record as JSONL output."""
    label = infer_label(record)
    text = record.get("text_content", "") or ""
    subject = record.get("subject", "") or ""
    full_text = f"{subject}\n{text}".strip()
    send_hour = extract_send_hour(record.get("sent_at"))

    # Extract provider from from_email domain
    from_email = record.get("from_email", "") or ""
    provider = ""
    if "@" in from_email:
        provider = from_email.split("@")[1].split(".")[0]

    return {
        "text": full_text,
        "label": label,
        "provider": provider,
        "is_ai": label == "ai_generated",
        "headers": record.get("headers", {}),
        "send_time": record.get("sent_at", ""),
        "source": record.get("source", "outbound"),
        "status": record.get("status", ""),
        "sequence_type": record.get("sequence_type", "initial"),
    }


def export_spam_labels(conn, output: Path, limit: int | None = None):
    """Export emails with spam/not-spam labels."""
    print("Fetching outbound emails...")
    outbound = fetch_outbound_emails(conn, limit)
    print(f"  Outbound: {len(outbound)}")

    print("Fetching received emails...")
    received = fetch_received_emails(conn, limit)
    print(f"  Received: {len(received)}")

    all_records = outbound + received
    if not all_records:
        print("No email records found.", file=sys.stderr)
        return

    print(f"\nLabeling {len(all_records)} emails...")
    formatted = [format_spam_record(r) for r in all_records]

    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w") as f:
        for item in formatted:
            f.write(json.dumps(item) + "\n")
    print(f"Written to {output}")

    return formatted


def export_ai_detection(conn, output: Path, limit: int | None = None):
    """Export AI-generated vs human-written emails."""
    print("Fetching outbound emails for AI detection...")
    outbound = fetch_outbound_emails(conn, limit)

    formatted = []
    for r in outbound:
        label = infer_label(r)
        text = f"{r.get('subject', '')} {r.get('text_content', '')}".strip()
        formatted.append({
            "text": text,
            "is_ai": label == "ai_generated",
            "label": label,
            "sequence_type": r.get("sequence_type", "initial"),
        })

    ai_path = output.parent / "ai_detection.jsonl"
    ai_path.parent.mkdir(parents=True, exist_ok=True)
    with open(ai_path, "w") as f:
        for item in formatted:
            f.write(json.dumps(item) + "\n")
    print(f"Written to {ai_path}")

    return formatted


def export_provider_data(conn, output: Path):
    """Export deliverability data per provider."""
    print("Fetching campaign metadata...")
    campaigns = fetch_campaign_metadata(conn)
    print(f"  Campaigns: {len(campaigns)}")

    provider_path = output.parent / "provider_data.jsonl"
    provider_path.parent.mkdir(parents=True, exist_ok=True)
    with open(provider_path, "w") as f:
        for cid, campaign in campaigns.items():
            f.write(json.dumps(campaign) + "\n")
    print(f"Written to {provider_path}")

    return campaigns


def print_summary(formatted: list[dict]):
    """Print label distribution summary."""
    from collections import Counter
    label_dist = Counter(r["label"] for r in formatted)
    source_dist = Counter(r.get("source", "unknown") for r in formatted)

    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  Total records: {len(formatted)}")

    print(f"\n  Label distribution:")
    for cat in SPAM_CATEGORIES:
        n = label_dist.get(cat, 0)
        pct = n / max(len(formatted), 1) * 100
        print(f"    {cat:>20s}: {n:5d} ({pct:5.1f}%)")

    print(f"\n  Source distribution:")
    for src, n in source_dist.most_common():
        pct = n / max(len(formatted), 1) * 100
        print(f"    {src:>20s}: {n:5d} ({pct:5.1f}%)")

    ai_count = sum(1 for r in formatted if r.get("is_ai"))
    print(f"\n  AI-generated emails: {ai_count}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Export spam-labeled email data for training"
    )
    parser.add_argument(
        "--task",
        choices=["spam-labels", "ai-detection", "provider-data", "all"],
        default="spam-labels",
        help="Export task: spam-labels, ai-detection, provider-data, or all",
    )
    parser.add_argument(
        "--output", type=Path, default=Path("mlx-training/data/spam-classifier/spam_training.jsonl"),
        help="Output JSONL path",
    )
    parser.add_argument(
        "--limit", type=int, default=None,
        help="Limit number of records per source",
    )
    args = parser.parse_args()

    conn = get_conn()
    all_formatted = []

    try:
        if args.task in ("spam-labels", "all"):
            formatted = export_spam_labels(conn, args.output, args.limit)
            if formatted:
                all_formatted.extend(formatted)

        if args.task in ("ai-detection", "all"):
            formatted = export_ai_detection(conn, args.output, args.limit)
            if formatted:
                all_formatted.extend(formatted)

        if args.task in ("provider-data", "all"):
            export_provider_data(conn, args.output)
    finally:
        conn.close()

    if all_formatted:
        print_summary(all_formatted)

    if not all_formatted and args.task != "provider-data":
        print("No data exported.", file=sys.stderr)
        sys.exit(1)

    print(f"\nDone.")


if __name__ == "__main__":
    main()
