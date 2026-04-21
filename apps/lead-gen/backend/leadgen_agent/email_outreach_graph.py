"""Email outreach graph: lookup_contact → extract_hook → draft → format_html.

Produces {subject, text, html, contact_id}. `contact_id` is resolved from the
recipient email by querying contacts in the lead-gen DB; None when no match.
"""

from __future__ import annotations

import os
from html import escape
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import EmailOutreachState


async def lookup_contact(state: EmailOutreachState) -> dict:
    email = (state.get("recipient_email") or "").strip().lower()
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not email or not dsn:
        return {"contact_id": None}
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT id FROM contacts WHERE lower(email) = %s LIMIT 1", (email,))
                row = cur.fetchone()
                return {"contact_id": int(row[0]) if row else None}
    except Exception:
        # Don't let DB hiccups kill the whole outreach draft.
        return {"contact_id": None}


async def extract_hook(state: EmailOutreachState) -> dict:
    llm = make_llm()
    post = (state.get("post_text") or "")[:4000]
    if not post.strip():
        return {"hook": ""}
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Pick one specific, concrete hook from the provided LinkedIn post — a claim, "
                    "metric, or opinion to reference in a cold email. Return JSON `{\"hook\": \"...\"}` "
                    "with a single sentence, no quotes."
                ),
            },
            {"role": "user", "content": post},
        ],
    )
    return {"hook": (result or {}).get("hook", "") if isinstance(result, dict) else ""}


async def draft(state: EmailOutreachState) -> dict:
    llm = make_llm()
    tone = state.get("tone") or "professional and friendly"
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Write a short cold outreach email that references the hook naturally. "
                    "Under 100 words. No em-dashes, no exclamation marks. "
                    'Return JSON {"subject": "...", "body": "..."}.'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Recipient: {state.get('recipient_name', '')}\n"
                    f"Role: {state.get('recipient_role', '') or 'unknown'}\n"
                    f"Tone: {tone}\n"
                    f"Hook: {state.get('hook', '') or 'none'}\n"
                    f"Post URL: {state.get('post_url', '') or 'n/a'}"
                ),
            },
        ],
    )
    return {
        "subject": result.get("subject", "") if isinstance(result, dict) else "",
        "draft": result.get("body", "") if isinstance(result, dict) else "",
    }


async def format_html(state: EmailOutreachState) -> dict:
    text = state.get("draft", "")
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    html = "\n".join(f"<p>{escape(p)}</p>" for p in paragraphs)
    return {"text": text, "html": html}


def _build() -> Any:
    builder = StateGraph(EmailOutreachState)
    builder.add_node("lookup_contact", lookup_contact)
    builder.add_node("extract_hook", extract_hook)
    builder.add_node("draft", draft)
    builder.add_node("format_html", format_html)
    builder.add_edge(START, "lookup_contact")
    builder.add_edge("lookup_contact", "extract_hook")
    builder.add_edge("extract_hook", "draft")
    builder.add_edge("draft", "format_html")
    builder.add_edge("format_html", END)
    return builder.compile()


graph = _build()
