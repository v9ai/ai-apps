"""Backwards-compat: re-export eval API + fixtures from press.evals and press._fixtures."""

from press.evals import (  # noqa: F401
    ArticleEvalResult,
    MetricResult,
    evaluate_article,
    evaluate_article_sync,
    evaluate_file,
    validate_published_output,
)

from press._fixtures import (  # noqa: F401
    GOOD_ARTICLE,
    BAD_ARTICLE,
    SAMPLE_RESEARCH_BRIEF,
    SAMPLE_SEO_STRATEGY,
    SAMPLE_SEO_DISCOVERY,
    SAMPLE_SEO_BLUEPRINT,
)
