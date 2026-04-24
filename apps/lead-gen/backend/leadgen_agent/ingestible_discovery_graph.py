"""Ingestible vertical — GitHub code-search harvester.

Finds companies that use LangChain / LlamaIndex / Haystack by walking the
``GET /search/code`` endpoint for the queries declared in
``seed_queries/ingestible.py::HOT_LEAD_SIGNALS['github_code_search']``.

Stage 1 (this module): fetch + filter. Each hit gives us a
``(owner, repo, path, stack_label)`` tuple. Tutorials, forks, and course
repos are dropped via a regex deny-list.

Stage 2 (follow-up): resolve each unique ``owner`` to a company via
``GET /orgs/{login}``, dedupe against existing ``companies`` rows, insert
survivors with ``tags=['discovery-candidate','ingestible']`` and
``rag_stack_detected`` pre-populated.

Stage 3 (follow-up): for each matched repo, scan last 90 days of commit
messages for ``token|cost|chunk|context`` and flip ``token_cost_complaint``
on the owning company.

Rate-limit notes (from GitHub REST docs):
- ``/search/code`` has its own bucket: **30 req/min authenticated, 10/min
  unauthenticated**. We respect it with ``_search_sleep`` between pages.
- Unlike other REST endpoints, code-search requires auth — unauthenticated
  requests return 401. ``GITHUB_TOKEN`` is required.

This is a leaf graph — no LLM calls, deterministic HTTP. Composable into
``company_discovery_graph`` supervisors later. The graph shell is kept so
the harvester can be invoked via ``langgraph dev`` / ``/runs/wait`` the
same way as the other discovery graphs.
"""

from __future__ import annotations

import asyncio
import os
import re
import time
from typing import Annotated, Any, TypedDict

import httpx
from langgraph.graph import END, START, StateGraph

from .seed_queries.ingestible import HOT_LEAD_SIGNALS


# ── State ─────────────────────────────────────────────────────────────────

def _first_error(left: str | None, right: str | None) -> str | None:
    return left or right


def _extend(
    left: list | None, right: list | None
) -> list:
    """Concat reducer for list channels written by multiple nodes."""
    return (left or []) + (right or [])


class IngestibleDiscoveryState(TypedDict, total=False):
    # Inputs
    max_pages_per_query: int          # pagination cap; default 3 → 300 hits/query
    max_total_results: int            # hard cap across all queries; default 1000
    queries: list[str] | None         # override HOT_LEAD_SIGNALS['queries'] if set

    # Outputs
    raw_hits: Annotated[list[dict], _extend]       # every raw match, pre-filter
    filtered_hits: Annotated[list[dict], _extend]  # post-filter, unique by (owner, repo)
    summary: dict[str, Any]

    # Error channel — consistent with sibling graphs
    _error: Annotated[str, _first_error]
    agent_timings: dict[str, float]


# ── Constants ─────────────────────────────────────────────────────────────

_GITHUB_API = "https://api.github.com"
_PER_PAGE = 100           # GitHub max for code-search
_SEARCH_RATE_SLEEP = 2.1  # seconds between /search/code calls → stay under 30/min
_DEFAULT_MAX_PAGES = 3
_DEFAULT_MAX_TOTAL = 1000

# Canonical owner names that are explicitly not-a-buyer — the framework
# vendors themselves, their org forks, and known tutorial/awesome repos.
_OWNER_DENY: frozenset[str] = frozenset(
    {
        "langchain-ai",
        "langchain",
        "run-llama",
        "jerryjliu",           # LlamaIndex creator's personal org
        "deepset-ai",
        "haystack-tutorials",
        "microsoft",           # AutoGen noise
    }
)


# ── Helpers ───────────────────────────────────────────────────────────────

