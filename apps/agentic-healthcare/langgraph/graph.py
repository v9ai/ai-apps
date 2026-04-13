"""
LangGraph clinical intelligence graph — agentic pipeline for blood marker Q&A.

StateGraph:  triage → retrieve → synthesize → guard

Nodes:
  1. triage      — Classify query intent (markers, trajectory, conditions, medications, safety_refusal)
  2. retrieve    — Fan-out to relevant pgvector search functions based on intent
  3. synthesize  — Generate response with DeepSeek using retrieved context + clinical prompt
  4. guard       — Post-generation safety check (no diagnosis, physician referral, PII)

The graph replaces the simple LlamaIndex ContextChatEngine with a proper agentic
workflow that routes queries to specialised retrieval strategies and enforces clinical
safety as a discrete, auditable step.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from llm_backend import llm_call as _llm_call
from db import (
    search_appointments,
    search_blood_tests,
    search_conditions,
    search_health_states,
    search_marker_trend,
    search_markers_hybrid,
    search_medications,
    search_symptoms,
)
from embeddings import generate_embedding

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# State
# ═══════════════════════════════════════════════════════════════════════════


class GraphState(BaseModel):
    """Typed state flowing through the clinical intelligence graph."""

    # Input
    query: str = ""
    user_id: str = ""
    chat_history: list[dict[str, str]] = Field(default_factory=list)

    # Triage
    intent: str = ""  # markers | derived_ratios | trajectory | conditions | medications | symptoms | appointments | general_health | safety_refusal
    intent_confidence: float = 0.0
    entities: list[str] = Field(default_factory=list)  # extracted marker/condition names

    # Retrieval
    context_chunks: list[str] = Field(default_factory=list)
    retrieval_sources: list[str] = Field(default_factory=list)  # which tables were queried
    retrieval_scores: list[float] = Field(default_factory=list)

    # Synthesis
    answer: str = ""
    citations: list[str] = Field(default_factory=list)

    # Safety guard
    guard_passed: bool = False
    guard_issues: list[str] = Field(default_factory=list)
    final_answer: str = ""


# ═══════════════════════════════════════════════════════════════════════════
# Node 1: Triage
# ═══════════════════════════════════════════════════════════════════════════

TRIAGE_SYSTEM = """You are a clinical query classifier for a blood marker intelligence system.

Classify the user's query into exactly ONE intent:
- markers: Questions about specific blood marker values, levels, reference ranges, flags
- derived_ratios: Questions about derived clinical ratios — TG/HDL, TC/HDL, HDL/LDL, NLR, De Ritis (AST/ALT), BUN/Creatinine, TyG Index — their values, risk classification, or clinical significance
- trajectory: Questions about trends over time, changes between tests, velocity, improving/deteriorating
- conditions: Questions about health conditions, diseases, diagnoses (but NOT to make a diagnosis)
- medications: Questions about medications, drugs, dosages, drug-biomarker interactions
- symptoms: Questions about symptoms and their relation to markers
- appointments: Questions about scheduling, upcoming visits, providers
- general_health: Broad health questions spanning multiple categories (metabolic syndrome, overall health)
- safety_refusal: Requests that ask for diagnosis, treatment prescriptions, or clearly out-of-scope topics

Also extract any specific entity names (marker names, condition names, medication names, ratio names) from the query.

