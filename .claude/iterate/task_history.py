#!/usr/bin/env python3
"""Persistent cross-session task history stored in ChromaDB.

Stored at ~/.claude/iterate-history/ (survives /iterate reset).
Allows the iterate system to:
  - Show similar past tasks before starting a new one
  - Track which tasks were completed vs abandoned
  - Build semantic memory of what has been worked on
"""

import argparse
import json
import os
from datetime import datetime

import chromadb

from embeddings import get_embedding_function

HISTORY_PATH = os.path.expanduser(
    os.environ.get("ITERATE_HISTORY_PATH", "~/.claude/iterate-history/chroma")
)
COLLECTION_NAME = "task_history"


def _get_collection():
    os.makedirs(HISTORY_PATH, exist_ok=True)
    client = chromadb.PersistentClient(path=HISTORY_PATH)
    ef = get_embedding_function()
    kwargs: dict = {"name": COLLECTION_NAME, "metadata": {"hnsw:space": "cosine"}}
    if ef is not None:
        kwargs["embedding_function"] = ef
    return client.get_or_create_collection(**kwargs)


def record_start(task: str, session: str, cwd: str) -> None:
    """Record that a task session has started."""
    col = _get_collection()
    doc_id = f"session-{session[:12]}-start"
    col.upsert(
        ids=[doc_id],
        documents=[f"Started task: {task}\nCWD: {cwd}"],
        metadatas=[{
            "task": task,
            "session": session[:12],
            "cwd": cwd,
            "status": "started",
            "timestamp": datetime.now().isoformat(),
            "iterations": 0,
            "final_score": -1.0,
        }],
    )


def record_end(
    task: str,
    session: str,
    iterations: int,
    final_score: float,
    stop_reason: str = "",
) -> None:
    """Update task record when a session ends (complete or plateau)."""
    col = _get_collection()
    doc_id = f"session-{session[:12]}-end"
    status = "completed" if final_score >= 0.8 else "stopped"
    col.upsert(
        ids=[doc_id],
        documents=[
            f"Task: {task}\nStatus: {status}\nIterations: {iterations}\n"
            f"Score: {final_score:.2f}\nStop reason: {stop_reason}"
        ],
        metadatas=[{
            "task": task,
            "session": session[:12],
            "status": status,
            "iterations": iterations,
            "final_score": final_score,
            "stop_reason": stop_reason,
            "timestamp": datetime.now().isoformat(),
        }],
    )


def find_similar(task: str, n: int = 3) -> list[dict]:
    """Find semantically similar past tasks."""
    col = _get_collection()
    total = col.count()
    if total == 0:
        return []

    try:
        results = col.query(
            query_texts=[task],
            n_results=min(n * 2, total),
            include=["documents", "metadatas", "distances"],
            where={"status": {"$in": ["completed", "stopped"]}},
        )
    except Exception:
        return []

    if not results.get("documents") or not results["documents"][0]:
        return []

    seen_tasks: set[str] = set()
    out = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        t = meta.get("task", "")
        if t in seen_tasks:
            continue
        seen_tasks.add(t)
        out.append({
            "task": t,
            "status": meta.get("status", "?"),
            "iterations": meta.get("iterations", 0),
            "final_score": meta.get("final_score", -1.0),
            "similarity": round(max(0.0, 1.0 - dist), 3),
            "timestamp": meta.get("timestamp", ""),
        })
        if len(out) >= n:
            break

    return out


def format_similar(similar: list[dict]) -> str:
    """Format similar task results as a Markdown string for Claude to read."""
    if not similar:
        return ""
    lines = ["**Similar past tasks:**"]
    for s in similar:
        score_str = f"{s['final_score']:.2f}" if s["final_score"] >= 0 else "n/a"
        lines.append(
            f"- {s['task']} ({s['status']}, {s['iterations']} iters, score={score_str}, "
            f"similarity={s['similarity']})"
        )
    return "\n".join(lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest="cmd")

    p_start = sub.add_parser("start")
    p_start.add_argument("--task", required=True)
    p_start.add_argument("--session", required=True)
    p_start.add_argument("--cwd", default="")

    p_end = sub.add_parser("end")
    p_end.add_argument("--task", required=True)
    p_end.add_argument("--session", required=True)
    p_end.add_argument("--iterations", type=int, default=0)
    p_end.add_argument("--score", type=float, default=0.0)
    p_end.add_argument("--reason", default="")

    p_find = sub.add_parser("find")
    p_find.add_argument("--task", required=True)
    p_find.add_argument("--n", type=int, default=3)

    args = parser.parse_args()

    if args.cmd == "start":
        record_start(args.task, args.session, args.cwd)
        print(json.dumps({"ok": True, "cmd": "start"}))
    elif args.cmd == "end":
        record_end(args.task, args.session, args.iterations, args.score, args.reason)
        print(json.dumps({"ok": True, "cmd": "end", "status": "completed" if args.score >= 0.8 else "stopped"}))
    elif args.cmd == "find":
        results = find_similar(args.task, args.n)
        print(json.dumps(results, indent=2))
    else:
        parser.print_help()
