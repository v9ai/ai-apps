"""Shared fixtures for the deepeval suite.

Pattern mirrors apps/lead-gen/backend/tests/test_deep_icp_eval.py:

1. A ``DeepEvalBaseLLM`` wrapper over our ``make_llm()`` factory so deepeval
   judges respect ``LLM_BASE_URL`` / ``DEEPSEEK_API_KEY`` from the env.
2. ``deepeval_required`` skip marker — the suite no-ops on dev machines
   without deepeval or a judge LLM configured.
3. JSON golden loaders keyed by graph name.
4. ``aggregate_gate()`` helper that asserts pass-rate ≥ threshold across
   (case × metric) cells and prints a compact diagnostic on failure.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import pytest

GOLDEN_DIR = Path(__file__).parent / "golden"


def _deepeval_available() -> bool:
    try:
        import deepeval  # noqa: F401
        from deepeval.metrics import AnswerRelevancyMetric  # noqa: F401

        return True
    except ImportError:
        return False


def _judge_available() -> bool:
    return bool(
        os.environ.get("LLM_BASE_URL") or os.environ.get("DEEPSEEK_API_KEY")
    )


deepeval_required = pytest.mark.skipif(
    not _deepeval_available() or not _judge_available(),
    reason="deepeval not installed or no judge LLM configured (set LLM_BASE_URL or DEEPSEEK_API_KEY)",
)


def _load_golden(name: str) -> list[dict]:
    path = GOLDEN_DIR / f"{name}.json"
    with path.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list), f"{name}.json must be a JSON array"
    assert len(data) >= 3, f"{name}.json must have at least 3 cases"
    return data


@pytest.fixture(scope="session")
def golden_chat() -> list[dict]:
    return _load_golden("chat")


@pytest.fixture(scope="session")
def golden_app_prep() -> list[dict]:
    return _load_golden("app_prep")


@pytest.fixture(scope="session")
def golden_course_review() -> list[dict]:
    return _load_golden("course_review")


@pytest.fixture(scope="session")
def golden_article_generate() -> list[dict]:
    return _load_golden("article_generate")


def make_judge():
    """Wrap our ``make_llm()`` in ``DeepEvalBaseLLM`` so judges honor
    ``LLM_BASE_URL`` / ``DEEPSEEK_API_KEY`` the same way the graphs do."""
    from deepeval.models.base_model import DeepEvalBaseLLM

    from knowledge_agent.llm import make_llm

    class LocalJudge(DeepEvalBaseLLM):
        def __init__(self) -> None:
            self._m = make_llm(temperature=0.0)

        def load_model(self):
            return self._m

        def generate(self, prompt: str) -> str:
            resp = self._m.invoke(prompt)
            return str(getattr(resp, "content", resp))

        async def a_generate(self, prompt: str) -> str:
            resp = await self._m.ainvoke(prompt)
            return str(getattr(resp, "content", resp))

        def get_model_name(self) -> str:
            return os.environ.get("LLM_MODEL", "local")

    return LocalJudge()


@pytest.fixture(scope="session")
def judge():
    return make_judge()


DEFAULT_THRESHOLD = 0.7
DEFAULT_AGGREGATE_GATE = 0.80


def aggregate_gate(
    passes: int,
    total: int,
    failures: list[str],
    *,
    gate: float = DEFAULT_AGGREGATE_GATE,
    label: str = "deepeval",
) -> None:
    """Assert pass-rate ≥ ``gate`` across all (case × metric) cells.

    ``failures`` is a list of human-readable strings for diagnostics when the
    gate trips — only the first 30 are printed to keep output manageable.
    """
    rate = passes / max(1, total)
    summary = (
        f"{label} pass rate: {passes}/{total} = {rate:.2%} (gate {gate:.2f})"
    )
    if failures:
        summary += "\n  - " + "\n  - ".join(failures[:30])
    assert rate >= gate, summary


def run_metric(metric: Any, test_case: Any) -> tuple[bool, str]:
    """Invoke a deepeval metric safely.

    Returns ``(passed, reason_or_error)``. Any exception from the judge —
    malformed JSON, network flake, rate-limit — counts as a failure with the
    error message captured for diagnostics, so one bad judge response can't
    kill the whole run.
    """
    try:
        metric.measure(test_case)
        ok = bool(getattr(metric, "is_successful", lambda: False)())
        reason = getattr(metric, "reason", "") or ""
        score = getattr(metric, "score", None)
        return ok, f"score={score} reason={str(reason)[:200]}"
    except Exception as e:  # noqa: BLE001
        return False, f"error={e!r}"
