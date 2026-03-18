"""Scan node — discovers Next.js apps in ../apps/."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from how_it_works.models import AppInfo


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

        if framework == "docusaurus":
            print(f"  ⏭   {entry.name:<24} docusaurus — skip")
            continue
        if framework == "unknown":
            print(f"  ⏭   {entry.name:<24} unknown framework — skip")
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
    return {"pending_apps": apps}
