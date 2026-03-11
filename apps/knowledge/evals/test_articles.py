"""Parametrized DeepEval tests for knowledge articles."""

import glob
from pathlib import Path

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    CONTENT_DIR,
    coherence_metric,
    completeness_metric,
    factual_grounding_metric,
    readability_metric,
)


def _article_params() -> list[pytest.param]:
    """Build pytest params for each article."""
    pattern = str(CONTENT_DIR / "agent-*.md")
    files = sorted(glob.glob(pattern))
    params = []
    for fp in files:
        path = Path(fp)
        stem = path.stem
        parts = stem.split("-")
        article_id = f"{parts[0]}-{parts[1]}"
        content = path.read_text(encoding="utf-8")
        params.append(pytest.param(content, id=article_id))
    return params


_ARTICLES = _article_params()


@pytest.mark.parametrize("article_content", _ARTICLES)
def test_coherence(article_content: str):
    test_case = LLMTestCase(
        input="Evaluate article quality",
        actual_output=article_content,
    )
    assert_test(test_case, [coherence_metric])


@pytest.mark.parametrize("article_content", _ARTICLES)
def test_factual_grounding(article_content: str):
    test_case = LLMTestCase(
        input="Evaluate article quality",
        actual_output=article_content,
    )
    assert_test(test_case, [factual_grounding_metric])


@pytest.mark.parametrize("article_content", _ARTICLES)
def test_completeness(article_content: str):
    test_case = LLMTestCase(
        input="Evaluate article quality",
        actual_output=article_content,
    )
    assert_test(test_case, [completeness_metric])


@pytest.mark.parametrize("article_content", _ARTICLES)
def test_readability(article_content: str):
    test_case = LLMTestCase(
        input="Evaluate article quality",
        actual_output=article_content,
    )
    assert_test(test_case, [readability_metric])
