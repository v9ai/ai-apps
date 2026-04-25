"""Shared helpers for the offline eval harness (pricing/gtm/positioning).

Gated on ``EVAL=1`` — mirrors the convention in ``test_deep_icp_eval.py``.
Everything in this module is opt-in; importing it does not trigger graph
runs or network calls.

Judge strategy:
  * Default judge: ``deepseek-v4-pro`` via the existing ``make_llm`` factory
    with ``provider="deepseek", tier="deep"``. Cheap, already wired to
    ``DEEPSEEK_API_KEY``, and matches the models the graphs themselves use.
  * ``STRONG_JUDGE=1`` + ``ANTHROPIC_API_KEY``: swap in Claude Opus
    (``claude-opus-4-7``) via the ``anthropic`` SDK. We detect the SDK at
    import-time so unit tests can still import this module without it. If the
    SDK is missing the flag is silently ignored and we fall back to DeepSeek.

Pass/fail:
  * Per golden entry × per metric, the judge returns a float in [0, 1].
  * Aggregate pass rate across all (entry × metric) cells must be >= 0.80
    (matches the OPTIMIZATION-STRATEGY.md eval-first bar).
  * Individual cells pass at >= 0.7 (same threshold deep_icp uses).
"""

from __future__ import annotations

import json
import os
from typing import Any

# ── Gating ──────────────────────────────────────────────────────────────

def eval_enabled() -> bool:
    return os.environ.get("EVAL") == "1"


def strong_judge_requested() -> bool:
    return os.environ.get("STRONG_JUDGE") == "1"


def _anthropic_available() -> bool:
    try:
        import anthropic  # noqa: F401
        return True
    except ImportError:
        return False


def judge_model_label() -> str:
    from leadgen_agent.llm import deepseek_model_name

    if strong_judge_requested() and _anthropic_available() and os.environ.get("ANTHROPIC_API_KEY"):
        return os.environ.get("STRONG_JUDGE_MODEL", "claude-opus-4-7")
    return deepseek_model_name("deep")


def judge_available() -> bool:
    """At least one judge path is usable."""
    from leadgen_agent.llm import is_deepseek_configured

    if strong_judge_requested() and _anthropic_available() and os.environ.get("ANTHROPIC_API_KEY"):
        return True
    # DeepSeek fallback — needs the key.
    return is_deepseek_configured()


# ── Judge prompt template ───────────────────────────────────────────────
#
# One prompt shape for all three graphs. The caller supplies:
#   - metric_name: short label (e.g. "value_metric_match")
#   - rubric: 1-3 sentence description of what counts as a match
#   - expected: the golden label (string or list-of-strings)
#   - actual: the serialized graph output
# The judge returns a single JSON object.

_JUDGE_SYSTEM = (
    "You are an offline evaluator for a B2B product-intelligence pipeline. "
    "You score ONE metric at a time against a hand-labeled golden expected "
    "value. Be strict but fair: credit semantic matches and reasonable "
    "synonyms; penalize missing or hallucinated content. "
    'Respond with strict JSON only: {"score": float in [0,1], '
    '"verdict": "pass"|"fail", "reason": "one-sentence justification"}.'
)


def build_judge_prompt(
    *,
    product_name: str,
    metric_name: str,
    rubric: str,
    expected: Any,
    actual: str,
) -> list[dict[str, str]]:
    expected_str = (
        json.dumps(expected, ensure_ascii=False)
        if not isinstance(expected, str)
        else expected
    )
    user = (
        f"Product: {product_name}\n"
        f"Metric: {metric_name}\n"
        f"Rubric: {rubric}\n\n"
        f"Expected (golden):\n{expected_str}\n\n"
        f"Actual output (from the live graph):\n{actual}\n\n"
        'Return strict JSON: {"score": <float 0..1>, "verdict": "pass" if '
        '>=0.7 else "fail", "reason": "<=1 sentence"}.'
    )
    return [
        {"role": "system", "content": _JUDGE_SYSTEM},
        {"role": "user", "content": user},
    ]


# ── Judge runtime ───────────────────────────────────────────────────────

async def run_judge(messages: list[dict[str, str]]) -> dict[str, Any]:
    """Route to Anthropic (if STRONG_JUDGE+SDK+key) or DeepSeek. Always
    returns a dict with ``score`` (float) and ``verdict`` (str)."""
    if (
        strong_judge_requested()
        and _anthropic_available()
        and os.environ.get("ANTHROPIC_API_KEY")
    ):
        return await _run_anthropic_judge(messages)
    return await _run_deepseek_judge(messages)


async def _run_deepseek_judge(messages: list[dict[str, str]]) -> dict[str, Any]:
    # Lazy import so this module stays cheap to import for golden-set-only users.
    from leadgen_agent.llm import ainvoke_json, make_llm

    llm = make_llm(temperature=0.0, provider="deepseek", tier="deep")
    try:
        result = await ainvoke_json(llm, messages, provider="deepseek")
    except Exception as e:  # noqa: BLE001
        return {"score": 0.0, "verdict": "fail", "reason": f"judge error: {e!r}"}
    return _normalize_judge_response(result)


async def _run_anthropic_judge(messages: list[dict[str, str]]) -> dict[str, Any]:
    import anthropic  # type: ignore

    # Anthropic's Messages API expects system separately from turns.
    system = next((m["content"] for m in messages if m["role"] == "system"), "")
    user_turns = [m for m in messages if m["role"] != "system"]

    client = anthropic.AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    model = os.environ.get("STRONG_JUDGE_MODEL", "claude-opus-4-7")
    try:
        resp = await client.messages.create(
            model=model,
            max_tokens=400,
            temperature=0.0,
            system=system,
            messages=[{"role": m["role"], "content": m["content"]} for m in user_turns],
        )
    except Exception as e:  # noqa: BLE001
        return {"score": 0.0, "verdict": "fail", "reason": f"anthropic error: {e!r}"}

    text = ""
    for block in getattr(resp, "content", []) or []:
        if getattr(block, "type", "") == "text":
            text = getattr(block, "text", "") or ""
            break
    try:
        parsed = json.loads(text.strip().strip("`"))
    except Exception:  # noqa: BLE001
        from json_repair import repair_json  # lazy
        parsed = repair_json(text, return_objects=True) or {}
    return _normalize_judge_response(parsed)


def _normalize_judge_response(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {"score": 0.0, "verdict": "fail", "reason": "non-dict judge output"}
    try:
        score = float(raw.get("score", 0.0))
    except (TypeError, ValueError):
        score = 0.0
    score = max(0.0, min(1.0, score))
    verdict = str(raw.get("verdict") or ("pass" if score >= 0.7 else "fail"))
    return {
        "score": score,
        "verdict": verdict,
        "reason": str(raw.get("reason", ""))[:400],
    }


# ── Aggregation ─────────────────────────────────────────────────────────

CELL_PASS_THRESHOLD = 0.7
AGGREGATE_PASS_THRESHOLD = 0.80


def aggregate_gate(passes: int, total: int) -> tuple[float, bool]:
    rate = passes / max(1, total)
    return rate, rate >= AGGREGATE_PASS_THRESHOLD
