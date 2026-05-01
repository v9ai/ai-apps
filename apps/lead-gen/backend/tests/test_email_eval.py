"""Offline eval harness for the email_compose graph.

Gated on ``EVAL=1`` — never runs in normal pytest. See ``tests/EVALS.md``.

Two layers per golden entry:

1. **Deterministic checks** (no LLM, no token cost) — pulled from the same
   refine-pass invariants that ``email_compose_graph.py`` already enforces:
     - ``subject_length_ok``     : len(subject) ≤ 50
     - ``opening_compact``       : first paragraph ≤ 3 sentences
     - ``no_ai_markers``         : none of ``AI_MARKERS`` appear in body
     - ``has_name_placeholder``  : body contains ``{{name}}``
     - ``has_signature``         : body ends with ``Thanks,\\nVadim`` (or trailing whitespace)
     - ``word_count_ok``         : 60 ≤ word_count ≤ 240 (prompt asks 100-180; widen for safety)

   Each is scored 1.0 (pass) / 0.0 (fail). The graph's own refine loop
   already retries on these — the eval catches the case where retry
   *also* fails and the graph silently falls back to the draft.

2. **LLM-judge metrics** — per-entry, judged by ``deepseek-v4-pro`` (or
   Claude Opus when ``STRONG_JUDGE=1``):
     - ``signal_injection``  : does the body reference ≥1 expected_signal?
     - ``cta_clarity``       : exactly one clear CTA matching expected_cta_kind?
     - ``no_fabrication``    : no claimed skill/experience the SENDER lacks?
     - ``tone_match``        : tone fits the scenario (cold/follow-up/intro)?

Aggregate pass rate across (entry × metric) ≥ 0.80, matching the bar in
``OPTIMIZATION-STRATEGY.md`` and the existing pricing/gtm/positioning evals.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pytest

from leadgen_agent.email_compose_graph import AI_MARKERS, PROMPT_VERSION, build_graph

from ._eval_utils import (
    AGGREGATE_PASS_THRESHOLD,
    aggregate_gate,
    build_judge_prompt,
    eval_enabled,
    judge_available,
    judge_model_label,
    run_judge,
)

GOLDEN_PATH = Path(__file__).parent / "golden" / "email.json"

eval_required = pytest.mark.skipif(
    not eval_enabled() or not judge_available(),
    reason="set EVAL=1 and DEEPSEEK_API_KEY (or STRONG_JUDGE=1 + ANTHROPIC_API_KEY) to run",
)


@pytest.fixture(scope="module")
def golden_email() -> list[dict]:
    with GOLDEN_PATH.open("r", encoding="utf-8") as fh:
        data = json.load(fh)
    assert isinstance(data, list) and data, "golden email set must be non-empty"
    return data


# ── Deterministic checks ────────────────────────────────────────────────

_SIGNATURE_RE = re.compile(r"Thanks,\s*\n\s*Vadim\s*$")
_SENTENCE_RE = re.compile(r"[.!?]+\s+(?=[A-Z{])")


def _first_paragraph(body: str) -> str:
    for chunk in body.split("\n\n"):
        chunk = chunk.strip()
        if chunk:
            return chunk
    return ""


def _sentence_count(paragraph: str) -> int:
    if not paragraph:
        return 0
    # Count terminators followed by a capital letter or {{name}} continuation.
    # +1 for the final sentence whose terminator isn't followed by another.
    return len(_SENTENCE_RE.findall(paragraph)) + 1


def _ai_markers_present(body: str) -> list[str]:
    lower = body.lower()
    return [m for m in AI_MARKERS if m.lower() in lower]


def _word_count(body: str) -> int:
    return len([w for w in re.split(r"\s+", body.strip()) if w])


def deterministic_checks(subject: str, body: str) -> dict[str, dict[str, Any]]:
    """Return ``{check_name: {"pass": bool, "reason": str}}``."""
    opening = _first_paragraph(body)
    sentence_count = _sentence_count(opening)
    markers = _ai_markers_present(body)
    words = _word_count(body)

    checks = {
        "subject_length_ok": {
            "pass": 3 <= len(subject) <= 50,
            "reason": f"subject={len(subject)} chars",
        },
        "opening_compact": {
            "pass": sentence_count <= 3,
            "reason": f"opening sentences={sentence_count}",
        },
        "no_ai_markers": {
            "pass": not markers,
            "reason": "ok" if not markers else f"markers={markers}",
        },
        "has_name_placeholder": {
            "pass": "{{name}}" in body,
            "reason": "ok" if "{{name}}" in body else "missing {{name}}",
        },
        "has_signature": {
            "pass": bool(_SIGNATURE_RE.search(body)),
            "reason": "ok" if _SIGNATURE_RE.search(body) else "signature missing or malformed",
        },
        "word_count_ok": {
            "pass": 60 <= words <= 240,
            "reason": f"words={words}",
        },
    }
    return checks


# ── Judge metrics ───────────────────────────────────────────────────────

JUDGE_METRICS: list[tuple[str, str, str]] = [
    (
        "signal_injection",
        "expected_signals",
        "Does the body reference at least one of the expected signals — by name or "
        "via a clear semantic match? Generic mention of the company name does NOT "
        "count. Pass if at least one specific signal (repo name, paper title, "
        "stack item, recent post topic) is referenced.",
    ),
    (
        "cta_clarity",
        "expected_cta_kind",
        "Is there exactly one clear CTA, and does it match the expected kind "
        "(intro_chat / freelance_explore / timeline_question / etc.)? Multiple "
        "CTAs or vague closings ('let me know what you think') fail.",
    ),
    (
        "no_fabrication",
        None,
        "The sender (Vadim Nicolai) is a senior SWE: React/TS/Next.js, Node/GraphQL, "
        "Rust/Wasm/Cloudflare Workers, AI/ML SDK + RAG. Does the body avoid "
        "claiming skills, certifications, or experience the sender doesn't have? "
        "Pass if all claims fit that profile; fail on inflated/invented claims "
        "(e.g. 'I led a team of 50', 'I have a PhD').",
    ),
    (
        "tone_match",
        "scenario_label",
        "Does the tone fit the scenario? Cold outreach should be warm but direct "
        "(no excessive apology); follow-up should reference the prior touchpoint "
        "without re-pitching from scratch; intro to a researcher should respect "
        "their work without sycophancy.",
    ),
]


# ── Graph runner ────────────────────────────────────────────────────────

async def _run_compose(input_payload: dict[str, Any]) -> dict[str, Any]:
    graph = build_graph()
    try:
        return await graph.ainvoke(
            {
                "recipient_name": input_payload.get("recipient_name", ""),
                "company_name": input_payload.get("company_name", ""),
                "recipient_context": input_payload.get("recipient_context", ""),
                "instructions": input_payload.get("instructions", ""),
                "linkedin_post_content": input_payload.get("linkedin_post_content", ""),
            }
        )
    except Exception as e:  # noqa: BLE001
        return {"_runtime_error": repr(e)}


def _serialize_email(out: dict[str, Any]) -> str:
    subject = (out.get("subject") or "").strip()
    body = (out.get("body") or "").strip()
    return f"subject: {subject}\nbody:\n{body}\n"


# ── The eval ────────────────────────────────────────────────────────────

DETERMINISTIC_METRICS = (
    "subject_length_ok",
    "opening_compact",
    "no_ai_markers",
    "has_name_placeholder",
    "has_signature",
    "word_count_ok",
)


def _write_report(
    *,
    path: Path,
    iteration: int,
    passes: int,
    total: int,
    rate: float,
    gate_met: bool,
    det_counts: dict[str, dict[str, int]],
    judge_counts: dict[str, dict[str, int]],
    failures: list[dict[str, str]],
    runtime_errors: list[str],
) -> None:
    payload = {
        "iteration": iteration,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "prompt_version": PROMPT_VERSION,
        "judge_model": judge_model_label(),
        "aggregate": {
            "passes": passes,
            "total": total,
            "rate": round(rate, 4),
            "gate_met": gate_met,
            "gate_threshold": AGGREGATE_PASS_THRESHOLD,
        },
        "deterministic": det_counts,
        "judge": judge_counts,
        "failures": failures,
        "runtime_errors": runtime_errors,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


@eval_required
@pytest.mark.asyncio
async def test_email_eval_aggregate(golden_email: list[dict]) -> None:
    print(f"\n[email-eval] judge={judge_model_label()} entries={len(golden_email)}")

    passes = 0
    total = 0
    failures: list[dict[str, str]] = []
    runtime_errors: list[str] = []

    det_counts: dict[str, dict[str, int]] = {
        name: {"passed": 0, "total": 0} for name in DETERMINISTIC_METRICS
    }
    judge_counts: dict[str, dict[str, int]] = {
        name: {"passed": 0, "total": 0} for name, _, _ in JUDGE_METRICS
    }

    for entry in golden_email:
        scenario = entry["scenario_label"]
        out = await _run_compose(entry["input"])
        if "_runtime_error" in out:
            runtime_errors.append(f"[{entry['id']}] {out['_runtime_error']}")
            # Count every metric (det + judge) as a failure for aggregate fairness.
            total += len(DETERMINISTIC_METRICS) + len(JUDGE_METRICS)
            for name in DETERMINISTIC_METRICS:
                det_counts[name]["total"] += 1
            for name, _, _ in JUDGE_METRICS:
                judge_counts[name]["total"] += 1
            continue

        subject = (out.get("subject") or "").strip()
        body = (out.get("body") or "").strip()

        # 1. Deterministic checks
        det = deterministic_checks(subject, body)
        for name, result in det.items():
            total += 1
            det_counts[name]["total"] += 1
            if result["pass"]:
                passes += 1
                det_counts[name]["passed"] += 1
            else:
                failures.append(
                    {"id": entry["id"], "metric": name, "reason": result["reason"]}
                )

        # 2. Judge metrics
        actual = _serialize_email(out)
        for metric_name, expected_key, rubric in JUDGE_METRICS:
            total += 1
            judge_counts[metric_name]["total"] += 1
            expected = entry.get(expected_key) if expected_key else "(no explicit expected — see rubric)"
            msgs = build_judge_prompt(
                product_name=f"Email scenario — {scenario}",
                metric_name=metric_name,
                rubric=rubric,
                expected=expected,
                actual=actual,
            )
            verdict = await run_judge(msgs)
            if verdict["verdict"] == "pass":
                passes += 1
                judge_counts[metric_name]["passed"] += 1
            else:
                failures.append(
                    {
                        "id": entry["id"],
                        "metric": metric_name,
                        "reason": f"score={verdict['score']:.2f} — {verdict['reason']}",
                    }
                )

    rate, ok = aggregate_gate(passes, total)
    header = (
        f"email-eval: {passes}/{total} = {rate:.2%} "
        f"(gate {AGGREGATE_PASS_THRESHOLD:.0%}, judge={judge_model_label()})"
    )
    detail_lines = [
        f"[{f['id']}] {f['metric']} — {f['reason']}" for f in failures[:25]
    ]
    detail = "\n  - ".join(detail_lines)
    runtime = "\n  - ".join(runtime_errors[:10])
    msg = (
        f"{header}\nFailures:\n  - {detail}"
        + (f"\nRuntime errors:\n  - {runtime}" if runtime_errors else "")
    )
    print("\n" + msg)

    report_path = os.environ.get("EMAIL_EVAL_REPORT_PATH")
    if report_path:
        iteration = int(os.environ.get("EMAIL_EVAL_ITERATION", "1"))
        _write_report(
            path=Path(report_path),
            iteration=iteration,
            passes=passes,
            total=total,
            rate=rate,
            gate_met=ok,
            det_counts=det_counts,
            judge_counts=judge_counts,
            failures=failures,
            runtime_errors=runtime_errors,
        )
        print(f"[email-eval] wrote report → {report_path}")

    assert ok, msg


if __name__ == "__main__":
    async def _main() -> None:
        with GOLDEN_PATH.open() as fh:
            data = json.load(fh)
        await test_email_eval_aggregate(data)

    asyncio.run(_main())
