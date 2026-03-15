"""Shared fixtures and metrics for research pipeline evals."""

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, run_normalize, run_plan, run_extract

THRESHOLD = 0.7

model = DeepSeekModel()

# ---------------------------------------------------------------------------
# Metrics — Normalization stage
# ---------------------------------------------------------------------------

normalization_accuracy_metric = GEval(
    name="Clinical Normalization Accuracy",
    criteria=(
        "Evaluate whether the clinical normalization correctly identifies the therapeutic "
        "construct from the goal title and context. Check that: "
        "(1) non-English goal titles are correctly translated to English, "
        "(2) the clinical domain is SPECIFIC (e.g. 'selective_mutism', not 'behavioral_change'), "
        "(3) the behavior direction (INCREASE/REDUCE) matches the therapeutic intent, "
        "(4) the developmental tier matches the child's age, "
        "(5) required keywords are clinically appropriate for the identified domain, "
        "(6) excluded topics correctly filter out irrelevant adjacent domains. "
        "The normalization should leverage ALL available context including teacher feedback "
        "and extracted issues to produce the most specific clinical classification possible."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

feedback_integration_metric = GEval(
    name="Feedback Integration Quality",
    criteria=(
        "Evaluate whether the normalization output shows evidence of incorporating "
        "teacher feedback and extracted issues. Check that: "
        "(1) some keywords or the clinical restatement reflect feedback observations, "
        "(2) the clinical domain accounts for feedback details when relevant, "
        "(3) the output is more specific than what could be produced from the goal title alone. "
        "The integration does not need to be perfect — just present and directionally useful."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.4,
)

# ---------------------------------------------------------------------------
# Metrics — Query planning stage
# ---------------------------------------------------------------------------

query_planning_quality_metric = GEval(
    name="Query Planning Quality",
    criteria=(
        "Evaluate the quality and diversity of generated search queries for the therapeutic "
        "goal. Check that: "
        "(1) queries are clinically specific (e.g. 'selective mutism classroom vocalization' "
        "not just 'child behavior'), "
        "(2) queries span multiple search strategies: MeSH terms for PubMed, natural language "
        "for Crossref, technical terms for Semantic Scholar, "
        "(3) queries cover different facets: intervention types, population, outcomes, mechanisms, "
        "(4) there are enough queries to achieve good recall (at least 10 per source), "
        "(5) queries incorporate context from teacher feedback and extracted issues, "
        "(6) queries avoid topics that would retrieve irrelevant papers. "
        "Penalize generic queries that would retrieve off-topic results."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

# ---------------------------------------------------------------------------
# Metrics — Extraction stage
# ---------------------------------------------------------------------------

extraction_faithfulness_metric = GEval(
    name="Extraction Faithfulness",
    criteria=(
        "Evaluate whether the extracted key findings and therapeutic techniques are "
        "FAITHFULLY supported by the paper abstract. Check that: "
        "(1) every key finding is explicitly stated or directly derivable from the abstract, "
        "(2) no findings are fabricated or extrapolated beyond what the abstract says, "
        "(3) therapeutic techniques mentioned are actually described in the paper, "
        "(4) the evidence level classification matches the study design described, "
        "(5) quantitative claims (effect sizes, p-values, sample sizes) match the abstract. "
        "Penalize heavily for hallucinated findings. Penalize lightly for minor paraphrasing."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.CONTEXT,
    ],
    model=model,
    threshold=0.75,
)

relevance_scoring_metric = GEval(
    name="Relevance Scoring Accuracy",
    criteria=(
        "Evaluate whether the relevance score is reasonable given the paper abstract "
        "and therapeutic goal. A directly relevant paper (same condition, similar population) "
        "should have a relevance score of 0.7 or above. An unrelated paper should score below 0.4. "
        "The score does not need to be perfect — just directionally correct."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.CONTEXT,
    ],
    model=model,
    threshold=0.4,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(
    scope="session",
    params=TEST_CASES,
    ids=[c["id"] for c in TEST_CASES],
)
def normalize_output(request):
    case = request.param
    result = run_normalize(case)
    return case, result


@pytest.fixture(
    scope="session",
    params=TEST_CASES,
    ids=[c["id"] for c in TEST_CASES],
)
def plan_output(request):
    case = request.param
    result = run_plan(case)
    return case, result


@pytest.fixture(
    scope="session",
    params=TEST_CASES,
    ids=[c["id"] for c in TEST_CASES],
)
def extract_output(request):
    case = request.param
    result = run_extract(case)
    return case, result
