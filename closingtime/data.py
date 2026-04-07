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


def _intent_samples() -> list[dict[str, Any]]:
    return [
        {"text": "What is ClosingTime?", "stage": "unaware"},
        {"text": "I've heard of your product. Tell me more.", "stage": "aware"},
        {"text": "We're comparing you against Gong and Outreach.", "stage": "evaluating"},
        {"text": "Ready to sign, send over the contract.", "stage": "purchasing"},
    ]


def _reply_samples() -> list[dict[str, Any]]:
    return [
        {"text": "This looks great, can we schedule a demo?",
         "labels": ["genuinely_interested", "meeting_request"]},
        {"text": "Thanks for the info, I'll take a look.",
         "labels": ["politely_acknowledging"]},
        {"text": "I'm out of the office until next Monday.",
         "labels": ["out_of_office"]},
        {"text": "The pricing is too high for our budget.",
         "labels": ["objection", "negative_sentiment"]},
    ]


def _triggers_samples() -> list[dict[str, Any]]:
    return [
        {"text": "Acme Corp raised $50M Series C led by Sequoia.",
         "event_type": "new_funding", "displacement_days": 0},
        {"text": "Jane Smith joined BigCo as VP of Sales.",
         "event_type": "job_change", "displacement_days": 3},
        {"text": "TechCorp acquired DataInc for $200M.",
         "event_type": "acquisition_merger", "displacement_days": 1},
    ]


def _icp_samples() -> list[dict[str, Any]]:
    return [
        {"text": "We're a 500-person SaaS company in fintech using Salesforce.",
         "icp_text": "Mid-market SaaS, financial services, CRM users", "score": 0.92},
        {"text": "Small bakery with 5 employees in rural Montana.",
         "icp_text": "Enterprise B2B tech companies", "score": 0.08},
    ]


def _objection_samples() -> list[dict[str, Any]]:
    return [
        {"text": "Your pricing is way too high for what you offer.",
         "category": "genuine_objection", "objection_type": "price_too_high"},
        {"text": "Let me think about it and get back to you.",
         "category": "stall", "objection_type": "need_to_think"},
        {"text": "We're locked into a 2-year contract with your competitor.",
         "category": "genuine_objection", "objection_type": "contract_locked"},
    ]


def _sentiment_samples() -> list[dict[str, Any]]:
    return [
        {"text": "This is exactly what we've been looking for! When can we start?",
         "sentiment": "enthusiastic", "intent": "purchase"},
        {"text": "Looks fine I guess. We'll consider it.",
         "sentiment": "neutral_professional", "intent": "evaluate"},
        {"text": "Stop emailing me. I've asked three times already.",
         "sentiment": "hostile_rejection", "intent": "unsubscribe"},
    ]


def _spam_samples() -> list[dict[str, Any]]:
    return [
        {"text": "Hi John, following up on our conversation about the Q3 rollout.",
         "label": "not_spam", "provider": "gmail"},
        {"text": "CONGRATULATIONS! You've won a FREE iPhone! Click here NOW!!!",
         "label": "spam", "provider": "unknown"},
    ]


def _entities_samples() -> list[dict[str, Any]]:
    return [
        {"text": "Jane Smith from Acme Corp is evaluating Salesforce alternatives.",
         "entities": [
             {"type": "person", "start": 0, "end": 10, "text": "Jane Smith"},
             {"type": "company", "start": 16, "end": 24, "text": "Acme Corp"},
             {"type": "product", "start": 41, "end": 51, "text": "Salesforce"},
         ]},
    ]


def _call_samples() -> list[dict[str, Any]]:
    return [
        {"transcript": [
            {"speaker": "rep", "text": "How's the evaluation going?"},
            {"speaker": "prospect", "text": "We're ready to move forward with the proposal."},
         ], "outcome": "send_proposal"},
        {"transcript": [
            {"speaker": "rep", "text": "Any questions about the demo?"},
            {"speaker": "prospect", "text": "We need to loop in our CTO first."},
         ], "outcome": "follow_up"},
    ]


def _subject_samples() -> list[dict[str, Any]]:
    return [
        {"subject_a": "Quick question about your Q3 plans",
         "subject_b": "URGENT: Limited time offer!!!", "winner": "a"},
        {"subject_a": "Re: Next steps for Acme partnership",
         "subject_b": "Following up", "winner": "a"},
    ]


_SAMPLE_GENERATORS = {
    "score": _score_samples,
    "intent": _intent_samples,
    "reply": _reply_samples,
    "triggers": _triggers_samples,
    "icp": _icp_samples,
    "objection": _objection_samples,
    "sentiment": _sentiment_samples,
    "spam": _spam_samples,
    "entities": _entities_samples,
    "call": _call_samples,
    "subject": _subject_samples,
}


def sample_dataset(module_name: str) -> list[dict[str, Any]]:
    """Return sample training data for a module.

    Useful for testing, demos, and quick-start notebooks.
    """
    if module_name not in _SAMPLE_GENERATORS:
        raise ValueError(f"No sample data for '{module_name}'. "
                         f"Available: {list(_SAMPLE_GENERATORS.keys())}")
    return _SAMPLE_GENERATORS[module_name]()