Respond ONLY with JSON:
{"intent": "...", "confidence": 0.0-1.0, "entities": ["..."]}"""


def triage(state: GraphState) -> dict[str, Any]:
    """Classify query intent and extract entities."""
    raw = _llm_call(TRIAGE_SYSTEM, state.query)

    # Parse JSON from response (handle markdown code blocks)
    cleaned = re.sub(r"```json\s*|\s*```", "", raw).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Triage JSON parse failed, defaulting to general_health: %s", raw)
        parsed = {"intent": "general_health", "confidence": 0.5, "entities": []}

    intent = parsed.get("intent", "general_health")
    valid_intents = {
        "markers", "derived_ratios", "trajectory", "conditions", "medications",
        "symptoms", "appointments", "general_health", "safety_refusal",
    }
    if intent not in valid_intents:
        intent = "general_health"

    return {
        "intent": intent,
        "intent_confidence": float(parsed.get("confidence", 0.5)),
        "entities": parsed.get("entities", []),
    }


# ═══════════════════════════════════════════════════════════════════════════
# Node 2: Retrieve
# ═══════════════════════════════════════════════════════════════════════════


def retrieve(state: GraphState) -> dict[str, Any]:
    """Fan-out to relevant pgvector search functions based on triage intent."""
    if state.intent == "safety_refusal":
        return {
            "context_chunks": [],
            "retrieval_sources": [],
            "retrieval_scores": [],
        }

    embedding = generate_embedding(state.query)
    user_id = state.user_id
    chunks: list[str] = []
    sources: list[str] = []
    scores: list[float] = []

    intent = state.intent

    if intent == "derived_ratios":
        # Primary: health state embeddings with JSONB derived_metrics
        hs_results = search_health_states(embedding, user_id, limit=5)
        for r in hs_results:
            chunks.append(r["content"])
            sources.append("health_state_embeddings")
            scores.append(r["similarity"])

        # Cross-reference with individual markers for underlying values
        marker_results = search_markers_hybrid(state.query, embedding, user_id, limit=5)
        for r in marker_results:
            chunks.append(r["content"])
            sources.append("blood_marker_embeddings")
            scores.append(r["combined_score"])

    elif intent in ("markers", "trajectory"):
        # Primary: hybrid marker search
        marker_results = search_markers_hybrid(state.query, embedding, user_id, limit=10)
        for r in marker_results:
            chunks.append(r["content"])
            sources.append("blood_marker_embeddings")
            scores.append(r["combined_score"])

        # Also get test-level context
        test_results = search_blood_tests(embedding, user_id, limit=3)
        for r in test_results:
            chunks.append(r["content"])
            sources.append("blood_test_embeddings")
            scores.append(r["similarity"])

        # Health state context for ratio cross-reference
        hs_results = search_health_states(embedding, user_id, limit=2)
        for r in hs_results:
            chunks.append(r["content"])
            sources.append("health_state_embeddings")
            scores.append(r["similarity"])

        # For trajectory, also get trend data
        if intent == "trajectory" and state.entities:
            for entity in state.entities[:3]:
                trend_results = search_marker_trend(embedding, user_id, marker_name=entity, limit=20)
                for r in trend_results:
                    chunks.append(r["content"])
                    sources.append("marker_trend")
                    scores.append(r["similarity"])

    elif intent == "conditions":
        cond_results = search_conditions(embedding, user_id, limit=5)
        for r in cond_results:
            chunks.append(r["content"])
            sources.append("condition_embeddings")
            scores.append(r["similarity"])
        # Cross-reference with markers
        marker_results = search_markers_hybrid(state.query, embedding, user_id, limit=5)
        for r in marker_results:
            chunks.append(r["content"])
            sources.append("blood_marker_embeddings")
            scores.append(r["combined_score"])

    elif intent == "medications":
        med_results = search_medications(embedding, user_id, limit=5)
        for r in med_results:
            chunks.append(r["content"])
            sources.append("medication_embeddings")
            scores.append(r["similarity"])
        # Cross-reference with markers for drug-biomarker interactions
        marker_results = search_markers_hybrid(state.query, embedding, user_id, limit=5)
        for r in marker_results:
            chunks.append(r["content"])
            sources.append("blood_marker_embeddings")
            scores.append(r["combined_score"])

    elif intent == "symptoms":
        sym_results = search_symptoms(embedding, user_id, limit=5)
        for r in sym_results:
            chunks.append(r["content"])
            sources.append("symptom_embeddings")
            scores.append(r["similarity"])
        # Cross-reference with markers
        marker_results = search_markers_hybrid(state.query, embedding, user_id, limit=5)
        for r in marker_results:
            chunks.append(r["content"])
            sources.append("blood_marker_embeddings")
            scores.append(r["combined_score"])

    elif intent == "appointments":
        appt_results = search_appointments(embedding, user_id, limit=5)
        for r in appt_results:
            chunks.append(r["content"])
            sources.append("appointment_embeddings")
            scores.append(r["similarity"])

    else:
        # general_health — fan-out to all tables
        test_results = search_blood_tests(embedding, user_id, limit=3)
        for r in test_results:
            chunks.append(r["content"])
            sources.append("blood_test_embeddings")
            scores.append(r["similarity"])

        marker_results = search_markers_hybrid(state.query, embedding, user_id, limit=5)
        for r in marker_results:
            chunks.append(r["content"])
            sources.append("blood_marker_embeddings")
            scores.append(r["combined_score"])

        hs_results = search_health_states(embedding, user_id, limit=3)
        for r in hs_results:
            chunks.append(r["content"])
            sources.append("health_state_embeddings")
            scores.append(r["similarity"])

        cond_results = search_conditions(embedding, user_id, limit=3)
        for r in cond_results:
            chunks.append(r["content"])
            sources.append("condition_embeddings")
            scores.append(r["similarity"])

        med_results = search_medications(embedding, user_id, limit=3)
        for r in med_results:
            chunks.append(r["content"])
            sources.append("medication_embeddings")
            scores.append(r["similarity"])

        sym_results = search_symptoms(embedding, user_id, limit=3)
        for r in sym_results:
            chunks.append(r["content"])
            sources.append("symptom_embeddings")
            scores.append(r["similarity"])

    # De-duplicate chunks by content and re-rank by score
    seen: set[str] = set()
    deduped: list[tuple[str, str, float]] = []
    for chunk, source, score in zip(chunks, sources, scores):
        key = chunk.strip()
        if key not in seen:
            seen.add(key)
            deduped.append((chunk, source, score))
    # Sort by score descending so best chunks appear first in context
    deduped.sort(key=lambda t: t[2], reverse=True)

    return {
        "context_chunks": [d[0] for d in deduped],
        "retrieval_sources": [d[1] for d in deduped],
        "retrieval_scores": [d[2] for d in deduped],
    }


# ═══════════════════════════════════════════════════════════════════════════
# Node 3: Synthesize
# ═══════════════════════════════════════════════════════════════════════════

SYNTHESIS_SYSTEM = """You are a clinical blood marker intelligence assistant.

