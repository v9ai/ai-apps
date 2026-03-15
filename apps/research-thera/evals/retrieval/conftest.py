"""Fixtures and metrics for PGVector retrieval quality evaluations.

Tests whether the retrieval step (PGVector cosine similarity search)
returns therapeutically relevant, precise, and complete context for
story generation — the missing evaluation link between "papers exist
in the DB" and "the right papers reach the LLM prompt."

All test cases reuse the same Noah (7-year-old, MIDDLE_CHILDHOOD)
scenarios from the story evals for consistency.
"""

import json
from pathlib import Path

import pytest
from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
    GEval,
)
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel
from pgvector_client import generate_response, search

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"

judge = DeepSeekModel()

# ---------------------------------------------------------------------------
# DeepEval Contextual Metrics — RAG retrieval quality
# ---------------------------------------------------------------------------

contextual_precision = ContextualPrecisionMetric(threshold=0.6, model=judge)
contextual_recall = ContextualRecallMetric(threshold=0.6, model=judge)
contextual_relevancy = ContextualRelevancyMetric(threshold=0.6, model=judge)

# ---------------------------------------------------------------------------
# Custom GEval Metrics — therapeutic domain-specific retrieval quality
# ---------------------------------------------------------------------------

therapeutic_retrieval_relevance = GEval(
    name="Therapeutic Retrieval Relevance",
    criteria=(
        "Evaluate whether the retrieved research chunks are therapeutically relevant "
        "to the specific goal described in the input. "
        "Check that: "
        "(1) retrieved papers address the correct clinical domain (e.g. sleep anxiety, "
        "impulse control, social skills — not an unrelated condition), "
        "(2) papers target the correct population (children age 6-9, not adults or infants), "
        "(3) therapeutic techniques in the retrieved chunks are applicable to the stated goal, "
        "(4) the retrieval does not return generic psychology content when specific "
        "intervention research is available. "
        "Score lower if more than 1 out of 5 retrieved chunks is clearly off-topic."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.7,
)

retrieval_evidence_quality = GEval(
    name="Retrieval Evidence Quality",
    criteria=(
        "Evaluate whether the retrieved chunks contain high-quality evidence suitable "
        "for grounding a therapeutic story for a 7-year-old. "
        "Check that: "
        "(1) at least one retrieved chunk references a strong study design (RCT, "
        "meta-analysis, systematic review), "
        "(2) chunks contain specific therapeutic techniques with named methods, "
        "(3) key findings are concrete and actionable (not just 'therapy helps'), "
        "(4) the evidence is recent enough to reflect current best practice. "
        "Penalize if all retrieved chunks are vague summaries with no concrete techniques."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=judge,
    threshold=0.65,
)

# ---------------------------------------------------------------------------
# Test queries — therapeutic scenarios matching story eval test cases
# ---------------------------------------------------------------------------

RETRIEVAL_TEST_CASES = [
    {
        "id": "bedtime-anxiety-retrieval",
        "query": "Evidence-based techniques for reducing bedtime anxiety in a 7-year-old child",
        "goal_context": "Reduce bedtime anxiety and fall asleep independently",
        "expected_output": (
            "Graduated extinction and parental fading reduce sleep-onset latency. "
            "CBT techniques including imagery rescripting and relaxation training "
            "are effective for nighttime fears in children aged 7-12."
        ),
        "expected_techniques": [
            "parental fading",
            "imagery rescripting",
            "relaxation training",
            "bedtime pass",
        ],
        "clinical_domain": "sleep anxiety",
        "population": "children 6-9",
    },
    {
        "id": "school-worry-retrieval",
        "query": "Brief CBT interventions for generalized worry in middle childhood",
        "goal_context": "Manage worry about school performance and friendships",
        "expected_output": (
            "Worry container visualization and belly breathing reduce anxiety "
            "scores in children aged 6-10. Coping self-talk builds resilience."
        ),
        "expected_techniques": [
            "worry container",
            "belly breathing",
            "coping self-talk",
        ],
        "clinical_domain": "generalized anxiety",
        "population": "children 6-10",
    },
    {
        "id": "impulse-control-retrieval",
        "query": "Emotion regulation and impulse control interventions for young children",
        "goal_context": "Improve impulse control and frustration tolerance in classroom",
        "expected_output": (
            "Stop-signal training and emotion labeling reduce disruptive behavior "
            "in ages 6-9. Turtle technique and traffic light method teach self-regulation."
        ),
        "expected_techniques": [
            "turtle technique",
            "emotion labeling",
            "stop-breathe-think",
            "traffic light",
        ],
        "clinical_domain": "impulse control",
        "population": "children 6-9",
    },
    {
        "id": "anger-management-retrieval",
        "query": "Body-based interventions for childhood anger and aggressive outbursts",
        "goal_context": "Manage explosive anger episodes in a 7-year-old triggered by perceived unfairness",
        "expected_output": (
            "Physical discharge strategies (stomping, shaking) reduce escalation "
            "duration. Emotion coaching with co-regulation breathing improves "
            "repair behavior over 8 weeks."
        ),
        "expected_techniques": [
            "anger thermometer",
            "physical discharge",
            "co-regulation breathing",
            "emotion coaching",
        ],
        "clinical_domain": "anger dysregulation",
        "population": "children 6-9",
    },
    {
        "id": "social-skills-retrieval",
        "query": "Social skills and peer interaction interventions for shy children",
        "goal_context": "Build social confidence and help approach peers for group play",
        "expected_output": (
            "Friendship scripts and role-play increase peer initiations in "
            "children aged 6-9. Brave-body posture and conversation starters "
            "build social confidence."
        ),
        "expected_techniques": [
            "friendship scripts",
            "role-play",
            "conversation starters",
            "brave-body posture",
        ],
        "clinical_domain": "social anxiety",
        "population": "children 6-9",
    },
    {
        "id": "grief-retrieval",
        "query": "Child-centered grief therapy and continuing bonds for bereaved children",
        "goal_context": "Process grief after loss of grandparent and keep memory alive",
        "expected_output": (
            "Memory box activities and continuing-bonds narration reduce grief "
            "symptoms. Expressive arts (drawing, storytelling) improve emotional "
            "processing in children aged 5-10."
        ),
        "expected_techniques": [
            "memory box",
            "continuing bonds",
            "expressive arts",
            "safe-place visualization",
        ],
        "clinical_domain": "childhood bereavement",
        "population": "children 5-10",
    },
]


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _load_or_run_retrieval(case: dict, top_k: int = 10) -> dict:
    """Retrieve chunks and optionally generate a response, with fixture caching."""
    fixture_path = FIXTURES_DIR / f"{case['id']}_k{top_k}.json"

    if fixture_path.exists():
        return json.loads(fixture_path.read_text(encoding="utf-8"))

    chunks = search(case["query"], top_k=top_k)
    response = generate_response(case["query"], chunks)

    result = {
        "id": case["id"],
        "query": case["query"],
        "top_k": top_k,
        "chunks": chunks,
        "retrieval_context": [c["content"] for c in chunks],
        "similarities": [c["similarity"] for c in chunks],
        "titles": [c["title"] for c in chunks],
        "response": response,
    }

    FIXTURES_DIR.mkdir(exist_ok=True)
    fixture_path.write_text(
        json.dumps(result, indent=2, default=str),
        encoding="utf-8",
    )
    return result


@pytest.fixture(
    scope="session",
    params=RETRIEVAL_TEST_CASES,
    ids=[c["id"] for c in RETRIEVAL_TEST_CASES],
)
def retrieval_output(request):
    """Retrieve chunks for each test case at default top_k=10."""
    case = request.param
    result = _load_or_run_retrieval(case, top_k=10)
    return case, result
