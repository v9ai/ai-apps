"""Distill MLX fine-tuned model into logistic regression weights for Rust.

After fine-tuning the MLX post-intent model, this script:
1. Runs the model on all posts to generate soft labels
2. Extracts the same 12-element feature vector as the Rust scorer
3. Fits 7 independent logistic regressions (one per intent label)
4. Exports weights as JSON for the Rust PostIntentScorer

Usage:
  python3 mlx-training/distill_to_logistic.py                     # Use bootstrap labels
  python3 mlx-training/distill_to_logistic.py --mlx-labels         # Use MLX model for labels
  python3 mlx-training/distill_to_logistic.py --output /path/to.json

The output JSON goes to ~/.lance/linkedin/post_intent_weights.json by default.
The Rust server loads it on startup or via POST /scorer/reload.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
from pathlib import Path

import numpy as np
import requests

# ── Constants ────────────────────────────────────────────────────────────────

RUST_SERVER = "http://localhost:9876"
NUM_FEATURES = 12
NUM_LABELS = 7
LABEL_NAMES = [
    "hiring_signal", "ai_ml_content", "remote_signal",
    "engineering_culture", "company_growth", "thought_leadership", "noise",
]

# Same keyword lists as Rust intent_scorer.rs
HIRING_KW = [
    "we're hiring", "we are hiring", "hiring for", "looking for",
    "open role", "open position", "join our team", "join us",
    "now hiring", "apply now", "job opening", "job opportunity",
    "come work with", "growing our team", "building our team",
    "talent acquisition", "new role", "new opening",
]
AI_KW = [
    "machine learning", "deep learning", "artificial intelligence",
    " llm ", "llm,", "llms", "large language model",
    "natural language processing", " nlp ", "computer vision",
    "neural network", "pytorch", "tensorflow", "transformer",
    " gpt", "langchain", "rag ", "retrieval augmented",
    "fine-tuning", "embeddings", "vector database", "mlops",
    "ml engineer", "ai engineer", "data scientist",
    "generative ai", "gen ai", "diffusion model", "reinforcement learning",
]
REMOTE_KW = [
    "fully remote", "remote-first", "remote first", "work from anywhere",
    "remote position", "remote role", "remote opportunity",
    "distributed team", "async-first", "global team", "worldwide",
]
ENG_KW = [
    "software engineer", "backend engineer", "frontend engineer",
    "full-stack", "fullstack", "devops", "infrastructure",
    "platform engineer", "site reliability", " sre ",
    "distributed systems", "microservices", "kubernetes", " k8s",
    "typescript", "python", " rust ", " golang", "system design",
    "tech lead", "staff engineer", "principal engineer", "engineering manager",
]
CULTURE_KW = [
    "engineering culture", "tech stack", "engineering blog", "tech talk",
    "open source", "developer experience", "team culture", "how we build",
    "our engineering", "series a", "series b", "series c",
    "raised", "funding", "yc ", "y combinator",
]
NOISE_KW = [
    "happy birthday", "work anniversary", "congratulations on",
    "congrats on your", "thrilled to announce my", "blessed to",
    "grateful for this journey", "like if you agree", "share if you",
    "agree or disagree", "hot take:", "unpopular opinion",
    "thoughts?", "#motivation", "#mondaymotivation", "#blessed",
    "#grateful", "personal news:",
]


def extract_features(post: dict) -> np.ndarray:
    """Extract the same 12-element feature vector as Rust intent_scorer.rs."""
    text = (post.get("post_text") or "").lower()
    word_count = max(len(text.split()), 1)

    def kw_density(keywords: list[str]) -> float:
        return sum(1 for kw in keywords if kw in text) / word_count

    media_enc = {
        "image": 0.2, "article": 0.4, "document": 0.6,
        "video": 0.8, "poll": 1.0,
    }.get(post.get("media_type", "none"), 0.0)

    reactions = post.get("reactions_count", 0)
    comments = post.get("comments_count", 0)

    return np.array([
        kw_density(HIRING_KW),
        kw_density(AI_KW),
        kw_density(REMOTE_KW),
        kw_density(ENG_KW),
        kw_density(CULTURE_KW),
        kw_density(NOISE_KW),
        min(len(post.get("post_text") or "") / 500.0, 1.0),
        math.log1p(reactions) / 10.0,
        math.log1p(comments) / 8.0,
        1.0 if post.get("post_url") else 0.0,
        1.0 if post.get("is_repost", False) else 0.0,
        media_enc,
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


def main():
    parser = argparse.ArgumentParser(description="Distill MLX model to logistic regression for Rust")
    parser.add_argument("--output", type=str, default=None,
                        help="Output JSON path (default: ~/.lance/linkedin/post_intent_weights.json)")
    parser.add_argument("--mlx-labels", action="store_true",
                        help="Use MLX model for soft labels (requires trained adapter)")
    parser.add_argument("--labels-file", type=str, default=None,
                        help="Path to JSONL file with pre-computed labels")
    args = parser.parse_args()

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        home = os.environ.get("HOME", ".")
        output_path = Path(home) / ".lance" / "linkedin" / "post_intent_weights.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Fetch posts
    print("Fetching posts from Rust server...")
    try:
        resp = requests.get(f"{RUST_SERVER}/export", timeout=10)
        resp.raise_for_status()
        posts = resp.json().get("posts", [])
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    posts_with_text = [p for p in posts if (p.get("post_text") or "").strip()]
    print(f"Posts with text: {len(posts_with_text)}")

    if len(posts_with_text) < 10:
        print("Need at least 10 posts for distillation. Scrape more first.", file=sys.stderr)
        sys.exit(1)

    # Load or generate labels
    if args.labels_file:
        print(f"Loading labels from {args.labels_file}...")
        with open(args.labels_file) as f:
            label_entries = [json.loads(line) for line in f]
        # Extract labels from JSONL messages format
        labels = []
        for entry in label_entries:
            assistant_msg = entry["messages"][-1]["content"]
            labels.append(json.loads(assistant_msg))
    else:
        # Use bootstrap labels from existing scoring
        print("Generating bootstrap labels from keyword scoring...")
        from export_post_labels import bootstrap_label
        labels = [bootstrap_label(p["post_text"]) for p in posts_with_text]

    # Extract features
    print("Extracting features...")
    X = np.stack([extract_features(p) for p in posts_with_text])
    print(f"Feature matrix: {X.shape}")

    # Train 7 independent logistic regressions
    weights = np.zeros((NUM_LABELS, NUM_FEATURES), dtype=np.float32)
    biases = np.zeros(NUM_LABELS, dtype=np.float32)

    for i, label_name in enumerate(LABEL_NAMES):
        print(f"\n  Training label: {label_name}")
        y = np.array([lab[label_name] for lab in labels], dtype=np.float64)

        # Binarize for training: threshold at 0.5
        y_binary = (y > 0.3).astype(np.float64)
        pos_rate = y_binary.mean()
        print(f"    Positive rate: {pos_rate:.3f} ({int(y_binary.sum())}/{len(y_binary)})")

        if pos_rate < 0.01 or pos_rate > 0.99:
            print(f"    Skipping — not enough variance (pos_rate={pos_rate:.3f})")
            continue

        w, b = train_logistic(X, y_binary)
        weights[i] = w
        biases[i] = b

    # Export as JSON matching Rust PostIntentScorer format
    result = {
        "weights": weights.tolist(),
        "biases": biases.tolist(),
        "trained": True,
    }

    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"\nWeights written to {output_path}")

    # Verify: score a few posts with the distilled model
    print("\n─── Verification (first 5 posts) ───")
    for p in posts_with_text[:5]:
        features = extract_features(p)
        scores = {}
        for i, name in enumerate(LABEL_NAMES):
            z = float(features @ weights[i] + biases[i])
            scores[name] = f"{sigmoid(z):.3f}"
        text_preview = (p.get("post_text") or "")[:60]
        primary = max(scores, key=lambda k: float(scores[k]))
        print(f"  [{primary}] {text_preview}...")
        print(f"    {scores}")

    print(f"\nDone! Reload in Rust server: curl -X POST localhost:9876/scorer/reload")


if __name__ == "__main__":
    main()
