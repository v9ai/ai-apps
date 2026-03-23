"""Extended RAG metrics: Contextual Precision and Contextual Recall.

These metrics evaluate the RETRIEVAL stage more deeply:
- ContextualPrecision: Are relevant nodes ranked higher than irrelevant ones?
- ContextualRecall: Did retrieval capture ALL relevant information?

Both require expected_output, so they only run on goldens that have it.

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_extended.py
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_extended.py -k "precision"
"""

from concurrent.futures import ThreadPoolExecutor

import pytest
from deepeval import assert_test
from deepeval.metrics import ContextualPrecisionMetric, ContextualRecallMetric
from deepeval.test_case import LLMTestCase

from conftest_rag import (
    contextual_precision,
    contextual_recall,
    load_rag_goldens,
    model,
    rag_golden_params,
    RAG_THRESHOLD,
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


def _eval_golden_extended(golden: dict, rag_result) -> dict | None:
    """Measure contextual precision and recall in parallel with fresh instances."""
    if rag_result is None or not rag_result.get("retrieval_context"):
        return None
    tc = LLMTestCase(
        input=golden["input"],
        actual_output=rag_result["actual_output"],
        expected_output=golden["expected_output"],
        retrieval_context=rag_result["retrieval_context"],
    )
    cp_m = ContextualPrecisionMetric(model=model, threshold=RAG_THRESHOLD)
    cr_m = ContextualRecallMetric(model=model, threshold=RAG_THRESHOLD)
    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(lambda m: m.measure(tc), [cp_m, cr_m]))
    return {
        "input": golden["input"][:80],
        "precision": cp_m.score or 0,
        "recall": cr_m.score or 0,
        "pass": (
            (cp_m.score or 0) >= RAG_THRESHOLD
            and (cr_m.score or 0) >= RAG_THRESHOLD
        ),
    }


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
    rag_results = invoke_rag_batch([g["input"] for g in GOLDENS])

    # Evaluate each golden concurrently; precision + recall measured in parallel per call.
    with ThreadPoolExecutor(max_workers=4) as pool:
        futs = [pool.submit(_eval_golden_extended, g, r) for g, r in zip(GOLDENS, rag_results)]
        results = [r for fut in futs for r in [fut.result()] if r is not None]

    if not results:
        pytest.skip("No goldens with retrieval context and expected_output")

    passing = sum(1 for r in results if r["pass"])
    total = len(results)
    failed = [r for r in results if not r["pass"]]

    assert passing >= total * 0.6, (
        f"Only {passing}/{total} passed both precision+recall (need 60%). "
        f"Failures: {failed[:5]}"
    )
