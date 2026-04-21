"""Contact-scoring graph.

Single-node pipeline: serialize a contact profile (or accept pre-serialized text),
POST to the sibling Worker route ``/score_contact`` which fronts Cloudflare
Workers AI with a Llama-3.1-8B-Instruct LoRA, then return structured tier JSON.

Input: {profile: str} OR {contact_id: int}. Output: {tier, score, reasons}.

The graph lives in the same container as the other 5 LangGraph graphs, but the
actual LoRA inference runs on Workers AI (not in-container), so this node is
just the glue: profile text in, structured JSON out.
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .state import ScoreContactState

WORKER_URL_DEFAULT = "https://lead-gen-langgraph.eeeew.workers.dev"


def _worker_base_url() -> str:
    return os.environ.get("WORKER_BASE_URL", WORKER_URL_DEFAULT).rstrip("/")


def _auth_header() -> dict[str, str]:
    token = os.environ.get("LANGGRAPH_AUTH_TOKEN", "").strip()
    return {"authorization": f"Bearer {token}"} if token else {}


def _load_profile(contact_id: int) -> str:
    """Read a contact from Neon and serialize to the ~300-token profile format.

    Only pulls columns the LoRA was trained on. Kept read-only; DSN comes from
    the same NEON_DATABASE_URL env var ``admin_chat_graph`` uses.
    """
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        raise RuntimeError("NEON_DATABASE_URL not set — cannot load contact profile.")
    sql = """
        SELECT c.first_name, c.last_name, c.position, c.linkedin_url, c.github_handle,
               c.seniority, c.department, c.is_decision_maker, c.authority_score,
               c.ai_profile, co.name AS company_name, co.website AS company_website,
               co.description AS company_description, co.employee_count, co.stage
        FROM contacts c
        LEFT JOIN companies co ON co.id = c.company_id
        WHERE c.id = %s
        LIMIT 1
    """
    with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
        with conn.cursor() as cur:
            cur.execute(sql, (contact_id,))
            row = cur.fetchone()
            if not row:
                raise RuntimeError(f"contact id {contact_id} not found")
            cols = [d[0] for d in cur.description or []]
    rec = dict(zip(cols, row))

    ai_profile: dict[str, Any] = {}
    raw_ai = rec.get("ai_profile")
    if isinstance(raw_ai, str) and raw_ai:
        try:
            ai_profile = json.loads(raw_ai)
        except json.JSONDecodeError:
            ai_profile = {}

    lines = [
        f"NAME: {rec.get('first_name', '')} {rec.get('last_name', '')}".strip(),
        f"TITLE: {rec.get('position') or 'unknown'}",
        f"COMPANY: {rec.get('company_name') or 'unknown'}"
        + (f" ({rec.get('stage')})" if rec.get("stage") else "")
        + (f", {rec.get('employee_count')} employees" if rec.get("employee_count") else ""),
    ]
    if rec.get("company_description"):
        lines.append(f"COMPANY_DESC: {rec['company_description'][:240]}")
    if rec.get("linkedin_url"):
        lines.append(f"LINKEDIN: {rec['linkedin_url']}")
    if rec.get("github_handle"):
        lines.append(f"GITHUB: {rec['github_handle']}")
    if ai_profile.get("linkedinHeadline"):
        lines.append(f"HEADLINE: {ai_profile['linkedinHeadline']}")
    if ai_profile.get("linkedinBio"):
        lines.append(f"BIO: {ai_profile['linkedinBio'][:400]}")
    if ai_profile.get("skills"):
        lines.append("SKILLS: " + ", ".join(ai_profile["skills"][:12]))
    if ai_profile.get("experienceLevel"):
        lines.append(f"EXPERIENCE_LEVEL: {ai_profile['experienceLevel']}")
    if rec.get("seniority"):
        lines.append(f"SENIORITY: {rec['seniority']}")
    if rec.get("department"):
        lines.append(f"DEPARTMENT: {rec['department']}")
    if rec.get("authority_score") is not None:
        lines.append(f"AUTHORITY_SCORE: {rec['authority_score']:.2f}")
    return "\n".join(lines)


async def score(state: ScoreContactState) -> dict:
    profile = (state.get("profile") or "").strip()
    if not profile:
        contact_id = state.get("contact_id")
        if contact_id is None:
            return {"tier": "D", "score": 0.0, "reasons": ["no profile or contact_id provided"]}
        profile = _load_profile(int(contact_id))

    url = f"{_worker_base_url()}/score_contact"
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url,
            json={"profile": profile},
            headers={"content-type": "application/json", **_auth_header()},
        )
    if resp.status_code != 200:
        return {
            "tier": "D",
            "score": 0.0,
            "reasons": [f"worker /score_contact returned {resp.status_code}: {resp.text[:200]}"],
        }
    data = resp.json()
    tier = str(data.get("tier", "D")).upper()
    if tier not in {"A", "B", "C", "D"}:
        tier = "D"
    try:
        score_val = float(data.get("score", 0.0))
    except (TypeError, ValueError):
        score_val = 0.0
    reasons_raw = data.get("reasons") or []
    reasons = [str(r) for r in reasons_raw if isinstance(r, (str, int, float))][:5]
    return {"tier": tier, "score": score_val, "reasons": reasons}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ScoreContactState)
    builder.add_node("score", score)
    builder.add_edge(START, "score")
    builder.add_edge("score", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
