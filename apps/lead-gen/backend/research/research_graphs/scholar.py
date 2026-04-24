# LangGraph wrapper for leadgen_agent.scholar_graph.
#
# scholar_graph.py is a CLI-only module today (argparse + sync psycopg). The
# research container exposes its operations over HTTP, so we build a
# single-node StateGraph that dispatches on ``command`` and calls the module's
# existing functions. Output is validated against contracts.ScholarOutput.
#
# Kept intentionally small: no new business logic here, just marshalling
# between the HTTP contract and the CLI functions.
from __future__ import annotations

import asyncio
import logging
from typing import Any, TypedDict

from langgraph.graph import END, START, StateGraph

from leadgen_agent import scholar_graph as _scholar

log = logging.getLogger(__name__)


class ScholarState(TypedDict, total=False):
    # input
    command: str              # migrate | import_arxiv | coauthors | authors | papers | seed
    arxiv_id: str | None
    author_id: int | None
    # output
    ok: bool
    message: str
    payload: dict[str, Any]
    error: str | None


async def _dispatch(state: ScholarState) -> dict[str, Any]:
    command = (state.get("command") or "").strip().lower()
    loop = asyncio.get_running_loop()

    try:
        if command == "migrate":
            await loop.run_in_executor(None, _scholar.migrate)
            return {
                "ok": True,
                "message": "tables created",
                "payload": {"migrated": True},
            }

        if command == "import_arxiv":
            arxiv_id = (state.get("arxiv_id") or "").strip()
            if not arxiv_id:
                return {"ok": False, "message": "arxiv_id required", "payload": {}}
            result = await loop.run_in_executor(None, _scholar.import_arxiv, arxiv_id)
            return {
                "ok": True,
                "message": f"imported {result.title}",
                "payload": {
                    "paper_id": result.paper_id,
                    "title": result.title,
                    "authors_linked": result.authors_linked,
                },
            }

        if command == "coauthors":
            author_id = state.get("author_id")
            if author_id is None:
                return {"ok": False, "message": "author_id required", "payload": {}}
            edges = await loop.run_in_executor(None, _scholar.coauthors, int(author_id))
            return {
                "ok": True,
                "message": f"{len(edges)} co-authors",
                "payload": {
                    "edges": [
                        {
                            "author_id": e.author_id,
                            "author_name": e.author_name,
                            "shared_papers": e.shared_papers,
                        }
                        for e in edges
                    ]
                },
            }

        if command == "authors":
            authors = await loop.run_in_executor(None, _scholar.list_authors)
            return {
                "ok": True,
                "message": f"{len(authors)} authors",
                "payload": {
                    "authors": [
                        {**author, "paper_count": count} for author, count in authors
                    ]
                },
            }

        if command == "papers":
            papers = await loop.run_in_executor(None, _scholar.list_papers)
            return {
                "ok": True,
                "message": f"{len(papers)} papers",
                "payload": {"papers": papers},
            }

        if command == "seed":
            result = await loop.run_in_executor(None, _scholar.seed_scrapegraphai)
            return {
                "ok": True,
                "message": f"seeded {result.title}",
                "payload": {
                    "paper_id": result.paper_id,
                    "title": result.title,
                    "authors_linked": result.authors_linked,
                },
            }

        return {
            "ok": False,
            "message": f"unknown command: {command!r}",
            "payload": {},
            "error": f"unknown command: {command!r}",
        }
    except Exception as exc:  # noqa: BLE001 — surface over HTTP
        log.exception("scholar dispatch failed: %s", command)
        return {
            "ok": False,
            "message": str(exc)[:500],
            "payload": {},
            "error": str(exc)[:500],
        }


def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(ScholarState)
    builder.add_node("dispatch", _dispatch)
    builder.add_edge(START, "dispatch")
    builder.add_edge("dispatch", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()

__all__ = ["ScholarState", "build_graph", "graph"]
