#!/usr/bin/env python3
"""Retrieve relevant context from ChromaDB for the next iteration."""

import argparse
import json
import os
import chromadb

CHROMA_PATH = os.environ.get("CLAUDE_ITERATE_CHROMA_PATH", "/tmp/claude-iterate/chroma")
COLLECTION_NAME = "iterate_context"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


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

    # Multi-query: task-level + error-focused + eval-focused
    queries = [query]
    if include_errors:
        queries.append(f"errors failures bugs in: {query}")
    queries.append(f"eval scores completion progress quality for: {query}")

    all_docs: dict[str, tuple[str, dict, float]] = {}

    for q in queries:
        results = collection.query(
            query_texts=[q],
            n_results=min(n_results, total),
            include=["documents", "metadatas", "distances"],
        )
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            doc_id = f"{meta['iteration']}-{meta['chunk_index']}"
            # Keep the closest distance (best match)
            if doc_id not in all_docs or dist < all_docs[doc_id][2]:
                all_docs[doc_id] = (doc, meta, dist)

    # Sort by iteration (chronological), then by distance within iteration
    sorted_docs = sorted(all_docs.values(), key=lambda x: (x[1]["iteration"], x[2]))

    # Group by iteration
    iter_chunks: dict[int, list[tuple[str, dict, float]]] = {}
    for doc, meta, dist in sorted_docs:
        it = meta["iteration"]
        iter_chunks.setdefault(it, []).append((doc, meta, dist))

    sections = []
    for it in sorted(iter_chunks.keys()):
        items = iter_chunks[it]
        # Separate summaries, evals, and output chunks
        summaries = [d for d, m, _ in items if m.get("doc_type") == "summary"]
        evals = [d for d, m, _ in items if m.get("doc_type") == "eval"]
        outputs = [d for d, m, _ in items if m.get("doc_type") == "output"]

        parts = []
        if summaries:
            parts.append(summaries[0])
        if evals:
            parts.append(evals[0])
        if outputs:
            parts.extend(outputs[:3])

        sections.append(f"### Iteration {it}\n" + "\n\n".join(parts))

    context = "\n\n---\n\n".join(sections)

    # Header — derived from retrieved docs (no extra DB call)
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
