#!/usr/bin/env python3
from __future__ import annotations
"""
Evaluate iteration output using local heuristics (FastEmbed + Chroma).
No external LLM required — scoring uses cosine similarity, error extraction,
and git diff stats.

Scoring is advisory only — iterations always run to exact count.
Warnings are included in the result for feedback but never stop the loop.
"""

import argparse
import json
import os
import re
import subprocess
import sys

from embeddings import get_embedding_function
from shared import (
    ALL_METRIC_NAMES,
    cosine_similarity as _cosine_similarity,
    extract_errors as _extract_errors,
    classify_errors,
    parse_diff_stats,
)


def _embed_text(ef, text: str, max_chars: int = 2000) -> list[float] | None:
    """Embed a single text string, returning the vector or None."""
    if ef is None:
        return None
    try:
        vectors = ef([text[:max_chars]])
        return vectors[0] if vectors else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Heuristic evaluation
# ---------------------------------------------------------------------------

def run_heuristic(
    iteration: int,
    actual_output: str,
    task: str,
    context: str,
    diff: str,
    similarity: float | None = None,
) -> dict:
    """Compute all 8 metric scores using local embeddings and heuristics."""
    ef = get_embedding_function()

    # Embed key texts
    task_emb = _embed_text(ef, task)
    output_emb = _embed_text(ef, actual_output)
    context_emb = _embed_text(ef, context) if context else None
    diff_emb = _embed_text(ef, diff) if diff and diff != "No diff available." else None

    # --- Similarity computations ---
    # Output ↔ Task: how relevant is the output to the task?
    output_task_sim = (
        _cosine_similarity(output_emb, task_emb)
        if output_emb and task_emb else 0.5
    )

    # Output ↔ Context: how similar is current output to previous work?
    # High similarity = repetition (bad for progress)
    output_context_sim = (
        _cosine_similarity(output_emb, context_emb)
        if output_emb and context_emb else 0.0
    )

    # Output ↔ Diff: does the output relate to actual code changes?
    output_diff_sim = (
        _cosine_similarity(output_emb, diff_emb)
        if output_emb and diff_emb else 0.5
    )

    # Context ↔ Task: is the retrieved context relevant?
    context_task_sim = (
        _cosine_similarity(context_emb, task_emb)
        if context_emb and task_emb else 0.5
    )

    # --- Error analysis ---
    errors = _extract_errors(actual_output)
    error_count = len(errors)
    error_cats = classify_errors(errors)

    # --- Diff analysis ---
    has_diff = diff != "No diff available." and len(diff.strip()) > 20
    diff_stats = parse_diff_stats(diff) if has_diff else {"files": 0, "insertions": 0, "deletions": 0, "net": 0}
    diff_files = diff_stats["files"]

    # --- Compute metrics ---

    # Task Completion: relevance to task + code changes + low errors
    tc_base = output_task_sim * 0.6
    tc_change_bonus = min(0.25, diff_files * 0.05) if has_diff else 0.0
    tc_error_penalty = min(0.2, error_count * 0.05)
    task_completion = max(0.0, min(1.0, tc_base + tc_change_bonus - tc_error_penalty))

    # Incremental Progress: how much new work vs. repetition
    # Prefer direct inter-iteration similarity (from store_context) over context similarity.
    # Context similarity is inflated because retrieved context always shares task vocabulary.
    if similarity is not None:
        incremental_progress = max(0.0, min(1.0, 1.0 - similarity))
    elif not context or not context.strip():
        incremental_progress = 0.6
    else:
        incremental_progress = max(0.0, min(1.0, 1.0 - output_context_sim * 0.7))

    # Coherence: weighted blend of task relevance, diff alignment, and error-free execution
    # Unlike Answer Relevancy (pure semantic sim), this rewards structured progress
    coherence_base = output_task_sim * 0.5 + output_diff_sim * 0.3
    coherence_error_penalty = min(0.2, error_count * 0.1)
    coherence = max(0.0, min(1.0, coherence_base + (0.2 if has_diff else 0.0) - coherence_error_penalty))

    # Code Quality: based on error count
    code_quality = max(0.0, min(1.0, 1.0 - error_count * 0.15))

    # Focus: combination of task relevance and diff relevance
    focus = max(0.0, min(1.0, output_task_sim * 0.6 + output_diff_sim * 0.4))

    # Answer Relevancy: pure output ↔ task semantic similarity
    answer_relevancy = max(0.0, min(1.0, output_task_sim))

    # Faithfulness: does output relate to actual code changes?
    faithfulness = output_diff_sim if has_diff else 0.5

    # Contextual Relevancy: is the retrieved context relevant to the task?
    contextual_relevancy = context_task_sim

    scores = {
        "Task Completion": {
            "score": round(task_completion, 3),
            "reason": f"relevance={output_task_sim:.2f}, files={diff_files}, errors={error_count}",
            "passed": task_completion >= 0.5,
        },
        "Incremental Progress": {
            "score": round(incremental_progress, 3),
            "reason": (
                f"iter_similarity={similarity:.2f}" if similarity is not None
                else f"context_similarity={output_context_sim:.2f}" if context
                else "first iteration"
            ),
            "passed": incremental_progress >= 0.4,
        },
        "Coherence": {
            "score": round(coherence, 3),
            "reason": f"task={output_task_sim:.2f}, diff={output_diff_sim:.2f}, errors={error_count}",
            "passed": coherence >= 0.5,
        },
        "Code Quality": {
            "score": round(code_quality, 3),
            "reason": f"errors={error_count}",
            "passed": code_quality >= 0.5,
        },
        "Focus": {
            "score": round(focus, 3),
            "reason": f"task_sim={output_task_sim:.2f}, diff_sim={output_diff_sim:.2f}",
            "passed": focus >= 0.5,
        },
        "Answer Relevancy": {
            "score": round(answer_relevancy, 3),
            "reason": f"output_task_sim={output_task_sim:.2f}",
            "passed": answer_relevancy >= 0.5,
        },
        "Faithfulness": {
            "score": round(faithfulness, 3),
            "reason": f"output_diff_sim={output_diff_sim:.2f}" if has_diff else "no diff",
            "passed": faithfulness >= 0.5,
        },
        "Contextual Relevancy": {
            "score": round(contextual_relevancy, 3),
            "reason": f"context_task_sim={context_task_sim:.2f}",
            "passed": contextual_relevancy >= 0.5,
        },
    }

    return scores


