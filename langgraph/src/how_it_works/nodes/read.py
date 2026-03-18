"""Read node — extracts source files from the current app."""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from how_it_works.models import FileContent

MAX_FILE_CHARS = 3_000
MAX_TOTAL_CHARS = 48_000


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


def _read_flat_dir(directory: Path, max_files: int = 5, ext_pattern: str = r"\.(ts|tsx)$") -> list[Path]:
    if not directory.is_dir():
        return []
    try:
        return [
            f
            for f in sorted(directory.iterdir())
            if f.is_file() and re.search(ext_pattern, f.name)
        ][:max_files]
    except OSError:
        return []


async def read_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["current_app"]
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

    # 1. package.json
    add(app_path / "package.json", 2_000)

    # 2. Config files
    for name in [
        "next.config.ts",
        "next.config.js",
        "drizzle.config.ts",
        "middleware.ts",
        "middleware.tsx",
        ".env.example",
        "env.example",
    ]:
        add(app_path / name, 1_500)

    # 3. Root layout
    add(app_dir / "layout.tsx", 2_000)

    # 4. Home page
    home_page = app_dir / "page.tsx"
    add(home_page)

    # 5. Other pages (up to 10)
    other_pages = [p for p in _find_page_files(app_dir) if p != home_page][:10]
    for p in other_pages:
        add(p)

    # 6. Lib / utils / server dirs
    for dir_name in ["lib", "src/lib", "utils", "src/utils", "server", "src/server"]:
        for p in _read_flat_dir(app_path / dir_name, 5):
            add(p, 4_000)
        if len(files) > 30:
            break

    # 7. API routes
    api_dir = app_dir / "api"
    for p in _find_page_files(api_dir)[:5]:
        add(p)

    # 8. Schema / DB files
    for dir_name in ["src/db", "db", "schema"]:
        for p in _read_flat_dir(app_path / dir_name, 4):
            add(p)

    # 9. Evals (test/eval files)
    for p in _read_flat_dir(app_path / "evals", 10, r"\.(py|yaml|yml|ts)$"):
        add(p)

    # 10. App-local LangGraph pipelines
    for p in _read_flat_dir(app_path / "langgraph", 8, r"\.py$"):
        add(p)
    for p in _read_flat_dir(app_path / "langgraph" / "src", 8, r"\.py$"):
        add(p)

    # 11. Prompts
    for p in _read_flat_dir(app_path / "prompts", 5, r"\.(txt|md|yaml|ts)$"):
        add(p)

    # 12. Root configs
    for name in ["promptfooconfig.yaml", "pytest.ini", "pyproject.toml"]:
        add(app_path / name, 1_500)

    print(f"  📁  Read {len(files)} files  ({round(total_chars / 1_000)}k chars)")
    if state.get("verbose"):
        for f in files:
            print(f"       {f.relative_path}")

    return {"current_files": files}
