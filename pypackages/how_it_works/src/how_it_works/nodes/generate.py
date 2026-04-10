"""Generate node — produces structured HowItWorksData JSON via DeepSeek."""

from __future__ import annotations

from typing import Any

from how_it_works.deepseek import chat_json
from how_it_works.models import HowItWorksData
from how_it_works.prompts import GENERATION_SYSTEM_PROMPT


async def generate_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["current_app"]

    print("  🏗   Generating HowItWorks data with DeepSeek...")

    raw = await chat_json(
        [
            {"role": "system", "content": GENERATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"App name: {app.name}\n\n"
                    f"Technical analysis:\n{state['current_analysis']}"
                ),
            },
        ],
        max_tokens=8_192,
    )

    data = HowItWorksData.model_validate(raw)

    if not data.papers:
        raise ValueError(f"Generate output for {app.name} is missing papers array")

    print(
        f"  ✓   Generated: {len(data.papers)} foundations, "
        f"{len(data.agents)} pipeline steps, "
        f"{len(data.stats)} stats, "
        f"{len(data.extra_sections)} sections"
    )

    return {"current_data": data}
