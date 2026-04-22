"""TypedDict state schemas for the knowledge graphs.

Each state matches the input/output shape expected by the Next.js client in
``apps/knowledge/src/lib/langgraph-client.ts``.
"""

from __future__ import annotations

from typing import Any, TypedDict


class ChatState(TypedDict, total=False):
    # input
    message: str
    history: list[dict[str, str]]          # [{role, content}] — prior chat history
    context_snippets: list[str]            # retrieved RAG context from Next.js
    # output
    response: str


class AppPrepState(TypedDict, total=False):
    # input
    app_id: str
    job_description: str
    company: str
    position: str
    # output
    tech_stack: list[dict[str, Any]]       # [{tag, label, category, relevance}]
    interview_questions: str               # markdown


class TechBadge(TypedDict, total=False):
    tag: str
    label: str
    category: str
    relevance: str                          # "primary" | "secondary"


class MemorizeGenerateState(TypedDict, total=False):
    # input
    company: str
    position: str
    techs: list[TechBadge]
    # output
    categories: list[dict[str, Any]]       # [{id, name, icon, color, items: [...]}]
