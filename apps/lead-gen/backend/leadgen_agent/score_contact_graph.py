"""Contact-scoring graph.

Single-node pipeline: serialize a contact profile (or accept pre-serialized text),
POST to the HF Space at ``/score`` which loads a Qwen2.5-1.5B LoRA (merged,
quantized to Q4_K_M GGUF) via llama-cpp-python, then return structured tier JSON.

Input: {profile: str} OR {contact_id: int}. Output: {tier, score, reasons}.

The graph lives in the Cloudflare Container alongside the other 5 LangGraph
graphs; LoRA inference runs on the free-tier HF Space at
``https://v9ai-contact-score-server.hf.space`` (not in-container, not on
Workers AI). This node is just the glue: profile text in, structured JSON out.

Cold start on the free Space is ~30-60s after idle, so httpx timeout is
generous (90s). Steady-state responses are a few seconds.
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx
import psycopg
from langgraph.graph import END, START, StateGraph

from .state import ScoreContactState

SPACE_URL_DEFAULT = "https://v9ai-contact-score-server.hf.space"


def _space_base_url() -> str:
    # HF_SPACE_URL is the new knob; WORKER_BASE_URL is kept as a legacy fallback
    # so existing prod env vars keep routing correctly during cutover.
    return os.environ.get(
        "HF_SPACE_URL",
        os.environ.get("WORKER_BASE_URL", SPACE_URL_DEFAULT),
    ).rstrip("/")


def _auth_header() -> dict[str, str]:
    """Optional bearer for the HF Space. Public Space = empty token = no header."""
    token = os.environ.get("HF_SPACE_TOKEN", "").strip()
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
               c.profile, co.name AS company_name, co.website AS company_website,
               co.description AS company_description, co.size AS company_size
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

    profile: dict[str, Any] = {}
    raw_profile = rec.get("profile")
    if isinstance(raw_profile, str) and raw_profile:
        try:
            profile = json.loads(raw_profile)
        except json.JSONDecodeError:
            profile = {}

    lines = [
        f"NAME: {rec.get('first_name', '')} {rec.get('last_name', '')}".strip(),
        f"TITLE: {rec.get('position') or 'unknown'}",
        f"COMPANY: {rec.get('company_name') or 'unknown'}"
        + (f", {rec.get('company_size')} employees" if rec.get("company_size") else ""),
    ]
    if rec.get("company_description"):
        lines.append(f"COMPANY_DESC: {rec['company_description'][:240]}")
    if rec.get("linkedin_url"):
        lines.append(f"LINKEDIN: {rec['linkedin_url']}")
    if rec.get("github_handle"):
        lines.append(f"GITHUB: {rec['github_handle']}")
    if profile.get("linkedinHeadline"):
        lines.append(f"HEADLINE: {profile['linkedinHeadline']}")
    if profile.get("linkedinBio"):
        lines.append(f"BIO: {profile['linkedinBio'][:400]}")
    if profile.get("skills"):
        lines.append("SKILLS: " + ", ".join(profile["skills"][:12]))
    if profile.get("experienceLevel"):
        lines.append(f"EXPERIENCE_LEVEL: {profile['experienceLevel']}")
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

    url = f"{_space_base_url()}/score"
    # Timeout covers HF Space cold start (~30-60s). Warm calls return in a few
    # seconds; batch callers should expect the first request to pay the tax.
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            url,
            json={"profile": profile},
            headers={"content-type": "application/json", **_auth_header()},
        )
    if resp.status_code != 200:
        return {
            "tier": "D",
            "score": 0.0,
            "reasons": [f"space /score returned {resp.status_code}: {resp.text[:200]}"],
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
