"""Structural tests for the Generator Agent's validation and retry logic.

Tests that the validation function catches known errors in malformed JSON.
Run: uv run pytest evals/test_retry.py -v
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_src = Path(__file__).resolve().parent.parent / "src"
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from how_it_works.agents.generator import _validate_data
from how_it_works.models import HowItWorksData

from fixtures import SAMPLE_GENERATED_JSON, SAMPLE_INVALID_JSON


class TestValidationCatchesErrors:
    """Does _validate_data correctly identify structural errors?"""

    def test_valid_json_passes(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_GENERATED_JSON))
        errors = _validate_data(data)
        assert errors == [], f"Unexpected errors: {errors}"

    def test_invalid_json_catches_paper_count(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("papers count" in e for e in errors)

    def test_invalid_json_catches_agent_count(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("agents count" in e for e in errors)

    def test_invalid_json_catches_stats_count(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("stats count" in e for e in errors)

    def test_invalid_json_catches_sections_count(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("extraSections count" in e for e in errors)

    def test_invalid_json_catches_bad_slug(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("kebab-case" in e for e in errors)

    def test_invalid_json_catches_bad_category(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("category" in e and "invalid" in e.lower() for e in errors)

    def test_invalid_json_catches_bad_color(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("categoryColor" in e for e in errors)

    def test_invalid_json_catches_non_sequential_numbers(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("sequential" in e for e in errors)

    def test_invalid_json_catches_missing_architecture(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("Architecture" in e for e in errors)

    def test_invalid_json_catches_missing_security(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("Security" in e or "Auth" in e for e in errors)

    def test_invalid_json_catches_short_story(self):
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert any("story" in e and "sentences" in e for e in errors)

    def test_total_error_count(self):
        """The invalid JSON should trigger at least 8 distinct validation errors."""
        data = HowItWorksData.model_validate(json.loads(SAMPLE_INVALID_JSON))
        errors = _validate_data(data)
        assert len(errors) >= 8, f"Only {len(errors)} errors caught: {errors}"


class TestNewValidationRules:
    """Tests for enhanced validation: technicalDetails, duplicate headings, valid types."""

    def test_valid_technical_details_pass(self):
        raw = json.loads(SAMPLE_GENERATED_JSON)
        raw["technicalDetails"] = [
            {"type": "table", "heading": "API Routes", "items": []},
            {"type": "code", "heading": "Query Pattern", "code": "SELECT 1"},
        ]
        data = HowItWorksData.model_validate(raw)
        errors = _validate_data(data)
        assert not any("technicalDetails" in e for e in errors)

    def test_too_many_technical_details(self):
        raw = json.loads(SAMPLE_GENERATED_JSON)
        raw["technicalDetails"] = [
            {"type": "table", "heading": f"Section {i}"} for i in range(6)
        ]
        data = HowItWorksData.model_validate(raw)
        errors = _validate_data(data)
        assert any("technicalDetails count" in e for e in errors)

    def test_single_technical_detail_too_few(self):
        raw = json.loads(SAMPLE_GENERATED_JSON)
        raw["technicalDetails"] = [{"type": "table", "heading": "Only One"}]
        data = HowItWorksData.model_validate(raw)
        errors = _validate_data(data)
        assert any("technicalDetails count" in e for e in errors)

    def test_invalid_technical_detail_type(self):
        raw = json.loads(SAMPLE_GENERATED_JSON)
        raw["technicalDetails"] = [
            {"type": "invalid-type", "heading": "Bad"},
            {"type": "table", "heading": "OK"},
        ]
        data = HowItWorksData.model_validate(raw)
        errors = _validate_data(data)
        assert any("technicalDetail type" in e for e in errors)

    def test_duplicate_extra_section_headings(self):
        raw = json.loads(SAMPLE_GENERATED_JSON)
        raw["extraSections"] = [
            {"heading": "System Architecture", "content": "First."},
            {"heading": "Security & Auth", "content": "Second."},
            {"heading": "System Architecture", "content": "Duplicate."},
        ]
        data = HowItWorksData.model_validate(raw)
        errors = _validate_data(data)
        assert any("duplicate" in e.lower() for e in errors)

    def test_empty_technical_details_no_error(self):
        """No technicalDetails is fine — validation only triggers when present."""
        data = HowItWorksData.model_validate(json.loads(SAMPLE_GENERATED_JSON))
        errors = _validate_data(data)
        assert not any("technicalDetails" in e for e in errors)
