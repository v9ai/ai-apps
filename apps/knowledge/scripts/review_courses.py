"""Batch course review runner.

Fetches external_courses that have no entry in course_reviews yet,
runs the 10-expert LangGraph pipeline for each, and upserts the result.

Usage:
    # From the repo root or apps/knowledge:
    uv run --project evals scripts/review_courses.py
    uv run --project evals scripts/review_courses.py --limit 10
    uv run --project evals scripts/review_courses.py --provider "DeepLearning.AI"
    uv run --project evals scripts/review_courses.py --dry-run

Options:
    --limit INT       Max courses to review per run (default: 5)
    --provider TEXT   Filter by provider name substring (case-insensitive)
    --dry-run         Print what would be reviewed without running the pipeline
"""

import argparse
import json
import sys
from pathlib import Path

# ── Env & path setup ──────────────────────────────────────────────────────────

_env_path = Path(__file__).resolve().parent.parent / ".env.local"

from dotenv import load_dotenv  # noqa: E402  (installed via pyproject.toml)
load_dotenv(_env_path)

import os  # noqa: E402

DATABASE_URL = os.environ.get("DATABASE_URL", "")
if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL not set in .env.local")

# ── Add evals/ to sys.path so course_review imports work ─────────────────────

sys.path.insert(0, str(Path(__file__).parent.parent / "evals"))

from course_review import build_course_review_graph, CourseReviewState  # noqa: E402

# ── DB helpers ────────────────────────────────────────────────────────────────

import psycopg2  # noqa: E402
import psycopg2.extras  # noqa: E402


def get_connection():
    return psycopg2.connect(DATABASE_URL)


FETCH_SQL = """
SELECT
    ec.id,
    ec.title,
    ec.url,
    ec.provider,
    COALESCE(ec.description, '') AS description,
    COALESCE(ec.level, 'Beginner')  AS level,
    COALESCE(ec.rating, 0.0)        AS rating,
    COALESCE(ec.review_count, 0)    AS review_count,
    COALESCE(ec.duration_hours, 0.0) AS duration_hours,
    ec.is_free
FROM external_courses ec
WHERE NOT EXISTS (
    SELECT 1 FROM course_reviews cr WHERE cr.course_id = ec.id
)
{provider_filter}
ORDER BY ec.created_at
LIMIT %(limit)s
"""

UPSERT_SQL = """
INSERT INTO course_reviews (
    course_id,
    pedagogy_score,
    technical_accuracy_score,
    content_depth_score,
    practical_application_score,
    instructor_clarity_score,
    curriculum_fit_score,
    prerequisites_score,
    ai_domain_relevance_score,
    community_health_score,
    value_proposition_score,
    aggregate_score,
    verdict,
    summary,
    expert_details,
    model_version,
    reviewed_at
)
VALUES (
    %(course_id)s,
    %(pedagogy_score)s,
    %(technical_accuracy_score)s,
    %(content_depth_score)s,
    %(practical_application_score)s,
    %(instructor_clarity_score)s,
    %(curriculum_fit_score)s,
    %(prerequisites_score)s,
    %(ai_domain_relevance_score)s,
    %(community_health_score)s,
    %(value_proposition_score)s,
    %(aggregate_score)s,
    %(verdict)s,
    %(summary)s,
    %(expert_details)s,
    %(model_version)s,
    NOW()
)
ON CONFLICT (course_id) DO UPDATE SET
    pedagogy_score               = EXCLUDED.pedagogy_score,
    technical_accuracy_score     = EXCLUDED.technical_accuracy_score,
    content_depth_score          = EXCLUDED.content_depth_score,
    practical_application_score  = EXCLUDED.practical_application_score,
    instructor_clarity_score     = EXCLUDED.instructor_clarity_score,
    curriculum_fit_score         = EXCLUDED.curriculum_fit_score,
    prerequisites_score          = EXCLUDED.prerequisites_score,
    ai_domain_relevance_score    = EXCLUDED.ai_domain_relevance_score,
    community_health_score       = EXCLUDED.community_health_score,
    value_proposition_score      = EXCLUDED.value_proposition_score,
    aggregate_score              = EXCLUDED.aggregate_score,
    verdict                      = EXCLUDED.verdict,
    summary                      = EXCLUDED.summary,
    expert_details               = EXCLUDED.expert_details,
    model_version                = EXCLUDED.model_version,
    reviewed_at                  = NOW()
"""


