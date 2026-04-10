"""App Pipeline — chains Reader → Analyst → Generator → Writer for a single app.

This subgraph is the unit of work dispatched by Send() in the orchestrator.

Graph: START → reader → analyst → generator → check_data → writer → END
                                                  └─ "error" → error_result → END
"""

from __future__ import annotations

import time
from typing import Any

from langgraph.graph import END, START, StateGraph

from how_it_works.agents.analyst import build_analyst_graph
from how_it_works.agents.generator import build_generator_graph
from how_it_works.agents.reader import build_reader_graph
from how_it_works.agents.writer import build_writer_graph
from how_it_works.models import ProcessResult
from how_it_works.state import AppProcessingState


def _timed_node(name: str, subgraph):
    """Wrap a subgraph node with timing output."""
    async def wrapper(state: dict[str, Any]) -> dict[str, Any]:
        t0 = time.monotonic()
        result = await subgraph.ainvoke(state)
        elapsed = time.monotonic() - t0
        print(f"  ⏱   {name} completed in {elapsed:.1f}s")
        return result
    wrapper.__name__ = name
    return wrapper


async def error_result_node(state: dict[str, Any]) -> dict[str, Any]:
    """Produce an error ProcessResult when generation failed after retries."""
    app = state["app"]
    errors = state.get("validation_errors", [])
    msg = f"Generation failed after retries: {'; '.join(errors)}" if errors else "No data generated"
    print(f"  ✗   {app.name}: {msg}")
    return {
        "result": ProcessResult(app_name=app.name, status="error", error=msg)
    }


def check_data(state: dict[str, Any]) -> str:
    """Route to writer if data is valid, otherwise produce error result."""
    if state.get("data") is not None:
        return "writer"
    return "error_result"


def build_app_pipeline():
    graph = StateGraph(AppProcessingState)

    graph.add_node("reader", _timed_node("Reader", build_reader_graph()))
    graph.add_node("analyst", _timed_node("Analyst", build_analyst_graph()))
    graph.add_node("generator", _timed_node("Generator", build_generator_graph()))
    graph.add_node("writer", _timed_node("Writer", build_writer_graph()))
    graph.add_node("error_result", error_result_node)

    graph.add_edge(START, "reader")
    graph.add_edge("reader", "analyst")
    graph.add_edge("analyst", "generator")
    graph.add_conditional_edges(
        "generator",
        check_data,
        {"writer": "writer", "error_result": "error_result"},
    )
    graph.add_edge("writer", END)
    graph.add_edge("error_result", END)

    return graph.compile()
