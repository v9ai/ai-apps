"""
Promptfoo provider that reads REFLECTION.md and returns its content.
No LLM call — the reflection document already exists.
"""

import os
from pathlib import Path


def call_api(prompt: str, options: dict, context: dict) -> dict:
    repo_root = Path(__file__).resolve().parents[3]
    reflection_path = repo_root / "REFLECTION.md"

    if not reflection_path.exists():
        return {"error": f"REFLECTION.md not found at {reflection_path}"}

    text = reflection_path.read_text(encoding="utf-8")
    return {"output": text}
