#!/usr/bin/env python3
"""LLM-powered evaluation for iterate system.

Calls a local OpenAI-compatible API to score iteration output.
Returns the same dict shape as run_heuristic() for drop-in compatibility.
Falls back gracefully if the LLM is unavailable (timeout, error, etc.).

Configure via env:
  ITERATE_EVAL_URL  — base URL (default: http://localhost:19836)
  ITERATE_EVAL_MODEL — model name (default: deepseek-reasoner)
"""
from __future__ import annotations

import json
import os
import urllib.request
import urllib.error

from shared import ALL_METRIC_NAMES

JUDGE_PROMPT = """\
You are an eval judge for an AI coding assistant running a multi-iteration task.
Score the assistant's output on these metrics (0.0–1.0):

1. **Task Completion** — How much of the task is done? 0=nothing, 1=fully complete.
2. **Incremental Progress** — Did this iteration add new work beyond prior iterations? 0=pure repetition, 1=entirely new progress.
3. **Coherence** — Is the output relevant and on-topic? 0=off-topic, 1=perfectly focused.
4. **Code Quality** — Are there errors, bugs, or bad patterns? 0=many errors, 1=clean code.
5. **Focus** — Did the output stay focused on the task vs. tangents? 0=unfocused, 1=laser-focused.
6. **Answer Relevancy** — Does the output address what was asked? 0=irrelevant, 1=directly addresses task.
7. **Faithfulness** — Does the output match actual code changes? 0=hallucinated, 1=grounded in real changes.
8. **Contextual Relevancy** — Is prior context being used well? 0=ignoring context, 1=building on it.

Respond with ONLY a JSON object (no markdown fences):
{
  "Task Completion": {"score": 0.0, "reason": "brief reason"},
  "Incremental Progress": {"score": 0.0, "reason": "brief reason"},
  "Coherence": {"score": 0.0, "reason": "brief reason"},
  "Code Quality": {"score": 0.0, "reason": "brief reason"},
  "Focus": {"score": 0.0, "reason": "brief reason"},
  "Answer Relevancy": {"score": 0.0, "reason": "brief reason"},
  "Faithfulness": {"score": 0.0, "reason": "brief reason"},
  "Contextual Relevancy": {"score": 0.0, "reason": "brief reason"},
  "summary": "One sentence overall assessment"
}
"""


def _truncate(text: str, max_chars: int = 3000) -> str:
    if len(text) <= max_chars:
        return text
    return text[:max_chars] + "\n... (truncated)"


def run_llm_eval(
    iteration: int,
    actual_output: str,
    task: str,
    context: str,
    diff: str,
    timeout: float = 15.0,
) -> dict | None:
    """Call local LLM to score iteration output.

    Returns scores dict compatible with run_heuristic(), or None on failure.
    """
    base_url = os.environ.get("ITERATE_EVAL_URL", "http://localhost:19836")
    model = os.environ.get("ITERATE_EVAL_MODEL", "deepseek-reasoner")
    url = f"{base_url}/v1/chat/completions"

    user_msg = f"""## Task
{_truncate(task, 500)}

## Iteration {iteration} Output
{_truncate(actual_output)}

## Git Diff
{_truncate(diff, 2000)}

## Prior Context
{_truncate(context, 2000)}"""

    payload = json.dumps({
        "model": model,
        "messages": [
            {"role": "system", "content": JUDGE_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "max_tokens": 1000,
        "temperature": 0.1,
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = json.loads(resp.read())
    except (urllib.error.URLError, OSError, TimeoutError, json.JSONDecodeError):
        return None

    # Extract content from OpenAI-compatible response
    try:
        content = body["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return None

    # Parse JSON from response (strip markdown fences if present)
    text = content.strip()
    if text.startswith("```"):
        text = "\n".join(text.split("\n")[1:])
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    try:
        scores_raw = json.loads(text)
    except json.JSONDecodeError:
        return None

    # Validate and normalize
    scores = {}
    summary = scores_raw.pop("summary", "")
    for name in ALL_METRIC_NAMES:
        entry = scores_raw.get(name, {})
        score = entry.get("score", 0.5)
        if not isinstance(score, (int, float)):
            score = 0.5
        score = max(0.0, min(1.0, float(score)))
        reason = str(entry.get("reason", ""))
        scores[name] = {
            "score": round(score, 3),
            "reason": reason,
            "passed": score >= 0.5,
        }

    # Attach summary as metadata
    if summary:
        scores["_summary"] = summary

    return scores