You help users understand their blood test results, derived clinical ratios,
trajectory trends, medication effects, and health conditions.

DERIVED RATIOS ENGINE — 7 peer-reviewed ratios stored per blood test:
┌─────────────────┬───────────────────────────┬──────────┬───────────┬──────────┬────────────────────┐
│ Ratio           │ Formula                   │ Optimal  │ Borderline│ Elevated │ Reference          │
├─────────────────┼───────────────────────────┼──────────┼───────────┼──────────┼────────────────────┤
│ TG/HDL Ratio    │ Triglycerides / HDL       │ < 2.0    │ 2.0 – 3.5│ > 3.5   │ McLaughlin et al.  │
│ TC/HDL Ratio    │ Total Cholesterol / HDL   │ < 4.0    │ 4.0 – 5.0│ > 5.0   │ Castelli et al.    │
│ HDL/LDL Ratio   │ HDL / LDL                │ > 0.4    │ 0.3 – 0.4│ < 0.3   │ Millán et al.      │
│ NLR             │ Neutrophils / Lymphocytes │ 1.0 – 3.0│ 3.0 – 5.0│ > 5.0   │ Fest et al.        │
│ De Ritis Ratio  │ AST / ALT                │ 0.8 – 1.5│ 1.5 – 2.0│ > 2.0   │ De Ritis et al.    │
│ BUN/Creatinine  │ BUN / Creatinine         │ 10 – 20  │ 20 – 25  │ > 25    │ Hosten et al.      │
│ TyG Index       │ ln(TG × Glucose × 0.5)   │ < 8.5    │ 8.5 – 9.0│ > 9.0   │ Simental-Mendía    │
└─────────────────┴───────────────────────────┴──────────┴───────────┴──────────┴────────────────────┘

RULES:
1. Answer ONLY based on the provided context. If the context doesn't contain relevant
   information, say so clearly.
2. Cite specific marker values and reference ranges when available.
3. For derived ratios, cite the exact peer-reviewed threshold and source paper from
   the table above. Classify each ratio as optimal/borderline/elevated.
4. When multiple ratios are elevated, identify the affected organ systems:
   - Elevated TG/HDL or TyG → metabolic (insulin resistance)
   - Elevated TC/HDL or low HDL/LDL → cardiovascular (atherogenic risk)
   - Elevated NLR → inflammatory (infection, stress, malignancy)
   - Elevated BUN/Creatinine → renal (pre-renal vs intrinsic)
   - Elevated De Ritis → hepatic (alcoholic/cardiac origin)
5. NEVER diagnose conditions — describe what the data shows and note associations.
6. NEVER prescribe treatments or specific medication dosages.
7. ALWAYS remind the user to consult their physician for medical decisions.
8. For trajectory questions, describe the direction (improving/stable/deteriorating)
   using clinical semantics (e.g., rising HDL = improving, rising TG/HDL = deteriorating).

