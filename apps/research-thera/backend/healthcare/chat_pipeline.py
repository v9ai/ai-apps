"""
LlamaIndex-only clinical intelligence chat pipeline.

Replaces the previous LangGraph ``graph.py`` with a pure LlamaIndex composition.
The public API — ``run_chat(query, user_id, chat_history)`` — is a drop-in
replacement for ``run_graph`` and returns the same dict keys so the
``chat_server.py`` response shape is preserved byte-for-byte.

Pipeline stages (no StateGraph, just composable async calls):

  1. triage         → plain ``llm_call`` that returns {intent, confidence, entities,
                      multi_intent, sub_intents, sub_queries}
  2. re_triage      → second ``llm_call`` invoked when confidence < 0.7
                      (max 2 total attempts)
  3. route          → map intent → ``build_retriever_for_intent(...)``, or fan-out
                      via ``CompositeRetriever`` for multi_intent, or short-circuit
                      to SAFETY_REFUSAL_RESPONSE for safety_refusal
  4. chat engine    → ``ContextChatEngine.from_defaults(...)`` with the per-intent
                      retriever + [SimilarityPostprocessor,
                      ClinicalRelevancePostprocessor] as node_postprocessors.
                      The chat engine combines retrieval + rerank + synthesis
                      (LlamaIndex CompactAndRefine) + conversation history.
  5. guard          → ``llm_call(GUARD_SYSTEM, ...)`` post-check; on failure,
                      resynthesize (max 1 retry) or append a safety disclaimer.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from llama_index.core.base.llms.types import ChatMessage, MessageRole
from llama_index.core.chat_engine import ContextChatEngine
from llama_index.core.postprocessor import SimilarityPostprocessor
from llama_index.core.prompts import PromptTemplate

from config import settings
from llm_backend import llm_call as _llm_call
from postprocessors import ClinicalRelevancePostprocessor
from retrievers import (
    CompositeRetriever,
    build_retriever_for_intent,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# Constants (kept in sync with the old graph.py so evals can import them)
# ═══════════════════════════════════════════════════════════════════════════

SINGLE_INTENTS = frozenset({
    "markers", "derived_ratios", "trajectory", "conditions", "medications",
    "symptoms", "appointments", "general_health", "safety_refusal",
})

CONFIDENCE_THRESHOLD = 0.7
_TRIAGE_MAX_ATTEMPTS = 2
_MAX_GUARD_RETRIES = 1


# ═══════════════════════════════════════════════════════════════════════════
# Prompts (verbatim copy from graph.py — behaviour must not drift)
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


# ContextChatEngine ships a context template of the form
# "<context>{context_str}</context>" — we wrap it in the clinical rules so the
# synthesis stage is identical to what graph.synthesize previously produced.
CLINICAL_CONTEXT_TEMPLATE = PromptTemplate(
    SYNTHESIS_SYSTEM + "\n\n"
    "RETRIEVED CONTEXT:\n---------------------\n{context_str}\n---------------------\n"
)


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


_CITATION_RE = re.compile(
    r"(?:(?:Castelli|Millán|McLaughlin|Simental-Mendía|Forget|Hosten|De Ritis"
    r"|Giannini|Fest|Botros|Inker|Gonzalez-Chavez)[^.]*\.)"
)


# ═══════════════════════════════════════════════════════════════════════════
# Stage 1/2: Triage + Re-triage
# ═══════════════════════════════════════════════════════════════════════════


def _parse_json(raw: str, default: dict) -> dict:
    cleaned = re.sub(r"```json\s*|\s*```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        logger.warning("JSON parse failed, using default: %s", raw)
        return default


def _triage(query: str) -> dict[str, Any]:
    """First-pass intent classification — mirrors graph.triage exactly."""
    raw = _llm_call(TRIAGE_SYSTEM, query)
    parsed = _parse_json(raw, {"intent": "general_health", "confidence": 0.5, "entities": []})

    intent = parsed.get("intent", "general_health")
    confidence = float(parsed.get("confidence", 0.5))
    entities = parsed.get("entities", []) or []
    is_multi = bool(parsed.get("multi_intent", False))
    sub_intents = parsed.get("sub_intents", []) or []
    sub_queries = parsed.get("sub_queries", []) or []

    if is_multi and len(sub_intents) >= 2:
        sub_intents = [
            si for si in sub_intents
            if si in SINGLE_INTENTS and si != "safety_refusal"
        ]
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
    }


def _re_triage(query: str, prev_intent: str, prev_conf: float, prev_entities: list[str]) -> dict[str, Any]:
    """Re-classify with disambiguation hints when first attempt had low confidence."""
    context_hint = f"Previous classification: {prev_intent} (confidence: {prev_conf})"
    prompt = f"{context_hint}\n\nOriginal query: {query}"
    raw = _llm_call(RE_TRIAGE_SYSTEM, prompt)
    parsed = _parse_json(raw, {"intent": "general_health", "confidence": 0.5, "entities": []})

    intent = parsed.get("intent", "general_health")
    if intent not in SINGLE_INTENTS:
        intent = "general_health"
    new_confidence = float(parsed.get("confidence", 0.5))

    # Use the higher-confidence result (same rule as the old re_triage node)
    if new_confidence > prev_conf:
        return {
            "intent": intent,
            "intent_confidence": new_confidence,
            "entities": parsed.get("entities", []) or prev_entities,
            "is_multi_intent": False,
            "sub_intents": [],
            "sub_queries": [],
        }
    return {
        "intent": prev_intent,
        "intent_confidence": prev_conf,
        "entities": prev_entities,
        "is_multi_intent": False,
        "sub_intents": [],
        "sub_queries": [],
    }


def _classify(query: str) -> dict[str, Any]:
    """Run triage and re-triage with the same confidence-threshold loop as the old graph."""
    attempt = _triage(query)
    # Re-triage only when low confidence on a non-safety-refusal, multi-intent not detected
    if (
        attempt["intent_confidence"] < CONFIDENCE_THRESHOLD
        and not attempt["is_multi_intent"]
        and attempt["intent"] != "safety_refusal"
    ):
        attempt = _re_triage(
            query,
            attempt["intent"],
            attempt["intent_confidence"],
            attempt["entities"],
        )
    return attempt


# ═══════════════════════════════════════════════════════════════════════════
# Stage 3: Route → retriever
# ═══════════════════════════════════════════════════════════════════════════


def _build_retriever(
    intent: str,
    user_id: str,
    confidence: float,
    query: str,
    entities: list[str],
    sub_intents: list[str],
):
    """Pick (or compose) the right LlamaIndex retriever for the classified intent."""
    if intent == "multi_intent" and sub_intents:
        sub_retrievers = []
        for sub_intent in sub_intents:
            if sub_intent in SINGLE_INTENTS and sub_intent != "safety_refusal":
                sub_retrievers.append(
                    build_retriever_for_intent(
                        sub_intent, user_id, confidence, query, entities,
                        k_scale=0.6,
                    )
                )
        if sub_retrievers:
            return CompositeRetriever(sub_retrievers)
        # Fall through to general_health if no valid sub-intents
        return build_retriever_for_intent(
            "general_health", user_id, confidence, query, entities,
        )

    return build_retriever_for_intent(
        intent, user_id, confidence, query, entities,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Stage 4: Chat engine (retrieve + rerank + synthesize + history)
# ═══════════════════════════════════════════════════════════════════════════


def _build_postprocessors() -> list:
    """Rerank stack: similarity filter + clinical LLM reranker. Matches old rerank() node."""
    if not settings.rerank_enabled:
        return []
    return [
        SimilarityPostprocessor(similarity_cutoff=settings.rerank_min_score),
        ClinicalRelevancePostprocessor(
            top_n=settings.rerank_top_k,
            min_score=settings.rerank_min_score,
        ),
    ]


def _to_chat_messages(chat_history: list[dict[str, str]]) -> list[ChatMessage]:
    out: list[ChatMessage] = []
    for msg in chat_history or []:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        chat_role = MessageRole.ASSISTANT if role == "assistant" else MessageRole.USER
        out.append(ChatMessage(role=chat_role, content=content))
    return out


def _synthesize(
    query: str,
    retriever,
    chat_history: list[dict[str, str]],
    postprocessors: list,
) -> tuple[str, list[str], list[str], list[float]]:
    """Retrieve → rerank → synthesize via LlamaIndex ContextChatEngine.

    Returns (answer, sources, chunks, rerank_scores).
    """
    # ``llm`` is resolved inside ``from_defaults`` from ``Settings.llm`` —
    # don't force-resolve it here so tests can patch ``from_defaults`` without
    # OpenAI credentials.
    engine = ContextChatEngine.from_defaults(
        retriever=retriever,
        node_postprocessors=postprocessors,
        system_prompt=SYNTHESIS_SYSTEM,
        context_template=CLINICAL_CONTEXT_TEMPLATE,
        chat_history=_to_chat_messages(chat_history),
    )
    response = engine.chat(query)
    answer = str(response)

    source_nodes = getattr(response, "source_nodes", []) or []
    chunks = [n.node.get_content() for n in source_nodes]
    sources = [n.node.metadata.get("source_table", "unknown") for n in source_nodes]
    rerank_scores = [float(n.score or 0.0) for n in source_nodes]

    return answer, sources, chunks, rerank_scores


# ═══════════════════════════════════════════════════════════════════════════
# Stage 5: Safety guard (no LlamaIndex equivalent — plain LLM audit)
# ═══════════════════════════════════════════════════════════════════════════


def _guard(query: str, answer: str, sources: list[str]) -> tuple[bool, list[str], str]:
    """Post-generation safety audit. Mirrors graph.guard exactly."""
    context_summary = (
        f"Context sources: {', '.join(sorted(set(sources)))}"
        if sources else "No context retrieved"
    )
    audit_prompt = f"""ORIGINAL QUERY: {query}

