"""Vertical-agnostic GitHub code-search harvester.

Generic replacement for the old ``ingestible_discovery_graph``. Takes a
``vertical_slug`` via state, looks up the ``ProductVertical`` in the
registry, and runs its ``github_code_queries`` against ``GET /search/code``.
Filters against ``github_owner_deny`` + ``github_filter_out`` from the same
registry. Returns surviving hits ready for Stage 2 (org-to-company
resolution) to consume.

Adding a new product's discovery pass is a one-file change in
``verticals/<slug>.py`` — no change needed here.

Rate-limit notes (GitHub REST):
- ``/search/code`` bucket: **30 req/min authenticated, 10/min unauthenticated**.
  We respect it with a sleep between pages. Unlike other REST endpoints,
  code-search requires auth — unauthenticated requests return 401.
  ``GITHUB_TOKEN`` is required.
"""

from __future__ import annotations

import asyncio
import os
import re
import time
from typing import Annotated, Any, TypedDict

import httpx
from langgraph.graph import END, START, StateGraph

from .verticals import ProductVertical, get_vertical


# ── State ─────────────────────────────────────────────────────────────────

def _first_error(left: str | None, right: str | None) -> str | None:
    return left or right


def _extend(left: list | None, right: list | None) -> list:
    return (left or []) + (right or [])


class VerticalDiscoveryState(TypedDict, total=False):
    # Inputs
    vertical_slug: str                # required — picks which ProductVertical to run
    max_pages_per_query: int          # default 3
    max_total_results: int            # default 1000
    queries: list[str] | None         # optional override of vertical.github_code_queries

    # Outputs
    raw_hits: Annotated[list[dict], _extend]
    filtered_hits: Annotated[list[dict], _extend]
    summary: dict[str, Any]

    _error: Annotated[str, _first_error]
    agent_timings: dict[str, float]


# ── Constants ─────────────────────────────────────────────────────────────

_GITHUB_API = "https://api.github.com"
_PER_PAGE = 100
_SEARCH_RATE_SLEEP = 2.1   # seconds between /search/code calls → under 30/min
_DEFAULT_MAX_PAGES = 3
_DEFAULT_MAX_TOTAL = 1000


# ── Helpers ───────────────────────────────────────────────────────────────

def _github_headers() -> dict[str, str]:
    headers = {
        "User-Agent": "lead-gen-vertical-discovery/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def _classify_stack(vertical: ProductVertical, text_sample: str) -> str | None:
    """Pick a ``rag_stack_detected``-style label from the text sample.

    Runs the vertical's label-kind signal rules against the text. Returns
    the first matching label (or None). Used during code-search result
    normalization so each hit carries a ``stack_label`` for Stage 2 to
    write into ``company_product_signals.signals``.
    """
    for rule in vertical.signal_rules:
        if rule.kind != "label" or not rule.label:
            continue
        if rule.pattern.search(text_sample):
            return rule.label
    return None


def _is_filtered_out(
    vertical: ProductVertical, repo_name: str, owner: str, description: str
) -> bool:
    """Return True if this hit should be dropped as vendor/tutorial/fork noise."""
    if owner.lower() in {o.lower() for o in vertical.github_owner_deny}:
        return True
    haystack = f"{repo_name} {description or ''}"
    for pat in vertical.github_filter_out:
        if pat.search(haystack):
            return True
    return False


# ── Nodes ─────────────────────────────────────────────────────────────────

async def fetch_code_search(state: VerticalDiscoveryState) -> dict:
    """Run GitHub code search for each configured query, paginate, collect hits.

    Respects the 30 req/min code-search bucket via a sleep between calls.
    Caps at ``max_pages_per_query × len(queries)`` API calls and
    ``max_total_results`` rows. Bails cleanly on 401 / 403 / 422.
    """
    t0 = time.perf_counter()
    slug = state.get("vertical_slug")
    if not slug:
        return {"_error": "fetch_code_search: vertical_slug is required"}
    try:
        vertical = get_vertical(slug)
    except KeyError as e:
        return {"_error": f"fetch_code_search: {e}"}

    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        return {"_error": "fetch_code_search: GITHUB_TOKEN is required for /search/code"}

    queries: list[str] = list(state.get("queries") or vertical.github_code_queries)
    max_pages = int(state.get("max_pages_per_query") or _DEFAULT_MAX_PAGES)
    max_total = int(state.get("max_total_results") or _DEFAULT_MAX_TOTAL)

    hits: list[dict] = []
    seen_repo_ids: set[int] = set()

    async with httpx.AsyncClient(
        base_url=_GITHUB_API,
        headers=_github_headers(),
        timeout=httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=10.0),
    ) as client:
        for query in queries:
            if len(hits) >= max_total:
                break
            for page in range(1, max_pages + 1):
                if len(hits) >= max_total:
                    break
                try:
                    res = await client.get(
                        "/search/code",
                        params={"q": query, "per_page": _PER_PAGE, "page": page},
                    )
                except httpx.HTTPError as e:
                    hits.append(
                        {"_error": f"http error on query={query!r} page={page}: {e}"}
                    )
                    break

                if res.status_code == 401:
                    return {"_error": "fetch_code_search: 401 — GITHUB_TOKEN invalid or expired"}
                if res.status_code == 403:
                    retry_after = int(res.headers.get("Retry-After", "60"))
                    await asyncio.sleep(min(retry_after, 60))
                    break
                if res.status_code == 422:
                    break
                if res.status_code != 200:
                    break

                payload = res.json() or {}
                items = payload.get("items") or []
                if not items:
                    break

                for item in items:
                    if len(hits) >= max_total:
                        break
                    repo = item.get("repository") or {}
                    repo_id = repo.get("id")
                    if repo_id is None or repo_id in seen_repo_ids:
                        continue
                    seen_repo_ids.add(repo_id)

                    path = item.get("path") or ""
                    owner_obj = repo.get("owner") or {}
                    owner = (owner_obj.get("login") or "").strip()
                    text_sample = " ".join([path, query])
                    stack_label = _classify_stack(vertical, text_sample)

                    hits.append(
                        {
                            "vertical_slug": slug,
                            "owner": owner,
                            "owner_type": owner_obj.get("type") or "",
                            "repo_name": repo.get("name") or "",
                            "repo_full_name": repo.get("full_name") or "",
                            "repo_description": repo.get("description") or "",
                            "repo_url": repo.get("html_url") or "",
                            "stars": int(repo.get("stargazers_count") or 0),
                            "is_fork": bool(repo.get("fork")),
                            "path": path,
                            "matched_query": query,
                            "stack_label": stack_label,
                        }
                    )

                await asyncio.sleep(_SEARCH_RATE_SLEEP)

    return {
        "raw_hits": hits,
        "agent_timings": {"fetch_code_search": round(time.perf_counter() - t0, 3)},
    }


