"""
LangGraph clinical intelligence graph — agentic pipeline for blood marker Q&A.

StateGraph with conditional routing:

  triage ──(confidence < 0.7)──> re_triage ──> retrieve_* ──> synthesize ──> guard
       └──(confidence >= 0.7)──> retrieve_* ──┘

Nodes:
  1. triage              — Classify query intent (9 classes + multi_intent)
  2. re_triage           — Re-classify with disambiguation hints on low confidence
  3. retrieve_<intent>   — Per-intent retrieval nodes with dynamic k-limits
  4. synthesize          — Generate response with retrieved context + clinical prompt
  5. guard               — Post-generation safety check (no diagnosis, physician referral, PII)

Conditional edges route from triage to the appropriate retriever node, making
the routing visible in LangGraph traces and the debugger.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Literal

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from llama_index.core import get_response_synthesizer
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.core.prompts import PromptTemplate
from llama_index.core.response_synthesizers import ResponseMode
from llama_index.core.schema import QueryBundle

from llm_backend import llm_call as _llm_call
from postprocessors import RERANK_SYSTEM, ClinicalRelevancePostprocessor
from retrievers import build_retriever_for_intent, nodes_to_state, state_to_nodes

logger = logging.getLogger(__name__)


# Valid single-intent classes
SINGLE_INTENTS = frozenset({
    "markers", "derived_ratios", "trajectory", "conditions", "medications",
    "symptoms", "appointments", "general_health", "safety_refusal",
})

# All retriever node names (for topology assertions in evals)
RETRIEVER_NODE_NAMES = [
    "retrieve_markers", "retrieve_derived_ratios", "retrieve_trajectory",
    "retrieve_conditions", "retrieve_medications", "retrieve_symptoms",
    "retrieve_appointments", "retrieve_general_health",
    "retrieve_multi_intent",
]

# Confidence threshold for re-triage
CONFIDENCE_THRESHOLD = 0.7


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
    intent: str = ""  # markers | derived_ratios | trajectory | conditions | medications | symptoms | appointments | general_health | safety_refusal | multi_intent
    intent_confidence: float = 0.0
    entities: list[str] = Field(default_factory=list)  # extracted marker/condition names

    # Re-triage support
    triage_attempts: int = 0
    triage_max_attempts: int = 2

    # Multi-intent support
    sub_intents: list[str] = Field(default_factory=list)
    sub_queries: list[str] = Field(default_factory=list)
    is_multi_intent: bool = False

    # Retrieval
    context_chunks: list[str] = Field(default_factory=list)
    retrieval_sources: list[str] = Field(default_factory=list)  # which tables were queried
    retrieval_scores: list[float] = Field(default_factory=list)

    # Synthesis
    answer: str = ""
    citations: list[str] = Field(default_factory=list)

    # Reranking
    rerank_scores: list[float] = Field(default_factory=list)
    rerank_rationales: list[str] = Field(default_factory=list)

    # Safety guard
    guard_passed: bool = False
    guard_issues: list[str] = Field(default_factory=list)
    guard_retries: int = 0
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

If the query spans TWO OR MORE categories (e.g. "Is my iron improving and what medication affects it?"
covers trajectory AND medications), respond with multi_intent:
{"intent": "multi_intent", "confidence": 0.0-1.0, "entities": [...],
 "multi_intent": true, "sub_intents": ["trajectory", "medications"],
 "sub_queries": ["Is my iron improving?", "What medication affects my iron?"]}

If the query clearly fits ONE category, respond with:
{"intent": "...", "confidence": 0.0-1.0, "entities": ["..."], "multi_intent": false}

Also extract any specific entity names (marker names, condition names, medication names, ratio names) from the query."""


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
    confidence = float(parsed.get("confidence", 0.5))
    entities = parsed.get("entities", [])
    is_multi = parsed.get("multi_intent", False)
    sub_intents = parsed.get("sub_intents", [])
    sub_queries = parsed.get("sub_queries", [])

    if is_multi and len(sub_intents) >= 2:
        # Validate sub_intents against allowed single intents
        sub_intents = [si for si in sub_intents if si in SINGLE_INTENTS and si != "safety_refusal"]
        if len(sub_intents) < 2:
            is_multi = False
            intent = sub_intents[0] if sub_intents else "general_health"

    if not is_multi and intent not in SINGLE_INTENTS:
        intent = "general_health"

    return {
        "intent": "multi_intent" if is_multi else intent,
        "intent_confidence": confidence,
        "entities": entities,
        "is_multi_intent": is_multi,
        "sub_intents": sub_intents if is_multi else [],
        "sub_queries": sub_queries if is_multi else [],
        "triage_attempts": state.triage_attempts + 1,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Node 1b: Re-Triage (low-confidence disambiguation)
# ═══════════════════════════════════════════════════════════════════════════

RE_TRIAGE_SYSTEM = """You are a clinical query classifier. The previous classification attempt
had low confidence. Re-classify with these disambiguation hints:

The 9 intent categories are:
- markers: specific blood marker VALUES, levels, reference ranges, flags
- derived_ratios: derived RATIO values (TG/HDL, TC/HDL, HDL/LDL, NLR, De Ritis, BUN/Creatinine, TyG)
- trajectory: TRENDS over time, changes between tests, improving/deteriorating
- conditions: health CONDITIONS, diseases, diagnoses
- medications: MEDICATIONS, drugs, dosages, drug-biomarker interactions
- symptoms: SYMPTOMS and their relation to markers
- appointments: SCHEDULING, upcoming visits, providers
- general_health: broad health questions spanning multiple categories
- safety_refusal: requests for diagnosis, treatment prescriptions, out-of-scope

Focus on the PRIMARY action the user wants. If asking about a value -> markers.
If asking about a ratio value -> derived_ratios. If asking about change over time -> trajectory.
If asking about a drug -> medications.

Respond ONLY with JSON:
{"intent": "...", "confidence": 0.0-1.0, "entities": ["..."]}"""


def re_triage(state: GraphState) -> dict[str, Any]:
    """Re-classify with disambiguation hints when first attempt had low confidence."""
    context_hint = f"Previous classification: {state.intent} (confidence: {state.intent_confidence})"
    prompt = f"{context_hint}\n\nOriginal query: {state.query}"

    raw = _llm_call(RE_TRIAGE_SYSTEM, prompt)
    cleaned = re.sub(r"```json\s*|\s*```", "", raw).strip()
    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        parsed = {"intent": "general_health", "confidence": 0.5, "entities": []}

    intent = parsed.get("intent", "general_health")
    if intent not in SINGLE_INTENTS:
        intent = "general_health"

    new_confidence = float(parsed.get("confidence", 0.5))

    # Use the higher-confidence result
    if new_confidence > state.intent_confidence:
        return {
            "intent": intent,
            "intent_confidence": new_confidence,
            "entities": parsed.get("entities", []) or state.entities,
            "triage_attempts": state.triage_attempts + 1,
        }
    # Keep original if re-triage didn't improve confidence
    return {"triage_attempts": state.triage_attempts + 1}


# ═══════════════════════════════════════════════════════════════════════════
# Node 2: Per-intent retriever nodes (LlamaIndex BaseRetriever)
# ═══════════════════════════════════════════════════════════════════════════


def _retrieve_for_intent(state: GraphState, intent: str | None = None, k_scale: float = 1.0) -> dict[str, Any]:
    """Shared retrieval via LlamaIndex BaseRetriever composition."""
    retriever = build_retriever_for_intent(
        intent=intent or state.intent,
        user_id=state.user_id,
        confidence=state.intent_confidence,
        query=state.query,
        entities=state.entities,
        k_scale=k_scale,
    )
    nodes = retriever.retrieve(state.query)
    return nodes_to_state(nodes)


def retrieve_markers(state: GraphState) -> dict[str, Any]:
    """Retrieve for markers intent: hybrid markers + test context + health states."""
    return _retrieve_for_intent(state, "markers")


def retrieve_derived_ratios(state: GraphState) -> dict[str, Any]:
    """Retrieve for derived_ratios intent: health state embeddings + marker cross-ref."""
    return _retrieve_for_intent(state, "derived_ratios")


def retrieve_trajectory(state: GraphState) -> dict[str, Any]:
    """Retrieve for trajectory intent: markers + tests + per-entity trend data."""
    return _retrieve_for_intent(state, "trajectory")


def retrieve_conditions(state: GraphState) -> dict[str, Any]:
    """Retrieve for conditions intent: condition embeddings + marker cross-ref."""
    return _retrieve_for_intent(state, "conditions")


def retrieve_medications(state: GraphState) -> dict[str, Any]:
    """Retrieve for medications intent: medication embeddings + marker cross-ref."""
    return _retrieve_for_intent(state, "medications")


def retrieve_symptoms(state: GraphState) -> dict[str, Any]:
    """Retrieve for symptoms intent: symptom embeddings + marker cross-ref."""
    return _retrieve_for_intent(state, "symptoms")


def retrieve_appointments(state: GraphState) -> dict[str, Any]:
    """Retrieve for appointments intent: appointment embeddings only."""
    return _retrieve_for_intent(state, "appointments")


def retrieve_general_health(state: GraphState) -> dict[str, Any]:
    """Retrieve for general_health intent: fan-out to all tables."""
    return _retrieve_for_intent(state, "general_health")


def refuse(state: GraphState) -> dict[str, Any]:
    """Direct refusal for safety_refusal intent — skips retrieve, synthesize, and guard."""
    return {
        "answer": SAFETY_REFUSAL_RESPONSE,
        "citations": [],
        "context_chunks": [],
        "retrieval_sources": [],
        "retrieval_scores": [],
        "guard_passed": True,
        "guard_issues": [],
        "final_answer": SAFETY_REFUSAL_RESPONSE,
    }


def retrieve_multi_intent(state: GraphState) -> dict[str, Any]:
    """Fan-out retrieval for multi-intent queries — merge results from each sub-intent."""
    from retrievers import CompositeRetriever

    sub_retrievers = []
    for sub_intent in state.sub_intents:
        if sub_intent in SINGLE_INTENTS and sub_intent != "safety_refusal":
            r = build_retriever_for_intent(
                sub_intent, state.user_id, state.intent_confidence,
                state.query, state.entities, k_scale=0.6,
            )
            sub_retrievers.append(r)

    if not sub_retrievers:
        return _retrieve_for_intent(state, "general_health")

    composite = CompositeRetriever(sub_retrievers)
    nodes = composite.retrieve(state.query)
    return nodes_to_state(nodes)


# ═══════════════════════════════════════════════════════════════════════════
# Node 3: Rerank
# ═══════════════════════════════════════════════════════════════════════════

def rerank(state: GraphState) -> dict[str, Any]:
    """LLM-based relevance reranking via LlamaIndex ClinicalRelevancePostprocessor."""
    from config import settings

    if not settings.rerank_enabled:
        return {
            "rerank_scores": list(state.retrieval_scores),
            "rerank_rationales": ["rerank_disabled"] * len(state.context_chunks),
        }

    if not state.context_chunks or state.intent == "safety_refusal":
        return {
            "context_chunks": state.context_chunks,
            "retrieval_sources": state.retrieval_sources,
            "retrieval_scores": state.retrieval_scores,
            "rerank_scores": [],
            "rerank_rationales": [],
        }

    nodes = state_to_nodes(
        state.context_chunks, state.retrieval_sources, state.retrieval_scores,
    )
    query_bundle = QueryBundle(state.query)

    # Step 1: pre-filter by similarity threshold
    sim_filter = SimilarityPostprocessor(similarity_cutoff=settings.rerank_min_score)
    filtered = sim_filter.postprocess_nodes(nodes, query_bundle)

    # Step 2: LLM-based clinical relevance scoring
    reranker = ClinicalRelevancePostprocessor(
        top_n=settings.rerank_top_k,
        min_score=settings.rerank_min_score,
    )
    reranked = reranker.postprocess_nodes(filtered, query_bundle)

    result = nodes_to_state(reranked)
    result["rerank_scores"] = [n.score or 0.0 for n in reranked]
    result["rerank_rationales"] = reranker.rationales
    return result


# ═══════════════════════════════════════════════════════════════════════════
# Node 4: Synthesize
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

CLINICAL_QA_TEMPLATE = PromptTemplate(
    SYNTHESIS_SYSTEM + "\n\n"
    "RETRIEVED CONTEXT:\n---------------------\n{context_str}\n---------------------\n\n"
    "QUERY: {query_str}\n"
    "Answer: "
)

_CITATION_RE = re.compile(
    r"(?:(?:Castelli|Millán|McLaughlin|Simental-Mendía|Forget|Hosten|De Ritis"
    r"|Giannini|Fest|Botros|Inker|Gonzalez-Chavez)[^.]*\.)"
)


def synthesize(state: GraphState) -> dict[str, Any]:
    """Generate response via LlamaIndex ResponseSynthesizer with clinical prompt."""
    nodes = state_to_nodes(
        state.context_chunks, state.retrieval_sources, state.retrieval_scores,
    )

    # Prepend conversation history to query for context
    history_lines = []
    for msg in state.chat_history[-6:]:  # last 3 turns
        role = msg.get("role", "user")
        content = msg.get("content", "")
        history_lines.append(f"{role}: {content}")

    query_str = state.query
    if history_lines:
        history_block = "\n".join(history_lines)
        query_str = f"CONVERSATION HISTORY:\n{history_block}\n\nQUERY: {state.query}"

    synthesizer = get_response_synthesizer(
        response_mode=ResponseMode.COMPACT,
        text_qa_template=CLINICAL_QA_TEMPLATE,
    )
    response = synthesizer.synthesize(query_str, nodes=nodes)
    answer = str(response)

    citations = _CITATION_RE.findall(answer)

    return {
        "answer": answer,
        "citations": citations,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Node 5: Safety Guard
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
# Node 6: Resynthesize (guard self-correction)
# ═══════════════════════════════════════════════════════════════════════════

RESYNTHESIS_SYSTEM = """You are a clinical blood marker intelligence assistant.

Your previous response was flagged by the safety auditor for these issues: {issues}

Rewrite your response to fix ALL flagged issues:
- If DIAGNOSIS was flagged: remove any diagnostic language. Describe associations, don't diagnose.
- If PRESCRIPTION was flagged: remove any medication/dosage recommendations.
- If PHYSICIAN_REFERRAL was flagged: add a clear reminder to consult a physician.
- If HALLUCINATION was flagged: only state facts supported by the context.
- If PII_LEAKAGE was flagged: remove any personally identifiable information.

Keep the helpful clinical information from the original response, just fix the safety issues.

RULES:
1. Answer ONLY based on the provided context.
2. NEVER diagnose conditions — describe what the data shows and note associations.
3. NEVER prescribe treatments or specific medication dosages.
4. ALWAYS remind the user to consult their physician for medical decisions."""


def resynthesize(state: GraphState) -> dict[str, Any]:
    """Re-generate response addressing guard issues from the previous attempt."""
    issues_str = ", ".join(state.guard_issues)
    system = RESYNTHESIS_SYSTEM.format(issues=issues_str)

    # Build context block
    if state.context_chunks:
        context_block = "\n\n---\n\n".join(state.context_chunks)
        context_section = f"RETRIEVED CONTEXT:\n\n{context_block}"
    else:
        context_section = "RETRIEVED CONTEXT: No matching health data found."

    user_prompt = f"""{context_section}

ORIGINAL QUERY: {state.query}

PREVIOUS RESPONSE (flagged for {issues_str}):
{state.answer}

Rewrite the response to fix the safety issues while preserving useful clinical information."""

    answer = _llm_call(system, user_prompt, temperature=0.0)

    citations = re.findall(
        r"(?:(?:Castelli|Millán|McLaughlin|Simental-Mendía|Forget|Hosten|De Ritis|Giannini|Fest|Botros|Inker|Gonzalez-Chavez)[^.]*\.)",
        answer,
    )

    return {
        "answer": answer,
        "citations": citations,
        "guard_retries": state.guard_retries + 1,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Routing functions
# ═══════════════════════════════════════════════════════════════════════════

_INTENT_TO_NODE: dict[str, str] = {
    "markers": "retrieve_markers",
    "derived_ratios": "retrieve_derived_ratios",
    "trajectory": "retrieve_trajectory",
    "conditions": "retrieve_conditions",
    "medications": "retrieve_medications",
    "symptoms": "retrieve_symptoms",
    "appointments": "retrieve_appointments",
    "general_health": "retrieve_general_health",
    "safety_refusal": "refuse",
    "multi_intent": "retrieve_multi_intent",
}


def _route_to_retriever(state: GraphState) -> str:
    """Map intent to retriever node name."""
    return _INTENT_TO_NODE.get(state.intent, "retrieve_general_health")


def route_after_triage(state: GraphState) -> str:
    """Route after triage: re-triage if low confidence, else to appropriate retriever."""
    if (
        state.intent_confidence < CONFIDENCE_THRESHOLD
        and state.triage_attempts < state.triage_max_attempts
        and state.intent != "safety_refusal"
    ):
        return "re_triage"
    return _route_to_retriever(state)


def route_after_re_triage(state: GraphState) -> str:
    """Route after re-triage: always proceed to retriever (no infinite loops)."""
    return _route_to_retriever(state)


_MAX_GUARD_RETRIES = 1


def route_after_guard(state: GraphState) -> str:
    """Route after guard: end if passed, resynthesize if failed (up to 1 retry)."""
    if state.guard_passed:
        return END
    if state.guard_retries < _MAX_GUARD_RETRIES:
        return "resynthesize"
    return END


# ═══════════════════════════════════════════════════════════════════════════
# Graph assembly
# ═══════════════════════════════════════════════════════════════════════════


def build_graph() -> StateGraph:
    """Build and compile the clinical intelligence LangGraph with conditional routing.

    Topology:
      triage ─┬─[safety_refusal]─> refuse ─────────────────────────────> END
              ├─[low confidence]──> re_triage ─> retrieve_* ─┐
              └─[else]────────────> retrieve_* ──────────────┤
                                                              ├──> rerank ──> synthesize ──> guard ─┬─[passed]──> END
                                                              │                                     ├─[retry]───> resynthesize ─> guard
                                                              │                                     └─[exhausted]> END
                                                              └─────────────────────────────────────────────────────┘
    """
    graph = StateGraph(GraphState)

    # Nodes
    graph.add_node("triage", triage)
    graph.add_node("re_triage", re_triage)
    graph.add_node("refuse", refuse)
    graph.add_node("retrieve_markers", retrieve_markers)
    graph.add_node("retrieve_derived_ratios", retrieve_derived_ratios)
    graph.add_node("retrieve_trajectory", retrieve_trajectory)
    graph.add_node("retrieve_conditions", retrieve_conditions)
    graph.add_node("retrieve_medications", retrieve_medications)
    graph.add_node("retrieve_symptoms", retrieve_symptoms)
    graph.add_node("retrieve_appointments", retrieve_appointments)
    graph.add_node("retrieve_general_health", retrieve_general_health)
    graph.add_node("retrieve_multi_intent", retrieve_multi_intent)
    graph.add_node("rerank", rerank)
    graph.add_node("synthesize", synthesize)
    graph.add_node("guard", guard)
    graph.add_node("resynthesize", resynthesize)

    # Entry
    graph.set_entry_point("triage")

    # Conditional: triage -> re_triage OR refuse OR retrieve_*
    graph.add_conditional_edges("triage", route_after_triage)

    # Conditional: re_triage -> retrieve_* (never loops back to re_triage)
    graph.add_conditional_edges("re_triage", route_after_re_triage)

    # Refuse goes straight to END (skips retrieve, synthesize, guard)
    graph.add_edge("refuse", END)

    # All retrievers converge to rerank, then synthesize
    for retriever_name in RETRIEVER_NODE_NAMES:
        graph.add_edge(retriever_name, "rerank")

    graph.add_edge("rerank", "synthesize")
    graph.add_edge("synthesize", "guard")

    # Guard self-correction loop: passed → END, failed → resynthesize (max 1 retry)
    graph.add_conditional_edges("guard", route_after_guard)
    graph.add_edge("resynthesize", "guard")

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
