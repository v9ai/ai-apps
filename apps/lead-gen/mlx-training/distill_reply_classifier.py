"""Distill reply classification into logistic regression weights.

Trains 6 independent binary logistic regressions (OvR) on 16-element feature
vectors extracted from received emails. Exports JSON weights for the TypeScript
classifier and future Rust port.

Usage:
  python3 mlx-training/distill_reply_classifier.py
  python3 mlx-training/distill_reply_classifier.py --labels-file mlx-training/data/reply-classifier/reply_labels.jsonl
  python3 mlx-training/distill_reply_classifier.py --output /path/to/weights.json

The output JSON goes to ~/.lance/linkedin/reply_classifier_weights.json by default.
The TypeScript classifier loads it at module init.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

import numpy as np

# ── Constants ────────────────────────────────────────────────────────────────

NUM_FEATURES = 16
NUM_LABELS = 6
LABEL_NAMES = [
    "interested", "not_interested", "auto_reply",
    "bounced", "info_request", "unsubscribe",
]


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def train_logistic(
    X: np.ndarray,
    y: np.ndarray,
    epochs: int = 500,
    lr: float = 0.1,
) -> tuple[np.ndarray, float]:
    """Train a single logistic regression using SGD. Returns (weights, bias)."""
    n, d = X.shape
    w = np.zeros(d, dtype=np.float64)
    b = 0.0

    for epoch in range(epochs):
        z = X @ w + b
        pred = 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))

        error = pred - y
        grad_w = (X.T @ error) / n
        grad_b = error.mean()

        # L2 regularization
        grad_w += 0.01 * w

        w -= lr * grad_w
        b -= lr * grad_b

        if (epoch + 1) % 100 == 0:
            loss = -np.mean(y * np.log(pred + 1e-7) + (1 - y) * np.log(1 - pred + 1e-7))
            accuracy = np.mean((pred > 0.5) == (y > 0.5))
            print(f"    Epoch {epoch+1}: loss={loss:.4f} acc={accuracy:.3f}")

    return w.astype(np.float32), float(b)


def main():
    parser = argparse.ArgumentParser(
        description="Distill reply classification to logistic regression"
    )
    parser.add_argument(
        "--output", type=str, default=None,
        help="Output JSON path (default: ~/.lance/linkedin/reply_classifier_weights.json)",
    )
    parser.add_argument(
        "--labels-file", type=str, default=None,
        help="Path to JSONL labels (default: export from DB)",
    )
    args = parser.parse_args()

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        home = os.environ.get("HOME", ".")
        output_path = Path(home) / ".lance" / "linkedin" / "reply_classifier_weights.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Load labeled data
    if args.labels_file:
        labels_path = Path(args.labels_file)
    else:
        labels_path = Path("mlx-training/data/reply-classifier/reply_labels.jsonl")

    if not labels_path.exists():
        print(f"Labels file not found: {labels_path}", file=sys.stderr)
        print("Run export_reply_labels.py first.", file=sys.stderr)
        sys.exit(1)

    print(f"Loading labels from {labels_path}...")
    entries = []
    with open(labels_path) as f:
        for line in f:
            line = line.strip()
            if line:
                entries.append(json.loads(line))

    if len(entries) < 10:
        print(f"Need at least 10 labeled emails, got {len(entries)}.", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded {len(entries)} labeled emails")

    # Extract features and labels
    X = np.array([e["features"] for e in entries], dtype=np.float32)
    labels = [e["label"] for e in entries]
    print(f"Feature matrix: {X.shape}")

    # Print label distribution
    from collections import Counter
    dist = Counter(labels)
    print("\nLabel distribution:")
    for name in LABEL_NAMES:
        n = dist.get(name, 0)
        print(f"  {name:>16s}: {n:5d}")

    # Train 6 independent logistic regressions (OvR)
    weights = np.zeros((NUM_LABELS, NUM_FEATURES), dtype=np.float32)
    biases = np.zeros(NUM_LABELS, dtype=np.float32)

    for i, label_name in enumerate(LABEL_NAMES):
        print(f"\n  Training label: {label_name}")
        y = np.array([1.0 if lab == label_name else 0.0 for lab in labels], dtype=np.float64)

        pos_rate = y.mean()
        print(f"    Positive rate: {pos_rate:.3f} ({int(y.sum())}/{len(y)})")

        if pos_rate < 0.01 or pos_rate > 0.99:
            print(f"    Skipping — not enough variance (pos_rate={pos_rate:.3f})")
            continue

        w, b = train_logistic(X, y)
        weights[i] = w
        biases[i] = b

    # Export as JSON
    result = {
        "weights": weights.tolist(),
        "biases": biases.tolist(),
        "labels": LABEL_NAMES,
        "num_features": NUM_FEATURES,
        "trained": True,
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nWeights written to {output_path}")

    # Verify: classify a few emails with the distilled model
    print("\n─── Verification (first 5 emails) ───")
    for entry in entries[:5]:
        features = np.array(entry["features"], dtype=np.float32)
        scores = {}
        for i, name in enumerate(LABEL_NAMES):
            z = float(features @ weights[i] + biases[i])
            scores[name] = round(sigmoid(z), 3)

        text_preview = (entry.get("subject") or entry.get("text") or "")[:60]
        primary = max(scores, key=scores.get)
        confidence = scores[primary]
        bootstrap = entry["label"]
        match = "✓" if primary == bootstrap else "✗"
        print(f"  {match} [{primary} {confidence:.2f}] (bootstrap: {bootstrap}) {text_preview}...")

    # Summary accuracy
    correct = 0
    for entry in entries:
        features = np.array(entry["features"], dtype=np.float32)
        scores = {
            name: sigmoid(float(features @ weights[i] + biases[i]))
            for i, name in enumerate(LABEL_NAMES)
        }
        predicted = max(scores, key=scores.get)
        if predicted == entry["label"]:
            correct += 1

    accuracy = correct / len(entries) * 100
    print(f"\nOverall accuracy vs bootstrap labels: {correct}/{len(entries)} ({accuracy:.1f}%)")
    print(f"\nDone! Weights at {output_path}")


if __name__ == "__main__":
    main()
