"""Paper sales/lead-gen relevance classifier.

Single-node graph: {title, abstract} in, {is_sales_leadgen, confidence, reasons} out.
Used by scripts/classify-paper-contacts.ts to verify that papers attributed to
`tag:papers` contacts (imported from the 2025–2026 sales/lead-gen corpus) are
actually on-topic — the seed queries pulled in some off-topic co-author papers.

Uses the shared `make_llm()` + `ainvoke_json()` helpers (DeepSeek by default).
On any parse/network failure, returns a conservative off-topic verdict with
an error reason, following the defensive pattern in score_contact_graph.py.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import ClassifyPaperState

SYSTEM_PROMPT = (
    "You are a strict classifier. Decide whether an academic paper is directly "
    "about B2B sales, lead generation, outbound sales, sales development, sales "
    "enablement, CRM, account-based marketing, or related commercial pipeline "
    "topics.\n\n"
    "Out-of-scope examples (return false): generic NLP/ML, recommender systems "
    "without a sales framing, pure information retrieval, consumer marketing, "
    "behavioral economics without a sales application, generic time-series.\n\n"
    "Return STRICT JSON with this exact shape, no prose around it:\n"
    '{"is_sales_leadgen": bool, "confidence": number_between_0_and_1, '
    '"reasons": [<=3 short strings]}'
)


async def classify(state: ClassifyPaperState) -> dict[str, Any]:
    title = (state.get("title") or "").strip()
    abstract = (state.get("abstract") or "").strip()
    if not title:
        return {
            "is_sales_leadgen": False,
            "confidence": 0.0,
            "reasons": ["missing title"],
        }

    user_content = (
        f"TITLE: {title}\n"
        f"ABSTRACT: {abstract if abstract else '(no abstract available)'}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        llm = make_llm(temperature=0.0)
        data = await ainvoke_json(llm, messages)
    except Exception as exc:  # noqa: BLE001 — surface any failure as off-topic + reason
        return {
            "is_sales_leadgen": False,
            "confidence": 0.0,
            "reasons": [f"classifier error: {type(exc).__name__}: {str(exc)[:120]}"],
        }

    is_leadgen = bool(data.get("is_sales_leadgen", False)) if isinstance(data, dict) else False
    try:
        confidence = float(data.get("confidence", 0.0)) if isinstance(data, dict) else 0.0
    except (TypeError, ValueError):
        confidence = 0.0
    confidence = max(0.0, min(1.0, confidence))

    reasons_raw = data.get("reasons") if isinstance(data, dict) else None
    if not isinstance(reasons_raw, list):
        reasons_raw = []
    reasons = [str(r) for r in reasons_raw if isinstance(r, (str, int, float))][:3]

    return {
        "is_sales_leadgen": is_leadgen,
        "confidence": confidence,
        "reasons": reasons,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ClassifyPaperState)
    builder.add_node("classify", classify)
    builder.add_edge(START, "classify")
    builder.add_edge("classify", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
