from typing import TypedDict


class ResumeRAGState(TypedDict):
    action: str  # "upload" | "search" | "chat"
    user_id: str
    # Upload fields
    resume_id: str
    resume_text: str
    pdf_base64: str
    filename: str
    # Search fields
    query: str
    limit: int
    # Results
    chunks_stored: int
    search_results: list[dict]
    chat_response: str
    stats: dict
