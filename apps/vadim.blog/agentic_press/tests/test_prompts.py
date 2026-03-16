"""Tests for prompt functions — port of prompts.rs tests."""

from agentic_press import prompts


def test_scout_contains_niche():
    prompt = prompts.scout("Rust async")
    assert "Rust async" in prompt


def test_picker_contains_count():
    prompt = prompts.picker("AI safety", 3)
    assert "3" in prompt


def test_researcher_contains_niche():
    prompt = prompts.researcher("WebAssembly")
    assert "WebAssembly" in prompt


def test_writer_is_static():
    prompt = prompts.writer()
    assert prompt
    assert "Writer agent" in prompt


def test_linkedin_is_static():
    prompt = prompts.linkedin()
    assert prompt
    assert "LinkedIn" in prompt


def test_deep_dive_writer_contains_title():
    prompt = prompts.deep_dive_writer("Eval Driven Development")
    assert "Eval Driven Development" in prompt
    assert "Deep-Dive Writer" in prompt
    assert "2500" in prompt


def test_researcher_with_papers_contains_niche():
    prompt = prompts.researcher_with_papers("distributed systems")
    assert "distributed systems" in prompt
    assert "Researcher agent" in prompt
    assert "citations" in prompt


def test_picker_mentions_json_array():
    prompt = prompts.picker("Rust", 2)
    assert "JSON array" in prompt


def test_scout_mentions_five_topics():
    prompt = prompts.scout("AI")
    assert "5 trending topics" in prompt


def test_linkedin_word_count_guidance():
    prompt = prompts.linkedin()
    assert "150–220 words" in prompt


def test_writer_word_count_guidance():
    prompt = prompts.writer()
    assert "700–1000 words" in prompt


# ── journalism prompt tests ──────────────────────────────────────────────


def test_journalism_researcher_contains_topic():
    prompt = prompts.journalism_researcher("Remote work in Germany")
    assert "Remote work in Germany" in prompt
    assert "Researcher" in prompt
    assert "Research Brief" in prompt
    assert "NEVER fabricate statistics" in prompt
    assert "Needs Verification" in prompt


def test_journalism_researcher_no_hardcoded_niche():
    prompt = prompts.journalism_researcher("AI reflection loops")
    assert "remote EU job market" not in prompt


def test_journalism_seo_contains_topic():
    prompt = prompts.journalism_seo("EU digital nomad visas")
    assert "EU digital nomad visas" in prompt
    assert "SEO Strategist" in prompt
    assert "SEO Strategy" in prompt
    assert "Content Gaps" in prompt
    assert "Competitive Landscape" in prompt


def test_journalism_seo_anti_hallucination():
    prompt = prompts.journalism_seo("AI agents")
    assert "NEVER invent proprietary data claims" in prompt


def test_journalism_writer_is_static():
    prompt = prompts.journalism_writer()
    assert prompt
    assert "Writer" in prompt
    assert "1200–1800 words" in prompt
    assert "outline mapping research facts" in prompt
    assert "cross-reference" in prompt


def test_journalism_writer_no_hardcoded_niche():
    prompt = prompts.journalism_writer()
    assert "remote EU job market" not in prompt
    assert "nomadically.work" not in prompt


def test_journalism_editor_is_static():
    prompt = prompts.journalism_editor()
    assert prompt
    assert "Editor" in prompt
    assert "APPROVE" in prompt
    assert "REVISE" in prompt
    assert "Critical Issues (must fix)" in prompt
    assert "Maximum 1 revision round" in prompt


def test_journalism_editor_cross_reference():
    prompt = prompts.journalism_editor()
    assert "appears in the SEO strategy but NOT in the research brief" in prompt


def test_deep_dive_editor_is_static():
    prompt = prompts.deep_dive_editor()
    assert prompt
    assert "Editor" in prompt
    assert "APPROVE" in prompt
    assert "REVISE" in prompt
    assert "2500" in prompt
    assert "CITATION PASS" in prompt
    assert "DEPTH PASS" in prompt


# ── counter-article prompt tests ─────────────────────────────────────────────


def test_counter_researcher_contains_topic():
    prompt = prompts.counter_researcher("AI code generation hype")
    assert "AI code generation hype" in prompt
    assert "Counter-Research Agent" in prompt
    assert "NEVER fabricate" in prompt


def test_counter_researcher_mentions_steelman():
    prompt = prompts.counter_researcher("remote work productivity")
    assert "Steelman" in prompt or "steelman" in prompt.lower()


def test_counter_researcher_includes_claim_analysis():
    prompt = prompts.counter_researcher("test topic")
    assert "Supported / Overstated / Contradicted / Anecdotal" in prompt


def test_counter_researcher_includes_logical_fallacies():
    prompt = prompts.counter_researcher("test topic")
    assert "Logical Fallacies" in prompt
    assert "survivorship bias" in prompt


def test_counter_writer_is_static():
    prompt = prompts.counter_writer()
    assert prompt
    assert "Counter-Article Writer" in prompt
    assert "1200–1800 words" in prompt


def test_counter_writer_mentions_steelman():
    prompt = prompts.counter_writer()
    assert "Steelman" in prompt or "steelmans" in prompt.lower()


def test_counter_writer_anti_hallucination():
    prompt = prompts.counter_writer()
    assert "NEVER fabricate" in prompt
    assert "Counter-Research Brief" in prompt


def test_counter_writer_no_ad_hominem():
    prompt = prompts.counter_writer()
    assert "ad hominem" in prompt
