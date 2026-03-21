"""GEval-based competitive landscape quality evaluation.

Uses deepeval's GEval metric to assess five dimensions of competitive
landscape analysis: competitor naming, differentiation specificity,
market position validity, moat actionability, and ecosystem role clarity.

Usage:
    pytest tests/test_metric_geval_competitive.py -v
    deepeval test run tests/test_metric_geval_competitive.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

INPUT = "Analyze the competitive landscape for Harrison Chase / LangChain"
THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# ── 1. Competitors name specific companies/projects ─────────────────────


@skip_no_key
def test_competitors_named(sample_competitive):
    """Competitors array names specific companies/projects, not generic categories."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_competitive),
    )
    metric = GEval(
        name="Competitors Named",
        criteria=(
            "The 'competitors' array contains entries where each 'name' field is a "
            "specific, real company or project name (e.g. 'LlamaIndex', 'Semantic Kernel', "
            "'Haystack') rather than generic categories like 'other frameworks' or "
            "'various startups'. Each competitor must be identifiable and verifiable "
            "as an actual entity in the market. "
            "Score 1.0 if every competitor is a specific named entity, "
            "score 0.0 if any competitor is generic or unnamed."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Competitors Named score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── 2. Each competitor has a clear differentiation description ───────────


@skip_no_key
def test_differentiation_specific(sample_competitive):
    """Each competitor entry includes a specific differentiation description."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_competitive),
    )
    metric = GEval(
        name="Differentiation Specificity",
        criteria=(
            "Each entry in the 'competitors' array must have a 'differentiation' field "
            "that clearly explains how the subject differs from that competitor. The "
            "differentiation must be specific and substantive — mentioning concrete "
            "technical differences, focus areas, or strategic distinctions (e.g. "
            "'LangChain focuses on orchestration, LlamaIndex on data indexing'). "
            "Generic phrases like 'they are different' or 'competes in the same space' "
            "score 0.0. Score 1.0 if every competitor has a clear, specific differentiation."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Differentiation Specificity score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── 3. Market position is a valid enum value ─────────────────────────────


@skip_no_key
def test_market_position_valid(sample_competitive):
    """market_position must be one of leader/challenger/niche/pioneer."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_competitive),
    )
    metric = GEval(
        name="Market Position Valid",
        criteria=(
            "The 'market_position' field must contain exactly one of the following "
            "valid values: 'leader', 'challenger', 'niche', or 'pioneer'. "
            "The value must be a single lowercase word matching one of these four options. "
            "Score 1.0 if the value is exactly one of the four valid positions, "
            "score 0.0 if it is missing, empty, or any other value not in the set."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Market Position Valid score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── 4. Moats describe specific competitive advantages ────────────────────


@skip_no_key
def test_moats_actionable(sample_competitive):
    """Moats describe specific competitive advantages, not generic platitudes."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_competitive),
    )
    metric = GEval(
        name="Moats Actionable",
        criteria=(
            "The 'moats' array must contain entries that describe specific, actionable "
            "competitive advantages rather than generic business platitudes. Each moat "
            "should reference a concrete advantage such as 'First-mover advantage with "
            "100k+ GitHub stars', 'Massive open-source community contributing integrations', "
            "or 'Comprehensive tooling spanning orchestration, observability, and deployment'. "
            "Generic entries like 'good product', 'strong team', or 'innovation' score 0.0. "
            "Score 1.0 if every moat is specific and identifies a tangible competitive edge."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Moats Actionable score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── 5. Ecosystem role is a clear 1-2 sentence positioning ───────────────


@skip_no_key
def test_ecosystem_role_clear(sample_competitive):
    """ecosystem_role is a clear 1-2 sentence positioning statement."""
    test_case = LLMTestCase(
        input=INPUT,
        actual_output=json.dumps(sample_competitive),
    )
    metric = GEval(
        name="Ecosystem Role Clarity",
        criteria=(
            "The 'ecosystem_role' field must be a clear, concise positioning statement "
            "of 1-2 sentences that explains where the subject sits within the broader "
            "industry ecosystem. It should articulate the specific role or layer the "
            "entity occupies (e.g. 'Central orchestration layer in the LLM application "
            "stack' or 'Primary data indexing and retrieval layer for RAG applications'). "
            "The statement must be concrete enough that a reader unfamiliar with the "
            "subject can understand their market position. "
            "Score 1.0 if the role is clear, specific, and 1-2 sentences. "
            "Score 0.0 if it is vague, overly long, or missing."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Ecosystem Role Clarity score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
