"""
LangGraph fan-out StateGraph for multi-entity vector search.

Topology:

    embed_query ─┬─> retrieve_tests ────────┐
                 ├─> retrieve_markers ──────┤
                 ├─> retrieve_conditions ───┤
                 ├─> retrieve_medications ──┼──> merge ──> END
                 ├─> retrieve_symptoms ─────┤
                 └─> retrieve_appointments ─┘

Parallelism strategy: LangGraph parallel edges. A single source node
(`embed_query`) fans out to six retriever nodes via independent `add_edge`
calls; LangGraph executes them concurrently because each has no dependency
on the others. They all converge on a common downstream node (`merge`),
which is the idiomatic LangGraph fan-out/fan-in pattern — matching the style
of `graph.py` where all `retrieve_*` nodes converge on `rerank`.

Because the `search_*` helpers in `db.py` are synchronous (psycopg),
each retriever node wraps its call in `asyncio.to_thread(...)` so the
LangGraph async scheduler can actually overlap the six DB round-trips.

We call `db.py` helpers directly (not the LlamaIndex `retrievers.py`
BaseRetriever subclasses) because the `/search/multi` contract returns raw
row dicts with exact keys that the frontend depends on — the retrievers'
NodeWithScore abstraction would require extra unwrapping and risk changing
the response shape.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from db import (
    search_appointments,
    search_blood_tests,
    search_conditions,
    search_marker_trend,  # noqa: F401 — re-exported for symmetry with routes/search.py
    search_markers_hybrid,
    search_medications,
    search_symptoms,
)
from embeddings import generate_embedding

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# State
# ═══════════════════════════════════════════════════════════════════════════


class SearchState(BaseModel):
    """Typed state flowing through the multi-entity search graph."""

    # Input
    query: str = ""
    user_id: str = ""

    # Embedding (populated by embed_query)
    query_embedding: list[float] = Field(default_factory=list)

    # Per-table results (populated in parallel by the six retrieval nodes)
    tests: list[dict] = Field(default_factory=list)
    markers: list[dict] = Field(default_factory=list)
    conditions: list[dict] = Field(default_factory=list)
    medications: list[dict] = Field(default_factory=list)
    symptoms: list[dict] = Field(default_factory=list)
    appointments: list[dict] = Field(default_factory=list)

    # Error surface (any node can append to it; merge will include it if set)
    error: str = ""


# ═══════════════════════════════════════════════════════════════════════════
# Node 1: embed_query — one embedding call, reused across all retrievers
# ═══════════════════════════════════════════════════════════════════════════


async def embed_query(state: SearchState) -> dict[str, Any]:
    """Compute the query embedding once, off the event loop."""
    try:
        embedding = await asyncio.to_thread(generate_embedding, state.query)
    except Exception as exc:  # pragma: no cover — surface upstream
        logger.exception("embed_query failed: %s", exc)
        return {"query_embedding": [], "error": f"embed_failed: {exc}"}
    return {"query_embedding": embedding}


# ═══════════════════════════════════════════════════════════════════════════
# Node 2 (fan-out): six retrieval nodes, one per table
# ═══════════════════════════════════════════════════════════════════════════


async def retrieve_tests(state: SearchState) -> dict[str, Any]:
    if not state.query_embedding:
        return {"tests": []}
    rows = await asyncio.to_thread(
        search_blood_tests, state.query_embedding, state.user_id,
    )
    return {"tests": rows}


async def retrieve_markers(state: SearchState) -> dict[str, Any]:
    if not state.query_embedding:
        return {"markers": []}
    rows = await asyncio.to_thread(
        search_markers_hybrid,
        state.query,
        state.query_embedding,
        state.user_id,
        0.3,  # threshold (db.py default)
        5,    # limit — preserved from routes/search.py
    )
    return {"markers": rows}


async def retrieve_conditions(state: SearchState) -> dict[str, Any]:
    if not state.query_embedding:
        return {"conditions": []}
    rows = await asyncio.to_thread(
        search_conditions, state.query_embedding, state.user_id,
    )
    return {"conditions": rows}


async def retrieve_medications(state: SearchState) -> dict[str, Any]:
    if not state.query_embedding:
        return {"medications": []}
    rows = await asyncio.to_thread(
        search_medications, state.query_embedding, state.user_id,
    )
    return {"medications": rows}


async def retrieve_symptoms(state: SearchState) -> dict[str, Any]:
    if not state.query_embedding:
        return {"symptoms": []}
    rows = await asyncio.to_thread(
        search_symptoms, state.query_embedding, state.user_id,
    )
    return {"symptoms": rows}


async def retrieve_appointments(state: SearchState) -> dict[str, Any]:
    if not state.query_embedding:
        return {"appointments": []}
    rows = await asyncio.to_thread(
        search_appointments, state.query_embedding, state.user_id,
    )
    return {"appointments": rows}


# ═══════════════════════════════════════════════════════════════════════════
# Node 3: merge — assemble the combined result dict
# ═══════════════════════════════════════════════════════════════════════════


def merge(state: SearchState) -> dict[str, Any]:
    """No-op assembly node.

    All per-table results are already in state — LangGraph fans the six
    retriever node outputs back into SearchState. We return an empty dict so
    the final state (ainvoke return value) carries them through unchanged.
    The route handler extracts the six keys in the exact order the original
    /search/multi endpoint used, preserving byte-for-byte compatibility.
    """
    return {}


# ═══════════════════════════════════════════════════════════════════════════
# Graph assembly
# ═══════════════════════════════════════════════════════════════════════════


_RETRIEVER_NODES = [
    "retrieve_tests",
    "retrieve_markers",
    "retrieve_conditions",
    "retrieve_medications",
    "retrieve_symptoms",
    "retrieve_appointments",
]


def build_graph() -> StateGraph:
    """Build and compile the fan-out search StateGraph."""
    graph = StateGraph(SearchState)

    graph.add_node("embed_query", embed_query)
    graph.add_node("retrieve_tests", retrieve_tests)
    graph.add_node("retrieve_markers", retrieve_markers)
    graph.add_node("retrieve_conditions", retrieve_conditions)
    graph.add_node("retrieve_medications", retrieve_medications)
    graph.add_node("retrieve_symptoms", retrieve_symptoms)
    graph.add_node("retrieve_appointments", retrieve_appointments)
    graph.add_node("merge", merge)

    graph.set_entry_point("embed_query")

    # Fan-out: embed_query -> all six retrievers (parallel execution)
    for node in _RETRIEVER_NODES:
        graph.add_edge("embed_query", node)

    # Fan-in: all six retrievers -> merge
    for node in _RETRIEVER_NODES:
        graph.add_edge(node, "merge")

    graph.add_edge("merge", END)

    return graph


# Compiled graph — import this from routes/search.py
compiled_graph = build_graph().compile()


async def run_search(query: str, user_id: str) -> dict[str, Any]:
    """Execute the search graph and return the final state dict."""
    initial_state = SearchState(query=query, user_id=user_id)
    result = await compiled_graph.ainvoke(initial_state.model_dump())
    return result
