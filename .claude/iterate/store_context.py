#!/usr/bin/env python3
"""Store iteration output in ChromaDB for semantic retrieval across iterations."""

import argparse
import json
import hashlib
import os
import re
import subprocess
import chromadb
from datetime import datetime

CHROMA_PATH = os.environ.get("CLAUDE_ITERATE_CHROMA_PATH", "/tmp/claude-iterate/chroma")
COLLECTION_NAME = "iterate_context"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


def chunk_content(content: str, max_chars: int = 1200) -> list[str]:
    """Split content on semantic boundaries: code blocks, headers, double newlines."""

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


def dedup_chunks(chunks: list[str]) -> list[str]:
    """Remove exact-duplicate chunks by full content hash."""
    seen = set()
    deduped = []
    for chunk in chunks:
        sig = hashlib.md5(chunk.encode()).hexdigest()
        if sig not in seen:
            seen.add(sig)
            deduped.append(chunk)
    return deduped


def get_git_diff() -> tuple[str | None, list[str]]:
    """Capture git diff stat and extract changed file paths."""
    try:
        result = subprocess.run(
            ["git", "diff", "HEAD~1", "--stat", "--no-color"],
            capture_output=True, text=True, timeout=5,
            cwd=os.environ.get("CLAUDE_ITERATE_CWD", "."),
        )
        if result.returncode == 0 and result.stdout.strip():
            stat = result.stdout.strip()
            # Extract file paths from stat lines (e.g. " path/to/file | 5 ++-")
            files = [m.group(1) for m in re.finditer(r'^\s*(.+?)\s+\|', stat, re.MULTILINE)]
            return stat, files
    except Exception:
        pass
    return None, []


def extract_errors(content: str) -> list[str]:
    """Extract error-like lines from actual error output (not prose)."""
    patterns = [
        # Stack traces and compiler errors — must be at line start
        r'^(?:error|Error|ERROR):[ \t]+\S.*',
        # Common JS/Python exceptions — class name at line start
        r'^(?:TypeError|SyntaxError|ReferenceError|ImportError|KeyError|ValueError|AttributeError|ModuleNotFoundError)[:( ].*',
        # Build/test failures at line start
        r'^(?:FAIL|FAILED)[ \t]+\S.*',
        # Rust panics
        r'^panic:.*',
        # Exit codes
        r'exit code [1-9]\d*',
    ]
    errors = []
    for pattern in patterns:
        errors.extend(re.findall(pattern, content, re.MULTILINE)[:5])
    return errors[:10]


def store(iteration: int, content: str, task: str):
    collection = get_collection()
    chunks = dedup_chunks(chunk_content(content))

    ids = []
    documents = []
    metadatas = []

    errors = extract_errors(content)
    git_diff, changed_files = get_git_diff()
    now = datetime.now().isoformat()

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
            "timestamp": now,
        })

    # Store iteration summary as a dedicated document
    summary_lines = [
        f"Iteration {iteration} summary:",
        f"Task: {task}",
        f"Output chunks: {len(chunks)}",
        f"Errors found: {len(errors)}",
        f"Files changed: {len(changed_files)}",
    ]
    if errors:
        summary_lines.append("Errors:\n" + "\n".join(f"  - {e[:120]}" for e in errors))
    if changed_files:
        summary_lines.append("Changed:\n" + "\n".join(f"  - {f}" for f in changed_files[:20]))

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
        "files_changed": len(changed_files),
        "timestamp": now,
    })

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
    result = {
        "stored": len(ids),
        "iteration": iteration,
        "errors": len(errors),
        "files_changed": len(changed_files),
        "collection_count": collection.count(),
    }
    print(json.dumps(result))
    return result


def store_eval(iteration: int, scores: dict, task: str, eval_method: str = "unknown"):
    """Store eval scores in Chroma so they're retrievable for trend analysis."""
    collection = get_collection()
    lines = [f"Eval scores for iteration {iteration} (method: {eval_method}):"]
    for name, data in scores.items():
        s = data.get("score", "?")
        r = data.get("reason", "")
        lines.append(f"  {name}: {s} — {r}")

    collection.upsert(
        ids=[f"iter-{iteration}-eval"],
        documents=["\n".join(lines)],
        metadatas=[{
            "iteration": iteration,
            "chunk_index": -3,
            "total_chunks": 0,
            "task": task,
            "doc_type": "eval",
            "eval_method": eval_method,
            "has_errors": False,
            "timestamp": datetime.now().isoformat(),
        }],
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--task", type=str, default="default")
    parser.add_argument("--file", type=str, required=True)
    args = parser.parse_args()

    with open(args.file, "r") as f:
        content = f.read()

    store(args.iteration, content, args.task)
