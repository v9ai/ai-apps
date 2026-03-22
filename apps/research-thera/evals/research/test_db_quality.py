"""DB-backed evals for stored research quality.

These tests query the real Neon database and validate that persisted
research papers meet quality criteria. They catch issues in the LangGraph
agent path that the unit-level pipeline evals don't cover.

Run: cd evals/research && uv run pytest test_db_quality.py -v
Requires: NEON_DATABASE_URL in .env.local
"""

import json
import os
from pathlib import Path

import psycopg
import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from dotenv import load_dotenv

from deepseek_model import DeepSeekModel

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

NEON_URL = os.getenv("NEON_DATABASE_URL", "")
model = DeepSeekModel()


def _get_conn():
    if not NEON_URL:
        pytest.skip("NEON_DATABASE_URL not set")
    return psycopg.connect(NEON_URL)


# ---------------------------------------------------------------------------
# Fixtures: load goals with their research papers from DB
# ---------------------------------------------------------------------------


def _fetch_goals_with_research():
    """Fetch all goals that have research papers."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT g.id, g.title, g.description,
                   fm.first_name, fm.age_years
            FROM goals g
            LEFT JOIN family_members fm ON g.family_member_id = fm.id
            WHERE EXISTS (
                SELECT 1 FROM therapy_research tr WHERE tr.goal_id = g.id
            )
            ORDER BY g.id
        """)
        rows = cur.fetchall()
    conn.close()
    return [
        {
            "goal_id": r[0],
            "title": r[1],
            "description": r[2],
            "family_member_name": r[3],
            "family_member_age": r[4],
        }
        for r in rows
    ]


