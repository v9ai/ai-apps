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

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest_rag import (
    answer_relevancy,
    contextual_relevancy,
    faithfulness,
    load_rag_goldens,
    rag_golden_params,
)
from rag_pipeline import invoke_rag

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
    results = []
    for golden in GOLDENS:
        tc = _run_rag(golden)
        if not tc.retrieval_context:
            continue

        faithfulness.measure(tc)
        answer_relevancy.measure(tc)
        contextual_relevancy.measure(tc)

        all_pass = (
            (faithfulness.score or 0) >= faithfulness.threshold
            and (answer_relevancy.score or 0) >= answer_relevancy.threshold
            and (contextual_relevancy.score or 0) >= contextual_relevancy.threshold
        )
        results.append({
            "input": golden["input"][:80],
            "faithfulness": faithfulness.score,
            "answer_relevancy": answer_relevancy.score,
            "contextual_relevancy": contextual_relevancy.score,
            "all_pass": all_pass,
        })

    if not results:
        pytest.skip("No goldens with retrieval context")

    passing = sum(1 for r in results if r["all_pass"])
    total = len(results)
    failed = [r for r in results if not r["all_pass"]]

    assert passing >= total * 0.7, (
        f"Only {passing}/{total} passed full triad (need 70%). "
        f"Failures: {failed[:5]}"
    )
