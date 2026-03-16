"""Custom DeepEval metrics — port of promptfoo JS assertions."""

from __future__ import annotations

import json
import re

from deepeval.metrics import BaseMetric
from deepeval.test_case import LLMTestCase


class ScoutFormatMetric(BaseMetric):
    """Validates Scout agent output: 5 numbered topics with source links."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        items = re.findall(r"^\s*\d+[\.\)]\s+", output, re.MULTILINE)
        has_sources = bool(
            re.search(r"https?://|source:", output, re.IGNORECASE)
        )
        errors = []
        if len(items) < 5:
            errors.append(f"Expected 5 topics, found {len(items)}")
        if not has_sources:
            errors.append("No source links found")
        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else f"Valid: {len(items)} topics with sources"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "ScoutFormat"


class PickerFormatMetric(BaseMetric):
    """Validates Picker agent output: JSON array with topic/angle/why_viral."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        # Strip think tags and fences
        cleaned = re.sub(r"<think>.*?</think>", "", output, flags=re.DOTALL)
        cleaned = re.sub(r"```\w*\n?", "", cleaned).strip()
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3].strip()

        errors = []
        try:
            data = json.loads(cleaned)
            if not isinstance(data, list):
                errors.append("Output is not a JSON array")
            else:
                for i, item in enumerate(data):
                    for key in ("topic", "angle", "why_viral"):
                        if key not in item or not isinstance(item[key], str):
                            errors.append(f"Item {i} missing or invalid '{key}'")
        except json.JSONDecodeError as e:
            errors.append(f"Invalid JSON: {e}")

        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else "Valid JSON array"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "PickerFormat"


AI_PHRASES = [
    "in this article",
    "in today's rapidly",
    "it's worth noting",
    "in conclusion",
    "landscape",
    "paradigm shift",
    "game-changer",
    "revolutionize",
    "at the end of the day",
    "dive deep into",
    "without further ado",
    "let's explore",
]


class WriterFormatMetric(BaseMetric):
    """Validates Writer agent output: 700-1000 words, 3+ H2s, no AI phrases."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        words = len(output.split())
        h2s = len(re.findall(r"^##\s+", output, re.MULTILINE))

        errors = []
        if words < 700:
            errors.append(f"Word count too low: {words}")
        if words > 1000:
            errors.append(f"Word count too high: {words}")
        if h2s < 3:
            errors.append(f"Too few H2 sections: {h2s}")

        lower = output.lower()
        for phrase in AI_PHRASES:
            if phrase in lower:
                errors.append(f"Contains AI phrase: '{phrase}'")

        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else f"Valid: {words} words, {h2s} sections"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "WriterFormat"


class LinkedInFormatMetric(BaseMetric):
    """Validates LinkedIn agent output: 150-220 words, 4-6 hashtags, no 'I' opener."""

    GENERIC_HASHTAGS = {"#ai", "#tech", "#technology", "#innovation"}

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        words = len(output.split())
        hashtags = re.findall(r"#\w+", output)
        first_line = output.strip().splitlines()[0] if output.strip() else ""

        errors = []
        if words < 150:
            errors.append(f"Word count too low: {words}")
        if words > 220:
            errors.append(f"Word count too high: {words}")
        if first_line.startswith("I "):
            errors.append("First line starts with 'I '")
        if len(hashtags) < 4:
            errors.append(f"Too few hashtags: {len(hashtags)}")
        if len(hashtags) > 6:
            errors.append(f"Too many hashtags: {len(hashtags)}")

        for tag in hashtags:
            if tag.lower() in self.GENERIC_HASHTAGS:
                errors.append(f"Generic hashtag: {tag}")

        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else f"Valid: {words} words, {len(hashtags)} hashtags"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "LinkedInFormat"


class EditorDecisionMetric(BaseMetric):
    """Validates Editor output: APPROVE xor REVISE with proper structure."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        has_approve = "APPROVE" in output
        has_revise = "REVISE" in output

        errors = []
        if has_approve and has_revise:
            errors.append("Contains both APPROVE and REVISE")
        elif not has_approve and not has_revise:
            errors.append("Contains neither APPROVE nor REVISE")
        elif has_approve:
            if "status: published" not in output:
                errors.append("APPROVE but missing 'status: published' frontmatter")
            if not re.search(r"^#\s+", output, re.MULTILINE):
                errors.append("APPROVE but no article heading found")
        elif has_revise:
            if "Critical Issues" not in output:
                errors.append("REVISE but missing 'Critical Issues' section")

        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else f"Valid {'APPROVE' if has_approve else 'REVISE'} decision"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "EditorDecision"


