"""Single source of truth for the research container's LangGraph registry.

Both runtimes (``langgraph dev --config research/langgraph.json`` on :8004
and the FastAPI/Cloudflare Containers app at ``research/app.py``) read graph
identity from this module. ``research/langgraph.json`` is generated from
``GRAPHS`` via ``backend/scripts/gen_langgraph_json.py --container research``;
``research/app.py`` imports ``GRAPHS`` directly and compiles each spec at
lifespan startup.

The research container hosts graphs from two module roots:

- ``leadgen_agent.*`` — shared with the core container (research_agent,
  agentic_search [+ discovery], gh_patterns, lead_papers).
- ``research_graphs.*`` — research-only wrappers (scholar, common_crawl).

Three patterns coexist:

- Standard ``build_graph(checkpointer)`` — research_agent, scholar,
  lead_papers, common_crawl.
- Custom builder names from a multi-graph module —
  ``agentic_search_graph`` exposes ``build_search_graph`` /
  ``build_discovery_graph`` and the corresponding ``graph`` /
  ``discovery_graph`` symbols.
- Precompiled-only — ``gh_patterns_graph`` doesn't accept a checkpointer
  argument; state is persisted to its own gh_org_patterns / gh_contributor_*
  tables, so missing checkpoint resume isn't a correctness concern.

Keep this module dependency-free.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GraphSpec:
    assistant_id: str
    module: str
    compiled_attr: str = "graph"
    # ``None`` means the module only exposes a precompiled instance at
    # ``compiled_attr``; the lifespan uses it as-is, no checkpointer wired.
    builder_attr: str | None = "build_graph"


GRAPHS: tuple[GraphSpec, ...] = (
    GraphSpec("research_agent", "leadgen_agent.research_agent_graph"),
    GraphSpec("scholar", "research_graphs.scholar"),
    GraphSpec("lead_papers", "leadgen_agent.lead_papers_graph"),
    GraphSpec(
        "common_crawl",
        "research_graphs.common_crawl",
    ),
    GraphSpec(
        "agentic_search",
        "leadgen_agent.agentic_search_graph",
        builder_attr="build_search_graph",
    ),
    GraphSpec(
        "agentic_discovery",
        "leadgen_agent.agentic_search_graph",
        compiled_attr="discovery_graph",
        builder_attr="build_discovery_graph",
    ),
    # gh_patterns_graph.build_graph() doesn't accept a checkpointer; the
    # graph is stateless from langgraph's perspective (it writes to its own
    # gh_* tables). Use the precompiled instance directly.
    GraphSpec(
        "gh_patterns",
        "leadgen_agent.gh_patterns_graph",
        builder_attr=None,
    ),
)


assert len({g.assistant_id for g in GRAPHS}) == len(GRAPHS), (
    "duplicate assistant_id in research GRAPHS"
)
