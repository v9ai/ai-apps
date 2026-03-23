#!/usr/bin/env python3
"""
Evaluate iteration output using DeepEval GEval metrics + local DeepSeek proxy.
Exit 0  = continue
Exit 10 = stop (task complete, plateau, regression, or no progress)
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.request

EVAL_URL = os.environ.get(
    "EVAL_LLM_URL", "http://127.0.0.1:19836/v1/chat/completions"
)
EVAL_MODEL = os.environ.get("EVAL_LLM_MODEL", "deepseek-chat")

# ---------------------------------------------------------------------------
# Custom DeepEval LLM that uses the local proxy
# ---------------------------------------------------------------------------
_deepeval_available = False
try:
    from deepeval.models import DeepEvalBaseLLM
    from deepeval.metrics import GEval
    from deepeval.test_case import LLMTestCase, LLMTestCaseParams
    _deepeval_available = True
except ImportError:
    pass


if _deepeval_available:
    class LocalDeepSeekLLM(DeepEvalBaseLLM):
        """DeepEval-compatible wrapper around the local DeepSeek proxy."""

        def __init__(self, url: str = EVAL_URL, model: str = EVAL_MODEL):
            self.url = url
            self.model_name = model

        def load_model(self):
            return self.model_name

        def get_model_name(self) -> str:
            return self.model_name

        def generate(self, prompt: str, **kwargs) -> str:
            payload = json.dumps({
                "model": self.model_name,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2048,
            }).encode()
            req = urllib.request.Request(
                self.url, data=payload,
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read())
                return data["choices"][0]["message"]["content"]

        async def a_generate(self, prompt: str, **kwargs) -> str:
            return self.generate(prompt, **kwargs)


def _proxy_available() -> bool:
    """Check if the local DeepSeek proxy is reachable."""
    try:
        base = EVAL_URL.rsplit("/v1/", 1)[0]
        urllib.request.urlopen(f"{base}/v1/models", timeout=2)
        return True
    except Exception:
        return False


# ---------------------------------------------------------------------------
# DeepEval-based evaluation
# ---------------------------------------------------------------------------
def run_deepeval(iteration: int, actual_output: str, task: str, context: str, diff: str) -> dict:
    """Run GEval metrics via DeepEval with local LLM."""
    llm = LocalDeepSeekLLM()

    metrics = [
        GEval(
            name="Task Completion",
            criteria=f"Evaluate progress toward completing: {task}. 1.0 = fully complete.",
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.5,
            model=llm,
        ),
        GEval(
            name="Incremental Progress",
            criteria="Did this iteration add NEW work vs prior? 0.0 = pure repetition, 1.0 = substantial new work.",
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT],
            threshold=0.4,
            model=llm,
        ),
        GEval(
            name="Coherence",
            criteria="Does the output logically build on prior work? Penalize going in circles.",
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.CONTEXT],
            threshold=0.5,
            model=llm,
        ),
        GEval(
            name="Code Quality",
            criteria="Are code changes correct, secure, following patterns? 0.5 if no code changes.",
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.5,
            model=llm,
        ),
        GEval(
            name="Focus",
            criteria=f"Did work stay on-task for: {task}? Penalize scope creep.",
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.5,
            model=llm,
        ),
    ]

    test_case = LLMTestCase(
        input=f"Iteration {iteration}: {task}",
        actual_output=f"{actual_output}\n\n## Files changed\n{diff}",
        expected_output=f"Complete the task: {task}",
        context=[context] if context else [],
        retrieval_context=[context] if context else [],
    )

    from deepeval import evaluate as de_evaluate
    de_evaluate(test_cases=[test_case], metrics=metrics, run_async=False, print_results=False)

    scores = {}
    for m in metrics:
        scores[m.name] = {
            "score": m.score if m.score is not None else 0.5,
            "reason": m.reason or "",
            "passed": (m.score or 0) >= m.threshold,
        }
    return scores


# ---------------------------------------------------------------------------
# Fallback: direct LLM call (no deepeval dependency)
# ---------------------------------------------------------------------------
EVAL_PROMPT = """\
You are an iteration evaluator for a multi-step AI coding task. Score iteration {iteration}.

## Task
{task}

## Previous context
{context}

## Files changed
{diff}

## Output
{output}

