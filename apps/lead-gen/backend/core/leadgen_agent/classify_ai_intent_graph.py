"""Contact AI hiring/buying intent classifier — heuristic, no LLM (yet).

Multi-node ``StateGraph`` that scores a contact's recent LinkedIn posts for
demand signals around AI/ML — hiring AI/ML engineers, scaling an AI team, or
evaluating AI tools/vendors. Used to prioritize outreach by an actual demand
signal instead of relying on title alone.

Pipeline::

    START
      └─→ validate ──(empty posts? → END)
                     (else)
           └─→ extract_signals ──→ score_intent ──→ format_reasons ──→ END

Each node is a ``langchain_core.runnables.RunnableLambda`` so the eventual
LLM swap-in is a one-node change: replace the body of ``_score_intent`` with
an ``ainvoke_json`` call (see TODO(ai-intent-llm) marker below) and the rest
of the graph stays untouched.

This module deliberately does **not** import ``make_llm`` or ``ainvoke_json``
yet — the heuristic body is pure Python and produces zero outbound traffic.
"""

from __future__ import annotations

import re
from typing import Any

from langchain_core.runnables import RunnableLambda
from langgraph.graph import END, START, StateGraph

from .state import ClassifyAiIntentState

MAX_POSTS = 10
MAX_POST_CHARS = 600
SNIPPET_CHARS = 80
ALLOWED_INTENT_KINDS = {"hiring", "buying", "scaling", "none"}

# ── Keyword catalogs ─────────────────────────────────────────────────────────
#
# Lowercased; matched case-insensitively against the post body. Order matters
# only for reason citation (first match wins per category, per post).

AI_KEYWORDS: tuple[str, ...] = (
    "applied ai",
    "machine learning",
    "deep learning",
    "fine-tune",
    "fine tuning",
    "transformer",
    "neural",
    "mlops",
    "genai",
    "agents",
    "agent",
    "embedding",
    "vector",
    "rag",
    "llm",
    "gpt",
    "claude",
    "gemini",
    "ml/ai",
    "ai/ml",
    " ai ",
    " ml ",
)

HIRING_KEYWORDS: tuple[str, ...] = (
    "we're hiring",
    "we are hiring",
    "now hiring",
    "join our team",
    "open role",
    "open position",
    "open positions",
    "looking for",
    "recruiting",
    "apply now",
    "dm me",
    "ml engineer",
    "ai engineer",
    "data scientist",
    "research scientist",
    "applied scientist",
    "mle",
    "hiring",
)

BUYING_KEYWORDS: tuple[str, ...] = (
    "evaluating",
    "comparing",
    "considering",
    "looking at",
    "rfp",
    "vendor",
    "procuring",
    "migrating to",
    "trial",
    "poc ",
    "demo",
    "budget",
    "langchain",
    "llamaindex",
    "pinecone",
    "weaviate",
    "qdrant",
    "openai api",
    "anthropic",
    " vs ",
)


def _find_matches(haystack_lower: str, needles: tuple[str, ...]) -> list[str]:
    """Return the matching needles found in haystack_lower, in catalog order.
    Padded-space needles like ' ai ' rely on the caller surrounding the post
    body with single spaces — see _scan_post."""
    return [n.strip() for n in needles if n in haystack_lower]


def _scan_post(idx: int, body: str) -> dict[str, Any]:
    truncated = body[:MAX_POST_CHARS]
    # Pad with spaces so word-boundary needles like ' ai ' don't miss
    # head/tail occurrences. Lowercase once.
    padded = f" {truncated.lower()} "
    ai = _find_matches(padded, AI_KEYWORDS)
    hiring = _find_matches(padded, HIRING_KEYWORDS)
    buying = _find_matches(padded, BUYING_KEYWORDS)
    snippet = re.sub(r"\s+", " ", truncated[:SNIPPET_CHARS]).strip()
    return {
        "idx": idx,
        "ai": ai,
        "hiring": hiring,
        "buying": buying,
        "snippet": snippet,
        "qualifies": bool(ai) and (bool(hiring) or bool(buying)),
    }


