"""GEval-based quality evaluation for executive summary fields.

Uses deepeval's GEval metric to assess each executive summary field
against specific quality criteria: conciseness, specificity, narrative
coherence, actionability, and justified confidence.

Usage:
    pytest tests/test_metric_geval_executive.py -v
    deepeval test run tests/test_metric_geval_executive.py
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
MODEL = "deepseek/deepseek-chat"


# ── Test 1: one_liner is a single concise sentence ──────────────────────


@skip_no_key
def test_one_liner_concise(sample_executive):
    """one_liner must be a single sentence that captures the person's essence."""
    metric = GEval(
        name="One-Liner Conciseness",
        criteria=(
            "The output must be a single sentence (no more than one period or "
            "sentence-ending punctuation). It should capture who this person is "
            "and why they matter in the AI/tech industry. It should be specific "
            "enough to distinguish this person from others — not a generic "
            "description that could apply to anyone."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Write a one-liner summary capturing the essence of Harrison Chase",
        actual_output=sample_executive["one_liner"],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"One-liner conciseness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 2: key_facts are specific and actionable ────────────────────────


@skip_no_key
def test_key_facts_actionable(sample_executive):
    """key_facts must be specific, quantified where possible, not generic platitudes."""
    metric = GEval(
        name="Key Facts Actionability",
        criteria=(
            "Each fact in the list must be specific and actionable — containing "
            "concrete numbers, dates, named entities, or verifiable claims. "
            "Generic statements like 'is well respected' or 'has made significant "
            "contributions' score poorly. Facts should give a reader immediate, "
            "usable intelligence about the person."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="List key facts about Harrison Chase that an executive should know before a meeting",
        actual_output=json.dumps(sample_executive["key_facts"]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Key facts actionability {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 3: career_arc reads as a coherent narrative ─────────────────────


@skip_no_key
def test_career_arc_narrative(sample_executive):
    """career_arc must read as a coherent narrative arc, not a list of bullet points."""
    metric = GEval(
        name="Career Arc Narrative Coherence",
        criteria=(
            "The output should read as a coherent narrative that traces the "
            "person's professional journey with a clear beginning, progression, "
            "and current state. It should flow naturally as prose, not feel like "
            "a bullet list converted to a sentence. It should mention specific "
            "organizations, roles, or milestones that anchor the narrative."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Describe the career arc of Harrison Chase as a coherent narrative",
        actual_output=sample_executive["career_arc"],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Career arc narrative {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 4: meeting_prep items are usable conversation starters ──────────


@skip_no_key
def test_meeting_prep_useful(sample_executive):
    """meeting_prep items must be conversation starters an executive could actually use."""
    metric = GEval(
        name="Meeting Prep Usefulness",
        criteria=(
            "Each item should be a concrete, actionable conversation starter or "
            "talking point that a senior executive could use in a real meeting. "
            "Items should reference specific projects, opinions, or recent work "
            "of the person — not generic questions like 'tell me about yourself'. "
            "They should demonstrate preparation and domain knowledge."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Suggest meeting preparation talking points for a meeting with Harrison Chase",
        actual_output=json.dumps(sample_executive["meeting_prep"]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Meeting prep usefulness {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 5: risk_factors name specific risks ─────────────────────────────


@skip_no_key
def test_risk_factors_specific(sample_executive):
    """risk_factors must name specific risks with named competitors or concrete threats."""
    metric = GEval(
        name="Risk Factors Specificity",
        criteria=(
            "Each risk factor must identify a specific, concrete risk — naming "
            "particular competitors, market forces, technical challenges, or "
            "regulatory threats. Vague concerns like 'market risk' or 'competition "
            "exists' score poorly. Good risk factors name specific entities "
            "(e.g. 'LlamaIndex gaining traction in data indexing') and explain "
            "why they pose a threat."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    test_case = LLMTestCase(
        input="Identify specific risk factors for Harrison Chase and LangChain",
        actual_output=json.dumps(sample_executive["risk_factors"]),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Risk factors specificity {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 6: confidence_level has clear reasoning ─────────────────────────


@skip_no_key
def test_confidence_justified(sample_executive):
    """confidence_level must be a recognized level with implicit justification."""
    metric = GEval(
        name="Confidence Justification",
        criteria=(
            "The confidence level should be a clearly stated assessment "
            "(e.g. 'high', 'medium', 'low') that is appropriate given the "
            "available evidence. A 'high' confidence is justified when the "
            "person has a strong public presence, verifiable claims, and "
            "well-documented career. The level should not be inflated beyond "
            "what the evidence supports, nor deflated without reason."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    # Provide full executive summary as context in the input so the LLM judge
    # can assess whether the confidence level is warranted by the evidence.
    executive_context = json.dumps(
        {k: v for k, v in sample_executive.items() if k != "confidence_level"},
        indent=2,
    )
    test_case = LLMTestCase(
        input=(
            f"Given this executive summary for Harrison Chase:\n{executive_context}\n\n"
            "Rate the confidence level of this research profile."
        ),
        actual_output=sample_executive["confidence_level"],
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Confidence justification {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
