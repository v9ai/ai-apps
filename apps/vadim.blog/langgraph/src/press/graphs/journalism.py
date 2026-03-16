"""Journalism pipeline — LangGraph StateGraph with revision loop."""

from __future__ import annotations

import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from press import extract_published_content, slugify
from press.agents import Agent, run_parallel
from press.graphs.state import JournalismState
from press.models import ModelPool, TeamRole
from press import prompts
from press.publisher import publish as publish_post

logger = logging.getLogger(__name__)


def build_journalism_graph(pool: ModelPool):
    """Build the Journalism pipeline StateGraph.

    Flow: research_and_seo -> write -> edit --(approve)--> publish
                                         |                    |
                                         +-(revise & <1)-> revise -> edit
                                         |
                                         +-(revise & >=1)-> save_final
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

        # Save artifacts
        research_dir = Path(output_dir) / "research"
        research_dir.mkdir(parents=True, exist_ok=True)
        (research_dir / f"{slug}-research.md").write_text(research_output)
        (research_dir / f"{slug}-seo.md").write_text(seo_output)

        return {"research_output": research_output, "seo_output": seo_output}

    async def write(state: JournalismState) -> dict:
        writer = Agent(
            "journalist-writer",
            prompts.journalism_writer(),
            pool.for_role(TeamRole.REASONER),
        )
        writer_input = (
            f"## Research Brief\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}"
        )
        draft = await writer.run(writer_input)

        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["topic"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}.md").write_text(draft)

        return {"draft": draft}

    async def edit(state: JournalismState) -> dict:
        rounds = state.get("revision_rounds", 0)
        editor = Agent(
            f"journalist-editor-r{rounds}",
            prompts.journalism_editor(),
            pool.for_role(TeamRole.REVIEWER),
        )
        editor_input = (
            f"## Draft\n\n{state['draft']}\n\n"
            f"---\n\n## Research Brief\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}"
        )
        editor_output = await editor.run(editor_input)
        approved = "APPROVE" in editor_output or "status: published" in editor_output

        return {"editor_output": editor_output, "approved": approved}

    async def revise(state: JournalismState) -> dict:
        rounds = state.get("revision_rounds", 0) + 1
        logger.info("Editor requested revision — round %d", rounds)
        writer = Agent(
            f"journalist-writer-r{rounds}",
            prompts.journalism_writer(),
            pool.for_role(TeamRole.REASONER),
        )
        revision_input = (
            f"## Revision Notes from Editor\n\n{state['editor_output']}\n\n"
            f"---\n\n## Original Research Brief\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}\n\n"
            f"---\n\n## Previous Draft (revise this, don't start from scratch)\n\n{state['draft']}"
        )
        draft = await writer.run(revision_input)

        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["topic"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-revisions.md").write_text(state["editor_output"])
        (drafts_dir / f"{slug}.md").write_text(draft)

        return {"draft": draft, "revision_rounds": rounds}

    async def publish_node(state: JournalismState) -> dict:
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["topic"])
        published_dir = Path(output_dir) / "published"
        published_dir.mkdir(parents=True, exist_ok=True)
        content = extract_published_content(state["editor_output"], state["draft"])
        (published_dir / f"{slug}.md").write_text(content)

        if state.get("publish"):
            publish_post(
                content,
                state["topic"],
                git_push=state.get("git_push", False),
                deploy=True,
            )

        return {}

    async def save_final(state: JournalismState) -> dict:
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["topic"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-revisions.md").write_text(state["editor_output"])
        return {}

    def should_revise(state: JournalismState) -> str:
        if state.get("approved"):
            return "publish"
        if state.get("revision_rounds", 0) >= 1:
            return "save_final"
        return "revise"

    # Build graph
    graph.add_node("research_and_seo", research_and_seo)
    graph.add_node("write", write)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final)

    graph.add_edge(START, "research_and_seo")
    graph.add_edge("research_and_seo", "write")
    graph.add_edge("write", "edit")
    graph.add_conditional_edges(
        "edit",
        should_revise,
        {"publish": "publish", "save_final": "save_final", "revise": "revise"},
    )
    graph.add_edge("revise", "edit")
    graph.add_edge("publish", END)
    graph.add_edge("save_final", END)

    return graph.compile()
