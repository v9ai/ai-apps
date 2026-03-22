"""Process-next node — pops the next app from the queue."""

from __future__ import annotations

from typing import Any


async def process_next_node(state: dict[str, Any]) -> dict[str, Any]:
    pending = state.get("pending_apps", [])

    if not pending:
        return {"current_app": None, "pending_apps": []}

    next_app, *rest = pending

    print(f"\n{'━' * 58}")
    print(f"  Processing: {next_app.name}")
    print(f"{'━' * 58}\n")

    return {
        "current_app": next_app,
        "pending_apps": rest,
        "current_files": [],
        "current_analysis": "",
        "current_data": None,
    }
