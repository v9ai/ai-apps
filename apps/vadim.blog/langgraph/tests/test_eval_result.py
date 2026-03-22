"""ArticleEvalResult data class behaviour — no LLM calls."""

from press.evals import ArticleEvalResult, MetricResult


class TestArticleEvalResult:

    def _make_result(self, scores: dict[str, float], threshold: float = 0.7) -> ArticleEvalResult:
        return ArticleEvalResult(
            metrics={
                name: MetricResult(name=name, score=score, passed=score >= threshold,
                                   reason="", threshold=threshold)
                for name, score in scores.items()
            }
        )

    def test_overall_score_is_mean(self):
        r = self._make_result({"a": 0.8, "b": 0.6})
        assert abs(r.overall_score - 0.7) < 0.001

    def test_overall_score_empty(self):
        assert ArticleEvalResult().overall_score == 0.0

    def test_passed_all_true(self):
        r = self._make_result({"a": 0.9, "b": 0.8})
        assert r.passed_all is True

    def test_passed_all_false(self):
        r = self._make_result({"a": 0.9, "b": 0.3})
        assert r.passed_all is False

    def test_failed_metrics_correct(self):
        r = self._make_result({"a": 0.9, "b": 0.3, "c": 0.1})
        assert set(r.failed_metrics) == {"b", "c"}

    def test_summary_contains_verdict(self):
        r = self._make_result({"a": 0.9})
        summary = r.summary()
        assert "PASS" in summary or "FAIL" in summary

    def test_summary_shows_check_marks(self):
        r = self._make_result({"good": 0.9, "bad": 0.3})
        summary = r.summary()
        assert "\u2713" in summary
        assert "\u2717" in summary

    def test_to_dict_structure(self):
        r = self._make_result({"source_citation": 0.85})
        d = r.to_dict()
        assert "overall_score" in d
        assert "passed_all" in d
        assert "metrics" in d
        assert "source_citation" in d["metrics"]
        assert "score" in d["metrics"]["source_citation"]
        assert "reason" in d["metrics"]["source_citation"]

    def test_to_dict_scores_rounded(self):
        r = self._make_result({"a": 1 / 3})
        d = r.to_dict()
        assert len(str(d["metrics"]["a"]["score"])) <= 8
