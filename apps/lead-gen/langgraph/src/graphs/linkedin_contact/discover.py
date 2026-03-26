"""Discover Contacts StateGraph — mass LinkedIn contact discovery.

Flow:
    START --> generate_queries --> (Send) search_profiles --> deduplicate
          --> (Send) analyze_and_save --> summarize --> END

Reuses analyze_profile + save_contact nodes from the linkedin_contact graph.
"""

import operator
import sys
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send

from .nodes import analyze_profile_node, save_contact_node, skip_node
from .search import (
    ProfileCandidate,
    generate_contact_queries,
    search_linkedin_profiles,
)
from .state import LinkedInContactState, ProfileAnalysis


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class CandidateProfile(TypedDict):
    linkedin_url: str
    name: str
    headline: str
    source_query: str


class ContactResult(TypedDict):
    name: str
    linkedin_url: str
    contact_type: str
    relevance_score: float
    reason: str
    contact_id: int | None
    skipped: bool


class DiscoverContactsState(TypedDict):
    seed_topics: list[str]
    search_queries: list[str]
    search_results: Annotated[list[CandidateProfile], operator.add]
    candidates: list[CandidateProfile]
    results: Annotated[list[ContactResult], operator.add]
    dry_run: bool
    max_results: int  # per query


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def generate_queries_node(state: DiscoverContactsState) -> dict:
    """Generate LinkedIn profile search queries from seed topics."""
    seed_topics = state["seed_topics"]
    print(f"Generating search queries from {len(seed_topics)} seed topics...")
    queries = generate_contact_queries(seed_topics)
    print(f"  Generated {len(queries)} queries:")
    for q in queries:
        print(f"    - {q}")
    return {"search_queries": queries, "search_results": []}


def route_to_search(state: DiscoverContactsState) -> list[Send] | str:
    """Fan out to search_profiles in parallel, one Send per query."""
    queries = state.get("search_queries") or []
    if not queries:
        return "deduplicate"
    max_results = state.get("max_results", 15)
    return [
        Send("search_profiles", {"query": q, "max_results": max_results})
        for q in queries
    ]


def search_profiles_node(state: dict) -> dict:
    """Execute a single DuckDuckGo search for LinkedIn profiles."""
    query = state["query"]
    max_results = state.get("max_results", 15)
    print(f"  Searching: {query}")
    results = search_linkedin_profiles(query, max_results=max_results)
    print(f"    Found {len(results)} profiles")
    return {
        "search_results": [r.to_dict() for r in results],
    }


def deduplicate_node(state: DiscoverContactsState) -> dict:
    """Deduplicate profiles by LinkedIn URL, then by name."""
    raw = state.get("search_results") or []
    print(f"\nDeduplicating {len(raw)} raw profiles...")

    seen_urls: set[str] = set()
    seen_names: set[str] = set()
    unique: list[CandidateProfile] = []

    for profile in raw:
        url = profile["linkedin_url"].rstrip("/").lower()
        name_key = profile["name"].strip().lower()

        if url in seen_urls or name_key in seen_names:
            continue

        seen_urls.add(url)
        seen_names.add(name_key)
        unique.append(profile)

    # Cross-check against existing contacts in DB
    try:
        from src.db.connection import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT linkedin_url FROM contacts WHERE linkedin_url IS NOT NULL")
            existing = {row[0].rstrip("/").lower() for row in cur.fetchall()}
        conn.close()

        before = len(unique)
        unique = [p for p in unique if p["linkedin_url"].rstrip("/").lower() not in existing]
        skipped = before - len(unique)
        if skipped:
            print(f"  Skipped {skipped} profiles already in DB")
    except Exception as e:
        print(f"  Warning: DB dedup skipped ({e})", file=sys.stderr)

    print(f"  {len(unique)} unique new profiles to analyze")
    return {"candidates": unique}


