"""Journalism pipeline — LangGraph StateGraph with revision loop."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from press import slugify
from press.agents import Agent, run_all
from press.graphs.nodes import (
    check_references_node,
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
from press.papers.editorial import search_editorial
from press.research import format_editorial_digest

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

        # Stage 1: editorial search + SEO agents in parallel
        # (editorial search feeds into the researcher in stage 2)
        seo_disc = Agent(
            "journalist-seo-discovery",
            prompts.seo_discovery(topic),
            pool.for_role(TeamRole.FAST),
        )
        seo_bp = Agent(
            "journalist-seo-blueprint",
            prompts.seo_blueprint(topic),
            pool.for_role(TeamRole.FAST),
        )
        seo_input = f"Topic: {topic}"

        editorial_results, seo_disc_out, seo_bp_out = await asyncio.gather(
            search_editorial(topic),
            seo_disc.run(seo_input),
            seo_bp.run(seo_input),
        )

        editorial_digest = format_editorial_digest(editorial_results)

        # Stage 2: researcher with editorial context
        research_input = f"Research this topic: {topic}"
        if editorial_digest:
            research_input += f"\n\n---\n\n{editorial_digest}"

        researcher_prompt = (
            prompts.journalism_researcher_with_editorial(topic)
            if editorial_results
            else prompts.journalism_researcher(topic)
        )
        researcher = Agent(
            "journalist-researcher",
            researcher_prompt,
            pool.for_role(TeamRole.REASONER),
        )
        research_output = await researcher.run(research_input)

        seo_output = f"{seo_disc_out}\n\n---\n\n{seo_bp_out}"

        research_dir = Path(output_dir) / "research"
        research_dir.mkdir(parents=True, exist_ok=True)
        (research_dir / f"{slug}-research.md").write_text(research_output)
        (research_dir / f"{slug}-seo-discovery.md").write_text(seo_disc_out)
        (research_dir / f"{slug}-seo-blueprint.md").write_text(seo_bp_out)
        if editorial_digest:
            (research_dir / f"{slug}-editorial.md").write_text(editorial_digest)

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
    graph.add_node("check_references", check_references_node)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final_node)

    graph.add_edge(START, "research_and_seo")
    graph.add_edge("research_and_seo", "write")
    graph.add_edge("write", "check_references")
    graph.add_edge("check_references", "edit")
    graph.add_conditional_edges(
        "edit",
        should_revise_simple,
        {"publish": "publish", "save_final": "save_final", "revise": "revise"},
    )
    graph.add_edge("revise", "check_references")
    graph.add_edge("publish", END)
    graph.add_edge("save_final", END)

    return graph.compile()
