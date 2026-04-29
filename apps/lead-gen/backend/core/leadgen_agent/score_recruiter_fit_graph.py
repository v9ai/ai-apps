"""Ideal-recruiter fit scorer for an individual recruiter contact.

Single-node LLM graph: {name, headline, employer, about, recent_posts} in,
{fit_score, tier, specialty, remote_global, reasons} out.

Purpose: rank recruiter contacts by how useful they are for a *fully remote,
global AI engineering* job hunt. Companion to ``classify_recruitment_graph``
(which decides if a *company* is a recruitment agency at all) — this graph
goes one level deeper and scores the *individual* recruiter's relevance.

Rubric (encoded in the system prompt, weights sum to 1.0):

    AI/ML specialization                0.30
    Engineering-IC seniority focus      0.25
    Global-remote placements            0.20
    Active hiring signal                0.15
    Network quality (employer)          0.10

Tier mapping: >=0.75 ideal, >=0.55 strong, >=0.30 weak, <0.30 off_target.

This graph does not touch the database and does not fetch any URL.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import ScoreRecruiterFitState

MAX_POSTS = 5
MAX_POST_CHARS = 500
MAX_ABOUT_CHARS = 1500
ALLOWED_TIERS = {"ideal", "strong", "weak", "off_target"}
ALLOWED_SPECIALTIES = {"ai_ml", "engineering_general", "non_technical", "unknown"}

SYSTEM_PROMPT = (
    "You score an individual recruiter against an 'ideal recruiter' rubric for "
    "a senior AI/ML engineer searching for a fully remote, global IC role. "
    "You are NOT scoring whether they are a recruiter at all — assume yes. "
    "You are scoring how *useful* they are for this specific job hunt.\n\n"
    "Score five weighted dimensions, then aggregate to a single fit_score in "
    "[0,1]:\n"
    "  • AI/ML specialization (0.30): headline/about explicitly names ML, AI, "
    "applied science, MLE, research engineering — not generic 'tech' or "
    "'software'.\n"
    "  • Engineering-IC seniority focus (0.25): places senior ICs / staff / "
    "principal / lead engineers — not graduate, exec-only, or sales/marketing.\n"
    "  • Global-remote placements (0.20): roles described as remote, "
    "distributed, worldwide, EMEA-friendly, async. Penalize US-only on-site.\n"
    "  • Active hiring signal (0.15): recent_posts list open roles, 'we're "
    "hiring', live mandates. Penalize empty / inactive feeds.\n"
    "  • Network quality (0.10): employer is a reputable AI-focused staffing "
    "or executive search firm, not a no-name lifestyle agency.\n\n"
    "Tier mapping (apply consistently): fit_score >= 0.75 → 'ideal', "
    ">= 0.55 → 'strong', >= 0.30 → 'weak', < 0.30 → 'off_target'.\n\n"
    "specialty values: 'ai_ml' | 'engineering_general' | 'non_technical' | "
    "'unknown'.\n"
    "remote_global: true if recruiter explicitly places remote/global; false "
    "if explicitly geo-locked on-site; null if unclear.\n\n"
    "Return STRICT JSON with this exact shape, no prose around it:\n"
    '{"fit_score": number_between_0_and_1, '
    '"tier": "ideal"|"strong"|"weak"|"off_target", '
    '"specialty": "ai_ml"|"engineering_general"|"non_technical"|"unknown", '
    '"remote_global": true|false|null, '
    '"reasons": [<=3 short strings citing the strongest evidence]}'
)


def _truncate(text: str, limit: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


def _tier_from_score(score: float) -> str:
    if score >= 0.75:
        return "ideal"
    if score >= 0.55:
        return "strong"
    if score >= 0.30:
        return "weak"
    return "off_target"


async def score(state: ScoreRecruiterFitState) -> dict[str, Any]:
    contact_id = state.get("contact_id")
    name = (state.get("name") or "").strip()
    headline = (state.get("headline") or "").strip()
    employer = (state.get("employer") or "").strip()
    about = _truncate(state.get("about") or "", MAX_ABOUT_CHARS)
    posts_raw = state.get("recent_posts") or []
    posts = [
        _truncate(p, MAX_POST_CHARS)
        for p in posts_raw
        if isinstance(p, str) and p.strip()
    ][:MAX_POSTS]

    if not (name or headline or employer or about or posts):
        out: dict[str, Any] = {
            "fit_score": 0.0,
            "tier": "off_target",
            "specialty": "unknown",
            "remote_global": None,
            "reasons": ["missing input: need at least name, headline, employer, about, or recent_posts"],
        }
        if contact_id is not None:
            out["contact_id"] = contact_id
        return out

    posts_block = "\n".join(f"  - {p}" for p in posts) if posts else "  (none provided)"
    user_content = (
        f"NAME: {name or '(unknown)'}\n"
        f"HEADLINE: {headline or '(unknown)'}\n"
        f"EMPLOYER: {employer or '(unknown)'}\n"
        f"ABOUT:\n{about or '(no about/bio available)'}\n"
        f"RECENT_POSTS:\n{posts_block}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        llm = make_llm(temperature=0.0)
        data = await ainvoke_json(llm, messages)
    except Exception as exc:  # noqa: BLE001 — surface any failure as off_target + reason
        out = {
            "fit_score": 0.0,
            "tier": "off_target",
            "specialty": "unknown",
            "remote_global": None,
            "reasons": [f"scorer error: {type(exc).__name__}: {str(exc)[:120]}"],
        }
        if contact_id is not None:
            out["contact_id"] = contact_id
        return out

    if not isinstance(data, dict):
        data = {}

    try:
        fit_score = float(data.get("fit_score", 0.0))
    except (TypeError, ValueError):
        fit_score = 0.0
    fit_score = max(0.0, min(1.0, fit_score))

    tier_raw = data.get("tier")
    tier = tier_raw if isinstance(tier_raw, str) and tier_raw in ALLOWED_TIERS else _tier_from_score(fit_score)

    specialty_raw = data.get("specialty")
    specialty = specialty_raw if isinstance(specialty_raw, str) and specialty_raw in ALLOWED_SPECIALTIES else "unknown"

    remote_raw = data.get("remote_global")
    if isinstance(remote_raw, bool):
        remote_global: bool | None = remote_raw
    else:
        remote_global = None

    reasons_raw = data.get("reasons")
    if not isinstance(reasons_raw, list):
        reasons_raw = []
    reasons = [str(r) for r in reasons_raw if isinstance(r, (str, int, float))][:3]

    out = {
        "fit_score": round(fit_score, 3),
        "tier": tier,
        "specialty": specialty,
        "remote_global": remote_global,
        "reasons": reasons,
    }
    if contact_id is not None:
        out["contact_id"] = contact_id
    return out


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ScoreRecruiterFitState)
    builder.add_node("score", score)
    builder.add_edge(START, "score")
    builder.add_edge("score", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
