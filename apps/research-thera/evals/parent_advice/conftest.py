"""Shared fixtures and metrics for parent advice evals."""

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, run_parent_advice

THRESHOLD = 0.7

model = DeepSeekModel()

# ---------------------------------------------------------------------------
# Metrics — Research grounding
# ---------------------------------------------------------------------------

research_grounding_metric = GEval(
    name="Research Grounding",
    criteria=(
        "Evaluate whether the parent advice is GROUNDED in the research papers provided in the input. "
        "Check that: "
        "(1) the advice cites specific research papers by author name or title, "
        "(2) therapeutic techniques mentioned come from the research papers' technique lists, "
        "(3) key findings from the papers are reflected in the advice, "
        "(4) no major recommendations appear that cannot be traced to the provided research, "
        "(5) evidence levels are respected — advice from RCTs and meta-analyses gets more weight. "
        "Penalize HEAVILY if the advice invents techniques or cites papers not in the input. "
        "Score 0 if the advice completely ignores the research papers."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.75,
)

technique_traceability_metric = GEval(
    name="Technique Traceability",
    criteria=(
        "Evaluate whether each therapeutic technique in the advice can be traced to a specific "
        "research paper from the input. Check that: "
        "(1) named techniques (e.g. 'graduated exposure', 'cognitive restructuring') appear in "
        "the research papers' therapeutic_techniques lists, "
        "(2) when a technique is recommended, the source paper or author is named, "
        "(3) no completely novel techniques are introduced that aren't in any paper, "
        "(4) the technique descriptions match what the papers actually found. "
        "Penalize if techniques are mentioned without attribution to a specific paper."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ---------------------------------------------------------------------------
# Metrics — Deep analysis integration
# ---------------------------------------------------------------------------

deep_analysis_integration_metric = GEval(
    name="Deep Analysis Integration",
    criteria=(
        "FIRST: Check if the input contains 'Deep analysis available: no'. "
        "If it does, this metric is NOT APPLICABLE — immediately score 1.0 regardless of the output content. "
        "ONLY if 'Deep analysis available: yes' appears in the input, evaluate the following: "
        "(1) the executive summary insights from the deep analysis are reflected in the advice, "
        "(2) priority recommendations from the deep analysis are translated into parent-friendly language, "
        "(3) identified behavioral patterns and root causes are addressed, "
        "(4) actionable family system insights are incorporated. "
        "Penalize if the deep analysis is present but completely ignored."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ---------------------------------------------------------------------------
# Metrics — Age appropriateness
# ---------------------------------------------------------------------------

age_appropriateness_metric = GEval(
    name="Age Appropriateness",
    criteria=(
        "Evaluate whether the parent advice is appropriate for the child's stated age. "
        "Check that: "
        "(1) recommended activities and interventions match the child's developmental stage, "
        "(2) language used to describe the child is age-appropriate, "
        "(3) no interventions designed for a different age group are suggested "
        "(e.g. CBT worksheets for a 2-year-old, or baby sign language for a 14-year-old), "
        "(4) developmental expectations referenced match the child's actual age. "
        "Penalize heavily for clearly wrong-age interventions."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ---------------------------------------------------------------------------
# Metrics — Practical quality
# ---------------------------------------------------------------------------

practical_quality_metric = GEval(
    name="Practical Quality",
    criteria=(
        "Evaluate whether the advice is practical and actionable for a parent. "
        "Check that: "
        "(1) each recommendation includes concrete at-home steps, not just theory, "
        "(2) advice uses warm, supportive, non-judgmental tone, "
        "(3) specific examples and scenarios are provided, "
        "(4) the advice is organized with clear sections/headers, "
        "(5) guidance on when to seek professional help is included. "
        "Penalize if the advice reads like an academic paper rather than practical parenting guidance."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(
    scope="session",
    params=TEST_CASES,
    ids=[c["id"] for c in TEST_CASES],
)
def advice_output(request):
    case = request.param
    result = run_parent_advice(case)
    return case, result
