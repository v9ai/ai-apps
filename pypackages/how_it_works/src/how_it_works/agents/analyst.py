"""Analyst Agent — produces technical analysis with self-critique reflection loop.

Graph: START → analyze → critique → should_refine
                                      ├─ "refine" → refine → critique  (max 2 iterations)
                                      └─ "done"   → END
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from how_it_works.deepseek import chat
from how_it_works.prompts import ANALYSIS_SYSTEM_PROMPT, CRITIQUE_PROMPT, REFINE_PROMPT
from how_it_works.state import AnalystState

MAX_REFLECTIONS = 2


async def analyze_node(state: dict[str, Any]) -> dict[str, Any]:
    app = state["app"]
    files = state["files"]

    print("  🔬  Analyzing with DeepSeek...")

    files_text = "\n\n".join(
        f"### {f.relative_path}\n```\n{f.content}\n```" for f in files
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

    return {"analysis": analysis, "reflection_count": 0}


async def critique_node(state: dict[str, Any]) -> dict[str, Any]:
    files = state["files"]
    analysis = state["analysis"]

    files_text = "\n\n".join(
        f"### {f.relative_path}\n```\n{f.content}\n```" for f in files
    )

    print(f"  🔍  Self-critique (iteration {state.get('reflection_count', 0) + 1})...")

    critique = await chat(
        [
            {"role": "system", "content": CRITIQUE_PROMPT},
            {
                "role": "user",
                "content": (
                    f"SOURCE FILES:\n\n{files_text}\n\n"
                    f"ANALYSIS:\n\n{analysis}"
                ),
            },
        ],
        max_tokens=1_500,
        temperature=0.2,
    )

    verdict = "PASS" if critique.strip().startswith("PASS") else "NEEDS_REFINEMENT"
    print(f"  {'✓' if verdict == 'PASS' else '↻'}   Critique: {verdict}")

    return {"critique": critique}


def should_refine(state: dict[str, Any]) -> str:
    critique = state.get("critique", "")
    count = state.get("reflection_count", 0)
    if "NEEDS_REFINEMENT" in critique and count < MAX_REFLECTIONS:
        return "refine"
    return "done"


async def refine_node(state: dict[str, Any]) -> dict[str, Any]:
    analysis = state["analysis"]
    critique = state["critique"]
    count = state.get("reflection_count", 0)

    print("  ✏️   Refining analysis based on critique...")

    refined = await chat(
        [
            {"role": "system", "content": REFINE_PROMPT},
            {
                "role": "user",
                "content": (
                    f"ORIGINAL ANALYSIS:\n\n{analysis}\n\n"
                    f"CRITIQUE:\n\n{critique}"
                ),
            },
        ],
        max_tokens=5_000,
    )

    print(f"  ✓   Refined  ({len(refined)} chars, was {len(analysis)})")

    return {"analysis": refined, "reflection_count": count + 1}


def build_analyst_graph():
    graph = StateGraph(AnalystState)

    graph.add_node("analyze", analyze_node)
    graph.add_node("critique", critique_node)
    graph.add_node("refine", refine_node)

    graph.add_edge(START, "analyze")
    graph.add_edge("analyze", "critique")
    graph.add_conditional_edges(
        "critique",
        should_refine,
        {"refine": "refine", "done": END},
    )
    graph.add_edge("refine", "critique")

    return graph.compile()
