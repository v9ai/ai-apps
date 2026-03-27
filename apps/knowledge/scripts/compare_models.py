"""Compare baseline vs fine-tuned evaluation results side-by-side.

Reads eval-baseline.json and eval-finetuned.json, prints a markdown table.

Usage:
    python scripts/compare_models.py
    python scripts/compare_models.py --baseline data/eval-baseline.json --finetuned data/eval-finetuned.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"


def load_results(path: Path) -> dict:
    if not path.exists():
        print(f"Error: {path} not found. Run the eval script first.")
        sys.exit(1)
    return json.loads(path.read_text())


def fmt(val, suffix: str = "") -> str:
    if isinstance(val, float):
        return f"{val:.1f}{suffix}" if abs(val) >= 1 else f"{val:.3f}{suffix}"
    return f"{val}{suffix}"


def delta(base_val, ft_val) -> str:
    if isinstance(base_val, (int, float)) and isinstance(ft_val, (int, float)):
        diff = ft_val - base_val
        sign = "+" if diff > 0 else ""
        if isinstance(diff, float):
            return f"({sign}{diff:.1f})" if abs(diff) >= 1 else f"({sign}{diff:.3f})"
        return f"({sign}{diff})"
    return ""


def main() -> None:
    parser = argparse.ArgumentParser(description="Compare base vs fine-tuned model")
    parser.add_argument("--baseline", default=str(DATA_DIR / "eval-baseline.json"))
    parser.add_argument("--finetuned", default=str(DATA_DIR / "eval-finetuned.json"))
    args = parser.parse_args()

    base = load_results(Path(args.baseline))
    ft = load_results(Path(args.finetuned))

    bs = base["summary"]
    fs = ft["summary"]

    rows = [
        ("Articles passed", f"{bs['articles_passed']}/{bs['articles_tested']}", f"{fs['articles_passed']}/{fs['articles_tested']}"),
        ("Avg word count", fmt(bs["avg_word_count"]), f"{fmt(fs['avg_word_count'])} {delta(bs['avg_word_count'], fs['avg_word_count'])}"),
        ("Avg code blocks", fmt(bs["avg_code_blocks"]), f"{fmt(fs['avg_code_blocks'])} {delta(bs['avg_code_blocks'], fs['avg_code_blocks'])}"),
        ("Avg cross-refs", fmt(bs["avg_cross_refs"]), f"{fmt(fs['avg_cross_refs'])} {delta(bs['avg_cross_refs'], fs['avg_cross_refs'])}"),
        ("Q&A avg F1", fmt(bs["avg_qa_f1"]), f"{fmt(fs['avg_qa_f1'])} {delta(bs['avg_qa_f1'], fs['avg_qa_f1'])}"),
        ("Q&A avg latency", fmt(bs["avg_qa_latency"], "s"), f"{fmt(fs['avg_qa_latency'], 's')} {delta(bs['avg_qa_latency'], fs['avg_qa_latency'])}"),
    ]

    base_model = base.get("model", "base")
    ft_model = ft.get("model", "fine-tuned")

    print(f"\n## Model Comparison\n")
    print(f"| Metric | Base | Fine-tuned | ")
    print(f"|--------|------|------------|")
    for label, bv, fv in rows:
        print(f"| {label} | {bv} | {fv} |")

    print(f"\nBase model: {base_model}")
    print(f"Fine-tuned: {ft_model}")


if __name__ == "__main__":
    main()
