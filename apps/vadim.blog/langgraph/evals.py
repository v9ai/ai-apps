"""Backwards-compat shim — eval logic lives at press.evals.

Run tests:
    uv run pytest src/press/evals.py -v          # recommended
    uv run pytest evals.py -v                    # via this shim
"""

from press.evals import *  # noqa: F401, F403

# Explicit re-exports for pytest class discovery through this shim
from press.evals import (  # noqa: F401
    ArticleEvalResult,
    MetricResult,
    evaluate_article,
    evaluate_article_sync,
    evaluate_file,
    validate_published_output,
    TestHelpers,
    TestArticleEvalResult,
    TestMetricSpecs,
    TestGoldenSamples,
    TestSeoSlugHelpers,
    TestLLMEvalGoodArticle,
    TestLLMEvalBadArticle,
    TestLLMEvalHallucination,
    TestPublishIntegrity,
    GOOD_ARTICLE,
    BAD_ARTICLE,
    SAMPLE_RESEARCH_BRIEF,
    SAMPLE_SEO_STRATEGY,
    SAMPLE_SEO_DISCOVERY,
    SAMPLE_SEO_BLUEPRINT,
)
