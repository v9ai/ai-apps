"""Export engagement labels from Neon PostgreSQL as JSONL for DPO/RLHF reward labeling.

For each sent email, computes a reward score 0.0–1.0 based on engagement signals
(reply, open, bounce). Optionally generates DPO preference pairs.

Usage:
  python3 mlx-training/export_engagement_labels.py --stats
  python3 mlx-training/export_engagement_labels.py
  python3 mlx-training/export_engagement_labels.py --out mlx-training/data/outreach-email/engagement_labels.jsonl
  python3 mlx-training/export_engagement_labels.py --dpo-pairs
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

import psycopg2

# ── DB connection ─────────────────────────────────────────────────────────────


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    return psycopg2.connect(url)


# ── Reward computation ────────────────────────────────────────────────────────


def compute_reward(row: dict) -> float:
    """Compute reward score 0.0–1.0 based on engagement signals.

    reply_received=True           → 1.0  (strongest signal)
    opened_at IS NOT NULL only    → 0.2  (open as proxy for engagement)
    sent/delivered only           → 0.0
    bounced/failed                → -0.1 (penalize)
    """
    status = (row.get("status") or "").lower()

    if status in ("bounced", "failed"):
        return -0.1

    if row.get("reply_received"):
        return 1.0

    if row.get("opened"):
        # opened_at as proxy — no explicit click column
        return 0.2

    return 0.0


def reward_label(reward: float) -> str:
    if reward >= 1.0:
        return "replied"
    if reward >= 0.2:
        return "opened"
    if reward <= -0.05:
        return "bounced"
    return "sent"


# ── SQL ───────────────────────────────────────────────────────────────────────

QUERY = """
SELECT
  ce.id,
  ce.subject,
  ce.text_content,
  ce.sequence_type,
  ce.status,
  ce.opened_at IS NOT NULL AS opened,
  ce.reply_received,
  ce.sent_at,
  ce.contact_id,
  ce.company_id
FROM contact_emails ce
WHERE ce.status IN ('sent', 'delivered', 'opened', 'clicked', 'bounced')
ORDER BY ce.id
"""

COLUMNS = [
    "id", "subject", "text_content", "sequence_type", "status",
    "opened", "reply_received", "sent_at", "contact_id", "company_id",
]


# ── Export engagement labels ──────────────────────────────────────────────────


def fetch_rows(conn) -> list[dict]:
    cur = conn.cursor()
    cur.execute(QUERY)
    raw = cur.fetchall()
    cur.close()
    return [dict(zip(COLUMNS, r)) for r in raw]


def build_label_record(row: dict) -> dict:
    reward = compute_reward(row)
    sent_at = row.get("sent_at")
    return {
        "email_id": row["id"],
        "subject": row.get("subject") or "",
        "sequence_type": row.get("sequence_type") or "initial",
        "reward": reward,
        "engagement": {
            "sent": True,
            "opened": bool(row.get("opened")),
            "replied": bool(row.get("reply_received")),
            "status": row.get("status") or "sent",
        },
        "contact_id": row.get("contact_id"),
        "company_id": row.get("company_id"),
        "sent_at": sent_at.isoformat() if sent_at else None,
    }


def export_labels(rows: list[dict], out_path: Path) -> list[dict]:
    records = [build_label_record(r) for r in rows]

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")

    print(f"Wrote {len(records)} engagement labels → {out_path}")
    return records


# ── DPO pair generation ──────────────────────────────────────────────────────


def generate_dpo_pairs(rows: list[dict], out_path: Path) -> int:
    """Group by (contact_id, sequence_type), pick best/worst reward pairs.

    Only create pairs where reward_diff >= 0.5.
    """
    groups: dict[tuple, list[dict]] = defaultdict(list)
    for row in rows:
        key = (row.get("contact_id"), row.get("sequence_type") or "initial")
        groups[key].append(row)

    pairs = []
    for (_contact_id, seq_type), group in groups.items():
        if len(group) < 2:
            continue

        # Compute rewards for each email in the group
        scored = [(compute_reward(r), r) for r in group]
        scored.sort(key=lambda x: x[0])

        worst_reward, worst_row = scored[0]
        best_reward, best_row = scored[-1]
        reward_diff = best_reward - worst_reward

        if reward_diff < 0.5:
            continue

        # Build prompt context from sequence type
        prompt = f"Write a {seq_type} outreach email."

        pairs.append({
            "prompt": prompt,
            "chosen": {
                "subject": best_row.get("subject") or "",
                "body": best_row.get("text_content") or "",
            },
            "rejected": {
                "subject": worst_row.get("subject") or "",
                "body": worst_row.get("text_content") or "",
            },
            "reward_diff": round(reward_diff, 2),
        })

    if pairs:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w") as f:
            for p in pairs:
                f.write(json.dumps(p, ensure_ascii=False) + "\n")
        print(f"Wrote {len(pairs)} DPO pairs → {out_path}")
    else:
        print("No DPO pairs found (need reward_diff >= 0.5 within same contact+sequence_type)")

    return len(pairs)


# ── Stats ─────────────────────────────────────────────────────────────────────


def print_stats(rows: list[dict]):
    total = len(rows)
    if total == 0:
        print("No emails found.")
        return

    buckets: dict[str, int] = defaultdict(int)
    reward_sum = 0.0

    for row in rows:
        reward = compute_reward(row)
        reward_sum += reward
        buckets[reward_label(reward)] += 1

    print("Engagement label distribution:")
    for label, r_val in [("replied", 1.0), ("opened", 0.2), ("sent", 0.0), ("bounced", -0.1)]:
        n = buckets.get(label, 0)
        pct = n / total * 100 if total else 0
        print(f"  reward={r_val:4.1f} ({label:>7s}): {n:5d} emails ({pct:5.1f}%)")

    mean = reward_sum / total
    print(f"Mean reward: {mean:.2f}")


# ── Main ──────────────────────────────────────────────────────────────────────

DEFAULT_OUT = Path("mlx-training/data/outreach-email/engagement_labels.jsonl")
DEFAULT_DPO_OUT = Path("mlx-training/data/outreach-email/dpo_pairs.jsonl")


def main():
    parser = argparse.ArgumentParser(
        description="Export engagement labels for DPO/RLHF reward labeling"
    )
    parser.add_argument(
        "--out", type=Path, default=DEFAULT_OUT,
        help=f"Output JSONL path (default: {DEFAULT_OUT})",
    )
    parser.add_argument(
        "--stats", action="store_true",
        help="Print engagement distribution only, don't export",
    )
    parser.add_argument(
        "--dpo-pairs", action="store_true",
        help="Also generate DPO preference pairs (chosen/rejected)",
    )
    parser.add_argument(
        "--dpo-out", type=Path, default=DEFAULT_DPO_OUT,
        help=f"DPO pairs output path (default: {DEFAULT_DPO_OUT})",
    )
    args = parser.parse_args()

    conn = get_conn()
    try:
        rows = fetch_rows(conn)
    finally:
        conn.close()

    print(f"Fetched {len(rows)} emails from DB\n")

    if args.stats:
        print_stats(rows)
        return

    records = export_labels(rows, args.out)
    print()
    print_stats(rows)

    if args.dpo_pairs:
        print()
        generate_dpo_pairs(rows, args.dpo_out)


if __name__ == "__main__":
    main()
