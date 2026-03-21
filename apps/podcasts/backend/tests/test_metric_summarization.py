"""Summarization evaluation — checks if bio and executive summary capture key points.

Uses deepeval's SummarizationMetric to verify that summary outputs
(bio, one-liner, career arc, executive summary) accurately distil
the key information from the underlying research data.

SummarizationMetric checks if actual_output (summary) captures the
essential points from input (source text).  threshold=0.5 means at
least half the key points must be represented.

Usage:
    pytest tests/test_metric_summarization.py -v
    deepeval test run tests/test_metric_summarization.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import SummarizationMetric

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


def _summarization_metric() -> SummarizationMetric:
    return SummarizationMetric(threshold=THRESHOLD, model=MODEL)


# ── helpers to build source texts ──────────────────────────────────────


def _research_as_source_text(research: dict) -> str:
    """Flatten the full research profile into a long source string."""
    sections = []

    sections.append(f"Name: {research['name']}")
    sections.append(f"Bio: {research['bio']}")

    if research.get("topics"):
        sections.append(f"Topics: {', '.join(research['topics'])}")

    if research.get("timeline"):
        events = "; ".join(
            f"{e['date']}: {e['event']}" for e in research["timeline"]
        )
        sections.append(f"Timeline: {events}")

    if research.get("key_contributions"):
        contribs = "; ".join(
            f"{c['title']} - {c['description']}" for c in research["key_contributions"]
        )
        sections.append(f"Key contributions: {contribs}")

    if research.get("quotes"):
        quotes = "; ".join(
            f'"{q["text"]}" ({q["source"]})' for q in research["quotes"]
        )
        sections.append(f"Quotes: {quotes}")

    if research.get("competitive_landscape"):
        cl = research["competitive_landscape"]
        sections.append(f"Market position: {cl.get('market_position', '')}")
        sections.append(f"Ecosystem role: {cl.get('ecosystem_role', '')}")
        if cl.get("moats"):
            sections.append(f"Moats: {', '.join(cl['moats'])}")

    if research.get("funding"):
        f = research["funding"]
        sections.append(f"Total raised: {f.get('total_raised', '')}")
        sections.append(f"Latest valuation: {f.get('latest_valuation', '')}")
        if f.get("funding_rounds"):
            rounds = "; ".join(
                f"{r['date']} {r['round']} {r.get('amount', '')}"
                for r in f["funding_rounds"]
            )
            sections.append(f"Funding rounds: {rounds}")

    if research.get("technical_philosophy"):
        tp = research["technical_philosophy"]
        sections.append(f"Core thesis: {tp.get('core_thesis', '')}")
        if tp.get("contrarian_takes"):
            sections.append(f"Contrarian takes: {'; '.join(tp['contrarian_takes'])}")

    if research.get("conferences"):
        conf = research["conferences"]
        sections.append(f"Speaking tier: {conf.get('speaking_tier', '')}")
        if conf.get("notable_moments"):
            sections.append(f"Notable moments: {'; '.join(conf['notable_moments'])}")

    exec_sum = research.get("executive_summary", {})
    if exec_sum:
        sections.append(f"One-liner: {exec_sum.get('one_liner', '')}")
        sections.append(f"Career arc: {exec_sum.get('career_arc', '')}")
        sections.append(f"Current focus: {exec_sum.get('current_focus', '')}")
        sections.append(f"Industry significance: {exec_sum.get('industry_significance', '')}")
        if exec_sum.get("key_facts"):
            sections.append(f"Key facts: {'; '.join(exec_sum['key_facts'])}")

    return "\n".join(sections)


def _timeline_as_source_text(timeline: list[dict]) -> str:
    """Flatten timeline events into a source string."""
    lines = []
    for e in timeline:
        line = f"{e['date']}: {e['event']}"
        if e.get("url"):
            line += f" ({e['url']})"
        lines.append(line)
    return "\n".join(lines)


def _profile_as_source_text(research: dict) -> str:
    """Build a comprehensive profile string from all research sections."""
    return _research_as_source_text(research)


# ── Test 1: Bio summarises the full research data ─────────────────────


@skip_no_key
def test_bio_summarizes_research(sample_research, sample_bio):
    """Bio should be a faithful summary of the full research data."""
    source_text = _research_as_source_text(sample_research)
    metric = _summarization_metric()
    test_case = LLMTestCase(
        input=source_text,
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Bio summarization score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 2: One-liner captures the essence of the full profile ────────


@skip_no_key
def test_executive_one_liner_summarizes(sample_research, sample_executive):
    """The executive one-liner should capture the essence of the full profile."""
    source_text = _profile_as_source_text(sample_research)
    one_liner = sample_executive["one_liner"]
    metric = _summarization_metric()
    test_case = LLMTestCase(
        input=source_text,
        actual_output=one_liner,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"One-liner summarization score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 3: Career arc summarises the timeline events ─────────────────


@skip_no_key
def test_career_arc_summarizes_timeline(sample_timeline, sample_executive):
    """The career_arc field should summarise the timeline events."""
    source_text = _timeline_as_source_text(sample_timeline)
    career_arc = sample_executive["career_arc"]
    metric = _summarization_metric()
    test_case = LLMTestCase(
        input=source_text,
        actual_output=career_arc,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Career arc summarization score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# ── Test 4: Executive summary captures key points from all sections ───


@skip_no_key
def test_executive_summarizes_all(sample_research, sample_executive):
    """Full executive summary should capture key points from all research sections."""
    source_text = _research_as_source_text(sample_research)
    executive_str = json.dumps(sample_executive, indent=2)
    metric = _summarization_metric()
    test_case = LLMTestCase(
        input=source_text,
        actual_output=executive_str,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Executive summary summarization score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
