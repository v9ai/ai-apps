#!/usr/bin/env python3
"""Distill 16-feature semantic intent classifier for Rust SemanticIntentClassifier.

Extends the 10-feature keyword-only classifier with 6 semantic cosine similarities
(one per signal type) computed from BGE embeddings against intent prototypes.

Feature vector [16]:
  [0-9]   keyword features (same as distill_intent_signals.py)
  [10-15] cosine similarity against intent prototype embeddings

Usage:
    python distill_semantic_intent.py
    python distill_semantic_intent.py --prototypes /path/to/intent_prototypes.json
    python distill_semantic_intent.py --output /path/to/weights.json

Requires: pip install numpy sentence-transformers (or transformers + torch)
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

# ── Constants ────────────────────────────────────────────────────────────────

NUM_KEYWORD_FEATURES = 10
NUM_SEMANTIC_FEATURES = 6
NUM_FEATURES = 16  # Must match Rust NUM_SEMANTIC_INTENT_FEATURES
NUM_LABELS = 6

LABEL_NAMES = [
    "hiring_intent",
    "tech_adoption",
    "growth_signal",
    "budget_cycle",
    "leadership_change",
    "product_launch",
]

# Same keyword lists as the 10-feature distiller
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


def extract_keyword_features(text: str, source_type: str = "company_snapshot", has_url: bool = False) -> np.ndarray:
    """Extract 10-element keyword feature vector (matching Rust IntentClassifier)."""
    lower = text.lower()
    word_count = max(len(lower.split()), 1)

    def kw_density(keywords: list[str]) -> float:
        return sum(1 for kw in keywords if kw in lower) / word_count

    source_enc = {
        "company_snapshot": 0.2,
        "linkedin_post": 0.5,
        "company_fact": 0.8,
    }.get(source_type, 0.2)

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


def embed_texts(texts: list[str], model_name: str = "BAAI/bge-small-en-v1.5") -> np.ndarray:
    """Embed texts using BGE model. Returns [n × 384] L2-normalized matrix."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(model_name)
        return np.array(model.encode(texts, normalize_embeddings=True, show_progress_bar=True), dtype=np.float32)
    except ImportError:
        from transformers import AutoTokenizer, AutoModel
        import torch
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)
        model.eval()
        all_embs = []
        for i in range(0, len(texts), 32):
            batch = texts[i:i + 32]
            inputs = tokenizer(batch, padding=True, truncation=True, max_length=512, return_tensors="pt")
            with torch.no_grad():
                outputs = model(**inputs)
            cls = outputs.last_hidden_state[:, 0, :]
            cls = torch.nn.functional.normalize(cls, p=2, dim=1)
            all_embs.append(cls.numpy())
        return np.concatenate(all_embs, axis=0).astype(np.float32)


def compute_semantic_features(embedding: np.ndarray, prototypes: np.ndarray) -> np.ndarray:
    """Compute 6 cosine similarities between an embedding and 6 prototypes."""
    # Both are L2-normalized, so dot product = cosine similarity
    return (prototypes @ embedding).astype(np.float32)


def extract_full_features(
    text: str,
    embedding: np.ndarray,
    prototypes: np.ndarray,
    source_type: str = "company_snapshot",
    has_url: bool = False,
) -> np.ndarray:
    """Extract 16-element feature vector: [10 keyword | 6 semantic]."""
    kw = extract_keyword_features(text, source_type, has_url)
    sem = compute_semantic_features(embedding, prototypes)
    return np.concatenate([kw, sem])


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def train_logistic(X: np.ndarray, y: np.ndarray, epochs: int = 500, lr: float = 0.1) -> tuple[np.ndarray, float]:
    """Train logistic regression with SGD + L2 regularization."""
    n, d = X.shape
    w = np.zeros(d, dtype=np.float64)
    b = 0.0

    for epoch in range(epochs):
        z = X @ w + b
        pred = 1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))
        error = pred - y
        grad_w = (X.T @ error) / n + 0.01 * w
        grad_b = error.mean()
        w -= lr * grad_w
        b -= lr * grad_b

        if (epoch + 1) % 100 == 0:
            loss = -np.mean(y * np.log(pred + 1e-7) + (1 - y) * np.log(1 - pred + 1e-7))
            acc = np.mean((pred > 0.5) == (y > 0.5))
            print(f"    Epoch {epoch+1}: loss={loss:.4f} acc={acc:.3f}")

    return w.astype(np.float32), float(b)


