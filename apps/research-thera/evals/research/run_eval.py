"""Standalone evaluation script for research pipeline stages.

Usage:
    uv run python run_eval.py                                    # all cases, all stages
    uv run python run_eval.py --case selective-mutism-child
    uv run python run_eval.py --stage normalize
    uv run python run_eval.py --stage extract --case anxiety-reduction-teen
    uv run python run_eval.py --regen                            # force re-generate from DeepSeek
"""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel
from generator import (
    SYNTHETIC_PAPERS,
    TEST_CASES,
    build_extract_input,
    build_normalize_input,
    build_plan_input,
    run_extract,
    run_normalize,
    run_plan,
)

OUTPUT_FILE = Path(__file__).resolve().parent / "eval-results.json"
THRESHOLD = 0.7


def build_metrics(model: DeepSeekModel) -> dict[str, dict]:
    """Build metrics organized by stage."""
    return {
        "normalize": {
            "dob_age_consistency": GEval(
                name="DOB Age-Developmental Consistency",
                criteria=(
                    "Evaluate whether the normalization output is consistent with the patient's age. "
                    "Check that: (1) the developmental tier/stage is appropriate for the stated age "
                    "(e.g. ages 3-5 = early_childhood/preschool, 6-11 = school_age/middle_childhood, "
                    "12-17 = adolescent, 18+ = adult), (2) required keywords reference age-appropriate "
                    "terminology, (3) the clinical restatement does not contradict the patient's age, "
                    "(4) no language suggests a different age group than the actual patient. "
                    "Penalize heavily if the developmental tier is clearly wrong for the age."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
            "normalization_accuracy": GEval(
                name="Clinical Normalization Accuracy",
                criteria=(
                    "Evaluate whether the clinical normalization correctly identifies the "
                    "therapeutic construct. Check: (1) non-English titles translated correctly, "
                    "(2) clinical domain is SPECIFIC not generic, (3) behavior direction matches "
                    "intent, (4) developmental tier matches age, (5) keywords are clinically "
                    "appropriate, (6) excluded topics filter out irrelevant domains. "
                    "Must leverage ALL context including teacher feedback and extracted issues."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
            "feedback_integration": GEval(
                name="Feedback Integration Quality",
                criteria=(
                    "Evaluate whether the output shows evidence of incorporating teacher "
                    "feedback and extracted issues. Check: (1) some keywords or restatement "
                    "reflect feedback observations, (2) clinical domain accounts for feedback "
                    "when relevant, (3) output is more specific than from goal title alone. "
                    "Integration does not need to be perfect — just present and useful."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=0.4,
            ),
        },
        "plan": {
            "query_planning_quality": GEval(
                name="Query Planning Quality",
                criteria=(
                    "Evaluate quality and diversity of search queries. Check: "
                    "(1) queries are clinically specific, (2) span different search strategies, "
                    "(3) cover facets: interventions, population, outcomes, mechanisms, "
                    "(4) enough for good recall (≥10 per source), (5) incorporate feedback "
                    "and extracted issues context, (6) avoid off-topic retrieval."
                ),
                evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
                model=model,
                threshold=THRESHOLD,
            ),
        },
        "extract": {
            "extraction_faithfulness": GEval(
                name="Extraction Faithfulness",
                criteria=(
                    "Evaluate whether key findings and techniques are FAITHFULLY supported by "
                    "the paper abstract. Check: (1) every finding is explicitly in the abstract, "
                    "(2) no fabricated findings, (3) techniques actually described, (4) evidence "
                    "level matches study design, (5) quantitative claims match abstract. "
                    "Penalize heavily for hallucinated findings."
                ),
                evaluation_params=[
                    LLMTestCaseParams.INPUT,
                    LLMTestCaseParams.ACTUAL_OUTPUT,
                    LLMTestCaseParams.CONTEXT,
                ],
                model=model,
                threshold=0.75,
            ),
            "relevance_scoring": GEval(
                name="Relevance Scoring Accuracy",
                criteria=(
                    "Evaluate whether the relevance score is reasonable given the paper "
                    "abstract and therapeutic goal. A directly relevant paper should score "
                    "0.7 or above. An unrelated paper should score below 0.4. The score "
                    "does not need to be perfect — just directionally correct."
                ),
                evaluation_params=[
                    LLMTestCaseParams.INPUT,
                    LLMTestCaseParams.ACTUAL_OUTPUT,
                    LLMTestCaseParams.CONTEXT,
                ],
                model=model,
                threshold=0.4,
            ),
        },
    }


def run(
    case_filter: str | None,
    stage_filter: str | None,
    force_regen: bool,
):
    model = DeepSeekModel()
    all_metrics = build_metrics(model)

    stages = list(all_metrics.keys())
    if stage_filter:
        if stage_filter not in all_metrics:
            print(f"Unknown stage: {stage_filter}")
            print(f"Available: {', '.join(stages)}")
            sys.exit(1)
        stages = [stage_filter]

    cases = TEST_CASES
    if case_filter:
        cases = [c for c in cases if c["id"] == case_filter]
        if not cases:
            print(f"Unknown case: {case_filter}")
            print(f"Available: {', '.join(c['id'] for c in TEST_CASES)}")
            sys.exit(1)

    total_metrics = sum(len(all_metrics[s]) for s in stages)
    print(f"Evaluating {len(cases)} case(s) x {len(stages)} stage(s) x {total_metrics} metric(s)")
    print()

    results = []
    for case_data in cases:
        case_id = case_data["id"]
        case_result = {"case_id": case_id, "stages": {}}

        for stage in stages:
            stage_metrics = all_metrics[stage]

            # Run the stage
            print(f"  [{case_id}] Running {stage}...")
            if stage == "normalize":
                output = run_normalize(case_data, force_regen=force_regen)
                test_case = LLMTestCase(
                    input=build_normalize_input(case_data),
                    actual_output=json.dumps(output, indent=2),
                )
            elif stage == "plan":
                output = run_plan(case_data, force_regen=force_regen)
                test_case = LLMTestCase(
                    input=build_plan_input(case_data),
                    actual_output=json.dumps(output, indent=2),
                )
            elif stage == "extract":
                output = run_extract(case_data, force_regen=force_regen)
                if not output:
                    print(f"  [{case_id}] Skipping extract — no synthetic paper")
                    continue
                paper = SYNTHETIC_PAPERS.get(case_id, {})
                test_case = LLMTestCase(
                    input=build_extract_input(case_data, paper),
                    actual_output=json.dumps(output, indent=2),
                    context=[paper.get("abstract", "")],
                )
            else:
                continue

            stage_result = {}
            for metric_name, metric in stage_metrics.items():
                print(f"    {metric_name} ... ", end="", flush=True)
                metric.measure(test_case)
                score = metric.score
                passed = score >= metric.threshold if score is not None else False
                status = "PASS" if passed else "FAIL"
                print(f"{score:.2f} [{status}]")

                stage_result[metric_name] = {
                    "score": score,
                    "passed": passed,
                    "reason": metric.reason or "",
                }

            case_result["stages"][stage] = stage_result

        results.append(case_result)

    # Summary
    total = 0
    passed_count = 0
    for r in results:
        for stage_metrics in r["stages"].values():
            for m in stage_metrics.values():
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
    parser = argparse.ArgumentParser(
        description="Evaluate research pipeline quality"
    )
    parser.add_argument(
        "--case",
        type=str,
        choices=[c["id"] for c in TEST_CASES],
        help="Single test case to evaluate",
    )
    parser.add_argument(
        "--stage",
        type=str,
        choices=["normalize", "plan", "extract"],
        help="Single pipeline stage to evaluate",
    )
    parser.add_argument(
        "--regen",
        action="store_true",
        help="Force re-generate from DeepSeek (ignore fixture cache)",
    )
    args = parser.parse_args()
    run(args.case, args.stage, args.regen)
