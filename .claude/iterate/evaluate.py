#!/usr/bin/env python3
"""
Evaluate iteration output via DeepSeek Reasoner (local proxy).
Exit 0  = continue
Exit 10 = stop (task complete, plateau, regression, or no progress)
"""

import argparse
import json
import os
import sys
import urllib.request

EVAL_URL = os.environ.get(
    "EVAL_LLM_URL", "http://127.0.0.1:19836/v1/chat/completions"
)
EVAL_MODEL = os.environ.get("EVAL_LLM_MODEL", "deepseek-chat")

EVAL_PROMPT = """\
You are an iteration evaluator for a multi-step AI coding task. Score the output of iteration {iteration}.

## Task
{task}

## Previous context (from earlier iterations)
{context}

## Current iteration output
{output}

Score each dimension 0.0–1.0 and give a one-sentence reason:

1. **Task Completion** — How close is the overall task to done? 1.0 = fully complete.
2. **Incremental Progress** — Did THIS iteration add new work vs prior iterations? 0.0 = pure repetition.
3. **Coherence** — Does the output logically build on prior work? Penalize going in circles.
4. **Code Quality** — Are code changes correct, secure, following patterns? 0.5 if no code changes.
5. **Focus** — Did the work stay on-task? Penalize scope creep and tangential changes.

Respond with ONLY valid JSON (no markdown fences):
{{
  "Task Completion": {{"score": 0.0, "reason": "..."}},
  "Incremental Progress": {{"score": 0.0, "reason": "..."}},
  "Coherence": {{"score": 0.0, "reason": "..."}},
  "Code Quality": {{"score": 0.0, "reason": "..."}},
  "Focus": {{"score": 0.0, "reason": "..."}}
}}
"""


def call_llm(prompt: str) -> str:
    """Call the local DeepSeek proxy for evaluation."""
    payload = json.dumps({
        "model": EVAL_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.1,
        "max_tokens": 1024,
    }).encode()

    req = urllib.request.Request(
        EVAL_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return json.dumps({
            "Task Completion": {"score": 0.5, "reason": f"Eval LLM unavailable: {e}"},
            "Incremental Progress": {"score": 0.5, "reason": "fallback"},
            "Coherence": {"score": 0.5, "reason": "fallback"},
            "Code Quality": {"score": 0.5, "reason": "fallback"},
            "Focus": {"score": 0.5, "reason": "fallback"},
        })


def parse_scores(raw: str) -> dict:
    """Parse LLM JSON response, handling markdown fences."""
    text = raw.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = "\n".join(text.split("\n")[:-1])

    try:
        scores = json.loads(text)
    except json.JSONDecodeError:
        # Try to extract JSON from the response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            scores = json.loads(text[start:end])
        else:
            scores = {}

    # Normalize: ensure all expected keys exist
    for key in ["Task Completion", "Incremental Progress", "Coherence", "Code Quality", "Focus"]:
        if key not in scores:
            scores[key] = {"score": 0.5, "reason": "not evaluated"}
        entry = scores[key]
        if "score" not in entry or entry["score"] is None:
            entry["score"] = 0.5
        entry["score"] = float(entry["score"])
        entry["passed"] = entry["score"] >= 0.5

    return scores


def compute_trend(prev_scores: list[dict], metric_name: str, window: int = 3) -> dict:
    """Compute trend for a metric over recent iterations."""
    values = []
    for s in prev_scores:
        v = s.get(metric_name, {}).get("score")
        if v is not None:
            values.append(float(v))

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
    context_file: str = None,
    prev_scores_file: str = None,
) -> dict:
    with open(output_file, "r") as f:
        actual_output = f.read()

    context = "No previous context."
    if context_file and os.path.exists(context_file):
        with open(context_file, "r") as f:
            context = f.read() or "No previous context."

    prev_scores = []
    if prev_scores_file and os.path.exists(prev_scores_file):
        with open(prev_scores_file, "r") as f:
            prev_scores = json.load(f)

    # Truncate to avoid token limits
    max_len = 8000
    if len(actual_output) > max_len:
        actual_output = actual_output[:max_len] + "\n... (truncated)"
    if len(context) > max_len:
        context = context[:max_len] + "\n... (truncated)"

    prompt = EVAL_PROMPT.format(
        iteration=iteration,
        task=task,
        context=context,
        output=actual_output,
    )

    raw = call_llm(prompt)
    scores = parse_scores(raw)

    task_score = scores["Task Completion"]["score"]
    progress_score = scores["Incremental Progress"]["score"]
    coherence_score = scores["Coherence"]["score"]
    quality_score = scores["Code Quality"]["score"]

    # Compute trends
    all_scores = prev_scores + [scores]
    trends = {}
    for name in ["Task Completion", "Incremental Progress", "Coherence", "Code Quality", "Focus"]:
        trends[name] = compute_trend(all_scores, name)

    should_continue = True
    stop_reason = None

    if task_score >= 0.9:
        should_continue = False
        stop_reason = "Task appears complete (score: {:.2f})".format(task_score)

    elif progress_score < 0.2:
        should_continue = False
        stop_reason = "No meaningful progress (score: {:.2f})".format(progress_score)

    elif coherence_score < 0.3:
        should_continue = False
        stop_reason = "Coherence degraded (score: {:.2f})".format(coherence_score)

    elif len(prev_scores) >= 3:
        recent = [s.get("Task Completion", {}).get("score", 0) for s in prev_scores[-3:]]
        if all(r is not None for r in recent):
            spread = max(recent) - min(recent)
            if spread < 0.05 and task_score > 0:
                should_continue = False
                stop_reason = "Score plateau over last 3 iterations (spread: {:.3f})".format(spread)

    # Regression detection
    if should_continue and len(prev_scores) >= 3:
        tc_trend = trends.get("Task Completion", {})
        if tc_trend.get("direction") == "declining" and tc_trend.get("avg_delta", 0) < -0.1:
            should_continue = False
            stop_reason = "Task completion regressing (avg delta: {})".format(tc_trend["avg_delta"])

    # Quality gate
    if should_continue and quality_score < 0.2 and iteration > 1:
        should_continue = False
        stop_reason = "Code quality too low (score: {:.2f})".format(quality_score)

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
    parser.add_argument("--scores-file", type=str, default="/tmp/claude-iterate/scores.json")
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
