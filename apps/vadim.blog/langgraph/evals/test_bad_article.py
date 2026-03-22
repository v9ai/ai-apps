"""Verify that a poorly-written article fails key metrics.

Requires DEEPSEEK_API_KEY or OPENAI_API_KEY.
"""

import pytest


@pytest.mark.eval
class TestLLMEvalBadArticle:

    def test_source_citation_fails(self, bad_result):
        m = bad_result.metrics["source_citation"]
        assert m.score <= 0.3, (
            f"Bad article should fail source_citation, got {m.score:.2f}: {m.reason}"
        )

    def test_writing_quality_fails(self, bad_result):
        m = bad_result.metrics["writing_quality"]
        assert m.score <= 0.5, (
            f"Bad article should fail writing_quality, got {m.score:.2f}: {m.reason}"
        )

    def test_journalistic_standards_fails(self, bad_result):
        m = bad_result.metrics["journalistic_standards"]
        assert m.score <= 0.5, (
            f"Bad article should fail journalistic_standards, got {m.score:.2f}: {m.reason}"
        )
