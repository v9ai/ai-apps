"""Tests for salescue.validation — input validation logic."""

import warnings

import pytest

from salescue.validation import (
    SalesCueValidationError,
    validate_text,
    validate_transcript,
    validate_subjects,
    MAX_TEXT_LENGTH,
)


class TestValidateText:
    def test_valid_string(self):
        assert validate_text("hello") == "hello"

    def test_strips_whitespace(self):
        assert validate_text("  hello  ") == "hello"

    def test_none_raises(self):
        with pytest.raises(SalesCueValidationError, match="is required"):
            validate_text(None)

    def test_non_string_raises(self):
        with pytest.raises(SalesCueValidationError, match="must be a string"):
            validate_text(123)

    def test_empty_after_strip_raises(self):
        with pytest.raises(SalesCueValidationError, match="non-empty"):
            validate_text("   ")

    def test_exceeds_max_length(self):
        with pytest.raises(SalesCueValidationError, match="exceeds maximum"):
            validate_text("a" * (MAX_TEXT_LENGTH + 1))

    def test_custom_max_length(self):
        with pytest.raises(SalesCueValidationError, match="exceeds maximum"):
            validate_text("a" * 101, max_length=100)

    def test_warns_on_long_text(self):
        text = "a" * 5_001
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            validate_text(text)
            assert len(w) == 1
            assert "truncates to 512 tokens" in str(w[0].message)

    def test_custom_field_name_in_error(self):
        with pytest.raises(SalesCueValidationError, match="email_body"):
            validate_text(None, field="email_body")

    def test_exactly_max_length_ok(self):
        text = "a" * MAX_TEXT_LENGTH
        assert validate_text(text) == text


class TestValidateTranscript:
    def test_valid_transcript(self):
        transcript = [
            {"speaker": "rep", "text": "Hello"},
            {"speaker": "prospect", "text": "Hi there"},
        ]
        result = validate_transcript(transcript)
        assert len(result) == 2

    def test_non_list_raises(self):
        with pytest.raises(SalesCueValidationError, match="must be a list"):
            validate_transcript("not a list")

    def test_empty_list_raises(self):
        with pytest.raises(SalesCueValidationError, match="at least one turn"):
            validate_transcript([])

    def test_non_dict_turn_raises(self):
        with pytest.raises(SalesCueValidationError, match="must be a dict"):
            validate_transcript(["not a dict"])

    def test_missing_text_raises(self):
        with pytest.raises(SalesCueValidationError, match="missing required key 'text'"):
            validate_transcript([{"speaker": "rep"}])

    def test_missing_speaker_raises(self):
        with pytest.raises(SalesCueValidationError, match="missing required key 'speaker'"):
            validate_transcript([{"text": "hello"}])

    def test_strips_turn_text(self):
        transcript = [{"speaker": "rep", "text": "  hello  "}]
        result = validate_transcript(transcript)
        assert result[0]["text"] == "hello"


class TestValidateSubjects:
    def test_valid_subjects(self):
        result = validate_subjects(["Subject A", "Subject B"])
        assert len(result) == 2

    def test_non_list_raises(self):
        with pytest.raises(SalesCueValidationError, match="must be a list"):
            validate_subjects("not a list")

    def test_fewer_than_two_raises(self):
        with pytest.raises(SalesCueValidationError, match="at least 2 items"):
            validate_subjects(["only one"])

    def test_strips_subject_text(self):
        result = validate_subjects(["  A  ", "  B  "])
        assert result == ["A", "B"]

    def test_long_subject_raises(self):
        with pytest.raises(SalesCueValidationError, match="exceeds maximum"):
            validate_subjects(["ok", "x" * 501])