Score 0.0–1.0 with one-sentence reason. Respond ONLY with JSON:
{{"Task Completion": {{"score": 0.0, "reason": "..."}}, "Incremental Progress": {{"score": 0.0, "reason": "..."}}, "Coherence": {{"score": 0.0, "reason": "..."}}, "Code Quality": {{"score": 0.0, "reason": "..."}}, "Focus": {{"score": 0.0, "reason": "..."}}}}
"""


def run_direct_llm(iteration: int, actual_output: str, task: str, context: str, diff: str) -> dict:
    """Fallback: single LLM call for all scores."""
    payload = json.dumps({
        "model": EVAL_MODEL,
        "messages": [{"role": "user", "content": EVAL_PROMPT.format(
            iteration=iteration, task=task, context=context[:4000],
            diff=diff, output=actual_output[:4000],
        )}],
        "temperature": 0.1,
        "max_tokens": 1024,
    }).encode()
    req = urllib.request.Request(
        EVAL_URL, data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
        raw = data["choices"][0]["message"]["content"]

    # Parse JSON from response
    text = raw.strip()
    for fence in ("```json", "```"):
        if text.startswith(fence):
            text = "\n".join(text.split("\n")[1:])
    if text.endswith("```"):
        text = "\n".join(text.split("\n")[:-1])
    try:
        scores = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}") + 1
        scores = json.loads(text[start:end]) if start >= 0 and end > start else {}

    for key in ["Task Completion", "Incremental Progress", "Coherence", "Code Quality", "Focus"]:
        if key not in scores:
            scores[key] = {"score": 0.5, "reason": "not evaluated"}
        e = scores[key]
        e["score"] = float(e.get("score", 0.5) or 0.5)
        e["passed"] = e["score"] >= 0.5
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
def run_evaluation(iteration, output_file, task, context_file=None, prev_scores_file=None):
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

    # Git diff
    diff = "No diff available."
    try:
        r = subprocess.run(["git", "diff", "HEAD~1", "--stat", "--no-color"],
                           capture_output=True, text=True, timeout=5,
                           cwd=os.environ.get("CLAUDE_ITERATE_CWD", "."))
        if r.returncode == 0 and r.stdout.strip():
            diff = r.stdout.strip()
    except Exception:
        pass

    # Truncate
    max_len = 8000
    if len(actual_output) > max_len:
        actual_output = actual_output[:max_len] + "\n... (truncated)"
    if len(context) > max_len:
        context = context[:max_len] + "\n... (truncated)"

    # Choose eval strategy
    scores = None
    eval_method = "fallback"

    if _proxy_available():
        if _deepeval_available:
            try:
                scores = run_deepeval(iteration, actual_output, task, context, diff)
                eval_method = "deepeval"
            except Exception as e:
                sys.stderr.write(f"[eval] deepeval failed: {e}, falling back to direct LLM\n")
        if scores is None:
            try:
                scores = run_direct_llm(iteration, actual_output, task, context, diff)
                eval_method = "direct_llm"
            except Exception as e:
                sys.stderr.write(f"[eval] direct LLM failed: {e}\n")

    if scores is None:
        scores = {k: {"score": 0.5, "reason": "fallback", "passed": True}
                  for k in ["Task Completion", "Incremental Progress", "Coherence", "Code Quality", "Focus"]}

    # Trends + stop logic
    all_scores = prev_scores + [scores]
    trends = {name: compute_trend(all_scores, name)
              for name in ["Task Completion", "Incremental Progress", "Coherence", "Code Quality", "Focus"]}

    tc = scores["Task Completion"]["score"]
    pr = scores["Incremental Progress"]["score"]
    co = scores["Coherence"]["score"]
    qu = scores["Code Quality"]["score"]

    should_continue, stop_reason = True, None

    if tc >= 0.9:
        should_continue, stop_reason = False, f"Task complete ({tc:.2f})"
    elif pr < 0.2:
        should_continue, stop_reason = False, f"No progress ({pr:.2f})"
    elif co < 0.3:
        should_continue, stop_reason = False, f"Coherence degraded ({co:.2f})"
    elif len(prev_scores) >= 3:
        recent = [s.get("Task Completion", {}).get("score", 0) for s in prev_scores[-3:]]
        if all(r is not None for r in recent) and max(recent) - min(recent) < 0.05 and tc > 0:
            should_continue, stop_reason = False, f"Score plateau (spread: {max(recent)-min(recent):.3f})"

    if should_continue and len(prev_scores) >= 3:
        t = trends.get("Task Completion", {})
        if t.get("direction") == "declining" and t.get("avg_delta", 0) < -0.1:
            should_continue, stop_reason = False, f"Regressing (Δ{t['avg_delta']})"

    if should_continue and qu < 0.2 and iteration > 1:
        should_continue, stop_reason = False, f"Quality too low ({qu:.2f})"

    result = {
        "iteration": iteration,
        "scores": scores,
        "trends": trends,
        "eval_method": eval_method,
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
