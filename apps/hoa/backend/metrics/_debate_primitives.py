"""Shared primitives for the adversarial debate protocol.

Centralises:
- The three persona system prompts (loaded from agent bundles).
- A jury aggregator that combines structured per-judge verdicts into a
  single ruling.
- The judge JSON contract used by both regen_questions.py and
  DebateMetric.

Both `regen_questions.py` (production orchestrator) and
`metrics/debate_metric.py` (DeepEval BaseMetric wrapper) import from
here so debate logic stays in one place.
"""

from __future__ import annotations

import statistics
from typing import Any, Iterable

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from hf_agent import load_agent

ADVOCATE_SYSTEM = load_agent("regen-advocate").system_prompt
CRITIC_SYSTEM = load_agent("regen-critic").system_prompt
JUDGE_SYSTEM = load_agent("regen-judge").system_prompt

JUDGE_JSON_INSTRUCTION = (
    "Respond with a single JSON object — no prose outside it — using EXACTLY this shape:\n"
    "{\n"
    '  "questions": [\n'
    '    {"index": <int, 1-based>,\n'
    '     "verdict": "ACCEPTED" | "REVISION_REQUIRED" | "REJECTED",\n'
    '     "score": <float 0..1>,\n'
    '     "reason": "<1-2 sentences citing specific evidence>",\n'
    '     "revised": {"category": "...", "question": "...",\n'
    '                 "why_this_question": "...", "expected_insight": "..."}\n'
    '       (omit unless verdict is REVISION_REQUIRED or REJECTED)}\n'
    '  ],\n'
    '  "overall_score": <float 0..1>,\n'
    '  "overall_reason": "<1-2 sentences on the set as a whole>"\n'
    "}"
)

VERDICT_RANK = {"ACCEPTED": 2, "REVISION_REQUIRED": 1, "REJECTED": 0}


def _normalise_verdict(raw: str) -> str:
    v = (raw or "").strip().upper().replace(" ", "_")
    if v in VERDICT_RANK:
        return v
    if v.startswith("REVIS"):
        return "REVISION_REQUIRED"
    if v.startswith("REJEC"):
        return "REJECTED"
    return "ACCEPTED"


def _majority_verdict(verdicts: Iterable[str]) -> str:
    """Pick the most common verdict; ties resolve toward the more conservative
    (REVISION_REQUIRED beats ACCEPTED, REJECTED beats REVISION_REQUIRED)."""
    counts: dict[str, int] = {}
    for v in verdicts:
        v = _normalise_verdict(v)
        counts[v] = counts.get(v, 0) + 1
    if not counts:
        return "REVISION_REQUIRED"
    top = max(counts.values())
    tied = [v for v, c in counts.items() if c == top]
    return min(tied, key=lambda v: VERDICT_RANK[v])


def jury_aggregate(judgments: list[dict]) -> dict:
    """Aggregate N structured judge verdicts into one.

    Each judgment must follow the JUDGE_JSON_INSTRUCTION shape. Per-question
    aggregation: median(score), majority(verdict) with conservative tie-break,
    concatenated reasons tagged "J1: ...  J2: ...". A `revised` field is kept
    from the first judge that supplied one when the aggregated verdict is not
    ACCEPTED.
    """
    if not judgments:
        return {"questions": [], "overall_score": 0.0, "overall_reason": "no judgments"}

    if len(judgments) == 1:
        j = judgments[0]
        questions = []
        for q in j.get("questions", []):
            q = dict(q)
            q["verdict"] = _normalise_verdict(q.get("verdict", ""))
            q["score"] = float(q.get("score", 0.0))
            questions.append(q)
        return {
            "questions": questions,
            "overall_score": float(j.get("overall_score", 0.0)),
            "overall_reason": str(j.get("overall_reason", "")),
        }

    # Build index → list of (judge_idx, q_dict) groupings.
    by_index: dict[int, list[tuple[int, dict]]] = {}
    for ji, j in enumerate(judgments):
        for q in j.get("questions", []):
            idx = int(q.get("index", 0))
            by_index.setdefault(idx, []).append((ji, q))

    aggregated_questions: list[dict] = []
    for idx in sorted(by_index):
        rows = by_index[idx]
        scores = [float(q.get("score", 0.0)) for _, q in rows]
        verdicts = [q.get("verdict", "") for _, q in rows]
        verdict = _majority_verdict(verdicts)
        score = float(statistics.median(scores)) if scores else 0.0
        reason = "  ".join(
            f"J{ji+1}: {str(q.get('reason', '')).strip()}"
            for ji, q in rows
            if q.get("reason")
        )
        out = {
            "index": idx,
            "verdict": verdict,
            "score": score,
            "reason": reason,
        }
        if verdict != "ACCEPTED":
            for _, q in rows:
                rev = q.get("revised")
                if isinstance(rev, dict) and rev.get("question"):
                    out["revised"] = rev
                    break
        aggregated_questions.append(out)

    overall_scores = [float(j.get("overall_score", 0.0)) for j in judgments]
    overall_score = float(statistics.median(overall_scores)) if overall_scores else 0.0
    overall_reason = "  ".join(
        f"J{ji+1}: {str(j.get('overall_reason', '')).strip()}"
        for ji, j in enumerate(judgments)
        if j.get("overall_reason")
    )

    return {
        "questions": aggregated_questions,
        "overall_score": overall_score,
        "overall_reason": overall_reason,
    }


def synthesise_critique_text(aggregated: dict) -> str:
    """Render an aggregated jury verdict as natural-language feedback that the
    advocate can consume in subsequent rounds."""
    lines = []
    for q in aggregated.get("questions", []):
        line = (
            f"Q{q.get('index')}: {q.get('verdict')} "
            f"(score {q.get('score', 0.0):.2f}) — {q.get('reason', '')}"
        )
        rev = q.get("revised")
        if isinstance(rev, dict) and rev.get("question"):
            line += f"\n  Suggested revision: {rev.get('question')}"
        lines.append(line)
    if aggregated.get("overall_reason"):
        lines.append(f"\nOVERALL ({aggregated.get('overall_score', 0.0):.2f}): "
                     f"{aggregated['overall_reason']}")
    return "\n".join(lines)


__all__ = [
    "ADVOCATE_SYSTEM",
    "CRITIC_SYSTEM",
    "JUDGE_SYSTEM",
    "JUDGE_JSON_INSTRUCTION",
    "jury_aggregate",
    "synthesise_critique_text",
]
