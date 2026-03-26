"""
Evals for the discovery pipeline classifier.

Run:
    python -m src.discovery.evals

Tests classification accuracy on known companies and ATS board detection.
"""

from dotenv import load_dotenv

load_dotenv()

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from .research import _probe_ashby, _probe_greenhouse, _probe_lever, research_and_classify

# ---------------------------------------------------------------------------
# Mock companies with known ground truth
# ---------------------------------------------------------------------------
MOCK_COMPANIES = [
    {"name": "Hugging Face", "domain": "huggingface.co", "source_url": "https://huggingface.co", "source_query": "eval"},
    {"name": "Mistral AI", "domain": "mistral.ai", "source_url": "https://mistral.ai", "source_query": "eval"},
    {"name": "Anthropic", "domain": "anthropic.com", "source_url": "https://anthropic.com", "source_query": "eval"},
    {"name": "Cohere", "domain": "cohere.com", "source_url": "https://cohere.com", "source_query": "eval"},
    {"name": "Netflix", "domain": "netflix.com", "source_url": "https://netflix.com", "source_query": "eval"},
    {"name": "Together AI", "domain": "together.ai", "source_url": "https://together.ai", "source_query": "eval"},
    {"name": "Scale AI", "domain": "scale.com", "source_url": "https://scale.com", "source_query": "eval"},
    {"name": "Weights & Biases", "domain": "wandb.ai", "source_url": "https://wandb.ai", "source_query": "eval"},
    {"name": "Vercel", "domain": "vercel.com", "source_url": "https://vercel.com", "source_query": "eval"},
    {"name": "Deepgram", "domain": "deepgram.com", "source_url": "https://deepgram.com", "source_query": "eval"},
]

EXPECTED = [
    # Hugging Face — AI-core, fully remote
    {"is_ai_company": True, "is_fully_remote": True, "ai_tier_min": 2, "confidence_min": "high"},
    # Mistral AI — AI-core, NOT fully remote (hybrid Paris)
    {"is_ai_company": True, "is_fully_remote": False, "ai_tier_min": 2, "confidence_min": "high"},
    # Anthropic — AI-core, NOT fully remote (office-based SF)
    {"is_ai_company": True, "is_fully_remote": False, "ai_tier_min": 2, "confidence_min": "high"},
    # Cohere — AI-core, fully remote
    {"is_ai_company": True, "is_fully_remote": True, "ai_tier_min": 2, "confidence_min": "high"},
    # Netflix — NOT AI company, NOT fully remote
    {"is_ai_company": False, "is_fully_remote": False, "ai_tier_min": 0, "confidence_min": "medium"},
    # Together AI — AI-core, fully remote
    {"is_ai_company": True, "is_fully_remote": True, "ai_tier_min": 2, "confidence_min": "high"},
    # Scale AI — AI company, NOT fully remote (hybrid SF)
    {"is_ai_company": True, "is_fully_remote": False, "ai_tier_min": 1, "confidence_min": "medium"},
    # Weights & Biases — AI-core (MLOps), fully remote
    {"is_ai_company": True, "is_fully_remote": True, "ai_tier_min": 2, "confidence_min": "high"},
    # Vercel — NOT AI company (web platform), remote-first
    {"is_ai_company": False, "is_fully_remote": True, "ai_tier_min": 0, "confidence_min": "medium"},
    # Deepgram — AI-core (speech AI), fully remote
    {"is_ai_company": True, "is_fully_remote": True, "ai_tier_min": 2, "confidence_min": "high"},
]

_CONFIDENCE_RANK = {"low": 0, "medium": 1, "high": 2}


def _confidence_ok(actual: str, minimum: str) -> bool:
    return _CONFIDENCE_RANK.get(actual, 0) >= _CONFIDENCE_RANK.get(minimum, 0)


# ---------------------------------------------------------------------------
# ATS Board Detection Tests
# ---------------------------------------------------------------------------
ATS_EXPECTATIONS = [
    # (slug, expected_vendor, probe_fn)
    ("huggingface", "ashby", _probe_ashby),
    ("mistral", "greenhouse", _probe_greenhouse),
    ("cohere", "lever", _probe_lever),
]


def test_ats_detection() -> int:
    """Test that known ATS boards are detected. Returns number of passes."""
    print("\n--- ATS Board Detection ---")
    passes = 0
    for slug, vendor, probe_fn in ATS_EXPECTATIONS:
        result = probe_fn(slug)
        if result and result.vendor == vendor:
            print(f"  ✓ {slug} → {vendor} ({result.job_count} jobs)")
            passes += 1
        else:
            print(f"  ✗ {slug} → expected {vendor}, got {result}")
    return passes


# ---------------------------------------------------------------------------
# Classification Accuracy Tests
# ---------------------------------------------------------------------------
reasoning_metric = GEval(
    name="Discovery Classification Reasoning",
    criteria=(
        "The reasons list must logically justify the is_ai_company and "
        "is_fully_remote verdicts based on website content and ATS evidence. "
        "Reasons should reference concrete signals."
    ),
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.6,
)

correctness_metric = GEval(
    name="Discovery Classification Correctness",
    criteria=(
        "The actual_output JSON must correctly classify the company. "
        "is_ai_company=true only if the company's core product is AI/ML. "
        "is_fully_remote=true only if there is NO office or in-person requirement. "
        "ai_tier should reflect how central AI is (2=core, 1=adjacent, 0=not). "
        "The expected_output JSON shows the ground truth."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.EXPECTED_OUTPUT,
    ],
    threshold=0.7,
)


def build_test_cases() -> list[LLMTestCase]:
    cases = []
    for company, expected in zip(MOCK_COMPANIES, EXPECTED):
        result = research_and_classify(company)

        # Hard accuracy assertions
        assert result.is_ai_company == expected["is_ai_company"], (
            f"{company['name']}: expected is_ai_company={expected['is_ai_company']}, got {result.is_ai_company}\n"
            f"  reasons: {result.reasons}"
        )
        assert result.is_fully_remote == expected["is_fully_remote"], (
            f"{company['name']}: expected is_fully_remote={expected['is_fully_remote']}, got {result.is_fully_remote}\n"
            f"  reasons: {result.reasons}"
        )
        assert result.ai_tier >= expected["ai_tier_min"], (
            f"{company['name']}: expected ai_tier>={expected['ai_tier_min']}, got {result.ai_tier}"
        )
        assert _confidence_ok(result.confidence, expected["confidence_min"]), (
            f"{company['name']}: confidence '{result.confidence}' below minimum '{expected['confidence_min']}'"
        )

        input_text = f"Company: {company['name']}\nDomain: {company['domain']}"
        actual_output = result.model_dump_json()
        expected_output = (
            f'{{"is_ai_company": {str(expected["is_ai_company"]).lower()}, '
            f'"is_fully_remote": {str(expected["is_fully_remote"]).lower()}, '
            f'"ai_tier_min": {expected["ai_tier_min"]}}}'
        )

        cases.append(
            LLMTestCase(
                input=input_text,
                actual_output=actual_output,
                expected_output=expected_output,
                name=f"{company['name']}",
            )
        )
    return cases


def main() -> None:
    # ATS detection tests
    ats_passes = test_ats_detection()
    print(f"\nATS detection: {ats_passes}/{len(ATS_EXPECTATIONS)} passed")

    # Classification tests
    print("\n--- Classification Accuracy ---")
    print("Running classifier on all eval companies...\n")
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
