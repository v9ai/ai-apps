"""End-to-end RAG pipeline for evaluation.

Implements: query -> retrieve from pgvector/FTS -> augment prompt -> generate with DeepSeek.
Returns structured RAGResult with retrieval_context for DeepEval metrics.

Usage:
    from rag_pipeline import invoke_rag, invoke_rag_batch, RAGConfig

    result = invoke_rag("What is multi-head attention?")
    # result["actual_output"]       -> generated answer
    # result["retrieval_context"]   -> list of retrieved text chunks
    # result["retrieval_scores"]    -> similarity scores per chunk
"""

import operator
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Annotated, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph

from pgvector_retriever import PgVectorRetriever

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)


# -- Config & Result types ----------------------------------------------------


class RAGConfig(TypedDict, total=False):
    top_k: int  # default 5
    threshold: float  # default 0.3
    retrieval_method: str  # "vector" | "hybrid" | "fts" (default "fts")
    fts_weight: float  # default 0.3
    vector_weight: float  # default 0.7
    system_prompt: str
    max_context_tokens: int  # default 4000


class RAGResult(TypedDict):
    input: str
    actual_output: str
    retrieval_context: list[str]
    retrieval_scores: list[float]
    retrieval_method: str


_DEFAULT_CONFIG: RAGConfig = {
    "top_k": 5,
    "threshold": 0.3,
    "retrieval_method": "fts",
    "fts_weight": 0.3,
    "vector_weight": 0.7,
    "max_context_tokens": 4000,
}

RAG_SYSTEM_PROMPT = (
    "You are a knowledgeable AI engineering tutor. "
    "Answer the student's question using ONLY the provided context. "
    "If the context doesn't contain enough information, say so clearly. "
    "Cite which lesson or section your answer draws from.\n\n"
    "Context:\n{context}"
)

# Shared LLM instance — ChatOpenAI is thread-safe; build once.
_llm = ChatOpenAI(
    model="deepseek-chat",
    base_url="https://api.deepseek.com",
    api_key=os.environ.get("DEEPSEEK_API_KEY", ""),
    temperature=0,
)


# -- LangGraph state ----------------------------------------------------------


class RAGState(TypedDict):
    query: str
    config: RAGConfig
    retrieved_chunks: Annotated[list[str], operator.add]
    retrieved_scores: Annotated[list[float], operator.add]
    retrieval_method: str
    formatted_context: str
    answer: str


# -- Graph nodes ---------------------------------------------------------------


def retrieve(state: RAGState) -> dict:
    """Retrieve relevant context from pgvector or FTS."""
    config = state["config"]
    query = state["query"]
    method = config.get("retrieval_method", "fts")
    top_k = config.get("top_k", 5)
    threshold = config.get("threshold", 0.3)

    retriever = PgVectorRetriever()
    chunks: list[str] = []
    scores: list[float] = []

    try:
        if method == "vector":
            results = retriever.find_similar_sections(query, top_k=top_k, threshold=threshold)
            for r in results:
                chunks.append(f"[{r.get('lesson_title', '')} > {r.get('heading', '')}]\n{r['content']}")
                scores.append(r.get("similarity", 0.0))

        elif method == "hybrid":
            results = retriever.hybrid_search(
                query,
                top_k=top_k,
                fts_weight=config.get("fts_weight", 0.3),
                vector_weight=config.get("vector_weight", 0.7),
                threshold=threshold,
            )
            for r in results:
                chunks.append(f"[{r.get('title', '')} ({r.get('category_name', '')})]")
                scores.append(r.get("combined_score", 0.0))

        else:  # "fts" — default, works without embeddings
            results = retriever.fts_search(query, limit=top_k)
            for r in results:
                title = r.get("title", "")
                snippet = r.get("snippet", "")
                lesson_title = r.get("lesson_title", "")
                label = f"[{lesson_title} > {title}]" if lesson_title and lesson_title != title else f"[{title}]"
                chunks.append(f"{label}\n{snippet}")
                scores.append(r.get("rank", 0.0))
    finally:
        retriever.close()

    return {
        "retrieved_chunks": chunks,
        "retrieved_scores": scores,
        "retrieval_method": method,
    }


def format_context(state: RAGState) -> dict:
    """Format retrieved chunks into a single context string."""
    max_tokens = state["config"].get("max_context_tokens", 4000)
    chunks = state["retrieved_chunks"]

    context_parts = []
    total_chars = 0
    char_limit = max_tokens * 4  # rough token-to-char estimate

    for i, chunk in enumerate(chunks, 1):
        if total_chars + len(chunk) > char_limit:
            break
        context_parts.append(f"--- Source {i} ---\n{chunk}")
        total_chars += len(chunk)

    return {"formatted_context": "\n\n".join(context_parts) if context_parts else "No relevant context found."}


def generate(state: RAGState) -> dict:
    """Generate answer using DeepSeek with retrieved context."""
    system_template = state["config"].get("system_prompt", RAG_SYSTEM_PROMPT)
    system_text = system_template.format(context=state["formatted_context"])

    messages = [SystemMessage(content=system_text), HumanMessage(content=state["query"])]
    response = _llm.invoke(messages)
    return {"answer": response.content}


# -- Graph builder -------------------------------------------------------------


def build_rag_pipeline() -> StateGraph:
    """Build and compile the RAG StateGraph. Reuse the returned object."""
    graph = StateGraph(RAGState)
    graph.add_node("retrieve", retrieve)
    graph.add_node("format_context", format_context)
    graph.add_node("generate", generate)

    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "format_context")
    graph.add_edge("format_context", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


# Compiled graph is stateless — build once and reuse across all invocations.
_rag_pipeline = build_rag_pipeline()


# -- Convenience functions -----------------------------------------------------


def invoke_rag(query: str, config: RAGConfig | None = None) -> RAGResult:
    """Run the full RAG pipeline and return structured result."""
    cfg = {**_DEFAULT_CONFIG, **(config or {})}

    result = _rag_pipeline.invoke({
        "query": query,
        "config": cfg,
        "retrieved_chunks": [],
        "retrieved_scores": [],
        "retrieval_method": "",
        "formatted_context": "",
        "answer": "",
    })

    return RAGResult(
        input=query,
        actual_output=result["answer"],
        retrieval_context=result["retrieved_chunks"],
        retrieval_scores=result["retrieved_scores"],
        retrieval_method=result["retrieval_method"],
    )


def invoke_rag_batch(
    queries: list[str],
    config: RAGConfig | None = None,
    max_workers: int = 4,
) -> list[RAGResult]:
    """Run RAG pipeline on multiple queries in parallel (I/O-bound)."""
    with ThreadPoolExecutor(max_workers=min(max_workers, len(queries) or 1)) as pool:
        futures = {pool.submit(invoke_rag, q, config): i for i, q in enumerate(queries)}
        results: list[RAGResult | None] = [None] * len(queries)
        for future in as_completed(futures):
            try:
                results[futures[future]] = future.result()
            except Exception:
                results[futures[future]] = None
    return results  # type: ignore[return-value]
