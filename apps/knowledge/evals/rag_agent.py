"""RAG-augmented LangGraph ReAct agent with knowledge retrieval tool.

Unlike rag_pipeline.py (simple retrieve-then-generate), this agent
decides WHEN to retrieve and can make multiple retrieval calls.

Usage:
    from rag_agent import build_rag_agent

    agent, retriever = build_rag_agent()
    try:
        result = agent.invoke({"messages": [("user", "What is LoRA?")]})
    finally:
        retriever.close()
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent

from pgvector_retriever import PgVectorRetriever

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)

RAG_SYSTEM_PROMPT = (
    "You are a knowledgeable AI engineering tutor with access to a knowledge base "
    "of 55 lessons covering transformers, RAG, agents, fine-tuning, evals, "
    "infrastructure, safety, and multimodal AI.\n\n"
    "ALWAYS search the knowledge base before answering. "
    "Cite which lesson or section your answer draws from. "
    "If the knowledge base doesn't have relevant information, say so clearly "
    "and answer from your general knowledge."
)


def _build_search_tool(retrieval_method: str = "fts"):
    """Create a LangChain tool that searches the knowledge base."""
    retriever = PgVectorRetriever()

    @tool
    def search_knowledge_base(query: str) -> str:
        """Search the AI engineering knowledge base for relevant information.
        Use this tool to find context before answering questions about AI/ML topics."""
        if retrieval_method == "vector":
            results = retriever.find_similar_sections(query, top_k=5)
            if not results:
                results = retriever.fts_search(query, limit=5)
                return _format_fts(results)
            return _format_vector(results)
        elif retrieval_method == "hybrid":
            results = retriever.hybrid_search(query, top_k=5)
            return _format_hybrid(results)
        else:
            results = retriever.fts_search(query, limit=5)
            return _format_fts(results)

    return search_knowledge_base, retriever


def _format_vector(results: list[dict]) -> str:
    parts = []
    for r in results:
        parts.append(
            f"[{r.get('lesson_title', '')} > {r.get('heading', '')}] "
            f"(similarity: {r.get('similarity', 0):.2f})\n{r['content'][:500]}"
        )
    return "\n\n---\n\n".join(parts) if parts else "No results found."


def _format_hybrid(results: list[dict]) -> str:
    parts = []
    for r in results:
        parts.append(
            f"[{r.get('title', '')} ({r.get('category_name', '')})] "
            f"(score: {r.get('combined_score', 0):.3f})"
        )
    return "\n".join(parts) if parts else "No results found."


def _format_fts(results: list[dict]) -> str:
    parts = []
    for r in results:
        title = r.get("title", "")
        snippet = r.get("snippet", "")
        paper_title = r.get("paper_title", "")
        label = f"[{paper_title} > {title}]" if paper_title and paper_title != title else f"[{title}]"
        parts.append(f"{label}\n{snippet}")
    return "\n\n---\n\n".join(parts) if parts else "No results found."


# Shared LLM — ChatOpenAI is stateless and thread-safe; build once.
_llm = ChatOpenAI(
    model="deepseek-chat",
    base_url="https://api.deepseek.com",
    api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
    temperature=0,
)


def build_rag_agent(retrieval_method: str = "fts"):
    """Create a LangGraph ReAct agent with knowledge retrieval.

    Returns (agent, retriever). Call retriever.close() when done to release
    the DB connection held by the search tool.
    """
    search_tool, retriever = _build_search_tool(retrieval_method)
    agent = create_react_agent(model=_llm, tools=[search_tool], prompt=RAG_SYSTEM_PROMPT)
    return agent, retriever
