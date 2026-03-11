"""Shared fixtures and metrics for knowledge article evaluations."""

import glob
from pathlib import Path

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

from deepseek_model import DeepSeekModel

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
THRESHOLD = 0.7

model = DeepSeekModel()


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

coherence_metric = GEval(
    name="Coherence",
    criteria=(
        "Evaluate the logical flow and structural coherence of the article. "
        "Check that sections transition smoothly, the narrative builds logically "
        "from fundamentals to advanced topics, and the overall argument or "
        "explanation forms a cohesive arc."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

factual_grounding_metric = GEval(
    name="Factual Grounding",
    criteria=(
        "Evaluate whether claims are properly attributed to sources. "
        "Check for citation of specific papers, benchmarks, or established results. "
        "Penalize unsourced quantitative claims and vague attributions like "
        "'studies show' without specifics."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

completeness_metric = GEval(
    name="Completeness",
    criteria=(
        "Evaluate whether the article covers the topic comprehensively. "
        "Check for coverage of fundamentals, practical code examples or "
        "pseudocode, discussion of trade-offs and limitations, and actionable "
        "takeaways or implementation guidance."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)

readability_metric = GEval(
    name="Readability",
    criteria=(
        "Evaluate clarity and accessibility of the writing. Check that technical "
        "jargon is explained on first use, analogies aid understanding, code "
        "snippets are properly formatted with context, and mathematical notation "
        "is accompanied by intuitive explanation."
    ),
    evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
    model=model,
    threshold=THRESHOLD,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _load_articles() -> list[tuple[str, str]]:
    """Load all agent-*.md articles, returning (id, content) pairs."""
    pattern = str(CONTENT_DIR / "agent-*.md")
    files = sorted(glob.glob(pattern))
    articles = []
    for fp in files:
        path = Path(fp)
        # Extract ID like "agent-01" from "agent-01-transformer-architecture.md"
        stem = path.stem
        parts = stem.split("-")
        article_id = f"{parts[0]}-{parts[1]}"
        content = path.read_text(encoding="utf-8")
        articles.append((article_id, content))
    return articles


@pytest.fixture(scope="session")
def articles() -> list[tuple[str, str]]:
    return _load_articles()
