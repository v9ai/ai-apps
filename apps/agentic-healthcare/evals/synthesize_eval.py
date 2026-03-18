"""
Synthetic golden generation + RAG evaluation via DeepEval Synthesizer.

Uses the clinical knowledge corpus from ragas_eval.py to generate synthetic
test cases with evolution-based complexity scaling, then evaluates them
through the RAG pipeline with the full RAG triad.

Follows:
  https://deepeval.com/guides/guides-using-synthesizer
  https://deepeval.com/guides/guides-rag-triad
  https://deepeval.com/guides/guides-rag-evaluation

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/synthesize_eval.py -v
  # or standalone:
  uv run --project langgraph python evals/synthesize_eval.py
"""

from __future__ import annotations

import pytest
from deepeval import evaluate
from deepeval.synthesizer import Synthesizer, Evolution
from deepeval.metrics import (
    AnswerRelevancyMetric,
    FaithfulnessMetric,
    ContextualRelevancyMetric,
)
from deepeval.test_case import LLMTestCase

from conftest import DeepSeekEvalLLM, skip_no_judge, HAS_JUDGE

from ragas_eval import DOCUMENTS, build_rag_pipeline


# ---------------------------------------------------------------------------
# Extract contexts from DOCUMENTS for the Synthesizer
# ---------------------------------------------------------------------------

_DOC_BY_ID = {doc.doc_id: doc.text for doc in DOCUMENTS}


def _ctx(*doc_ids: str) -> list[str]:
    return [_DOC_BY_ID[did] for did in doc_ids]


# Group related documents into context lists for multi-context synthesis
CONTEXTS = [
    # Core ratios — each ratio doc is its own context
    _ctx("tg_hdl"),
    _ctx("hdl_ldl"),
    _ctx("tc_hdl"),
    _ctx("tyg"),
    _ctx("nlr"),
    _ctx("bun_creatinine"),
    _ctx("de_ritis"),

    # Multi-context: interpretation + velocity
    _ctx("interpretation", "velocity_principles"),

    # Multi-context: trajectories
    _ctx("cholesterol_trajectory", "renal_trajectory", "inflammation_trajectory"),

    # Multi-context: metabolic syndrome + multi-organ
    _ctx("metabolic_syndrome", "multi_organ_risk"),

    # Multi-context: medication effects
    _ctx("statin_effects", "metformin_effects", "corticosteroid_effects"),

    # Multi-context: conditions (T2DM + CKD + CV)
    _ctx("type2_diabetes", "chronic_kidney_disease", "cardiovascular_risk"),

    # Multi-context: symptom-lab correlations
    _ctx("fatigue_labs", "chest_pain_labs"),

    # Multi-context: boundary values + all optimal/elevated
    _ctx("boundary_values", "all_optimal", "all_elevated"),

    # Multi-context: safety guardrails + HIPAA
    _ctx("safety_guardrails", "hipaa_phi_definition"),
]


# ---------------------------------------------------------------------------
# Synthesizer configuration
# ---------------------------------------------------------------------------


def create_synthesizer(judge: DeepSeekEvalLLM) -> Synthesizer:
    """Create a DeepEval Synthesizer backed by DeepSeek."""
    return Synthesizer(model=judge)


def generate_goldens(
    synthesizer: Synthesizer,
    num_evolutions: int = 2,
) -> list:
    """
    Generate synthetic goldens from pre-prepared clinical contexts.

    Uses evolution types tuned for clinical RAG evaluation:
      - REASONING (20%): multi-step clinical reasoning
      - MULTICONTEXT (20%): cross-document synthesis
      - COMPARATIVE (15%): comparing metric thresholds/values
      - HYPOTHETICAL (15%): what-if clinical scenarios
      - IN_BREADTH (30%): broader topic coverage
    """
    goldens = synthesizer.generate_goldens_from_contexts(
        contexts=CONTEXTS,
        num_evolutions=num_evolutions,
        evolutions={
            Evolution.REASONING: 0.20,
            Evolution.MULTICONTEXT: 0.20,
            Evolution.COMPARATIVE: 0.15,
            Evolution.HYPOTHETICAL: 0.15,
            Evolution.IN_BREADTH: 0.30,
        },
    )
    return goldens


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def synth_judge() -> DeepSeekEvalLLM:
    if not HAS_JUDGE:
        pytest.skip("No DeepSeek judge available")
    return DeepSeekEvalLLM(model="deepseek-chat")


