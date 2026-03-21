"""Test contributions quality using deepeval's GEval metric.

Evaluates five quality dimensions of the key_contributions data produced
by the LangGraph research pipeline:

1. Impact metrics — descriptions cite adoption numbers, star counts, citations
2. Verifiable URLs — each contribution carries a URL
3. Distinctness — contributions cover different domains/projects
4. Specificity — descriptions state concrete impact, not vague claims
5. Reasonable count — between 3 and 6 contributions

Usage:
    pytest tests/test_metric_geval_contributions.py -v
    deepeval test run tests/test_metric_geval_contributions.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.6
MODEL = "deepseek/deepseek-chat"

PERSON_INPUT = (
    "List the key technical contributions of Harrison Chase, "
    "CEO and co-founder of LangChain"
)


# ── 1. descriptions include adoption metrics, star counts, citations ─────


@skip_no_key
def test_contributions_impact_metrics(sample_contributions):
    """Contribution descriptions should include quantitative impact metrics
    such as GitHub star counts, adoption figures, download numbers,
    citation counts, or user/company counts."""
    contributions_str = json.dumps(sample_contributions, indent=2)
    metric = GEval(
        name="Impact Metrics Presence",
        criteria=(
            "Evaluate whether the contribution descriptions include concrete "
            "quantitative impact metrics. Look for: GitHub star counts, "
            "download/install numbers, citation counts, number of users or "
            "companies adopting the project, revenue or funding figures, or "
            "benchmark results. Score 1.0 if most contributions cite at least "
            "one quantitative metric. Score 0.5 if some do. Score 0.0 if none "
            "of the descriptions include any numbers or measurable impact."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
        async_mode=False,
    )
    test_case = LLMTestCase(
        input=PERSON_INPUT,
        actual_output=contributions_str,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Impact metrics score {metric.score:.2f} < {THRESHOLD}: {metric.reason}"
    )


# ── 2. each contribution has a verifiable URL ────────────────────────────


@skip_no_key
def test_contributions_have_urls(sample_contributions):
    """Every contribution entry should include a non-empty url field
    pointing to a verifiable resource (GitHub repo, paper, product page)."""
    contributions_str = json.dumps(sample_contributions, indent=2)
    metric = GEval(
        name="URL Completeness",
        criteria=(
            "Evaluate whether every contribution object includes a 'url' field "
            "with a plausible, non-empty URL. The URL should point to a "
            "verifiable resource such as a GitHub repository, academic paper, "
            "product page, or official documentation. Score 1.0 if all "
            "contributions have valid-looking URLs. Score 0.5 if some are "
            "missing or use placeholder URLs (e.g. example.com). Score 0.0 "
            "if most contributions lack URLs."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
        async_mode=False,
    )
    test_case = LLMTestCase(
        input=PERSON_INPUT,
        actual_output=contributions_str,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"URL completeness score {metric.score:.2f} < {THRESHOLD}: {metric.reason}"
    )


# ── 3. contributions cover different domains/projects ────────────────────


@skip_no_key
def test_contributions_are_distinct(sample_contributions):
    """Contributions should cover different domains, projects, or problem
    spaces rather than being redundant variations of the same thing."""
    contributions_str = json.dumps(sample_contributions, indent=2)
    metric = GEval(
        name="Contribution Distinctness",
        criteria=(
            "Evaluate whether the listed contributions are genuinely distinct "
            "from one another. Each contribution should represent a different "
            "project, domain, product, or research direction. Deduct points if "
            "two or more contributions describe the same project under slightly "
            "different names, or if they cover overlapping scopes that should be "
            "merged. Score 1.0 if every contribution addresses a clearly "
            "different area. Score 0.5 if there is some overlap. Score 0.0 if "
            "contributions are largely redundant."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
        async_mode=False,
    )
    test_case = LLMTestCase(
        input=PERSON_INPUT,
        actual_output=contributions_str,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Distinctness score {metric.score:.2f} < {THRESHOLD}: {metric.reason}"
    )


# ── 4. descriptions mention concrete impact, not vague claims ───────────


@skip_no_key
def test_contributions_descriptions_specific(sample_contributions):
    """Descriptions should state concrete, specific impact rather than
    resorting to vague generalities like 'widely used' or 'important work'."""
    contributions_str = json.dumps(sample_contributions, indent=2)
    metric = GEval(
        name="Description Specificity",
        criteria=(
            "Evaluate whether the contribution descriptions are specific and "
            "concrete rather than vague. A specific description names the "
            "technology, explains what it does, and states measurable impact "
            "(e.g. '100k+ GitHub stars', 'used by thousands of companies for "
            "RAG pipelines'). A vague description uses hollow phrases like "
            "'made significant contributions', 'is widely recognized', "
            "'important work in the field', or 'a leading tool'. Score 1.0 if "
            "all descriptions are specific with concrete details. Score 0.5 if "
            "mixed. Score 0.0 if descriptions are predominantly vague."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
        async_mode=False,
    )
    test_case = LLMTestCase(
        input=PERSON_INPUT,
        actual_output=contributions_str,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Specificity score {metric.score:.2f} < {THRESHOLD}: {metric.reason}"
    )


# ── 5. 3-6 contributions (not too few, not too many) ────────────────────


@skip_no_key
def test_contributions_count_reasonable(sample_contributions):
    """The number of contributions should be between 3 and 6 inclusive.
    Fewer than 3 suggests incomplete research; more than 6 suggests
    insufficient curation and prioritization."""
    contributions_str = json.dumps(sample_contributions, indent=2)
    metric = GEval(
        name="Contribution Count Reasonableness",
        criteria=(
            "Evaluate whether the number of contributions listed is reasonable "
            "for a research profile. The ideal range is 3 to 6 contributions. "
            "Fewer than 3 suggests the research is incomplete and missed "
            "important work. More than 6 suggests lack of curation — the list "
            "should focus on the most impactful contributions, not be "
            "exhaustive. Score 1.0 if exactly 3-6 contributions are listed. "
            "Score 0.5 if 2 or 7 (borderline). Score 0.0 if 0-1 or 8+."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
        async_mode=False,
    )
    test_case = LLMTestCase(
        input=PERSON_INPUT,
        actual_output=contributions_str,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Count reasonableness score {metric.score:.2f} < {THRESHOLD}: {metric.reason}"
    )
