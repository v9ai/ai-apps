"""Verify that a well-written article scores above thresholds.

Requires DEEPSEEK_API_KEY or OPENAI_API_KEY.
Run with: uv run pytest evals/ -v -m eval
"""

import pytest


@pytest.mark.eval
class TestLLMEvalGoodArticle:

    def test_source_citation_passes(self, good_result):
        m = good_result.metrics["source_citation"]
        assert m.score >= 0.7, f"source_citation {m.score:.2f}: {m.reason}"

    def test_writing_quality_passes(self, good_result):
        m = good_result.metrics["writing_quality"]
        assert m.score >= 0.6, f"writing_quality {m.score:.2f}: {m.reason}"

    def test_journalistic_standards_passes(self, good_result):
        m = good_result.metrics["journalistic_standards"]
        assert m.score >= 0.6, f"journalistic_standards {m.score:.2f}: {m.reason}"

    def test_structural_completeness_passes(self, good_result):
        m = good_result.metrics["structural_completeness"]
        assert m.score >= 0.6, f"structural_completeness {m.score:.2f}: {m.reason}"

    def test_lead_quality_passes(self, good_result):
        m = good_result.metrics["lead_quality"]
        assert m.score >= 0.6, f"lead_quality {m.score:.2f}: {m.reason}"

    def test_anti_hallucination_passes(self, good_result):
        m = good_result.metrics["anti_hallucination"]
        assert m.score >= 0.6, f"anti_hallucination {m.score:.2f}: {m.reason}"

    def test_overall_score_above_threshold(self, good_result):
        assert good_result.overall_score >= 0.65, (
            f"Good article overall {good_result.overall_score:.2f}\n{good_result.summary()}"
        )
