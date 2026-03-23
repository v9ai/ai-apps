#!/usr/bin/env python3
"""Retrieve relevant context from ChromaDB for the next iteration."""

import argparse
import json
import os
import chromadb

from embeddings import get_embedding_function

CHROMA_PATH = os.environ.get("CLAUDE_ITERATE_CHROMA_PATH", "/tmp/claude-iterate/chroma")
COLLECTION_NAME = "iterate_context"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef = get_embedding_function()
    kwargs: dict = {"name": COLLECTION_NAME, "metadata": {"hnsw:space": "cosine"}}
    if ef is not None:
        kwargs["embedding_function"] = ef
    return client.get_or_create_collection(**kwargs)


def _get_latest_eval(collection, current_iteration: int) -> str | None:
    """Directly fetch the most recent eval doc by ID (deterministic, not similarity-based).

    Returns the raw document string or None if no eval has been stored yet.
    """
    for it in range(current_iteration - 1, -1, -1):
        doc_id = f"iter-{it}-eval"
        result = collection.get(ids=[doc_id], include=["documents"])
        if result["ids"]:
            return result["documents"][0]
    return None


def _recency_boost(dist: float, iteration: int, current_iteration: int) -> float:
    """Apply a small distance penalty per iteration of staleness.

    More recent iterations rank slightly higher even if their cosine distance
    is not the absolute minimum — prevents the system from fixating on early
    (possibly outdated) context.
    """
    staleness = max(0, current_iteration - iteration - 1)
    return dist + staleness * 0.04


def retrieve(
    query: str,
    current_iteration: int,
    n_results: int = 8,
    include_errors: bool = True,
) -> str:
    collection = get_collection()
    total = collection.count()

    if total == 0:
        return "No previous context available. This is the first iteration."

    # Multi-query strategy:
    # 1. General query — no filter, broad semantic match
    # 2. Error-focused — filter to docs that recorded errors (where has_errors=True)
    # 3. Eval-focused  — filter to eval doc_type for score history
    # 4. Diff-focused  — filter to diff doc_type for code change context
    queries_with_filters: list[tuple[str, dict | None]] = [
        (query, None),
        (f"eval scores completion progress quality for: {query}", {"doc_type": "eval"}),
        (f"code changes git diff files modified for: {query}", {"doc_type": "diff"}),
    ]
    if include_errors:
        queries_with_filters.append(
            (f"errors failures bugs in: {query}", {"has_errors": True})
        )

    all_docs: dict[str, tuple[str, dict, float]] = {}

    for q, where_filter in queries_with_filters:
        kwargs: dict = {
            "query_texts": [q],
            "n_results": min(n_results, total),
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter:
            kwargs["where"] = where_filter
        try:
            results = collection.query(**kwargs)
        except Exception:
            # where filter may match 0 docs — fall back to unfiltered
            try:
                results = collection.query(
                    query_texts=[q],
                    n_results=min(n_results, total),
                    include=["documents", "metadatas", "distances"],
                )
            except Exception:
                continue

        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            doc_id = f"{meta['iteration']}-{meta['chunk_index']}"
            # Apply recency boost before deduplication so the boosted score wins
            boosted = _recency_boost(dist, meta["iteration"], current_iteration)
            if doc_id not in all_docs or boosted < all_docs[doc_id][2]:
                all_docs[doc_id] = (doc, meta, boosted)

    # Sort: recency-boosted distance (ascending = best match)
    sorted_docs = sorted(all_docs.values(), key=lambda x: (x[1]["iteration"], x[2]))

    # Group by iteration
    iter_chunks: dict[int, list[tuple[str, dict, float]]] = {}
    for doc, meta, dist in sorted_docs:
        it = meta["iteration"]
        iter_chunks.setdefault(it, []).append((doc, meta, dist))

    sections = []
    for it in sorted(iter_chunks.keys()):
        items = iter_chunks[it]
        # Separate by doc_type: summary, eval, diff, output
        summaries = [d for d, m, _ in items if m.get("doc_type") == "summary"]
        evals = [d for d, m, _ in items if m.get("doc_type") == "eval"]
        diffs = [d for d, m, _ in items if m.get("doc_type") == "diff"]
        outputs = [d for d, m, _ in items if m.get("doc_type") == "output"]

        parts = []
        if summaries:
            parts.append(summaries[0])
        if evals:
            parts.append(evals[0])
        if diffs:
            # Show diff only if it was semantically relevant (first result)
            parts.append(diffs[0])
        if outputs:
            parts.extend(outputs[:2])

        sections.append(f"### Iteration {it}\n" + "\n\n".join(parts))

    context = "\n\n---\n\n".join(sections)

    # Header
    all_iters = sorted(iter_chunks.keys())
    error_iters = sorted({
        it for it, items in iter_chunks.items()
        if any(m.get("has_errors") for _, m, _ in items)
    })

    header = f"**Iterations completed:** {all_iters or 'None'}\n"
    header += f"**Current iteration:** {current_iteration}\n"
    header += f"**Relevant chunks retrieved:** {len(sorted_docs)}\n"
    if error_iters:
        header += f"**Iterations with errors:** {error_iters}\n"

    # Pin latest eval scores so Claude always sees them, even if not top-ranked by similarity
    latest_eval = _get_latest_eval(collection, current_iteration)
    if latest_eval:
        header += f"\n**Latest eval:**\n{latest_eval}\n"

    header += "\n"

    return header + context


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", type=str, required=True)
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--n-results", type=int, default=8)
    parser.add_argument("--no-errors", action="store_true")
    args = parser.parse_args()

    print(retrieve(
        args.query,
        args.iteration,
        args.n_results,
        include_errors=not args.no_errors,
    ))
