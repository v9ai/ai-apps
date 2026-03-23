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

from embeddings import get_embedding_function
from bm25_index import build_or_load as bm25_build_or_load, bm25_available

CHROMA_PATH = os.environ.get("CLAUDE_ITERATE_CHROMA_PATH", "/tmp/claude-iterate/chroma")
COLLECTION_NAME = "iterate_context"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef = get_embedding_function()
    kwargs: dict = {"name": COLLECTION_NAME, "metadata": {"hnsw:space": "cosine"}}
    if ef is not None:
        kwargs["embedding_function"] = ef
    return client.get_or_create_collection(**kwargs)


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


def get_git_diff() -> tuple[str | None, list[str], str | None]:
    """Capture git diff stat, changed file paths, and full diff content.

    Tries in order:
      1. HEAD~1 (last committed diff) — accurate after auto-commit
      2. HEAD   (uncommitted changes vs last commit) — fallback for mid-session work
    """
    stat: str | None = None
    files: list[str] = []
    diff_content: str | None = None
    cwd = os.environ.get("CLAUDE_ITERATE_CWD", ".")
    used_base: list[str] | None = None

    for diff_base in (["HEAD~1", "HEAD"], ["HEAD"]):
        try:
            r = subprocess.run(
                ["git", "diff"] + diff_base + ["--stat", "--no-color"],
                capture_output=True, text=True, timeout=5, cwd=cwd,
            )
            if r.returncode == 0 and r.stdout.strip():
                stat = r.stdout.strip()
                files = [m.group(1) for m in re.finditer(r'^\s*(.+?)\s+\|', stat, re.MULTILINE)]
                used_base = diff_base
                break
        except Exception:
            pass

    if used_base:
        try:
            r = subprocess.run(
                ["git", "diff"] + used_base + ["--no-color", "-U2"],
                capture_output=True, text=True, timeout=10, cwd=cwd,
            )
            if r.returncode == 0 and r.stdout.strip():
                diff_content = r.stdout.strip()[:6000]  # cap at 6 KB
        except Exception:
            pass

    return stat, files, diff_content


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
        # Exit codes — anchored to line start
        r'^.*exit(?:ed with)? code [1-9]\d*',
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
    git_diff, changed_files, diff_content = get_git_diff()
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

    # Store the full git diff as a searchable document so Claude can retrieve
    # "what code changed" semantically across iterations.
    if diff_content:
        ids.append(f"iter-{iteration}-diff")
        documents.append(f"Git diff for iteration {iteration}:\n{diff_content}")
        metadatas.append({
            "iteration": iteration,
            "chunk_index": -2,
            "total_chunks": 0,
            "task": task,
            "doc_type": "diff",
            "has_errors": len(errors) > 0,
            "files_changed": len(changed_files),
            "timestamp": now,
        })

    collection.upsert(ids=ids, documents=documents, metadatas=metadatas)

    # Update BM25 index alongside ChromaDB
    try:
        bm25_idx = bm25_build_or_load(CHROMA_PATH)
        if bm25_idx is not None:
            bm25_idx.add_documents(documents, metadatas, ids)
            bm25_idx.save()
    except Exception:
        pass

    # Semantic similarity with the previous iteration (0.0 = new, 1.0 = repetitive).
    # Computed post-upsert so both iterations' embeddings are available in ChromaDB.
    semantic_similarity: float | None = None
    if iteration >= 1:
        try:
            from retrieve_context import compute_iter_similarity
            semantic_similarity = compute_iter_similarity(collection, iteration, iteration - 1)
        except Exception:
            pass

    result = {
        "stored": len(ids),
        "iteration": iteration,
        "errors": len(errors),
        "files_changed": len(changed_files),
        "has_diff": diff_content is not None,
        "collection_count": collection.count(),
        "semantic_similarity": semantic_similarity,
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

    eval_ids = [f"iter-{iteration}-eval"]
    eval_docs = ["\n".join(lines)]
    eval_metas = [{
        "iteration": iteration,
        "chunk_index": -3,
        "total_chunks": 0,
        "task": task,
        "doc_type": "eval",
        "eval_method": eval_method,
        "has_errors": False,
        "timestamp": datetime.now().isoformat(),
    }]
    collection.upsert(ids=eval_ids, documents=eval_docs, metadatas=eval_metas)

    # Update BM25 index
    try:
        bm25_idx = bm25_build_or_load(CHROMA_PATH)
        if bm25_idx is not None:
            bm25_idx.add_documents(eval_docs, eval_metas, eval_ids)
            bm25_idx.save()
    except Exception:
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--task", type=str, default="default")
    parser.add_argument("--file", type=str, required=True)
    args = parser.parse_args()

    with open(args.file, "r") as f:
        content = f.read()

    store(args.iteration, content, args.task)
