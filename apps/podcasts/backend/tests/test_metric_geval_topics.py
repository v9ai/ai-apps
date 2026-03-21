"""Topics/expertise quality evaluation using deepeval's GEval metric.

Tests five dimensions of topic list quality from LangGraph research output:
1. Specificity — topics are specific ("RAG pipeline optimization") not vague ("AI")
2. Count — 5-10 topics, reasonable coverage
3. Relevance — topics relate to the person's actual work
4. No duplicates — topics are distinct, no near-duplicates
5. Currency — topics reflect current focus areas, not outdated

Usage:
    pytest tests/test_metric_geval_topics.py -v
    deepeval test run tests/test_metric_geval_topics.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.5
INPUT = "Extract expertise topics for Harrison Chase CEO LangChain"


# -- 1. Topics are specific, not vague ----------------------------------------


@skip_no_key
def test_topics_specific_not_vague(sample_topics, deepeval_model):
    """Topics should be specific domain terms, not single-word generalities."""
    metric = GEval(
        name="Topic Specificity",
        criteria=(
            "Each topic in the list should be a specific, descriptive phrase that "
            "clearly identifies a narrow area of expertise. Good examples: "
            "'RAG pipeline optimization', 'multi-agent coordination', 'LLM observability'. "
            "Bad examples: 'AI', 'technology', 'software', 'innovation'. "
            "Penalize topics that are single generic words or overly broad categories "
            "that could apply to any tech professional. Each topic should be precise "
            "enough that it meaningfully distinguishes this person's expertise."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_topics),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Topic Specificity score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 2. Topic count is reasonable (5-10) --------------------------------------


@skip_no_key
def test_topics_count(sample_topics, deepeval_model):
    """Topic list should contain between 5 and 10 items for reasonable coverage."""
    metric = GEval(
        name="Topic Count",
        criteria=(
            "The topic list should contain between 5 and 10 topics. Fewer than 5 "
            "topics suggests incomplete coverage of the person's expertise areas. "
            "More than 10 topics suggests the list is unfocused and diluted. "
            "The ideal range is 5-10 well-chosen topics that together paint a "
            "comprehensive picture of the person's domain expertise without being "
            "exhaustive or redundant."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_topics),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Topic Count score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 3. Topics are relevant to the person's work ------------------------------


@skip_no_key
def test_topics_relevant_to_person(sample_topics, deepeval_model):
    """Topics should relate to Harrison Chase's actual work at LangChain."""
    metric = GEval(
        name="Topic Relevance",
        criteria=(
            "The topics should be directly relevant to the actual work and expertise "
            "of Harrison Chase, CEO of LangChain. Relevant topics include areas like "
            "LLM orchestration, agent frameworks, RAG, context engineering, developer "
            "tooling for AI, and related domains he is publicly known for. "
            "Penalize topics that have no clear connection to his known professional "
            "activities, publications, talks, or the products he has built. "
            "Every topic should be something a well-informed person would associate "
            "with Harrison Chase specifically."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_topics),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Topic Relevance score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 4. No duplicate or near-duplicate topics ---------------------------------


@skip_no_key
def test_topics_no_duplicates(sample_topics, deepeval_model):
    """Topics should be distinct from each other with no near-duplicates."""
    metric = GEval(
        name="Topic Distinctness",
        criteria=(
            "Each topic in the list should be meaningfully distinct from every other "
            "topic. There should be no exact duplicates, no near-duplicates, and no "
            "pairs that are merely synonyms or rephrasings of the same concept. "
            "For example, 'LLM orchestration' and 'LLM workflow orchestration' would "
            "be near-duplicates. Similarly, 'agentic systems' and 'AI agents' overlap "
            "significantly. Each topic should carve out its own unique area of expertise "
            "that is not already covered by another topic in the list."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_topics),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Topic Distinctness score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 5. Topics reflect current focus areas ------------------------------------


@skip_no_key
def test_topics_current(sample_topics, deepeval_model):
    """Topics should reflect the person's current focus, not outdated interests."""
    metric = GEval(
        name="Topic Currency",
        criteria=(
            "The topics should reflect the person's current and recent areas of focus "
            "rather than outdated or historical interests. For a technology leader like "
            "Harrison Chase, topics should align with what he is actively working on, "
            "speaking about, and building today — such as agentic systems, multi-agent "
            "coordination, and LLM observability — rather than deprecated technologies "
            "or past career interests that are no longer relevant. The topic list should "
            "feel timely and forward-looking, capturing where the person's expertise "
            "is concentrated now."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_topics),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Topic Currency score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
