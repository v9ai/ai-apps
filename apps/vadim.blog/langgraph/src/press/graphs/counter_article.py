"""Counter-article pipeline — LangGraph StateGraph.

Fetches a source URL, searches for counter-evidence papers,
writes a research-grounded rebuttal, edits, and publishes.

Flow:
    fetch_source -> research_and_seo -> write -> edit
                                                  |
                                    approve -> linkedin -> publish -> END
                                    revise(<1) -> revise -> edit
                                    revise(>=1) -> linkedin -> save_final -> END
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path

import httpx
from langgraph.graph import END, START, StateGraph

from press import html_to_text, slugify
from press.agents import Agent, run_all
from press.graphs.nodes import (
    make_edit_node,
    make_linkedin_node,
    make_revise_node,
    make_write_node,
    publish_node,
    save_final_node,
    should_revise_with_linkedin,
)
from press.graphs.state import CounterArticleState
from press.models import ModelPool, TeamRole
from press import prompts
from press.research import deduplicate_and_rank, format_paper_digest, search_papers

logger = logging.getLogger(__name__)


def _counter_queries(topic: str) -> list[str]:
    """Generate counter-evidence search queries derived from the topic."""
    return [
        topic,
        f"{topic} empirical research",
        f"{topic} study outcomes",
    ]


def build_counter_article_graph(pool: ModelPool):
    """Build the Counter-Article pipeline StateGraph."""
    graph = StateGraph(CounterArticleState)

    async def fetch_source(state: CounterArticleState) -> dict:
        if state.get("source_content"):
            logger.info("Source content already provided — skipping fetch")
            return {}
        url = state["source_url"]
        logger.info("Fetching source article from %s", url)
        async with httpx.AsyncClient(follow_redirects=True, timeout=30) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
        text = html_to_text(resp.text)
        logger.info("Fetched %d chars from %s", len(text), url)
        return {"source_content": text}

    async def research_and_seo(state: CounterArticleState) -> dict:
        topic = state["topic"]
        source_content = state.get("source_content", "")
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(topic)

        queries = _counter_queries(topic)
        logger.info("Searching for counter-evidence papers (%d queries)...", len(queries))
        paper_results = await asyncio.gather(*[search_papers(q) for q in queries])
        all_papers = [p for papers, _ in paper_results for p in papers]
        unique_papers = deduplicate_and_rank(all_papers, 12)
        paper_digest = format_paper_digest(unique_papers)
        paper_count = len(unique_papers)
        logger.info("Counter-evidence: %d unique papers", paper_count)

        research_input = (
            f"## Source Article (the article you are countering)\n\n{source_content}\n\n"
            f"---\n\n{paper_digest}\n\n"
            f"Counter-research this topic: {topic}"
        )
        seo_input = f"Analyze SEO strategy for a counter-article about: {topic}"

        researcher = Agent(
            "counter-researcher",
            prompts.counter_researcher(topic),
            pool.for_role(TeamRole.REASONER),
        )
        seo_agent = Agent(
            "counter-seo",
            prompts.journalism_seo(topic),
            pool.for_role(TeamRole.FAST),
        )

        research_output, seo_output = await run_all([
            (researcher, research_input),
            (seo_agent, seo_input),
        ])

        research_dir = Path(output_dir) / "research"
        research_dir.mkdir(parents=True, exist_ok=True)
        (research_dir / f"{slug}-counter-research.md").write_text(research_output)
        (research_dir / f"{slug}-counter-seo.md").write_text(seo_output)

        return {
            "research_output": research_output,
            "seo_output": seo_output,
            "paper_count": paper_count,
        }

    def _context(state: dict) -> str:
        return (
            f"## Source Article (what you are countering)\n\n{state.get('source_content', '')}\n\n"
            f"---\n\n## Counter-Research Brief\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}"
        )

    write = make_write_node(
        pool, "counter-writer", lambda _: prompts.counter_writer(), _context
    )
    edit = make_edit_node(
        pool, "counter-editor", lambda _: prompts.journalism_editor()
    )
    revise = make_revise_node(
        pool, "counter-writer", lambda _: prompts.counter_writer(), _context
    )
    linkedin = make_linkedin_node(pool, "counter-linkedin")

    # Build graph
    graph.add_node("fetch_source", fetch_source)
    graph.add_node("research_and_seo", research_and_seo)
    graph.add_node("write", write)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("linkedin_approved", linkedin)
    graph.add_node("linkedin_final", linkedin)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final_node)

    graph.add_edge(START, "fetch_source")
    graph.add_edge("fetch_source", "research_and_seo")
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
