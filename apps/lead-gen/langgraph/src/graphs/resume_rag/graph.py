"""Resume RAG StateGraph — resume upload, search, and chat.

Ported from workers/resume-rag (Python CF Worker).
Uses Neon pgvector for vector storage and OpenAI for embeddings.

Flow:
    START -> route_action -> [upload_resume | search_resume | chat_resume] -> END
"""

from langgraph.graph import END, START, StateGraph

from .nodes import (
    chat_resume_node,
    route_action,
    search_resume_node,
    upload_resume_node,
)
from .state import ResumeRAGState


def build_resume_rag_graph():
    """Build and compile the resume RAG StateGraph."""
    builder = StateGraph(ResumeRAGState)

    builder.add_node("upload_resume", upload_resume_node)
    builder.add_node("search_resume", search_resume_node)
    builder.add_node("chat_resume", chat_resume_node)

    builder.add_conditional_edges(
        START,
        route_action,
        {
            "upload_resume": "upload_resume",
            "search_resume": "search_resume",
            "chat_resume": "chat_resume",
        },
    )
    builder.add_edge("upload_resume", END)
    builder.add_edge("search_resume", END)
    builder.add_edge("chat_resume", END)

    return builder.compile()
