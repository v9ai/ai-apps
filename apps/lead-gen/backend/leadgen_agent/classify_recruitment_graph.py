"""Recruitment / staffing company classifier.

Single-node LLM graph: {name, website, description} in,
{is_recruitment, confidence, reasons} out.

Use when a lightweight, global verdict is enough — e.g. filtering inbound
discovery before running the heavier ``companies_verify`` graph (which fetches
the live site, embeds with BGE-M3, and writes to ``companies.category``).
This graph does not touch the database and does not fetch any URL.

True covers: recruitment agencies, staffing agencies, executive search /
headhunting, RPO providers, contract / contingent workforce specialists,
talent-marketplaces whose product is candidate placement.

False covers: software vendors with an ATS / HR-tech product, job boards
that only list third-party vacancies, in-house talent teams, generic
consultancies that happen to mention hiring.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import ClassifyRecruitmentState

SYSTEM_PROMPT = (
    "You are a strict B2B classifier. Decide whether a company's primary "
    "business is recruitment / staffing — i.e. placing candidates into roles "
    "at other employers in exchange for fees.\n\n"
    "Return TRUE for: recruitment agencies, staffing agencies, executive "
    "search / headhunting firms, RPO (recruitment process outsourcing) "
    "providers, contract / contingent workforce specialists, umbrella "
    "companies, locum agencies, and talent marketplaces whose core product "
    "is candidate placement.\n\n"
    "Return FALSE for: HR-tech / ATS / sourcing-tool SaaS vendors, generic "
    "job boards that only list third-party vacancies, in-house talent "
    "acquisition teams, freelancer marketplaces (Upwork-style), generic "
    "consultancies or product companies that simply mention hiring or "
    "career pages.\n\n"
    "Return STRICT JSON with this exact shape, no prose around it:\n"
    '{"is_recruitment": bool, "confidence": number_between_0_and_1, '
    '"reasons": [<=3 short strings]}'
)


async def classify(state: ClassifyRecruitmentState) -> dict[str, Any]:
    name = (state.get("name") or "").strip()
    website = (state.get("website") or "").strip()
    description = (state.get("description") or "").strip()

    if not (name or website or description):
        return {
            "is_recruitment": False,
            "confidence": 0.0,
            "reasons": ["missing input: need at least name, website, or description"],
        }

    user_content = (
        f"NAME: {name or '(unknown)'}\n"
        f"WEBSITE: {website or '(unknown)'}\n"
        f"DESCRIPTION: {description or '(no description available)'}"
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
            "is_recruitment": False,
            "confidence": 0.0,
            "reasons": [f"classifier error: {type(exc).__name__}: {str(exc)[:120]}"],
        }

    is_rec = bool(data.get("is_recruitment", False)) if isinstance(data, dict) else False
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
        "is_recruitment": is_rec,
        "confidence": confidence,
        "reasons": reasons,
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ClassifyRecruitmentState)
    builder.add_node("classify", classify)
    builder.add_edge(START, "classify")
    builder.add_edge("classify", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
