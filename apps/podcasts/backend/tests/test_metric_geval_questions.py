"""GEval-based quality evaluation for interview questions.

Uses deepeval's GEval metric to assess question quality across multiple
dimensions: specificity, research grounding, standalone clarity,
insight potential, and avoidance of generic patterns.

Usage:
    pytest tests/test_metric_geval_questions.py -v
    deepeval test run tests/test_metric_geval_questions.py
"""

import json
import os

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from helpers import get_eval_model

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

THRESHOLD = 0.5


# ── Test 1: questions are specific and non-generic ────────────────────────


@skip_no_key
def test_questions_specificity(sample_questions, sample_research):
    """Each question must reference specific projects, papers, or events — not be generic."""
    metric = GEval(
        name="Question Specificity",
        criteria=(
            "Each question in the list must be specific to the person being interviewed. "
            "It should reference named projects, papers, companies, decisions, quotes, or "
            "events that are unique to this person. Generic questions like 'What inspired "
            "you to start your company?' or 'Where do you see AI going?' score poorly. "
            "Good questions could only be asked to this specific person because they "
            "reference their unique work and experiences."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input=(
            f"Generate specific interview questions for {sample_research['name']}, "
            f"who is known for: {', '.join(sample_research['topics'][:5])}"
        ),
        actual_output=json.dumps([q["question"] for q in sample_questions]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Question specificity {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 2: questions invite stories, not yes/no answers ──────────────────


@skip_no_key
def test_questions_open_ended(sample_questions):
    """Questions must be open-ended and invite storytelling, not yes/no or single-fact answers."""
    metric = GEval(
        name="Question Open-Endedness",
        criteria=(
            "Each question should be open-ended and invite a detailed, narrative response. "
            "Questions answerable with 'yes', 'no', a single date, or a single name score "
            "poorly. Good questions use framing like 'What was...', 'How did...', 'Why did "
            "you choose...' and invite the guest to share a story, reasoning process, or "
            "nuanced perspective. The best questions create productive tension that draws "
            "out unexpected answers."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Generate open-ended interview questions for a podcast episode",
        actual_output=json.dumps([q["question"] for q in sample_questions]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Question open-endedness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 3: why_this_question rationale is insightful ─────────────────────


@skip_no_key
def test_why_this_question_quality(sample_questions):
    """why_this_question must articulate a clear reason the question is worth asking."""
    rationales = [
        f"Q: {q['question']}\nWhy: {q.get('why_this_question', '')}"
        for q in sample_questions
        if q.get("why_this_question")
    ]
    if not rationales:
        pytest.skip("No why_this_question fields in sample data")

    metric = GEval(
        name="Question Rationale Quality",
        criteria=(
            "Each rationale ('Why') must explain what makes the paired question valuable "
            "for a podcast interview. It should identify the specific insight gap the "
            "question targets — not just restate the question in different words. Good "
            "rationales mention things like 'reveals the founder's risk calculus' or "
            "'exposes limitations that drove the new abstraction'. Generic rationales "
            "like 'interesting to know' or 'good question to ask' score poorly."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Evaluate the rationale behind each interview question",
        actual_output="\n\n".join(rationales),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Question rationale quality {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 4: expected_insight is concrete ──────────────────────────────────


@skip_no_key
def test_expected_insight_concrete(sample_questions):
    """expected_insight must describe a concrete type of answer, not vague expectations."""
    insights = [
        f"Q: {q['question']}\nExpected: {q.get('expected_insight', '')}"
        for q in sample_questions
        if q.get("expected_insight")
    ]
    if not insights:
        pytest.skip("No expected_insight fields in sample data")

    metric = GEval(
        name="Expected Insight Concreteness",
        criteria=(
            "Each expected insight must describe a specific type of answer the question "
            "should draw out. It should name the kind of information expected — e.g., "
            "'a concrete anecdote about the moment of commitment' or 'a specific assertion "
            "category from SPADE with a real example'. Vague expectations like 'interesting "
            "thoughts' or 'their perspective' score poorly. The insight should help a "
            "podcast host know what to listen for in the guest's response."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Evaluate whether expected insights describe concrete answer types",
        actual_output="\n\n".join(insights),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Expected insight concreteness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 5: questions don't overlap with prior podcast topics ─────────────


@skip_no_key
def test_questions_novelty(sample_questions, sample_research):
    """Questions should not repeat topics the guest has already covered on prior podcasts."""
    prior_appearances = json.dumps(sample_research.get("podcast_appearances", []), indent=2)
    metric = GEval(
        name="Question Novelty vs Prior Appearances",
        criteria=(
            "Given the guest's prior podcast appearances (provided in context), the "
            "questions should NOT simply re-ask topics already covered. If the guest "
            "has been on 'Sequoia Training Data' discussing context engineering, asking "
            "'What is context engineering?' is redundant. Good questions build on or "
            "challenge prior discussion points rather than repeating them. Questions that "
            "find new angles on familiar topics are acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input=(
            f"Prior podcast appearances for {sample_research['name']}:\n{prior_appearances}\n\n"
            "Check that new questions don't repeat topics from these appearances."
        ),
        actual_output=json.dumps([q["question"] for q in sample_questions]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Question novelty {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 6: question set covers diverse aspects of the person ─────────────


@skip_no_key
def test_questions_diversity(sample_questions, sample_research):
    """The full question set should cover diverse aspects — not cluster on one topic."""
    metric = GEval(
        name="Question Topic Diversity",
        criteria=(
            "The set of 10 questions should cover a diverse range of the person's work "
            "and perspectives. No more than 3 questions should focus on the same project, "
            "event, or theme. The questions should span: career origin, technical work, "
            "philosophy/opinions, collaborations, and forward-looking predictions. A set "
            "where 7/10 questions are about the same project scores poorly."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input=f"Interview questions for {sample_research['name']} covering: {', '.join(sample_research['topics'][:7])}",
        actual_output=json.dumps(
            [{"category": q["category"], "question": q["question"]} for q in sample_questions],
            indent=2,
        ),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Question diversity {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
