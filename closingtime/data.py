"""closingtime/data.py — Sample datasets and column mapping for training.

Provides sample_dataset() for each module and column_mapping dicts
that tell Trainer which columns map to which model inputs.

Usage:
    from closingtime.data import sample_dataset, column_mapping

    ds = sample_dataset("score")
    mapping = column_mapping("score")
"""

from __future__ import annotations

from typing import Any


# Column mappings: tell Trainer which dataset columns map to model inputs
COLUMN_MAPPINGS: dict[str, dict[str, str]] = {
    "score": {
        "text": "text",
        "label": "label",         # hot/warm/cold/disqualified
        "score": "score",         # 0-100
    },
    "intent": {
        "text": "text",
        "label": "stage",         # unaware/researching/etc
    },
    "reply": {
        "text": "text",
        "labels": "labels",       # list of active labels
    },
    "entities": {
        "text": "text",
        "entities": "entities",   # list of {type, start, end, text}
    },
    "triggers": {
        "text": "text",
        "event_type": "event_type",
        "displacement_days": "displacement_days",
    },
    "icp": {
        "prospect_text": "text",
        "icp_text": "icp_text",
        "score": "score",
    },
    "objection": {
        "text": "text",
        "category": "category",   # genuine_objection/stall/misunderstanding
        "type": "objection_type",
    },
    "call": {
        "transcript": "transcript",  # list of {speaker, text}
        "outcome": "outcome",
    },
    "spam": {
        "text": "text",
        "is_spam": "label",
        "provider": "provider",
    },
    "subject": {
        "subject_a": "subject_a",
        "subject_b": "subject_b",
        "winner": "winner",       # "a" or "b"
    },
    "sentiment": {
        "text": "text",
        "sentiment": "sentiment",
        "intent": "intent",
    },
}


def column_mapping(module_name: str) -> dict[str, str]:
    """Return the column mapping for a module's training data.

    Maps dataset column names to the names the module's compute_loss expects.
    """
    if module_name not in COLUMN_MAPPINGS:
        raise ValueError(f"No column mapping for '{module_name}'. "
                         f"Available: {list(COLUMN_MAPPINGS.keys())}")
    return COLUMN_MAPPINGS[module_name]


# Sample data generators

def _score_samples() -> list[dict[str, Any]]:
    return [
        {"text": "We need to see pricing for 500 seats by end of quarter. Can you send a proposal?",
         "label": "hot", "score": 88},
        {"text": "Interesting, we're evaluating a few vendors. What makes you different?",
         "label": "warm", "score": 62},
        {"text": "Thanks for reaching out. We're not looking at this right now.",
         "label": "cold", "score": 18},
        {"text": "Please remove me from your mailing list.",
         "label": "disqualified", "score": 3},
    ]


# TODO: remaining sample data generators (_intent_samples, _reply_samples, etc.)
# will be added once the full sample data is provided.


_SAMPLE_GENERATORS: dict[str, Any] = {
    "score": _score_samples,
}


def sample_dataset(module_name: str) -> list[dict[str, Any]]:
    """Return sample training data for a module.

    Useful for testing, demos, and quick-start notebooks.
    """
    if module_name not in _SAMPLE_GENERATORS:
        raise ValueError(f"No sample data for '{module_name}'. "
                         f"Available: {list(_SAMPLE_GENERATORS.keys())}")
    return _SAMPLE_GENERATORS[module_name]()
