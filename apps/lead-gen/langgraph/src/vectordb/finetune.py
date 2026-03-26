"""Fine-tune sentence-transformers on labeled job-profile pairs.

Adapts the conSultantBERT approach: CosineSimilarityLoss on
(profile_text, job_text, label) triplets.

Usage:
    from src.vectordb.finetune import finetune_embeddings

    finetune_embeddings()  # requires 100+ labels in training_data/job_labels.jsonl

Output model saved to langgraph/models/job-matcher/ — update config.py MODEL_ID to use it.
"""

from __future__ import annotations

import json
from pathlib import Path

LABELS_FILE = Path(__file__).parent.parent.parent / "training_data" / "job_labels.jsonl"
OUTPUT_MODEL = Path(__file__).parent.parent.parent / "models" / "job-matcher"

from .config import MODEL_ID


def finetune_embeddings(
    epochs: int = 5,
    batch_size: int = 8,
    min_labels: int = 100,
) -> dict:
    """Fine-tune embedding model on labeled job pairs.

    Returns stats dict with eval metrics.
    """
    from sentence_transformers import (
        InputExample,
        SentenceTransformer,
        evaluation,
        losses,
    )
    from torch.utils.data import DataLoader

    if not LABELS_FILE.exists():
        print(f"No labels file at {LABELS_FILE}. Run 'python -m cli job-label' first.")
        return {"error": "no_labels_file"}

    examples = []
    with open(LABELS_FILE) as f:
        for line in f:
            d = json.loads(line)
            examples.append(InputExample(
                texts=[d["profile_text"], d["job_text"]],
                label=float(d["label"]),
            ))

    print(f"Loaded {len(examples)} labeled pairs")
    if len(examples) < min_labels:
        print(f"Need at least {min_labels} labels for meaningful fine-tuning.")
        print(f"You have {len(examples)}. Keep labeling!")
        return {"error": "insufficient_labels", "count": len(examples), "needed": min_labels}

    # Split 90/10
    split = int(len(examples) * 0.9)
    train_examples = examples[:split]
    eval_examples = examples[split:]

    print(f"Train: {len(train_examples)} | Eval: {len(eval_examples)}")

    # Load base model
    model = SentenceTransformer(MODEL_ID)

    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=batch_size)
    train_loss = losses.CosineSimilarityLoss(model)

    # Evaluator
    eval_s1 = [e.texts[0] for e in eval_examples]
    eval_s2 = [e.texts[1] for e in eval_examples]
    eval_scores = [e.label for e in eval_examples]
    evaluator = evaluation.EmbeddingSimilarityEvaluator(eval_s1, eval_s2, eval_scores)

    output_path = str(OUTPUT_MODEL)
    print(f"\nFine-tuning {MODEL_ID} on {len(train_examples)} pairs for {epochs} epochs...")

    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        evaluator=evaluator,
        epochs=epochs,
        warmup_steps=int(len(train_dataloader) * 0.1),
        output_path=output_path,
        show_progress_bar=True,
    )

    print(f"\nModel saved to {output_path}")
    print(f"To use: update langgraph/src/vectordb/config.py MODEL_ID = '{output_path}'")

    return {
        "output_path": output_path,
        "train_size": len(train_examples),
        "eval_size": len(eval_examples),
        "epochs": epochs,
        "base_model": MODEL_ID,
    }
