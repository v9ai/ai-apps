"""Tests for llm_eval.py — LLM-powered evaluation with mocked HTTP."""

import json
from unittest.mock import patch, MagicMock

import pytest

from llm_eval import _truncate, run_llm_eval, ALL_METRIC_NAMES
from shared import ALL_METRIC_NAMES as SHARED_METRIC_NAMES


# ---------------------------------------------------------------------------
# ALL_METRIC_NAMES consistency
# ---------------------------------------------------------------------------

class TestMetricNamesConsistency:
    def test_llm_eval_uses_shared_names(self):
        assert ALL_METRIC_NAMES is SHARED_METRIC_NAMES


# ---------------------------------------------------------------------------
# _truncate
# ---------------------------------------------------------------------------

class TestTruncate:
    def test_short_text_unchanged(self):
        assert _truncate("hello", 100) == "hello"

    def test_exact_limit_unchanged(self):
        text = "x" * 50
        assert _truncate(text, 50) == text

    def test_over_limit_truncated(self):
        text = "a" * 100
        result = _truncate(text, 50)
        assert result.startswith("a" * 50)
        assert "(truncated)" in result

    def test_default_limit_is_3000(self):
        short = "x" * 2999
        assert _truncate(short) == short
        long = "x" * 3001
        assert "(truncated)" in _truncate(long)

    def test_empty_string(self):
        assert _truncate("") == ""


# ---------------------------------------------------------------------------
# run_llm_eval — mocked HTTP
# ---------------------------------------------------------------------------

def _mock_response(body: dict, status: int = 200):
    """Create a mock urllib response context manager."""
    data = json.dumps(body).encode()
    resp = MagicMock()
    resp.read.return_value = data
    resp.__enter__ = lambda s: s
    resp.__exit__ = MagicMock(return_value=False)
    return resp


def _valid_scores_response():
    """A valid LLM judge response."""
    scores = {}
    for name in ALL_METRIC_NAMES:
        scores[name] = {"score": 0.7, "reason": "looks good"}
    scores["summary"] = "Good iteration."
    return {
        "choices": [{"message": {"content": json.dumps(scores)}}],
    }


class TestRunLlmEval:
    def test_success_returns_scores(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        resp = _mock_response(_valid_scores_response())
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output text", "build auth", "context", "diff")
        assert result is not None
        for name in ALL_METRIC_NAMES:
            assert name in result
            assert "score" in result[name]
            assert "reason" in result[name]
            assert "passed" in result[name]

    def test_scores_clamped_to_0_1(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        scores = {}
        for name in ALL_METRIC_NAMES:
            scores[name] = {"score": 1.5, "reason": "over"}
        body = {"choices": [{"message": {"content": json.dumps(scores)}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        for name in ALL_METRIC_NAMES:
            assert 0.0 <= result[name]["score"] <= 1.0

    def test_negative_score_clamped(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        scores = {name: {"score": -0.5, "reason": "neg"} for name in ALL_METRIC_NAMES}
        body = {"choices": [{"message": {"content": json.dumps(scores)}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        for name in ALL_METRIC_NAMES:
            assert result[name]["score"] == 0.0

    def test_timeout_returns_none(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        with patch("urllib.request.urlopen", side_effect=TimeoutError):
            result = run_llm_eval(1, "output", "task", "", "diff", timeout=0.1)
        assert result is None

    def test_connection_error_returns_none(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        import urllib.error
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("refused")):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is None

    def test_malformed_json_returns_none(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        body = {"choices": [{"message": {"content": "not valid json {"}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is None

    def test_missing_choices_returns_none(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        body = {"error": "bad request"}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is None

    def test_markdown_fences_stripped(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        scores = {name: {"score": 0.6, "reason": "ok"} for name in ALL_METRIC_NAMES}
        fenced = "```json\n" + json.dumps(scores) + "\n```"
        body = {"choices": [{"message": {"content": fenced}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        for name in ALL_METRIC_NAMES:
            assert name in result

    def test_missing_metrics_default_to_0_5(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        scores = {"Task Completion": {"score": 0.9, "reason": "done"}}
        body = {"choices": [{"message": {"content": json.dumps(scores)}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        assert result["Task Completion"]["score"] == 0.9
        assert result["Incremental Progress"]["score"] == 0.5

    def test_non_numeric_score_defaults_to_0_5(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        scores = {name: {"score": "high", "reason": "qualitative"} for name in ALL_METRIC_NAMES}
        body = {"choices": [{"message": {"content": json.dumps(scores)}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        for name in ALL_METRIC_NAMES:
            assert result[name]["score"] == 0.5

    def test_summary_attached(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        resp = _mock_response(_valid_scores_response())
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        assert result.get("_summary") == "Good iteration."

    def test_scores_rounded_to_3_decimals(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        scores = {name: {"score": 0.33333333, "reason": "ok"} for name in ALL_METRIC_NAMES}
        body = {"choices": [{"message": {"content": json.dumps(scores)}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        assert result["Task Completion"]["score"] == 0.333

    def test_passed_flag_correct(self, monkeypatch):
        monkeypatch.setenv("ITERATE_EVAL_URL", "http://localhost:9999")
        scores = {
            **{name: {"score": 0.7, "reason": "ok"} for name in ALL_METRIC_NAMES},
            "Code Quality": {"score": 0.3, "reason": "bad"},
        }
        body = {"choices": [{"message": {"content": json.dumps(scores)}}]}
        resp = _mock_response(body)
        with patch("urllib.request.urlopen", return_value=resp):
            result = run_llm_eval(1, "output", "task", "", "diff")
        assert result is not None
        assert result["Task Completion"]["passed"] is True
        assert result["Code Quality"]["passed"] is False
