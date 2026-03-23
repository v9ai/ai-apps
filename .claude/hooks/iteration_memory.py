#!/usr/bin/env python3
"""Iteration memory backed by ChromaDB for cross-session semantic retrieval.

Stores observations, decisions, failures, and progress across iterate loop
iterations. Supports recall by semantic similarity, dump by recency, and
summary statistics.
"""

import json
import os
import sys
import time
import uuid
import hashlib
from pathlib import Path

import chromadb


def _get_embedding_function():
    """Return a ChromaDB-compatible embedding function.

    Tries in order:
    1. FastEmbed (ONNX-based, lightweight)
    2. ChromaDB's built-in ONNXMiniLM_L6_V2
    3. Hash-based fallback (deterministic, no model download)
    """
    try:
        from fastembed import TextEmbedding

        class FastEmbedFunction(chromadb.EmbeddingFunction):
            def __init__(self):
                self._model = TextEmbedding("BAAI/bge-small-en-v1.5")

            def __call__(self, input):
                return [e.tolist() for e in self._model.embed(input)]

        fn = FastEmbedFunction()
        list(fn._model.embed(["test"]))
        return fn
    except Exception:
        pass

    try:
        from chromadb.utils.embedding_functions import ONNXMiniLM_L6_V2

        fn = ONNXMiniLM_L6_V2()
        fn(["test"])
        return fn
    except Exception:
        pass

    class HashEmbedFunction(chromadb.EmbeddingFunction):
        def __call__(self, input):
            return [
                [float(b) / 255.0 for b in hashlib.sha384(t.encode()).digest()]
                for t in input
            ]

    return HashEmbedFunction()


def _get_db_path():
    """Return the ChromaDB persistence path.

    Prefers a project-local path under the git root's .claude/chroma_memory.
    Falls back to ~/.claude/chroma_memory.
    """
    try:
        import subprocess

        root = (
            subprocess.check_output(
                ["git", "rev-parse", "--git-common-dir"], stderr=subprocess.DEVNULL
            )
            .decode()
            .strip()
        )
        db_path = Path(root).parent / ".claude" / "chroma_memory"
    except Exception:
        db_path = Path.home() / ".claude" / "chroma_memory"
    db_path.mkdir(parents=True, exist_ok=True)
    return str(db_path)


def get_collection():
    """Return the iteration_memory ChromaDB collection."""
    client = chromadb.PersistentClient(path=_get_db_path())
    return client.get_or_create_collection(
        "iteration_memory",
        embedding_function=_get_embedding_function(),
        metadata={"hnsw:space": "cosine"},
    )


def store(text, mem_type="observation", terminal="default", iteration=0):
    """Store a memory entry and return its ID."""
    col = get_collection()
    mem_id = f"mem-{terminal}-{int(time.time())}-{uuid.uuid4().hex[:6]}"
    col.add(
        documents=[text],
        metadatas=[
            {
                "type": mem_type,
                "terminal": terminal,
                "iteration": iteration,
                "timestamp": int(time.time()),
            }
        ],
        ids=[mem_id],
    )
    return mem_id


def recall(query, n=5, terminal=None, mem_type=None):
    """Recall memories by semantic similarity to a query."""
    col = get_collection()
    if col.count() == 0:
        return []

    conditions = []
    if terminal:
        conditions.append({"terminal": terminal})
    if mem_type:
        conditions.append({"type": mem_type})

    where = (
        conditions[0]
        if len(conditions) == 1
        else {"$and": conditions}
        if len(conditions) > 1
        else {}
    )

    kwargs = {"query_texts": [query], "n_results": min(n, col.count())}
    if where:
        kwargs["where"] = where

    try:
        results = col.query(**kwargs)
    except Exception:
        kwargs.pop("where", None)
        results = col.query(**kwargs)

    entries = []
    if results and results["documents"] and results["documents"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            entries.append(
                {
                    "text": doc,
                    "type": meta.get("type", ""),
                    "terminal": meta.get("terminal", ""),
                    "iteration": meta.get("iteration", 0),
                    "relevance": round(1 - dist, 3),
                }
            )
    return entries


def dump(terminal=None, last_n=20):
    """Dump the most recent memories, optionally filtered by terminal."""
    col = get_collection()
    if col.count() == 0:
        return []

    kwargs = {"limit": last_n}
    if terminal:
        kwargs["where"] = {"terminal": terminal}

    results = col.get(**kwargs)
    entries = []
    if results and results["documents"]:
        for doc, meta in zip(results["documents"], results["metadatas"]):
            entries.append(
                {
                    "text": doc,
                    "type": meta.get("type", ""),
                    "terminal": meta.get("terminal", ""),
                    "iteration": meta.get("iteration", 0),
                }
            )
    entries.sort(key=lambda e: e["iteration"], reverse=True)
    return entries[:last_n]


def summary():
    """Return aggregate statistics about the memory store."""
    col = get_collection()
    total = col.count()
    if total == 0:
        return {"total": 0, "by_terminal": {}, "by_type": {}}

    all_items = col.get()
    by_terminal, by_type = {}, {}
    for meta in all_items["metadatas"]:
        t = meta.get("terminal", "?")
        tp = meta.get("type", "?")
        by_terminal[t] = by_terminal.get(t, 0) + 1
        by_type[tp] = by_type.get(tp, 0) + 1
    return {"total": total, "by_terminal": by_terminal, "by_type": by_type}


def recall_formatted(query, n=8, terminal=None):
    """Return a Markdown-formatted string of recalled memories."""
    entries = recall(query, n, terminal)
    if not entries:
        return "No relevant memories found."
    lines = ["## Relevant Memories"]
    for e in entries:
        lines.append(
            f"- [{e['type']}] (iter {e['iteration']}, {e['terminal']}) {e['text']}"
        )
    return "\n".join(lines)


def dump_formatted(terminal=None, last_n=5):
    """Return a Markdown-formatted string of recent memories."""
    entries = dump(terminal, last_n)
    if not entries:
        return "No recent memories."
    lines = ["## Recent Memories"]
    for e in entries:
        lines.append(
            f"- [{e['type']}] (iter {e['iteration']}, {e['terminal']}) {e['text']}"
        )
    return "\n".join(lines)


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Iteration memory CLI")
    sub = parser.add_subparsers(dest="cmd")

    p_store = sub.add_parser("store")
    p_store.add_argument("text")
    p_store.add_argument("--type", default="observation")
    p_store.add_argument("--terminal", default="default")
    p_store.add_argument("--iteration", type=int, default=0)

    p_recall = sub.add_parser("recall")
    p_recall.add_argument("query")
    p_recall.add_argument("--n", type=int, default=5)
    p_recall.add_argument("--terminal", default=None)
    p_recall.add_argument("--type", dest="mem_type", default=None)

    p_dump = sub.add_parser("dump")
    p_dump.add_argument("--terminal", default=None)
    p_dump.add_argument("--last-n", type=int, default=20)

    p_summary = sub.add_parser("summary")

    args = parser.parse_args()

    if args.cmd == "store":
        mem_id = store(args.text, args.type, args.terminal, args.iteration)
        print(json.dumps({"ok": True, "id": mem_id}))
    elif args.cmd == "recall":
        entries = recall(args.query, args.n, args.terminal, args.mem_type)
        print(json.dumps(entries, indent=2))
    elif args.cmd == "dump":
        entries = dump(args.terminal, args.last_n)
        print(json.dumps(entries, indent=2))
    elif args.cmd == "summary":
        print(json.dumps(summary(), indent=2))
    else:
        parser.print_help()
