"""Extensive DeepEval tests for therapeutic story (audio script) generation.

All test cases target Noah, a 7-year-old boy (MIDDLE_CHILDHOOD tier).
Covers the full generateStory.ts LangGraph pipeline across all context types:
- goal-driven
- issue-driven
- feedback-driven (professional observations + extracted issues)

Two test categories:
  1. Deterministic — fast regex / heuristic checks, no LLM calls
  2. LLM-judged    — GEval metrics via DeepSeek judge model

Run with:
    cd evals/story && uv run pytest test_story.py -v
"""

import re

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase

from conftest import (
    child_vocabulary_metric,
    clinical_notes_integration_metric,
    developmental_appropriateness_metric,
    duration_coherence_metric,
    evidence_grounding_metric,
    feedback_personalization_metric,
    safety_compliance_metric,
    therapeutic_structure_metric,
    tts_suitability_metric,
    unique_outcomes_integration_metric,
)
from generator import build_story_prompt

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Words-per-minute for calm child-directed audio. DeepSeek skews concise.
_WPM_LOW = 60
_WPM_HIGH = 175

# Adult psychological jargon that should not appear in a 7-year-old's script
_ADULT_JARGON = [
    "rumination", "cognitive defusion", "dialectical", "metacognition",
    "psychoeducation", "desensitization", "psychodynamic", "maladaptive",
    "dysregulation", "hypervigilance", "somatization", "psychopathology",
]

# Keywords indicating the script addresses Noah by name
_NAME = "noah"

_MARKDOWN_BOLD_RE = re.compile(r"\*\*.+?\*\*", re.DOTALL)
_MARKDOWN_HEADER_RE = re.compile(r"^#{1,6}\s+\S", re.MULTILINE)
_MARKDOWN_BULLET_RE = re.compile(r"^\s*[-*+]\s+\S", re.MULTILINE)

# Support keywords appropriate for child-directed scripts
_SUPPORT_KEYWORDS = [
    "professional", "therapist", "counselor", "doctor", "specialist",
    "support", "parent", "caregiver", "grown-up", "grown up", "trusted adult",
    "mom", "mum", "dad", "help",
]


def _make_test_case(case: dict, script: str) -> LLMTestCase:
    return LLMTestCase(
        input=build_story_prompt(case),
        actual_output=script,
    )


def _word_count(text: str) -> int:
    return len(text.split())


# ---------------------------------------------------------------------------
# Deterministic tests — no LLM judge, very fast
# ---------------------------------------------------------------------------


