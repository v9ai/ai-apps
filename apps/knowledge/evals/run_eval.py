"""Standalone evaluation script with JSON report output.

Usage:
    uv run python run_eval.py                        # all articles, all metrics
    uv run python run_eval.py --articles 1 2 3       # specific articles
    uv run python run_eval.py --metric coherence     # single metric
    uv run python run_eval.py --articles 1 --metric readability
"""

import argparse
import glob
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from deepseek_model import DeepSeekModel

CONTENT_DIR = Path(__file__).resolve().parent.parent / "content"
OUTPUT_FILE = Path(__file__).resolve().parent / "eval-results.json"
THRESHOLD = 0.7


def build_metrics(model: DeepSeekModel) -> dict[str, GEval]:
    return {
        "coherence": GEval(
            name="Coherence",
            criteria=(
                "Evaluate the logical flow and structural coherence of the article. "
                "Check that sections transition smoothly, the narrative builds logically "
                "from fundamentals to advanced topics, and the overall argument or "
                "explanation forms a cohesive arc."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
        "factual_grounding": GEval(
            name="Factual Grounding",
            criteria=(
                "Evaluate whether claims are properly attributed to sources. "
                "Check for citation of specific benchmarks or established results. "
                "Penalize unsourced quantitative claims and vague attributions like "
                "'studies show' without specifics."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
        "completeness": GEval(
            name="Completeness",
            criteria=(
                "Evaluate whether the article covers the topic comprehensively. "
                "Check for coverage of fundamentals, practical code examples or "
                "pseudocode, discussion of trade-offs and limitations, and actionable "
                "takeaways or implementation guidance."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
        "readability": GEval(
            name="Readability",
            criteria=(
                "Evaluate clarity and accessibility of the writing. Check that technical "
                "jargon is explained on first use, analogies aid understanding, code "
                "snippets are properly formatted with context, and mathematical notation "
                "is accompanied by intuitive explanation."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
            model=model,
            threshold=THRESHOLD,
        ),
    }


def load_articles(ids: list[int] | None = None) -> list[tuple[str, str]]:
    """Load articles, optionally filtered by number (1-55)."""
    pattern = str(CONTENT_DIR / "agent-*.md")
    files = sorted(glob.glob(pattern))
    articles = []
    for fp in files:
        path = Path(fp)
        stem = path.stem
        parts = stem.split("-")
        num = int(parts[1])
        article_id = f"{parts[0]}-{parts[1]}"
        if ids and num not in ids:
            continue
        content = path.read_text(encoding="utf-8")
        articles.append((article_id, content))
    return articles


def _eval_article(
    article_id: str,
    content: str,
    metric_filter: str | None,
    model: DeepSeekModel,
) -> dict:
    """Evaluate one article: measure all metrics in parallel (fresh instances, thread-safe)."""
    metrics = build_metrics(model)
    if metric_filter:
        metrics = {metric_filter: metrics[metric_filter]}
    test_case = LLMTestCase(input="Evaluate article quality", actual_output=content)
    article_result: dict = {"article_id": article_id, "metrics": {}}

    def _measure(name_metric: tuple[str, GEval]) -> tuple[str, GEval]:
        name, metric = name_metric
        metric.measure(test_case)
        return name, metric

    with ThreadPoolExecutor(max_workers=len(metrics)) as pool:
        for name, metric in pool.map(_measure, metrics.items()):
            score = metric.score
            passed = score >= THRESHOLD if score is not None else False
            article_result["metrics"][name] = {
                "score": score,
                "passed": passed,
                "reason": metric.reason or "",
            }
    return article_result


def run(articles_filter: list[int] | None, metric_filter: str | None):
    model = DeepSeekModel()
    all_metric_names = list(build_metrics(model).keys())

    if metric_filter and metric_filter not in all_metric_names:
        print(f"Unknown metric: {metric_filter}")
        print(f"Available: {', '.join(all_metric_names)}")
        sys.exit(1)

    articles = load_articles(articles_filter)
    if not articles:
        print("No articles found matching the filter.")
        sys.exit(1)

    num_metrics = 1 if metric_filter else len(all_metric_names)
    print(f"Evaluating {len(articles)} article(s) x {num_metrics} metric(s)")
    print(f"Total evaluations: {len(articles) * num_metrics}\n")

    # Articles are independent — run in parallel with fresh metric instances per thread.
    results_map: dict[str, dict] = {}
    with ThreadPoolExecutor(max_workers=min(4, len(articles))) as pool:
        futures = {
            pool.submit(_eval_article, aid, content, metric_filter, model): aid
            for aid, content in articles
        }
        for future in as_completed(futures):
            aid = futures[future]
            try:
                result = future.result()
                results_map[aid] = result
                scores = " ".join(
                    f"{m}={v['score']:.2f}({'PASS' if v['passed'] else 'FAIL'})"
                    for m, v in result["metrics"].items()
                )
                print(f"  {aid}: {scores}")
            except Exception as exc:
                print(f"  {aid}: ERROR — {exc}")

    results = [results_map[aid] for aid, _ in articles if aid in results_map]

    # Summary
    total = sum(
        1
        for r in results
        for m in r["metrics"].values()
    )
    passed = sum(
        1
        for r in results
        for m in r["metrics"].values()
        if m["passed"]
    )
    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} passed (threshold={THRESHOLD})")

    report = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "threshold": THRESHOLD,
        "summary": {"total": total, "passed": passed, "failed": total - passed},
        "results": results,
    }

    OUTPUT_FILE.write_text(json.dumps(report, indent=2))
    print(f"Report saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate knowledge articles")
    parser.add_argument(
        "--articles",
        nargs="+",
        type=int,
        help="Article numbers to evaluate (e.g. 1 2 3)",
    )
    parser.add_argument(
        "--metric",
        type=str,
        choices=["coherence", "factual_grounding", "completeness", "readability"],
        help="Single metric to evaluate",
    )
    args = parser.parse_args()
    run(args.articles, args.metric)
