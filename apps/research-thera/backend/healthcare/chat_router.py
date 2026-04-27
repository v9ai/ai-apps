"""
Healthcare chat router (extracted from agentic-healthcare/langgraph/chat_server.py).

The parent FastAPI app at apps/research-thera/backend/app.py mounts this router
plus the upload/embed/search routers from healthcare/routes/. No standalone
FastAPI app is created here — this module exposes routers only.
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from .chat_pipeline import run_chat
from .config import settings


router = APIRouter()


class ChatRequest(BaseModel):
    messages: list[dict]
    user_id: str = ""


class GraphChatResponse(BaseModel):
    answer: str
    intent: str
    intent_confidence: float
    retrieval_sources: list[str]
    rerank_scores: list[float] = []
    guard_passed: bool
    guard_issues: list[str]
    citations: list[str]


@router.post("/chat")
async def chat(req: ChatRequest) -> GraphChatResponse:
    """Run the full LlamaIndex clinical intelligence chat pipeline."""
    if not req.messages:
        return GraphChatResponse(
            answer="Please provide a message to get started.",
            intent="",
            intent_confidence=0.0,
            retrieval_sources=[],
            guard_passed=True,
            guard_issues=[],
            citations=[],
        )
    last_message = req.messages[-1].get("content", "")
    history = req.messages[:-1] if len(req.messages) > 1 else []

    result = await run_chat(
        query=last_message,
        user_id=req.user_id,
        chat_history=history,
    )

    return GraphChatResponse(
        answer=result.get("final_answer", result.get("answer", "")),
        intent=result.get("intent", ""),
        intent_confidence=result.get("intent_confidence", 0.0),
        retrieval_sources=list(set(result.get("retrieval_sources", []))),
        rerank_scores=result.get("rerank_scores", []),
        guard_passed=result.get("guard_passed", True),
        guard_issues=result.get("guard_issues", []),
        citations=result.get("citations", []),
    )


@router.get("/healthcare/health")
async def healthcare_health():
    return {
        "status": "ok",
        "llm_base_url": settings.llm_base_url,
        "llm_model": settings.llm_model,
    }
