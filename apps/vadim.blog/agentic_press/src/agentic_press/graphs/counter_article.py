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
import re
from pathlib import Path

import httpx
from langgraph.graph import END, START, StateGraph

from agentic_press import extract_published_content, slugify
from agentic_press.agents import Agent, run_all
from agentic_press.graphs.state import CounterArticleState
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts
from agentic_press.publisher import publish as publish_post
from agentic_press.research import (
    ResearchConfig,
    deduplicate_and_rank,
    format_paper_digest,
    search_papers,
)

logger = logging.getLogger(__name__)

# Paper search queries targeting counter-evidence for "in-person work is necessary"
_COUNTER_PAPER_QUERIES = [
    "remote work productivity empirical research",
    "distributed software teams collaboration effectiveness",
    "asynchronous communication innovation outcomes",
]


def _html_to_text(html: str) -> str:
    """Strip HTML tags and decode common entities."""
    text = re.sub(r"<style[^>]*>.*?</style>", " ", html, flags=re.S)
    text = re.sub(r"<script[^>]*>.*?</script>", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    for entity, char in [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&nbsp;", " "), ("&#39;", "'"), ("&quot;", '"'),
    ]:
        text = text.replace(entity, char)
    return re.sub(r"\s+", " ", text).strip()


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
        text = _html_to_text(resp.text)
        logger.info("Fetched %d chars from %s", len(text), url)
        return {"source_content": text}

    async def research_and_seo(state: CounterArticleState) -> dict:
        topic = state["topic"]
        source_content = state.get("source_content", "")
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(topic)

        # Search for counter-evidence papers across multiple queries in parallel
        logger.info("Searching for counter-evidence papers (%d queries)...", len(_COUNTER_PAPER_QUERIES))
        paper_results = await asyncio.gather(
            *[search_papers(q) for q in _COUNTER_PAPER_QUERIES]
        )
        all_papers = [p for papers, _ in paper_results for p in papers]
        unique_papers = deduplicate_and_rank(all_papers, 12)
        paper_digest = format_paper_digest(unique_papers)
        paper_count = len(unique_papers)
        logger.info("Counter-evidence: %d unique papers", paper_count)

        # Build shared user input (counter-researcher gets all of it; SEO ignores papers)
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

    async def write(state: CounterArticleState) -> dict:
        writer = Agent(
            "counter-writer",
            prompts.counter_writer(),
            pool.for_role(TeamRole.REASONER),
        )
        writer_input = (
            f"## Source Article (what you are countering)\n\n{state.get('source_content', '')}\n\n"
            f"---\n\n## Counter-Research Brief\n\n{state['research_output']}\n\n"
            f"---\n\n## SEO Strategy\n\n{state['seo_output']}"
        )
        draft = await writer.run(writer_input)

        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["topic"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}.md").write_text(draft)

        return {"draft": draft}

    async def edit(state: CounterArticleState) -> dict:
        rounds = state.get("revision_rounds", 0)
        editor = Agent(
            f"counter-editor-r{rounds}",
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

    async def revise(state: CounterArticleState) -> dict:
        rounds = state.get("revision_rounds", 0) + 1
        logger.info("Editor requested revision — round %d", rounds)
        writer = Agent(
            f"counter-writer-r{rounds}",
            prompts.counter_writer(),
            pool.for_role(TeamRole.REASONER),
        )
        revision_input = (
            f"## Revision Notes from Editor\n\n{state['editor_output']}\n\n"
            f"---\n\n## Source Article\n\n{state.get('source_content', '')}\n\n"
            f"---\n\n## Counter-Research Brief\n\n{state['research_output']}\n\n"
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

    async def linkedin_node(state: CounterArticleState) -> dict:
        content = (
            extract_published_content(state["editor_output"], state["draft"])
            if state.get("approved")
            else state["draft"]
        )
        agent = Agent(
            "counter-linkedin",
            prompts.linkedin(),
            pool.for_role(TeamRole.FAST),
        )
        linkedin = await agent.run(content)

        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["topic"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-linkedin.md").write_text(linkedin)

        return {"linkedin": linkedin}

    async def publish_node(state: CounterArticleState) -> dict:
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

    async def save_final(state: CounterArticleState) -> dict:
        output_dir = state.get("output_dir", "./articles")
        slug = slugify(state["topic"])
        drafts_dir = Path(output_dir) / "drafts"
        drafts_dir.mkdir(parents=True, exist_ok=True)
        (drafts_dir / f"{slug}-revisions.md").write_text(state["editor_output"])
        return {}

    def should_revise(state: CounterArticleState) -> str:
        if state.get("approved"):
            return "linkedin_approved"
        if state.get("revision_rounds", 0) >= 1:
            return "linkedin_final"
        return "revise"

    # Build graph
    graph.add_node("fetch_source", fetch_source)
    graph.add_node("research_and_seo", research_and_seo)
    graph.add_node("write", write)
    graph.add_node("edit", edit)
    graph.add_node("revise", revise)
    graph.add_node("linkedin_approved", linkedin_node)
    graph.add_node("linkedin_final", linkedin_node)
    graph.add_node("publish", publish_node)
    graph.add_node("save_final", save_final)

    graph.add_edge(START, "fetch_source")
    graph.add_edge("fetch_source", "research_and_seo")
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
