"""Standalone evaluation script for contact feedback issue extraction.

Usage:
    uv run python run_eval.py                              # all cases, all metrics
    uv run python run_eval.py --case academic-math-focus
    uv run python run_eval.py --metric severity_calibration
    uv run python run_eval.py --case multi-domain-complex --metric issue_completeness
    uv run python run_eval.py --regen                      # force re-extract from Qwen
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, build_user_prompt, extract_issues

OUTPUT_FILE = Path(__file__).resolve().parent / "eval-results.json"
THRESHOLD = 0.7


def build_metrics(model: DeepSeekModel) -> dict[str, GEval]:
    return {
        "issue_completeness": GEval(
            name="Issue Completeness",
            criteria=(
                "Evaluate whether the extracted issues capture ALL significant concerns "
                "mentioned in the input feedback text. Every distinct problem, difficulty, or "
                "area of concern should have a corresponding issue in the output. "
                "Penalize heavily for missed issues. Penalize lightly for slight over-splitting."
            ),
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
        "category_accuracy": GEval(
            name="Category Accuracy",
            criteria=(
                "Evaluate whether each extracted issue is assigned the correct category from: "
                "academic, behavioral, social, emotional, developmental, health, communication, other. "
                "The category must match the primary nature of the issue described. Use 'health' for "
                "physical/motor issues. Penalize miscategorizations and invalid category values."
            ),
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
        "severity_calibration": GEval(
            name="Severity Calibration",
            criteria=(
                "Evaluate whether severity ratings (low, medium, high) match the seriousness "
                "of each issue. 'high' for significant impact on daily functioning or safety, "
                "'medium' for noticeable difficulty manageable with intervention, 'low' for minor "
                "concerns. Penalize systematic over- or under-rating."
            ),
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
        "clinical_language": GEval(
            name="Clinical Language Quality",
            criteria=(
                "Evaluate language quality: professional terminology used appropriately, "
                "titles clear to parents and professionals, objective and non-judgmental, "
                "distinguishes observed behaviors from interpretations, avoids diagnostic "
                "labels unless in the input. Penalize subjective or unprofessional language."
            ),
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
    }


def run(case_filter: str | None, metric_filter: str | None, force_regen: bool):
    model = DeepSeekModel()
    all_metrics = build_metrics(model)

    if metric_filter:
        if metric_filter not in all_metrics:
            print(f"Unknown metric: {metric_filter}")
            print(f"Available: {', '.join(all_metrics.keys())}")
            sys.exit(1)
        metrics_to_run = {metric_filter: all_metrics[metric_filter]}
    else:
        metrics_to_run = all_metrics

    cases = TEST_CASES
    if case_filter:
        cases = [c for c in cases if c["id"] == case_filter]
        if not cases:
            print(f"Unknown case: {case_filter}")
            print(f"Available: {', '.join(c['id'] for c in TEST_CASES)}")
            sys.exit(1)

    print(f"Evaluating {len(cases)} case(s) x {len(metrics_to_run)} metric(s)")
    print(f"Total evaluations: {len(cases) * len(metrics_to_run)}\n")

    results = []
    for case_data in cases:
        case_id = case_data["id"]
        print(f"Extracting issues for: {case_id}")
        issues = extract_issues(case_data, force_regen=force_regen)
        print(f"  -> {len(issues)} issues extracted")

        test_case = LLMTestCase(
            input=build_user_prompt(case_data),
            actual_output=json.dumps(issues, indent=2),
        )
        case_result = {"case_id": case_id, "issue_count": len(issues), "metrics": {}}

        for metric_name, metric in metrics_to_run.items():
            print(f"  {case_id} / {metric_name} ... ", end="", flush=True)
            metric.measure(test_case)
            score = metric.score
            passed = score >= THRESHOLD if score is not None else False
            reason = metric.reason or ""
            status = "PASS" if passed else "FAIL"
            print(f"{score:.2f} [{status}]")

            case_result["metrics"][metric_name] = {
                "score": score,
                "passed": passed,
                "reason": reason,
            }

        results.append(case_result)

    total = sum(1 for r in results for _ in r["metrics"].values())
    passed_count = sum(1 for r in results for m in r["metrics"].values() if m["passed"])
    print(f"\n{'='*60}")
    print(f"Results: {passed_count}/{total} passed")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "model": "qwen-plus",
        "judge": "deepseek-chat",
        "threshold": THRESHOLD,
        "summary": {"total": total, "passed": passed_count, "failed": total - passed_count},
        "results": results,
    }

    OUTPUT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate Qwen issue extraction quality")
    parser.add_argument(
        "--case",
        type=str,
        choices=[c["id"] for c in TEST_CASES],
        help="Single test case to evaluate",
    )
    parser.add_argument(
        "--metric",
        type=str,
        choices=["issue_completeness", "category_accuracy", "severity_calibration", "clinical_language"],
        help="Single metric to evaluate",
    )
    parser.add_argument(
        "--regen",
        action="store_true",
        help="Force re-extract from Qwen (ignore fixture cache)",
    )
    args = parser.parse_args()
    run(args.case, args.metric, args.regen)
