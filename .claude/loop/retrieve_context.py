#!/usr/bin/env python3
"""Retrieve relevant context from ChromaDB for the next iteration."""

import argparse
import json
import os
import chromadb

CHROMA_PATH = os.environ.get("CLAUDE_LOOP_CHROMA_PATH", "/tmp/claude-loop-chroma")
COLLECTION_NAME = "loop_iterations"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def retrieve(query: str, current_iteration: int, n_results: int = 8) -> str:
    collection = get_collection()

    if collection.count() == 0:
        return "No previous context available. This is the first iteration."

    results = collection.query(
        query_texts=[query],
        n_results=min(n_results, collection.count()),
    )

    # Group by iteration
    iter_chunks: dict[int, list[str]] = {}
    for doc, meta in zip(results["documents"][0], results["metadatas"][0]):
        it = meta["iteration"]
        iter_chunks.setdefault(it, []).append(doc)

    sections = []
    for it in sorted(iter_chunks.keys()):
        sections.append(f"### Iteration {it}\n" + "\n".join(iter_chunks[it]))

    context = "\n\n---\n\n".join(sections)

    # Header with iteration tracking
    all_results = collection.get(
        where={"iteration": {"$lt": current_iteration}},
    )
    all_iters = sorted({m["iteration"] for m in all_results["metadatas"]}) if all_results["metadatas"] else []

    header = f"**Iterations completed:** {all_iters or 'None'}\n"
    header += f"**Current iteration:** {current_iteration}\n"
    header += f"**Relevant chunks retrieved:** {len(results['documents'][0])}\n\n"

    return header + context


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", type=str, required=True)
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--n-results", type=int, default=8)
    args = parser.parse_args()

    print(retrieve(args.query, args.iteration, args.n_results))
