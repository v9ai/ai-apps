"""RAG Triad evaluation: Faithfulness, Answer Relevancy, Contextual Relevancy.

These three metrics together evaluate the complete RAG pipeline:
- Faithfulness: Does the answer avoid hallucinating beyond the context?
- AnswerRelevancy: Is the answer relevant to the question?
- ContextualRelevancy: Is the retrieved context relevant (no noise)?

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_triad.py
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_triad.py -k "faithfulness"
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_triad.py -k "batch"
"""

from concurrent.futures import ThreadPoolExecutor

import pytest
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, ContextualRelevancyMetric, FaithfulnessMetric
from deepeval.test_case import LLMTestCase

from conftest_rag import (
    answer_relevancy,
    contextual_relevancy,
    faithfulness,
    load_rag_goldens,
    model,
    rag_golden_params,
    RAG_THRESHOLD,
)
from rag_pipeline import invoke_rag, invoke_rag_batch

GOLDENS = load_rag_goldens()
PARAMS = rag_golden_params(GOLDENS)


@pytest.fixture(autouse=True)
def _skip_if_no_goldens():
    if not GOLDENS:
        pytest.skip("No RAG goldens found. Run synthesize_rag.py first.")


def _run_rag(golden: dict) -> LLMTestCase:
    """Run RAG pipeline on a golden and return an LLMTestCase."""
    result = invoke_rag(golden["input"])
    return LLMTestCase(
        input=golden["input"],
        actual_output=result["actual_output"],
        retrieval_context=result["retrieval_context"],
        expected_output=golden.get("expected_output"),
    )


def _eval_golden(golden: dict, rag_result) -> dict | None:
    """Measure the full triad in parallel with fresh metric instances per call."""
    if rag_result is None or not rag_result.get("retrieval_context"):
        return None
    tc = LLMTestCase(
        input=golden["input"],
        actual_output=rag_result["actual_output"],
        retrieval_context=rag_result["retrieval_context"],
        expected_output=golden.get("expected_output"),
    )
    # Fresh instances — singletons store .score/.reason state and are not thread-safe.
    f_m = FaithfulnessMetric(model=model, threshold=RAG_THRESHOLD)
    ar_m = AnswerRelevancyMetric(model=model, threshold=RAG_THRESHOLD)
    cr_m = ContextualRelevancyMetric(model=model, threshold=RAG_THRESHOLD)
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(lambda m: m.measure(tc), [f_m, ar_m, cr_m]))
    return {
        "input": golden["input"][:80],
        "faithfulness": f_m.score or 0,
        "answer_relevancy": ar_m.score or 0,
        "contextual_relevancy": cr_m.score or 0,
        "all_pass": (
            (f_m.score or 0) >= RAG_THRESHOLD
            and (ar_m.score or 0) >= RAG_THRESHOLD
            and (cr_m.score or 0) >= RAG_THRESHOLD
        ),
    }


# -- Parametrized per-golden tests --------------------------------------------


@pytest.mark.parametrize("golden", PARAMS)
def test_rag_faithfulness(golden: dict):
    """Answer should not hallucinate beyond retrieved context."""
    tc = _run_rag(golden)
    if not tc.retrieval_context:
        pytest.skip("No retrieval context returned")
    assert_test(tc, [faithfulness])


@pytest.mark.parametrize("golden", PARAMS)
def test_rag_answer_relevancy(golden: dict):
    """Answer should be relevant to the question asked."""
    tc = _run_rag(golden)
    assert_test(tc, [answer_relevancy])


@pytest.mark.parametrize("golden", PARAMS)
def test_rag_contextual_relevancy(golden: dict):
    """Retrieved context should be relevant, not noisy."""
    tc = _run_rag(golden)
    if not tc.retrieval_context:
        pytest.skip("No retrieval context returned")
    assert_test(tc, [contextual_relevancy])


# -- Batch triad test ---------------------------------------------------------


def test_rag_triad_batch():
    """Run all goldens through the full RAG triad. 70% must pass all three."""
    rag_results = invoke_rag_batch([g["input"] for g in GOLDENS])

    # Evaluate each golden concurrently; each call measures 3 metrics in parallel.
    with ThreadPoolExecutor(max_workers=4) as pool:
        futs = [pool.submit(_eval_golden, g, r) for g, r in zip(GOLDENS, rag_results)]
        results = [r for fut in futs for r in [fut.result()] if r is not None]

    if not results:
        pytest.skip("No goldens with retrieval context")

    passing = sum(1 for r in results if r["all_pass"])
    total = len(results)
    failed = [r for r in results if not r["all_pass"]]

    assert passing >= total * 0.7, (
        f"Only {passing}/{total} passed full triad (need 70%). "
        f"Failures: {failed[:5]}"
    )
