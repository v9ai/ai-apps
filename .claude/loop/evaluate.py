#!/usr/bin/env python3
"""
Evaluate iteration output with DeepEval.
Exit 0  = continue (or first iteration)
Exit 10 = stop (task complete, plateau, or no progress)
"""

import argparse
import json
import os
import sys

from deepeval import evaluate
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams


def build_metrics(task: str):
    task_completion = GEval(
        name="Task Completion",
        criteria=(
            f"Evaluate progress toward completing the task: {task}. "
            "Score 1.0 if fully complete, 0.0 if no meaningful progress."
        ),
        evaluation_params=[
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=0.5,
    )

    coherence = GEval(
        name="Coherence",
        criteria=(
            "Evaluate whether the output is coherent and logically builds on "
            "previous iterations. Penalize repetition or going in circles."
        ),
        evaluation_params=[
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.CONTEXT,
        ],
        threshold=0.5,
    )

    progress = GEval(
        name="Incremental Progress",
        criteria=(
            "Evaluate whether this iteration made NEW progress compared to "
            "previous iterations in context. Score 0.0 if mostly repeating "
            "prior work, 1.0 if substantial new work."
        ),
        evaluation_params=[
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.CONTEXT,
        ],
        threshold=0.4,
    )

    code_quality = GEval(
        name="Code Quality",
        criteria=(
            "Evaluate the quality of code changes in the output. Consider: "
            "correct syntax, no obvious bugs, follows existing patterns, "
            "no security issues introduced. Score 0.5 if no code changes. "
            "Score 1.0 for clean, correct code."
        ),
        evaluation_params=[
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=0.5,
    )

    focus = GEval(
        name="Focus",
        criteria=(
            f"Evaluate whether the output stays focused on the task: {task}. "
            "Penalize tangential work, unnecessary refactoring, or scope creep. "
            "Score 1.0 if tightly focused, 0.0 if mostly off-task."
        ),
        evaluation_params=[
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=0.5,
    )

    return [task_completion, coherence, progress, code_quality, focus]


def compute_trend(prev_scores: list[dict], metric_name: str, window: int = 3) -> dict:
    """Compute trend info for a metric over recent iterations."""
    values = []
    for s in prev_scores:
        v = s.get(metric_name, {}).get("score")
        if v is not None:
            values.append(v)

    if len(values) < 2:
        return {"direction": "insufficient_data", "values": values}

    recent = values[-window:]
    if len(recent) < 2:
        return {"direction": "insufficient_data", "values": recent}

    deltas = [recent[i] - recent[i - 1] for i in range(1, len(recent))]
    avg_delta = sum(deltas) / len(deltas)

    if avg_delta > 0.05:
        direction = "improving"
    elif avg_delta < -0.05:
        direction = "declining"
    else:
        direction = "stable"

    return {
        "direction": direction,
        "avg_delta": round(avg_delta, 3),
        "values": [round(v, 3) for v in recent],
    }


def run_evaluation(
    iteration: int,
    output_file: str,
    task: str,
    context_file: str | None = None,
    prev_scores_file: str | None = None,
) -> dict:
    with open(output_file, "r") as f:
        actual_output = f.read()

    context = []
    if context_file and os.path.exists(context_file):
        with open(context_file, "r") as f:
            context = [f.read()]

    prev_scores = []
    if prev_scores_file and os.path.exists(prev_scores_file):
        with open(prev_scores_file, "r") as f:
            prev_scores = json.load(f)

    metrics = build_metrics(task)

    test_case = LLMTestCase(
        input=f"Iteration {iteration} of loop task: {task}",
        actual_output=actual_output,
        expected_output=f"Complete the following task: {task}",
        context=context,
    )

    evaluate(test_cases=[test_case], metrics=metrics, run_async=False)

    scores = {}
    for metric in metrics:
        name = metric.name if hasattr(metric, "name") else metric.__class__.__name__
        scores[name] = {
            "score": metric.score,
            "reason": metric.reason,
            "passed": metric.score >= metric.threshold if metric.score is not None else False,
        }

    task_score = scores.get("Task Completion", {}).get("score", 0) or 0
    progress_score = scores.get("Incremental Progress", {}).get("score", 0) or 0
    coherence_score = scores.get("Coherence", {}).get("score", 0) or 0
    quality_score = scores.get("Code Quality", {}).get("score", 0) or 0
    focus_score = scores.get("Focus", {}).get("score", 0) or 0

    # Compute trends
    trends = {}
    for metric_name in ["Task Completion", "Incremental Progress", "Coherence", "Code Quality", "Focus"]:
        all_scores = prev_scores + [scores]
        trends[metric_name] = compute_trend(all_scores, metric_name)

    should_continue = True
    stop_reason = None

    # Stop: task complete
    if task_score >= 0.9:
        should_continue = False
        stop_reason = f"Task appears complete (score: {task_score:.2f})"

    # Stop: no progress
    elif progress_score < 0.2:
        should_continue = False
        stop_reason = f"No meaningful progress (score: {progress_score:.2f})"

    # Stop: coherence collapse
    elif coherence_score < 0.3:
        should_continue = False
        stop_reason = f"Coherence degraded (score: {coherence_score:.2f})"

    # Stop: score plateau over 3 iterations
    elif len(prev_scores) >= 3:
        recent = [s.get("Task Completion", {}).get("score", 0) for s in prev_scores[-3:]]
        if all(r is not None for r in recent):
            spread = max(recent) - min(recent)
            if spread < 0.05 and task_score > 0:
                should_continue = False
                stop_reason = f"Score plateau over last 3 iterations (spread: {spread:.3f})"

    # Stop: regression — task completion declining over 3 iterations
    if should_continue and len(prev_scores) >= 3:
        tc_trend = trends.get("Task Completion", {})
        if tc_trend.get("direction") == "declining" and tc_trend.get("avg_delta", 0) < -0.1:
            should_continue = False
            stop_reason = f"Task completion regressing (avg delta: {tc_trend['avg_delta']})"

    # Stop: quality collapse
    if should_continue and quality_score < 0.2 and iteration > 1:
        should_continue = False
        stop_reason = f"Code quality too low (score: {quality_score:.2f})"

    result = {
        "iteration": iteration,
        "scores": scores,
        "trends": trends,
        "continue": should_continue,
        "stop_reason": stop_reason,
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
    parser.add_argument("--scores-file", type=str, default="/tmp/claude-loop/scores.json")
    args = parser.parse_args()

    result = run_evaluation(
        iteration=args.iteration,
        output_file=args.output_file,
        task=args.task,
        context_file=args.context_file,
        prev_scores_file=args.scores_file,
    )

    print(json.dumps(result, indent=2))

    if not result["continue"]:
        sys.exit(10)
