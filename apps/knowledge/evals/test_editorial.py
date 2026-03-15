"""Integration and quality tests for the journalism editorial pipeline."""

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import model
from editorial import JournalismState, build_journalism_graph

TOPIC = "The rise of small language models for on-device AI"
THRESHOLD = 0.7


@pytest.fixture(scope="module")
def article_state() -> JournalismState:
    """Run the full journalism pipeline once and cache the result."""
    graph = build_journalism_graph()
    result = graph.invoke(
        {
            "topic": TOPIC,
            "slug": "small-language-models-on-device",
            "research": "",
            "seo": "",
            "intro_strategy": "",
            "draft": "",
            "editor_output": "",
            "editor_decision": "",
            "revision_rounds": 0,
            "approved": False,
        }
    )
    return result


def test_journalism_pipeline_produces_article(article_state: JournalismState):
    """The pipeline should produce non-empty outputs for all phases."""
    assert article_state["research"], "research output should be non-empty"
    assert article_state["seo"], "seo output should be non-empty"
    assert article_state["intro_strategy"], "intro_strategy output should be non-empty"
    assert article_state["draft"], "draft should be non-empty"
    assert article_state["editor_output"], "editor output should be non-empty"
    assert article_state["editor_decision"] in (
        "approve",
        "revise",
    ), f"unexpected decision: {article_state['editor_decision']}"
    assert article_state["revision_rounds"] >= 1, "should have at least 1 editor round"


def test_editor_decision_format(article_state: JournalismState):
    """Editor output must contain APPROVE or REVISE decision."""
    output = article_state["editor_output"]
    has_approve = "APPROVE" in output or "status: published" in output
    has_revise = "REVISE" in output
    assert has_approve or has_revise, (
        "Editor output must contain APPROVE or REVISE"
    )


def test_journalism_article_coherence(article_state: JournalismState):
    """Evaluate coherence of the final draft."""
    metric = GEval(
        name="Coherence",
        criteria=(
            "Evaluate the logical flow and structural coherence of the article. "
            "Check that sections transition smoothly, the narrative builds logically, "
            "and the overall argument forms a cohesive arc."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        model=model,
        threshold=THRESHOLD,
    )
    test_case = LLMTestCase(
        input=TOPIC,
        actual_output=article_state["draft"],
    )
    assert_test(test_case, [metric])


def test_journalism_article_factual_grounding(article_state: JournalismState):
    """Evaluate factual grounding of the final draft against the research brief."""
    metric = GEval(
        name="Factual Grounding",
        criteria=(
            "Evaluate whether claims in the article are properly attributed to sources. "
            "Check for citation of specific data, benchmarks, or established results. "
            "Penalize unsourced quantitative claims and vague attributions."
        ),
        evaluation_params=[
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.RETRIEVAL_CONTEXT,
        ],
        model=model,
        threshold=THRESHOLD,
    )
    test_case = LLMTestCase(
        input=TOPIC,
        actual_output=article_state["draft"],
        retrieval_context=[article_state["research"]],
    )
    assert_test(test_case, [metric])


def test_journalism_article_completeness(article_state: JournalismState):
    """Evaluate completeness of the final draft."""
    metric = GEval(
        name="Completeness",
        criteria=(
            "Evaluate whether the article covers the topic comprehensively. "
            "Check for coverage of key aspects, practical implications, "
            "discussion of trade-offs and limitations, and actionable takeaways."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        model=model,
        threshold=THRESHOLD,
    )
    test_case = LLMTestCase(
        input=TOPIC,
        actual_output=article_state["draft"],
    )
    assert_test(test_case, [metric])


def test_journalism_article_readability(article_state: JournalismState):
    """Evaluate readability of the final draft."""
    metric = GEval(
        name="Readability",
        criteria=(
            "Evaluate clarity and accessibility of the writing. Check that technical "
            "jargon is explained, the article uses active voice, paragraphs are short, "
            "and the overall piece is engaging and easy to follow."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        model=model,
        threshold=THRESHOLD,
    )
    test_case = LLMTestCase(
        input=TOPIC,
        actual_output=article_state["draft"],
    )
    assert_test(test_case, [metric])