def _fetch_papers_for_goal(goal_id: int):
    """Fetch all research papers for a goal."""
    conn = _get_conn()
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, title, abstract, key_findings, therapeutic_techniques,
                   evidence_level, relevance_score, extraction_confidence, extracted_by
            FROM therapy_research
            WHERE goal_id = %s
            ORDER BY relevance_score DESC
        """, (goal_id,))
        rows = cur.fetchall()
    conn.close()
    return [
        {
            "id": r[0],
            "title": r[1],
            "abstract": r[2],
            "key_findings": json.loads(r[3]) if r[3] else [],
            "therapeutic_techniques": json.loads(r[4]) if r[4] else [],
            "evidence_level": r[5],
            "relevance_score": r[6],
            "extraction_confidence": r[7],
            "extracted_by": r[8],
        }
        for r in rows
    ]


_goals = None
_papers_cache: dict[int, list] = {}


def _get_goals():
    global _goals
    if _goals is None:
        _goals = _fetch_goals_with_research()
    return _goals


def _get_papers(goal_id: int):
    if goal_id not in _papers_cache:
        _papers_cache[goal_id] = _fetch_papers_for_goal(goal_id)
    return _papers_cache[goal_id]


def pytest_generate_tests(metafunc):
    """Dynamic parametrization since we need DB at collection time."""
    if "goal_with_papers" in metafunc.fixturenames:
        goals = _get_goals()
        params = []
        for g in goals:
            papers = _get_papers(g["goal_id"])
            params.append((g, papers))
        metafunc.parametrize(
            "goal_with_papers",
            params,
            ids=[f"goal-{g['goal_id']}-{g['title'][:30]}" for g in goals],
        )


# ---------------------------------------------------------------------------
# Deterministic: Abstract quality
# ---------------------------------------------------------------------------

GARBAGE_ABSTRACTS = {"none", "...", "n/a", "no abstract available", "null", ""}


def test_no_garbage_abstracts(goal_with_papers):
    """No papers should have garbage abstracts (None, ..., empty)."""
    goal, papers = goal_with_papers
    garbage = [
        p["title"]
        for p in papers
        if (p["abstract"] or "").strip().lower() in GARBAGE_ABSTRACTS
        or len((p["abstract"] or "").strip()) < 50
    ]
    assert not garbage, (
        f"Goal '{goal['title']}' has {len(garbage)} papers with garbage abstracts: "
        f"{garbage[:3]}"
    )


# ---------------------------------------------------------------------------
# Deterministic: Confidence not hardcoded
# ---------------------------------------------------------------------------


def test_confidence_not_flat(goal_with_papers):
    """Extraction confidence should not be the same for all papers."""
    goal, papers = goal_with_papers
    if len(papers) < 3:
        pytest.skip("Need ≥3 papers to check confidence variance")
    confidences = {p["extraction_confidence"] for p in papers}
    assert len(confidences) > 1, (
        f"Goal '{goal['title']}': all {len(papers)} papers have identical "
        f"confidence={papers[0]['extraction_confidence']} — likely hardcoded"
    )


# ---------------------------------------------------------------------------
# Deterministic: Relevance score range
# ---------------------------------------------------------------------------


def test_relevance_scores_valid_range(goal_with_papers):
    """All relevance scores should be 0-100 integers in the DB."""
    goal, papers = goal_with_papers
    for p in papers:
        score = p["relevance_score"]
        assert 0 <= score <= 100, (
            f"Paper '{p['title'][:50]}' has out-of-range score: {score}"
        )


# ---------------------------------------------------------------------------
# Deterministic: Key findings present
# ---------------------------------------------------------------------------


def test_all_papers_have_findings(goal_with_papers):
    """Every paper should have at least 1 key finding."""
    goal, papers = goal_with_papers
    empty = [p["title"] for p in papers if not p["key_findings"]]
    assert not empty, (
        f"Goal '{goal['title']}' has {len(empty)} papers without key findings: "
        f"{empty[:3]}"
    )


# ---------------------------------------------------------------------------
# Deterministic: Therapeutic techniques present
# ---------------------------------------------------------------------------


def test_most_papers_have_techniques(goal_with_papers):
    """At least 50% of papers should have therapeutic techniques."""
    goal, papers = goal_with_papers
    with_techniques = sum(1 for p in papers if p["therapeutic_techniques"])
    ratio = with_techniques / len(papers) if papers else 0
    assert ratio >= 0.5, (
        f"Goal '{goal['title']}': only {with_techniques}/{len(papers)} papers "
        f"have techniques ({ratio:.0%})"
    )


# ---------------------------------------------------------------------------
# LLM-judged: Overall relevance to goal
# ---------------------------------------------------------------------------

goal_relevance_metric = GEval(
    name="Stored Research Goal Relevance",
    criteria=(
        "Evaluate whether the set of stored research papers is relevant to the "
        "therapeutic goal. Consider: "
        "(1) Do paper titles relate to the clinical topic described in the goal? "
        "(2) Are the therapeutic techniques applicable to the goal? "
        "(3) Is the population studied appropriate (e.g., children if goal is for a child)? "
        "(4) Would a therapist find these papers useful for this specific goal? "
        "Score 0 if papers are completely unrelated, 1 if highly relevant. "
        "Note: the goal title may be in Romanian or another language — translate it mentally "
        "before judging relevance."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.6,
)


def test_stored_research_relevant_to_goal(goal_with_papers):
    """LLM judge: stored papers should be relevant to the goal."""
    goal, papers = goal_with_papers
    if not papers:
        pytest.skip("No papers stored")

    age_str = f", age {goal['family_member_age']}" if goal['family_member_age'] else ""
    input_text = (
        f"Therapeutic Goal: {goal['title']}\n"
        f"Description: {goal['description'] or '(none)'}\n"
        f"Patient: {goal['family_member_name'] or 'Unknown'}{age_str}\n"
    )
    papers_text = "\n\n".join(
        f"[{i+1}] {p['title']} ({p['evidence_level'] or 'unknown'})\n"
        f"Key findings: {'; '.join(p['key_findings'][:3])}\n"
        f"Techniques: {', '.join(p['therapeutic_techniques'][:3])}"
        for i, p in enumerate(papers[:10])
    )

    test_case = LLMTestCase(
        input=input_text,
        actual_output=papers_text,
    )
    assert_test(test_case, [goal_relevance_metric])


# ---------------------------------------------------------------------------
# LLM-judged: Translation coverage (non-English goals)
# ---------------------------------------------------------------------------

def _is_non_english(title: str) -> bool:
    """Heuristic: title contains non-ASCII chars, Romanian diacritics, or common Romanian words."""
    romanian_markers = {"ă", "â", "î", "ș", "ț"}
    if any(c in romanian_markers for c in title.lower()):
        return True
    if not title.isascii():
        return True
    # Common Romanian words that indicate non-English content
    romanian_words = {"la", "si", "nu", "sa", "sau", "dar", "pentru", "mai",
                      "este", "sunt", "rezistenta", "frustrare", "creste", "ridica",
                      "sunete", "lectii", "copilul", "manance", "refuza"}
    title_words = set(title.lower().replace("/", " ").split())
    if len(title_words & romanian_words) >= 2:
        return True
    return False


translation_coverage_metric = GEval(
    name="Translation Coverage",
    criteria=(
        "The goal title is in a non-English language (likely Romanian). "
        "Evaluate whether the stored research papers demonstrate that the search was "
        "conducted using ENGLISH clinical terms, not just the original language. "
        "Check that: "
        "(1) Paper titles are in English (academic papers are overwhelmingly English), "
        "(2) The clinical topic addressed by the papers matches the translated meaning of the goal, "
        "(3) The papers are not just keyword-matching the original language. "
        "Score 1 if papers clearly show English-language clinical search was performed. "
        "Score 0 if papers seem to be searching the original language verbatim."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.7,
)


def test_non_english_goals_translated(goal_with_papers):
    """LLM judge: non-English goals should have English research papers."""
    goal, papers = goal_with_papers
    if not _is_non_english(goal["title"]):
        pytest.skip("Goal title is in English")
    if not papers:
        pytest.skip("No papers stored")

    input_text = f"Original Goal Title (non-English): {goal['title']}\n"
    papers_text = "\n".join(
        f"[{i+1}] {p['title']}" for i, p in enumerate(papers[:10])
    )

    test_case = LLMTestCase(
        input=input_text,
        actual_output=papers_text,
    )
    assert_test(test_case, [translation_coverage_metric])