{context_summary}

ASSISTANT RESPONSE:
{answer}"""

    raw = _llm_call(GUARD_SYSTEM, audit_prompt)
    parsed = _parse_json(raw, {"passed": False, "issues": ["PARSE_FAILURE"]})

    passed = bool(parsed.get("passed", False))
    issues = list(parsed.get("issues", []))

    if passed:
        return True, issues, answer

    # Append safety disclaimers when guard flags known issue categories
    disclaimer_parts: list[str] = []
    if "DIAGNOSIS" in issues:
        disclaimer_parts.append(
            "Please note: the above information is for educational purposes only "
            "and should not be interpreted as a medical diagnosis."
        )
    if "PRESCRIPTION" in issues:
        disclaimer_parts.append("I cannot recommend specific medications or dosages.")
    if "PHYSICIAN_REFERRAL" in issues:
        disclaimer_parts.append(
            "Please consult your physician or healthcare professional before "
            "making any medical decisions based on this information."
        )

    if disclaimer_parts:
        final = answer + "\n\n⚠️ " + " ".join(disclaimer_parts)
    else:
        final = answer
    return False, issues, final


def _resynthesize(query: str, prev_answer: str, issues: list[str], chunks: list[str]) -> str:
    """Re-generate response addressing guard issues. Mirrors graph.resynthesize."""
    issues_str = ", ".join(issues)
    system = RESYNTHESIS_SYSTEM.format(issues=issues_str)

    if chunks:
        context_block = "\n\n---\n\n".join(chunks)
        context_section = f"RETRIEVED CONTEXT:\n\n{context_block}"
    else:
        context_section = "RETRIEVED CONTEXT: No matching health data found."

    user_prompt = f"""{context_section}

