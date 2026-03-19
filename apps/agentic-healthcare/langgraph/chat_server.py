"""
FastAPI chat server — LangGraph clinical intelligence pipeline.

The /chat endpoint runs the full agentic graph:
  triage → retrieve → synthesize → guard

The /chat/simple endpoint retains the original LlamaIndex ContextChatEngine
for backward compatibility and A/B testing.

Run:
  cd apps/agentic-healthcare/langgraph
  cp .env.example .env  # fill in DEEPSEEK_API_KEY, DATABASE_URL, R2_*, etc.
  uv run uvicorn chat_server:app --port 8001 --reload
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv()

# Resolve evals/ directory so we can import ragas_eval
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "evals"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llama_index.core.chat_engine import ContextChatEngine
from ragas_eval import DOCUMENTS, build_rag_pipeline  # noqa: E402
from routes.upload import router as upload_router
from routes.embed import router as embed_router
from routes.search import router as search_router
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

# Build RAG pipeline once at startup (used by /chat/simple)
_rag = build_rag_pipeline("deepseek-chat")

SYSTEM_PROMPT = """You are a clinical blood marker intelligence assistant. Answer questions
about derived ratios (TG/HDL, NLR, De Ritis, BUN/Creatinine, TyG, TC/HDL, HDL/LDL),
trajectory interpretation, medication effects, and health conditions based only on the
provided context. Cite the relevant reference paper when available. Always remind the
user to consult their physician for medical decisions."""

chat_engine = ContextChatEngine.from_defaults(
    retriever=_rag.retriever,
    system_prompt=SYSTEM_PROMPT,
)


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


# ── Backward-compatible endpoint: LlamaIndex ContextChatEngine ─────────


@app.post("/chat/simple")
async def chat_simple(req: ChatRequest) -> dict:
    """Original LlamaIndex ContextChatEngine — retained for A/B testing."""
    chat_engine.reset()
    for msg in req.messages[:-1]:
        if msg["role"] == "user":
            chat_engine.chat(msg["content"])
    response = chat_engine.chat(req.messages[-1]["content"])
    return {"answer": str(response)}


@app.get("/health")
async def health():
    return {"status": "ok"}
