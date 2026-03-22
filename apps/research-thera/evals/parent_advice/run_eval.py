"""Standalone evaluation script for parent advice quality.

Usage:
    uv run python run_eval.py                              # all cases, all suites
    uv run python run_eval.py --case selective-mutism-7yo
    uv run python run_eval.py --suite grounding            # research grounding only
    uv run python run_eval.py --suite age                  # age appropriateness only
    uv run python run_eval.py --regen                      # force re-generate
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, build_input_description, run_parent_advice

OUTPUT_FILE = Path(__file__).resolve().parent / "eval-results.json"
THRESHOLD = 0.7


def build_metrics(model: DeepSeekModel) -> dict[str, dict]:
    return {
        "grounding": {
            "research_grounding": GEval(
                name="Research Grounding",
                criteria=(
                    "Evaluate whether advice is grounded in the provided research papers. "
                    "Check: (1) specific papers cited by author/title, (2) techniques from paper lists, "
                    "(3) key findings reflected, (4) no ungrounded recommendations, "
                    "(5) evidence levels respected. Penalize heavily for hallucinated techniques."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=0.75,
            ),
            "technique_traceability": GEval(
                name="Technique Traceability",
                criteria=(
                    "Evaluate whether each technique traces to a specific paper. "
                    "Check: (1) named techniques in paper lists, (2) source paper named, "
                    "(3) no novel techniques, (4) descriptions match papers."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
        },
        "analysis": {
            "deep_analysis_integration": GEval(
                name="Deep Analysis Integration",
                criteria=(
                    "Evaluate whether advice incorporates deep analysis when present. "
                    "Check: (1) executive summary insights reflected, (2) priority recs translated, "
                    "(3) patterns/root causes addressed, (4) family insights incorporated. "
                    "If no deep analysis, score 1.0."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
        },
        "age": {
            "age_appropriateness": GEval(
                name="Age Appropriateness",
                criteria=(
                    "Evaluate whether advice is appropriate for the child's stated age. "
                    "Check: (1) interventions match developmental stage, (2) language is age-appropriate, "
                    "(3) no wrong-age interventions, (4) expectations match actual age."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
        },
        "quality": {
            "practical_quality": GEval(
                name="Practical Quality",
                criteria=(
                    "Evaluate whether advice is practical for a parent. "
                    "Check: (1) concrete at-home steps, (2) warm tone, (3) examples/scenarios, "
                    "(4) organized with headers, (5) professional help guidance."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
        },
    }


def run(case_filter: str | None, suite_filter: str | None, force_regen: bool):
    model = DeepSeekModel()
    all_metrics = build_metrics(model)

    suites = list(all_metrics.keys())
    if suite_filter:
        if suite_filter not in all_metrics:
            print(f"Unknown suite: {suite_filter}")
            print(f"Available: {', '.join(suites)}")
            sys.exit(1)
        suites = [suite_filter]

    cases = TEST_CASES
    if case_filter:
        cases = [c for c in cases if c["id"] == case_filter]
        if not cases:
            print(f"Unknown case: {case_filter}")
            print(f"Available: {', '.join(c['id'] for c in TEST_CASES)}")
            sys.exit(1)

    total_metrics = sum(len(all_metrics[s]) for s in suites)
    print(f"Evaluating {len(cases)} case(s) x {len(suites)} suite(s) x {total_metrics} metric(s)")
    print()

    results = []
    for case_data in cases:
        case_id = case_data["id"]
        case_result = {"case_id": case_id, "suites": {}}

        print(f"  [{case_id}] Generating parent advice...")
        output = run_parent_advice(case_data, force_regen=force_regen)
        advice_text = output.get("advice", "")
        test_case = LLMTestCase(
            input=build_input_description(case_data),
            actual_output=advice_text,
        )

        for suite in suites:
            suite_metrics = all_metrics[suite]
            suite_result = {}

            for metric_name, metric in suite_metrics.items():
                # Skip deep analysis metric when no deep analysis exists
                if metric_name == "deep_analysis_integration" and not case_data.get("deep_analysis"):
                    print(f"    {metric_name} ... SKIP (no deep analysis)")
                    suite_result[metric_name] = {"score": 1.0, "passed": True, "reason": "Skipped: no deep analysis"}
                    continue

                print(f"    {metric_name} ... ", end="", flush=True)
                metric.measure(test_case)
                score = metric.score
                passed = score >= metric.threshold if score is not None else False
                status = "PASS" if passed else "FAIL"
                print(f"{score:.2f} [{status}]")

                suite_result[metric_name] = {
                    "score": score,
                    "passed": passed,
                    "reason": metric.reason or "",
                }

            case_result["suites"][suite] = suite_result
        results.append(case_result)

    total = 0
    passed_count = 0
    for r in results:
        for suite_metrics in r["suites"].values():
            for m in suite_metrics.values():
                total += 1
                if m["passed"]:
                    passed_count += 1

    print(f"\n{'=' * 60}")
    print(f"Results: {passed_count}/{total} passed")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": "deepseek-chat",
        "judge": "deepseek-chat",
        "threshold": THRESHOLD,
        "summary": {"total": total, "passed": passed_count, "failed": total - passed_count},
        "results": results,
    }

    OUTPUT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate parent advice quality")
    parser.add_argument("--case", type=str, choices=[c["id"] for c in TEST_CASES])
    parser.add_argument("--suite", type=str, choices=["grounding", "analysis", "age", "quality"])
    parser.add_argument("--regen", action="store_true")
    args = parser.parse_args()
    run(args.case, args.suite, args.regen)
