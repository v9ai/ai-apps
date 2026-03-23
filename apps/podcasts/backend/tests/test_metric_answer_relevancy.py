"""Test LangGraph agent outputs for answer relevancy using deepeval.

Each test evaluates whether an agent's output is relevant to the task
description it was given, using deepeval's AnswerRelevancyMetric backed
by DeepSeek as the evaluator LLM.
"""

import json
import os

import pytest
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase
from helpers import get_eval_model

pytestmark = pytest.mark.deepeval

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


def _skip_without_key():
    if not os.getenv("DEEPSEEK_API_KEY"):
        pytest.skip("DEEPSEEK_API_KEY not set")


def test_bio_relevancy(sample_bio):
    _skip_without_key()

    test_case = LLMTestCase(
        input="Write a biography for Harrison Chase CEO LangChain",
        actual_output=sample_bio,
    )
    metric = AnswerRelevancyMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, metric.reason


def test_timeline_relevancy(sample_timeline):
    _skip_without_key()

    test_case = LLMTestCase(
        input="Build a chronological timeline of key career events for Harrison Chase",
        actual_output=json.dumps(sample_timeline),
    )
    metric = AnswerRelevancyMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, metric.reason


def test_contributions_relevancy(sample_contributions):
    _skip_without_key()

    test_case = LLMTestCase(
        input="Identify technical contributions made by Harrison Chase",
        actual_output=json.dumps(sample_contributions),
    )
    metric = AnswerRelevancyMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, metric.reason


def test_quotes_relevancy(sample_quotes):
    _skip_without_key()

    test_case = LLMTestCase(
        input="Find authentic verbatim quotes from Harrison Chase",
        actual_output=json.dumps(sample_quotes),
    )
    metric = AnswerRelevancyMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, metric.reason


def test_executive_summary_relevancy(sample_executive):
    _skip_without_key()

    test_case = LLMTestCase(
        input="Synthesize an executive profile summary for Harrison Chase",
        actual_output=json.dumps(sample_executive),
    )
    metric = AnswerRelevancyMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, metric.reason


def test_topics_relevancy(sample_topics):
    _skip_without_key()

    test_case = LLMTestCase(
        input="Extract technical expertise topics for Harrison Chase",
        actual_output=json.dumps(sample_topics),
    )
    metric = AnswerRelevancyMetric(threshold=THRESHOLD, model=get_eval_model())
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, metric.reason
