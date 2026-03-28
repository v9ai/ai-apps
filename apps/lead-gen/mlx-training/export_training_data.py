"""Export labeled job data from Neon PostgreSQL as JSONL for MLX LoRA fine-tuning.

Tasks:
  role-tag         — 1,289 DeepSeek-labeled role classifications (is AI engineer?)
  remote-worldwide — worldwide remote job classifications

Usage:
  python3 mlx-training/export_training_data.py --task role-tag
  python3 mlx-training/export_training_data.py --task remote-worldwide
  python3 mlx-training/export_training_data.py --task all
  python3 mlx-training/export_training_data.py --task role-tag --stats  # counts only
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

ROLE_TAG_SYSTEM = (
    "You classify job postings as AI/ML engineer roles. "
    "Return JSON: {\"isAIEngineer\": true/false, \"confidence\": \"high\"|\"medium\"|\"low\", \"reason\": \"...\"}\n\n"
    "An AI Engineer role involves building, training, deploying, or researching AI/ML systems. "
    "Look for: ML frameworks (PyTorch, TensorFlow, JAX), LLM/RAG/agent work, "
    "NLP/CV/deep learning, MLOps, model serving, data science with ML focus.\n\n"
    "NOT AI Engineer: pure data analytics, BI, data engineering (ETL only), "
    "frontend/backend without AI, DevOps, product management, sales, HR, finance.\n\n"
    "CRITICAL: Respond with ONLY a valid JSON object, no markdown."
)

REMOTE_WORLDWIDE_SYSTEM = (
    "You are an expert at classifying job postings for fully remote worldwide eligibility. "
    "A Remote Worldwide position must be FULLY REMOTE with no geographic restriction on where the candidate works. "
    "Return JSON: {\"isRemoteWorldwide\": true/false, \"confidence\": \"high\"|\"medium\"|\"low\", \"reason\": \"...\"}\n\n"
    "CLASSIFICATION RULES (apply in order):\n\n"
    "0. NEGATIVE SIGNALS (highest priority):\n"
    "   - On-site, in-office, must relocate → false (high)\n"
    "   - Hybrid requiring in-office days → false (high)\n\n"
    "1. FULLY REMOTE REQUIREMENT: Must explicitly state remote/fully remote.\n"
    "   - Hybrid, office-based, on-site → false\n\n"
    "2. GEOGRAPHIC RESTRICTION → false if restricted to single country (e.g. \"US only\", \"UK only\").\n\n"
    "3. ATS METADATA: ashby_is_remote = true → true (high)\n"
    "   - workplace_type = \"not remote\" → false (high)\n\n"
    "4. WORLDWIDE/GLOBAL: \"work from anywhere\", \"remote worldwide\", \"global remote\" → true (high)\n\n"
    "5. BROAD REGIONS: EMEA, Americas, APAC coverage → true (medium)\n\n"
    "6. SINGLE COUNTRY REMOTE: remote but restricted to one country → false (medium)\n\n"
    "CRITICAL: Respond with ONLY a valid JSON object, no markdown."
)

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


# ── Export: Role Tagging ─────────────────────────────────────────────────────


def export_role_tag(conn, out_dir: Path, stats_only: bool = False):
    cur = conn.cursor()
    cur.execute("""
        SELECT title, location, description, company_name,
               role_ai_engineer, role_confidence, role_reason
        FROM jobs
        WHERE role_source = 'deepseek'
          AND role_reason IS NOT NULL
          AND description IS NOT NULL
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    if stats_only:
        ai_true = sum(1 for r in rows if r[4])
        ai_false = sum(1 for r in rows if not r[4])
        print(f"role-tag: {len(rows)} total ({ai_true} AI, {ai_false} not AI)")
        return

    random.seed(42)
    random.shuffle(rows)

    split = int(len(rows) * 0.9)
    train, valid = rows[:split], rows[split:]

    for name, subset in [("train", train), ("valid", valid)]:
        path = out_dir / "role-tag" / f"{name}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for title, location, desc, company, is_ai, conf, reason in subset:
                desc_clean = strip_html(desc)[:2000]
                user_msg = (
                    f"Classify this job as AI/ML engineer or not.\n\n"
                    f"Title: {title}\n"
                    f"Company: {company or 'Unknown'}\n"
                    f"Location: {location or 'Unknown'}\n"
                    f"Description: {desc_clean}"
                )
                assistant_msg = json.dumps({
                    "isAIEngineer": bool(is_ai),
                    "confidence": conf or "medium",
                    "reason": reason,
                })
                record = {
                    "messages": [
                        {"role": "system", "content": ROLE_TAG_SYSTEM},
                        {"role": "user", "content": user_msg},
                        {"role": "assistant", "content": assistant_msg},
                    ]
                }
                f.write(json.dumps(record) + "\n")

        print(f"  {name}: {len(subset)} examples → {path}")


# ── Export: Remote-EU ────────────────────────────────────────────────────────


