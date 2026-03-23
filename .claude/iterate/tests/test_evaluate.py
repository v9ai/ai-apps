"""Tests for evaluate.py — heuristic scoring, trend analysis, and stop logic."""

import json
import os

import pytest

from evaluate import (
    ALL_METRIC_NAMES,
    compute_trend,
    run_evaluation,
    run_heuristic,
    _cosine_similarity,
    _extract_errors,
)


# ---------------------------------------------------------------------------
# _cosine_similarity
# ---------------------------------------------------------------------------

class TestCosineSimilarity:
    def test_identical_vectors(self):
        assert _cosine_similarity([1, 0], [1, 0]) == pytest.approx(1.0)

    def test_orthogonal_vectors(self):
        assert _cosine_similarity([1, 0], [0, 1]) == pytest.approx(0.0)

    def test_zero_vector(self):
        assert _cosine_similarity([0, 0], [1, 1]) == 0.0

    def test_opposite_vectors(self):
        assert _cosine_similarity([1, 0], [-1, 0]) == pytest.approx(-1.0)


# ---------------------------------------------------------------------------
# _extract_errors
# ---------------------------------------------------------------------------

class TestExtractErrors:
    def test_matches_error_prefix(self):
        assert len(_extract_errors("Error: something broke")) > 0

    def test_matches_type_error(self):
        assert len(_extract_errors("TypeError: x is not a function")) > 0

    def test_matches_fail(self):
        assert len(_extract_errors("FAIL src/test.ts")) > 0

    def test_matches_exit_code(self):
        assert len(_extract_errors("exit code 1")) > 0

    def test_no_false_positive_prose(self):
        assert len(_extract_errors("error handling is important")) == 0

    def test_no_false_positive_mid_line(self):
        assert len(_extract_errors("e.g. TypeError in prose")) == 0

    def test_limits_to_10(self):
        content = "\n".join(f"Error: err {i}" for i in range(20))
        assert len(_extract_errors(content)) <= 10


# ---------------------------------------------------------------------------
# run_heuristic
# ---------------------------------------------------------------------------

class TestRunHeuristic:
    def test_returns_all_metric_names(self):
        scores = run_heuristic(
            iteration=1,
            actual_output="Added auth middleware and login endpoint.",
            task="build auth system",
            context="",
            diff="No diff available.",
        )
        assert set(scores.keys()) == set(ALL_METRIC_NAMES)

    def test_scores_are_between_0_and_1(self):
        scores = run_heuristic(
            iteration=1,
            actual_output="Implemented the feature successfully.",
            task="build feature",
            context="Previous iteration started the feature.",
            diff="feature.py | 10 ++++",
        )
        for key, val in scores.items():
            assert 0.0 <= val["score"] <= 1.0, f"{key}: score {val['score']} out of range"

    def test_has_score_reason_passed(self):
        scores = run_heuristic(1, "output", "task", "", "No diff available.")
        for key, val in scores.items():
            assert "score" in val, f"{key} missing score"
            assert "reason" in val, f"{key} missing reason"
            assert "passed" in val, f"{key} missing passed"

    def test_no_context_gives_default_progress(self):
        scores = run_heuristic(1, "output", "task", "", "No diff available.")
        assert scores["Incremental Progress"]["score"] == 0.6

    def test_errors_reduce_quality(self):
        clean = run_heuristic(1, "All good.", "task", "", "No diff available.")
        errored = run_heuristic(
            1,
            "Error: something broke\nTypeError: x\nFAIL test.py",
            "task", "", "No diff available.",
        )
        assert errored["Code Quality"]["score"] < clean["Code Quality"]["score"]

    def test_diff_boosts_task_completion(self):
        no_diff = run_heuristic(1, "Added feature.", "build feature", "", "No diff available.")
        with_diff = run_heuristic(
            1, "Added feature.", "build feature", "",
            " feature.py | 10 ++++\n api.py | 5 +++",
        )
        assert with_diff["Task Completion"]["score"] >= no_diff["Task Completion"]["score"]


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

    def test_window_limits_lookback(self):
        scores = [{"Task Completion": {"score": v}} for v in [0.1, 0.9, 0.1, 0.9, 0.5]]
        t = compute_trend(scores, "Task Completion", window=2)
        assert t["direction"] in ("declining", "stable", "improving")


