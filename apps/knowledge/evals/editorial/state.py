"""State definition mirroring JournalismArticle from pipeline.rs."""

from typing import TypedDict


class JournalismState(TypedDict):
    topic: str
    slug: str
    research: str
    seo: str
    intro_strategy: str
    draft: str
    editor_output: str
    editor_decision: str  # "approve" | "revise"
    revision_rounds: int
    approved: bool
