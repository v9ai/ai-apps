"""Writer Agent — generates TypeScript files and writes them to disk.

Graph: START → write_files → END
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from langgraph.graph import END, START, StateGraph

from how_it_works.models import HowItWorksData, ProcessResult
from how_it_works.nodes.write import (
    generate_client_tsx,
    generate_data_tsx,
    generate_page_tsx,
)
from how_it_works.state import WriterState

# Re-use _ensure_ui_dep from the original write module
from how_it_works.nodes.write import _ensure_ui_dep


async def write_files_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["app"]
    data: HowItWorksData = state["data"]
    app_dir = Path(app.app_dir)
    how_it_works_dir = app_dir / "how-it-works"
    action = "updated" if app.has_how_it_works else "written"

    try:
        how_it_works_dir.mkdir(parents=True, exist_ok=True)

        gen_files = [
            ("data.tsx", generate_data_tsx(data)),
            ("how-it-works-client.tsx", generate_client_tsx(data)),
            ("page.tsx", generate_page_tsx(data, app.name)),
        ]

        written_paths: list[str] = []
        for name, content in gen_files:
            file_path = how_it_works_dir / name
            file_path.write_text(content, encoding="utf-8")
            written_paths.append(str(file_path))
            icon = "↺" if action == "updated" else "+"
            print(f"  ✓   {icon} {name}")

        added_ui = _ensure_ui_dep(Path(app.path))
        if added_ui:
            print("  📦  Added @ai-apps/ui to package.json — run pnpm install to link")

        return {
            "result": ProcessResult(
                app_name=app.name, status=action, files=written_paths
            )
        }
    except Exception as exc:
        error = str(exc)
        print(f"  ✗   Error: {error}")
        return {
            "result": ProcessResult(app_name=app.name, status="error", error=error)
        }


def build_writer_graph():
    graph = StateGraph(WriterState)
    graph.add_node("write_files", write_files_node)
    graph.add_edge(START, "write_files")
    graph.add_edge("write_files", END)
    return graph.compile()