# ---------------------------------------------------------------------------
# run_evaluation — basic integration
# ---------------------------------------------------------------------------

class TestRunEvaluation:
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

    def test_eval_method_is_heuristic(self, tmp_path):
        result = run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="build auth",
            prev_scores_file=self._scores_file(tmp_path),
        )
        assert result["eval_method"] == "heuristic"

    def test_all_metric_names_present(self, tmp_path):
        result = run_evaluation(
            iteration=1,
            output_file=self._write_output(tmp_path),
            task="task",
            prev_scores_file=self._scores_file(tmp_path),
        )
        assert set(result["scores"].keys()) == set(ALL_METRIC_NAMES)

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
        has_direction = any(
            v.get("direction") != "insufficient_data"
            for v in result["trends"].values()
        )
        assert has_direction


# ---------------------------------------------------------------------------
# Stop logic
# ---------------------------------------------------------------------------

class TestStopLogic:
    def _run_with_injected_scores(self, tmp_path, prev_scores, current_scores, iteration=4):
        output_file = tmp_path / "output.txt"
        output_file.write_text("Some output.")
        scores_file = tmp_path / "scores.json"
        scores_file.write_text(json.dumps(prev_scores))

        from unittest.mock import patch
        import evaluate
        with patch.object(evaluate, "run_heuristic", return_value=current_scores):
            return run_evaluation(
                iteration=iteration,
                output_file=str(output_file),
                task="task",
                prev_scores_file=str(scores_file),
            )

    def _full_scores(self, **overrides) -> dict:
        base = {k: {"score": 0.6, "reason": "", "passed": True} for k in ALL_METRIC_NAMES}
        base.update(overrides)
        return base

    def test_high_task_completion_stops(self, tmp_path):
        scores = self._full_scores(**{
            "Task Completion": {"score": 0.95, "reason": "done", "passed": True},
        })
        result = self._run_with_injected_scores(tmp_path, [], scores)
        assert result["continue"] is False
        assert "complete" in result["stop_reason"].lower()

    def test_no_progress_stops(self, tmp_path):
        scores = self._full_scores(**{
            "Incremental Progress": {"score": 0.1, "reason": "no progress", "passed": False},
        })
        result = self._run_with_injected_scores(tmp_path, [], scores)
        assert result["continue"] is False
        assert "progress" in result["stop_reason"].lower()

    def test_low_coherence_stops(self, tmp_path):
        scores = self._full_scores(**{
            "Coherence": {"score": 0.2, "reason": "off topic", "passed": False},
        })
        result = self._run_with_injected_scores(tmp_path, [], scores)
        assert result["continue"] is False
        assert "coherence" in result["stop_reason"].lower()

    def test_plateau_stops(self, tmp_path):
        flat_score = 0.6
        prev = [
            {k: {"score": flat_score, "reason": "", "passed": True} for k in ALL_METRIC_NAMES}
            for _ in range(3)
        ]
        current = self._full_scores()
        result = self._run_with_injected_scores(tmp_path, prev, current, iteration=4)
        assert result["continue"] is False
        assert "plateau" in result["stop_reason"].lower()

    def test_low_quality_stops_after_iter_1(self, tmp_path):
        scores = self._full_scores(**{
            "Code Quality": {"score": 0.1, "reason": "poor", "passed": False},
            "Incremental Progress": {"score": 0.5, "reason": "", "passed": True},
        })
        result = self._run_with_injected_scores(tmp_path, [], scores, iteration=2)
        assert result["continue"] is False
        assert "quality" in result["stop_reason"].lower()


# ---------------------------------------------------------------------------
# ALL_METRIC_NAMES
# ---------------------------------------------------------------------------

class TestAllMetricNames:
    def test_has_8_metrics(self):
        assert len(ALL_METRIC_NAMES) == 8

    def test_no_duplicate_names(self):
        assert len(ALL_METRIC_NAMES) == len(set(ALL_METRIC_NAMES))

    def test_all_names_are_strings(self):
        for name in ALL_METRIC_NAMES:
            assert isinstance(name, str) and len(name) > 0
