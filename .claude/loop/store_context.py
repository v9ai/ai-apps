#!/usr/bin/env python3
"""Store iteration output in ChromaDB for semantic retrieval across iterations."""

import argparse
import json
import hashlib
import os
import subprocess
import chromadb
from datetime import datetime

CHROMA_PATH = os.environ.get("CLAUDE_LOOP_CHROMA_PATH", "/tmp/claude-loop/chroma")
COLLECTION_NAME = "loop_iterations"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def chunk_content(content: str, max_chars: int = 1200) -> list[str]:
    """Split content on semantic boundaries: code blocks, headers, double newlines."""
    import re

    # Split on code fences, markdown headers, and double newlines
    boundaries = re.split(r'(```[\s\S]*?```|^#{1,3} .+$|\n\n+)', content, flags=re.MULTILINE)

    chunks = []
    current = ""

    for part in boundaries:
        if not part.strip():
            continue
        if len(current) + len(part) > max_chars and current.strip():
            chunks.append(current.strip())
            current = part
        else:
            current = current + "\n\n" + part if current else part

    if current.strip():
        chunks.append(current.strip())

    return chunks if chunks else [content[:max_chars]]


def dedup_chunks(chunks: list[str], threshold: int = 50) -> list[str]:
    """Remove near-duplicate chunks by comparing first N chars."""
    seen = set()
    deduped = []
    for chunk in chunks:
        sig = hashlib.md5(chunk[:threshold].encode()).hexdigest()
        if sig not in seen:
            seen.add(sig)
            deduped.append(chunk)
    return deduped


def get_git_diff() -> str | None:
    """Capture staged + unstaged git diff for the current iteration."""
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD~1", "--stat", "--no-color"],
            capture_output=True, text=True, timeout=5,
            cwd=os.environ.get("CLAUDE_LOOP_CWD", "."),
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return None


def extract_errors(content: str) -> list[str]:
    """Extract error-like lines from output."""
    import re
    patterns = [
        r'(?:error|Error|ERROR)[:\s].*',
        r'(?:failed|Failed|FAILED)[:\s].*',
        r'(?:TypeError|SyntaxError|ReferenceError|ImportError).*',
        r'panic:.*',
    ]
    errors = []
    for pattern in patterns:
        errors.extend(re.findall(pattern, content)[:5])
    return errors[:10]


def store(iteration: int, content: str, task: str):
    collection = get_collection()
    chunks = dedup_chunks(chunk_content(content))

    ids = []
    documents = []
    metadatas = []

    errors = extract_errors(content)
    git_diff = get_git_diff()

    for i, chunk in enumerate(chunks):
        ids.append(f"iter-{iteration}-chunk-{i}")
        documents.append(chunk)
        metadatas.append({
            "iteration": iteration,
            "chunk_index": i,
            "total_chunks": len(chunks),
            "task": task,
            "doc_type": "output",
            "has_errors": len(errors) > 0,
            "timestamp": datetime.now().isoformat(),
        })

    # Store iteration summary as a dedicated document
    summary_lines = [
        f"Iteration {iteration} summary:",
        f"Task: {task}",
        f"Output chunks: {len(chunks)}",
        f"Errors found: {len(errors)}",
    ]
    if errors:
        summary_lines.append("Errors:\n" + "\n".join(f"  - {e[:120]}" for e in errors))
    if git_diff:
        summary_lines.append(f"Files changed:\n{git_diff}")

    summary = "\n".join(summary_lines)
    ids.append(f"iter-{iteration}-summary")
    documents.append(summary)
    metadatas.append({
        "iteration": iteration,
        "chunk_index": -1,
        "total_chunks": len(chunks),
        "task": task,
        "doc_type": "summary",
        "has_errors": len(errors) > 0,
        "timestamp": datetime.now().isoformat(),
    })

    # Store git diff as separate searchable chunk
    if git_diff:
        ids.append(f"iter-{iteration}-diff")
        documents.append(f"Git diff for iteration {iteration}:\n{git_diff}")
        metadatas.append({
            "iteration": iteration,
            "chunk_index": -2,
            "total_chunks": len(chunks),
            "task": task,
            "doc_type": "diff",
            "has_errors": False,
            "timestamp": datetime.now().isoformat(),
        })

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    print(json.dumps({
        "stored": len(ids),
        "iteration": iteration,
        "errors": len(errors),
        "has_diff": git_diff is not None,
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