# ── Nodes ────────────────────────────────────────────────────────────────────


def _validate(state: ClassifyAiIntentState) -> dict[str, Any]:
    """Short-circuit when there are no posts. Conditional edge after this
    node routes empty-posts states straight to END."""
    contact_id = state.get("contact_id")
    posts_raw = state.get("posts") or []
    posts = [p.strip() for p in posts_raw if isinstance(p, str) and p.strip()]
    if not posts:
        out: dict[str, Any] = {
            "has_ai_intent": False,
            "intent_kind": "none",
            "confidence": 0.0,
            "reasons": ["no posts provided"],
        }
        if contact_id is not None:
            out["contact_id"] = contact_id
        return out
    # Cap to MAX_POSTS up front so downstream nodes work on a stable list.
    return {"posts": posts[:MAX_POSTS]}


def _extract_signals(state: ClassifyAiIntentState) -> dict[str, Any]:
    posts = state.get("posts") or []
    per_post = [_scan_post(i, body) for i, body in enumerate(posts)]
    return {"signals": {"per_post": per_post}}


# TODO(ai-intent-llm): when DeepSeek (or another provider) is approved, replace
# the body of _score_intent below with:
#
#     from .llm import ainvoke_json, make_llm
#     llm = make_llm(temperature=0.0)
#     verdict = await ainvoke_json(llm, [...prompt built from state["signals"]...])
#
# The rest of the graph (validate, extract_signals, format_reasons) stays.
def _score_intent(state: ClassifyAiIntentState) -> dict[str, Any]:
    per_post = (state.get("signals") or {}).get("per_post") or []
    qualifying = [p for p in per_post if p.get("qualifies")]

    if not qualifying:
        return {
            "has_ai_intent": False,
            "intent_kind": "none",
            "confidence": 0.0,
        }

    any_hiring = any(p.get("hiring") for p in qualifying)
    any_buying = any(p.get("buying") for p in qualifying)
    if any_hiring and any_buying:
        intent_kind = "scaling"
    elif any_hiring:
        intent_kind = "hiring"
    elif any_buying:
        intent_kind = "buying"
    else:  # pragma: no cover — _scan_post.qualifies guarantees one of the two
        intent_kind = "none"

    confidence = max(0.0, min(1.0, len(qualifying) / 3.0))

    return {
        "has_ai_intent": True,
        "intent_kind": intent_kind,
        "confidence": round(confidence, 3),
    }


def _format_reasons(state: ClassifyAiIntentState) -> dict[str, Any]:
    per_post = (state.get("signals") or {}).get("per_post") or []
    qualifying = [p for p in per_post if p.get("qualifies")]
    qualifying.sort(key=lambda p: p["idx"])

    reasons: list[str] = []
    for p in qualifying[:3]:
        parts: list[str] = []
        if p.get("hiring"):
            parts.append(f"hiring={p['hiring'][:3]}")
        if p.get("buying"):
            parts.append(f"buying={p['buying'][:3]}")
        signals_str = " ".join(parts)
        reasons.append(f"[{p['idx'] + 1}] {p['snippet']} :: {signals_str}".strip())

    out: dict[str, Any] = {"reasons": reasons}
    contact_id = state.get("contact_id")
    if contact_id is not None:
        out["contact_id"] = contact_id
    return out


# ── Graph wiring ─────────────────────────────────────────────────────────────


def _route_after_validate(state: ClassifyAiIntentState) -> str:
    return "skip" if not state.get("posts") else "go"


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ClassifyAiIntentState)
    builder.add_node("validate", RunnableLambda(_validate))
    builder.add_node("extract_signals", RunnableLambda(_extract_signals))
    builder.add_node("score_intent", RunnableLambda(_score_intent))
    builder.add_node("format_reasons", RunnableLambda(_format_reasons))

    builder.add_edge(START, "validate")
    builder.add_conditional_edges(
        "validate",
        _route_after_validate,
        {"skip": END, "go": "extract_signals"},
    )
    builder.add_edge("extract_signals", "score_intent")
    builder.add_edge("score_intent", "format_reasons")
    builder.add_edge("format_reasons", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
