"""Export structured-extraction training data for the opportunity-score LoRA adapter.

Seeds from the `jobs` table, which has rich curated signals we use as GOLD:

  - jobs.status ∈ {eu-remote, non-eu, role-nomatch} (user-curated in old EU flow)
  - jobs.role_ai_engineer (DeepSeek-labeled, 1,289 rows)
  - jobs.ashby_is_remote, jobs.workplace_type, jobs.country (ATS metadata)
  - jobs.ashby_compensation (JSON with compensationTierSummary: "$170K – $190K")
  - jobs.salary_min / jobs.salary_max / jobs.salary_currency

`score` (0-100) and `reward_usd` are derived DETERMINISTICALLY from those fields —
no teacher call needed, no risk of model drift. Teacher only generates:
  {tags, seniority, tech_stack, remote_policy, tldr}

User pivoted from remote-EU to remote-global (see memory
`project_leadgen_scope_global.md`), so the scoring rubric here treats any
fully-remote AI role as qualified regardless of EU.

Teacher is local-only (mlx_lm.server, default Qwen2.5-7B-Instruct-4bit).

Output schema:
  {"score": int, "tags": [str], "seniority": "junior"|"mid"|"senior"|"staff"|"principal",
   "tech_stack": [str], "remote_policy": "remote-global"|"remote-regional"|"hybrid"|"onsite",
   "reward_usd": number|null, "tldr": "<=200 char summary"}

Usage:
  python3 mlx-training/export_opportunity_labels.py --stats       # preview counts
  python3 mlx-training/export_opportunity_labels.py               # full export
  python3 mlx-training/export_opportunity_labels.py --limit 200   # smaller run
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

# The teacher only fills fields the DB doesn't have. Score + reward are derived.
OPPORTUNITY_SHAPE_SYSTEM = (
    "You extract structured fields from a job description for a senior AI engineer "
    "focused on fully remote worldwide roles.\n\n"
    "Extract ONLY these fields (score and reward_usd are NOT your job):\n"
    "- tags: short lowercase kebab-case strings (at least one of "
    "{ai, ml, llm, data, backend, frontend, devops}; at most one of "
    "{junior, mid, senior, staff, principal}; one of "
    "{remote-global, remote-regional, hybrid, onsite}; plus optional "
    "languages/frameworks (rust, python, pytorch, etc.))\n"
    "- seniority: junior | mid | senior | staff | principal\n"
    "- tech_stack: lowercase frameworks/languages/tools (e.g. python, pytorch, kubernetes)\n"
    "- remote_policy: remote-global | remote-regional | hybrid | onsite\n"
    "- tldr: <=200 char summary of the role\n\n"
    'Output STRICT JSON, no markdown: {"tags": [str], "seniority": str, '
    '"tech_stack": [str], "remote_policy": str, "tldr": str}'
)

DEFAULT_TEACHER_MODEL = "mlx-community/Qwen2.5-7B-Instruct-4bit"
# All usable rows fit; MLX pads to batch-max so unused seq length is free.
SEED_QUERY_LIMIT_DEFAULT = 1800

SENIORITY_VALUES = {"junior", "mid", "senior", "staff", "principal"}
REMOTE_POLICY_VALUES = {"remote-global", "remote-regional", "hybrid", "onsite"}

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


# ── Deterministic label derivation ───────────────────────────────────────────

# Rough currency → USD (stable enough for training labels; refined at inference time)
CURRENCY_TO_USD = {
    "USD": 1.0, "EUR": 1.10, "GBP": 1.26, "CAD": 0.74, "AUD": 0.66,
    "CHF": 1.12, "SEK": 0.096, "NOK": 0.093, "DKK": 0.145,
}

_COMP_SUMMARY_RE = re.compile(
    r"([A-Z]{0,3}\$?€?£?)\s*([\d,.]+)\s*[Kk]?\s*[–\-—]\s*([A-Z]{0,3}\$?€?£?)?\s*([\d,.]+)\s*[Kk]?"
)
_SYMBOL_TO_CCY = {"$": "USD", "€": "EUR", "£": "GBP"}


def parse_ashby_comp_summary(summary: str | None) -> float | None:
    """Extract a USD midpoint from strings like '$170K – $190K' or '€100K – €130K'."""
    if not summary:
        return None
    m = _COMP_SUMMARY_RE.search(summary)
    if not m:
        return None
    prefix1, lo_s, prefix2, hi_s = m.groups()
    try:
        lo = float(lo_s.replace(",", ""))
        hi = float(hi_s.replace(",", ""))
    except ValueError:
        return None
    if "K" in summary or "k" in summary:
        if lo < 1000:
            lo *= 1000
        if hi < 1000:
            hi *= 1000
    ccy = "USD"
    for sym, code in _SYMBOL_TO_CCY.items():
        if sym in (prefix1 or "") or sym in (prefix2 or ""):
            ccy = code
            break
    mid = (lo + hi) / 2
    return round(mid * CURRENCY_TO_USD.get(ccy, 1.0))


def derive_reward_usd(seed: dict[str, Any]) -> float | None:
    # 1. Structured salary_min/max take precedence (only 32 rows have it, but they're accurate)
    lo, hi, ccy = seed.get("salary_min"), seed.get("salary_max"), seed.get("salary_currency")
    if lo or hi:
        vals = [v for v in (lo, hi) if v]
        if vals:
            mid = sum(vals) / len(vals)
            rate = CURRENCY_TO_USD.get((ccy or "USD").upper(), 1.0)
            return round(mid * rate)
    # 2. Ashby compensation JSON summary
    comp_raw = seed.get("ashby_compensation")
    if comp_raw:
        try:
            comp = json.loads(comp_raw)
            summary = comp.get("compensationTierSummary")
            if summary:
                return parse_ashby_comp_summary(summary)
        except (json.JSONDecodeError, AttributeError):
            pass
    return None


def derive_score(seed: dict[str, Any]) -> int:
    """0-100 fit score for 'senior AI engineer, remote-global'.

    User pivoted from remote-EU to remote-global, so old `status=non-eu` jobs
    that ARE fully remote now qualify — score reflects that re-interpretation.
    """
    ai = bool(seed.get("role_ai_engineer"))
    status = seed.get("status") or ""
    ashby_remote = bool(seed.get("ashby_is_remote"))
    wp = (seed.get("workplace_type") or "").lower()
    is_remote = ashby_remote or wp == "remote"
    is_hybrid = wp == "hybrid"

    # AI role × fully remote (regardless of EU) → strong positive under global ICP
    if ai and is_remote:
        return 88 if status == "eu-remote" else 78
    # AI role, hybrid → meh
    if ai and is_hybrid:
        return 50
    # AI role, onsite only
    if ai:
        return 30
    # Non-AI but fully remote — low but not zero (user may broaden later)
    if is_remote and status == "eu-remote":
        return 40
    if is_remote:
        return 30
    # role-nomatch + onsite + non-AI = floor
    return 10


def derive_remote_policy(seed: dict[str, Any]) -> str | None:
    wp = (seed.get("workplace_type") or "").lower()
    if wp == "remote" or seed.get("ashby_is_remote"):
        country = seed.get("country")
        # Without explicit "worldwide" we conservatively mark regional.
        return "remote-regional" if country else "remote-global"
    if wp == "hybrid":
        return "hybrid"
    if wp in ("office", "onsite", "on-site"):
        return "onsite"
    return None  # let teacher decide


# ── Seed fetch ───────────────────────────────────────────────────────────────


def fetch_seeds(conn, limit: int) -> list[dict[str, Any]]:
    """Pull all usable rows. Stratify client-side by status × role_ai for balance."""
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, location, description, company_name,
               role_ai_engineer, ashby_is_remote, workplace_type, country,
               ashby_employment_type, ashby_compensation,
               salary_min, salary_max, salary_currency, status
        FROM jobs
        WHERE description IS NOT NULL
          AND LENGTH(description) > 200
        ORDER BY random()
        LIMIT %s
    """, (limit,))
    cols = ["id", "title", "location", "description", "company_name",
            "role_ai_engineer", "ashby_is_remote", "workplace_type", "country",
            "ashby_employment_type", "ashby_compensation",
            "salary_min", "salary_max", "salary_currency", "status"]
    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    cur.close()
    return rows


