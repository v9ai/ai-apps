"""Scanner Agent — discovers and classifies Next.js apps.

Graph: START → scan → classify → END
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from langgraph.graph import END, START, StateGraph

from how_it_works.models import AppInfo
from how_it_works.state import ScannerState


def _detect_framework(app_path: Path) -> str:
    try:
        pkg = json.loads((app_path / "package.json").read_text())
        deps = {**pkg.get("dependencies", {}), **pkg.get("devDependencies", {})}
        if "next" in deps:
            return "nextjs"
        if "@docusaurus/core" in deps:
            return "docusaurus"
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return "unknown"


def _detect_app_dir(app_path: Path) -> Path | None:
    if (app_path / "src" / "app").is_dir():
        return app_path / "src" / "app"
    if (app_path / "app").is_dir():
        return app_path / "app"
    return None


async def scan_node(state: dict[str, Any]) -> dict[str, Any]:
    apps_root = Path(__file__).resolve().parents[4] / "apps"
    filter_app: str | None = state.get("filter_app")

    print(f"\n🔍  Scanning apps in {apps_root}\n")

    apps: list[AppInfo] = []
    for entry in sorted(apps_root.iterdir()):
        if not entry.is_dir():
            continue
        if filter_app and entry.name != filter_app:
            continue

        framework = _detect_framework(entry)
        if framework != "nextjs":
            label = "docusaurus" if framework == "docusaurus" else "unknown framework"
            print(f"  ⏭   {entry.name:<24} {label} — skip")
            continue

        app_dir = _detect_app_dir(entry)
        if not app_dir:
            print(f"  ⏭   {entry.name:<24} no app/ directory — skip")
            continue

        has_how_it_works = (app_dir / "how-it-works" / "page.tsx").exists()
        rel_app_dir = str(app_dir).replace(str(entry), "")
        print(
            f"  ✓   {entry.name:<24} nextjs | {rel_app_dir:<8} | "
            f"how-it-works: {'exists' if has_how_it_works else 'new'}"
        )
        apps.append(
            AppInfo(
                name=entry.name,
                path=str(entry),
                app_dir=str(app_dir),
                has_how_it_works=has_how_it_works,
                framework=framework,
            )
        )

    print(f"\n  Found {len(apps)} app(s) to process.\n")
    return {"discovered_apps": apps}


async def classify_node(state: dict[str, Any]) -> dict[str, Any]:
    """Enrich each AppInfo with feature detection metadata."""
    enriched: list[AppInfo] = []
    for app in state.get("discovered_apps", []):
        app_path = Path(app.path)
        has_db = (
            (app_path / "src" / "db").is_dir()
            or (app_path / "db").is_dir()
            or (app_path / "drizzle.config.ts").exists()
        )
        has_auth = (
            (app_path / "lib" / "auth.ts").exists()
            or (app_path / "lib" / "auth-client.ts").exists()
            or (app_path / "middleware.ts").exists()
        )
        has_ai = any(
            (app_path / p).exists()
            for p in ["langgraph", "lib/ai.ts", "lib/llm.ts", "src/ai"]
        )
        enriched.append(
            app.model_copy(
                update={"has_db": has_db, "has_auth": has_auth, "has_ai": has_ai}
            )
        )
    return {"discovered_apps": enriched}


def build_scanner_graph():
    graph = StateGraph(ScannerState)
    graph.add_node("scan", scan_node)
    graph.add_node("classify", classify_node)
    graph.add_edge(START, "scan")
    graph.add_edge("scan", "classify")
    graph.add_edge("classify", END)
    return graph.compile()
