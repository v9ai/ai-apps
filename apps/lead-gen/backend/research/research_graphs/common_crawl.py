"""``common_crawl`` graph wrapper for the research container.

The source graph in ``leadgen_agent.common_crawl_graph`` compiles at import
time without a checkpointer and exposes only the ``graph`` symbol — fine
for utility batch use, but the research container wants checkpointed runs
so a long crawl can resume across restarts. This module re-builds that
graph using the underlying ``fetch_domain`` helper and wires the supplied
checkpointer in.

The CF Container wall-clock cap (~5 min) bounds how many pages a single
crawl can finish; the registry references ``build_graph`` so the FastAPI
lifespan can pass its ``AsyncPostgresSaver``.
"""

from __future__ import annotations

import logging
from typing import Any

from langgraph.graph import END, START, StateGraph

from leadgen_agent.common_crawl_graph import fetch_domain

log = logging.getLogger("leadgen_research.common_crawl")

# A WARC fetch averages ~2–4s per record at WARC_CONCURRENCY=8, so anything
# beyond ~80 pages cannot reliably finish before the Container is killed.
# The single-node graph has no checkpoint-resume mid-fetch, so we cap
# aggressively here and fail fast instead of silently truncating.
_COMMON_CRAWL_MAX_PAGES_LIMIT = 80


async def _run_node(state: dict[str, Any]) -> dict[str, Any]:
    domain = state.get("domain")
    if not isinstance(domain, str) or not domain:
        raise ValueError("domain is required")
    max_pages = int(state.get("max_pages") or 15)
    if max_pages > _COMMON_CRAWL_MAX_PAGES_LIMIT:
        log.warning(
            "common_crawl: capping max_pages from %s to %s "
            "(CF Container wall-clock budget)",
            max_pages,
            _COMMON_CRAWL_MAX_PAGES_LIMIT,
        )
        max_pages = _COMMON_CRAWL_MAX_PAGES_LIMIT
    if max_pages < 1:
        raise ValueError("max_pages must be >= 1")
    dry_run = bool(state.get("dry_run") or False)
    stats = await fetch_domain(domain, max_pages, dry_run)
    return {
        "stats": {
            "domain": stats.domain,
            "crawl_id": stats.crawl_id,
            "pages_fetched": stats.pages_fetched,
            "pages_skipped_dedup": stats.pages_skipped_dedup,
            "persons_found": stats.persons_found,
            "emails_found": stats.emails_found,
            "contacts_upserted": stats.contacts_upserted,
            "snapshots_written": stats.snapshots_written,
        }
    }


def build_graph(checkpointer: Any = None) -> Any:
    g: StateGraph = StateGraph(dict)
    g.add_node("run", _run_node)
    g.add_edge(START, "run")
    g.add_edge("run", END)
    return g.compile(checkpointer=checkpointer)


graph = build_graph()
