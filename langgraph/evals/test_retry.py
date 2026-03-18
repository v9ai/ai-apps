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