async def filter_hits(state: VerticalDiscoveryState) -> dict:
    """Drop forks, tutorials, courses, vendor orgs. Enforce unique (owner, repo).

    Also enforces ``stack_label IS NOT NULL`` so Stage 2 knows which label
    to put in ``company_product_signals.signals.rag_stack_detected``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    slug = state.get("vertical_slug")
    if not slug:
        return {}
    try:
        vertical = get_vertical(slug)
    except KeyError:
        return {}

    raw = state.get("raw_hits") or []
    seen_pairs: set[tuple[str, str]] = set()
    filtered: list[dict] = []

    for hit in raw:
        if "_error" in hit:
            continue
        owner = hit.get("owner") or ""
        repo_full = hit.get("repo_full_name") or ""
        if not owner or not repo_full:
            continue
        if hit.get("is_fork"):
            continue
        if _is_filtered_out(
            vertical, hit.get("repo_name") or "", owner, hit.get("repo_description") or ""
        ):
            continue
        if hit.get("stack_label") is None:
            continue
        key = (owner.lower(), repo_full.lower())
        if key in seen_pairs:
            continue
        seen_pairs.add(key)
        filtered.append(hit)

    return {
        "filtered_hits": filtered,
        "agent_timings": {"filter_hits": round(time.perf_counter() - t0, 3)},
    }


async def build_summary(state: VerticalDiscoveryState) -> dict:
    """Terminal node — assemble a run summary for the caller."""
    raw = state.get("raw_hits") or []
    filtered = state.get("filtered_hits") or []

    by_stack: dict[str, int] = {}
    for hit in filtered:
        label = hit.get("stack_label") or "unknown"
        by_stack[label] = by_stack.get(label, 0) + 1

    unique_orgs = sorted({hit["owner"] for hit in filtered if hit.get("owner")})
    errors = [hit.get("_error") for hit in raw if isinstance(hit, dict) and "_error" in hit]

    summary = {
        "vertical_slug": state.get("vertical_slug"),
        "raw_count": len([h for h in raw if "_error" not in h]),
        "filtered_count": len(filtered),
        "unique_orgs": unique_orgs,
        "by_stack": by_stack,
        "errors": errors,
    }
    return {"summary": summary}


# ── Graph ─────────────────────────────────────────────────────────────────

def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(VerticalDiscoveryState)
    builder.add_node("fetch_code_search", fetch_code_search)
    builder.add_node("filter_hits", filter_hits)
    builder.add_node("build_summary", build_summary)
    builder.add_edge(START, "fetch_code_search")
    builder.add_edge("fetch_code_search", "filter_hits")
    builder.add_edge("filter_hits", "build_summary")
    builder.add_edge("build_summary", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()


# ── Optional CLI ──────────────────────────────────────────────────────────

async def run(
    vertical_slug: str,
    *,
    max_pages_per_query: int = _DEFAULT_MAX_PAGES,
    max_total_results: int = _DEFAULT_MAX_TOTAL,
    queries: list[str] | None = None,
) -> dict:
    """Standalone async entry point — convenient for REPL / one-off scripts."""
    result = await graph.ainvoke(
        {
            "vertical_slug": vertical_slug,
            "max_pages_per_query": max_pages_per_query,
            "max_total_results": max_total_results,
            "queries": queries,
        }
    )
    return result.get("summary") or {}


if __name__ == "__main__":
    import json as _json
    import sys

    slug = sys.argv[1] if len(sys.argv) > 1 else "ingestible"
    summary = asyncio.run(run(slug, max_pages_per_query=1, max_total_results=50))
    print(_json.dumps(summary, indent=2))
