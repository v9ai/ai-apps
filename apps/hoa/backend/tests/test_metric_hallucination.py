"""Test LangGraph agent outputs for hallucination using deepeval.

Each test evaluates whether an agent's output contains fabricated information
that is not grounded in the provided context, using deepeval's HallucinationMetric
backed by DeepSeek as the evaluator LLM.

HallucinationMetric scoring:
- Lower score = less hallucination (0.0 = perfectly grounded)
- The `context` parameter (list of strings) serves as the ground truth
- `threshold` is the maximum acceptable hallucination score
"""

import json
import os

import pytest
from deepeval.metrics import HallucinationMetric
from deepeval.test_case import LLMTestCase
from helpers import get_eval_model

pytestmark = pytest.mark.deepeval

skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# ── ground-truth context strings ────────────────────────────────────────

BIO_CONTEXT = [
    "Harrison Chase is the CEO and co-founder of LangChain.",
    "LangChain is an open-source LLM orchestration framework with 100k+ GitHub stars.",
    "Harrison Chase coined the term 'context engineering'.",
    "He published the SPADE paper on data quality assertions for LLM pipelines.",
    "Before LangChain, he worked at Robust Intelligence and Kensho.",
]

TIMELINE_CONTEXT = [
    "Harrison Chase founded LangChain in October 2022.",
    "LangChain raised a $25M Series A led by Sequoia in April 2023.",
    "Harrison Chase published the SPADE paper on arXiv in January 2024.",
    "LangGraph for multi-agent systems was launched in June 2024.",
]

QUOTES_CONTEXT = [
    "Harrison Chase said 'The key insight is that context engineering is the new prompt engineering.' on the Sequoia Training Data Podcast.",
    "Harrison Chase said 'We built LangChain because we saw developers reinventing the same patterns.' on This Week in Startups.",
]

CONTRIBUTIONS_CONTEXT = [
    "LangChain is an open-source LLM orchestration framework with 100k+ stars, used by thousands of companies for RAG, agents, and chains.",
    "LangGraph is a stateful multi-agent framework enabling cyclic computation graphs for complex agent workflows.",
    "LangSmith is an LLM observability and testing platform for debugging, monitoring, and evaluating LLM applications.",
]

EXECUTIVE_CONTEXT = [
    "Harrison Chase is the creator of LangChain, the most widely adopted LLM orchestration framework.",
    "LangChain has 100k+ GitHub stars and is used by thousands of companies.",
    "LangChain raised $25M Series A led by Sequoia in 2023.",
    "Harrison Chase coined 'context engineering' as a discipline for agent builders.",
    "His career arc goes from Kensho and Robust Intelligence to founding LangChain in late 2022.",
    "Current focus is LangGraph for stateful multi-agent systems and LangSmith for observability.",
]


# ── tests ────────────────────────────────────────────────────────────────


@skip_no_key
def test_bio_no_hallucination(sample_bio):
    """Bio output should not hallucinate beyond provided context."""
    test_case = LLMTestCase(
        input="Write a biography for Harrison Chase CEO of LangChain",
        actual_output=sample_bio,
        context=BIO_CONTEXT,
    )
    metric = HallucinationMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score <= THRESHOLD, (
        f"Bio hallucination score {metric.score} exceeds threshold {THRESHOLD}: {metric.reason}"
    )


@skip_no_key
def test_timeline_no_hallucination(sample_timeline):
    """Timeline events should be grounded in known facts."""
    test_case = LLMTestCase(
        input="Build a chronological timeline of key career events for Harrison Chase",
        actual_output=json.dumps(sample_timeline),
        context=TIMELINE_CONTEXT,
    )
    metric = HallucinationMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score <= THRESHOLD, (
        f"Timeline hallucination score {metric.score} exceeds threshold {THRESHOLD}: {metric.reason}"
    )


@skip_no_key
def test_quotes_no_hallucination(sample_quotes):
    """Quotes must not be fabricated -- this is critical for credibility."""
    test_case = LLMTestCase(
        input="Find authentic verbatim quotes from Harrison Chase",
        actual_output=json.dumps(sample_quotes),
        context=QUOTES_CONTEXT,
    )
    metric = HallucinationMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score <= THRESHOLD, (
        f"Quotes hallucination score {metric.score} exceeds threshold {THRESHOLD}: {metric.reason}"
    )


@skip_no_key
def test_contributions_no_hallucination(sample_contributions):
    """Key contributions should reference real projects."""
    test_case = LLMTestCase(
        input="Identify technical contributions made by Harrison Chase",
        actual_output=json.dumps(sample_contributions),
        context=CONTRIBUTIONS_CONTEXT,
    )
    metric = HallucinationMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score <= THRESHOLD, (
        f"Contributions hallucination score {metric.score} exceeds threshold {THRESHOLD}: {metric.reason}"
    )


@skip_no_key
def test_known_hallucination_detected():
    """A deliberately fabricated bio SHOULD score high, validating the metric catches hallucinations."""
    fabricated_output = (
        "Harrison Chase is the founder of OpenAI and invented the transformer architecture "
        "in 2015. He received the Nobel Prize in Computer Science in 2020 and previously "
        "served as CTO of Google DeepMind. He holds 47 patents on quantum computing and "
        "co-authored the GPT-4 paper with Sam Altman. LangChain was acquired by Microsoft "
        "for $10 billion in 2024."
    )
    test_case = LLMTestCase(
        input="Write a biography for Harrison Chase CEO of LangChain",
        actual_output=fabricated_output,
        context=BIO_CONTEXT,
    )
    metric = HallucinationMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score > THRESHOLD, (
        f"Fabricated bio scored only {metric.score} -- metric failed to detect obvious hallucinations: {metric.reason}"
    )


@skip_no_key
def test_executive_grounded(sample_executive):
    """Executive summary should be grounded in known facts."""
    test_case = LLMTestCase(
        input="Synthesize an executive profile summary for Harrison Chase",
        actual_output=json.dumps(sample_executive),
        context=EXECUTIVE_CONTEXT,
    )
    metric = HallucinationMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score <= THRESHOLD, (
        f"Executive summary hallucination score {metric.score} exceeds threshold {THRESHOLD}: {metric.reason}"
    )
