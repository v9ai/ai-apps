"""
RAG Triad evaluation — pytest-integrated (deepeval test run compatible).

Evaluates the clinical knowledge RAG pipeline with:
  - RAG Triad: AnswerRelevancy, Faithfulness, ContextualRelevancy
  - Retrieval metrics: ContextualPrecision, ContextualRecall
  - Full 5-metric end-to-end evaluation

Imports DOCUMENTS, EVAL_INPUTS, and build_rag_pipeline from ragas_eval.

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/rag_triad_eval.py -v
  # or with deepeval CLI:
  uv run --project langgraph deepeval test run evals/rag_triad_eval.py
"""

from __future__ import annotations

import pytest
from deepeval import assert_test
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
)
from deepeval.test_case import LLMTestCase

from conftest import DeepSeekEvalLLM, skip_no_judge, HAS_JUDGE

from ragas_eval import EVAL_INPUTS, build_rag_pipeline


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def rag_judge() -> DeepSeekEvalLLM:
    """Module-scoped DeepSeek judge for RAG triad metrics."""
    if not HAS_JUDGE:
        pytest.skip("No DeepSeek judge available")
    return DeepSeekEvalLLM(model="deepseek-chat")


@pytest.fixture(scope="module")
def rag_pipeline():
    """Module-scoped RAG pipeline using deepseek-chat."""
    if not HAS_JUDGE:
        pytest.skip("No DeepSeek judge available")
    return build_rag_pipeline("deepseek-chat")


@pytest.fixture(scope="module")
def rag_test_cases(rag_pipeline):
    """
    Generate LLMTestCases by querying the RAG pipeline for each EVAL_INPUT.

    Module-scoped so queries run once, shared across all test functions.
    """
    cases: list[LLMTestCase] = []
    for item in EVAL_INPUTS:
        response = rag_pipeline.query(item["input"])
        cases.append(
            LLMTestCase(
                input=item["input"],
                actual_output=response.response,
                expected_output=item["expected_output"],
                retrieval_context=[
                    node.node.text for node in response.source_nodes
                ],
            )
        )
    return cases


# ---------------------------------------------------------------------------
# A. RAG Triad — AnswerRelevancy, Faithfulness, ContextualRelevancy
# ---------------------------------------------------------------------------


_TRIAD_SAMPLE_INPUTS = [
    # 7 core ratio questions (one per metric) for focused triad testing
    EVAL_INPUTS[0],   # TG/HDL
    EVAL_INPUTS[1],   # NLR
    EVAL_INPUTS[2],   # De Ritis
    EVAL_INPUTS[3],   # BUN/Creatinine
    EVAL_INPUTS[4],   # TC/HDL
    EVAL_INPUTS[5],   # TyG Index
    EVAL_INPUTS[6],   # HDL/LDL
]


@skip_no_judge
@pytest.mark.parametrize(
    "eval_item",
    _TRIAD_SAMPLE_INPUTS,
    ids=[item["input"][:50] for item in _TRIAD_SAMPLE_INPUTS],
)
def test_answer_relevancy(eval_item, rag_pipeline, rag_judge):
    """Generated answer is relevant to the input question."""
    response = rag_pipeline.query(eval_item["input"])
    tc = LLMTestCase(
        input=eval_item["input"],
        actual_output=response.response,
        expected_output=eval_item["expected_output"],
        retrieval_context=[n.node.text for n in response.source_nodes],
    )
    metric = AnswerRelevancyMetric(
        model=rag_judge, threshold=0.7, include_reason=True
    )
    assert_test(tc, [metric])


@skip_no_judge
@pytest.mark.parametrize(
    "eval_item",
    _TRIAD_SAMPLE_INPUTS,
    ids=[item["input"][:50] for item in _TRIAD_SAMPLE_INPUTS],
)
def test_faithfulness(eval_item, rag_pipeline, rag_judge):
    """Generated answer is grounded in retrieved context (no hallucination)."""
    response = rag_pipeline.query(eval_item["input"])
    tc = LLMTestCase(
        input=eval_item["input"],
        actual_output=response.response,
        expected_output=eval_item["expected_output"],
        retrieval_context=[n.node.text for n in response.source_nodes],
    )
    metric = FaithfulnessMetric(
        model=rag_judge, threshold=0.7, include_reason=True
    )
    assert_test(tc, [metric])


