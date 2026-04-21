"""TypedDict state schemas for the 5 LangGraph pipelines.

Each state matches the input/output shape expected by `src/lib/langgraph-client.ts`.
Input keys are populated by the caller via /runs/wait; output keys are set by
graph nodes. Intermediate keys (e.g. `analysis`, `hook`) are internal.
"""

from __future__ import annotations

from typing import Any, TypedDict


class EmailComposeState(TypedDict, total=False):
    # input
    recipient_name: str
    company_name: str
    instructions: str
    recipient_context: str
    linkedin_post_content: str
    # internal
    context_summary: str
    draft: str
    # output
    subject: str
    body: str


class EmailReplyState(TypedDict, total=False):
    # input
    original_email: str
    sender: str
    instructions: str
    tone: str
    reply_type: str
    include_calendly: bool
    additional_details: str
    # internal
    analysis: dict[str, Any]
    draft: str
    # output
    subject: str
    body: str


class EmailOutreachState(TypedDict, total=False):
    # input
    recipient_name: str
    recipient_role: str
    recipient_email: str
    post_text: str
    post_url: str
    tone: str
    # internal
    hook: str
    draft: str
    # output
    subject: str
    text: str
    html: str
    contact_id: int | None


class AdminChatState(TypedDict, total=False):
    # input
    prompt: str
    system: str
    # output
    response: str


class TextToSqlState(TypedDict, total=False):
    # input
    question: str
    database_schema: str
    # internal
    understanding: str
    # output
    sql: str
    explanation: str
    confidence: float
    tables_used: list[str]


class ScoreContactState(TypedDict, total=False):
    # input — either a raw profile blob or a DB id to load+serialize
    profile: str
    contact_id: int | None
    # output
    tier: str  # "A" | "B" | "C" | "D"
    score: float
    reasons: list[str]


class DeepICPState(TypedDict, total=False):
    # input
    product_id: int
    # internal
    product: dict[str, Any]
    market_research: dict[str, Any]
    criterion_analyses: dict[str, dict[str, Any]]
    # output
    criteria_scores: dict[str, dict[str, Any]]
    weighted_total: float
    segments: list[dict[str, Any]]
    personas: list[dict[str, Any]]
    anti_icp: list[str]
    deal_breakers: list[dict[str, Any]]
