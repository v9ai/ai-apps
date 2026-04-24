"""Distill MLX fine-tuned intent signal model into logistic regression weights for Rust.

After fine-tuning the MLX intent-signal model, this script:
1. Reads training data from mlx-training/data/intent-signal/train.jsonl
2. Extracts a 10-element feature vector per text
3. Fits 6 independent logistic regressions (one per signal type)
4. Exports weights as JSON for the Rust IntentClassifier

Usage:
  python3 mlx-training/distill_intent_signals.py                      # Use bootstrap labels
  python3 mlx-training/distill_intent_signals.py --mlx-labels          # Use MLX model for labels
  python3 mlx-training/distill_intent_signals.py --output /path/to.json
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

# ── Constants ────────────────────────────────────────────────────────────────

NUM_FEATURES = 10
NUM_LABELS = 6
LABEL_NAMES = [
    "hiring_intent",
    "tech_adoption",
    "growth_signal",
    "budget_cycle",
    "leadership_change",
    "product_launch",
]

# Same keyword lists as export_intent_signals.py and Rust IntentClassifier
HIRING_KW = [
    "we're hiring", "we are hiring", "hiring for", "looking for",
    "open role", "open position", "join our team", "join us",
    "now hiring", "apply now", "expanding team", "new hires",
    "headcount", "growing our team", "building our team",
]

TECH_KW = [
    "migrating to", "adopting", "deployed", "switched to",
    "new stack", "infrastructure upgrade", "implementing",
    "rolling out", "upgrading to", "moving to",
]

GROWTH_KW = [
    "raised", "series a", "series b", "series c", "funding",
    "revenue growth", "ipo", "acquisition", "acquired",
    "new office", "expanding to", "growth stage",
]

BUDGET_KW = [
    "q1 planning", "annual budget", "rfp", "vendor evaluation",
    "procurement", "new fiscal year", "budget approved",
    "evaluating solutions",
]

LEADERSHIP_KW = [
    "new cto", "new vp", "appointed", "joined as",
    "promoted to", "new head of", "welcome our new",
    "announcing our new",
]

PRODUCT_KW = [
    "launching", "introducing", "announcing", "new product",
    "new feature", "beta release", "ga release", "just shipped",
    "now available", "public preview",
]

KEYWORD_MAP = {
    "hiring_intent": HIRING_KW,
    "tech_adoption": TECH_KW,
    "growth_signal": GROWTH_KW,
    "budget_cycle": BUDGET_KW,
    "leadership_change": LEADERSHIP_KW,
    "product_launch": PRODUCT_KW,
}


def extract_features(text: str, source_type: str = "company_snapshot", has_url: bool = False) -> np.ndarray:
    """Extract a 10-element feature vector matching the Rust IntentClassifier.

    Features:
      0. kw_density(HIRING_KW)
      1. kw_density(TECH_KW)
      2. kw_density(GROWTH_KW)
      3. kw_density(BUDGET_KW)
      4. kw_density(LEADERSHIP_KW)
      5. kw_density(PRODUCT_KW)
      6. text_length normalized (min(len/3000, 1.0))
      7. has_url (1.0 if source_url present)
      8. source_type encoding (company_snapshot=0.2, linkedin_post=0.5, company_fact=0.8)
      9. entity_density (count of capitalized words / word_count)
    """
    lower = text.lower()
    word_count = max(len(lower.split()), 1)

    def kw_density(keywords: list[str]) -> float:
        return sum(1 for kw in keywords if kw in lower) / word_count

    source_enc = {
        "company_snapshot": 0.2,
        "linkedin_post": 0.5,
        "company_fact": 0.8,
    }.get(source_type, 0.2)

    # Entity density: count capitalized words in original text
    words = text.split()
    cap_words = sum(1 for w in words if w and w[0].isupper() and len(w) > 1)
    entity_density = cap_words / max(len(words), 1)

    return np.array([
        kw_density(HIRING_KW),
        kw_density(TECH_KW),
        kw_density(GROWTH_KW),
        kw_density(BUDGET_KW),
        kw_density(LEADERSHIP_KW),
        kw_density(PRODUCT_KW),
        min(len(text) / 3000.0, 1.0),
        1.0 if has_url else 0.0,
        source_enc,
        entity_density,
    ], dtype=np.float32)


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def train_logistic(X: np.ndarray, y: np.ndarray, epochs: int = 500, lr: float = 0.1) -> tuple[np.ndarray, float]:
    """Train a single logistic regression using SGD. Returns (weights, bias)."""
    n, d = X.shape
    w = np.zeros(d, dtype=np.float64)
    b = 0.0

    for epoch in range(epochs):
        # Compute predictions
        z = X @ w + b
        pred = 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))

        # Gradient
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


def parse_training_data(jsonl_path: Path) -> tuple[list[str], list[str], list[dict]]:
    """Parse training JSONL to extract texts, source types, and labels.

    Returns (texts, source_types, labels) where each label is the parsed
    assistant JSON containing {"signals": [...]}.
    """
    texts = []
    source_types = []
    labels = []

    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            messages = entry["messages"]

            # Extract text from user message
            user_msg = messages[1]["content"]
            # Parse source type from "Source: ..." line
            source_type = "company_snapshot"
            for msg_line in user_msg.split("\n"):
                if msg_line.startswith("Source: "):
                    source_type = msg_line.replace("Source: ", "").strip()
                    break

            # Extract content after "Content: "
            content_start = user_msg.find("Content: ")
            text = user_msg[content_start + 9:] if content_start >= 0 else user_msg

            # Parse assistant label
            assistant_msg = messages[-1]["content"]
            label = json.loads(assistant_msg)

            texts.append(text)
            source_types.append(source_type)
            labels.append(label)

    return texts, source_types, labels


def main():
    parser = argparse.ArgumentParser(description="Distill MLX intent signal model to logistic regression for Rust")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON path (default: backend/data/models/intent_signal_weights.json)")
    parser.add_argument("--mlx-labels", action="store_true",
                        help="Use MLX model for soft labels (requires trained adapter)")
    parser.add_argument("--labels-file", type=str, default=None,
                        help="Path to JSONL file with pre-computed labels")
    args = parser.parse_args()

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = Path("backend/data/models/intent_signal_weights.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Load training data
    train_path = Path("mlx-training/data/intent-signal/train.jsonl")
    if args.labels_file:
        train_path = Path(args.labels_file)

    if not train_path.exists():
        print(f"Error: Training data not found at {train_path}", file=sys.stderr)
        print("Run export_intent_signals.py first to generate training data.", file=sys.stderr)
        sys.exit(1)

    print(f"Loading training data from {train_path}...")
    texts, source_types, labels = parse_training_data(train_path)
    print(f"Loaded {len(texts)} examples")

    if len(texts) < 10:
        print("Need at least 10 examples for distillation.", file=sys.stderr)
        sys.exit(1)

    # Extract features
    print("Extracting features...")
    X = np.stack([
        extract_features(text, source_type)
        for text, source_type in zip(texts, source_types)
    ])
    print(f"Feature matrix: {X.shape}")

    # Convert labels to per-signal binary vectors
    # For each signal type, mark 1.0 if it appears in the signals list
    label_vectors = {name: np.zeros(len(labels), dtype=np.float64) for name in LABEL_NAMES}
    for i, label in enumerate(labels):
        for sig in label.get("signals", []):
            sig_type = sig.get("signal_type", "")
            if sig_type in label_vectors:
                label_vectors[sig_type][i] = 1.0

    # Train 6 independent logistic regressions
    weights = np.zeros((NUM_LABELS, NUM_FEATURES), dtype=np.float32)
    biases = np.zeros(NUM_LABELS, dtype=np.float32)

    for i, label_name in enumerate(LABEL_NAMES):
        print(f"\n  Training label: {label_name}")
        y = label_vectors[label_name]

        pos_rate = y.mean()
        print(f"    Positive rate: {pos_rate:.3f} ({int(y.sum())}/{len(y)})")

        if pos_rate < 0.01 or pos_rate > 0.99:
            print(f"    Skipping -- not enough variance (pos_rate={pos_rate:.3f})")
            continue

        w, b = train_logistic(X, y)
        weights[i] = w
        biases[i] = b

    # Export as JSON matching Rust IntentClassifier format
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

    # Verify: score a few examples with the distilled model
    print("\n--- Verification (first 5 examples) ---")
    for idx in range(min(5, len(texts))):
        features = extract_features(texts[idx], source_types[idx])
        scores = {}
        for i, name in enumerate(LABEL_NAMES):
            z = float(features @ weights[i] + biases[i])
            scores[name] = f"{sigmoid(z):.3f}"
        text_preview = texts[idx][:60]
        primary = max(scores, key=lambda k: float(scores[k]))
        print(f"  [{primary}] {text_preview}...")
        print(f"    {scores}")

    print(f"\nDone! Weights at {output_path}")


if __name__ == "__main__":
    main()
