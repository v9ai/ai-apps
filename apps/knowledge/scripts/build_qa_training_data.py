"""Convert eval goldens (synthetic + RAG) into chat JSONL for MLX LoRA fine-tuning.

For each golden, constructs a training example:
  system: RAG-answering persona with context chunks
  user:   the question
  assistant: the expected answer

Usage:
    python scripts/build_qa_training_data.py            # writes data/train-qa.jsonl
    python scripts/build_qa_training_data.py --dry-run   # prints stats only
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
OUTPUT = DATA_DIR / "train-qa.jsonl"

SYNTHETIC_PATH = ROOT / "evals" / "datasets" / "synthetic_goldens.json"
RAG_PATH = ROOT / "evals" / "datasets" / "rag_goldens.json"

# ── System prompt ─────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are a knowledgeable AI engineering assistant. Answer questions accurately \
and thoroughly based on the provided context from the knowledge base.

Use the context to give specific, technical answers. If the context contains \
code examples, reference them. Cite specific concepts, papers, or techniques \
mentioned in the context. Be concise but complete."""


def build_system_with_context(context_chunks: list[str]) -> str:
    """Build system prompt with RAG context appended."""
    context_text = "\n\n---\n\n".join(context_chunks)
    return f"{SYSTEM_PROMPT}\n\nContext:\n{context_text}"


def load_synthetic() -> list[dict]:
    """Load synthetic goldens: {input, expected_output, context, source_file}."""
    if not SYNTHETIC_PATH.exists():
        print(f"Warning: {SYNTHETIC_PATH} not found")
        return []
    data = json.loads(SYNTHETIC_PATH.read_text())
    examples = []
    for item in data:
        question = item.get("input", "").strip()
        answer = item.get("expected_output", "").strip()
        context = item.get("context", [])
        if not question or not answer:
            continue
        examples.append({
            "messages": [
                {"role": "system", "content": build_system_with_context(context)},
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer},
            ]
        })
    return examples


def load_rag() -> list[dict]:
    """Load RAG goldens: {input, expected_output, context, source}."""
    if not RAG_PATH.exists():
        print(f"Warning: {RAG_PATH} not found")
        return []
    data = json.loads(RAG_PATH.read_text())
    examples = []
    for item in data:
        question = item.get("input", "").strip()
        answer = item.get("expected_output", "").strip()
        context = item.get("context", [])
        if not question or not answer:
            continue
        examples.append({
            "messages": [
                {"role": "system", "content": build_system_with_context(context)},
                {"role": "user", "content": question},
                {"role": "assistant", "content": answer},
            ]
        })
    return examples


def main() -> None:
    dry_run = "--dry-run" in sys.argv

    synthetic = load_synthetic()
    rag = load_rag()
    examples = synthetic + rag

    # Stats
    answer_lengths = [len(ex["messages"][2]["content"].split()) for ex in examples]
    total_words = sum(answer_lengths)
    avg_words = total_words // len(examples) if examples else 0

    print(f"Synthetic goldens: {len(synthetic)}")
    print(f"RAG goldens:       {len(rag)}")
    print(f"Total examples:    {len(examples)}")
    print(f"Total answer words: {total_words:,}")
    print(f"Avg answer words:  {avg_words}")
    print(f"Min answer words:  {min(answer_lengths)}")
    print(f"Max answer words:  {max(answer_lengths)}")

    if dry_run:
        print("\n[dry-run] No files written.")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")

    print(f"\nWrote {len(examples)} examples to {OUTPUT}")


if __name__ == "__main__":
    main()
