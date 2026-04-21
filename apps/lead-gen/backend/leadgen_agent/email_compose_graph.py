"""Email composition graph: gather_context → draft → format.

Produces {subject, body} for cold outreach, batch sends, and the GraphQL
`composeOutreach` mutation.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import EmailComposeState


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
    llm = make_llm()
    instructions = state.get("instructions", "").strip() or "Write a concise, warm cold email."
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "You are a B2B sales writer. Produce a short, specific email that sounds human and "
                    "references the provided context. No fluff, no em-dashes, no exclamation marks. "
                    "Return valid JSON only with keys `subject` (string, under 70 chars) and "
                    "`body` (string, 60-120 words, plain text with blank lines between paragraphs)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"{state.get('context_summary', '')}\n\n"
                    f"Instructions: {instructions}\n\n"
                    'Return JSON: {"subject": "...", "body": "..."}'
                ),
            },
        ],
    )
    return {
        "draft": result.get("body", ""),
        "subject": result.get("subject", ""),
        "body": result.get("body", ""),
    }


async def format_output(state: EmailComposeState) -> dict:
    # Pass-through in the MVP. Hook point for future polish/grammar steps.
    return {"subject": state.get("subject", ""), "body": state.get("body", "")}


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(EmailComposeState)
    builder.add_node("gather_context", gather_context)
    builder.add_node("draft", draft)
    builder.add_node("format_output", format_output)
    builder.add_edge(START, "gather_context")
    builder.add_edge("gather_context", "draft")
    builder.add_edge("draft", "format_output")
    builder.add_edge("format_output", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
