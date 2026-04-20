"""Export structured-extraction training data for the opportunity-score LoRA adapter.

Seeds from the `jobs` table (DeepSeek-pre-labeled role + remote flags + ATS metadata)
and uses a larger LOCAL Qwen as teacher (via mlx_lm.server) to generate the remaining
fields that aren't in the DB: score, tags, seniority, tech_stack, remote_policy,
reward_usd, tldr.

Output schema (per row):
  {
    "score":         0-100,
    "tags":          ["ai", "ml", "rust", "remote-global", "senior", ...],
    "seniority":     "junior"|"mid"|"senior"|"staff"|"principal",
    "tech_stack":    ["python", "pytorch", ...],
    "remote_policy": "remote-global"|"remote-regional"|"hybrid"|"onsite",
    "reward_usd":    number | null,
    "tldr":          "<=160 char summary"
  }

Teacher is local-only per user preference. Defaults to Qwen2.5-7B-Instruct-4bit
served by mlx_lm.server at $LLM_BASE_URL. Fits in ~6GB on M1 16GB.

Usage:
  # Dry run — preview 5 rows
  python3 mlx-training/export_opportunity_labels.py --limit 5 --stats

  # Full export (resumable — cached in data/opportunity-score/_cache.jsonl)
  python3 mlx-training/export_opportunity_labels.py

  # Override teacher model
  LLM_MODEL_TEACHER=mlx-community/Qwen2.5-14B-Instruct-4bit \\
    python3 mlx-training/export_opportunity_labels.py
"""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import time
from pathlib import Path
from typing import Any

import psycopg2
from openai import OpenAI

# ── Constants ────────────────────────────────────────────────────────────────

OPPORTUNITY_SCORE_SYSTEM = (
    "You analyze job descriptions for a senior AI engineer focused on fully "
    "remote worldwide roles. Extract structured fields and score the role's "
    "fit (0-100).\n\n"
    "Fit rubric (target profile: senior AI/ML engineer, remote-global):\n"
    "- 90-100: Senior+ AI/ML, fully remote worldwide, strong stack match\n"
    "- 70-89:  AI/ML but regional-remote, or senior non-AI remote-global\n"
    "- 40-69:  Adjacent (data, MLOps, AI-curious backend), partial remote\n"
    "- 0-39:   Onsite, junior, or unrelated domain\n\n"
    "Tags: short lowercase kebab-case strings. Include at least one of "
    "{ai, ml, llm, data, backend, frontend, devops}; at most one of "
    "{junior, mid, senior, staff, principal}; "
    "one of {remote-global, remote-regional, hybrid, onsite}. "
    "Optional: languages/frameworks (rust, python, pytorch, etc.).\n\n"
    "Output schema (STRICT JSON, no markdown):\n"
    '{"score": int, "tags": [str], "seniority": str, "tech_stack": [str], '
    '"remote_policy": str, "reward_usd": number|null, "tldr": str}'
)

DEFAULT_TEACHER_MODEL = "mlx-community/Qwen2.5-7B-Instruct-4bit"
SEED_QUERY_LIMIT_DEFAULT = 800  # keep training set tractable; 8 epochs × 800 ≈ 1600 iters

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


# ── Seed fetch ───────────────────────────────────────────────────────────────


def fetch_seeds(conn, limit: int) -> list[dict[str, Any]]:
    """Pull jobs rows that have both role and remote labels — the richest seeds.

    Balance 50/50 AI vs non-AI to keep the student's score calibration honest.
    """
    cur = conn.cursor()
    base = """
        SELECT id, title, location, description, company_name,
               role_ai_engineer, ashby_is_remote, workplace_type, country
        FROM jobs
        WHERE description IS NOT NULL
          AND LENGTH(description) > 200
          AND role_source = 'deepseek'
          AND ashby_is_remote IS NOT NULL
          AND {filter}
        ORDER BY random()
        LIMIT %s
    """
    half = limit // 2
    cur.execute(base.format(filter="role_ai_engineer = true"), (half,))
    ai_rows = cur.fetchall()
    cur.execute(base.format(filter="role_ai_engineer = false"), (limit - half,))
    non_ai_rows = cur.fetchall()
    cur.close()

    cols = ["id", "title", "location", "description", "company_name",
            "role_ai_engineer", "ashby_is_remote", "workplace_type", "country"]
    return [dict(zip(cols, r)) for r in ai_rows + non_ai_rows]


# ── Teacher inference (local Qwen via mlx_lm.server) ─────────────────────────


def build_user_msg(seed: dict[str, Any]) -> str:
    desc = strip_html(seed["description"])[:4000]
    hints = []
    if seed.get("role_ai_engineer") is not None:
        hints.append(f"DB hint role_ai_engineer={seed['role_ai_engineer']}")
    if seed.get("ashby_is_remote") is not None:
        hints.append(f"DB hint ashby_is_remote={seed['ashby_is_remote']}")
    if seed.get("workplace_type"):
        hints.append(f"DB hint workplace_type={seed['workplace_type']}")
    if seed.get("country"):
        hints.append(f"DB hint country={seed['country']}")
    hint_block = ("\n\nSTRUCTURED HINTS (trust these):\n- " + "\n- ".join(hints)) if hints else ""

    return (
        f"Title: {seed['title']}\n"
        f"Company: {seed.get('company_name') or 'Unknown'}\n"
        f"Location: {seed.get('location') or 'Unknown'}\n"
        f"Description: {desc}"
        f"{hint_block}"
    )


