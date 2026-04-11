"""GEval-based technical philosophy quality evaluation.

Tests five dimensions of technical_philosophy quality from LangGraph research output:
1. Core thesis clarity — core_thesis is a clear, specific statement of belief
2. Evidence-based positions — positions cite specific sources, not assumptions
3. Timestamped predictions — predictions have date_made and timeframe
4. Genuine contrarian takes — contrarian_takes differ from mainstream consensus
5. Key debate coverage — positions address relevant AI debates

Usage:
    pytest tests/test_metric_geval_philosophy.py -v
    deepeval test run tests/test_metric_geval_philosophy.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams
from helpers import get_eval_model

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# -- 1. Core thesis is a clear, specific statement of belief ----------------


@skip_no_key
def test_core_thesis_articulate(sample_philosophy):
    """core_thesis must be a clear, specific statement of belief, not a vague platitude."""
    test_case = LLMTestCase(
        input="Articulate the core technical philosophy for Harrison Chase",
        actual_output=json.dumps(sample_philosophy),
    )
    metric = GEval(
        name="Core Thesis Clarity",
        criteria=(
            "The 'core_thesis' field must be a clear, specific statement of technical "
            "belief that a reader could agree or disagree with. It should articulate a "
            "concrete position about technology, methodology, or industry direction — "
            "not a vague platitude like 'AI will change the world' or 'technology is "
            "important'. The thesis should be opinionated enough that someone could "
            "write a rebuttal. Score 1.0 if the thesis is specific, arguable, and "
            "clearly stated. Score 0.0 if it is generic, vague, or unfalsifiable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Core Thesis Clarity score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 2. Positions cite specific sources, not assumptions -------------------


@skip_no_key
def test_positions_evidence_based(sample_philosophy):
    """Positions must cite specific evidence or sources, not rely on assumptions."""
    test_case = LLMTestCase(
        input="Document evidence-based technical positions for Harrison Chase",
        actual_output=json.dumps(sample_philosophy),
    )
    metric = GEval(
        name="Positions Evidence-Based",
        criteria=(
            "Each position in the 'positions' object must include concrete evidence "
            "or source references supporting the stated stance. Look for fields like "
            "'evidence', 'source_url', or inline references to specific projects, "
            "papers, talks, or public statements. Positions that state a stance "
            "without any supporting evidence — relying on assumptions, hearsay, or "
            "generic reasoning — should be penalized. Score 1.0 if every position "
            "cites specific, verifiable evidence. Score 0.0 if positions lack "
            "evidence entirely."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Positions Evidence-Based score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 3. Predictions have date_made and timeframe ---------------------------


@skip_no_key
def test_predictions_timestamped(sample_philosophy):
    """Every prediction must include date_made and timeframe fields."""
    test_case = LLMTestCase(
        input="Record timestamped technical predictions for Harrison Chase",
        actual_output=json.dumps(sample_philosophy),
    )
    metric = GEval(
        name="Predictions Timestamped",
        criteria=(
            "Each entry in the 'predictions' list must include both a 'date_made' "
            "field (indicating when the prediction was made, in YYYY-MM or YYYY-MM-DD "
            "format) and a 'timeframe' field (indicating the expected horizon for the "
            "prediction, e.g. '2-3 years', 'by 2027', '12 months'). Predictions "
            "without temporal anchoring are unverifiable and should be penalized. "
            "Score 1.0 if every prediction has both fields populated with plausible "
            "values. Score 0.0 if any prediction is missing date_made or timeframe."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Predictions Timestamped score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 4. Contrarian takes genuinely differ from mainstream consensus ---------


@skip_no_key
def test_contrarian_takes_genuine(sample_philosophy):
    """Contrarian takes must genuinely differ from mainstream AI consensus."""
    test_case = LLMTestCase(
        input="Identify genuine contrarian technical views held by Harrison Chase",
        actual_output=json.dumps(sample_philosophy),
    )
    metric = GEval(
        name="Contrarian Takes Genuine",
        criteria=(
            "Each entry in 'contrarian_takes' must express a view that genuinely "
            "diverges from mainstream AI industry consensus. A contrarian take should "
            "be something that most practitioners or researchers would push back on "
            "or find surprising. Penalize takes that are actually widely held opinions "
            "disguised as contrarian (e.g. 'AI safety matters' or 'data quality is "
            "important'), or takes so vague they cannot be evaluated against any "
            "consensus. Score 1.0 if every take clearly opposes or challenges a "
            "recognizable mainstream position. Score 0.0 if the takes are mainstream "
            "opinions or too vague to assess."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Contrarian Takes Genuine score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- 5. Positions address relevant AI debates ------------------------------


@skip_no_key
def test_positions_cover_key_debates(sample_philosophy):
    """Positions should address key AI debates such as open source, safety, and scaling."""
    test_case = LLMTestCase(
        input="Document positions on key AI industry debates for Harrison Chase",
        actual_output=json.dumps(sample_philosophy),
    )
    metric = GEval(
        name="Key Debate Coverage",
        criteria=(
            "The 'positions' object should address topics that are central to current "
            "AI industry debates. Relevant debates include but are not limited to: "
            "open source vs closed models, AI safety and alignment, scaling laws and "
            "their limits, AGI timelines, regulation, data privacy, AI governance, "
            "build vs buy for AI infrastructure, and the role of open-weight models. "
            "The positions should engage substantively with at least one of these "
            "debates, showing the person's stance on issues that matter to the AI "
            "community. Score 1.0 if positions cover multiple relevant debates with "
            "clear stances. Score 0.5 if at least one key debate is addressed. "
            "Score 0.0 if positions avoid all major AI debates or cover only "
            "tangential topics."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=get_eval_model(),
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Key Debate Coverage score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
