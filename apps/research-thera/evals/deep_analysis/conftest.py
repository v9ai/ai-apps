"""Shared fixtures and metrics for deep analysis evals."""

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, run_deep_analysis

THRESHOLD = 0.7

model = DeepSeekModel()

# ---------------------------------------------------------------------------
# Metrics — DOB / age consistency
# ---------------------------------------------------------------------------

dob_summary_consistency_metric = GEval(
    name="DOB Summary Consistency",
    criteria=(
        "Evaluate whether the executive summary correctly references the child's actual age "
        "and uses age-appropriate language throughout. Check that: "
        "(1) the summary mentions the correct age or age-appropriate developmental stage, "
        "(2) the language does not imply a different age group "
        "(e.g. calling a 2-year-old a 'school-age child' or a 15-year-old a 'toddler'), "
        "(3) developmental milestones or expectations referenced are appropriate for the stated age, "
        "(4) the date of birth year is not contradicted. "
        "Penalize heavily if the summary describes the child as a different age or developmental stage."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

dob_recommendations_age_metric = GEval(
    name="DOB Recommendations Age-Appropriateness",
    criteria=(
        "Evaluate whether the priority recommendations are age-appropriate for the child. "
        "Check that: "
        "(1) suggested therapeutic approaches are designed for the child's actual age group "
        "(e.g. play therapy for toddlers, CBT for adolescents, not the reverse), "
        "(2) no recommendation assumes capabilities beyond the child's developmental stage "
        "(e.g. suggesting journaling for a 2-year-old, or a reward chart for a 15-year-old), "
        "(3) referenced interventions target the correct population in the literature, "
        "(4) school-related recommendations align with the child's actual school level. "
        "Penalize if recommendations would be appropriate for a different age group."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

dob_developmental_context_metric = GEval(
    name="DOB Developmental Context Accuracy",
    criteria=(
        "Evaluate whether the developmentalContext section accurately captures the child's "
        "age and developmental stage. Check that: "
        "(1) statedAge matches the input age exactly, "
        "(2) dobYear matches the input date of birth year exactly, "
        "(3) developmentalStage is a reasonable label for the age — accept any of these: "
        "infant/toddler/early childhood for 0-2, early childhood/preschool for 3-5, "
        "school age/middle childhood for 6-11, adolescent/mid-adolescence/teen for 12-17, "
        "(4) ageAppropriateExpectations are clinically accurate for the stated age, "
        "(5) flags identify genuine developmental concerns rather than age-normal behavior. "
        "This metric should score 0 if the age or DOB year is wrong."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=0.8,
)

# ---------------------------------------------------------------------------
# Metrics — Issue focus (trigger issue primacy)
# ---------------------------------------------------------------------------

issue_focus_summary_metric = GEval(
    name="Issue Focus Summary",
    criteria=(
        "Evaluate whether the executive summary is primarily focused on the trigger issue. "
        "Check that: "
        "(1) the summary leads with or prominently features the trigger issue in the first paragraph, "
        "(2) the trigger issue title or a clear paraphrase appears in the summary, "
        "(3) other issues are mentioned only in relation to the trigger issue, not as equal peers, "
        "(4) the overall narrative arc of the summary centers on understanding the trigger issue. "
        "Penalize if the summary gives equal weight to all issues without clearly centering on the trigger."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

issue_focus_recommendations_metric = GEval(
    name="Issue Focus Recommendations",
    criteria=(
        "Evaluate whether the priority recommendations prioritize the trigger issue. "
        "Check that: "
        "(1) the first recommendation (rank 1) directly addresses the trigger issue, "
        "(2) a majority of recommendations relate to or stem from the trigger issue, "
        "(3) recommendations for other issues are framed in terms of how they support "
        "resolving the trigger issue, "
        "(4) the suggested approaches are specific to the trigger issue's category and nature. "
        "Penalize heavily if the first recommendation addresses a different issue."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

issue_focus_patterns_metric = GEval(
    name="Issue Focus Pattern Clusters",
    criteria=(
        "Evaluate whether the pattern clusters meaningfully include the trigger issue. "
        "Check that: "
        "(1) the trigger issue ID appears in at least one pattern cluster, "
        "(2) the cluster descriptions explain how the trigger issue relates to other issues, "
        "(3) clusters are organized around the trigger issue rather than treating all issues equally, "
        "(4) suggested root causes connect back to the trigger issue. "
        "Penalize if the trigger issue is absent from all clusters."
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
def analysis_output(request):
    case = request.param
    result = run_deep_analysis(case)
    return case, result
