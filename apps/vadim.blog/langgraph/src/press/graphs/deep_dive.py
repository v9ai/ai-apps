"""Deep-dive pipeline — LangGraph StateGraph with revision loop and LinkedIn."""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from press import slugify
from press.agents import Agent
from press.graphs.nodes import (
    make_edit_node,
    make_linkedin_node,
    make_revise_node,
    make_write_node,
    publish_node,
    save_final_node,
    should_revise_with_linkedin,
)
from press.graphs.state import DeepDiveState
from press.models import ModelPool, TeamRole
from press import prompts
from press.research import ResearchConfig, research_phase

logger = logging.getLogger(__name__)


def build_deep_dive_graph(pool: ModelPool):
    """Build the DeepDive pipeline StateGraph.

    Flow: read_source -> research_and_seo -> write -> edit
                                                       |
                                        approve -> linkedin -> publish -> END
                                        revise(<1) -> revise -> edit
                                        revise(>=1) -> linkedin -> save_final -> END
    """
    graph = StateGraph(DeepDiveState)

    async def read_source(state: DeepDiveState) -> dict:
        input_file = state["input_file"]
        content = Path(input_file).read_text()
        logger.info("Read %d chars from %s", len(content), input_file)
        return {"source_content": content}

    async def research_and_seo(state: DeepDiveState) -> dict:
        title = state["title"]
        niche = state.get("niche", title)
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(title)

        enable_paper_search = state.get("enable_paper_search", True)

        seo_agent = Agent(
            "deep-dive-seo",
            prompts.journalism_seo(title),
            pool.for_role(TeamRole.FAST),
        )
        seo_input = f"Analyze SEO strategy for: {title}"

        if enable_paper_search:
            config = ResearchConfig(enable_paper_search=True)
            research_task = research_phase(
                title, title, niche, config, pool.for_role(TeamRole.REASONER)
            )
            seo_task = seo_agent.run(seo_input)
            research_result, seo_output = await asyncio.gather(research_task, seo_task)
            research_output = research_result.notes
            paper_count = research_result.paper_count
        else:
            researcher = Agent(
                "deep-dive-researcher",
                prompts.journalism_researcher(title),
                pool.for_role(TeamRole.REASONER),
            )
            research_input = f"Research this topic: {title}"
            research_output, seo_output = await asyncio.gather(
                researcher.run(research_input), seo_agent.run(seo_input)
            )
            paper_count = 0

        research_dir = Path(output_dir) / "research"
        research_dir.mkdir(parents=True, exist_ok=True)
        (research_dir / f"{slug}-research.md").write_text(research_output)
        (research_dir / f"{slug}-seo.md").write_text(seo_output)

        return {
            "research_output": research_output,
            "seo_output": seo_output,
            "paper_count": paper_count,
        }

    def _context(state: dict) -> str:
        return (
            f"## Source Article\n\n{state['source_content']}\n\n"
            f"---\n\n## Academic Research\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}"
        )

    write = make_write_node(
        pool,
        "deep-dive-writer",
        lambda state: prompts.deep_dive_writer(state["title"]),
        _context,
    )
    edit = make_edit_node(
        pool, "deep-dive-editor", lambda _: prompts.deep_dive_editor()
    )
    revise = make_revise_node(
        pool,
        "deep-dive-writer",
        lambda state: prompts.deep_dive_writer(state["title"]),
        _context,
    )
    linkedin = make_linkedin_node(pool, "deep-dive-linkedin")

    # Build graph
    graph.add_node("read_source", read_source)
    graph.add_node("research_and_seo", research_and_seo)
    graph.add_node("write", write)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("linkedin_approved", linkedin)
    graph.add_node("linkedin_final", linkedin)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final_node)

    graph.add_edge(START, "read_source")
    graph.add_edge("read_source", "research_and_seo")
    graph.add_edge("research_and_seo", "write")
    graph.add_edge("write", "edit")
    graph.add_conditional_edges(
        "edit",
        should_revise_with_linkedin,
        {
            "linkedin_approved": "linkedin_approved",
            "linkedin_final": "linkedin_final",
            "revise": "revise",
        },
    )
    graph.add_edge("revise", "edit")
    graph.add_edge("linkedin_approved", "publish")
    graph.add_edge("publish", END)
    graph.add_edge("linkedin_final", "save_final")
    graph.add_edge("save_final", END)

    return graph.compile()
