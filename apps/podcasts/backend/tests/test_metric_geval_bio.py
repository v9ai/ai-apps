"""GEval-based bio quality tests using custom criteria metrics.

Each test defines a distinct GEval criterion and evaluates the sample bio
from conftest against it. Uses deepseek/deepseek-chat as the judge model.
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")


# ── 1. Specificity ─────────────────────────────────────────────────────

@skip_no_key
def test_bio_specificity(sample_bio, deepeval_model):
    """Bio contains specific named projects, organizations, and numbers."""
    metric = GEval(
        name="Bio Specificity",
        criteria=(
            "The bio contains specific, verifiable facts including named projects, "
            "organizations, and measurable achievements rather than vague generalities. "
            "It should mention concrete names (e.g. company names, product names, paper "
            "titles) and quantifiable metrics (e.g. GitHub stars, funding amounts)."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Write a professional bio for this person.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio Specificity score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 2. Conciseness ─────────────────────────────────────────────────────

@skip_no_key
def test_bio_conciseness(sample_bio, deepeval_model):
    """Bio is 3-5 sentences and not overly verbose."""
    metric = GEval(
        name="Bio Conciseness",
        criteria=(
            "The bio is concise, consisting of roughly 3 to 5 sentences. It avoids "
            "unnecessary filler words, redundant clauses, and overly verbose phrasing. "
            "Every sentence should contribute meaningful information without repeating "
            "what was already stated."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Write a concise professional bio for this person.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio Conciseness score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 3. Accuracy signals ────────────────────────────────────────────────

@skip_no_key
def test_bio_accuracy_signals(sample_bio, deepeval_model):
    """Bio references verifiable facts that could be checked against public sources."""
    metric = GEval(
        name="Bio Accuracy Signals",
        criteria=(
            "The bio references facts that are verifiable against public sources: "
            "real company names, real job titles, published papers or projects with "
            "names that can be looked up, and factual claims tied to observable evidence "
            "such as GitHub repositories, news articles, or conference talks."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Write an accurate bio for this person based on verified facts.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio Accuracy Signals score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 4. Professional tone ───────────────────────────────────────────────

@skip_no_key
def test_bio_professional_tone(sample_bio, deepeval_model):
    """Bio uses professional, neutral language without hype or casual slang."""
    metric = GEval(
        name="Bio Professional Tone",
        criteria=(
            "The bio uses professional, neutral, and objective language appropriate "
            "for a business or academic context. It avoids casual slang, excessive "
            "superlatives, marketing hype, emojis, exclamation marks, and first-person "
            "pronouns. The tone should be similar to a Wikipedia biography or a "
            "conference speaker introduction."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Write a professional bio for this person.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio Professional Tone score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 5. Completeness ────────────────────────────────────────────────────

@skip_no_key
def test_bio_completeness(sample_bio, deepeval_model):
    """Bio covers role, organization, achievements, and current focus."""
    metric = GEval(
        name="Bio Completeness",
        criteria=(
            "The bio covers all essential aspects of the person's professional identity: "
            "(1) their current role or title, (2) their primary organization or company, "
            "(3) notable achievements or contributions they are known for, and "
            "(4) their current area of focus or work. A complete bio should leave the "
            "reader with a clear understanding of who this person is and why they matter."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Write a complete professional bio for this person.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio Completeness score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 6. No fabrication signals ──────────────────────────────────────────

@skip_no_key
def test_bio_no_fabrication_signals(sample_bio, deepeval_model):
    """Bio does not contain hedging phrases that signal uncertain or fabricated content."""
    metric = GEval(
        name="Bio No Fabrication Signals",
        criteria=(
            "The bio does not contain hedging phrases or weasel words that signal "
            "uncertain or potentially fabricated information. It should NOT include "
            "phrases like 'is believed to', 'reportedly', 'it is said that', "
            "'some sources suggest', 'is widely considered', 'allegedly', or "
            "'according to some'. Every claim should be stated as a direct factual "
            "assertion without epistemic hedging."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Write a factual bio for this person without hedging language.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio No Fabrication Signals score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )
