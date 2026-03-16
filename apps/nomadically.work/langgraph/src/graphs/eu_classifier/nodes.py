"""EU classifier graph nodes.

Heuristic classification with DeepSeek LLM fallback.
"""

import json

from src.classification.signals import extract_eu_signals, format_signals
from src.classification.heuristic import keyword_eu_classify
from src.classification.prompts import CLASSIFICATION_PROMPT
from src.models.classification import JobClassification
from src.config import get_llm
from src.db.connection import get_connection
from src.db.mutations import persist_eu_classification

from .state import EUClassifierState


def extract_signals_node(state: EUClassifierState) -> dict:
    """Extract deterministic EU signals from ATS-enriched job data."""
    signals = extract_eu_signals(state["job"])
    return {"signals": signals}


def heuristic_check_node(state: EUClassifierState) -> dict:
    """Tier 0: deterministic keyword heuristic classification.

    Returns a classification for unambiguous cases, or None to escalate to LLM.
    """
    result = keyword_eu_classify(state["job"], state["signals"])
    if result is not None:
        return {"classification": result.model_dump(), "source": "heuristic"}
    return {"classification": None, "source": ""}


def deepseek_classify_node(state: EUClassifierState) -> dict:
    """Tier 1: LLM classification via DeepSeek for ambiguous cases."""
    job = state["job"]
    llm = get_llm()

    structured_signals = format_signals(state["signals"])
    description = (job.get("description") or "")[:4000]

    chain = CLASSIFICATION_PROMPT | llm
    response = chain.invoke({
        "title": job.get("title", ""),
        "location": job.get("location", ""),
        "description": description,
        "structured_signals": structured_signals,
    })

    parsed = json.loads(response.content)
    result = JobClassification.from_dict(parsed)
    return {"classification": result.model_dump(), "source": "deepseek"}


def route_after_heuristic(state: EUClassifierState) -> str:
    """Route based on whether heuristic produced a classification."""
    if state["classification"] is not None:
        return "persist_and_end"
    return "deepseek_classify"


def persist_and_end_node(state: EUClassifierState) -> dict:
    """Persist the EU classification result to the database."""
    classification = state["classification"]
    job = state["job"]
    conn = get_connection()
    try:
        persist_eu_classification(
            conn,
            job_id=job["id"],
            is_remote_eu=classification["isRemoteEU"],
            confidence=classification["confidence"],
            reason=classification["reason"],
            source=state["source"],
        )
    finally:
        conn.close()
    return {}
