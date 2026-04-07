"""salescue/validation.py — Input validation for all module entry points.

Validates text inputs, required fields, and type constraints before any
module processing. Raises SalesCueValidationError with clear messages.
"""

from __future__ import annotations

import warnings

MAX_TEXT_LENGTH = 10_000
MIN_TEXT_LENGTH = 1


class SalesCueValidationError(ValueError):
    """Raised when module input fails validation."""


def validate_text(text: object, *, field: str = "text", max_length: int = MAX_TEXT_LENGTH) -> str:
    """Validate a text input and return the cleaned string."""
    if text is None:
        raise SalesCueValidationError(f"{field} is required (got None)")
    if not isinstance(text, str):
        raise SalesCueValidationError(
            f"{field} must be a string, got {type(text).__name__}"
        )
    text = text.strip()
    if len(text) < MIN_TEXT_LENGTH:
        raise SalesCueValidationError(f"{field} must be non-empty after stripping whitespace")
    if len(text) > max_length:
        raise SalesCueValidationError(
            f"{field} exceeds maximum length ({len(text)} > {max_length})"
        )
    if len(text) > 5_000:
        warnings.warn(
            f"{field} is {len(text)} chars; backbone truncates to 512 tokens — "
            f"tail content will be ignored",
            stacklevel=2,
        )
    return text


def validate_transcript(transcript: object) -> list[dict]:
    """Validate a call transcript (list of turn dicts)."""
    if not isinstance(transcript, list):
        raise SalesCueValidationError(
            f"transcript must be a list, got {type(transcript).__name__}"
        )
    if len(transcript) == 0:
        raise SalesCueValidationError("transcript must contain at least one turn")

    for i, turn in enumerate(transcript):
        if not isinstance(turn, dict):
            raise SalesCueValidationError(f"transcript[{i}] must be a dict")
        if "text" not in turn:
            raise SalesCueValidationError(f"transcript[{i}] missing required key 'text'")
        if "speaker" not in turn:
            raise SalesCueValidationError(f"transcript[{i}] missing required key 'speaker'")
        turn["text"] = validate_text(turn["text"], field=f"transcript[{i}].text")

    return transcript


def validate_subjects(subjects: object) -> list[str]:
    """Validate a list of subject lines."""
    if not isinstance(subjects, list):
        raise SalesCueValidationError(
            f"subjects must be a list, got {type(subjects).__name__}"
        )
    if len(subjects) < 2:
        raise SalesCueValidationError("subjects must contain at least 2 items for comparison")

    return [validate_text(s, field=f"subjects[{i}]", max_length=500) for i, s in enumerate(subjects)]