@pytest.fixture(scope="module")
def synth_rag_pipeline():
    if not HAS_JUDGE:
        pytest.skip("No DeepSeek judge available")
    return build_rag_pipeline("deepseek-chat")


@pytest.fixture(scope="module")
def synthetic_goldens(synth_judge):
    """Generate synthetic goldens once per module."""
    synthesizer = create_synthesizer(synth_judge)
    goldens = generate_goldens(synthesizer, num_evolutions=2)
    if not goldens:
        pytest.skip("Synthesizer produced no goldens")
    return goldens


@pytest.fixture(scope="module")
def synthetic_test_cases(synthetic_goldens, synth_rag_pipeline):
    """
    Run each synthetic golden through the RAG pipeline to produce
    LLMTestCases with actual_output and retrieval_context.
    """
    cases: list[LLMTestCase] = []
    for golden in synthetic_goldens:
        response = synth_rag_pipeline.query(golden.input)
        cases.append(
            LLMTestCase(
                input=golden.input,
                actual_output=response.response,
                expected_output=golden.expected_output,
                retrieval_context=[
                    node.node.text for node in response.source_nodes
                ],
            )
        )
    return cases


# ---------------------------------------------------------------------------
# A. Synthetic golden quality checks
# ---------------------------------------------------------------------------


@skip_no_judge
def test_golden_generation_count(synthetic_goldens):
    """Synthesizer produces a meaningful number of goldens."""
    assert len(synthetic_goldens) >= 5, (
        f"Expected at least 5 goldens, got {len(synthetic_goldens)}"
    )


@skip_no_judge
def test_golden_inputs_are_questions(synthetic_goldens):
    """Generated inputs should be question-like (contain '?')."""
    question_count = sum(1 for g in synthetic_goldens if "?" in g.input)
    ratio = question_count / len(synthetic_goldens) if synthetic_goldens else 0
    assert ratio >= 0.5, (
        f"Expected at least 50% question-like inputs, got {ratio:.0%}"
    )


@skip_no_judge
def test_golden_evolution_coverage(synthetic_goldens):
    """Goldens should include multiple evolution types."""
    evolutions_seen = set()
    for g in synthetic_goldens:
        meta = g.additional_metadata or {}
        if "evolutions" in meta:
            evolutions_seen.update(meta["evolutions"])
    # Allow this to pass if metadata isn't populated (synthesizer version dependent)
    if evolutions_seen:
        assert len(evolutions_seen) >= 2, (
            f"Expected at least 2 evolution types, saw {evolutions_seen}"
        )


# ---------------------------------------------------------------------------
# B. RAG Triad over synthetic goldens
# ---------------------------------------------------------------------------


@skip_no_judge
def test_synthetic_answer_relevancy(synthetic_test_cases, synth_judge):
    """Answer relevancy across all synthetic test cases."""
    metric = AnswerRelevancyMetric(
        model=synth_judge, threshold=0.7, include_reason=True
    )
    passed = 0
    for tc in synthetic_test_cases:
        metric.measure(tc)
        if (metric.score or 0) >= metric.threshold:
            passed += 1
    pass_rate = passed / len(synthetic_test_cases) if synthetic_test_cases else 0
    assert pass_rate >= 0.6, (
        f"Synthetic answer relevancy pass rate {pass_rate:.0%} below 60% "
        f"({passed}/{len(synthetic_test_cases)})"
    )


@skip_no_judge
def test_synthetic_faithfulness(synthetic_test_cases, synth_judge):
    """Faithfulness (no hallucination) across all synthetic test cases."""
    metric = FaithfulnessMetric(
        model=synth_judge, threshold=0.7, include_reason=True
    )
    passed = 0
    for tc in synthetic_test_cases:
        metric.measure(tc)
        if (metric.score or 0) >= metric.threshold:
            passed += 1
    pass_rate = passed / len(synthetic_test_cases) if synthetic_test_cases else 0
    assert pass_rate >= 0.6, (
        f"Synthetic faithfulness pass rate {pass_rate:.0%} below 60% "
        f"({passed}/{len(synthetic_test_cases)})"
    )


