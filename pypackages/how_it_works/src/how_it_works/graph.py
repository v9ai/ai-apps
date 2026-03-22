"""Orchestrator — top-level graph that coordinates all agents.

Graph: START → scanner → fan_out → [Send("process_app", app_i) ...] → END

Uses LangGraph's Send() for parallel fan-out across multiple apps,
with results collected via an operator.add reducer.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from how_it_works.agents.app_pipeline import build_app_pipeline
from how_it_works.agents.scanner import build_scanner_graph
from how_it_works.models import ProcessResult
from how_it_works.state import OrchestratorState


async def scanner_node(state: dict[str, Any]) -> dict[str, Any]:
    """Run the scanner subgraph and bridge its output to orchestrator state."""
    scanner = build_scanner_graph()
    result = await scanner.ainvoke({"filter_app": state.get("filter_app")})
    return {"apps": result["discovered_apps"]}


def fan_out_apps(state: dict[str, Any]) -> list[Send]:
    """Dispatch each app to its own pipeline instance via Send()."""
    apps = state.get("apps", [])
    if not apps:
        return [Send("no_apps", {})]
    return [
        Send(
            "process_app",
            {
                "app": app,
                "files": [],
                "analysis": "",
                "critique": "",
                "reflection_count": 0,
                "data": None,
                "validation_errors": [],
                "retry_count": 0,
                "result": None,
                "verbose": state.get("verbose", False),
            },
        )
        for app in apps
    ]


async def process_app_node(state: dict[str, Any]) -> dict[str, Any]:
    """Run the full app pipeline and return results for the reducer."""
    pipeline = build_app_pipeline()
    output = await pipeline.ainvoke(state, {"recursion_limit": 100})
    result = output.get("result")
    if result is None:
        app = state.get("app")
        name = app.name if app else "unknown"
        result = ProcessResult(app_name=name, status="error", error="No result produced")
    return {"results": [result]}


async def no_apps_node(state: dict[str, Any]) -> dict[str, Any]:
    """Handle the case where no apps were found."""
    print("  No apps to process.")
    return {}


def build_how_it_works_graph():
    graph = StateGraph(OrchestratorState)

    graph.add_node("scanner", scanner_node)
    graph.add_node("process_app", process_app_node)
    graph.add_node("no_apps", no_apps_node)

    graph.add_edge(START, "scanner")
    graph.add_conditional_edges("scanner", fan_out_apps, ["process_app", "no_apps"])
    graph.add_edge("process_app", END)
    graph.add_edge("no_apps", END)

    return graph.compile()