class TestDeterministic:
    """Fast structural checks on generated scripts for a 7-year-old boy."""

    def test_script_not_empty(self, story_output):
        _, script = story_output
        assert script.strip(), "Script must not be empty"

    def test_minimum_word_count(self, story_output):
        case, script = story_output
        minutes = case["minutes"]
        minimum = _WPM_LOW * minutes
        count = _word_count(script)
        assert count >= minimum, (
            f"Script too short for {minutes}-minute session: {count} words "
            f"(expected >= {minimum} at {_WPM_LOW} wpm)"
        )

    def test_maximum_word_count(self, story_output):
        case, script = story_output
        minutes = case["minutes"]
        maximum = _WPM_HIGH * minutes
        count = _word_count(script)
        assert count <= maximum, (
            f"Script too long for {minutes}-minute session: {count} words "
            f"(expected <= {maximum} at {_WPM_HIGH} wpm)"
        )

    def test_no_markdown_bold(self, story_output):
        _, script = story_output
        matches = _MARKDOWN_BOLD_RE.findall(script)
        assert not matches, (
            f"Script contains markdown bold formatting ({len(matches)} occurrences). "
            f"First: {matches[0][:60]!r}"
        )

    def test_no_markdown_headers(self, story_output):
        _, script = story_output
        matches = _MARKDOWN_HEADER_RE.findall(script)
        assert not matches, (
            f"Script contains markdown headers ({len(matches)} occurrences). "
            f"First: {matches[0][:60]!r}"
        )

    def test_no_markdown_bullets(self, story_output):
        _, script = story_output
        matches = _MARKDOWN_BULLET_RE.findall(script)
        assert not matches, (
            f"Script contains markdown bullet points ({len(matches)} occurrences). "
            f"First: {matches[0][:60]!r}"
        )

    def test_contains_pause_cue(self, story_output):
        _, script = story_output
        has_cue = (
            bool(re.search(r"\[pause\]", script, re.IGNORECASE))
            or "..." in script
            or "…" in script
        )
        assert has_cue, (
            "Script has no pause cues. Expected at least '[pause]' or '...' — "
            "a 7-year-old needs time to follow along."
        )

    def test_noah_name_in_script(self, story_output):
        _, script = story_output
        assert _NAME in script.lower(), (
            "Script does not mention Noah by name. "
            "Child-directed scripts must address the child directly and personally."
        )

    def test_noah_name_used_multiple_times(self, story_output):
        _, script = story_output
        count = script.lower().count(_NAME)
        assert count >= 2, (
            f"Noah's name appears only {count} time(s). "
            "Child scripts should use the child's name at least twice for engagement."
        )

    def test_no_adult_jargon(self, story_output):
        _, script = story_output
        script_lower = script.lower()
        found = [term for term in _ADULT_JARGON if term in script_lower]
        assert not found, (
            f"Script contains adult psychological jargon not suitable for a 7-year-old: {found}. "
            "Use child-friendly equivalents instead."
        )

    def test_professional_support_mention(self, story_output):
        _, script = story_output
        script_lower = script.lower()
        found = any(kw in script_lower for kw in _SUPPORT_KEYWORDS)
        assert found, (
            "Script does not mention a parent, caregiver, or professional. "
            "Must encourage Noah to seek support from a trusted adult."
        )

    def test_five_minute_script_is_focused(self, story_output):
        case, script = story_output
        if case["minutes"] != 5:
            pytest.skip("Not a 5-minute session")
        count = _word_count(script)
        assert count <= 1000, (
            f"5-minute script is too long ({count} words). "
            "A 7-year-old's attention is limited — keep it to one focused technique."
        )

    def test_feedback_issues_referenced(self, story_output):
        case, script = story_output
        fb = case.get("feedback_context")
        if not fb or not fb.get("issues"):
            pytest.skip("No feedback issues in this test case")

        script_lower = script.lower()
        issue_titles = [iss["title"].lower() for iss in fb["issues"]]

        def title_keywords(title: str) -> list[str]:
            return [w for w in title.split() if len(w) > 3]

        addressed = 0
        for title in issue_titles:
            if any(kw in script_lower for kw in title_keywords(title)):
                addressed += 1

        threshold = max(1, len(issue_titles) // 2)
        assert addressed >= threshold, (
            f"Too few feedback issues referenced in script. "
            f"Addressed {addressed}/{len(issue_titles)} issues: {issue_titles}"
        )

    def test_unique_outcomes_referenced(self, story_output):
        case, script = story_output
        outcomes = case.get("unique_outcomes", [])
        if not outcomes:
            pytest.skip("No unique outcomes in this test case")

        script_lower = script.lower()
        for outcome in outcomes:
            desc_words = [w for w in outcome["description"].lower().split() if len(w) > 4]
            if any(w in script_lower for w in desc_words):
                return

        pytest.fail(
            f"Noah's sparkling moments not referenced in script. "
            f"Outcomes: {[o['description'] for o in outcomes]}"
        )

    def test_notes_key_concepts_in_script(self, story_output):
        case, script = story_output
        notes = case.get("notes")
        if not notes:
            pytest.skip("No clinical notes in this test case")

        script_lower = script.lower()
        all_found = []
        for note in notes:
            content_words = [
                w.strip(".,;:()") for w in note["content"].lower().split()
                if len(w) > 6 and w.isalpha()
            ]
            all_found.extend(w for w in content_words[:30] if w in script_lower)

        assert all_found, (
            "No key concepts from clinical notes found in the script. "
            "Notes should meaningfully shape the session content for Noah."
        )

    def test_no_diagnosis_statements(self, story_output):
        _, script = story_output
        diagnosis_patterns = [
            r"\bnoah has\b.{0,30}\b(disorder|syndrome|condition|ADHD|autism|depression)\b",
            r"\bhe has\b.{0,30}\b(disorder|syndrome|condition)\b",
            r"\bdiagnos(is|ed)\b",
        ]
        script_lower = script.lower()
        for pattern in diagnosis_patterns:
            match = re.search(pattern, script_lower)
            assert not match, (
                f"Script may contain a diagnosis statement about Noah. "
                f"Match: {match.group()!r}"
            )

    def test_no_empty_placeholder_text(self, story_output):
        _, script = story_output
        bad_patterns = ["[GOAL]", "[PERSON]", "[NAME]", "[INSERT", "TODO:", "PLACEHOLDER"]
        for pattern in bad_patterns:
            assert pattern not in script, (
                f"Script contains unfilled placeholder: {pattern!r}"
            )

    def test_no_research_fallback_text_in_full_case(self, story_output):
        case, script = story_output
        if not case.get("papers"):
            pytest.skip("This case intentionally has no research papers")
        assert "no research papers available" not in script.lower(), (
            "Script contains fallback text despite research papers being provided."
        )

    def test_fallback_case_still_meets_word_count(self, story_output):
        case, script = story_output
        if case.get("papers"):
            pytest.skip("This case has research papers")
        minimum = _WPM_LOW * case["minutes"] * 0.5
        assert _word_count(script) >= minimum, (
            "No-research fallback script is too short even at a 50% word-count tolerance."
        )


# ---------------------------------------------------------------------------
# LLM-judged tests — DeepSeek as judge via GEval
# ---------------------------------------------------------------------------


class TestLLMJudged:
    """Quality evaluations using DeepSeek as the LLM judge."""

    def test_therapeutic_structure(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [therapeutic_structure_metric])

    def test_evidence_grounding(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [evidence_grounding_metric])

    def test_developmental_appropriateness(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [developmental_appropriateness_metric])

    def test_child_vocabulary(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [child_vocabulary_metric])

    def test_tts_suitability(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [tts_suitability_metric])

    def test_safety_compliance(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [safety_compliance_metric])

    def test_feedback_personalization(self, story_output):
        case, script = story_output
        if not case.get("feedback_context"):
            pytest.skip("No feedback context in this test case")
        assert_test(_make_test_case(case, script), [feedback_personalization_metric])

    def test_unique_outcomes_integration(self, story_output):
        case, script = story_output
        if not case.get("unique_outcomes"):
            pytest.skip("No unique outcomes in this test case")
        assert_test(_make_test_case(case, script), [unique_outcomes_integration_metric])

    def test_duration_coherence(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [duration_coherence_metric])

    def test_clinical_notes_integration(self, story_output):
        case, script = story_output
        if not case.get("notes"):
            pytest.skip("No clinical notes in this test case")
        assert_test(_make_test_case(case, script), [clinical_notes_integration_metric])