def parse_training_data(jsonl_path: Path) -> tuple[list[str], list[str], list[dict]]:
    """Parse training JSONL (same format as distill_intent_signals.py)."""
    texts, source_types, labels = [], [], []
    with open(jsonl_path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            messages = entry["messages"]
            user_msg = messages[1]["content"]
            source_type = "company_snapshot"
            for msg_line in user_msg.split("\n"):
                if msg_line.startswith("Source: "):
                    source_type = msg_line.replace("Source: ", "").strip()
                    break
            content_start = user_msg.find("Content: ")
            text = user_msg[content_start + 9:] if content_start >= 0 else user_msg
            assistant_msg = messages[-1]["content"]
            label = json.loads(assistant_msg)
            texts.append(text)
            source_types.append(source_type)
            labels.append(label)
    return texts, source_types, labels


def main():
    parser = argparse.ArgumentParser(description="Distill 16-feature semantic intent classifier")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON path (default: backend/data/models/semantic_intent_classifier.json)")
    parser.add_argument("--prototypes", type=str, default=None,
                        help="Path to intent_prototypes.json (default: backend/data/models/intent_prototypes.json)")
    parser.add_argument("--model", type=str, default="BAAI/bge-small-en-v1.5",
                        help="BGE embedding model")
    args = parser.parse_args()

    output_path = Path(args.output) if args.output else Path("backend/data/models/semantic_intent_classifier.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    prototypes_path = Path(args.prototypes) if args.prototypes else Path("backend/data/models/intent_prototypes.json")

    # Load prototypes
    if not prototypes_path.exists():
        print(f"Error: Prototypes not found at {prototypes_path}", file=sys.stderr)
        print("Run generate_intent_prototypes.py first.", file=sys.stderr)
        sys.exit(1)

    with open(prototypes_path) as f:
        proto_data = json.load(f)
    prototypes = np.array(proto_data["prototypes"], dtype=np.float32)
    dim = proto_data["dim"]
    print(f"Loaded {len(prototypes)} prototypes ({dim}-dim)")

    # Load training data
    train_path = Path("mlx-training/data/intent-signal/train.jsonl")
    if not train_path.exists():
        print(f"Error: Training data not found at {train_path}", file=sys.stderr)
        sys.exit(1)

    texts, source_types, labels = parse_training_data(train_path)
    print(f"Loaded {len(texts)} training examples")

    if len(texts) < 10:
        print("Need at least 10 examples.", file=sys.stderr)
        sys.exit(1)

    # Embed all training texts
    print(f"Embedding {len(texts)} texts with {args.model}...")
    embeddings = embed_texts(texts, args.model)
    print(f"Embeddings: {embeddings.shape}")

    # Build 16-feature matrix
    print("Extracting 16-feature vectors...")
    X = np.stack([
        extract_full_features(text, emb, prototypes, src)
        for text, emb, src in zip(texts, embeddings, source_types)
    ])
    print(f"Feature matrix: {X.shape}")

    # Show feature statistics
    print("\nFeature statistics:")
    feature_names = [
        "kw_hiring", "kw_tech", "kw_growth", "kw_budget", "kw_leadership", "kw_product",
        "text_len", "has_url", "source_type", "entity_dens",
        "sem_hiring", "sem_tech", "sem_growth", "sem_budget", "sem_leadership", "sem_product",
    ]
    for i, name in enumerate(feature_names):
        print(f"  {name:>15}: mean={X[:, i].mean():.4f} std={X[:, i].std():.4f} min={X[:, i].min():.4f} max={X[:, i].max():.4f}")

    # Convert labels to per-signal binary vectors
    label_vectors = {name: np.zeros(len(labels), dtype=np.float64) for name in LABEL_NAMES}
    for i, label in enumerate(labels):
        for sig in label.get("signals", []):
            sig_type = sig.get("signal_type", "")
            if sig_type in label_vectors:
                label_vectors[sig_type][i] = 1.0

    # Train 6 independent logistic regressions on 16 features
    weights = np.zeros((NUM_LABELS, NUM_FEATURES), dtype=np.float32)
    biases = np.zeros(NUM_LABELS, dtype=np.float32)

    for i, label_name in enumerate(LABEL_NAMES):
        print(f"\n  Training: {label_name}")
        y = label_vectors[label_name]
        pos_rate = y.mean()
        print(f"    Positive rate: {pos_rate:.3f} ({int(y.sum())}/{len(y)})")

        if pos_rate < 0.01 or pos_rate > 0.99:
            print(f"    Skipping -- insufficient variance")
            continue

        w, b = train_logistic(X, y)
        weights[i] = w
        biases[i] = b

        # Show feature importance
        top_features = sorted(range(NUM_FEATURES), key=lambda j: abs(w[j]), reverse=True)[:5]
        print(f"    Top features: {', '.join(f'{feature_names[j]}={w[j]:+.3f}' for j in top_features)}")

    # Export as JSON matching Rust SemanticIntentClassifier
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

    # Verification
    print("\n--- Verification (first 5 examples) ---")
    for idx in range(min(5, len(texts))):
        features = X[idx]
        scores = {}
        for i, name in enumerate(LABEL_NAMES):
            z = float(features @ weights[i] + biases[i])
            scores[name] = f"{sigmoid(z):.3f}"
        text_preview = texts[idx][:60]
        primary = max(scores, key=lambda k: float(scores[k]))
        print(f"  [{primary}] {text_preview}...")
        print(f"    {scores}")

    # Compare keyword-only vs semantic features
    print("\n--- Feature ablation ---")
    for i, label_name in enumerate(LABEL_NAMES):
        y = label_vectors[label_name]
        if y.mean() < 0.01 or y.mean() > 0.99:
            continue

        # Keyword-only (features 0-9)
        kw_pred = 1.0 / (1.0 + np.exp(-np.clip(X[:, :10] @ weights[i, :10] + biases[i], -30, 30)))
        kw_acc = np.mean((kw_pred > 0.5) == (y > 0.5))

        # Full 16 features
        full_pred = 1.0 / (1.0 + np.exp(-np.clip(X @ weights[i] + biases[i], -30, 30)))
        full_acc = np.mean((full_pred > 0.5) == (y > 0.5))

        delta = full_acc - kw_acc
        indicator = "+" if delta > 0 else ""
        print(f"  {label_name:>20}: kw_only={kw_acc:.3f} full_16={full_acc:.3f} ({indicator}{delta:.3f})")


if __name__ == "__main__":
    main()