def fetch_unreviewed(conn, limit: int, provider: str | None):
    provider_filter = ""
    params: dict = {"limit": limit}

    if provider:
        provider_filter = "AND lower(ec.provider) LIKE %(provider_pattern)s"
        params["provider_pattern"] = f"%{provider.lower()}%"

    sql = FETCH_SQL.format(provider_filter=provider_filter)
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def upsert_review(conn, course_id: str, result: CourseReviewState) -> None:
    """Build expert_details JSONB and insert/update the course_reviews row."""

    expert_keys = [
        "pedagogy_score",
        "technical_accuracy_score",
        "content_depth_score",
        "practical_application_score",
        "instructor_clarity_score",
        "curriculum_fit_score",
        "prerequisites_score",
        "ai_domain_relevance_score",
        "community_health_score",
        "value_proposition_score",
    ]

    expert_details: dict = {}
    for key in expert_keys:
        raw = result.get(key)
        if isinstance(raw, dict):
            expert_details[key] = raw

    def _score(key: str) -> int | None:
        raw = result.get(key)
        if isinstance(raw, dict):
            return int(raw.get("score", 0))
        return None

    params = {
        "course_id": course_id,
        "pedagogy_score":               _score("pedagogy_score"),
        "technical_accuracy_score":     _score("technical_accuracy_score"),
        "content_depth_score":          _score("content_depth_score"),
        "practical_application_score":  _score("practical_application_score"),
        "instructor_clarity_score":     _score("instructor_clarity_score"),
        "curriculum_fit_score":         _score("curriculum_fit_score"),
        "prerequisites_score":          _score("prerequisites_score"),
        "ai_domain_relevance_score":    _score("ai_domain_relevance_score"),
        "community_health_score":       _score("community_health_score"),
        "value_proposition_score":      _score("value_proposition_score"),
        "aggregate_score":              result.get("aggregate_score"),
        "verdict":                      result.get("verdict"),
        "summary":                      result.get("summary"),
        "expert_details":               json.dumps(expert_details),
        "model_version":                "deepseek-chat",
    }

    with conn.cursor() as cur:
        cur.execute(UPSERT_SQL, params)
    conn.commit()


# ── Pipeline runner ───────────────────────────────────────────────────────────

def build_state(row) -> CourseReviewState:
    return CourseReviewState(
        course_id=str(row["id"]),
        course_title=row["title"],
        course_url=row["url"],
        course_provider=row["provider"],
        course_description=row["description"],
        course_level=row["level"],
        course_rating=float(row["rating"]),
        course_review_count=int(row["review_count"]),
        course_duration_hours=float(row["duration_hours"]),
        course_is_free=bool(row["is_free"]),
        # Expert score fields — required by TypedDict but populated by graph
        pedagogy_score={},               # type: ignore[typeddict-item]
        technical_accuracy_score={},     # type: ignore[typeddict-item]
        content_depth_score={},          # type: ignore[typeddict-item]
        practical_application_score={},  # type: ignore[typeddict-item]
        instructor_clarity_score={},     # type: ignore[typeddict-item]
        curriculum_fit_score={},         # type: ignore[typeddict-item]
        prerequisites_score={},          # type: ignore[typeddict-item]
        ai_domain_relevance_score={},    # type: ignore[typeddict-item]
        community_health_score={},       # type: ignore[typeddict-item]
        value_proposition_score={},      # type: ignore[typeddict-item]
        # Aggregated fields — set by aggregator_node
        aggregate_score=0.0,
        verdict="",
        summary="",
        top_strengths=[],
        key_weaknesses=[],
    )


def run_review(row, graph) -> CourseReviewState:
    state = build_state(row)
    result: CourseReviewState = graph.invoke(state)
    return result


# ── CLI ───────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch-review external_courses that have no course_review yet."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=5,
        metavar="INT",
        help="Max courses to review per run (default: 5)",
    )
    parser.add_argument(
        "--provider",
        type=str,
        default=None,
        metavar="TEXT",
        help="Filter by provider name substring (case-insensitive)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be reviewed without running the pipeline",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    conn = get_connection()
    try:
        courses = fetch_unreviewed(conn, limit=args.limit, provider=args.provider)
    finally:
        conn.close()

    if not courses:
        print("No unreviewed courses found.")
        return

    provider_msg = f" (provider filter: '{args.provider}')" if args.provider else ""
    print(f"Found {len(courses)} unreviewed course(s){provider_msg}.")

    if args.dry_run:
        print("\n-- DRY RUN — no pipeline will be executed --\n")
        for i, row in enumerate(courses, 1):
            free_label = "free" if row["is_free"] else "paid"
            print(
                f"  [{i}] {row['title']}\n"
                f"       provider : {row['provider']}\n"
                f"       level    : {row['level']}\n"
                f"       rating   : {row['rating']}  ({row['review_count']} reviews)\n"
                f"       duration : {row['duration_hours']}h  [{free_label}]\n"
                f"       id       : {row['id']}\n"
            )
        return

    graph = build_course_review_graph()
    conn = get_connection()
    try:
        for i, row in enumerate(courses, 1):
            print(
                f"\n[{i}/{len(courses)}] Reviewing: {row['title']} ({row['provider']}) …"
            )
            try:
                result = run_review(row, graph)
                upsert_review(conn, str(row["id"]), result)
                print(
                    f"  verdict={result.get('verdict', '?')}  "
                    f"score={result.get('aggregate_score', '?'):.2f}  "
                    f"saved to course_reviews."
                )
            except Exception as exc:
                print(f"  ERROR reviewing course {row['id']}: {exc}")
                conn.rollback()
    finally:
        conn.close()

    print("\nDone.")


if __name__ == "__main__":
    main()
