"""Custom RAG GEval metrics specific to the knowledge app domain.

Tests domain-specific quality dimensions that standard RAG metrics miss:
- Citation accuracy: Does the answer reference the right lessons?
- Technical depth with context: Does it go beyond restating the context?
- Cross-lesson synthesis: Can it combine info from multiple sections?
- Pedagogical quality: Is the RAG-augmented answer good for learning?
- Context utilization: Does it actually use the retrieved context?

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_custom.py
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_custom.py -k "citation"
"""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest_rag import load_rag_goldens, rag_golden_params
from deepseek_model import DeepSeekModel
from rag_pipeline import invoke_rag, invoke_rag_batch

model = DeepSeekModel()
THRESHOLD = 0.6

GOLDENS = load_rag_goldens()
PARAMS = rag_golden_params(GOLDENS)

# -- Custom metrics ------------------------------------------------------------

citation_accuracy = GEval(
    name="Citation Accuracy",
    criteria=(
        "Evaluate whether the answer correctly references lesson titles, section "
        "headings, or concepts from the retrieved context. Check that: "
        "(1) cited lessons/sections actually appear in the retrieval context, "
        "(2) factual claims are attributed to the correct source section, "
        "(3) no fabricated lesson names or section titles are invented. "
        "Score 0 if citations are fabricated, 0.5 if partially accurate, 1 if fully accurate."
    ),
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.RETRIEVAL_CONTEXT,
    ],
    model=model,
    threshold=THRESHOLD,
)

technical_depth = GEval(
    name="Technical Depth with Context",
    criteria=(
        "Evaluate whether the answer demonstrates deep understanding that goes "
        "beyond merely restating the retrieved context. Check for: "
        "(1) synthesis and interpretation of context information, "
        "(2) explanation of underlying mechanisms referenced in context, "
        "(3) practical implications drawn from the contextual information, "
        "(4) connections between concepts across different retrieved chunks."
    ),
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.RETRIEVAL_CONTEXT,
    ],
    model=model,
    threshold=THRESHOLD,
)

cross_lesson_synthesis = GEval(
    name="Cross-Lesson Synthesis",
    criteria=(
        "Evaluate whether the answer effectively synthesizes information from "
        "multiple retrieved context chunks that come from different lessons. "
        "A high score means the answer weaves together insights from 2+ sources "
        "into a coherent explanation. A low score means it only uses one chunk "
        "or fails to connect related information across sources."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.RETRIEVAL_CONTEXT,
    ],
    model=model,
    threshold=0.5,
)

pedagogical_quality = GEval(
    name="Pedagogical Quality",
    criteria=(
        "Evaluate whether the RAG-augmented answer is effective for learning. "
        "Check that: (1) it builds from fundamentals to advanced concepts, "
        "(2) technical jargon from the context is explained, not just repeated, "
        "(3) it provides actionable takeaways or next steps for the learner, "
        "(4) it acknowledges its knowledge boundaries when context is limited."
    ),
    evaluation_params=[
        LLMTestCaseParams.INPUT,
        LLMTestCaseParams.ACTUAL_OUTPUT,
    ],
    model=model,
    threshold=THRESHOLD,
)

context_utilization = GEval(
    name="Context Utilization",
    criteria=(
        "Evaluate what fraction of the retrieved context chunks are actually "
        "used in the answer. Score 0 if the answer ignores the context entirely "
        "and relies on parametric knowledge. Score 0.5 if it uses some but not "
        "all relevant chunks. Score 1 if it effectively utilizes all relevant "
        "retrieved context while appropriately ignoring irrelevant chunks."
    ),
    evaluation_params=[
        LLMTestCaseParams.ACTUAL_OUTPUT,
        LLMTestCaseParams.RETRIEVAL_CONTEXT,
    ],
    model=model,
    threshold=0.5,
)


@pytest.fixture(autouse=True)
def _skip_if_no_goldens():
    if not GOLDENS:
        pytest.skip("No RAG goldens found. Run synthesize_rag.py first.")


def _run_rag(golden: dict) -> LLMTestCase:
    result = invoke_rag(golden["input"])
    return LLMTestCase(
        input=golden["input"],
        actual_output=result["actual_output"],
        retrieval_context=result["retrieval_context"],
        expected_output=golden.get("expected_output"),
    )


# -- Parametrized tests --------------------------------------------------------


@pytest.mark.parametrize("golden", PARAMS)
def test_citation_accuracy(golden: dict):
    """Answer should correctly reference lessons/sections from context."""
    tc = _run_rag(golden)
    if not tc.retrieval_context:
        pytest.skip("No retrieval context")
    assert_test(tc, [citation_accuracy])


@pytest.mark.parametrize("golden", PARAMS)
def test_technical_depth(golden: dict):
    """Answer should go beyond restating the context."""
    tc = _run_rag(golden)
    if not tc.retrieval_context:
        pytest.skip("No retrieval context")
    assert_test(tc, [technical_depth])


@pytest.mark.parametrize("golden", PARAMS)
def test_cross_lesson_synthesis(golden: dict):
    """Answer should synthesize info from multiple context chunks."""
    tc = _run_rag(golden)
    if not tc.retrieval_context or len(tc.retrieval_context) < 2:
        pytest.skip("Need 2+ context chunks for cross-lesson synthesis")
    assert_test(tc, [cross_lesson_synthesis])


@pytest.mark.parametrize("golden", PARAMS)
def test_pedagogical_quality(golden: dict):
    """Answer should be effective for learning."""
    tc = _run_rag(golden)
    assert_test(tc, [pedagogical_quality])


@pytest.mark.parametrize("golden", PARAMS)
def test_context_utilization(golden: dict):
    """Answer should actually use the retrieved context."""
    tc = _run_rag(golden)
    if not tc.retrieval_context:
        pytest.skip("No retrieval context")
    assert_test(tc, [context_utilization])


# -- Batch tests ---------------------------------------------------------------


def test_custom_metrics_batch():
    """Run all 5 custom metrics on all goldens. Report aggregate pass rates."""
    metrics = [citation_accuracy, technical_depth, cross_lesson_synthesis,
               pedagogical_quality, context_utilization]
    metric_pass_counts = {m.name: 0 for m in metrics}
    total = 0

    # Pre-fetch all RAG results in parallel, then score sequentially.
    rag_results = invoke_rag_batch([g["input"] for g in GOLDENS])

    for golden, rag_result in zip(GOLDENS, rag_results):
        if rag_result is None:
            continue
        tc = LLMTestCase(
            input=golden["input"],
            actual_output=rag_result["actual_output"],
            retrieval_context=rag_result["retrieval_context"],
            expected_output=golden.get("expected_output"),
        )
        if not tc.retrieval_context:
            continue
        total += 1

        for m in metrics:
            if m.name == "Cross-Lesson Synthesis" and len(tc.retrieval_context) < 2:
                continue
            m.measure(tc)
            if (m.score or 0) >= m.threshold:
                metric_pass_counts[m.name] += 1

    if total == 0:
        pytest.skip("No goldens with retrieval context")

    report = {name: f"{count}/{total}" for name, count in metric_pass_counts.items()}
    # At least 3 of 5 metrics should have >= 60% pass rate
    passing_metrics = sum(
        1 for count in metric_pass_counts.values()
        if count >= total * 0.6
    )
    assert passing_metrics >= 3, (
        f"Only {passing_metrics}/5 custom metrics achieved 60% pass rate. Report: {report}"
    )
