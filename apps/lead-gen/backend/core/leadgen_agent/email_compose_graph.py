"""Email composition graph: gather_context → draft → refine.

Two-pass composer for cold outreach, batch sends, and the GraphQL
``composeOutreach`` mutation.

Pass 1 (``draft``) produces a candidate ``{subject, body}`` from the
LinkedIn / instructions context. Pass 2 (``refine``) polishes it: strips
AI-marker phrases, enforces a tight opening, tightens the subject line,
and preserves the ``{{name}}`` placeholder + ``Thanks,\\nVadim`` signature.
On a second parse failure the refine node falls back to the draft so the
graph never returns nothing.

State (see ``EmailComposeState`` in ``state.py``) carries both the draft
and the final, plus per-node telemetry — the API route reads
``draft_subject``/``draft_body``/``subject``/``body``/``prompt_tokens``/
``completion_tokens``/``model``/``prompt_version`` to persist into
``contact_emails`` (migration 0078).
"""

from __future__ import annotations

import json
import logging
from typing import Any

from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field, ValidationError

from .llm import (
    ainvoke_json_with_telemetry,
    deepseek_model_name,
    make_llm,
    merge_node_telemetry,
)
from .state import EmailComposeState

log = logging.getLogger(__name__)

PROMPT_VERSION = "compose-v1-2026-04"

# AI-marker phrases that the refine pass MUST strip. Keep this list aligned
# with the regex sweep in src/lib/email/anti-pattern.ts (TS side) so both
# code paths catch the same set.
AI_MARKERS = (
    "I hope this finds you well",
    "I hope this email finds you well",
    "Just wanted to reach out",
    "I came across your",
    "I wanted to reach out",
    "I hope you are doing well",
    "I trust this email finds you",
)

DRAFT_SYSTEM_PROMPT = """You are a B2B sales writer composing a single outbound email. Output strict JSON only.

PRIMARY GOAL (most important — the entire email must serve this):
Honor the user's instructions field verbatim in intent. If instructions mention "applied", "follow-up", "no response" → write a follow-up email. Otherwise write cold outreach.

SENDER BACKGROUND (use selectively — highlight ONLY skills that overlap with the recipient's domain):
- Vadim Nicolai, Senior Software Engineer, 10+ years experience
- Frontend: React, TypeScript, Next.js, Tailwind CSS
- AI/ML: LLM integration, RAG pipelines, AI SDK, prompt engineering, LangChain
- Backend: Node.js, GraphQL, REST APIs, PostgreSQL, SQLite
- Systems: Rust, WebAssembly, Cloudflare Workers
- Infrastructure: Docker, CI/CD, Vercel, Cloudflare
- Seeking: fully remote engineering roles worldwide

ANTI-PATTERN RULES (violations will be rejected by the refine pass):
- NEVER echo raw instructions verbatim — interpret and rephrase.
- NEVER include notification counts, status labels, or UI artifacts.
- NEVER list skills that don't overlap with the recipient's domain.
- NEVER fabricate recipient details, certifications, or experience the sender doesn't have.
- NEVER open with "I hope this finds you well", "Just wanted to reach out", "I came across your".

EMAIL TEMPLATE RULES:
1. Open with "Hey {{name}}," — the {{name}} placeholder is required.
2. 100-180 words MAX.
3. One clear CTA.
4. End with "Thanks,\\nVadim".

Respond ONLY with valid JSON: {"subject": "...", "body": "..."}"""

REFINE_SYSTEM_PROMPT = """You are an editor polishing a draft B2B outbound email. Output strict JSON only.

REFINE RULES (apply all):
1. Strip AI-marker phrases — rewrite any opening containing: "I hope this finds you well", "Just wanted to reach out", "I came across your", "I wanted to reach out", "I hope you are doing well".
2. The opening paragraph MUST be ≤ 3 sentences.
3. Subject line MUST be ≤ 50 characters and concrete (no generic "Quick chat" / "Following up" alone — anchor on the recipient's domain).
4. Preserve the {{name}} placeholder exactly. Do NOT replace with a literal name.
5. Preserve the "Thanks,\\nVadim" signature exactly.
6. Keep the email's intent and CTA intact — don't change what's being asked.
7. Cut filler phrases ("I'd love to", "I just wanted to", "I was wondering if"). Be direct.

Respond ONLY with valid JSON: {"subject": "...", "body": "..."}"""


class RefineOutput(BaseModel):
    subject: str = Field(min_length=3, max_length=70)
    body: str = Field(min_length=20)


def _ai_markers_present(text: str) -> list[str]:
    """Return the list of AI-marker phrases still present in ``text``.

    Used by the refine retry loop — if any marker is still present after
    pass 2, we retry once with the offending phrases called out explicitly.
    """
    lower = text.lower()
    return [m for m in AI_MARKERS if m.lower() in lower]


async def gather_context(state: EmailComposeState) -> dict:
    recipient = state.get("recipient_name", "").strip()
    company = state.get("company_name", "").strip()
    recipient_context = state.get("recipient_context", "").strip()
    linkedin_post = state.get("linkedin_post_content", "").strip()

    parts = []
    if recipient:
        parts.append(f"Recipient: {recipient}")
    if company:
        parts.append(f"Company: {company}")
    if recipient_context:
        parts.append(f"Background: {recipient_context}")
    if linkedin_post:
        parts.append(f"Recent LinkedIn post:\n{linkedin_post}")
    return {"context_summary": "\n".join(parts) if parts else "No additional context."}


