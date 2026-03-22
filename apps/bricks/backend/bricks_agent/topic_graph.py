"""LangGraph pipeline — topic-based MOC research and analysis."""

from __future__ import annotations

import json

from langgraph.graph import END, START, StateGraph

from .graph import _get_llm, _parse_json
from .rebrickable import parse_moc_url
from .topic_state import TopicState


# ── Node 1: Parse MOC URLs ───────────────────────────────────────────────


async def parse_mocs(state: TopicState) -> dict:
    urls = state.get("moc_urls", [])
    if not urls:
        return {"error": "moc_urls is required"}

    mocs: list[dict] = []
    for url in urls:
        try:
            mocs.append(parse_moc_url(url))
        except ValueError:
            continue  # skip invalid URLs

    if not mocs:
        return {"error": "No valid MOC URLs could be parsed"}

    return {"mocs": mocs}


# ── Node 2: Analyze topic ────────────────────────────────────────────────


async def analyze_topic(state: TopicState) -> dict:
    if state.get("error"):
        return {}

    topic_name = state.get("topic_name", "Unknown")
    mocs = state.get("mocs", [])

    moc_listing = "\n".join(
        f"- {m['moc_id']}: \"{m['name']}\" by {m['designer']}"
        for m in mocs
    )

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO mechanism expert. Analyze the MOC builds for a given topic "
                    "and identify common mechanisms, techniques, and key parts. "
                    "Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Topic: {topic_name}\n\n"
                    f"MOC builds:\n{moc_listing}\n\n"
                    "Return JSON with this structure:\n"
                    '{"mechanism_description": "How this mechanism/technique works in LEGO builds", '
                    '"technique_categories": [{"name": "Category name", "description": "...", "moc_ids": ["MOC-..."]}], '
                    '"key_parts": [{"name": "Part name", "part_number": "12345", "role": "What this part does"}]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    analysis = _parse_json(resp.content)
    return {"analysis": analysis}


# ── Node 3: Synthesize topic ─────────────────────────────────────────────


async def synthesize_topic(state: TopicState) -> dict:
    if state.get("error"):
        return {}

    topic_name = state.get("topic_name", "Unknown")
    mocs = state.get("mocs", [])
    analysis = state.get("analysis", {})

    moc_summary = "\n".join(
        f"- {m['moc_id']}: \"{m['name']}\" by {m['designer']}"
        for m in mocs
    )

    llm = _get_llm()
    resp = await llm.ainvoke(
        [
            {
                "role": "system",
                "content": (
                    "You are a LEGO research curator. Synthesize the analysis into a helpful "
                    "topic summary for builders. Return valid JSON only."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Topic: {topic_name}\n\n"
                    f"MOC builds:\n{moc_summary}\n\n"
                    f"Analysis:\n{json.dumps(analysis, indent=2)}\n\n"
                    "Return JSON with this structure:\n"
                    '{"summary": "2-3 sentence overview of the topic", '
                    '"difficulty_range": "Beginner to Advanced", '
                    '"recommended_start_moc": "MOC-...", '
                    '"common_techniques": ["technique1", "technique2"], '
                    '"unique_approaches": [{"moc_id": "MOC-...", "name": "MOC name", "approach": "What makes this MOC unique"}]}'
                ),
            },
        ],
        response_format={"type": "json_object"},
    )
    synthesis = _parse_json(resp.content)
    return {"synthesis": synthesis}


# ── Graph wiring ──────────────────────────────────────────────────────────


def create_topic_graph():
    builder = StateGraph(TopicState)
    builder.add_node("parse_mocs", parse_mocs)
    builder.add_node("analyze_topic", analyze_topic)
    builder.add_node("synthesize_topic", synthesize_topic)

    builder.add_edge(START, "parse_mocs")
    builder.add_edge("parse_mocs", "analyze_topic")
    builder.add_edge("analyze_topic", "synthesize_topic")
    builder.add_edge("synthesize_topic", END)

    return builder.compile()


topic_graph = create_topic_graph()
