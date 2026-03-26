"""EU classification — constants, signals, heuristic, prompts.

Ported verbatim from workers/eu-classifier/src/ with import path fixes.
"""

from .constants import (
    EU_ISO_CODES,
    EU_COUNTRY_NAMES,
    COUNTRY_NAME_TO_ISO,
    NEGATIVE_EU_PATTERN,
    US_IMPLICIT_PATTERN,
    EU_TIMEZONE_PATTERN,
    NON_EU_LOCATION_PATTERN,
    NON_EU_JD_PATTERN,
    normalize_text_for_signals,
)
from .signals import extract_eu_signals, format_signals
from .heuristic import keyword_eu_classify
from .prompts import CLASSIFICATION_PROMPT

__all__ = [
    "EU_ISO_CODES",
    "EU_COUNTRY_NAMES",
    "COUNTRY_NAME_TO_ISO",
    "NEGATIVE_EU_PATTERN",
    "US_IMPLICIT_PATTERN",
    "EU_TIMEZONE_PATTERN",
    "NON_EU_LOCATION_PATTERN",
    "NON_EU_JD_PATTERN",
    "normalize_text_for_signals",
    "extract_eu_signals",
    "format_signals",
    "keyword_eu_classify",
    "CLASSIFICATION_PROMPT",
]
