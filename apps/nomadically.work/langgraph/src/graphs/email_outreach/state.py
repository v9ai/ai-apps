"""State definitions for the email outreach pipeline."""

from typing import TypedDict


class PostAnalysis(TypedDict):
    topics: list[str]
    intent: str  # "hiring" | "sharing_knowledge" | "asking_for_help" | "celebrating" | "other"
    engagement_hooks: list[str]
    key_quotes: list[str]


class RemoteEUScreen(TypedDict):
    is_relevant: bool  # True = proceed with email, False = skip
    reason: str
    work_model: str  # "fully_remote" | "hybrid" | "onsite" | "unknown"
    region: str  # "eu" | "us" | "global" | "other" | "unknown"


class EmailDraft(TypedDict):
    subject: str
    text: str
    html: str


class EmailOutreachState(TypedDict):
    # Input
    recipient_name: str
    recipient_role: str
    post_text: str
    post_url: str
    recipient_email: str
    tone: str

    # After research_contact
    contact_context: str

    # After research_company
    company_context: str

    # After analyze_post
    post_analysis: PostAnalysis | None

    # After screen_remote_eu
    remote_eu_screen: RemoteEUScreen | None

    # After draft_email
    draft: EmailDraft | None

    # After refine_email
    final: EmailDraft | None
