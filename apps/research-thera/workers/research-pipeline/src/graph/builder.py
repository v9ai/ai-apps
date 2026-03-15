"""Sequential research pipeline runner — replaces LangGraph StateGraph.

The pipeline is purely linear (no branches/loops), so a simple sequential
runner eliminates the langgraph + langchain-core + checkpoint + xxhash +
ormsgpack dependency chain while preserving identical behaviour.
"""

from __future__ import annotations

from graph.nodes.enrich_abstracts import make_enrich_abstracts
from graph.nodes.extract_candidates import make_extract_candidates
from graph.nodes.load_context import make_load_context
from graph.nodes.normalize_goal import make_normalize_goal
from graph.nodes.persist import make_persist
from graph.nodes.plan_query import make_plan_query
from graph.nodes.search import make_search


async def run_pipeline(initial_state: dict, settings: dict) -> dict:
    """Execute the research pipeline sequentially."""
    state = dict(initial_state)

    steps = [
        make_load_context(settings),
        make_normalize_goal(settings),
        make_plan_query(settings),
        make_search(settings),
        make_enrich_abstracts(settings),
        make_extract_candidates(settings),
        make_persist(settings),
    ]

    for step in steps:
        result = await step(state)
        state.update(result)

    return state