When no context is available (empty context), explain that no matching health data was
found for the query and suggest what data the user could add."""

SAFETY_REFUSAL_RESPONSE = (
    "I understand your concern, but I'm not able to provide medical diagnoses, "
    "prescribe treatments, or recommend specific medication dosages. My role is to "
    "help you understand your blood test results and health data trends.\n\n"
    "For medical advice, diagnosis, or treatment decisions, please consult your "
    "physician or a qualified healthcare professional."
)


def synthesize(state: GraphState) -> dict[str, Any]:
    """Generate response using retrieved context + clinical safety prompt."""
    if state.intent == "safety_refusal":
        return {
            "answer": SAFETY_REFUSAL_RESPONSE,
            "citations": [],
        }

    # Build context block
    if state.context_chunks:
        context_block = "\n\n---\n\n".join(state.context_chunks)
        context_section = f"RETRIEVED CONTEXT ({len(state.context_chunks)} chunks from {', '.join(set(state.retrieval_sources))}):\n\n{context_block}"
    else:
        context_section = "RETRIEVED CONTEXT: No matching health data found for this query."

    # Build conversation history
    history_lines = []
    for msg in state.chat_history[-6:]:  # last 3 turns
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_lines.append(f"{role}: {content}")
    history_section = "\n".join(history_lines) if history_lines else ""

    parts = [context_section]
    if history_section:
        parts.append(f"CONVERSATION HISTORY:\n{history_section}")
    parts.append(f"QUERY: {state.query}")
    user_prompt = "\n\n".join(parts)

    answer = _llm_call(SYNTHESIS_SYSTEM, user_prompt, temperature=0.1)

    # Extract citations from the answer (lines with reference patterns)
    citations = re.findall(r"(?:(?:Castelli|Millán|McLaughlin|Simental-Mendía|Forget|Hosten|De Ritis|Giannini|Fest|Botros|Inker|Gonzalez-Chavez)[^.]*\.)", answer)

    return {
        "answer": answer,
        "citations": citations,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Node 4: Safety Guard
# ═══════════════════════════════════════════════════════════════════════════

GUARD_SYSTEM = """You are a clinical safety auditor. Review the AI assistant's response and check for:

1. DIAGNOSIS: Does the response diagnose a medical condition (says "you have X" or "this confirms Y")?
2. PRESCRIPTION: Does the response prescribe specific medications or dosages?
3. PHYSICIAN_REFERRAL: Does the response include a reminder to consult a healthcare professional?
4. PII_LEAKAGE: Does the response contain personally identifiable information?
5. HALLUCINATION: Does the response claim facts NOT supported by the provided context?

Respond ONLY with JSON:
{"passed": true/false, "issues": ["DIAGNOSIS", "PRESCRIPTION", ...]}

A response passes if it has NO diagnosis, NO prescription, HAS physician referral, NO PII, and NO obvious hallucination.
If the response is a safety refusal, it automatically passes."""


def guard(state: GraphState) -> dict[str, Any]:
    """Post-generation safety check."""
    if state.intent == "safety_refusal":
        return {
            "guard_passed": True,
            "guard_issues": [],
            "final_answer": state.answer,
        }

    # Build audit prompt
    context_summary = f"Context sources: {', '.join(set(state.retrieval_sources))}" if state.retrieval_sources else "No context retrieved"
    audit_prompt = f"""ORIGINAL QUERY: {state.query}

{context_summary}

ASSISTANT RESPONSE:
{state.answer}"""

    raw = _llm_call(GUARD_SYSTEM, audit_prompt)
    cleaned = re.sub(r"```json\s*|\s*```", "", raw).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("Guard JSON parse failed, defaulting to FAILED (fail-safe): %s", raw)
        parsed = {"passed": False, "issues": ["PARSE_FAILURE"]}

    passed = parsed.get("passed", False)
    issues = parsed.get("issues", [])

    if passed:
        final_answer = state.answer
    else:
        # Append safety disclaimer if guard fails
        disclaimer_parts = []
        if "DIAGNOSIS" in issues:
            disclaimer_parts.append(
                "Please note: the above information is for educational purposes only "
                "and should not be interpreted as a medical diagnosis."
            )
        if "PRESCRIPTION" in issues:
            disclaimer_parts.append(
                "I cannot recommend specific medications or dosages."
            )
        if "PHYSICIAN_REFERRAL" in issues:
            disclaimer_parts.append(
                "Please consult your physician or healthcare professional before "
                "making any medical decisions based on this information."
            )

        if disclaimer_parts:
            final_answer = state.answer + "\n\n⚠️ " + " ".join(disclaimer_parts)
        else:
            final_answer = state.answer

    return {
        "guard_passed": passed,
        "guard_issues": issues,
        "final_answer": final_answer,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Graph assembly
# ═══════════════════════════════════════════════════════════════════════════


def build_graph() -> StateGraph:
    """Build and compile the clinical intelligence LangGraph."""
    graph = StateGraph(GraphState)

    graph.add_node("triage", triage)
    graph.add_node("retrieve", retrieve)
    graph.add_node("synthesize", synthesize)
    graph.add_node("guard", guard)

    graph.set_entry_point("triage")
    graph.add_edge("triage", "retrieve")
    graph.add_edge("retrieve", "synthesize")
    graph.add_edge("synthesize", "guard")
    graph.add_edge("guard", END)

    return graph


# Compiled graph — import this in chat_server.py
compiled_graph = build_graph().compile()


async def run_graph(
    query: str,
    user_id: str,
    chat_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Execute the clinical intelligence graph and return the full state."""
    initial_state = GraphState(
        query=query,
        user_id=user_id,
        chat_history=chat_history or [],
    )
    result = await compiled_graph.ainvoke(initial_state.model_dump())
    return result