@skip_no_judge
@pytest.mark.parametrize(
    "eval_item",
    _TRIAD_SAMPLE_INPUTS,
    ids=[item["input"][:50] for item in _TRIAD_SAMPLE_INPUTS],
)
def test_contextual_relevancy(eval_item, rag_pipeline, rag_judge):
    """Retrieved context chunks are relevant to the input question."""
    response = rag_pipeline.query(eval_item["input"])
    tc = LLMTestCase(
        input=eval_item["input"],
        actual_output=response.response,
        expected_output=eval_item["expected_output"],
        retrieval_context=[n.node.text for n in response.source_nodes],
    )
    metric = ContextualRelevancyMetric(
        model=rag_judge, threshold=0.7, include_reason=True
    )
    assert_test(tc, [metric])


# ---------------------------------------------------------------------------
# B. Retrieval metrics — ContextualPrecision, ContextualRecall
# ---------------------------------------------------------------------------


@skip_no_judge
@pytest.mark.parametrize(
    "eval_item",
    _TRIAD_SAMPLE_INPUTS,
    ids=[item["input"][:50] for item in _TRIAD_SAMPLE_INPUTS],
)
def test_contextual_precision(eval_item, rag_pipeline, rag_judge):
    """Relevant context nodes are ranked higher than irrelevant ones."""
    response = rag_pipeline.query(eval_item["input"])
    tc = LLMTestCase(
        input=eval_item["input"],
        actual_output=response.response,
        expected_output=eval_item["expected_output"],
        retrieval_context=[n.node.text for n in response.source_nodes],
    )
    metric = ContextualPrecisionMetric(
        model=rag_judge, threshold=0.7, include_reason=True
    )
    assert_test(tc, [metric])


@skip_no_judge
@pytest.mark.parametrize(
    "eval_item",
    _TRIAD_SAMPLE_INPUTS,
    ids=[item["input"][:50] for item in _TRIAD_SAMPLE_INPUTS],
)
def test_contextual_recall(eval_item, rag_pipeline, rag_judge):
    """Retrieved context covers the information needed for the expected output."""
    response = rag_pipeline.query(eval_item["input"])
    tc = LLMTestCase(
        input=eval_item["input"],
        actual_output=response.response,
        expected_output=eval_item["expected_output"],
        retrieval_context=[n.node.text for n in response.source_nodes],
    )
    metric = ContextualRecallMetric(
        model=rag_judge, threshold=0.7, include_reason=True
    )
    assert_test(tc, [metric])


# ---------------------------------------------------------------------------
# C. Full 5-metric end-to-end evaluation (batch)
# ---------------------------------------------------------------------------


@skip_no_judge
def test_full_rag_evaluation(rag_test_cases, rag_judge):
    """
    Run all 5 RAG metrics across all EVAL_INPUTS in batch.

    This mirrors the standalone ragas_eval.py pipeline but as a pytest test.
    Uses deepeval.evaluate() for batch scoring.
    """
    from deepeval import evaluate

    metrics = [
        AnswerRelevancyMetric(model=rag_judge, threshold=0.7, include_reason=True),
        FaithfulnessMetric(model=rag_judge, threshold=0.7, include_reason=True),
        ContextualPrecisionMetric(model=rag_judge, threshold=0.7, include_reason=True),
        ContextualRecallMetric(model=rag_judge, threshold=0.7, include_reason=True),
        ContextualRelevancyMetric(model=rag_judge, threshold=0.7, include_reason=True),
    ]

    results = evaluate(rag_test_cases, metrics)

    # Aggregate pass rate
    total = len(rag_test_cases)
    passed = sum(1 for tc in results.test_results if tc.success)
    pass_rate = passed / total if total else 0

    assert pass_rate >= 0.7, (
        f"RAG evaluation pass rate {pass_rate:.2%} is below 70% threshold "
        f"({passed}/{total} test cases passed)"
    )