async def draft(state: EmailComposeState) -> dict:
    instructions = state.get("instructions", "").strip() or "Write a concise, warm cold email."
    llm = make_llm(provider="deepseek", tier="standard", temperature=0.5)
    result, tel = await ainvoke_json_with_telemetry(
        llm,
        [
            {"role": "system", "content": DRAFT_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"{state.get('context_summary', '')}\n\n"
                    f"Instructions: {instructions}\n\n"
                    'Return JSON: {"subject": "...", "body": "..."}'
                ),
            },
        ],
        provider="deepseek",
    )

    payload = result if isinstance(result, dict) else {}
    draft_subject = str(payload.get("subject") or "").strip()
    draft_body = str(payload.get("body") or "").strip()

    return {
        "draft_subject": draft_subject,
        "draft_body": draft_body,
        # legacy alias kept for any existing consumer reading state["draft"]
        "draft": draft_body,
        "prompt_version": PROMPT_VERSION,
        "model": deepseek_model_name("standard"),
        "graph_meta": {
            "telemetry": merge_node_telemetry(None, "draft", tel),
        },
    }


async def _refine_once(
    *,
    draft_subject: str,
    draft_body: str,
    instructions: str,
    context_summary: str,
    extra_constraint: str = "",
) -> tuple[dict[str, Any], dict[str, Any]]:
    llm = make_llm(provider="deepseek", tier="standard", temperature=0.2)
    user_msg = (
        f"CONTEXT:\n{context_summary}\n\n"
        f"INSTRUCTIONS (the original goal): {instructions}\n\n"
        f"DRAFT TO POLISH:\n"
        f"subject: {draft_subject}\n"
        f"body:\n{draft_body}\n\n"
    )
    if extra_constraint:
        user_msg += f"ADDITIONAL CONSTRAINT FROM PREVIOUS ATTEMPT:\n{extra_constraint}\n\n"
    user_msg += 'Return JSON: {"subject": "...", "body": "..."}'

    result, tel = await ainvoke_json_with_telemetry(
        llm,
        [
            {"role": "system", "content": REFINE_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        provider="deepseek",
    )
    return (result if isinstance(result, dict) else {}), tel


async def refine(state: EmailComposeState) -> dict:
    draft_subject = state.get("draft_subject", "")
    draft_body = state.get("draft_body", "")
    instructions = state.get("instructions", "").strip()
    context_summary = state.get("context_summary", "")

    refine_telemetry: dict[str, Any] | None = None
    refine_status = "ok"
    extra_constraint = ""
    parsed: RefineOutput | None = None
    last_err = ""

    for attempt in (1, 2):
        try:
            payload, tel = await _refine_once(
                draft_subject=draft_subject,
                draft_body=draft_body,
                instructions=instructions,
                context_summary=context_summary,
                extra_constraint=extra_constraint,
            )
            # Sum across attempts so a 2-pass refine reports one combined entry.
            refine_telemetry = merge_node_telemetry(
                {"refine": refine_telemetry} if refine_telemetry else None,
                "refine",
                tel,
            )["refine"]
        except Exception as e:  # noqa: BLE001
            last_err = f"upstream error: {e}"
            log.warning("refine attempt %d upstream failure: %s", attempt, e)
            continue

        try:
            candidate = RefineOutput.model_validate(payload)
        except ValidationError as ve:
            last_err = f"schema validation: {ve.errors()}"
            extra_constraint = (
                "Your previous response failed validation: "
                f"{json.dumps(ve.errors())}. Return strict JSON now with subject (3-70 chars) "
                "and body (≥20 chars)."
            )
            continue

        markers = _ai_markers_present(candidate.body)
        if len(candidate.subject) > 50:
            last_err = f"subject too long ({len(candidate.subject)} chars)"
            extra_constraint = (
                f"Your previous subject was {len(candidate.subject)} chars — must be ≤ 50. "
                "Tighten the subject and re-emit."
            )
            continue
        if markers:
            last_err = f"AI markers still present: {markers}"
            extra_constraint = (
                f"Your previous body still contained banned AI-marker phrases: {markers}. "
                "Rewrite the opening sentence so none of those phrases appear."
            )
            continue

        parsed = candidate
        break

    if parsed is None:
        log.warning("refine fallback to draft (last_err=%s)", last_err)
        refine_status = "fallback"
        final_subject = draft_subject
        final_body = draft_body
    else:
        final_subject = parsed.subject
        final_body = parsed.body

    # Sum draft + refine tokens for easy DB persistence by the route.
    draft_tel = (state.get("graph_meta") or {}).get("telemetry", {}).get("draft", {}) or {}
    prompt_tokens = int(draft_tel.get("input_tokens", 0)) + int(
        (refine_telemetry or {}).get("input_tokens", 0)
    )
    completion_tokens = int(draft_tel.get("output_tokens", 0)) + int(
        (refine_telemetry or {}).get("output_tokens", 0)
    )

    return {
        "subject": final_subject,
        "body": final_body,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "graph_meta": {
            "telemetry": {"refine": refine_telemetry} if refine_telemetry else {},
            "refine_status": refine_status,
        },
    }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(EmailComposeState)
    builder.add_node("gather_context", gather_context)
    builder.add_node("draft", draft)
    builder.add_node("refine", refine)
    builder.add_edge(START, "gather_context")
    builder.add_edge("gather_context", "draft")
    builder.add_edge("draft", "refine")
    builder.add_edge("refine", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
