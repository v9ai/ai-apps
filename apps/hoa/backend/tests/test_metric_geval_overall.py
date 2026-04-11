"""GEval-based holistic quality evaluation for the FULL research profile.

Each test evaluates the entire research JSON as a single unit against a
high-level quality criterion: completeness, actionability, evidence,
internal consistency, and professional quality.

Usage:
    pytest tests/test_metric_geval_overall.py -v
    deepeval test run tests/test_metric_geval_overall.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# ── 1. Profile Completeness ──────────────────────────────────────────────


@skip_no_key
def test_profile_completeness(sample_research, deepeval_model):
    """The full research JSON covers all expected areas (bio, timeline,
    contributions, social, executive summary, funding, etc.)."""
    metric = GEval(
        name="Profile Completeness",
        criteria=(
            "The research profile JSON must cover ALL of the following areas: "
            "(1) a biographical summary (bio), "
            "(2) an executive summary with key facts and meeting prep, "
            "(3) a timeline of career events with dates, "
            "(4) key contributions or projects with descriptions, "
            "(5) direct quotes with attributed sources, "
            "(6) social media links (GitHub, Twitter/X, LinkedIn, or website), "
            "(7) topics or areas of expertise, "
            "(8) podcast or media appearances, "
            "(9) news coverage, "
            "(10) competitive landscape analysis, "
            "(11) collaboration network or co-founders, "
            "(12) funding information, "
            "(13) conference talks or speaking history, and "
            "(14) technical philosophy or core thesis. "
            "Each area must contain substantive content, not empty placeholders. "
            "A profile missing multiple areas or containing only stubs for key "
            "sections should score poorly."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Produce a comprehensive research profile covering all aspects of this person's professional presence.",
        actual_output=json.dumps(sample_research, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Profile Completeness score {metric.score:.2f} below threshold "
        f"{metric.threshold} — {metric.reason}"
    )


# ── 2. Profile Actionability ─────────────────────────────────────────────


@skip_no_key
def test_profile_actionability(sample_research, deepeval_model):
    """The profile provides enough information for an executive to prepare
    for a meeting with the profiled person."""
    metric = GEval(
        name="Profile Actionability",
        criteria=(
            "The research profile must provide enough concrete information for "
            "a senior executive to walk into a 30-minute meeting fully prepared. "
            "This means it must include: "
            "(1) who the person is and their current role, "
            "(2) their most important recent achievements or projects, "
            "(3) specific talking points or conversation starters, "
            "(4) potential areas of mutual interest or collaboration, "
            "(5) competitive context — who their rivals are and where they stand, "
            "(6) risk factors or sensitive topics to be aware of, and "
            "(7) recent news or developments that would be embarrassing to miss. "
            "A profile that reads as a generic Wikipedia summary without "
            "actionable intelligence for a real meeting should score poorly. "
            "The reader should feel confident and prepared after reading it."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Create a research profile that fully prepares an executive for a meeting with this person.",
        actual_output=json.dumps(sample_research, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Profile Actionability score {metric.score:.2f} below threshold "
        f"{metric.threshold} — {metric.reason}"
    )


# ── 3. Profile Evidence-Based ────────────────────────────────────────────


@skip_no_key
def test_profile_evidence_based(sample_research, deepeval_model):
    """Claims in the profile are backed by URLs, sources, and specific data
    rather than unsupported assertions."""
    metric = GEval(
        name="Profile Evidence-Based",
        criteria=(
            "The research profile must substantiate its claims with concrete "
            "evidence. Specifically: "
            "(1) timeline entries should include URLs or references to verifiable events, "
            "(2) key contributions should link to repositories, papers, or product pages, "
            "(3) quotes should attribute a source (podcast, article, interview) with a URL, "
            "(4) news items should cite the publication and include a URL, "
            "(5) funding rounds should specify amounts, investors, and dates, "
            "(6) competitive claims should name specific competitors with differentiation, and "
            "(7) technical positions should reference evidence (e.g. open-source licenses, "
            "published papers, public statements). "
            "A profile full of unattributed assertions like 'is widely regarded as' "
            "or 'has made significant contributions' without backing URLs or data "
            "should score poorly. The ratio of evidenced claims to unsupported "
            "claims should be high."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Produce an evidence-based research profile with sourced and verifiable claims.",
        actual_output=json.dumps(sample_research, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Profile Evidence-Based score {metric.score:.2f} below threshold "
        f"{metric.threshold} — {metric.reason}"
    )


# ── 4. Profile No Contradictions ─────────────────────────────────────────


@skip_no_key
def test_profile_no_contradictions(sample_research, deepeval_model):
    """Different sections of the profile do not contradict each other in
    facts, dates, roles, or claims."""
    metric = GEval(
        name="Profile No Contradictions",
        criteria=(
            "The research profile must be internally consistent across all "
            "sections. Check for contradictions such as: "
            "(1) the bio stating a different role or organization than the "
            "executive summary, "
            "(2) timeline dates that conflict with funding round dates or "
            "news article dates, "
            "(3) the competitive landscape describing a market position that "
            "contradicts evidence in the funding or news sections, "
            "(4) quotes attributed to contexts that conflict with the timeline, "
            "(5) the collaboration network listing co-founders not mentioned "
            "anywhere else or contradicting the bio, "
            "(6) the technical philosophy stating positions that contradict "
            "evidence in key contributions (e.g. claiming open-source advocacy "
            "while contributions are all proprietary), and "
            "(7) funding totals that do not add up with individual rounds. "
            "If ANY factual contradiction is found between sections, the score "
            "should be significantly reduced. A fully consistent profile with "
            "cross-referencing details across sections should score highly."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Review this research profile for internal consistency across all sections.",
        actual_output=json.dumps(sample_research, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Profile No Contradictions score {metric.score:.2f} below threshold "
        f"{metric.threshold} — {metric.reason}"
    )


# ── 5. Profile Professional Quality ──────────────────────────────────────


@skip_no_key
def test_profile_professional_quality(sample_research, deepeval_model):
    """The overall output reads like a professional intelligence brief, not
    a casual summary or raw data dump."""
    metric = GEval(
        name="Profile Professional Quality",
        criteria=(
            "The research profile must read like a professional intelligence "
            "brief or executive dossier. Evaluate across these dimensions: "
            "(1) STRUCTURE — the profile is logically organized with clearly "
            "delineated sections that build on each other (identity, track record, "
            "current context, forward-looking analysis), "
            "(2) TONE — language is professional, neutral, and objective throughout; "
            "no marketing hype, fan language, casual slang, or editorializing, "
            "(3) PRECISION — numbers are specific (not 'many' or 'several'), dates "
            "are concrete, names are exact, and claims are quantified where possible, "
            "(4) SIGNAL-TO-NOISE — every field contains meaningful intelligence; "
            "no filler text, no placeholder content, no redundant information "
            "repeated across sections, "
            "(5) ANALYTICAL DEPTH — the profile goes beyond surface facts to "
            "provide competitive positioning, risk assessment, and strategic context "
            "that demonstrates analytical thinking, not just data aggregation. "
            "A profile that reads like a raw API response or a casual blog post "
            "should score poorly. A profile that a chief of staff would confidently "
            "hand to a CEO before a meeting should score highly."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Produce a professional-grade intelligence brief on this person suitable for C-suite consumption.",
        actual_output=json.dumps(sample_research, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Profile Professional Quality score {metric.score:.2f} below threshold "
        f"{metric.threshold} — {metric.reason}"
    )
