"""Analyze node — calls DeepSeek with source files for a 13-point technical analysis."""

from __future__ import annotations

from typing import Any

from how_it_works.deepseek import chat
from how_it_works.prompts import ANALYSIS_SYSTEM_PROMPT


async def analyze_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["current_app"]
    current_files = state["current_files"]

    print("  🔬  Analyzing with DeepSeek...")

    files_text = "\n\n".join(
        f"### {f.relative_path}\n```\n{f.content}\n```" for f in current_files
    )

    analysis = await chat(
        [
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"App name: **{app.name}**\n\nSource files:\n\n{files_text}",
            },
        ],
        max_tokens=6_000,
    )

    if state.get("verbose"):
        print(f"\n{analysis[:600]}...\n")
    else:
        print(f"  ✓   Analysis done  ({len(analysis)} chars)")

    return {"current_analysis": analysis}
