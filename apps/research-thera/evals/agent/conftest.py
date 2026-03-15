"""Shared fixtures and GEval metrics for research agent evals."""

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, run_agent

model = DeepSeekModel()

# ---------------------------------------------------------------------------
# GEval Metrics
# ---------------------------------------------------------------------------

evidence_hierarchy_metric = GEval(
    name="Evidence Hierarchy",
    criteria=(
        "Evaluate whether the papers are ordered and weighted according to evidence quality. "
        "Check that: "
        "(1) meta-analyses and systematic reviews appear among the top papers when available, "
        "(2) RCTs are weighted above cohort/case studies, "
        "(3) lower-quality evidence (pilot studies, single-subject designs, case reports) "
        "is not ranked above higher-quality studies of similar relevance, "
        "(4) the confidence_score reflects the overall evidence quality of the paper set. "
        "A set dominated by meta-analyses and RCTs should score above 0.75. "
        "A set of only pilot studies should score below 0.6."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.7,
)

therapeutic_relevance_metric = GEval(
    name="Therapeutic Relevance",
    criteria=(
        "Evaluate whether the papers are relevant to the stated therapeutic goal type and population. "
        "Check that: "
        "(1) each paper addresses the specific therapeutic intervention or closely related modality, "
        "(2) papers target the correct population (e.g. children, adolescents, families), "
        "(3) off-topic papers (wrong condition, wrong age group, unrelated treatment) are absent or "
        "have low relevance_score (< 0.5), "
        "(4) the therapeutic_goal_type in the output matches the input request. "
        "Penalize heavily if more than 2 papers are clearly off-topic."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.75,
)

technique_specificity_metric = GEval(
    name="Technique Specificity",
    criteria=(
        "Evaluate whether the therapeutic techniques are concrete, named, and clinically actionable. "
        "Check that: "
        "(1) techniques have specific names (e.g. 'video feedback', 'cognitive restructuring', "
        "'graduated exposure') rather than vague terms (e.g. 'therapy', 'intervention', 'treatment'), "
        "(2) aggregated_techniques list named techniques with an evidence_base and target_population, "
        "(3) techniques are realistically applicable by clinicians working with the target population, "
        "(4) at least 3 distinct techniques are identified across the paper set. "
        "Penalize if techniques are so generic they provide no clinical guidance."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.7,
)

research_coverage_metric = GEval(
    name="Research Coverage",
    criteria=(
        "Evaluate whether the paper set covers the topic from multiple complementary angles. "
        "Check that: "
        "(1) papers span different aspects: mechanisms, interventions, outcome measures, populations, "
        "(2) multiple study designs are represented where the literature supports it, "
        "(3) the coverage is not redundant (not all papers studying the same narrow sub-question), "
        "(4) key subpopulations relevant to the stated population are represented if literature exists. "
        "A set of 10 nearly identical papers on one narrow sub-topic should score below 0.5."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.65,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(
    scope="session",
    params=TEST_CASES,
    ids=[c["id"] for c in TEST_CASES],
)
def agent_output(request):
    case = request.param
    result = run_agent(case)
    return case, result
