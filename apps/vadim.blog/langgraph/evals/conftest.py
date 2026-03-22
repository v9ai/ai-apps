"""Eval-specific fixtures — class-scoped to avoid redundant LLM calls."""

import pytest

from press.evals import ArticleEvalResult, evaluate_article_sync
from press._fixtures import (
    GOOD_ARTICLE,
    BAD_ARTICLE,
    SAMPLE_RESEARCH_BRIEF,
    SAMPLE_SEO_STRATEGY,
)


@pytest.fixture(scope="class")
def good_result() -> ArticleEvalResult:
    return evaluate_article_sync(
        GOOD_ARTICLE,
        research_brief=SAMPLE_RESEARCH_BRIEF,
        seo_strategy=SAMPLE_SEO_STRATEGY,
    )


@pytest.fixture(scope="class")
def bad_result() -> ArticleEvalResult:
    return evaluate_article_sync(
        BAD_ARTICLE,
        metrics_to_run=["source_citation", "writing_quality", "journalistic_standards"],
    )