def route_to_analyze(state: DiscoverContactsState) -> list[Send] | str:
    """Fan out to analyze_and_save in parallel, one Send per candidate."""
    candidates = state.get("candidates") or []
    if not candidates:
        return "summarize"
    dry_run = state.get("dry_run", False)
    return [
        Send("analyze_and_save", {
            "linkedin_url": c["linkedin_url"],
            "name": c["name"],
            "headline": c["headline"],
            "about": "",
            "location": "",
            "profile_analysis": None,
            "contact_id": None,
            "skipped": False,
            "dry_run": dry_run,
        })
        for c in candidates
    ]


def analyze_and_save_node(state: dict) -> dict:
    """Analyze a single profile and save if relevant. Combines analyze + save."""
    # Run the analysis
    analysis_result = analyze_profile_node(state)
    analysis: ProfileAnalysis = analysis_result["profile_analysis"]

    name = state.get("name", "unknown")
    linkedin_url = state.get("linkedin_url", "")

    if not analysis.get("is_relevant", False):
        print(f"  [skip] {name}: {analysis.get('reason', 'not relevant')}", file=sys.stderr)
        return {
            "results": [{
                "name": name,
                "linkedin_url": linkedin_url,
                "contact_type": analysis.get("contact_type", "other"),
                "relevance_score": analysis.get("relevance_score", 0.0),
                "reason": analysis.get("reason", ""),
                "contact_id": None,
                "skipped": True,
            }],
        }

    # Save the contact (unless dry run)
    contact_id = None
    dry_run = state.get("dry_run", False)
    if not dry_run:
        merged = {**state, "profile_analysis": analysis}
        save_result = save_contact_node(merged)
        contact_id = save_result.get("contact_id")
    else:
        print(f"  [dry-run] Would save {name}", file=sys.stderr)

    return {
        "results": [{
            "name": name,
            "linkedin_url": linkedin_url,
            "contact_type": analysis.get("contact_type", "other"),
            "relevance_score": analysis.get("relevance_score", 0.0),
            "reason": analysis.get("reason", ""),
            "contact_id": contact_id,
            "skipped": False,
        }],
    }


def summarize_node(state: DiscoverContactsState) -> dict:
    """Print summary of discovery results."""
    results = state.get("results") or []
    candidates = state.get("candidates") or []
    queries = state.get("search_queries") or []

    saved = [r for r in results if not r["skipped"]]
    skipped = [r for r in results if r["skipped"]]

    print(f"\n--- Discovery Summary ---")
    print(f"  Queries: {len(queries)}")
    print(f"  Candidates found: {len(candidates)}")
    print(f"  Analyzed: {len(results)}")
    print(f"  Saved: {len(saved)}")
    print(f"  Skipped: {len(skipped)}")

    if saved:
        print(f"\n  Saved contacts:")
        for r in sorted(saved, key=lambda x: -x["relevance_score"]):
            print(f"    + {r['name']} ({r['contact_type']}, score={r['relevance_score']})")
            print(f"      {r['linkedin_url']}")
            print(f"      {r['reason'][:100]}")

    if skipped:
        print(f"\n  Skipped:")
        for r in skipped[:10]:
            print(f"    - {r['name']}: {r['reason'][:80]}")
        if len(skipped) > 10:
            print(f"    ... and {len(skipped) - 10} more")

    return {}


# ---------------------------------------------------------------------------
# Graph
# ---------------------------------------------------------------------------

def build_discover_contacts_graph():
    builder = StateGraph(DiscoverContactsState)

    builder.add_node("generate_queries", generate_queries_node)
    builder.add_node("search_profiles", search_profiles_node)
    builder.add_node("deduplicate", deduplicate_node)
    builder.add_node("analyze_and_save", analyze_and_save_node)
    builder.add_node("summarize", summarize_node)

    # START -> generate_queries -> (Send) search_profiles -> deduplicate
    builder.add_edge(START, "generate_queries")
    builder.add_conditional_edges(
        "generate_queries",
        route_to_search,
        ["search_profiles", "deduplicate"],
    )
    builder.add_edge("search_profiles", "deduplicate")

    # deduplicate -> (Send) analyze_and_save -> summarize -> END
    builder.add_conditional_edges(
        "deduplicate",
        route_to_analyze,
        ["analyze_and_save", "summarize"],
    )
    builder.add_edge("analyze_and_save", "summarize")
    builder.add_edge("summarize", END)

    return builder.compile()
