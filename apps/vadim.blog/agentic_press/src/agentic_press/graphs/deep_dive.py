"""Deep-dive pipeline — LangGraph StateGraph with revision loop and LinkedIn."""

from __future__ import annotations

import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from agentic_press import extract_published_content, slugify
from agentic_press.agents import Agent, run_parallel
from agentic_press.graphs.state import DeepDiveState
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts
from agentic_press.publisher import publish as publish_post
from agentic_press.research import ResearchConfig, research_phase

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
            import asyncio
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
            research_output, seo_output = await run_parallel(
                researcher, seo_agent, research_input
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

    async def write(state: DeepDiveState) -> dict:
        title = state["title"]
        writer = Agent(
            "deep-dive-writer",
            prompts.deep_dive_writer(title),
            pool.for_role(TeamRole.REASONER),
        )
        writer_input = (
            f"## Source Article\n\n{state['source_content']}\n\n"
            f"---\n\n## Academic Research\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}"
        )
        draft = await writer.run(writer_input)

        output_dir = state.get("output_dir", "./articles")
        slug = slugify(title)
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}.md").write_text(draft)

        return {"draft": draft}

    async def edit(state: DeepDiveState) -> dict:
        rounds = state.get("revision_rounds", 0)
        editor = Agent(
            f"deep-dive-editor-r{rounds}",
            prompts.deep_dive_editor(),
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

    async def revise(state: DeepDiveState) -> dict:
        title = state["title"]
        rounds = state.get("revision_rounds", 0) + 1
        logger.info("Editor requested revision — round %d", rounds)
        writer = Agent(
            f"deep-dive-writer-r{rounds}",
            prompts.deep_dive_writer(title),
            pool.for_role(TeamRole.REASONER),
        )
        revision_input = (
            f"## Revision Notes from Editor\n\n{state['editor_output']}\n\n"
            f"---\n\n## Source Article\n\n{state['source_content']}\n\n"
            f"---\n\n## Academic Research\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}\n\n"
            f"---\n\n## Previous Draft (revise this, don't start from scratch)\n\n{state['draft']}"
        )
        draft = await writer.run(revision_input)

        output_dir = state.get("output_dir", "./articles")
        slug = slugify(title)
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-revisions.md").write_text(state["editor_output"])
        (drafts_dir / f"{slug}.md").write_text(draft)

        return {"draft": draft, "revision_rounds": rounds}

    async def linkedin_node(state: DeepDiveState) -> dict:
        content = (
            extract_published_content(state["editor_output"], state["draft"])
            if state.get("approved")
            else state["draft"]
        )
        agent = Agent(
            "deep-dive-linkedin",
            prompts.linkedin(),
            pool.for_role(TeamRole.FAST),
        )
        linkedin = await agent.run(content)

        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["title"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-linkedin.md").write_text(linkedin)

        return {"linkedin": linkedin}

    async def publish_node(state: DeepDiveState) -> dict:
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["title"])
        published_dir = Path(output_dir) / "published"
        published_dir.mkdir(parents=True, exist_ok=True)
        content = extract_published_content(state["editor_output"], state["draft"])
        (published_dir / f"{slug}.md").write_text(content)

        if state.get("publish"):
            publish_post(
                content,
                state["title"],
                git_push=state.get("git_push", False),
                deploy=True,
            )

        return {}

    async def save_final(state: DeepDiveState) -> dict:
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["title"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-revisions.md").write_text(state["editor_output"])
        return {}

    def should_revise(state: DeepDiveState) -> str:
        if state.get("approved"):
            return "linkedin_approved"
        if state.get("revision_rounds", 0) >= 1:
            return "linkedin_final"
        return "revise"

    # Build graph
    graph.add_node("read_source", read_source)
    graph.add_node("research_and_seo", research_and_seo)
    graph.add_node("write", write)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("linkedin_approved", linkedin_node)
    graph.add_node("linkedin_final", linkedin_node)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final)

    graph.add_edge(START, "read_source")
    graph.add_edge("read_source", "research_and_seo")
    graph.add_edge("research_and_seo", "write")
    graph.add_edge("write", "edit")
    graph.add_conditional_edges(
        "edit",
        should_revise,
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
