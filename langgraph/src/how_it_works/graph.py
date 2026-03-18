"""Orchestrator — top-level graph that coordinates all agents.

Graph: START → scanner → fan_out → [Send("process_app", app_i) ...] → collect → END

Uses LangGraph's Send() for parallel fan-out across multiple apps,
with results collected via an operator.add reducer.
"""

from __future__ import annotations

import operator
from typing import Annotated, Any

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from how_it_works.agents.app_pipeline import build_app_pipeline
from how_it_works.agents.scanner import build_scanner_graph
from how_it_works.models import AppInfo, ProcessResult
from how_it_works.state import OrchestratorState


async def bridge_scan_node(state: dict[str, Any]) -> dict[str, Any]:
    """Run the scanner subgraph and bridge its output to orchestrator state."""
    scanner = build_scanner_graph()
    result = await scanner.ainvoke({"filter_app": state.get("filter_app")})
    return {"apps": result["discovered_apps"]}


def fan_out_apps(state: dict[str, Any]) -> list[Send]:
    """Dispatch each app to its own pipeline instance via Send()."""
    apps = state.get("apps", [])
    if not apps:
        return []
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


async def collect_node(state: dict[str, Any]) -> dict[str, Any]:
    """No-op — results are collected by the reducer."""
    return {}


# We need a state type that can accept both the scanner output and
# the per-app results. The process_app node writes to "results" via reducer.
class _FullState(OrchestratorState, total=False):
    # process_app produces a single ProcessResult, collected by reducer
    result: ProcessResult | None


def build_how_it_works_graph():
    graph = StateGraph(OrchestratorState)

    graph.add_node("scanner", bridge_scan_node)
    graph.add_node("process_app", build_app_pipeline())

    graph.add_edge(START, "scanner")
    graph.add_conditional_edges("scanner", fan_out_apps, ["process_app"])
    graph.add_edge("process_app", END)

    return graph.compile()