@skip_no_judge
def test_synthetic_contextual_relevancy(synthetic_test_cases, synth_judge):
    """Contextual relevancy across all synthetic test cases."""
    metric = ContextualRelevancyMetric(
        model=synth_judge, threshold=0.7, include_reason=True
    )
    passed = 0
    for tc in synthetic_test_cases:
        metric.measure(tc)
        if (metric.score or 0) >= metric.threshold:
            passed += 1
    pass_rate = passed / len(synthetic_test_cases) if synthetic_test_cases else 0
    assert pass_rate >= 0.6, (
        f"Synthetic contextual relevancy pass rate {pass_rate:.0%} below 60% "
        f"({passed}/{len(synthetic_test_cases)})"
    )


# ---------------------------------------------------------------------------
# C. Full batch evaluation (deepeval.evaluate)
# ---------------------------------------------------------------------------


@skip_no_judge
def test_synthetic_full_evaluation(synthetic_test_cases, synth_judge):
    """
    Full RAG triad evaluation over synthetic goldens using deepeval.evaluate().
    """
    metrics = [
        AnswerRelevancyMetric(model=synth_judge, threshold=0.7, include_reason=True),
        FaithfulnessMetric(model=synth_judge, threshold=0.7, include_reason=True),
        ContextualRelevancyMetric(model=synth_judge, threshold=0.7, include_reason=True),
    ]

    results = evaluate(synthetic_test_cases, metrics)

    total = len(synthetic_test_cases)
    passed = sum(1 for tr in results.test_results if tr.success)
    pass_rate = passed / total if total else 0

    assert pass_rate >= 0.5, (
        f"Synthetic RAG triad pass rate {pass_rate:.0%} below 50% "
        f"({passed}/{total})"
    )


# ---------------------------------------------------------------------------
# Standalone mode — generate goldens, evaluate, print results
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    from ragas_eval import DeepSeekEvalLLM as StandaloneJudge

    judge = StandaloneJudge(model="deepseek-chat")

    print("=" * 72)
    print("Synthetic Golden Generation + RAG Triad Evaluation")
    print("=" * 72)

    # Step 1: Generate goldens
    print("\n[1/4] Generating synthetic goldens from clinical corpus...")
    synthesizer = create_synthesizer(judge)
    goldens = generate_goldens(synthesizer, num_evolutions=2)
    print(f"  Generated {len(goldens)} goldens")

    # Step 2: Quality check
    print("\n[2/4] Golden quality:")
    df = synthesizer.to_pandas()
    print(df.head(10).to_string(index=False))

    # Step 3: Run through RAG pipeline
    print("\n[3/4] Querying RAG pipeline...")
    rag = build_rag_pipeline("deepseek-chat")
    test_cases: list[LLMTestCase] = []
    for i, golden in enumerate(goldens):
        print(f"  [{i + 1}/{len(goldens)}] {golden.input[:60]}...")
        response = rag.query(golden.input)
        test_cases.append(
            LLMTestCase(
                input=golden.input,
                actual_output=response.response,
                expected_output=golden.expected_output,
                retrieval_context=[
                    n.node.text for n in response.source_nodes
                ],
            )
        )

    # Step 4: Evaluate with RAG triad
    print("\n[4/4] Evaluating with RAG triad...")
    metrics = [
        AnswerRelevancyMetric(model=judge, threshold=0.7, include_reason=True),
        FaithfulnessMetric(model=judge, threshold=0.7, include_reason=True),
        ContextualRelevancyMetric(model=judge, threshold=0.7, include_reason=True),
    ]
    results = evaluate(test_cases, metrics)

    # Summary
    total = len(test_cases)
    passed = sum(1 for tr in results.test_results if tr.success)
    print(f"\n{'─' * 72}")
    print(f"Results: {passed}/{total} test cases passed ({passed / total:.0%})")
    print(f"{'─' * 72}")
