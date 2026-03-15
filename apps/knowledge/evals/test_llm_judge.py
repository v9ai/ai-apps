"""Dedicated DeepEval evaluation for agent-33 (LLM-as-Judge article).

Applies domain-specific GEval metrics that test whether the article
adequately covers LLM-as-Judge methodology, bias analysis, and
practical DeepEval integration patterns.

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_llm_judge.py
"""

from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
ARTICLE_PATH = CONTENT_DIR / "llm-as-judge.md"

model = DeepSeekModel()
THRESHOLD = 0.7


@pytest.fixture(scope="module")
def article_content() -> str:
    return ARTICLE_PATH.read_text(encoding="utf-8")


# ── Domain-specific metrics for LLM-as-Judge content ──────────────────


bias_coverage_metric = GEval(
    name="Bias Coverage",
    criteria=(
        "Evaluate whether the article thoroughly covers known biases in "
        "LLM-as-Judge systems. Check for explicit discussion of position bias, "
        "verbosity bias, self-enhancement bias, and style bias. Each bias "
        "should include a description, quantitative evidence or citations, "
        "and concrete mitigation strategies with code examples."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

calibration_methodology_metric = GEval(
    name="Calibration Methodology",
    criteria=(
        "Evaluate whether the article provides actionable calibration guidance "
        "for LLM judges. Check for coverage of agreement metrics (Cohen's kappa, "
        "Spearman correlation), calibration set construction methodology, "
        "rubric engineering patterns with concrete examples, and validation "
        "workflows. The guidance should be specific enough for a practitioner "
        "to implement without external references."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

geval_depth_metric = GEval(
    name="G-Eval Protocol Depth",
    criteria=(
        "Evaluate whether the article explains the G-Eval protocol with "
        "sufficient technical depth. Check for: (1) clear description of "
        "the three stages (criteria decomposition, chain-of-thought evaluation, "
        "probability-weighted scoring), (2) explanation of why CoT judging "
        "reduces anchoring, halo effects, and score clustering, (3) code "
        "examples showing probability extraction, and (4) connection to "
        "practical frameworks like DeepEval that implement G-Eval."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

deepeval_integration_metric = GEval(
    name="DeepEval Integration",
    criteria=(
        "Evaluate whether the article includes a dedicated section on "
        "implementing LLM-as-Judge evaluation with the DeepEval framework. "
        "The section should show Python code examples using DeepEval's GEval "
        "metric class with custom evaluation criteria, demonstrate how to "
        "create a custom judge model by extending DeepEvalBaseLLM, and "
        "bridge theory (G-Eval protocol) and practice (DeepEval framework) "
        "with working code for agent evaluation and CI/CD integration."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

practical_pipeline_metric = GEval(
    name="Practical Pipeline",
    criteria=(
        "Evaluate whether the article provides a complete, actionable "
        "implementation guide for building an LLM-as-Judge pipeline. "
        "Check for: step-by-step workflow, production-ready code patterns "
        "(position debiasing, logging, error handling), cost-optimization "
        "strategies (cascaded evaluation, caching, batching), and guidance "
        "on when LLM judges fail and alternatives to use instead."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

judge_model_landscape_metric = GEval(
    name="Judge Model Landscape",
    criteria=(
        "Evaluate whether the article provides a comprehensive comparison "
        "of judge models. Check for coverage of frontier models (GPT-4, "
        "Claude, Gemini), fine-tuned judges (Prometheus 2, JudgeLM), and "
        "cost-effective alternatives. Each model should have strengths, "
        "weaknesses, and use-case guidance. The article should recommend "
        "multi-judge panels for robustness."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)


# ── Tests ─────────────────────────────────────────────────────────────


def test_bias_coverage(article_content):
    test_case = LLMTestCase(
        input="Evaluate LLM-as-Judge bias coverage",
        actual_output=article_content,
    )
    assert_test(test_case, [bias_coverage_metric])


def test_calibration_methodology(article_content):
    test_case = LLMTestCase(
        input="Evaluate calibration methodology coverage",
        actual_output=article_content,
    )
    assert_test(test_case, [calibration_methodology_metric])


def test_geval_depth(article_content):
    test_case = LLMTestCase(
        input="Evaluate G-Eval protocol depth",
        actual_output=article_content,
    )
    assert_test(test_case, [geval_depth_metric])


def test_deepeval_integration(article_content):
    test_case = LLMTestCase(
        input="Evaluate DeepEval integration coverage",
        actual_output=article_content,
    )
    assert_test(test_case, [deepeval_integration_metric])


def test_practical_pipeline(article_content):
    test_case = LLMTestCase(
        input="Evaluate practical pipeline completeness",
        actual_output=article_content,
    )
    assert_test(test_case, [practical_pipeline_metric])


def test_judge_model_landscape(article_content):
    test_case = LLMTestCase(
        input="Evaluate judge model landscape coverage",
        actual_output=article_content,
    )
    assert_test(test_case, [judge_model_landscape_metric])
