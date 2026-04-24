# Re-export hub for the research container.
#
# Five of the six source graphs already expose a compiled ``graph`` symbol
# (``research_agent_graph``, ``lead_papers_graph``, ``common_crawl_graph``,
# ``agentic_search_graph`` [search + discovery], ``gh_patterns_graph``).
# ``scholar_graph`` is a CLI module with no LangGraph — we wrap its
# functions in :mod:`research_graphs.scholar`.
from __future__ import annotations

from leadgen_agent.agentic_search_graph import (
    discovery_graph as agentic_discovery_graph,
    graph as agentic_search_graph,
)
from leadgen_agent.common_crawl_graph import graph as common_crawl_graph
from leadgen_agent.gh_patterns_graph import graph as gh_patterns_graph
from leadgen_agent.lead_papers_graph import graph as lead_papers_graph
from leadgen_agent.research_agent_graph import graph as research_agent_graph

from .scholar import graph as scholar_graph

__all__ = [
    "agentic_discovery_graph",
    "agentic_search_graph",
    "common_crawl_graph",
    "gh_patterns_graph",
    "lead_papers_graph",
    "research_agent_graph",
    "scholar_graph",
]
