"""Extended RAG metrics: Contextual Precision and Contextual Recall.

These metrics evaluate the RETRIEVAL stage more deeply:
- ContextualPrecision: Are relevant nodes ranked higher than irrelevant ones?
- ContextualRecall: Did retrieval capture ALL relevant information?

Both require expected_output, so they only run on goldens that have it.

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_extended.py
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_extended.py -k "precision"
"""

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest_rag import (
    contextual_precision,
    contextual_recall,
    load_rag_goldens,
    rag_golden_params,
)
from rag_pipeline import invoke_rag, invoke_rag_batch

GOLDENS = [g for g in load_rag_goldens() if g.get("expected_output")]
PARAMS = rag_golden_params(GOLDENS)


@pytest.fixture(autouse=True)
def _skip_if_no_goldens():
    if not GOLDENS:
        pytest.skip("No RAG goldens with expected_output. Run synthesize_rag.py first.")


def _run_rag(golden: dict) -> LLMTestCase:
    result = invoke_rag(golden["input"])
    return LLMTestCase(
        input=golden["input"],
        actual_output=result["actual_output"],
        expected_output=golden["expected_output"],
        retrieval_context=result["retrieval_context"],
    )


# -- Parametrized tests -------------------------------------------------------


@pytest.mark.parametrize("golden", PARAMS)
def test_contextual_precision(golden: dict):
    """Relevant context nodes should be ranked higher than irrelevant ones."""
    tc = _run_rag(golden)
    if not tc.retrieval_context:
        pytest.skip("No retrieval context returned")
    assert_test(tc, [contextual_precision])


@pytest.mark.parametrize("golden", PARAMS)
def test_contextual_recall(golden: dict):
    """Retrieved context should capture all info needed for expected output."""
    tc = _run_rag(golden)
    if not tc.retrieval_context:
        pytest.skip("No retrieval context returned")
    assert_test(tc, [contextual_recall])


# -- Batch retrieval quality ---------------------------------------------------


def test_retrieval_quality_batch():
    """Aggregate retrieval quality across all goldens. 60% must pass both."""
    # Pre-fetch all RAG results in parallel, then score metrics sequentially.
    rag_results = invoke_rag_batch([g["input"] for g in GOLDENS])

    results = []
    for golden, rag_result in zip(GOLDENS, rag_results):
        if rag_result is None:
            continue
        tc = LLMTestCase(
            input=golden["input"],
            actual_output=rag_result["actual_output"],
            expected_output=golden["expected_output"],
            retrieval_context=rag_result["retrieval_context"],
        )
        if not tc.retrieval_context:
            continue

        contextual_precision.measure(tc)
        contextual_recall.measure(tc)

        both_pass = (
            (contextual_precision.score or 0) >= contextual_precision.threshold
            and (contextual_recall.score or 0) >= contextual_recall.threshold
        )
        results.append({
            "input": golden["input"][:80],
            "precision": contextual_precision.score,
            "recall": contextual_recall.score,
            "pass": both_pass,
        })

    if not results:
        pytest.skip("No goldens with retrieval context and expected_output")

    passing = sum(1 for r in results if r["pass"])
    total = len(results)
    failed = [r for r in results if not r["pass"]]

    assert passing >= total * 0.6, (
        f"Only {passing}/{total} passed both precision+recall (need 60%). "
        f"Failures: {failed[:5]}"
    )