def _github_headers() -> dict[str, str]:
    headers = {
        "User-Agent": "lead-gen-ingestible-discovery/1.0",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = f"token {token}"
    return headers


def _classify_stack(text_sample: str) -> str | None:
    """Pick the RAG-stack label from text that matched a code-search query.

    Mirrors the regex table in ``company_enrichment_graph._RAG_STACK_PATTERNS``
    but operates on the code-search ``text_matches`` fragments (which are
    short — usually a single line). Returns ``None`` if no stack detected.
    """
    stack_map: dict[str, str] = HOT_LEAD_SIGNALS["github_code_search"]["stack_map"]  # type: ignore[assignment]
    for pattern, label in stack_map.items():
        if re.search(pattern, text_sample, re.I):
            return label
    # Fallback heuristics when text_matches is empty (rare but possible).
    lower = text_sample.lower()
    if "llama_index" in lower or "llamaindex" in lower:
        return "llamaindex"
    if "langchain" in lower:
        return "langchain"
    if "haystack" in lower:
        return "haystack"
    return None


def _is_filtered_out(repo_name: str, owner: str, description: str) -> bool:
    """Return True if this hit should be dropped as tutorial/fork/course noise."""
    if owner.lower() in _OWNER_DENY:
        return True
    filter_patterns: list[str] = HOT_LEAD_SIGNALS["github_code_search"]["filter_out"]  # type: ignore[assignment]
    haystack = f"{repo_name} {description or ''}"
    for pat in filter_patterns:
        if re.search(pat, haystack):
            return True
    return False


# ── Nodes ─────────────────────────────────────────────────────────────────

async def fetch_code_search(state: IngestibleDiscoveryState) -> dict:
    """Run GitHub code search for each configured query, paginate, collect hits.

    Respects the 30-req/min code-search bucket via a sleep between calls.
    Caps at ``max_pages_per_query × len(queries)`` API calls and
    ``max_total_results`` rows. Returns early on 401 (missing token) with
    a clear ``_error``.
    """
    t0 = time.perf_counter()
    token = os.environ.get("GITHUB_TOKEN", "").strip()
    if not token:
        return {"_error": "fetch_code_search: GITHUB_TOKEN is required for /search/code"}

    queries: list[str] = (
        state.get("queries")
        or HOT_LEAD_SIGNALS["github_code_search"]["queries"]  # type: ignore[assignment]
    )
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
                        params={
                            "q": query,
                            "per_page": _PER_PAGE,
                            "page": page,
                        },
                    )
                except httpx.HTTPError as e:
                    # Single-query failure shouldn't kill the whole harvester.
                    # Log into summary via the error path but keep going.
                    hits.append(
                        {"_error": f"http error on query={query!r} page={page}: {e}"}
                    )
                    break

                if res.status_code == 401:
                    return {"_error": "fetch_code_search: 401 — GITHUB_TOKEN invalid or expired"}
                if res.status_code == 403:
                    # Rate-limited. Honor Retry-After header if present, then bail.
                    retry_after = int(res.headers.get("Retry-After", "60"))
                    await asyncio.sleep(min(retry_after, 60))
                    break
                if res.status_code == 422:
                    # Invalid query — log and move to next query.
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

                    # Build a normalized hit. text_matches is an optional header
                    # (need Accept: application/vnd.github.v3.text-match+json);
                    # we fall back to the file path for classification.
                    path = item.get("path") or ""
                    owner_obj = repo.get("owner") or {}
                    owner = (owner_obj.get("login") or "").strip()
                    text_sample = " ".join([path, query])
                    stack_label = _classify_stack(text_sample)

                    hits.append(
                        {
                            "owner": owner,
                            "owner_type": owner_obj.get("type") or "",  # 'User'|'Organization'
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

                # Pagination politeness — stay under the 30/min code-search cap.
                await asyncio.sleep(_SEARCH_RATE_SLEEP)

    return {
        "raw_hits": hits,
        "agent_timings": {"fetch_code_search": round(time.perf_counter() - t0, 3)},
    }


async def filter_hits(state: IngestibleDiscoveryState) -> dict:
    """Drop forks, tutorials, courses, and known framework-vendor orgs.

    Keep one hit per ``(owner, repo_full_name)`` — the first one wins (which
    will be the highest-ranked match since GitHub orders by best-match).
    Enforces ``stack_label IS NOT NULL`` so downstream Stage 2 knows which
    value to put in ``companies.rag_stack_detected``.
    """
    if state.get("_error"):
        return {}
    t0 = time.perf_counter()
    raw = state.get("raw_hits") or []

    seen_pairs: set[tuple[str, str]] = set()
    filtered: list[dict] = []

    for hit in raw:
        if "_error" in hit:
            # Propagate upstream HTTP errors into summary but don't keep as a hit.
            continue
        owner = hit.get("owner") or ""
        repo_full = hit.get("repo_full_name") or ""
        if not owner or not repo_full:
            continue
        if hit.get("is_fork"):
            continue
        if _is_filtered_out(hit.get("repo_name") or "", owner, hit.get("repo_description") or ""):
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


async def build_summary(state: IngestibleDiscoveryState) -> dict:
    """Terminal node — assemble a run summary for the caller."""
    raw = state.get("raw_hits") or []
    filtered = state.get("filtered_hits") or []

    # Per-stack tally.
    by_stack: dict[str, int] = {}
    for hit in filtered:
        label = hit.get("stack_label") or "unknown"
        by_stack[label] = by_stack.get(label, 0) + 1

    # Unique orgs in the filtered set — candidates for Stage 2 resolution.
    unique_orgs = sorted({hit["owner"] for hit in filtered if hit.get("owner")})

    errors = [hit.get("_error") for hit in raw if isinstance(hit, dict) and "_error" in hit]

    summary = {
        "raw_count": len([h for h in raw if "_error" not in h]),
        "filtered_count": len(filtered),
        "unique_orgs": unique_orgs,
        "by_stack": by_stack,
        "errors": errors,
    }
    return {"summary": summary}


# ── Graph ─────────────────────────────────────────────────────────────────

def build_graph(checkpointer: Any = None) -> Any:
    builder = StateGraph(IngestibleDiscoveryState)
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
    *,
    max_pages_per_query: int = _DEFAULT_MAX_PAGES,
    max_total_results: int = _DEFAULT_MAX_TOTAL,
    queries: list[str] | None = None,
) -> dict:
    """Standalone async entry point — convenient for REPL / one-off scripts."""
    result = await graph.ainvoke(
        {
            "max_pages_per_query": max_pages_per_query,
            "max_total_results": max_total_results,
            "queries": queries,
        }
    )
    return result.get("summary") or {}


if __name__ == "__main__":
    import json

    summary = asyncio.run(run(max_pages_per_query=1, max_total_results=50))
    print(json.dumps(summary, indent=2))
