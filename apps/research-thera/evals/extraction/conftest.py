"""Shared fixtures and metrics for contact feedback issue extraction evals."""

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, extract_issues

THRESHOLD = 0.7

model = DeepSeekModel()

# ---------------------------------------------------------------------------
# Metrics (LLM-judged via DeepSeek)
# ---------------------------------------------------------------------------

issue_completeness_metric = GEval(
    name="Issue Completeness",
    criteria=(
        "Evaluate whether the extracted issues capture ALL significant concerns "
        "mentioned in the input feedback text. Every distinct problem, difficulty, or "
        "area of concern should have a corresponding issue in the output. "
        "Check for: (1) no important issues are missed — each paragraph or topic in "
        "the feedback should map to at least one extracted issue, "
        "(2) issues are not overly merged — distinct concerns should remain separate, "
        "(3) issues are not fabricated — every extracted issue should be grounded in "
        "something explicitly stated in the feedback. "
        "Penalize heavily for missed issues. Penalize lightly for slight over-splitting."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

category_accuracy_metric = GEval(
    name="Category Accuracy",
    criteria=(
        "Evaluate whether each extracted issue is assigned the correct category. "
        "Valid categories are: academic, behavioral, social, emotional, developmental, "
        "health, communication, other. "
        "Check that: (1) the category matches the nature of the issue described — "
        "e.g., difficulty with reading should be 'academic', hitting peers should be "
        "'behavioral', trouble making friends should be 'social', anxiety or low "
        "self-esteem should be 'emotional', speech delay should be 'communication' or "
        "'developmental', physical/motor issues should be 'health', "
        "(2) no category is used that is not in the valid list, "
        "(3) when an issue spans multiple domains, the most primary domain is chosen. "
        "Penalize miscategorizations and invalid category values."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

severity_calibration_metric = GEval(
    name="Severity Calibration",
    criteria=(
        "Evaluate whether the severity ratings (low, medium, high) are appropriately "
        "calibrated to the seriousness of each issue as described in the input feedback. "
        "Guidelines: 'high' should be reserved for issues that significantly impact "
        "daily functioning, safety, or development (e.g., physical aggression, severe "
        "regression, self-harm indicators). 'medium' for issues causing noticeable "
        "difficulty but manageable with intervention (e.g., below grade-level reading, "
        "moderate anxiety). 'low' for minor concerns or areas for improvement. "
        "Check that: (1) severity values are only 'low', 'medium', or 'high', "
        "(2) ratings are proportional to the described impact, "
        "(3) there is no systematic over- or under-rating. "
        "Penalize severity inflation (everything marked high) and deflation equally."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

clinical_language_metric = GEval(
    name="Clinical Language Quality",
    criteria=(
        "Evaluate whether the extracted issues use appropriate clinical and educational "
        "language. Check that: "
        "(1) descriptions use professional terminology where relevant (e.g., 'separation "
        "anxiety', 'phonological processes', 'executive function') without being overly "
        "jargon-heavy, "
        "(2) titles are clear and would be understood by both parents and professionals, "
        "(3) language is objective and non-judgmental — describes behaviors not character "
        "(e.g., 'has difficulty with turn-taking' not 'is selfish'), "
        "(4) descriptions distinguish between observed behaviors and interpretations, "
        "(5) language avoids diagnostic labels unless explicitly stated in the input. "
        "Penalize subjective judgments, labeling, or unprofessional language."
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
def extraction_output(request):
    case = request.param
    issues = extract_issues(case)
    return case, issues
