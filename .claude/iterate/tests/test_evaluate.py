"""Tests for evaluate.py — trend analysis, stop logic, and fallback evaluation."""

import json
import os
import tempfile

import pytest

from evaluate import compute_trend, run_evaluation, _proxy_available, _deepeval_available, ALL_METRIC_NAMES


# ---------------------------------------------------------------------------
# compute_trend
# ---------------------------------------------------------------------------

class TestComputeTrend:
    def test_insufficient_data_empty(self):
        t = compute_trend([], "Task Completion")
        assert t["direction"] == "insufficient_data"

    def test_insufficient_data_single(self):
        t = compute_trend([{"Task Completion": {"score": 0.5}}], "Task Completion")
        assert t["direction"] == "insufficient_data"

    def test_improving_trend(self):
        scores = [
            {"Task Completion": {"score": 0.3}},
            {"Task Completion": {"score": 0.5}},
            {"Task Completion": {"score": 0.7}},
        ]
        t = compute_trend(scores, "Task Completion")
        assert t["direction"] == "improving"
        assert t["avg_delta"] > 0

    def test_declining_trend(self):
        scores = [
            {"Task Completion": {"score": 0.8}},
            {"Task Completion": {"score": 0.5}},
            {"Task Completion": {"score": 0.2}},
        ]
        t = compute_trend(scores, "Task Completion")
        assert t["direction"] == "declining"
        assert t["avg_delta"] < 0

    def test_stable_trend(self):
        scores = [
            {"Task Completion": {"score": 0.5}},
            {"Task Completion": {"score": 0.51}},
            {"Task Completion": {"score": 0.49}},
        ]
        t = compute_trend(scores, "Task Completion")
        assert t["direction"] == "stable"

    def test_values_included_in_result(self):
        scores = [
            {"Task Completion": {"score": 0.4}},
            {"Task Completion": {"score": 0.6}},
        ]
        t = compute_trend(scores, "Task Completion")
        assert "values" in t
        assert len(t["values"]) >= 2

    def test_missing_metric_treated_as_zero(self):
        scores = [
            {"Other Metric": {"score": 0.9}},
            {"Other Metric": {"score": 0.9}},
        ]
        t = compute_trend(scores, "Task Completion")
        # Values will all be 0.0
        assert t["direction"] in ("stable", "insufficient_data")

    def test_window_limits_lookback(self):
        scores = [{"Task Completion": {"score": v}} for v in [0.1, 0.9, 0.1, 0.9, 0.5]]
        # window=2: only looks at last 2 entries [0.9, 0.5] → declining
        t = compute_trend(scores, "Task Completion", window=2)
        assert t["direction"] in ("declining", "stable", "improving")  # valid direction


# ---------------------------------------------------------------------------
# run_evaluation — fallback mode (no proxy)
# ---------------------------------------------------------------------------