# ── Teacher inference (local Qwen via mlx_lm.server) ─────────────────────────


def build_user_msg(seed: dict[str, Any]) -> str:
    desc = strip_html(seed["description"])[:4000]
    hints: list[str] = []
    if seed.get("workplace_type"):
        hints.append(f"workplace_type={seed['workplace_type']}")
    if seed.get("ashby_is_remote") is not None:
        hints.append(f"ashby_is_remote={seed['ashby_is_remote']}")
    if seed.get("ashby_employment_type"):
        hints.append(f"employment={seed['ashby_employment_type']}")
    if seed.get("country"):
        hints.append(f"country={seed['country']}")
    hint_block = ("\n\nATS HINTS: " + ", ".join(hints)) if hints else ""
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
                {"role": "system", "content": OPPORTUNITY_SHAPE_SYSTEM},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=384,
        )
        content = res.choices[0].message.content or "{}"
        parsed = json.loads(content)
    except (json.JSONDecodeError, KeyError, AttributeError):
        return None
    except Exception as e:  # noqa: BLE001
        print(f"    teacher error: {e}", file=sys.stderr)
        return None

    if not isinstance(parsed.get("tags"), list) or not parsed["tags"]:
        return None
    if parsed.get("seniority") not in SENIORITY_VALUES:
        return None
    if parsed.get("remote_policy") not in REMOTE_POLICY_VALUES:
        return None
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


# ── Full label assembly ──────────────────────────────────────────────────────


