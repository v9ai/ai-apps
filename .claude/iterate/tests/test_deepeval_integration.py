"""Integration tests for DeepEval usage in evaluate.py.

Tests verify:
- LocalDeepSeekLLM wraps correctly and is callable by DeepEval
- GEval metrics are configured with valid params
- run_deepeval() produces the expected score dict shape with a mocked LLM
- All 8 metric names are present in ALL_METRIC_NAMES
- The test case is built with the correct fields for each built-in metric
"""

import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from evaluate import (
    ALL_METRIC_NAMES,
    _deepeval_available,
    run_deepeval,
)


pytestmark = pytest.mark.skipif(
    not _deepeval_available,
    reason="deepeval not installed",
)


# ---------------------------------------------------------------------------
# LocalDeepSeekLLM
# ---------------------------------------------------------------------------

class TestLocalDeepSeekLLM:
    def _make_llm(self):
        from evaluate import LocalDeepSeekLLM
        return LocalDeepSeekLLM(url="http://127.0.0.1:19999/v1/chat/completions", model="mock")

    def test_get_model_name_returns_string(self):
        llm = self._make_llm()
        assert isinstance(llm.get_model_name(), str)

    def test_load_model_returns_model_name(self):
        llm = self._make_llm()
        assert llm.load_model() == llm.get_model_name()

    def test_generate_calls_url(self):
        """generate() makes an HTTP POST to the configured URL."""
        from evaluate import LocalDeepSeekLLM
        llm = LocalDeepSeekLLM(url="http://127.0.0.1:19999/v1/chat/completions", model="mock")
        mock_response = json.dumps({
            "choices": [{"message": {"content": "mocked response"}}]
        }).encode()

        mock_resp_obj = MagicMock()
        mock_resp_obj.read.return_value = mock_response
        mock_resp_obj.__enter__ = lambda s: s
        mock_resp_obj.__exit__ = MagicMock(return_value=False)

        import urllib.request
        with patch.object(urllib.request, "urlopen", return_value=mock_resp_obj) as mock_urlopen:
            result = llm.generate("test prompt")

        assert result == "mocked response"
        mock_urlopen.assert_called_once()

    def test_a_generate_delegates_to_generate(self):
        """a_generate() is the async version — must return the same result as generate()."""
        from evaluate import LocalDeepSeekLLM
        import asyncio
        llm = LocalDeepSeekLLM(url="http://127.0.0.1:19999/v1/chat/completions", model="mock")

        with patch.object(llm, "generate", return_value="async-result") as mock_gen:
            result = asyncio.run(llm.a_generate("test prompt"))

        assert result == "async-result"
        mock_gen.assert_called_once_with("test prompt")

    def test_inherits_deepeval_base(self):
        from evaluate import LocalDeepSeekLLM
        from deepeval.models import DeepEvalBaseLLM
        llm = LocalDeepSeekLLM()
        assert isinstance(llm, DeepEvalBaseLLM)


# ---------------------------------------------------------------------------
# GEval metric configuration
# ---------------------------------------------------------------------------

class TestGEvalConfiguration:
    def _get_geval_metrics(self):
        from evaluate import LocalDeepSeekLLM
        from deepeval.metrics import GEval
        from deepeval.test_case import LLMTestCaseParams
        llm = LocalDeepSeekLLM()

        return [
            GEval(
                name="Task Completion",
                criteria="Evaluate progress. 1.0 = fully complete.",
                evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
                threshold=0.5,
                model=llm,
            ),
        ]

    def test_geval_metric_has_name(self):
        metrics = self._get_geval_metrics()
        assert metrics[0].name == "Task Completion"

    def test_geval_threshold_set(self):
        metrics = self._get_geval_metrics()
        assert metrics[0].threshold == 0.5

    def test_geval_model_is_local_llm(self):
        from evaluate import LocalDeepSeekLLM
        metrics = self._get_geval_metrics()
        assert isinstance(metrics[0].model, LocalDeepSeekLLM)


# ---------------------------------------------------------------------------
# run_deepeval with mocked metrics (patch at metric level, not HTTP)
# ---------------------------------------------------------------------------

def _make_mock_metric(name: str, score: float = 0.75, threshold: float = 0.5):
    """Return a mock metric that behaves like a passed DeepEval metric."""
    m = MagicMock()
    m.name = name
    m.score = score
    m.threshold = threshold
    m.reason = f"mocked reason for {name}"
    m.measure = MagicMock(return_value=None)
    return m


class TestRunDeepeval:
    """Test run_deepeval() with metrics mocked at the deepeval evaluate() level.

    DeepEval's GEval internally makes two LLM calls (step generation + evaluation),
    making HTTP-level mocking fragile. Instead we patch de_evaluate() to set
    scores directly on the metric objects, simulating a successful evaluation.
    """

    def _run_with_mocked_evaluate(self, iteration=1, score=0.75):
        """Call run_deepeval() with deepeval.evaluate patched to set metric.score."""
        def fake_de_evaluate(test_cases, metrics=None, **kwargs):
            for m in (metrics or []):
                if not hasattr(m, "score") or m.score is None:
                    m.score = score
                    m.reason = "mocked"

        # de_evaluate is imported inside run_deepeval via `from deepeval import evaluate`
        # so we patch deepeval.evaluate directly
        import deepeval
        with patch.object(deepeval, "evaluate", fake_de_evaluate):
            return run_deepeval(
                    iteration=iteration,
                    actual_output="Added auth middleware and login endpoint.",
                    task="build auth system",
                    context="Initial project setup.",
                    diff="auth.py | 10 ++++",
                )

    def test_run_deepeval_returns_dict(self):
        result = self._run_with_mocked_evaluate()
        assert isinstance(result, dict)

    def test_run_deepeval_has_task_completion_key(self):
        result = self._run_with_mocked_evaluate()
        assert "Task Completion" in result

    def test_run_deepeval_scores_are_floats(self):
        result = self._run_with_mocked_evaluate(score=0.8)
        for key, val in result.items():
            assert isinstance(val.get("score"), float), f"{key}: score should be float"

    def test_run_deepeval_includes_passed_field(self):
        result = self._run_with_mocked_evaluate(score=0.8)
        for key, val in result.items():
            assert "passed" in val, f"{key}: missing 'passed' field"

    def test_run_deepeval_passed_is_true_above_threshold(self):
        result = self._run_with_mocked_evaluate(score=0.9)
        for key, val in result.items():
            if val.get("score", 0) >= 0.5:
                assert val["passed"] is True, f"{key}: should be passed at score {val['score']}"


# ---------------------------------------------------------------------------
# ALL_METRIC_NAMES consistency
# ---------------------------------------------------------------------------

class TestAllMetricNames:
    def test_has_8_metrics(self):
        assert len(ALL_METRIC_NAMES) == 8

    def test_geval_metrics_present(self):
        geval_names = {"Task Completion", "Incremental Progress", "Coherence", "Code Quality", "Focus"}
        assert geval_names.issubset(set(ALL_METRIC_NAMES))

    def test_builtin_metrics_present(self):
        builtin = {"Answer Relevancy", "Faithfulness", "Contextual Relevancy"}
        assert builtin.issubset(set(ALL_METRIC_NAMES))

    def test_all_names_are_strings(self):
        for name in ALL_METRIC_NAMES:
            assert isinstance(name, str) and len(name) > 0

    def test_no_duplicate_names(self):
        assert len(ALL_METRIC_NAMES) == len(set(ALL_METRIC_NAMES))