def export_remote_eu(conn, out_dir: Path, stats_only: bool = False):
    cur = conn.cursor()
    cur.execute("""
        SELECT title, location, description, company_name,
               is_remote_eu, remote_eu_confidence, remote_eu_reason,
               workplace_type, country, ashby_is_remote
        FROM jobs
        WHERE is_remote_eu IS NOT NULL
          AND remote_eu_reason IS NOT NULL
          AND description IS NOT NULL
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    if stats_only:
        pos = sum(1 for r in rows if r[4])
        neg = sum(1 for r in rows if not r[4])
        print(f"remote-eu: {len(rows)} total ({pos} true, {neg} false)")
        return

    random.seed(42)
    random.shuffle(rows)

    split = int(len(rows) * 0.9)
    train, valid = rows[:split], rows[split:]

    for name, subset in [("train", train), ("valid", valid)]:
        path = out_dir / "remote-eu" / f"{name}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for (title, location, desc, company, is_remote, conf, reason,
                 wp_type, country, ashby_remote) in subset:
                desc_clean = strip_html(desc)[:2000]

                # Build structured signals section
                signals = []
                if ashby_remote is not None:
                    signals.append(f"ATS remote flag: {'YES' if ashby_remote else 'NO'}")
                if wp_type:
                    signals.append(f"Workplace type: {wp_type}")
                if country:
                    signals.append(f"Country code: {country}")
                signals_str = "\n".join(signals) if signals else "No structured ATS signals available"

                user_msg = (
                    f"Classify this job posting as Remote EU or not.\n\n"
                    f"JOB DETAILS:\n"
                    f"- Title: {title}\n"
                    f"- Company: {company or 'Unknown'}\n"
                    f"- Location: {location or 'Unknown'}\n"
                    f"- Description: {desc_clean}\n\n"
                    f"STRUCTURED SIGNALS:\n{signals_str}"
                )
                assistant_msg = json.dumps({
                    "isRemoteEU": bool(is_remote),
                    "confidence": conf or "medium",
                    "reason": reason,
                })
                record = {
                    "messages": [
                        {"role": "system", "content": REMOTE_EU_SYSTEM},
                        {"role": "user", "content": user_msg},
                        {"role": "assistant", "content": assistant_msg},
                    ]
                }
                f.write(json.dumps(record) + "\n")

        print(f"  {name}: {len(subset)} examples → {path}")


# ── Export: Remote-Worldwide ─────────────────────────────────────────────────


def export_remote_worldwide(conn, out_dir: Path, stats_only: bool = False):
    cur = conn.cursor()
    cur.execute("""
        SELECT title, location, description, company_name,
               ashby_is_remote, workplace_type, country
        FROM jobs
        WHERE ashby_is_remote IS NOT NULL
          AND description IS NOT NULL
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()

    if stats_only:
        pos = sum(1 for r in rows if r[4])
        neg = sum(1 for r in rows if not r[4])
        print(f"remote-worldwide: {len(rows)} total ({pos} remote, {neg} not remote)")
        return

    random.seed(42)
    random.shuffle(rows)

    split = int(len(rows) * 0.9)
    train, valid = rows[:split], rows[split:]

    for name, subset in [("train", train), ("valid", valid)]:
        path = out_dir / "remote-worldwide" / f"{name}.jsonl"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w") as f:
            for (title, location, desc, company, is_remote, wp_type, country) in subset:
                desc_clean = strip_html(desc)[:2000]

                signals = []
                if is_remote is not None:
                    signals.append(f"ATS remote flag: {'YES' if is_remote else 'NO'}")
                if wp_type:
                    signals.append(f"Workplace type: {wp_type}")
                if country:
                    signals.append(f"Country code: {country}")
                signals_str = "\n".join(signals) if signals else "No structured ATS signals available"

                user_msg = (
                    f"Classify this job posting as fully remote worldwide or not.\n\n"
                    f"JOB DETAILS:\n"
                    f"- Title: {title}\n"
                    f"- Company: {company or 'Unknown'}\n"
                    f"- Location: {location or 'Unknown'}\n"
                    f"- Description: {desc_clean}\n\n"
                    f"STRUCTURED SIGNALS:\n{signals_str}"
                )
                assistant_msg = json.dumps({
                    "isRemoteWorldwide": bool(is_remote),
                    "confidence": "high" if is_remote is not None else "medium",
                    "reason": f"ATS ashby_is_remote={is_remote}",
                })
                record = {
                    "messages": [
                        {"role": "system", "content": REMOTE_WORLDWIDE_SYSTEM},
                        {"role": "user", "content": user_msg},
                        {"role": "assistant", "content": assistant_msg},
                    ]
                }
                f.write(json.dumps(record) + "\n")

        print(f"  {name}: {len(subset)} examples → {path}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Export training data for MLX LoRA fine-tuning")
    parser.add_argument("--task", choices=["role-tag", "remote-eu", "remote-worldwide", "all"], default="all")
    parser.add_argument("--stats", action="store_true", help="Print counts only, don't export")
    parser.add_argument("--out-dir", type=Path, default=Path("mlx-training/data"))
    args = parser.parse_args()

    conn = get_conn()
    try:
        if args.task in ("role-tag", "all"):
            print("Role Tagging:")
            export_role_tag(conn, args.out_dir, args.stats)
        if args.task in ("remote-eu", "all"):
            print("Remote-EU:")
            export_remote_eu(conn, args.out_dir, args.stats)
        if args.task in ("remote-worldwide", "all"):
            print("Remote-Worldwide:")
            export_remote_worldwide(conn, args.out_dir, args.stats)
    finally:
        conn.close()

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/")


if __name__ == "__main__":
    main()
