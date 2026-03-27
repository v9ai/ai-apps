"""Evaluate base model on article generation and Q&A tasks.

Runs the base Qwen model through test examples and measures quality metrics.
Results are saved to data/eval-baseline.json for comparison.

Usage:
    python scripts/eval_baseline.py                          # full eval
    python scripts/eval_baseline.py --articles 3 --qa 10     # smaller eval
    python scripts/eval_baseline.py --dry-run                # show test set only
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT / "scripts"))

from finetune_config import CONFIGS

DATA_DIR = ROOT / "data"
TEST_PATH = DATA_DIR / "test.jsonl"
OUTPUT_PATH = DATA_DIR / "eval-baseline.json"


def load_test_set() -> tuple[list[dict], list[dict]]:
    """Load test set and split into articles vs Q&A by message length."""
    articles, qa = [], []
    with open(TEST_PATH) as f:
        for line in f:
            ex = json.loads(line.strip())
            assistant_len = len(ex["messages"][2]["content"].split())
            if assistant_len > 500:
                articles.append(ex)
            else:
                qa.append(ex)
    return articles, qa


def score_article(generated: str) -> dict:
    """Score a generated article on quality metrics."""
    word_count = len(generated.split())
    code_blocks = len(re.findall(r"```\w+", generated))
    cross_refs = len(re.findall(r"\]\(/[\w-]+\)", generated))
    has_title = generated.strip().startswith("# ")
    sections = len(re.findall(r"^## ", generated, re.MULTILINE))

    return {
        "word_count": word_count,
        "code_blocks": code_blocks,
        "cross_refs": cross_refs,
        "has_title": has_title,
        "sections": sections,
        "passes_quality": (
            word_count >= 1500
            and code_blocks >= 2
            and cross_refs >= 1
            and has_title
            and sections >= 3
        ),
    }


def score_qa(generated: str, expected: str) -> dict:
    """Score a generated Q&A answer vs expected."""
    gen_words = set(generated.lower().split())
    exp_words = set(expected.lower().split())
    overlap = len(gen_words & exp_words)
    precision = overlap / len(gen_words) if gen_words else 0
    recall = overlap / len(exp_words) if exp_words else 0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    return {
        "word_count": len(generated.split()),
        "word_overlap_f1": round(f1, 3),
        "expected_words": len(expected.split()),
    }


async def generate(prompt: str, system: str, model_url: str, model_name: str) -> tuple[str, float]:
    """Generate a response from the model. Returns (text, latency_seconds)."""
    import httpx

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": prompt},
    ]

    start = time.time()
    async with httpx.AsyncClient(timeout=600.0) as client:
        resp = await client.post(
            f"{model_url}/chat/completions",
            json={"model": model_name, "messages": messages, "max_tokens": 4096},
        )
        resp.raise_for_status()
    elapsed = time.time() - start

    data = resp.json()
    content = data["choices"][0]["message"]["content"]
    return content, elapsed


async def run_eval(
    articles: list[dict],
    qa: list[dict],
    model_url: str,
    model_name: str,
) -> dict:
    """Run evaluation on test examples."""
    results = {"articles": [], "qa": [], "model": model_name}

    for i, ex in enumerate(articles):
        system = ex["messages"][0]["content"]
        user = ex["messages"][1]["content"]
        print(f"  Article {i+1}/{len(articles)}: generating...", end=" ", flush=True)
        try:
            generated, latency = await generate(user, system, model_url, model_name)
            scores = score_article(generated)
            scores["latency_s"] = round(latency, 1)
            results["articles"].append(scores)
            status = "PASS" if scores["passes_quality"] else "FAIL"
            print(f"{status} ({scores['word_count']} words, {latency:.1f}s)")
        except Exception as e:
            print(f"ERROR: {e}")
            results["articles"].append({"error": str(e)})

    for i, ex in enumerate(qa):
        system = ex["messages"][0]["content"]
        user = ex["messages"][1]["content"]
        expected = ex["messages"][2]["content"]
        print(f"  Q&A {i+1}/{len(qa)}: generating...", end=" ", flush=True)
        try:
            generated, latency = await generate(user, system, model_url, model_name)
            scores = score_qa(generated, expected)
            scores["latency_s"] = round(latency, 1)
            results["qa"].append(scores)
            print(f"F1={scores['word_overlap_f1']:.3f} ({scores['word_count']} words, {latency:.1f}s)")
        except Exception as e:
            print(f"ERROR: {e}")
            results["qa"].append({"error": str(e)})

    # Aggregate
    article_scores = [a for a in results["articles"] if "error" not in a]
    qa_scores = [q for q in results["qa"] if "error" not in q]

    results["summary"] = {
        "articles_tested": len(articles),
        "articles_passed": sum(1 for a in article_scores if a["passes_quality"]),
        "avg_word_count": round(sum(a["word_count"] for a in article_scores) / max(1, len(article_scores))),
        "avg_code_blocks": round(sum(a["code_blocks"] for a in article_scores) / max(1, len(article_scores)), 1),
        "avg_cross_refs": round(sum(a["cross_refs"] for a in article_scores) / max(1, len(article_scores)), 1),
        "qa_tested": len(qa),
        "avg_qa_f1": round(sum(q["word_overlap_f1"] for q in qa_scores) / max(1, len(qa_scores)), 3),
        "avg_qa_latency": round(sum(q["latency_s"] for q in qa_scores) / max(1, len(qa_scores)), 1),
    }

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate base model")
    parser.add_argument("--model", choices=list(CONFIGS.keys()), default="qwen-3b")
    parser.add_argument("--url", default="http://localhost:8080/v1", help="Model server URL")
    parser.add_argument("--articles", type=int, default=None, help="Max articles to eval")
    parser.add_argument("--qa", type=int, default=None, help="Max Q&A to eval")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--output", default=None, help="Output JSON path")
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
    print(f"Model: {cfg.model}")
    print(f"Server: {args.url}")
    print(f"Test set: {len(articles)} articles, {len(qa)} Q&A\n")

    if args.dry_run:
        print("[dry-run] Would evaluate the above test set.")
        return

    results = asyncio.run(run_eval(articles, qa, args.url, cfg.model))

    output = Path(args.output) if args.output else OUTPUT_PATH
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(results, indent=2))

    print(f"\n{'='*50}")
    print(f"RESULTS SUMMARY")
    print(f"{'='*50}")
    s = results["summary"]
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