def call_teacher(client: OpenAI, model: str, user_msg: str) -> dict[str, Any] | None:
    try:
        res = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": OPPORTUNITY_SCORE_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=512,
        )
        content = res.choices[0].message.content or "{}"
        parsed = json.loads(content)
    except (json.JSONDecodeError, KeyError, AttributeError):
        return None
    except Exception as e:  # noqa: BLE001 — teacher failures shouldn't abort the run
        print(f"    teacher error: {e}", file=sys.stderr)
        return None

    # Minimal validation — skip malformed samples rather than train on noise
    if not isinstance(parsed.get("score"), int):
        return None
    if not isinstance(parsed.get("tags"), list) or not parsed["tags"]:
        return None
    if parsed.get("seniority") not in {"junior", "mid", "senior", "staff", "principal"}:
        return None
    if parsed.get("remote_policy") not in {"remote-global", "remote-regional", "hybrid", "onsite"}:
        return None
    parsed["score"] = max(0, min(100, parsed["score"]))
    return parsed


# ── Cache (resumable labeling) ───────────────────────────────────────────────


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
        if "job_id" in entry and "label" in entry:
            out[int(entry["job_id"])] = entry["label"]
    return out


def append_cache(cache_path: Path, job_id: int, label: dict[str, Any]) -> None:
    with open(cache_path, "a") as f:
        f.write(json.dumps({"job_id": job_id, "label": label}) + "\n")


# ── Export ───────────────────────────────────────────────────────────────────


def export(
    conn,
    out_dir: Path,
    limit: int,
    stats_only: bool,
    teacher_model: str,
    teacher_url: str,
) -> None:
    target = out_dir / "opportunity-score"
    target.mkdir(parents=True, exist_ok=True)
    cache_path = target / "_cache.jsonl"

    seeds = fetch_seeds(conn, limit)
    print(f"Seeds fetched: {len(seeds)}")

    if stats_only:
        ai = sum(1 for s in seeds if s["role_ai_engineer"])
        rem = sum(1 for s in seeds if s["ashby_is_remote"])
        print(f"  AI: {ai} / non-AI: {len(seeds) - ai}")
        print(f"  Remote: {rem} / non-remote: {len(seeds) - rem}")
        print(f"  Teacher: {teacher_model} @ {teacher_url}")
        return

    cache = load_cache(cache_path)
    print(f"Cached labels: {len(cache)}")

    client = OpenAI(api_key="local", base_url=teacher_url)
    labeled: list[tuple[dict[str, Any], dict[str, Any]]] = []
    t0 = time.time()

    for i, seed in enumerate(seeds):
        if seed["id"] in cache:
            labeled.append((seed, cache[seed["id"]]))
            continue
        user_msg = build_user_msg(seed)
        label = call_teacher(client, teacher_model, user_msg)
        if label is None:
            continue
        append_cache(cache_path, seed["id"], label)
        labeled.append((seed, label))
        if (i + 1) % 10 == 0:
            elapsed = time.time() - t0
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            print(f"  {i + 1}/{len(seeds)}  ({rate:.2f} rows/s, {len(labeled)} kept)")

    print(f"Labeled: {len(labeled)} rows (teacher took {time.time() - t0:.1f}s)")

    # Stratified 90/10 split on AI flag
    random.seed(42)
    positives = [p for p in labeled if p[0]["role_ai_engineer"]]
    negatives = [p for p in labeled if not p[0]["role_ai_engineer"]]
    random.shuffle(positives)
    random.shuffle(negatives)
    pos_split = int(len(positives) * 0.9)
    neg_split = int(len(negatives) * 0.9)
    train = positives[:pos_split] + negatives[:neg_split]
    valid = positives[pos_split:] + negatives[neg_split:]
    random.shuffle(train)
    random.shuffle(valid)

    for name, subset in [("train", train), ("valid", valid)]:
        path = target / f"{name}.jsonl"
        with open(path, "w") as f:
            for seed, label in subset:
                user_msg = build_user_msg(seed)
                record = {
                    "messages": [
                        {"role": "system", "content": OPPORTUNITY_SCORE_SYSTEM},
                        {"role": "user", "content": user_msg},
                        {"role": "assistant", "content": json.dumps(label)},
                    ]
                }
                f.write(json.dumps(record) + "\n")
        print(f"  {name}: {len(subset)} examples → {path}")


# ── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="Export opportunity-score LoRA training data (local Qwen teacher)")
    parser.add_argument("--out-dir", type=Path, default=Path("mlx-training/data"))
    parser.add_argument("--limit", type=int, default=SEED_QUERY_LIMIT_DEFAULT,
                        help=f"Max seed rows pulled from jobs (default {SEED_QUERY_LIMIT_DEFAULT})")
    parser.add_argument("--stats", action="store_true", help="Print seed counts only, no teacher calls")
    args = parser.parse_args()

    teacher_url = os.environ.get("LLM_BASE_URL")
    if not teacher_url and not args.stats:
        print("ERROR: LLM_BASE_URL not set. Start mlx_lm.server with the teacher model first.", file=sys.stderr)
        print("  e.g.: mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080", file=sys.stderr)
        sys.exit(1)
    teacher_model = os.environ.get("LLM_MODEL_TEACHER", DEFAULT_TEACHER_MODEL)

    conn = get_conn()
    try:
        export(conn, args.out_dir, args.limit, args.stats, teacher_model, teacher_url or "")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
