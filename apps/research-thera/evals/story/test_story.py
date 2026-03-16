"""Extensive DeepEval tests for therapeutic story (audio script) generation.

All test cases target Sam, a 7-year-old boy (MIDDLE_CHILDHOOD tier).
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
    age_calibration_metric,
    audio_pacing_metric,
    child_vocabulary_metric,
    clinical_notes_integration_metric,
    developmental_appropriateness_metric,
    duration_coherence_metric,
    evidence_grounding_metric,
    feedback_personalization_metric,
    lego_metaphor_coherence_metric,
    lego_therapeutic_integration_metric,
    not_adult_register_metric,
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

# Patterns that indicate the script is treating the child as an adult.
# Each is a regex that searches for adult normalization phrases.
_ADULT_REGISTER_PATTERNS = [
    # "normal like an adult" / "normal for an adult" / "completely normal, like an adult"
    r"normal(?:ly)?\s+(?:like|for|as)\s+(?:an?\s+)?adult",
    # "behaves like an adult" / "acting like an adult"
    r"(?:behave|act)s?\s+like\s+(?:an?\s+)?adult",
    # "mature like an adult" / "mature as an adult"
    r"mature\s+(?:like|as|for)\s+(?:an?\s+)?adult",
    # "completely normal" with no child qualifier (risky phrase in child scripts)
    r"completely\s+normal\s+(?:for\s+his|for\s+her|for\s+their)\s+age",
    # Self-regulate / self-regulation without child framing
    r"\bself.regulat(?:e|ion|ing)\b",
    # Trigger identification — adult CBT language
    r"\bidentif(?:y|ying)\s+(?:your\s+)?triggers?\b",
    # Cognitive distortion — clinical adult language
    r"\bcognitive\s+distortion",
]

# Keywords indicating the script addresses Sam by name
_NAME = "sam"

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

    def test_no_bracket_markers(self, story_output):
        _, script = story_output
        bad = re.findall(r"\[(?:pause|sound:[^\]]+)\]", script, re.IGNORECASE)
        assert not bad, (
            f"Script contains bracket markers that TTS engines read literally: {bad[:3]}. "
            "Use '...' for pauses instead of [pause] or [sound:x]."
        )

    def test_contains_pause_cue(self, story_output):
        _, script = story_output
        has_cue = "..." in script or "…" in script
        assert has_cue, (
            "Script has no ellipsis pause cues. Expected '...' throughout — "
            "a 7-year-old needs time to follow along."
        )

    def test_sam_name_in_script(self, story_output):
        _, script = story_output
        assert _NAME in script.lower(), (
            "Script does not mention Sam by name. "
            "Child-directed scripts must address the child directly and personally."
        )

    def test_sam_name_used_multiple_times(self, story_output):
        _, script = story_output
        count = script.lower().count(_NAME)
        assert count >= 2, (
            f"Sam's name appears only {count} time(s). "
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

    def test_not_adult_register(self, story_output):
        """Verify the script does not treat a 7-year-old as an adult.

        Catches 'Este complet normal, ca adult' — LLM normalizing the child
        to adult standards even when ageYears=7 is in the prompt.
        """
        _, script = story_output
        script_lower = script.lower()
        for pattern in _ADULT_REGISTER_PATTERNS:
            match = re.search(pattern, script_lower)
            assert not match, (
                f"Script treats Sam as an adult: {match.group()!r}. "
                "A 7-year-old child must never be normalized to adult standards. "
                "Use child-appropriate framing instead "
                "(e.g. 'you're doing great' not 'completely normal like an adult')."
            )

    def test_professional_support_mention(self, story_output):
        _, script = story_output
        script_lower = script.lower()
        found = any(kw in script_lower for kw in _SUPPORT_KEYWORDS)
        assert found, (
            "Script does not mention a parent, caregiver, or professional. "
            "Must encourage Sam to seek support from a trusted adult."
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
            f"Sam's sparkling moments not referenced in script. "
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
            "Notes should meaningfully shape the session content for Sam."
        )

    def test_no_diagnosis_statements(self, story_output):
        _, script = story_output
        diagnosis_patterns = [
            r"\bsam has\b.{0,30}\b(disorder|syndrome|condition|ADHD|autism|depression)\b",
            r"\bhe has\b.{0,30}\b(disorder|syndrome|condition)\b",
            r"\bdiagnos(is|ed)\b",
        ]
        script_lower = script.lower()
        for pattern in diagnosis_patterns:
            match = re.search(pattern, script_lower)
            assert not match, (
                f"Script may contain a diagnosis statement about Sam. "
                f"Match: {match.group()!r}"
            )

    def test_case_targets_7_year_old(self, story_output):
        case, _ = story_output
        assert case.get("age_years") == 7, (
            f"Test case '{case['id']}' has age_years={case.get('age_years')!r}. "
            "All story eval cases must target a 7-year-old child."
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

    # --- TTS audio optimization checks ---

    def test_no_section_labels(self, story_output):
        _, script = story_output
        label_patterns = [
            r"(?i)^(introduction|part \d|section \d|warm.?up|guided practice|wrap.?up|conclusion)\s*[:.]",
            r"(?i)^(step \d|phase \d|activity \d)\s*[:.)]",
        ]
        for pattern in label_patterns:
            match = re.search(pattern, script, re.MULTILINE)
            assert not match, (
                f"Script contains a section label: {match.group()!r}. "
                "TTS scripts must use spoken transitions, not visual labels."
            )

    def test_sufficient_pause_cues(self, story_output):
        case, script = story_output
        minutes = case["minutes"]
        ellipsis_count = script.count("...") + script.count("\u2026")

        # Expect at least 1 ellipsis pause per 2 minutes of content
        minimum_pauses = max(3, minutes // 2)
        assert ellipsis_count >= minimum_pauses, (
            f"Script has only {ellipsis_count} ellipsis pauses for a {minutes}-minute session. "
            f"Expected at least {minimum_pauses}. Use '...' generously for a 7-year-old."
        )

    def test_breathing_has_explicit_timing(self, story_output):
        _, script = story_output
        script_lower = script.lower()
        # If script mentions breathing exercise, check for counted timing
        has_breathing = any(
            kw in script_lower
            for kw in ["breathe in", "breath in", "deep breath", "belly breath"]
        )
        if not has_breathing:
            pytest.skip("No breathing exercise in this script")

        has_timing = bool(re.search(
            r"(two|three|four|five|2|3|4|5)\s*\.\.\.", script_lower
        ))
        assert has_timing, (
            "Breathing exercise lacks explicit timing. "
            "Write 'Breathe in... two... three... four...' not just 'take a deep breath'."
        )

    def test_no_consecutive_instructions_without_pause(self, story_output):
        _, script = story_output
        # Split into sentences and check for runs of imperatives without pauses
        sentences = re.split(r'[.!?]\s+', script)
        imperative_run = 0
        max_run = 0
        for s in sentences:
            s_stripped = s.strip()
            # Check if this is an instruction (starts with imperative verb or "Now")
            is_instruction = bool(re.match(
                r"(?i)(now|next|first|then|try|take|close|open|put|pick|place|breathe|imagine|think|hold|squeeze|let)",
                s_stripped,
            ))
            has_pause = "..." in s_stripped
            if is_instruction and not has_pause:
                imperative_run += 1
                max_run = max(max_run, imperative_run)
            else:
                imperative_run = 0

        assert max_run <= 3, (
            f"Found {max_run} consecutive instructions without a pause or encouragement. "
            "Alternate between instruction, story, and silence for good audio pacing."
        )

    def test_name_used_at_least_three_times(self, story_output):
        _, script = story_output
        count = script.lower().count(_NAME)
        assert count >= 3, (
            f"Sam's name appears only {count} time(s). "
            "Audio scripts should address the child by name at least 3 times for engagement."
        )

    # --- LEGO therapeutic play checks ---

    def test_lego_bricks_referenced(self, story_output):
        case, script = story_output
        if not case.get("lego_play"):
            pytest.skip("Not a LEGO test case")
        script_lower = script.lower()
        has_lego = any(
            kw in script_lower
            for kw in ["lego", "brick", "bricks", "build", "tower", "castle", "bridge", "wall"]
        )
        assert has_lego, (
            "LEGO play was requested but the script contains no LEGO-related words. "
            "The script must integrate LEGO building as a therapeutic activity."
        )

    def test_lego_activity_is_optional(self, story_output):
        case, script = story_output
        if not case.get("lego_play"):
            pytest.skip("Not a LEGO test case")
        script_lower = script.lower()
        has_optional = any(
            phrase in script_lower
            for phrase in [
                "if you have",
                "if you don't have",
                "if you don't",
                "just imagine",
                "imagine building",
                "picture in your mind",
                "in your mind",
            ]
        )
        assert has_optional, (
            "LEGO activity is not presented as optional. "
            "Script must include 'if you have some LEGO bricks' or 'just imagine building'."
        )

    def test_lego_technique_named(self, story_output):
        case, script = story_output
        if not case.get("lego_play"):
            pytest.skip("Not a LEGO test case")
        script_lower = script.lower()
        named_techniques = [
            "feelings tower", "feeling tower",
            "worry wall",
            "brave bridge",
            "memory build",
            "calm castle",
        ]
        found = [t for t in named_techniques if t in script_lower]
        assert found, (
            f"No named LEGO technique found. Expected at least one of: "
            f"{[t for t in named_techniques if t.startswith(('f','w','b','m','c'))]}"
        )

    def test_lego_building_pause(self, story_output):
        case, script = story_output
        if not case.get("lego_play"):
            pytest.skip("Not a LEGO test case")
        # Check that building instructions are followed by a pause
        build_words = ["pick up", "grab", "choose a color", "add a brick", "place", "stack"]
        script_lower = script.lower()
        has_build_then_pause = False
        for word in build_words:
            idx = script_lower.find(word)
            if idx != -1:
                after = script_lower[idx:idx + 200]
                if "..." in after:
                    has_build_then_pause = True
                    break
        assert has_build_then_pause, (
            "LEGO building instructions lack ellipsis pauses. "
            "After 'pick up a brick' or 'choose a color' there must be '...' "
            "for the child to actually build."
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

    def test_audio_pacing(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [audio_pacing_metric])

    def test_lego_therapeutic_integration(self, story_output):
        case, script = story_output
        if not case.get("lego_play"):
            pytest.skip("Not a LEGO test case")
        assert_test(_make_test_case(case, script), [lego_therapeutic_integration_metric])

    def test_lego_metaphor_coherence(self, story_output):
        case, script = story_output
        if not case.get("lego_play"):
            pytest.skip("Not a LEGO test case")
        assert_test(_make_test_case(case, script), [lego_metaphor_coherence_metric])

    def test_age_calibration(self, story_output):
        case, script = story_output
        assert_test(_make_test_case(case, script), [age_calibration_metric])

    def test_not_adult_register(self, story_output):
        """LLM judge: script must not treat a 7-year-old as an adult.

        This is the GEval counterpart to TestDeterministic.test_not_adult_register.
        The deterministic test catches explicit patterns; this catches subtler adult drift.
        """
        case, script = story_output
        assert_test(_make_test_case(case, script), [not_adult_register_metric])