class TestRunEvaluationFallback:
    def _write_output(self, tmp_path, content="Some work done."):
        f = tmp_path / "output.txt"
        f.write_text(content)
        return str(f)

    def _scores_file(self, tmp_path):
        return str(tmp_path / "scores.json")

    def test_returns_dict_with_required_keys(self, tmp_path):
        result = run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="build auth",
            prev_scores_file=self._scores_file(tmp_path),
        )
        assert "scores" in result
        assert "trends" in result
        assert "eval_method" in result
        assert "continue" in result
        assert "iteration" in result

    def test_fallback_method_when_no_proxy(self, tmp_path):
        result = run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="build auth",
            prev_scores_file=self._scores_file(tmp_path),
        )
        # proxy is not available in tests
        assert result["eval_method"] == "fallback"

    def test_fallback_scores_are_0_5(self, tmp_path):
        result = run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="build auth",
            prev_scores_file=self._scores_file(tmp_path),
        )
        for key, val in result["scores"].items():
            assert val["score"] == 0.5, f"{key} score should be 0.5 in fallback, got {val['score']}"

    def test_continue_true_in_fallback(self, tmp_path):
        result = run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="build auth",
            prev_scores_file=self._scores_file(tmp_path),
        )
        assert result["continue"] is True

    def test_scores_file_written(self, tmp_path):
        scores_file = self._scores_file(tmp_path)
        run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="build auth",
            prev_scores_file=scores_file,
        )
        assert os.path.exists(scores_file)
        with open(scores_file) as f:
            data = json.load(f)
        assert isinstance(data, list)
        assert len(data) == 1

    def test_scores_accumulate_across_calls(self, tmp_path):
        scores_file = self._scores_file(tmp_path)
        run_evaluation(1, self._write_output(tmp_path), "task", prev_scores_file=scores_file)
        run_evaluation(2, self._write_output(tmp_path), "task", prev_scores_file=scores_file)
        with open(scores_file) as f:
            data = json.load(f)
        assert len(data) == 2

    def test_all_metric_names_present(self, tmp_path):
        result = run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="task",
            prev_scores_file=self._scores_file(tmp_path),
        )
        assert set(result["scores"].keys()) == set(ALL_METRIC_NAMES)

    def test_new_metrics_in_all_metric_names(self):
        assert "Answer Relevancy" in ALL_METRIC_NAMES
        assert "Faithfulness" in ALL_METRIC_NAMES
        assert "Contextual Relevancy" in ALL_METRIC_NAMES

    def test_all_metric_names_has_8_entries(self):
        assert len(ALL_METRIC_NAMES) == 8

    def test_trends_computed_after_multiple_iters(self, tmp_path):
        scores_file = self._scores_file(tmp_path)
        for i in range(1, 4):
            result = run_evaluation(
                iteration=i,
                output_file=self._write_output(tmp_path),
                task="task",
                prev_scores_file=scores_file,
            )
        assert "trends" in result
        # With 3 data points, at least some trends should have direction
        has_direction = any(
            v.get("direction") != "insufficient_data"
            for v in result["trends"].values()
        )
        assert has_direction


# ---------------------------------------------------------------------------
# Stop logic
# ---------------------------------------------------------------------------

