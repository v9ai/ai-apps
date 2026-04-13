"""
FastAPI chat server — LangGraph clinical intelligence pipeline.

The /chat endpoint runs the full agentic graph:
  triage → retrieve → synthesize → guard

Run:
  cd apps/agentic-healthcare/langgraph
  cp .env.example .env  # fill in DEEPSEEK_API_KEY, DATABASE_URL, R2_*, etc.
  uv run uvicorn chat_server:app --port 8001 --reload
"""

from __future__ import annotations

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from routes.upload import router as upload_router
from routes.embed import router as embed_router
from routes.search import router as search_router
from config import settings
from graph import run_graph

app = FastAPI(title="Blood Marker Intelligence Chat")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(upload_router)
app.include_router(embed_router)
app.include_router(search_router)


class ChatRequest(BaseModel):
    messages: list[dict]  # [{role: "user"|"assistant", content: str}]
    user_id: str = ""


class GraphChatResponse(BaseModel):
    answer: str
    intent: str
    intent_confidence: float
    retrieval_sources: list[str]
    guard_passed: bool
    guard_issues: list[str]
    citations: list[str]


# ── Primary endpoint: LangGraph agentic pipeline ────────────────────────


@app.post("/chat")
async def chat(req: ChatRequest) -> GraphChatResponse:
    """Run the full LangGraph clinical intelligence pipeline."""
    last_message = req.messages[-1]["content"] if req.messages else ""
    history = req.messages[:-1] if len(req.messages) > 1 else []

    result = await run_graph(
        query=last_message,
        user_id=req.user_id,
        chat_history=history,
    )

    return GraphChatResponse(
        answer=result.get("final_answer", result.get("answer", "")),
        intent=result.get("intent", ""),
        intent_confidence=result.get("intent_confidence", 0.0),
        retrieval_sources=list(set(result.get("retrieval_sources", []))),
        guard_passed=result.get("guard_passed", True),
        guard_issues=result.get("guard_issues", []),
        citations=result.get("citations", []),
    )


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "llm_base_url": settings.llm_base_url,
        "llm_model": settings.llm_model,
    }