class ResearcherFormatMetric(BaseMetric):
    """Validates Researcher output: 3+ headers, source attributions, Key Facts."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        headers = re.findall(r"^#{1,3}\s+", output, re.MULTILINE)
        has_sources = bool(
            re.search(r"https?://|Source:", output, re.IGNORECASE)
        )
        has_key_facts = bool(
            re.search(r"Key Facts|Findings", output, re.IGNORECASE)
        )
        words = len(output.split())

        errors = []
        if len(headers) < 3:
            errors.append(f"Too few section headers: {len(headers)}")
        if not has_sources:
            errors.append("No source attributions found")
        if not has_key_facts:
            errors.append("Missing 'Key Facts' or 'Findings' section")
        if words < 300:
            errors.append(f"Word count too low: {words}")

        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else f"Valid: {len(headers)} headers, {words} words"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "ResearcherFormat"


class SeoFormatMetric(BaseMetric):
    """Validates SEO agent output: keyword table, structure, meta description."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        table_rows = len(re.findall(r"^\|.+\|$", output, re.MULTILINE))
        has_structure = bool(
            re.search(r"Recommended [Ss]tructure|[Hh]eading [Ss]tructure", output)
        )
        has_meta = bool(
            re.search(r"[Mm]eta [Dd]escription", output)
        )
        has_intent = bool(
            re.search(r"[Ss]earch [Ii]ntent|[Ii]ntent", output)
        )

        errors = []
        if table_rows < 3:
            errors.append(f"Too few table rows: {table_rows}")
        if not has_structure:
            errors.append("Missing 'Recommended Structure' section")
        if not has_meta:
            errors.append("Missing 'Meta Description'")
        if not has_intent:
            errors.append("Missing 'Search Intent' section")

        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else "Valid SEO strategy"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "SeoFormat"


class DeepDiveFormatMetric(BaseMetric):
    """Validates DeepDive writer output: 2500-3500 words, 7-9 H2s, 5+ citations."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        words = len(output.split())
        h2s = len(re.findall(r"^##\s+", output, re.MULTILINE))
        citations = len(
            re.findall(r"\b[A-Z][a-z]+(?:\s+(?:et\s+al\.?|and|&)\s+[A-Z][a-z]+)?,?\s*\(?\d{4}\)?", output)
        )
        percentages = len(re.findall(r"\d+%", output))

        errors = []
        if words < 2500:
            errors.append(f"Word count too low: {words}")
        if words > 3500:
            errors.append(f"Word count too high: {words}")
        if h2s < 7:
            errors.append(f"Too few H2 sections: {h2s}")
        if h2s > 9:
            errors.append(f"Too many H2 sections: {h2s}")
        if citations < 5:
            errors.append(f"Too few citations: {citations}")
        if percentages < 3:
            errors.append(f"Too few percentage figures: {percentages}")

        self.score = 0 if errors else 1
        self.reason = (
            "; ".join(errors)
            if errors
            else f"Valid: {words} words, {h2s} H2s, {citations} citations"
        )
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "DeepDiveFormat"


class JournalismWriterFormatMetric(BaseMetric):
    """Validates Journalism Writer output: 1200-1800 words, frontmatter, cross-referencing."""

    def __init__(self):
        self.threshold = 1.0
        self.score = 0
        self.reason = ""

    def measure(self, test_case: LLMTestCase) -> float:
        output = test_case.actual_output
        words = len(output.split())
        has_frontmatter = output.strip().startswith("---")
        h2s = len(re.findall(r"^##\s+", output, re.MULTILINE))

        errors = []
        if words < 1200:
            errors.append(f"Word count too low: {words}")
        if words > 1800:
            errors.append(f"Word count too high: {words}")
        if not has_frontmatter:
            errors.append("Missing frontmatter")
        if h2s < 3:
            errors.append(f"Too few H2 sections: {h2s}")

        lower = output.lower()
        for phrase in AI_PHRASES:
            if phrase in lower:
                errors.append(f"Contains AI phrase: '{phrase}'")

        self.score = 0 if errors else 1
        self.reason = "; ".join(errors) if errors else f"Valid: {words} words, {h2s} sections"
        return self.score

    def is_successful(self) -> bool:
        return self.score >= self.threshold

    @property
    def __name__(self):
        return "JournalismWriterFormat"
