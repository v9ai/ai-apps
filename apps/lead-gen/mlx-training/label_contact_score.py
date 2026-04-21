"""Export contact-score LoRA training data as JSONL for Llama-3.1-8B fine-tuning.

Sources: Neon PostgreSQL. Teacher: local Qwen via mlx_lm.server (OpenAI-compatible).
Output: train/val/test JSONL stratified by tier at
``mlx-training/datasets/contact_score/``.

Pipeline:
 1. Pull contacts from Neon, filter to plausible outreach targets
    (is_decision_maker, authority_score > 0.6, or any reply activity).
 2. Serialize each to the ~300-token profile format the LoRA expects.
 3. Apply deterministic gold-label overrides from DB signals
    (replied/interested/meeting_scheduled → A; bounced/not_interested → D).
 4. For the uncertain middle, call local Qwen-7B with a tier rubric system
    prompt and few-shot examples (temperature 0.2, JSON mode).
 5. Write stratified 80/10/10 train/val/test JSONL in OpenAI chat format.

Usage:
    mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080 &
    export LLM_BASE_URL=http://127.0.0.1:8080/v1
    export NEON_DATABASE_URL='postgres://…'
    python3 mlx-training/label_contact_score.py
    python3 mlx-training/label_contact_score.py --stats          # counts only
    python3 mlx-training/label_contact_score.py --limit 1000

Cache: ``datasets/contact_score/_cache.jsonl`` — resumable across runs.
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path
from typing import Any

from openai import OpenAI

# ── Constants ────────────────────────────────────────────────────────────────

DEFAULT_TEACHER_MODEL = "mlx-community/Qwen2.5-7B-Instruct-4bit"
DEFAULT_OUT_DIR = Path("mlx-training/datasets/contact_score")
DEFAULT_LIMIT = 10_000
CONCURRENCY = 1  # mlx_lm.server is single-stream on M1

TIERS = ("A", "B", "C", "D")

# Rubric shared between teacher (labeling) and student (LoRA). Must match
# the system prompt in apps/lead-gen/backend/src/index.js so the LoRA sees the
# same spec at inference that it saw at training time.
SCORE_SYSTEM = """You rate B2B sales contacts on fit for outreach. Output strict JSON only, no prose.
Schema: {"tier": "A"|"B"|"C"|"D", "score": number in [0,1], "reasons": string[] (1-3 items)}
Tier rubric:
- A: decision-maker at ICP-fit company, strong signal (title, past roles, technical depth)
- B: influencer or junior decision-maker; clear buying role but not final authority
- C: relevant but indirect (adjacent role, unclear authority)
- D: wrong role / wrong company / low signal / likely bounce"""


FEW_SHOT = [
    {
        "role": "user",
        "content": (
            "NAME: Jane Doe\n"
            "TITLE: VP Engineering\n"
            "COMPANY: Acme AI (series_b), 120 employees\n"
            "COMPANY_DESC: ML platform and LLM infrastructure for enterprise.\n"
            "BIO: Led ML platform team at 2 prior AI startups. NeurIPS 2023 co-author.\n"
            "SKILLS: Python, PyTorch, Kubernetes, LLM ops\n"
            "SENIORITY: VP\nDEPARTMENT: Engineering\nAUTHORITY_SCORE: 0.85"
        ),
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "tier": "A",
            "score": 0.92,
            "reasons": [
                "VP Engineering — final technical authority at an ICP-fit AI company",
                "Prior ML platform leadership → buys tooling in this space",
                "NeurIPS author → evaluates rigor, credible technical peer",
            ],
        }),
    },
    {
        "role": "user",
        "content": (
            "NAME: John Smith\n"
            "TITLE: Senior Talent Partner\n"
            "COMPANY: Acme AI (series_b), 120 employees\n"
            "SENIORITY: Senior\nDEPARTMENT: HR/Recruiting\nAUTHORITY_SCORE: 0.10"
        ),
    },
    {
        "role": "assistant",
        "content": json.dumps({
            "tier": "D",
            "score": 0.08,
            "reasons": [
                "HR/Recruiting — gatekeeper, not a budget holder",
                "No technical or purchasing authority for ML tooling",
            ],
        }),
    },
]


# ── DB connection ───────────────────────────────────────────────────────────


def get_conn():
    url = os.environ.get("NEON_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        print("ERROR: Set NEON_DATABASE_URL or DATABASE_URL", file=sys.stderr)
        sys.exit(1)
    try:
        import psycopg2
        return psycopg2.connect(url)
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: Cannot connect to Neon: {e}", file=sys.stderr)
        sys.exit(1)


# ── Contact fetching ────────────────────────────────────────────────────────


FETCH_SQL = """
    SELECT c.id, c.first_name, c.last_name, c.position, c.linkedin_url, c.github_handle,
           c.seniority, c.department, c.is_decision_maker, c.authority_score,
           c.ai_profile, c.conversation_stage,
           co.name AS company_name, co.website AS company_website,
           co.description AS company_description, co.size AS company_size,
           -- gold label signals
           (SELECT string_agg(DISTINCT classification, ',') FROM received_emails re
              WHERE re.contact_id = c.id AND classification IS NOT NULL) AS received_classifications,
           (SELECT bool_or(reply_received) FROM contact_emails ce
              WHERE ce.contact_id = c.id) AS any_reply,
           (SELECT string_agg(DISTINCT reply_classification, ',') FROM contact_emails ce
              WHERE ce.contact_id = c.id AND reply_classification IS NOT NULL) AS reply_classifications
    FROM contacts c
    LEFT JOIN companies co ON co.id = c.company_id
    WHERE c.position IS NOT NULL AND trim(c.position) != ''
      AND (
           c.is_decision_maker = true
           OR COALESCE(c.authority_score, 0) > 0.6
           OR c.conversation_stage IS NOT NULL
      )
    ORDER BY c.id
    LIMIT %s
