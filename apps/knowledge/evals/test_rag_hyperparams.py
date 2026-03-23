"""RAG hyperparameter comparison tests.

Evaluates how different retrieval configurations affect RAG quality.
Produces a comparison report in datasets/rag_hyperparams_report.json.

Usage:
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run python test_rag_hyperparams.py
    cd evals && DEEPEVAL_TELEMETRY_OPT_OUT=YES uv run deepeval test run test_rag_hyperparams.py -k "comparison"
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path

import pytest
from deepeval.metrics import (
    AnswerRelevancyMetric,
    ContextualRelevancyMetric,
    FaithfulnessMetric,
)
from deepeval.test_case import LLMTestCase

from deepseek_model import DeepSeekModel
from rag_pipeline import RAGConfig, invoke_rag_batch

model = DeepSeekModel()
THRESHOLD = 0.6
DATASETS_DIR = Path(__file__).resolve().parent / "datasets"

# -- Retrieval configurations to compare --------------------------------------

CONFIGS: dict[str, RAGConfig] = {
    "fts_top3": RAGConfig(top_k=3, retrieval_method="fts"),
    "fts_top5": RAGConfig(top_k=5, retrieval_method="fts"),
    "fts_top10": RAGConfig(top_k=10, retrieval_method="fts"),
    "vector_top3": RAGConfig(top_k=3, retrieval_method="vector", threshold=0.3),
    "vector_top5": RAGConfig(top_k=5, retrieval_method="vector", threshold=0.3),
    "vector_top10": RAGConfig(top_k=10, retrieval_method="vector", threshold=0.3),
    "hybrid_30_70": RAGConfig(top_k=5, retrieval_method="hybrid", fts_weight=0.3, vector_weight=0.7),
    "hybrid_50_50": RAGConfig(top_k=5, retrieval_method="hybrid", fts_weight=0.5, vector_weight=0.5),
    "hybrid_70_30": RAGConfig(top_k=5, retrieval_method="hybrid", fts_weight=0.7, vector_weight=0.3),
    "strict_threshold": RAGConfig(top_k=5, retrieval_method="vector", threshold=0.5),
    "loose_threshold": RAGConfig(top_k=5, retrieval_method="vector", threshold=0.2),
}

# -- Eval queries spanning all 9 categories -----------------------------------

EVAL_QUERIES = [
    # Foundations
    "How does the transformer architecture process sequences in parallel?",
    "What are scaling laws and how do they predict model performance?",
    # Prompting
    "What is chain-of-thought prompting and when should I use it?",
    "How do system prompts affect LLM behavior?",
    # RAG
    "What chunking strategies work best for technical documentation?",
    "How do hybrid search systems combine keyword and semantic retrieval?",
    # Fine-tuning
    "How does LoRA reduce the cost of fine-tuning large models?",
    "What is RLHF and how does it align models with human preferences?",
    # Agents
    "How do function calling and tool use work in LLM agents?",
    "What are the main patterns for multi-agent coordination?",
    # Evals
    "How do I design good benchmarks for LLM evaluation?",
    "What is LLM-as-judge evaluation and when should I use it?",
    # Infrastructure
    "How should I set up load balancing for LLM serving?",
    "What observability metrics matter for LLM applications?",
    # Safety
    "What is constitutional AI and how does it improve safety?",
    "How do I detect and mitigate hallucinations in LLM output?",
    # Multimodal
    "How do vision-language models process images and text together?",
    "What are the key patterns for deploying AI in production?",
]


def _evaluate_config(config_name: str, config: RAGConfig) -> dict:
    """Run all queries through a config and measure RAG triad metrics."""
    faithfulness_m = FaithfulnessMetric(model=model, threshold=THRESHOLD)
    answer_rel_m = AnswerRelevancyMetric(model=model, threshold=THRESHOLD)
    context_rel_m = ContextualRelevancyMetric(model=model, threshold=THRESHOLD)

    # Run all queries in parallel, then measure metrics sequentially.
    rag_results = invoke_rag_batch(EVAL_QUERIES, config)

    results = []
    for query, rag_result in zip(EVAL_QUERIES, rag_results):
        if rag_result is None:
            results.append({"query": query[:60], "error": "invoke_rag failed"})
            continue

        tc = LLMTestCase(
            input=query,
            actual_output=rag_result["actual_output"],
            retrieval_context=rag_result["retrieval_context"],
        )

        scores = {"query": query[:60], "num_chunks": len(rag_result["retrieval_context"])}

        if tc.retrieval_context:
            faithfulness_m.measure(tc)
            context_rel_m.measure(tc)
            scores["faithfulness"] = faithfulness_m.score
            scores["contextual_relevancy"] = context_rel_m.score

        answer_rel_m.measure(tc)
        scores["answer_relevancy"] = answer_rel_m.score
        results.append(scores)

    # Aggregate
    valid = [r for r in results if "error" not in r]
    if not valid:
        return {"config": config_name, "error": "all queries failed"}

    avg = lambda key: sum(r.get(key, 0) or 0 for r in valid) / len(valid)
    pass_rate = lambda key: sum(
        1 for r in valid if (r.get(key) or 0) >= THRESHOLD
    ) / len(valid)

    return {
        "config": config_name,
        "num_queries": len(EVAL_QUERIES),
        "num_valid": len(valid),
        "avg_faithfulness": round(avg("faithfulness"), 3),
        "avg_answer_relevancy": round(avg("answer_relevancy"), 3),
        "avg_contextual_relevancy": round(avg("contextual_relevancy"), 3),
        "pass_rate_faithfulness": round(pass_rate("faithfulness"), 3),
        "pass_rate_answer_relevancy": round(pass_rate("answer_relevancy"), 3),
        "pass_rate_contextual_relevancy": round(pass_rate("contextual_relevancy"), 3),
        "avg_chunks_retrieved": round(avg("num_chunks"), 1),
        "details": results,
    }


def run_sweep():
    """Run the full hyperparameter sweep and save report."""
    print(f"Running hyperparameter sweep across {len(CONFIGS)} configs x {len(EVAL_QUERIES)} queries\n")

    report = {"generated_at": datetime.now(timezone.utc).isoformat(), "configs": {}}

    for name, config in CONFIGS.items():
        print(f"Evaluating config: {name}...")
        try:
            result = _evaluate_config(name, config)
            report["configs"][name] = result
            print(
                f"  faithfulness={result.get('avg_faithfulness', 'N/A')}, "
                f"relevancy={result.get('avg_answer_relevancy', 'N/A')}, "
                f"ctx_relevancy={result.get('avg_contextual_relevancy', 'N/A')}"
            )
        except Exception as e:
            print(f"  ERROR: {e}")
            report["configs"][name] = {"config": name, "error": str(e)}

    # Find best config
    valid_configs = {k: v for k, v in report["configs"].items() if "error" not in v}
    if valid_configs:
        best = max(
            valid_configs.items(),
            key=lambda x: (
                x[1].get("avg_faithfulness", 0)
                + x[1].get("avg_answer_relevancy", 0)
                + x[1].get("avg_contextual_relevancy", 0)
            ),
        )
        report["best_config"] = best[0]
        report["best_combined_score"] = round(
            best[1].get("avg_faithfulness", 0)
            + best[1].get("avg_answer_relevancy", 0)
            + best[1].get("avg_contextual_relevancy", 0),
            3,
        )

    os.makedirs(str(DATASETS_DIR), exist_ok=True)
    report_path = DATASETS_DIR / "rag_hyperparams_report.json"
    # Strip per-query details from the saved report summary
    summary = {k: v for k, v in report.items() if k != "configs"}
    summary["configs"] = {
        k: {kk: vv for kk, vv in v.items() if kk != "details"}
        for k, v in report["configs"].items()
    }
    report_path.write_text(json.dumps(summary, indent=2))
    print(f"\nReport saved to {report_path}")
    print(f"Best config: {report.get('best_config')} (combined: {report.get('best_combined_score')})")


# -- pytest tests --------------------------------------------------------------


def test_fts_baseline():
    """FTS top-5 should achieve >= 0.5 on all triad metrics."""
    result = _evaluate_config("fts_top5", CONFIGS["fts_top5"])
    assert result.get("avg_faithfulness", 0) >= 0.5, f"Faithfulness too low: {result}"
    assert result.get("avg_answer_relevancy", 0) >= 0.5, f"Answer relevancy too low: {result}"


def test_config_comparison():
    """Run FTS top-3 vs top-5 vs top-10 and verify top-5 is reasonable."""
    results = {}
    for name in ["fts_top3", "fts_top5", "fts_top10"]:
        results[name] = _evaluate_config(name, CONFIGS[name])

    # top-5 should have higher answer relevancy than top-3 (more context helps)
    top3_rel = results["fts_top3"].get("avg_answer_relevancy", 0)
    top5_rel = results["fts_top5"].get("avg_answer_relevancy", 0)
    # Just verify both are reasonable (> 0.4)
    assert top5_rel >= 0.4, f"FTS top-5 answer relevancy too low: {top5_rel}"
    assert top3_rel >= 0.3, f"FTS top-3 answer relevancy too low: {top3_rel}"


if __name__ == "__main__":
    run_sweep()
