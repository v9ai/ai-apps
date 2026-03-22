"""Standalone evaluation script for deep analysis DOB/age and schema quality.

Usage:
    uv run python run_eval.py                        # all cases, all suites
    uv run python run_eval.py --case preschooler-behavioral
    uv run python run_eval.py --suite dob            # only DOB/age metrics
    uv run python run_eval.py --suite schema         # only schema metrics
    uv run python run_eval.py --regen                # force re-generate from DeepSeek
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import TEST_CASES, build_input_description, run_deep_analysis

OUTPUT_FILE = Path(__file__).resolve().parent / "eval-results.json"
THRESHOLD = 0.7


def build_metrics(model: DeepSeekModel) -> dict[str, dict]:
    """Build metrics organized by suite."""
    return {
        "dob": {
            "dob_summary_consistency": GEval(
                name="DOB Summary Consistency",
                criteria=(
                    "Evaluate whether the executive summary correctly references the child's "
                    "actual age and uses age-appropriate language. Check that: "
                    "(1) summary mentions the correct age or developmental stage, "
                    "(2) language does not imply a different age group, "
                    "(3) developmental milestones referenced are appropriate for the stated age, "
                    "(4) date of birth year is not contradicted."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
            "dob_recommendations_age": GEval(
                name="DOB Recommendations Age-Appropriateness",
                criteria=(
                    "Evaluate whether the priority recommendations are age-appropriate. "
                    "Check that: (1) suggested approaches are for the child's actual age group, "
                    "(2) no recommendation assumes capabilities beyond the developmental stage, "
                    "(3) referenced interventions target the correct population, "
                    "(4) school-related recommendations align with the child's school level."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
            "dob_developmental_context": GEval(
                name="DOB Developmental Context Accuracy",
                criteria=(
                    "Evaluate whether the developmentalContext accurately captures the child's "
                    "age and stage. Check that: (1) statedAge matches input exactly, "
                    "(2) dobYear matches input exactly, (3) developmentalStage is a reasonable label "
                    "for the age (accept toddler/infant/early childhood for 0-2, preschool for 3-5, "
                    "school age/middle childhood for 6-11, adolescent/mid-adolescence/teen for 12-17), "
                    "(4) ageAppropriateExpectations are clinically accurate, "
                    "(5) flags identify genuine concerns. Score 0 if age or DOB is wrong."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=0.8,
            ),
        },
        "schema": {
            "schema_compliance": GEval(
                name="Schema Compliance Quality",
                criteria=(
                    "Evaluate whether the output follows the requested JSON schema precisely. "
                    "Expected top-level fields: summary, patternClusters, timelineAnalysis, "
                    "familySystemInsights, priorityRecommendations, researchRelevance, developmentalContext. "
                    "Check that: (1) all expected top-level fields exist, (2) array fields contain arrays "
                    "not strings, (3) issueIds are valid integers, (4) confidence in [0,1], "
                    "(5) enum fields use specified values, (6) timelineAnalysis is an object with phases. "
                    "Do NOT penalize for familySystemInsights, researchRelevance, or developmentalContext. "
                    "Penalize heavily for type mismatches."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
        },
        "issue_focus": {
            "issue_focus_summary": GEval(
                name="Issue Focus Summary",
                criteria=(
                    "Evaluate whether the executive summary is primarily focused on the trigger issue. "
                    "Check that: (1) the summary leads with the trigger issue in the first paragraph, "
                    "(2) the trigger issue title or clear paraphrase appears prominently, "
                    "(3) other issues are mentioned only in relation to the trigger issue, "
                    "(4) the narrative centers on understanding the trigger issue. "
                    "Penalize if the summary gives equal weight to all issues."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
            "issue_focus_recommendations": GEval(
                name="Issue Focus Recommendations",
                criteria=(
                    "Evaluate whether the priority recommendations prioritize the trigger issue. "
                    "Check that: (1) the first recommendation (rank 1) directly addresses the trigger issue, "
                    "(2) a majority of recommendations relate to the trigger issue, "
                    "(3) recommendations for other issues are framed in terms of supporting "
                    "resolution of the trigger issue, "
                    "(4) suggested approaches are specific to the trigger issue's nature. "
                    "Penalize heavily if the first recommendation addresses a different issue."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
            "issue_focus_patterns": GEval(
                name="Issue Focus Pattern Clusters",
                criteria=(
                    "Evaluate whether the pattern clusters meaningfully include the trigger issue. "
                    "Check that: (1) the trigger issue ID appears in at least one cluster, "
                    "(2) cluster descriptions explain how the trigger issue relates to other issues, "
                    "(3) clusters are organized around the trigger issue, "
                    "(4) suggested root causes connect to the trigger issue."
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

        print(f"  [{case_id}] Running deep analysis...")
        output = run_deep_analysis(case_data, force_regen=force_regen)
        test_case = LLMTestCase(
            input=build_input_description(case_data),
            actual_output=json.dumps(output, indent=2, ensure_ascii=False),
        )

        for suite in suites:
            suite_metrics = all_metrics[suite]
            suite_result = {}

            for metric_name, metric in suite_metrics.items():
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

    # Summary
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
        "summary": {
            "total": total,
            "passed": passed_count,
            "failed": total - passed_count,
        },
        "results": results,
    }

    OUTPUT_FILE.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Report saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate deep analysis quality")
    parser.add_argument(
        "--case",
        type=str,
        choices=[c["id"] for c in TEST_CASES],
        help="Single test case to evaluate",
    )
    parser.add_argument(
        "--suite",
        type=str,
        choices=["dob", "schema", "issue_focus"],
        help="Single eval suite to run",
    )
    parser.add_argument(
        "--regen",
        action="store_true",
        help="Force re-generate from DeepSeek (ignore fixture cache)",
    )
    args = parser.parse_args()
    run(args.case, args.suite, args.regen)
