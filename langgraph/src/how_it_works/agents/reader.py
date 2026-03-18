"""Reader Agent — extracts source files from a single app.

Graph: START → read_sources → END
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from langgraph.graph import END, START, StateGraph

from how_it_works.models import FileContent
from how_it_works.state import ReaderState

MAX_FILE_CHARS = 3_000
MAX_TOTAL_CHARS = 28_000


def _read_file(
    abs_path: Path, app_path: Path, max_chars: int = MAX_FILE_CHARS
) -> FileContent | None:
    try:
        raw = abs_path.read_text(encoding="utf-8")
        content = (
            raw[:max_chars] + "\n// ... (truncated)" if len(raw) > max_chars else raw
        )
        return FileContent(
            relative_path=str(abs_path.relative_to(app_path)), content=content
        )
    except (OSError, UnicodeDecodeError):
        return None


def _find_page_files(directory: Path, depth: int = 0, max_depth: int = 3) -> list[Path]:
    if depth > max_depth:
        return []
    results: list[Path] = []
    skip = {"node_modules", ".next", "how-it-works", "dist", ".git"}
    try:
        for entry in sorted(directory.iterdir()):
            if entry.is_dir() and entry.name not in skip:
                results.extend(_find_page_files(entry, depth + 1, max_depth))
            elif entry.name in ("page.tsx", "page.ts"):
                results.append(entry)
    except OSError:
        pass
    return results


def _read_flat_dir(directory: Path, max_files: int = 5) -> list[Path]:
    if not directory.is_dir():
        return []
    try:
        return [
            f
            for f in sorted(directory.iterdir())
            if f.is_file() and re.search(r"\.(ts|tsx)$", f.name)
        ][:max_files]
    except OSError:
        return []


async def read_sources_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["app"]
    app_path = Path(app.path)
    app_dir = Path(app.app_dir)

    files: list[FileContent] = []
    total_chars = 0

    def add(abs_path: Path, max_chars: int = MAX_FILE_CHARS) -> None:
        nonlocal total_chars
        if total_chars >= MAX_TOTAL_CHARS:
            return
        f = _read_file(abs_path, app_path, max_chars)
        if f:
            files.append(f)
            total_chars += len(f.content)

    add(app_path / "package.json", 2_000)
    for name in [
        "next.config.ts", "next.config.js", "drizzle.config.ts",
        "middleware.ts", "middleware.tsx", ".env.example", "env.example",
    ]:
        add(app_path / name, 1_500)
    add(app_dir / "layout.tsx", 2_000)

    home_page = app_dir / "page.tsx"
    add(home_page)
    for p in [p for p in _find_page_files(app_dir) if p != home_page][:10]:
        add(p)
    for dir_name in ["lib", "src/lib", "utils", "src/utils", "server", "src/server"]:
        for p in _read_flat_dir(app_path / dir_name, 5):
            add(p)
        if len(files) > 30:
            break
    for p in _find_page_files(app_dir / "api")[:5]:
        add(p)
    for dir_name in ["src/db", "db", "schema"]:
        for p in _read_flat_dir(app_path / dir_name, 4):
            add(p)

    print(f"  📁  Read {len(files)} files  ({round(total_chars / 1_000)}k chars)")
    if state.get("verbose"):
        for f in files:
            print(f"       {f.relative_path}")

    return {"files": files}


def build_reader_graph():
    graph = StateGraph(ReaderState)
    graph.add_node("read_sources", read_sources_node)
    graph.add_edge(START, "read_sources")
    graph.add_edge("read_sources", END)
    return graph.compile()