ORIGINAL QUERY: {query}

PREVIOUS RESPONSE (flagged for {issues_str}):
{prev_answer}

Rewrite the response to fix the safety issues while preserving useful clinical information."""

    return _llm_call(system, user_prompt, temperature=0.0)


# ═══════════════════════════════════════════════════════════════════════════
# Public API — drop-in replacement for graph.run_graph
# ═══════════════════════════════════════════════════════════════════════════


async def run_chat(
    query: str,
    user_id: str,
    chat_history: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    """Execute the LlamaIndex clinical chat pipeline.

    Returns the same dict keys as the old ``run_graph`` so the /chat response
    shape is preserved.
    """
    chat_history = chat_history or []

    # 1. Triage (+ re-triage on low confidence)
    triage_result = _classify(query)
    intent = triage_result["intent"]
    confidence = triage_result["intent_confidence"]
    entities = triage_result["entities"]
    sub_intents = triage_result["sub_intents"]

    # 2. Safety refusal short-circuits retrieval, synthesis, and guard
    if intent == "safety_refusal":
        return {
            "final_answer": SAFETY_REFUSAL_RESPONSE,
            "answer": SAFETY_REFUSAL_RESPONSE,
            "intent": intent,
            "intent_confidence": confidence,
            "retrieval_sources": [],
            "rerank_scores": [],
            "guard_passed": True,
            "guard_issues": [],
            "citations": [],
        }

    # 3. Build retriever for the classified intent (or fan out for multi_intent)
    retriever = _build_retriever(
        intent=intent,
        user_id=user_id,
        confidence=confidence,
        query=query,
        entities=entities,
        sub_intents=sub_intents,
    )

    # 4. Retrieve → rerank → synthesize via ContextChatEngine
    postprocessors = _build_postprocessors()
    answer, sources, chunks, rerank_scores = _synthesize(
        query, retriever, chat_history, postprocessors,
    )

    # 5. Safety guard (+ one retry via resynthesis if it fails)
    passed, issues, final_answer = _guard(query, answer, sources)
    if not passed and issues and "PARSE_FAILURE" not in issues:
        # Only resynthesize when there are addressable issues; leave PARSE_FAILURE
        # to fall through with the disclaimer/answer we already built.
        try:
            new_answer = _resynthesize(query, answer, issues, chunks)
            passed, issues, final_answer = _guard(query, new_answer, sources)
            answer = new_answer
        except Exception:
            logger.exception("Resynthesis failed, keeping disclaimer-wrapped answer")

    citations = _CITATION_RE.findall(answer)

    return {
        "final_answer": final_answer,
        "answer": answer,
        "intent": intent,
        "intent_confidence": confidence,
        "retrieval_sources": sources,
        "rerank_scores": rerank_scores,
        "guard_passed": passed,
        "guard_issues": issues,
        "citations": citations,
    }
