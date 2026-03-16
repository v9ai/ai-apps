"""
Evals for the job classifier and EU classifier.

Run:
    python evals.py

Each test case has a known-ground-truth job and the expected classification.
We use deepeval GEval to judge reasoning quality + hard accuracy assertions.
"""

from dotenv import load_dotenv

load_dotenv()

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from src.classifier import classify
from src.data import MOCK_JOBS

# ---------------------------------------------------------------------------
# Ground truth — index matches MOCK_JOBS order
# ---------------------------------------------------------------------------
EXPECTED = [
    # mock-1  Hugging Face — AI company, fully remote
    {"is_ai_company": True,  "is_fully_remote": True,  "ai_confidence_min": "high", "remote_confidence_min": "high"},
    # mock-2  Mistral AI — AI company, hybrid (NOT remote)
    {"is_ai_company": True,  "is_fully_remote": False, "ai_confidence_min": "high", "remote_confidence_min": "high"},
    # mock-3  Anthropic — AI company, office (NOT remote)
    {"is_ai_company": True,  "is_fully_remote": False, "ai_confidence_min": "high", "remote_confidence_min": "high"},
    # mock-4  Cohere — AI company, fully remote
    {"is_ai_company": True,  "is_fully_remote": True,  "ai_confidence_min": "high", "remote_confidence_min": "high"},
    # mock-5  Netflix — NOT AI company (recommender ML ≠ AI core product), hybrid
    {"is_ai_company": False, "is_fully_remote": False, "ai_confidence_min": "medium", "remote_confidence_min": "high"},
    # mock-6  Together AI — AI company, fully remote
    {"is_ai_company": True,  "is_fully_remote": True,  "ai_confidence_min": "high", "remote_confidence_min": "high"},
    # mock-7  Scale AI — AI company, hybrid (NOT remote)
    {"is_ai_company": True,  "is_fully_remote": False, "ai_confidence_min": "medium", "remote_confidence_min": "high"},
    # mock-8  01.AI — AI company, fully remote
    {"is_ai_company": True,  "is_fully_remote": True,  "ai_confidence_min": "high", "remote_confidence_min": "high"},
]

_CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}


def _confidence_ok(actual: str, minimum: str) -> bool:
    return _CONFIDENCE_RANK.get(actual, 0) >= _CONFIDENCE_RANK.get(minimum, 0)


# ---------------------------------------------------------------------------
# deepeval metrics
# ---------------------------------------------------------------------------
reasoning_metric = GEval(
    name="Classification Reasoning",
    criteria=(
        "The ai_reason and remote_reason fields must logically justify the "
        "is_ai_company and is_fully_remote verdicts based on the job description. "
        "Reasons should reference concrete evidence from the posting."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.6,
)

correctness_metric = GEval(
    name="Classification Correctness",
    criteria=(
        "The actual_output JSON must correctly classify the job. "
        "is_ai_company=true only if the company's core product is AI/ML. "
        "is_fully_remote=true only if there is NO office or in-person requirement. "
        "The expected_output JSON shows the ground truth."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)


# ---------------------------------------------------------------------------
# Build test cases
# ---------------------------------------------------------------------------
def build_test_cases() -> list[LLMTestCase]:
    cases = []
    for job, expected in zip(MOCK_JOBS, EXPECTED):
        result = classify(job)
        print(f"  classified: {job['title']} @ {job['company_name']}  ai={result.is_ai_company} remote={result.is_fully_remote}")

        # Hard accuracy assertions (fail fast before deepeval)
        assert result.is_ai_company == expected["is_ai_company"], (
            f"{job['company_name']}: expected is_ai_company={expected['is_ai_company']}, got {result.is_ai_company}\n"
            f"  reason: {result.ai_reason}"
        )
        assert result.is_fully_remote == expected["is_fully_remote"], (
            f"{job['company_name']}: expected is_fully_remote={expected['is_fully_remote']}, got {result.is_fully_remote}\n"
            f"  reason: {result.remote_reason}"
        )
        assert _confidence_ok(result.ai_confidence, expected["ai_confidence_min"]), (
            f"{job['company_name']}: ai_confidence '{result.ai_confidence}' below minimum '{expected['ai_confidence_min']}'"
        )
        assert _confidence_ok(result.remote_confidence, expected["remote_confidence_min"]), (
            f"{job['company_name']}: remote_confidence '{result.remote_confidence}' below minimum '{expected['remote_confidence_min']}'"
        )

        input_text = (
            f"Title: {job['title']}\n"
            f"Company: {job['company_name']}\n"
            f"Location: {job.get('location') or 'N/A'}\n"
            f"Workplace: {job.get('workplace_type') or 'N/A'}\n"
            f"URL: {job.get('url') or 'N/A'}\n\n"
            f"{job.get('description', '')}"
        )
        actual_output = (
            f'{{"is_ai_company": {str(result.is_ai_company).lower()}, '
            f'"is_fully_remote": {str(result.is_fully_remote).lower()}, '
            f'"ai_confidence": "{result.ai_confidence}", '
            f'"remote_confidence": "{result.remote_confidence}", '
            f'"ai_reason": "{result.ai_reason}", '
            f'"remote_reason": "{result.remote_reason}"}}'
        )
        expected_output = (
            f'{{"is_ai_company": {str(expected["is_ai_company"]).lower()}, '
            f'"is_fully_remote": {str(expected["is_fully_remote"]).lower()}}}'
        )

        cases.append(
            LLMTestCase(
                input=input_text,
                actual_output=actual_output,
                expected_output=expected_output,
                name=f"{job['company_name']} — {job['title']}",
            )
        )
    return cases


def main() -> None:
    print("Running classifier on all eval cases...\n")
    test_cases = build_test_cases()

    print(f"\nAll {len(test_cases)} hard accuracy assertions passed.")
    print("Running deepeval reasoning + correctness metrics...\n")

    evaluate(
        test_cases=test_cases,
        metrics=[reasoning_metric, correctness_metric],
        run_async=True,
    )


if __name__ == "__main__":
    main()