"""


def fetch_contacts(conn, limit: int) -> list[dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(FETCH_SQL, (limit,))
    cols = [d[0] for d in cur.description or []]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    cur.close()
    return rows


# ── Profile serialization (must match backend _load_profile exactly) ────────


def serialize_profile(rec: dict[str, Any]) -> str:
    ai_profile: dict[str, Any] = {}
    raw_ai = rec.get("ai_profile")
    if isinstance(raw_ai, str) and raw_ai:
        try:
            ai_profile = json.loads(raw_ai)
        except json.JSONDecodeError:
            ai_profile = {}
    elif isinstance(raw_ai, dict):
        ai_profile = raw_ai

    lines = [
        f"NAME: {(rec.get('first_name') or '')} {(rec.get('last_name') or '')}".strip(),
        f"TITLE: {rec.get('position') or 'unknown'}",
        f"COMPANY: {rec.get('company_name') or 'unknown'}"
        + (f", {rec.get('company_size')} employees" if rec.get("company_size") else ""),
    ]
    if rec.get("company_description"):
        lines.append(f"COMPANY_DESC: {rec['company_description'][:240]}")
    if rec.get("linkedin_url"):
        lines.append(f"LINKEDIN: {rec['linkedin_url']}")
    if rec.get("github_handle"):
        lines.append(f"GITHUB: {rec['github_handle']}")
    if ai_profile.get("linkedinHeadline") or ai_profile.get("linkedin_headline"):
        lines.append(f"HEADLINE: {ai_profile.get('linkedinHeadline') or ai_profile.get('linkedin_headline')}")
    bio = ai_profile.get("linkedinBio") or ai_profile.get("linkedin_bio")
    if bio:
        lines.append(f"BIO: {bio[:400]}")
    if ai_profile.get("skills"):
        lines.append("SKILLS: " + ", ".join(ai_profile["skills"][:12]))
    if ai_profile.get("experienceLevel") or ai_profile.get("experience_level"):
        lines.append(f"EXPERIENCE_LEVEL: {ai_profile.get('experienceLevel') or ai_profile.get('experience_level')}")
    if rec.get("seniority"):
        lines.append(f"SENIORITY: {rec['seniority']}")
    if rec.get("department"):
        lines.append(f"DEPARTMENT: {rec['department']}")
    if rec.get("authority_score") is not None:
        lines.append(f"AUTHORITY_SCORE: {float(rec['authority_score']):.2f}")
    return "\n".join(lines)


# ── Gold-label overrides ────────────────────────────────────────────────────

# High-confidence signals that bypass the teacher entirely.

REPLIED_POSITIVE = {"interested", "info_request"}
REPLIED_NEGATIVE = {"not_interested", "unsubscribe", "bounced"}


def gold_label(rec: dict[str, Any]) -> dict[str, Any] | None:
    """Return a label dict if DB signals are decisive, else None (defer to teacher)."""
    stage = (rec.get("conversation_stage") or "").lower()
    if stage in {"replied_interested", "meeting_scheduled", "won"}:
        return {
            "tier": "A",
            "score": 0.95,
            "reasons": [f"gold:conversation_stage={stage}"],
        }
    if stage in {"not_interested", "unsubscribed", "bounced", "lost"}:
        return {
            "tier": "D",
            "score": 0.05,
            "reasons": [f"gold:conversation_stage={stage}"],
        }

    replies = set((rec.get("reply_classifications") or "").lower().split(",")) - {""}
    if replies & REPLIED_POSITIVE:
        return {
            "tier": "A",
            "score": 0.90,
            "reasons": [f"gold:reply={sorted(replies & REPLIED_POSITIVE)[0]}"],
        }
    if replies & REPLIED_NEGATIVE:
        return {
            "tier": "D",
            "score": 0.08,
            "reasons": [f"gold:reply={sorted(replies & REPLIED_NEGATIVE)[0]}"],
        }

    received = set((rec.get("received_classifications") or "").lower().split(",")) - {""}
    if received & REPLIED_NEGATIVE:
        return {
            "tier": "D",
            "score": 0.10,
            "reasons": [f"gold:received={sorted(received & REPLIED_NEGATIVE)[0]}"],
        }
    return None


# ── Teacher ─────────────────────────────────────────────────────────────────


def call_teacher(client: OpenAI, model: str, profile: str) -> dict[str, Any] | None:
    messages = [{"role": "system", "content": SCORE_SYSTEM}, *FEW_SHOT, {"role": "user", "content": profile}]
    try:
        res = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=256,
        )
        parsed = json.loads(res.choices[0].message.content or "{}")
    except (json.JSONDecodeError, KeyError, AttributeError):
        return None
    except Exception as e:  # noqa: BLE001
        print(f"    teacher error: {e}", file=sys.stderr)
        return None

    tier = str(parsed.get("tier", "")).upper()
    if tier not in TIERS:
        return None
    try:
        score = float(parsed.get("score", 0.0))
    except (TypeError, ValueError):
        return None
    reasons = parsed.get("reasons") or []
    if not isinstance(reasons, list) or not reasons:
        return None
    reasons = [str(r) for r in reasons if isinstance(r, (str, int, float))][:5]
    return {"tier": tier, "score": max(0.0, min(1.0, score)), "reasons": reasons}


# ── Cache (resumable labeling) ──────────────────────────────────────────────


def load_cache(cache_path: Path) -> dict[int, dict[str, Any]]:
    if not cache_path.exists():
        return {}
    out: dict[int, dict[str, Any]] = {}
    for line in cache_path.read_text().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if "contact_id" in entry and "label" in entry:
            out[int(entry["contact_id"])] = entry["label"]
    return out


def append_cache(cache_path: Path, contact_id: int, label: dict[str, Any]) -> None:
    with open(cache_path, "a") as f:
        f.write(json.dumps({"contact_id": contact_id, "label": label}) + "\n")


# ── Split + write ───────────────────────────────────────────────────────────


def stratified_split(
    pairs: list[tuple[str, dict[str, Any]]],
    seed: int = 42,
) -> tuple[list, list, list]:
    """80/10/10 split stratified by tier."""
    rng = random.Random(seed)
    by_tier: dict[str, list] = {t: [] for t in TIERS}
    for profile, label in pairs:
        by_tier[label["tier"]].append((profile, label))

    train, val, test = [], [], []
    for tier in TIERS:
        items = by_tier[tier]
        rng.shuffle(items)
        n = len(items)
        if n == 0:
            continue
        n_val = max(1, n // 10) if n >= 10 else 0
        n_test = max(1, n // 10) if n >= 10 else 0
        n_train = n - n_val - n_test
        train.extend(items[:n_train])
        val.extend(items[n_train : n_train + n_val])
        test.extend(items[n_train + n_val :])
    rng.shuffle(train)
    rng.shuffle(val)
    rng.shuffle(test)
    return train, val, test


def write_jsonl(path: Path, pairs: list[tuple[str, dict[str, Any]]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        for profile, label in pairs:
            record = {
                "messages": [
                    {"role": "system", "content": SCORE_SYSTEM},
                    {"role": "user", "content": profile},
                    {"role": "assistant", "content": json.dumps(label)},
                ]
            }
            f.write(json.dumps(record) + "\n")


# ── Main ────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Label contacts for LoRA training (local Qwen teacher + DB gold signals)"
    )
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT_DIR)
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT,
                        help=f"Max contacts fetched (default {DEFAULT_LIMIT})")
    parser.add_argument("--stats", action="store_true",
                        help="Print bucket counts only, no teacher calls, no file write")
    args = parser.parse_args()

    teacher_url = os.environ.get("LLM_BASE_URL")
    if not teacher_url and not args.stats:
        print("ERROR: LLM_BASE_URL not set. Start mlx_lm.server first.", file=sys.stderr)
        print("  mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080", file=sys.stderr)
        print("  export LLM_BASE_URL=http://127.0.0.1:8080/v1", file=sys.stderr)
        sys.exit(1)
    teacher_model = os.environ.get("LLM_MODEL_TEACHER", DEFAULT_TEACHER_MODEL)

    conn = get_conn()
    try:
        rows = fetch_contacts(conn, args.limit)
    finally:
        conn.close()
    print(f"Contacts fetched: {len(rows)}")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    cache_path = args.out_dir / "_cache.jsonl"
    cache = load_cache(cache_path)
    if cache:
        print(f"Cache: {len(cache)} already-labeled contacts will be reused.")

    client: OpenAI | None = None
    if not args.stats:
        client = OpenAI(api_key="local", base_url=teacher_url or "http://127.0.0.1:8080/v1")

    pairs: list[tuple[str, dict[str, Any]]] = []
    gold_used = 0
    teacher_used = 0
    teacher_failed = 0

    for rec in rows:
        profile = serialize_profile(rec)
        if args.stats:
            pairs.append((profile, {"tier": "?", "score": 0.0, "reasons": []}))
            continue

        cid = int(rec["id"])
        if cid in cache:
            pairs.append((profile, cache[cid]))
            continue

        gold = gold_label(rec)
        if gold is not None:
            append_cache(cache_path, cid, gold)
            pairs.append((profile, gold))
            gold_used += 1
            continue

        assert client is not None
        teacher = call_teacher(client, teacher_model, profile)
        if teacher is None:
            teacher_failed += 1
            continue
        append_cache(cache_path, cid, teacher)
        pairs.append((profile, teacher))
        teacher_used += 1
        if (gold_used + teacher_used) % 50 == 0:
            print(f"  labeled {gold_used + teacher_used}/{len(rows)} (gold={gold_used} teacher={teacher_used} failed={teacher_failed})")

    # Stats summary (always print)
    counts = {t: 0 for t in TIERS}
    for _, label in pairs:
        t = label.get("tier", "?")
        if t in counts:
            counts[t] += 1
    print(f"\nTotal labels: {len(pairs)} (gold={gold_used} teacher={teacher_used} failed={teacher_failed})")
    print(f"Tier breakdown: A={counts['A']} B={counts['B']} C={counts['C']} D={counts['D']}")

    if args.stats:
        return

    train, val, test = stratified_split(pairs)
    write_jsonl(args.out_dir / "train.jsonl", train)
    write_jsonl(args.out_dir / "val.jsonl", val)
    write_jsonl(args.out_dir / "test.jsonl", test)
    print(f"\nWrote: train={len(train)} val={len(val)} test={len(test)} → {args.out_dir}")


if __name__ == "__main__":
    main()
