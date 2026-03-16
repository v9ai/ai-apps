"""Blog pipeline — LangGraph StateGraph with fan-out over topics."""

from __future__ import annotations

import asyncio
import json
import logging
from pathlib import Path

from langgraph.graph import END, START, StateGraph

from agentic_press import slugify, strip_fences
from agentic_press.agents import Agent, run_parallel
from agentic_press.graphs.state import BlogState
from agentic_press.models import ModelPool, TeamRole
from agentic_press import prompts
from agentic_press.publisher import publish as publish_post
from agentic_press.research import ResearchConfig, research_phase

logger = logging.getLogger(__name__)


def build_blog_graph(
    pool: ModelPool,
    research_config: ResearchConfig | None = None,
):
    """Build the Blog pipeline StateGraph.

    Flow: scout -> pick -> process_topics -> END
    """
    graph = StateGraph(BlogState)

    async def scout_node(state: BlogState) -> dict:
        niche = state["niche"]
        output_dir = state.get("output_dir", "./drafts")
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        agent = Agent("scout", prompts.scout(niche), pool.for_role(TeamRole.FAST))
        scout_output = await agent.run(f"Find 5 trending topics in this niche: {niche}")

        (Path(output_dir) / "01_scout_topics.md").write_text(scout_output)
        return {"scout_output": scout_output}

    async def pick_node(state: BlogState) -> dict:
        niche = state["niche"]
        count = state.get("count", 1)
        output_dir = state.get("output_dir", "./drafts")

        agent = Agent(
            "picker", prompts.picker(niche, count), pool.for_role(TeamRole.FAST)
        )
        picker_output = await agent.run(state["scout_output"])

        (Path(output_dir) / "02_picker_selection.json").write_text(picker_output)
        return {"picker_output": picker_output}

    async def process_topics(state: BlogState) -> dict:
        niche = state["niche"]
        count = state.get("count", 1)
        output_dir = state.get("output_dir", "./drafts")
        do_publish = state.get("publish", False)

        cleaned = strip_fences(state["picker_output"])
        selections = json.loads(cleaned)

        async def process_one(i: int, sel: dict) -> dict:
            topic = sel["topic"]
            angle = sel.get("angle", "")
            slug = slugify(topic)
            topic_dir = Path(output_dir) / slug
            topic_dir.mkdir(parents=True, exist_ok=True)

            # Research
            paper_count = 0
            if research_config:
                from agentic_press.research import research_phase as rp
                output = await rp(
                    topic, angle, niche, research_config, pool.for_role(TeamRole.REASONER)
                )
                notes = output.notes
                paper_count = output.paper_count
            else:
                researcher = Agent(
                    f"researcher[{i}]",
                    prompts.researcher(niche),
                    pool.for_role(TeamRole.REASONER),
                )
                notes = await researcher.run(f"Topic: {topic}\nAngle: {angle}\n")

            (topic_dir / "research.md").write_text(notes)

            # Writer + LinkedIn in parallel
            writer_agent = Agent(
                f"writer[{i}]", prompts.writer(), pool.for_role(TeamRole.REASONER)
            )
            linkedin_agent = Agent(
                f"linkedin[{i}]", prompts.linkedin(), pool.for_role(TeamRole.FAST)
            )
            blog, li = await run_parallel(writer_agent, linkedin_agent, notes)

            (topic_dir / "blog.md").write_text(blog)
            (topic_dir / "linkedin.md").write_text(li)

            if do_publish:
                publish_post(blog, topic, deploy=True)

            return {
                "topic": topic,
                "slug": slug,
                "blog": blog,
                "linkedin": li,
                "paper_count": paper_count,
            }

        tasks = [
            process_one(i, sel) for i, sel in enumerate(selections[:count])
        ]
        topics = await asyncio.gather(*tasks)
        return {"topics": list(topics)}

    # Build graph
    graph.add_node("scout", scout_node)
    graph.add_node("pick", pick_node)
    graph.add_node("process_topics", process_topics)

    graph.add_edge(START, "scout")
    graph.add_edge("scout", "pick")
    graph.add_edge("pick", "process_topics")
    graph.add_edge("process_topics", END)

    return graph.compile()
