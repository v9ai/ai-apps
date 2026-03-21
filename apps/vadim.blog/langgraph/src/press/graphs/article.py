"""Article pipeline — unified journalism + deep-dive graph.

If ``input_file`` is provided, runs in deep-dive mode:
  read_source -> research_and_seo (papers + editorial + SEO) -> write (2500-3500w)
  -> check_references -> edit -> [linkedin -> publish | revise | linkedin -> save_final]

If only ``topic`` is provided, runs in journalism mode:
  research_and_seo (editorial + SEO) -> write (1200-1800w)
  -> check_references -> edit -> [linkedin -> publish | revise | linkedin -> save_final]

Both modes share the same graph structure — the nodes adapt their behaviour
based on whether source material is present in state.
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from press import slugify
from press.agents import Agent
from press.graphs.nodes import (
    check_references_node,
    make_edit_node,
    make_linkedin_node,
    make_revise_node,
    make_write_node,
    publish_node,
    save_final_node,
    should_revise_with_linkedin,
)
from press.graphs.state import ArticleState
from press.models import ModelPool, TeamRole
from press import prompts
from press.papers.editorial import search_editorial
from press.research import ResearchConfig, format_editorial_digest, research_phase

logger = logging.getLogger(__name__)


def _is_deep_dive(state: dict) -> bool:
    return bool(state.get("input_file") or state.get("source_content"))


def _topic_or_title(state: dict) -> str:
    return state.get("title") or state.get("topic", "")


def build_article_graph(pool: ModelPool):
    """Build the unified Article pipeline StateGraph."""
    graph = StateGraph(ArticleState)

    # ── Nodes ────────────────────────────────────────────────────────────

    async def read_source(state: ArticleState) -> dict:
        """Read source file if provided (deep-dive mode). No-op for journalism."""
        if not state.get("input_file"):
            return {}
        content = Path(state["input_file"]).read_text()
        logger.info("Read %d chars from %s", len(content), state["input_file"])
        return {"source_content": content}

    async def research_and_seo(state: ArticleState) -> dict:
        topic = _topic_or_title(state)
        niche = state.get("niche", topic)
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(topic)
        deep_dive = _is_deep_dive(state)
        enable_paper_search = state.get("enable_paper_search", deep_dive)

        # SEO agents (always run)
        seo_disc = Agent(
            "article-seo-discovery",
            prompts.seo_discovery(topic),
            pool.for_role(TeamRole.FAST),
        )
        seo_bp = Agent(
            "article-seo-blueprint",
            prompts.seo_blueprint(topic),
            pool.for_role(TeamRole.FAST),
        )
        seo_input = f"Topic: {topic}"

        if enable_paper_search:
            # Deep-dive mode: paper search + editorial + SEO in parallel
            config = ResearchConfig(enable_paper_search=True)
            research_result, seo_disc_out, seo_bp_out = await asyncio.gather(
                research_phase(topic, topic, niche, config, pool.for_role(TeamRole.REASONER)),
                seo_disc.run(seo_input),
                seo_bp.run(seo_input),
            )
            research_output = research_result.notes
            paper_count = research_result.paper_count
        else:
            # Journalism mode: editorial search + SEO in parallel, then researcher
            editorial_results, seo_disc_out, seo_bp_out = await asyncio.gather(
                search_editorial(topic),
                seo_disc.run(seo_input),
                seo_bp.run(seo_input),
            )
            editorial_digest = format_editorial_digest(editorial_results)

            research_input = f"Research this topic: {topic}"
            if editorial_digest:
                research_input += f"\n\n---\n\n{editorial_digest}"

            researcher_prompt = (
                prompts.journalism_researcher_with_editorial(topic)
                if editorial_results
                else prompts.journalism_researcher(topic)
            )
            researcher = Agent(
                "article-researcher",
                researcher_prompt,
                pool.for_role(TeamRole.REASONER),
            )
            research_output = await researcher.run(research_input)
            paper_count = 0

            if editorial_digest:
                research_dir = Path(output_dir) / "research"
                research_dir.mkdir(parents=True, exist_ok=True)
                (research_dir / f"{slug}-editorial.md").write_text(editorial_digest)

        seo_output = f"{seo_disc_out}\n\n---\n\n{seo_bp_out}"

        research_dir = Path(output_dir) / "research"
        research_dir.mkdir(parents=True, exist_ok=True)
        (research_dir / f"{slug}-research.md").write_text(research_output)
        (research_dir / f"{slug}-seo-discovery.md").write_text(seo_disc_out)
        (research_dir / f"{slug}-seo-blueprint.md").write_text(seo_bp_out)

        return {
            "research_output": research_output,
            "seo_output": seo_output,
            "paper_count": paper_count,
        }

    # ── Adaptive writer/editor/revise — prompt depends on mode ───────────

    def _writer_prompt(state: dict) -> str:
        if _is_deep_dive(state):
            return prompts.deep_dive_writer(_topic_or_title(state))
        return prompts.journalism_writer()

    def _editor_prompt(state: dict) -> str:
        if _is_deep_dive(state):
            return prompts.deep_dive_editor()
        return prompts.journalism_editor()

    def _context(state: dict) -> str:
        sections = []
        if state.get("source_content"):
            sections.append(f"## Source Article\n\n{state['source_content']}")
        sections.append(f"## Research Brief\n\n{state['research_output']}")
        sections.append(f"## SEO Strategy\n\n{state['seo_output']}")
        return "\n\n---\n\n".join(sections)

    write = make_write_node(pool, "article-writer", _writer_prompt, _context)
    edit = make_edit_node(pool, "article-editor", _editor_prompt)
    revise = make_revise_node(pool, "article-writer", _writer_prompt, _context)
    linkedin = make_linkedin_node(pool, "article-linkedin")

    # ── Build graph ──────────────────────────────────────────────────────

    graph.add_node("read_source", read_source)
    graph.add_node("research_and_seo", research_and_seo)
    graph.add_node("write", write)
    graph.add_node("check_references", check_references_node)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("linkedin_approved", linkedin)
    graph.add_node("linkedin_final", linkedin)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final_node)

    graph.add_edge(START, "read_source")
    graph.add_edge("read_source", "research_and_seo")
    graph.add_edge("research_and_seo", "write")
    graph.add_edge("write", "check_references")
    graph.add_edge("check_references", "edit")
    graph.add_conditional_edges(
        "edit",
        should_revise_with_linkedin,
        {
            "linkedin_approved": "linkedin_approved",
            "linkedin_final": "linkedin_final",
            "revise": "revise",
        },
    )
    graph.add_edge("revise", "check_references")
    graph.add_edge("linkedin_approved", "publish")
    graph.add_edge("publish", END)
    graph.add_edge("linkedin_final", "save_final")
    graph.add_edge("save_final", END)

    return graph.compile()
