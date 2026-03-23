#!/usr/bin/env python3
"""Store iteration output in ChromaDB for semantic retrieval across iterations."""

import argparse
import json
import os
import chromadb
from datetime import datetime

CHROMA_PATH = os.environ.get("CLAUDE_LOOP_CHROMA_PATH", "/tmp/claude-loop-chroma")
COLLECTION_NAME = "loop_iterations"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def chunk_content(content: str, max_chars: int = 1500) -> list[str]:
    paragraphs = content.split("\n\n")
    chunks = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) > max_chars and current:
            chunks.append(current.strip())
            current = para
        else:
            current = current + "\n\n" + para if current else para

    if current.strip():
        chunks.append(current.strip())

    return chunks if chunks else [content[:max_chars]]


def store(iteration: int, content: str, task: str):
    collection = get_collection()
    chunks = chunk_content(content)

    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        ids.append(f"iter-{iteration}-chunk-{i}")
        documents.append(chunk)
        metadatas.append({
            "iteration": iteration,
            "chunk_index": i,
            "task": task,
            "timestamp": datetime.now().isoformat(),
        })

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    print(json.dumps({
        "stored": len(chunks),
        "iteration": iteration,
        "collection_count": collection.count(),
    }))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--task", type=str, default="default")
    parser.add_argument("--file", type=str, required=True)
    args = parser.parse_args()

    with open(args.file, "r") as f:
        content = f.read()

    store(args.iteration, content, args.task)