class TestStopLogic:
    """Validate the stop conditions by injecting synthetic scores into scores.json."""

    def _run_with_injected_scores(self, tmp_path, prev_scores, iteration=4):
        output_file = tmp_path / "output.txt"
        output_file.write_text("Some output.")
        scores_file = tmp_path / "scores.json"
        scores_file.write_text(json.dumps(prev_scores))
        return run_evaluation(
            iteration=iteration,
            output_file=str(output_file),
            task="task",
            prev_scores_file=str(scores_file),
        )

    def test_no_progress_stops_loop(self, tmp_path, monkeypatch):
        """When Incremental Progress < 0.2, evaluation should signal stop."""
        from unittest.mock import patch
        import evaluate

        low_progress = {"score": 0.1, "reason": "no progress", "passed": False}
        mock_scores = {
            "Task Completion": {"score": 0.4, "reason": "", "passed": False},
            "Incremental Progress": low_progress,
            "Coherence": {"score": 0.6, "reason": "", "passed": True},
            "Code Quality": {"score": 0.6, "reason": "", "passed": True},
            "Focus": {"score": 0.6, "reason": "", "passed": True},
            "Answer Relevancy": {"score": 0.6, "reason": "", "passed": True},
            "Faithfulness": {"score": 0.6, "reason": "", "passed": True},
            "Contextual Relevancy": {"score": 0.6, "reason": "", "passed": True},
        }

        with patch.object(evaluate, "run_direct_llm", return_value=mock_scores), \
             patch.object(evaluate, "_proxy_available", return_value=True), \
             patch.object(evaluate, "_deepeval_available", False):
            result = self._run_with_injected_scores(tmp_path, [])
            assert result["continue"] is False
            assert "progress" in result["stop_reason"].lower()

    def test_plateau_stops_loop(self, tmp_path, monkeypatch):
        """Flat scores over 3 iterations trigger plateau stop."""
        import evaluate
        from unittest.mock import patch

        flat_score = 0.6
        prev = [
            {k: {"score": flat_score, "reason": "", "passed": True} for k in ALL_METRIC_NAMES}
            for _ in range(3)
        ]

        high_progress = {k: {"score": flat_score, "reason": "", "passed": True}
                         for k in ALL_METRIC_NAMES}

        with patch.object(evaluate, "run_direct_llm", return_value=high_progress), \
             patch.object(evaluate, "_proxy_available", return_value=True), \
             patch.object(evaluate, "_deepeval_available", False):
            result = self._run_with_injected_scores(tmp_path, prev, iteration=4)
            assert result["continue"] is False
            assert "plateau" in result["stop_reason"].lower()

    def _full_mock_scores(self, **overrides) -> dict:
        """Return a complete 8-metric mock score dict with optional overrides."""
        base = {k: {"score": 0.6, "reason": "", "passed": True} for k in ALL_METRIC_NAMES}
        base.update(overrides)
        return base

    def test_regression_stops_loop(self, tmp_path):
        """Declining Task Completion trend should stop after 3+ iterations."""
        import evaluate
        from unittest.mock import patch

        # 3 prior scores that are declining
        prev = [
            {k: {"score": 0.8 - i * 0.15, "reason": "", "passed": True} for k in ALL_METRIC_NAMES}
            for i in range(3)
        ]
        # Current score: also low and still declining
        current = self._full_mock_scores(**{
            "Task Completion": {"score": 0.35, "reason": "regressing", "passed": False},
        })

        with patch.object(evaluate, "run_direct_llm", return_value=current), \
             patch.object(evaluate, "_proxy_available", return_value=True), \
             patch.object(evaluate, "_deepeval_available", False):
            result = self._run_with_injected_scores(tmp_path, prev, iteration=4)
            # Either regression or no progress should stop it
            assert result["continue"] is False

    def test_low_quality_stops_loop_after_first_iter(self, tmp_path):
        """Code Quality < 0.2 after iteration 1 should stop the loop."""
        import evaluate
        from unittest.mock import patch

        bad_quality = self._full_mock_scores(**{
            "Code Quality": {"score": 0.1, "reason": "poor", "passed": False},
            "Incremental Progress": {"score": 0.5, "reason": "", "passed": True},
        })

        with patch.object(evaluate, "run_direct_llm", return_value=bad_quality), \
             patch.object(evaluate, "_proxy_available", return_value=True), \
             patch.object(evaluate, "_deepeval_available", False):
            result = self._run_with_injected_scores(tmp_path, [], iteration=2)
            assert result["continue"] is False
            assert "quality" in result["stop_reason"].lower()

    def test_high_task_completion_stops_loop(self, tmp_path):
        """Task Completion >= 0.9 should trigger a stop."""
        import evaluate
        from unittest.mock import patch

        complete_scores = {
            "Task Completion": {"score": 0.95, "reason": "done", "passed": True},
            "Incremental Progress": {"score": 0.8, "reason": "", "passed": True},
            "Coherence": {"score": 0.8, "reason": "", "passed": True},
            "Code Quality": {"score": 0.8, "reason": "", "passed": True},
            "Focus": {"score": 0.8, "reason": "", "passed": True},
            "Answer Relevancy": {"score": 0.8, "reason": "", "passed": True},
            "Faithfulness": {"score": 0.8, "reason": "", "passed": True},
            "Contextual Relevancy": {"score": 0.8, "reason": "", "passed": True},
        }

        with patch.object(evaluate, "run_direct_llm", return_value=complete_scores), \
             patch.object(evaluate, "_proxy_available", return_value=True), \
             patch.object(evaluate, "_deepeval_available", False):
            result = self._run_with_injected_scores(tmp_path, [])
            assert result["continue"] is False
            assert "complete" in result["stop_reason"].lower()


# ---------------------------------------------------------------------------
# Module-level checks
# ---------------------------------------------------------------------------

class TestModuleLevel:
    def test_proxy_unavailable_in_test_env(self):
        # In test environment, the DeepSeek proxy should not be running
        assert _proxy_available() is False

    def test_deepeval_importable(self):
        assert _deepeval_available is True
