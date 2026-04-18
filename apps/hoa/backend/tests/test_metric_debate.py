"""Smoke tests for the adversarial DebateMetric.

These exercise the multi-agent debate end-to-end against the SAMPLE_RESEARCH
question set. They make real LLM calls (HF Inference API or local MLX) and
take 1-3 minutes per test, so they're gated behind RUN_DEBATE_TESTS=1.

Run with:
    RUN_DEBATE_TESTS=1 HF_TOKEN=... pytest tests/test_metric_debate.py -v
or  RUN_DEBATE_TESTS=1 pytest tests/test_metric_debate.py -v   (local MLX only)
"""

import json
import os
import sys
from pathlib import Path

import pytest

# Make backend modules importable when pytest is invoked from the project root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from deepeval.test_case import LLMTestCase  # noqa: E402

from metrics.debate_metric import DebateMetric  # noqa: E402

pytestmark = [
    pytest.mark.deepeval,
    pytest.mark.skipif(
        not os.getenv("RUN_DEBATE_TESTS"),
        reason="Set RUN_DEBATE_TESTS=1 to run multi-agent debate tests (slow)",
    ),
]

CRITERIA = (
    "The output is a JSON list of interview questions. Each question must "
    "reference specific, verifiable details about Harrison Chase (named "
    "projects like LangChain/LangGraph/LangSmith, papers like SPADE, the "
    "Sequoia Series A, his co-founder Ankush Gola). Generic questions that "
    "could apply to any AI founder must be penalised."
)


def _build_test_case(sample_questions, sample_research) -> LLMTestCase:
    return LLMTestCase(
        input=(
            f"Generate specific interview questions for {sample_research['name']} "
            f"({sample_research['executive_summary']['one_liner']})."
        ),
        actual_output=json.dumps(
            [{"question": q["question"], "category": q["category"]}
             for q in sample_questions]
        ),
    )


def test_debate_metric_jury_one(sample_questions, sample_research):
    """Single-judge debate produces a numeric score and reason."""
    metric = DebateMetric(criteria=CRITERIA, threshold=0.5, rounds=1, jury=1)
    test_case = _build_test_case(sample_questions, sample_research)

    metric.measure(test_case)

    assert isinstance(metric.score, float), f"score must be float, got {type(metric.score)}"
    assert 0.0 <= metric.score <= 1.0, f"score out of range: {metric.score}"
    assert metric.reason and metric.reason.strip(), "reason must be non-empty"
    assert metric.is_successful() == (metric.score >= metric.threshold)


def test_debate_metric_jury_three(sample_questions, sample_research):
    """Three-judge jury produces a score and a reason that aggregates judges."""
    metric = DebateMetric(criteria=CRITERIA, threshold=0.5, rounds=1, jury=3)
    test_case = _build_test_case(sample_questions, sample_research)

    metric.measure(test_case)

    assert 0.0 <= metric.score <= 1.0
    assert metric.reason
    # jury_aggregate tags each judge's overall_reason with J1/J2/J3 markers
    # when 2+ judges supplied a reason; require at least one marker as evidence
    # the aggregator was actually invoked.
    assert "J1:" in metric.reason or "J2:" in metric.reason or "J3:" in metric.reason, (
        f"expected aggregated jury markers in reason, got: {metric.reason!r}"
    )
