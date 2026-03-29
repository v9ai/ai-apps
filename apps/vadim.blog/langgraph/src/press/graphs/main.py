"""Main orchestrator — unified LangGraph StateGraph that dispatches to sub-pipelines.

Flow:
    START -> route -> <sub-pipeline> -> END
"""

from __future__ import annotations

import logging

from langgraph.graph import END, START, StateGraph

from press.graphs.article import build_article_graph
from press.graphs.blog import build_blog_graph
from press.graphs.counter_article import build_counter_article_graph
from press.graphs.review import build_review_graph
from press.graphs.state import PressInputState, PressState
from press.models import ModelPool

logger = logging.getLogger(__name__)

_PIPELINE_NAMES = ("blog", "article", "counter", "review")


def build_main_graph(pool: ModelPool):
    """Build the unified Press orchestrator graph."""

    sub_graphs = {
        "blog": build_blog_graph(pool),
        "article": build_article_graph(pool),
        "counter": build_counter_article_graph(pool),
        "review": build_review_graph(pool),
    }

    graph = StateGraph(PressState, input_schema=PressInputState)

    async def run_blog(state: PressState) -> dict:
        return await sub_graphs["blog"].ainvoke(dict(state))

    async def run_article(state: PressState) -> dict:
        return await sub_graphs["article"].ainvoke(dict(state))

    async def run_counter(state: PressState) -> dict:
        return await sub_graphs["counter"].ainvoke(dict(state))

    async def run_review(state: PressState) -> dict:
        return await sub_graphs["review"].ainvoke(dict(state))

    def route_pipeline(state: PressState) -> str:
        pipeline = state.get("pipeline", "")
        if pipeline not in _PIPELINE_NAMES:
            available = ", ".join(_PIPELINE_NAMES)
            raise ValueError(
                f"Unknown pipeline {pipeline!r}. Set 'pipeline' to one of: {available}"
            )
        logger.info("Routing to pipeline: %s", pipeline)
        return pipeline

    graph.add_node("blog", run_blog)
    graph.add_node("article", run_article)
    graph.add_node("counter", run_counter)
    graph.add_node("review", run_review)

    graph.add_conditional_edges(
        START,
        route_pipeline,
        {name: name for name in _PIPELINE_NAMES},
    )

    for name in _PIPELINE_NAMES:
        graph.add_edge(name, END)

    return graph.compile()
