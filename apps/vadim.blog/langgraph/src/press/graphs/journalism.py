"""Journalism pipeline — LangGraph StateGraph with revision loop."""

from __future__ import annotations

import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from press import slugify
from press.agents import Agent, run_parallel
from press.graphs.nodes import (
    make_edit_node,
    make_linkedin_node,
    make_revise_node,
    make_write_node,
    publish_node,
    save_final_node,
    should_revise_simple,
)
from press.graphs.state import JournalismState
from press.models import ModelPool, TeamRole
from press import prompts

logger = logging.getLogger(__name__)


def build_journalism_graph(pool: ModelPool):
    """Build the Journalism pipeline StateGraph.

    Flow: research_and_seo -> write -> edit --(approve)--> publish
                                           |
                                           +--(revise & <1)--> revise -> edit
                                           |
                                           +--(revise & >=1)--> save_final
    """
    graph = StateGraph(JournalismState)

    async def research_and_seo(state: JournalismState) -> dict:
        topic = state["topic"]
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(topic)

        researcher = Agent(
            "journalist-researcher",
            prompts.journalism_researcher(topic),
            pool.for_role(TeamRole.REASONER),
        )
        seo = Agent(
            "journalist-seo",
            prompts.journalism_seo(topic),
            pool.for_role(TeamRole.FAST),
        )

        research_input = f"Research this topic: {topic}"
        research_output, seo_output = await run_parallel(researcher, seo, research_input)

        research_dir = Path(output_dir) / "research"
        research_dir.mkdir(parents=True, exist_ok=True)
        (research_dir / f"{slug}-research.md").write_text(research_output)
        (research_dir / f"{slug}-seo.md").write_text(seo_output)

        return {"research_output": research_output, "seo_output": seo_output}

    def _context(state: dict) -> str:
        return (
            f"## Research Brief\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}"
        )

    write = make_write_node(
        pool, "journalist-writer", lambda _: prompts.journalism_writer(), _context
    )
    edit = make_edit_node(
        pool, "journalist-editor", lambda _: prompts.journalism_editor()
    )
    revise = make_revise_node(
        pool, "journalist-writer", lambda _: prompts.journalism_writer(), _context
    )

    # Build graph
    graph.add_node("research_and_seo", research_and_seo)
    graph.add_node("write", write)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final_node)

    graph.add_edge(START, "research_and_seo")
    graph.add_edge("research_and_seo", "write")
    graph.add_edge("write", "edit")
    graph.add_conditional_edges(
        "edit",
        should_revise_simple,
        {"publish": "publish", "save_final": "save_final", "revise": "revise"},
    )
    graph.add_edge("revise", "edit")
    graph.add_edge("publish", END)
    graph.add_edge("save_final", END)

    return graph.compile()
