"""Evaluate fine-tuned model on the same test set as eval_baseline.py.

Identical evaluation logic, but defaults to the fused model path.
Results saved to data/eval-finetuned.json.

Usage:
    python scripts/eval_finetuned.py                             # full eval
    python scripts/eval_finetuned.py --articles 3 --qa 10        # smaller eval
    python scripts/eval_finetuned.py --url http://localhost:8080/v1
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from finetune_config import CONFIGS

# Reuse all logic from eval_baseline
from eval_baseline import load_test_set, run_eval, TEST_PATH, DATA_DIR

import asyncio
import json

OUTPUT_PATH = DATA_DIR / "eval-finetuned.json"


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate fine-tuned model")
    parser.add_argument("--model", choices=list(CONFIGS.keys()), default="qwen-3b")
    parser.add_argument("--url", default="http://localhost:8080/v1", help="Model server URL")
    parser.add_argument("--model-name", default=None,
                        help="Model name for API (default: auto-detect from fused path)")
    parser.add_argument("--articles", type=int, default=None)
    parser.add_argument("--qa", type=int, default=None)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    if not TEST_PATH.exists():
        print(f"Error: {TEST_PATH} not found. Run build_splits.py first.")
        sys.exit(1)

    articles, qa = load_test_set()
    if args.articles:
        articles = articles[:args.articles]
    if args.qa:
        qa = qa[:args.qa]

    cfg = CONFIGS[args.model]
    model_name_short = cfg.model.split("/")[-1].lower().replace("instruct-4bit", "knowledge-v1")
    fused_path = ROOT / "data" / "models" / model_name_short
    model_name = args.model_name or str(fused_path)

    print(f"Model: {model_name}")
    print(f"Server: {args.url}")
    print(f"Test set: {len(articles)} articles, {len(qa)} Q&A\n")

    results = asyncio.run(run_eval(articles, qa, args.url, model_name))

    output = Path(args.output) if args.output else OUTPUT_PATH
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(results, indent=2))

    s = results["summary"]
    print(f"\n{'='*50}")
    print(f"FINE-TUNED RESULTS")
    print(f"{'='*50}")
    print(f"Articles: {s['articles_passed']}/{s['articles_tested']} passed quality")
    print(f"  Avg words:      {s['avg_word_count']}")
    print(f"  Avg code blocks: {s['avg_code_blocks']}")
    print(f"  Avg cross-refs:  {s['avg_cross_refs']}")
    print(f"Q&A: {s['qa_tested']} tested")
    print(f"  Avg F1:     {s['avg_qa_f1']}")
    print(f"  Avg latency: {s['avg_qa_latency']}s")
    print(f"\nResults saved to {output}")


if __name__ == "__main__":
    main()