# ---------------------------------------------------------------------------
# Trend analysis
# ---------------------------------------------------------------------------

def compute_trend(prev_scores: list[dict], metric_name: str, window: int = 3) -> dict:
    values = [float(s.get(metric_name, {}).get("score", 0))
              for s in prev_scores if s.get(metric_name, {}).get("score") is not None]
    if len(values) < 2:
        return {"direction": "insufficient_data", "values": values}
    recent = values[-window:]
    if len(recent) < 2:
        return {"direction": "insufficient_data", "values": recent}
    deltas = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
    avg_delta = sum(deltas) / len(deltas)
    direction = "improving" if avg_delta > 0.05 else "declining" if avg_delta < -0.05 else "stable"
    return {"direction": direction, "avg_delta": round(avg_delta, 3), "values": [round(v, 3) for v in recent]}


# ---------------------------------------------------------------------------
# Main evaluation
# ---------------------------------------------------------------------------

def run_evaluation(
    iteration,
    output_file,
    task,
    context_file=None,
    prev_scores_file=None,
    similarity=None,
):
    with open(output_file) as f:
        actual_output = f.read()
    context = ""
    if context_file and os.path.exists(context_file):
        with open(context_file) as f:
            context = f.read()

    prev_scores = []
    if prev_scores_file and os.path.exists(prev_scores_file):
        with open(prev_scores_file) as f:
            prev_scores = json.load(f)

    # Git diff — prefer uncommitted changes (typical during iterate), fall back to last commit
    diff = "No diff available."
    cwd = os.environ.get("CLAUDE_ITERATE_CWD", ".")
    for diff_base in (["HEAD"], ["HEAD~1", "HEAD"]):
        try:
            r = subprocess.run(
                ["git", "diff"] + diff_base + ["--stat", "--no-color"],
                capture_output=True, text=True, timeout=5, cwd=cwd,
            )
            if r.returncode == 0 and r.stdout.strip():
                diff = r.stdout.strip()
                break
        except Exception:
            pass

    # Truncate
    max_len = 8000
    if len(actual_output) > max_len:
        actual_output = actual_output[:max_len] + "\n... (truncated)"
    if len(context) > max_len:
        context = context[:max_len] + "\n... (truncated)"

    # Append semantic similarity note to context so heuristic metrics can factor it in
    if similarity is not None:
        sim_note = f"\n## Semantic Similarity\nOutput similarity to previous iteration: {similarity:.3f}"
        if similarity > 0.88:
            sim_note += " (HIGH — may be repeating prior work)"
        context = context + sim_note if context else sim_note.lstrip()

    scores = run_heuristic(iteration, actual_output, task, context, diff, similarity=similarity)
    eval_method = "heuristic"

    # Trends (advisory only — iterations always run to completion)
    all_scores = prev_scores + [scores]
    trends = {name: compute_trend(all_scores, name) for name in ALL_METRIC_NAMES}

    tc = scores["Task Completion"]["score"]
    pr = scores["Incremental Progress"]["score"]
    co = scores["Coherence"]["score"]
    qu = scores["Code Quality"]["score"]

    # Advisory warnings — never stop the loop, only inform Claude
    warnings: list[str] = []
    if tc >= 0.9:
        warnings.append(f"Task appears complete (tc={tc:.2f})")
    if pr < 0.2:
        warnings.append(f"Low progress detected (pr={pr:.2f})")
    if co < 0.3:
        warnings.append(f"Coherence degraded (co={co:.2f})")
    if qu < 0.2 and iteration > 1:
        warnings.append(f"Code quality low (qu={qu:.2f})")
    if similarity is not None and similarity > 0.92 and iteration > 1:
        warnings.append(f"Semantic repetition (sim={similarity:.3f})")
    if len(all_scores) >= 5:
        recent = [s.get("Task Completion", {}).get("score", 0) for s in all_scores[-5:]]
        if all(r is not None for r in recent) and max(recent) - min(recent) < 0.08 and tc > 0:
            warnings.append(f"Score plateau (spread={max(recent)-min(recent):.3f})")
    if len(prev_scores) >= 3:
        t = trends.get("Task Completion", {})
        if t.get("direction") == "declining" and t.get("avg_delta", 0) < -0.1:
            warnings.append(f"Regression (Δ{t['avg_delta']})")

    result = {
        "iteration": iteration,
        "scores": scores,
        "trends": trends,
        "eval_method": eval_method,
        "warnings": warnings,
        "semantic_similarity": similarity,
    }

    prev_scores.append(scores)
    if prev_scores_file:
        with open(prev_scores_file, "w") as f:
            json.dump(prev_scores, f, indent=2)

    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--output-file", type=str, required=True)
    parser.add_argument("--task", type=str, required=True)
    parser.add_argument("--context-file", type=str)
    parser.add_argument("--scores-file", type=str, default="/tmp/claude-iterate/scores.json")
    parser.add_argument("--similarity", type=float, default=None,
                        help="Semantic similarity to previous iteration (0.0-1.0)")
    args = parser.parse_args()

    result = run_evaluation(
        iteration=args.iteration,
        output_file=args.output_file,
        task=args.task,
        context_file=args.context_file,
        prev_scores_file=args.scores_file,
        similarity=args.similarity,
    )
    print(json.dumps(result, indent=2))
