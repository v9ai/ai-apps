"""Export contact title classification training data as JSONL for MLX LoRA fine-tuning.

Sources: Neon PostgreSQL `contacts` table.

Usage:
  python3 mlx-training/export_contact_titles.py                              # export all
  python3 mlx-training/export_contact_titles.py --stats                      # counts only
  python3 mlx-training/export_contact_titles.py --out-dir mlx-training/data/contact-title
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

SYSTEM_PROMPT = (
    "You classify B2B contact job titles into seniority level and department.\n\n"
    "Seniority levels: C-level, Founder, Partner, VP, Director, Manager, Senior, IC\n"
    "Departments: AI/ML, Research, Engineering, Product, Sales/BD, Marketing, HR/Recruiting, Finance, Operations, Other\n\n"
    "Also compute:\n"
    "- authorityScore (0.0-1.0): C-level=1.0, Founder=0.95, Partner=0.90, VP=0.85, Director=0.75, Manager=0.50, Senior=0.25, IC=0.10\n"
    "- isDecisionMaker (boolean): true if authorityScore >= 0.70\n"
    "- HR/Recruiting contacts get a 0.4x penalty on authorityScore (gatekeepers, not budget holders)\n\n"
    'Respond with ONLY valid JSON:\n'
    '{"seniority": "...", "department": "...", "authorityScore": 0.85, "isDecisionMaker": true}'
)

SENIORITY_LEVELS = ["C-level", "Founder", "Partner", "VP", "Director", "Manager", "Senior", "IC"]

DEPARTMENTS = [
    "AI/ML", "Research", "Engineering", "Product", "Sales/BD",
    "Marketing", "HR/Recruiting", "Finance", "Operations", "Other",
]

AUTHORITY_SCORES = {
    "C-level": 1.0,
    "Founder": 0.95,
    "Partner": 0.90,
    "VP": 0.85,
    "Director": 0.75,
    "Manager": 0.50,
    "Senior": 0.25,
    "IC": 0.10,
}

GATEKEEPER_DEPARTMENTS = {"HR/Recruiting"}
GATEKEEPER_PENALTY = 0.4
DM_THRESHOLD = 0.70

# ── Seniority keyword patterns (match first, highest weight wins) ────────

SENIORITY_PATTERNS: dict[str, list[tuple[re.Pattern, float]]] = {
    "C-level": [
        (re.compile(r"\b(ceo|cto|cfo|coo|cpo|cro|cmo|cdo|cio|cso)\b", re.I), 1.0),
        (re.compile(r"\bchief\s+(executive|technology|technical|product|operating|financial|revenue|marketing|data|ai|information|science|growth|people|legal|architect)", re.I), 1.0),
    ],
    "Founder": [
        (re.compile(r"\b(founder|co-?founder|cofounder)\b", re.I), 0.95),
        (re.compile(r"\bpresident\b", re.I), 0.90),
    ],
    "Partner": [
        (re.compile(r"\b(managing|general|equity)\s+partner\b", re.I), 0.90),
        (re.compile(r"\bpartner\b", re.I), 0.80),
    ],
    "VP": [
        (re.compile(r"\bvice\s+president\b", re.I), 0.85),
        (re.compile(r"\bvp\s+(of\s+)?[a-z]+", re.I), 0.85),
        (re.compile(r"\bsvp\b", re.I), 0.88),
        (re.compile(r"\bevp\b", re.I), 0.87),
    ],
    "Director": [
        (re.compile(r"\b(director|head\s+of)\b", re.I), 0.75),
        (re.compile(r"\b(managing|executive|regional|associate)\s+director\b", re.I), 0.78),
        (re.compile(r"\bgeneral\s+manager\b", re.I), 0.72),
    ],
    "Manager": [
        (re.compile(r"\b(engineering|product|project|program|delivery|account|practice|team)\s+manager\b", re.I), 0.50),
        (re.compile(r"\b(team|tech|technical)\s+lead\b", re.I), 0.50),
        (re.compile(r"\bmanager\b", re.I), 0.45),
        (re.compile(r"\blead\b", re.I), 0.40),
    ],
    "Senior": [
        (re.compile(r"\b(senior|staff|principal|sr\.?)\s", re.I), 0.25),
        (re.compile(r"\blead\s+(engineer|developer|designer)\b", re.I), 0.30),
    ],
    "IC": [
        (re.compile(r"\b(engineer|developer|analyst|designer|specialist|coordinator|associate)\b", re.I), 0.10),
    ],
}

# ── Department keyword patterns (match best) ────────────────────────────

DEPARTMENT_PATTERNS: dict[str, list[tuple[re.Pattern, float]]] = {
    "AI/ML": [
        (re.compile(r"\b(artificial\s+intelligence|machine\s+learning|deep\s+learning)\b", re.I), 0.95),
        (re.compile(r"\b(nlp|natural\s+language|computer\s+vision|data\s+scien)\b", re.I), 0.90),
        (re.compile(r"\b(mlops|ml\s+engineer|llm|large\s+language|generative\s+ai)\b", re.I), 0.90),
        (re.compile(r"\b(reinforcement\s+learning|neural\s+network|foundation\s+model)\b", re.I), 0.85),
        (re.compile(r"\bai\s+(research|engineer|architect|lead|director)\b", re.I), 0.90),
        (re.compile(r"\b(head\s+of\s+ai|vp\s+ai|chief\s+ai)\b", re.I), 0.95),
    ],
    "Research": [
        (re.compile(r"\b(research\s+scientist|research\s+engineer|researcher)\b", re.I), 0.90),
        (re.compile(r"\b(r&d|applied\s+science|scientist)\b", re.I), 0.80),
    ],
    "Engineering": [
        (re.compile(r"\b(software|backend|frontend|full\s*stack|platform|infrastructure)\b", re.I), 0.70),
        (re.compile(r"\b(devops|sre|site\s+reliability|cloud\s+architect|solutions?\s+architect)\b", re.I), 0.75),
        (re.compile(r"\b(engineer|developer|architect|cto)\b", re.I), 0.60),
    ],
    "Product": [
        (re.compile(r"\b(product\s+manager|product\s+owner|product\s+lead)\b", re.I), 0.85),
        (re.compile(r"\b(ux|user\s+experience|product\s+design|ui\s+design)\b", re.I), 0.75),
        (re.compile(r"\bcpo\b", re.I), 0.90),
    ],
    "Sales/BD": [
        (re.compile(r"\b(sales|business\s+development|account\s+executive)\b", re.I), 0.85),
        (re.compile(r"\b(partnerships|revenue|commercial|channel|pre-?sales)\b", re.I), 0.70),
        (re.compile(r"\bcro\b", re.I), 0.90),
    ],
    "Marketing": [
        (re.compile(r"\b(marketing|growth|brand|demand\s+generation|content)\b", re.I), 0.80),
        (re.compile(r"\b(seo|paid\s+acquisition|product\s+marketing)\b", re.I), 0.75),
        (re.compile(r"\bcmo\b", re.I), 0.90),
    ],
    "HR/Recruiting": [
        (re.compile(r"\b(recruiter|recruiting|recruitment|talent\s+acquisition)\b", re.I), 0.85),
        (re.compile(r"\b(human\s+resources|people\s+operations|hrbp|hr\s+manager)\b", re.I), 0.80),
        (re.compile(r"\b(head\s+of\s+people|chief\s+people|people\s+&?\s*culture)\b", re.I), 0.85),
    ],
    "Finance": [
        (re.compile(r"\b(finance|cfo|controller|accounting|treasurer|fp&a)\b", re.I), 0.85),
    ],
    "Operations": [
        (re.compile(r"\b(operations|coo|chief\s+of\s+staff|strategy|transformation)\b", re.I), 0.75),
    ],
    "Other": [],
}


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


# ── Bootstrap classification ────────────────────────────────────────────────


def score_best_class(
    text: str,
    classes: dict[str, list[tuple[re.Pattern, float]]],
    fallback: str,
) -> tuple[str, float]:
    """Return (label, confidence) for the best-matching class."""
    best_label = fallback
    best_score = 0.0

    for label, patterns in classes.items():
        score = 0.0
        for pattern, weight in patterns:
            if pattern.search(text):
                score = max(score, weight)
        if score > best_score:
            best_score = score
            best_label = label

    return best_label, best_score or 0.1


def bootstrap_classify(position: str) -> dict:
    """Classify a job title using keyword bootstrap (mirrors contact-classifier.ts)."""
    t = position.strip().lower()
    if not t:
        return {
            "seniority": "IC",
            "department": "Other",
            "authorityScore": 0.1,
            "isDecisionMaker": False,
        }

    seniority, _ = score_best_class(t, SENIORITY_PATTERNS, "IC")
    department, _ = score_best_class(t, DEPARTMENT_PATTERNS, "Other")

    authority_score = AUTHORITY_SCORES.get(seniority, 0.1)
    if department in GATEKEEPER_DEPARTMENTS:
        authority_score *= GATEKEEPER_PENALTY
    authority_score = round(authority_score, 2)

    return {
        "seniority": seniority,
        "department": department,
        "authorityScore": authority_score,
        "isDecisionMaker": authority_score >= DM_THRESHOLD,
    }


# ── Data fetching ───────────────────────────────────────────────────────────


def fetch_contacts(conn) -> list[dict]:
    """Fetch contacts with position data from Neon."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id, position, seniority, department, authority_score, is_decision_maker
        FROM contacts
        WHERE position IS NOT NULL
          AND trim(position) != ''
        ORDER BY id
    """)
    rows = cur.fetchall()
    cur.close()
    return [
        {
            "id": r[0],
            "position": r[1],
            "seniority": r[2],
            "department": r[3],
            "authority_score": r[4],
            "is_decision_maker": r[5],
        }
        for r in rows
    ]


# ── Label generation ────────────────────────────────────────────────────────


def make_label(contact: dict) -> dict:
    """Generate a training label from a contact row.

    If the contact already has seniority/department from the DB, use those
    as ground-truth labels and recompute authority_score and is_decision_maker
    consistently. Otherwise, bootstrap from keyword patterns.
    """
    has_db_labels = bool(contact["seniority"] and contact["department"])

    if has_db_labels:
        seniority = contact["seniority"]
        department = contact["department"]
        # Use DB authority_score if available, else recompute from seniority
        if contact["authority_score"] is not None:
            authority_score = round(contact["authority_score"], 2)
        else:
            authority_score = AUTHORITY_SCORES.get(seniority, 0.1)
            if department in GATEKEEPER_DEPARTMENTS:
                authority_score *= GATEKEEPER_PENALTY
            authority_score = round(authority_score, 2)
        # Use DB is_decision_maker if available, else derive from authority_score
        if contact["is_decision_maker"] is not None:
            is_dm = bool(contact["is_decision_maker"])
        else:
            is_dm = authority_score >= DM_THRESHOLD
        return {
            "seniority": seniority,
            "department": department,
            "authorityScore": authority_score,
            "isDecisionMaker": is_dm,
        }
    else:
        return bootstrap_classify(contact["position"])


# ── Format and export ────────────────────────────────────────────────────────


def format_example(position: str, label: dict) -> dict:
    """Format a single example as chat JSONL with system/user/assistant messages."""
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Classify this job title: {position.strip()}"},
            {"role": "assistant", "content": json.dumps(label)},
        ]
    }


def export_data(contacts: list[dict], out_dir: Path, stats_only: bool = False):
    """Label contacts and export to train/valid/test JSONL files."""
    # Generate labels for all contacts
    examples = []
    label_source_counts = {"db": 0, "bootstrap": 0}
    seniority_counts: dict[str, int] = {}
    department_counts: dict[str, int] = {}
    dm_count = 0

    for contact in contacts:
        label = make_label(contact)
        has_db = bool(contact["seniority"] and contact["department"])
        label_source_counts["db" if has_db else "bootstrap"] += 1

        sen = label["seniority"]
        dept = label["department"]
        seniority_counts[sen] = seniority_counts.get(sen, 0) + 1
        department_counts[dept] = department_counts.get(dept, 0) + 1
        if label["isDecisionMaker"]:
            dm_count += 1

        if not stats_only:
            examples.append(format_example(contact["position"], label))

    if stats_only:
        print(f"  Total contacts: {len(contacts)}")
        print(f"  Label source: DB={label_source_counts['db']}, bootstrap={label_source_counts['bootstrap']}")
        print(f"\n  Seniority distribution:")
        for sen in SENIORITY_LEVELS:
            count = seniority_counts.get(sen, 0)
            pct = count / max(len(contacts), 1) * 100
            print(f"    {sen}: {count} ({pct:.1f}%)")
        print(f"\n  Department distribution:")
        for dept in DEPARTMENTS:
            count = department_counts.get(dept, 0)
            pct = count / max(len(contacts), 1) * 100
            print(f"    {dept}: {count} ({pct:.1f}%)")
        print(f"\n  Decision makers: {dm_count} ({dm_count / max(len(contacts), 1) * 100:.1f}%)")
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

    # Print split label distributions
    print(f"\n  Train set seniority distribution:")
    train_sen: dict[str, int] = {}
    train_dm = 0
    for ex in train:
        label = json.loads(ex["messages"][-1]["content"])
        sen = label["seniority"]
        train_sen[sen] = train_sen.get(sen, 0) + 1
        if label["isDecisionMaker"]:
            train_dm += 1
    for sen in SENIORITY_LEVELS:
        print(f"    {sen}: {train_sen.get(sen, 0)}")
    print(f"    decision makers: {train_dm}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(
        description="Export contact title classification training data for MLX LoRA fine-tuning"
    )
    parser.add_argument("--stats", action="store_true", help="Print counts only")
    parser.add_argument(
        "--out-dir", type=Path, default=Path("mlx-training/data/contact-title")
    )
    args = parser.parse_args()

    print("Neon PostgreSQL:")
    conn = get_conn()

    try:
        contacts = fetch_contacts(conn)
        print(f"  Fetched {len(contacts)} contacts with positions")
    finally:
        conn.close()

    if not contacts:
        print("  No contacts with positions found.", file=sys.stderr)
        sys.exit(1)

    print(f"\nTotal contacts: {len(contacts)}")
    export_data(contacts, args.out_dir, args.stats)

    if not args.stats:
        print(f"\nDone. Training data in {args.out_dir}/")


if __name__ == "__main__":
    main()
