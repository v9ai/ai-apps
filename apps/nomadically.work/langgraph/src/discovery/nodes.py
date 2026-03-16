"""LangGraph node functions and routing for discovery pipeline."""

from langgraph.types import Send

from .data import (
    _normalize_domain,
    fetch_existing_company_keys,
    persist_ats_boards,
    persist_company,
)
from .models import CandidateCompany, DiscoveryState
from .research import research_and_classify
from .search import generate_queries, search_web


def generate_queries_node(state: DiscoveryState) -> dict:
    """Generate search queries from seed topics."""
    seed_topics = state["seed_topics"]
    print(f"Generating search queries from {len(seed_topics)} seed topics...")
    queries = generate_queries(seed_topics)
    print(f"  Generated {len(queries)} queries")
    for q in queries:
        print(f"    • {q}")
    return {"search_queries": queries, "search_results": []}


def route_to_search(state: DiscoveryState) -> list[Send] | str:
    """Fan out to search_web in parallel, one Send per query."""
    queries = state.get("search_queries") or []
    if not queries:
        return "deduplicate"
    max_results = state.get("max_results", 10)
    return [
        Send("search_web", {"query": q, "max_results": max_results})
        for q in queries
    ]


def search_web_node(state: dict) -> dict:
    """Execute a single web search — called in parallel via Send."""
    query = state["query"]
    max_results = state.get("max_results", 10)
    print(f"  Searching: {query}")
    results = search_web(query, max_results=max_results)
    print(f"    Found {len(results)} candidates")
    return {"search_results": results}


def deduplicate_node(state: DiscoveryState) -> dict:
    """Merge search results, strip existing DB companies, normalize domains."""
    search_results = state.get("search_results") or []
    print(f"\nDeduplicating {len(search_results)} raw results...")

    # Deduplicate within run by normalized domain
    seen_domains: set[str] = set()
    unique: list[CandidateCompany] = []
    for candidate in search_results:
        domain = _normalize_domain(candidate["domain"])
        if domain not in seen_domains:
            seen_domains.add(domain)
            unique.append(candidate)

    print(f"  {len(unique)} unique domains after internal dedup")

    # Cross-run dedup against existing DB companies
    try:
        existing_keys = fetch_existing_company_keys()
        filtered: list[CandidateCompany] = []
        for candidate in unique:
            domain = _normalize_domain(candidate["domain"])
            key = _domain_to_key(candidate["domain"])
            if domain not in existing_keys and key not in existing_keys:
                filtered.append(candidate)
            else:
                print(f"    Skipping {candidate['name']} (already in DB)")
        unique = filtered
        print(f"  {len(unique)} new candidates after DB dedup")
    except Exception as e:
        print(f"  Warning: DB dedup skipped ({e})")

    return {"candidates": unique}


def route_to_research(state: DiscoveryState) -> list[Send] | str:
    """Fan out to research_and_classify in parallel, one Send per candidate."""
    candidates = state.get("candidates") or []
    if not candidates:
        return "persist"
    return [
        Send("research_and_classify", {"candidate": c})
        for c in candidates
    ]


def research_and_classify_node(state: dict) -> dict:
    """Research a single company — called in parallel via Send."""
    candidate = state["candidate"]
    result = research_and_classify(candidate)
    return {"research_results": [result]}


def persist_node(state: DiscoveryState) -> dict:
    """Filter qualified companies and persist to DB."""
    results = state.get("research_results") or []
    dry_run = state.get("dry_run", False)

    # Filter: AI company (tier >= 1) + fully remote + confidence >= medium
    qualified = [
        r for r in results
        if r.is_ai_company and r.is_fully_remote and r.ai_tier >= 1
    ]

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Results:")
    print(f"  Total researched: {len(results)}")
    print(f"  Qualified (AI + remote): {len(qualified)}")

    persisted: list[str] = []

    for r in qualified:
        boards_str = ", ".join(f"{b.vendor}({b.job_count})" for b in r.ats_boards)
        print(f"  ✓ {r.name} ({r.domain}) — tier={r.ai_tier}, boards=[{boards_str}]")
        for reason in r.reasons:
            print(f"      {reason}")

        if not dry_run:
            try:
                company_id = persist_company(r)
                if company_id and r.ats_boards:
                    persist_ats_boards(company_id, r.ats_boards)
                persisted.append(r.name)
                print(f"    → Persisted (id={company_id})")
            except Exception as e:
                print(f"    → Failed to persist: {e}")
        else:
            persisted.append(r.name)

    # Also print non-qualifying results
    non_qualified = [r for r in results if r not in qualified]
    if non_qualified:
        print(f"\n  Skipped ({len(non_qualified)}):")
        for r in non_qualified:
            label = "non-AI" if not r.is_ai_company else "non-remote"
            print(f"    ✗ {r.name} ({r.domain}) — {label}, tier={r.ai_tier}")

    stats = {
        "total_searched": len(state.get("search_results", [])),
        "candidates_found": len(state.get("candidates", [])),
        "qualified": len(qualified),
        "persisted": len(persisted),
    }

    return {"persisted_companies": persisted, "stats": stats}
