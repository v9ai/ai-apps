"""Email reply graph: analyze_email → draft_reply → polish.

Produces {subject, body} for inbound-thread replies. `reply_type` (question,
accept, decline, followup, ...) and `tone` steer the draft; `include_calendly`
appends a booking link when true.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import EmailReplyState

CALENDLY_LINE = "Would any of these times work — https://calendly.com/nicolai-vadim/30min ?"


async def analyze_email(state: EmailReplyState) -> dict:
    llm = make_llm()
    original = state.get("original_email", "")[:6000]
    sender = state.get("sender", "")
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Classify an inbound email. Return JSON only with keys `intent` "
                    "(question|meeting_request|objection|info_share|other), "
                    "`sentiment` (positive|neutral|negative), and `key_ask` (one short sentence)."
                ),
            },
            {
                "role": "user",
                "content": f"From: {sender}\n\n{original}",
            },
        ],
    )
    return {"analysis": result if isinstance(result, dict) else {}}


async def draft_reply(state: EmailReplyState) -> dict:
    llm = make_llm()
    analysis = state.get("analysis", {}) or {}
    tone = state.get("tone") or "professional"
    reply_type = state.get("reply_type") or "followup"
    instructions = state.get("instructions", "").strip()
    extra = state.get("additional_details", "").strip()
    original = state.get("original_email", "")[:4000]

    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You write email replies. Match the requested tone and reply type. "
                    "Keep it under 120 words. No em-dashes, no exclamation marks. "
                    "Return JSON with keys `subject` (reuse 'Re: <original subject>' when appropriate) "
                    "and `body` (plain text with blank lines between paragraphs)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Original email:\n{original}\n\n"
                    f"Detected intent: {analysis.get('intent', 'unknown')}\n"
                    f"Key ask: {analysis.get('key_ask', 'n/a')}\n"
                    f"Tone: {tone}\n"
                    f"Reply type: {reply_type}\n"
                    f"Instructions: {instructions or 'none'}\n"
                    f"Extra context: {extra or 'none'}"
                ),
            },
        ],
    )
    return {
        "draft": result.get("body", ""),
        "subject": result.get("subject", ""),
        "body": result.get("body", ""),
    }


async def polish(state: EmailReplyState) -> dict:
    body = state.get("body", "")
    if state.get("include_calendly") and "calendly.com" not in body:
        body = body.rstrip() + "\n\n" + CALENDLY_LINE
    return {"subject": state.get("subject", ""), "body": body}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(EmailReplyState)
    builder.add_node("analyze_email", analyze_email)
    builder.add_node("draft_reply", draft_reply)
    builder.add_node("polish", polish)
    builder.add_edge(START, "analyze_email")
    builder.add_edge("analyze_email", "draft_reply")
    builder.add_edge("draft_reply", "polish")
    builder.add_edge("polish", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
