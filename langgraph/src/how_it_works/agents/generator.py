"""Generator Agent — converts analysis to structured JSON with validation retry.

Graph: START → generate → validate → should_retry
                                       ├─ "retry" → fix → validate  (max 2 retries)
                                       └─ "done"  → END
"""

from __future__ import annotations

import json
import re
from typing import Any

from pydantic import ValidationError

from langgraph.graph import END, START, StateGraph

from how_it_works.deepseek import chat_json
from how_it_works.models import HowItWorksData
from how_it_works.prompts import FIX_VALIDATION_PROMPT, GENERATION_SYSTEM_PROMPT
from how_it_works.state import GeneratorState

MAX_RETRIES = 2

VALID_CATEGORIES = {
    "Frontend", "Database", "Authentication", "AI/LLM", "API",
    "Infrastructure", "Storage", "Search", "Build Tool", "State Management",
    "Evaluation", "Research",
}
VALID_COLORS = {
    "var(--blue-9)", "var(--green-9)", "var(--purple-9)", "var(--amber-9)",
    "var(--orange-9)", "var(--red-9)", "var(--cyan-9)", "var(--indigo-9)",
    "var(--gray-9)", "var(--teal-9)", "var(--pink-9)", "var(--violet-9)",
}


def _validate_data(data: HowItWorksData) -> list[str]:
    """Run structural validation beyond Pydantic and return error messages."""
    errors: list[str] = []

    if not (5 <= len(data.papers) <= 15):
        errors.append(f"papers count {len(data.papers)} not in [5, 15]")
    if not (4 <= len(data.agents) <= 10):
        errors.append(f"agents count {len(data.agents)} not in [4, 10]")
    if not (3 <= len(data.stats) <= 10):
        errors.append(f"stats count {len(data.stats)} not in [3, 10]")
    if not (3 <= len(data.extra_sections) <= 8):
        errors.append(f"extraSections count {len(data.extra_sections)} not in [3, 8]")

    for p in data.papers:
        if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", p.slug):
            errors.append(f"paper slug '{p.slug}' is not valid kebab-case")
        if p.category not in VALID_CATEGORIES:
            errors.append(f"paper category '{p.category}' is invalid")
        if p.category_color and p.category_color not in VALID_COLORS:
            errors.append(f"paper categoryColor '{p.category_color}' is invalid")

    numbers = [p.number for p in data.papers]
    if numbers != list(range(1, len(numbers) + 1)):
        errors.append(f"paper numbers {numbers} are not sequential from 1")

    headings = {s.heading.lower() for s in data.extra_sections}
    if not any("architecture" in h for h in headings):
        errors.append("missing required extraSection: System Architecture")
    if not any("security" in h or "auth" in h for h in headings):
        errors.append("missing required extraSection: Security & Auth")

    sentences = [s.strip() for s in data.story.split(".") if s.strip()]
    if not (3 <= len(sentences) <= 6):
        errors.append(f"story has {len(sentences)} sentences, expected 3-6")

    return errors


async def generate_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["app"]

    print("  🏗   Generating HowItWorks data with DeepSeek...")

    raw = await chat_json(
        [
            {"role": "system", "content": GENERATION_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"App name: {app.name}\n\n"
                    f"Technical analysis:\n{state['analysis']}"
                ),
            },
        ],
    )

    try:
        data = HowItWorksData.model_validate(raw)
    except ValidationError as exc:
        errors = [str(e) for e in exc.errors()]
        print(f"  ⚠   Pydantic validation failed: {len(errors)} error(s)")
        return {"data": None, "validation_errors": errors, "retry_count": 0}

    print(
        f"  ✓   Generated: {len(data.papers)} foundations, "
        f"{len(data.agents)} pipeline steps, "
        f"{len(data.stats)} stats, "
        f"{len(data.extra_sections)} sections"
    )

    return {"data": data, "validation_errors": [], "retry_count": 0}


async def validate_node(state: dict[str, Any]) -> dict[str, Any]:
    data = state.get("data")
    if data is None:
        return {"validation_errors": state.get("validation_errors", ["data is None"])}

    errors = _validate_data(data)
    if errors:
        print(f"  ⚠   Validation: {len(errors)} issue(s)")
        for e in errors:
            print(f"       - {e}")
    else:
        print("  ✓   Validation passed")

    return {"validation_errors": errors}


def should_retry(state: dict[str, Any]) -> str:
    errors = state.get("validation_errors", [])
    count = state.get("retry_count", 0)
    if errors and count < MAX_RETRIES:
        return "retry"
    return "done"


async def fix_node(state: dict[str, Any]) -> dict[str, Any]:
    errors = state.get("validation_errors", [])
    count = state.get("retry_count", 0)
    analysis = state.get("analysis", "")

    invalid_json = ""
    if state.get("data"):
        invalid_json = state["data"].model_dump_json(indent=2)

    print(f"  🔧  Retry {count + 1}: fixing {len(errors)} validation error(s)...")

    prompt = FIX_VALIDATION_PROMPT.format(
        errors="\n".join(f"- {e}" for e in errors),
        analysis=analysis[:3_000],
        invalid_json=invalid_json[:4_000],
    )

    raw = await chat_json(
        [
            {"role": "system", "content": GENERATION_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )

    try:
        data = HowItWorksData.model_validate(raw)
        print(f"  ✓   Retry produced valid structure")
        return {"data": data, "retry_count": count + 1}
    except ValidationError as exc:
        new_errors = [str(e) for e in exc.errors()]
        print(f"  ⚠   Retry still has {len(new_errors)} Pydantic error(s)")
        return {"data": None, "validation_errors": new_errors, "retry_count": count + 1}


def build_generator_graph():
    graph = StateGraph(GeneratorState)

    graph.add_node("generate", generate_node)
    graph.add_node("validate", validate_node)
    graph.add_node("fix", fix_node)

    graph.add_edge(START, "generate")
    graph.add_edge("generate", "validate")
    graph.add_conditional_edges(
        "validate",
        should_retry,
        {"retry": "fix", "done": END},
    )
    graph.add_edge("fix", "validate")

    return graph.compile()