def assemble_label(seed: dict[str, Any], teacher: dict[str, Any]) -> dict[str, Any]:
    """Combine DB-derived (score, reward_usd, remote_policy) with teacher shape fields."""
    remote_policy = derive_remote_policy(seed) or teacher.get("remote_policy", "onsite")
    # DB signals override teacher on remote_policy when present — the teacher tends
    # to over-mark remote-global from buzzwords.
    return {
        "score": derive_score(seed),
        "tags": teacher["tags"][:12],
        "seniority": teacher["seniority"],
        "tech_stack": teacher.get("tech_stack", [])[:15],
        "remote_policy": remote_policy,
        "reward_usd": derive_reward_usd(seed),
        "tldr": (teacher.get("tldr", "") or "")[:200],
    }


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
        # Preview the deterministic score distribution + gold label sources
        buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        rewards = 0
        rp_counts: dict[str, int] = {}
        for s in seeds:
            sc = derive_score(s)
            for k in buckets:
                lo, hi = (int(x) for x in k.split("-"))
                if lo <= sc <= hi:
                    buckets[k] += 1
                    break
            if derive_reward_usd(s) is not None:
                rewards += 1
            rp = derive_remote_policy(s)
            if rp:
                rp_counts[rp] = rp_counts.get(rp, 0) + 1
        print("Derived score distribution:")
        for k, v in buckets.items():
            print(f"  {k}: {v}")
        print(f"Reward_usd derivable on: {rewards} / {len(seeds)}")
        print(f"Remote policy pre-resolved: {rp_counts} (rest → teacher)")
        print(f"Teacher: {teacher_model} @ {teacher_url}")
        return

    cache = load_cache(cache_path)
    print(f"Cached labels: {len(cache)}")

    client = OpenAI(api_key="local", base_url=teacher_url)
    labeled: list[tuple[dict[str, Any], dict[str, Any]]] = []
    t0 = time.time()

    for i, seed in enumerate(seeds):
        job_id = seed["id"]
        if job_id in cache:
            assembled = assemble_label(seed, cache[job_id])
            labeled.append((seed, assembled))
            continue
        user_msg = build_user_msg(seed)
        teacher = call_teacher(client, teacher_model, user_msg)
        if teacher is None:
            continue
        append_cache(cache_path, job_id, teacher)
        labeled.append((seed, assemble_label(seed, teacher)))
        if (i + 1) % 10 == 0:
            elapsed = time.time() - t0
            rate = (i + 1) / elapsed if elapsed > 0 else 0
            print(f"  {i + 1}/{len(seeds)}  ({rate:.2f} rows/s, {len(labeled)} kept)")

    print(f"Labeled: {len(labeled)} rows (teacher took {time.time() - t0:.1f}s)")

    # Stratified 90/10 split over derived score buckets — keeps all bins in val
    random.seed(42)
    def bucket(score: int) -> int:
        return min(4, score // 20)
    by_bucket: dict[int, list[tuple[dict[str, Any], dict[str, Any]]]] = {}
    for pair in labeled:
        by_bucket.setdefault(bucket(pair[1]["score"]), []).append(pair)
    train: list[tuple[dict[str, Any], dict[str, Any]]] = []
    valid: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for b, rows in by_bucket.items():
        random.shuffle(rows)
        cut = int(len(rows) * 0.9)
        train.extend(rows[:cut])
        valid.extend(rows[cut:])
    random.shuffle(train)
    random.shuffle(valid)

    for name, subset in [("train", train), ("valid", valid)]:
        path = target / f"{name}.jsonl"
        with open(path, "w") as f:
            for seed, label in subset:
                user_msg = build_user_msg(seed)
                record = {
                    "messages": [
                        # Student is taught the full rubric including score — even though
                        # the label's score came from DB signals. This transfers the signal.
                        {"role": "system", "content": OPPORTUNITY_FULL_SYSTEM},
                        {"role": "user", "content": user_msg},
                        {"role": "assistant", "content": json.dumps(label)},
                    ]
                }
                f.write(json.dumps(record) + "\n")
        print(f"  {name}: {len(subset)} examples → {path}")


# The full system prompt the student learns (matches src/ml/opportunity-classifier.ts)
OPPORTUNITY_FULL_SYSTEM = (
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


# ── Main ─────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export opportunity-score LoRA training data (local Qwen teacher + DB-derived gold)"
    )
    parser.add_argument("--out-dir", type=Path, default=Path("mlx-training/data"))
    parser.add_argument("--limit", type=int, default=SEED_QUERY_LIMIT_DEFAULT,
                        help=f"Max seed rows pulled from jobs (default {SEED_QUERY_LIMIT_DEFAULT})")
    parser.add_argument("--stats", action="store_true",
                        help="Print derived-label counts only, no teacher calls")
    args = parser.parse_args()

    teacher_url = os.environ.get("LLM_BASE_URL")
    if not teacher_url and not args.stats:
        print("ERROR: LLM_BASE_URL not set. Start mlx_lm.server with the teacher model first.",
              file=sys.stderr)
        print("  e.g.: mlx_lm.server --model mlx-community/Qwen2.5-7B-Instruct-4bit --port 8080",
              file=sys.stderr)
        sys.exit(1)
    teacher_model = os.environ.get("LLM_MODEL_TEACHER", DEFAULT_TEACHER_MODEL)

    conn = get_conn()
    try:
        export(conn, args.out_dir, args.limit, args.stats, teacher_model, teacher_url or "")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
