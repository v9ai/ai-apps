"""Export LinkedIn post data from the Rust/LanceDB server and generate intent labels.

Two modes:
  1. bootstrap — Use existing keyword scoring to generate initial labels from post text.
  2. deepseek  — Call DeepSeek to classify posts into 7 intent categories with confidence.

Usage:
  python3 mlx-training/export_post_labels.py --stats           # Show post counts
  python3 mlx-training/export_post_labels.py --mode bootstrap  # Keyword-based labels
  python3 mlx-training/export_post_labels.py --mode deepseek   # DeepSeek labels (requires API key)
"""

from __future__ import annotations

import argparse
import json
import os
import random
import sys
from pathlib import Path

import requests

# ── Constants ────────────────────────────────────────────────────────────────

RUST_SERVER = "http://localhost:9876"

INTENT_LABELS = [
    "hiring_signal",
    "ai_ml_content",
    "remote_signal",
    "engineering_culture",
    "company_growth",
    "thought_leadership",
    "noise",
]

POST_INTENT_SYSTEM = (
    "You classify LinkedIn posts into intent categories for B2B lead generation relevance.\n"
    "Return JSON with 7 float scores (0.0-1.0) indicating confidence for each category:\n\n"
    '{"hiring_signal": 0.0, "ai_ml_content": 0.0, "remote_signal": 0.0, '
    '"engineering_culture": 0.0, "company_growth": 0.0, "thought_leadership": 0.0, "noise": 0.0}\n\n'
    "Categories:\n"
    "- hiring_signal: Post indicates active hiring (job openings, team growth, recruiting)\n"
    "- ai_ml_content: Post discusses AI/ML technology, models, frameworks, research\n"
    "- remote_signal: Post mentions remote work, distributed teams, work from anywhere\n"
    "- engineering_culture: Post about engineering practices, tech stack, developer experience\n"
    "- company_growth: Post about funding, milestones, product launches, team expansion\n"
    "- thought_leadership: Original technical insight, industry analysis, expert opinion\n"
    "- noise: Social noise (birthdays, congratulations, motivational quotes, generic content)\n\n"
    "Multiple categories can be high simultaneously (e.g., a hiring post for an AI role).\n"
    "CRITICAL: Respond with ONLY a valid JSON object, no markdown."
)

# ── Keyword-based bootstrap labels ──────────────────────────────────────────

HIRING_KW = [
    "we're hiring", "we are hiring", "hiring for", "looking for",
    "open role", "open position", "join our team", "join us",
    "now hiring", "apply now", "job opening", "growing our team",
]

AI_KW = [
    "machine learning", "deep learning", "artificial intelligence",
    " llm", "large language model", "nlp", "computer vision",
    "neural network", "pytorch", "tensorflow", "transformer",
    "langchain", "rag ", "fine-tuning", "embeddings", "mlops",
    "generative ai", "gen ai",
]

REMOTE_KW = [
    "fully remote", "remote-first", "remote first", "work from anywhere",
    "remote position", "distributed team", "async-first", "global team",
]

ENG_KW = [
    "software engineer", "backend", "frontend", "devops", "kubernetes",
    "tech lead", "engineering manager", "engineering culture", "tech stack",
]

CULTURE_KW = [
    "series a", "series b", "series c", "funding", "raised",
    "y combinator", "engineering blog", "open source",
]

NOISE_KW = [
    "happy birthday", "work anniversary", "congratulations on",
    "blessed to", "#motivation", "#blessed", "#grateful",
    "like if you agree", "hot take:",
]


def bootstrap_label(text: str) -> dict[str, float]:
    """Generate approximate intent labels from keyword matching."""
    lower = text.lower()
    word_count = max(len(lower.split()), 1)

    def density(keywords: list[str]) -> float:
        hits = sum(1 for kw in keywords if kw in lower)
        return min(hits / word_count * 10, 1.0)  # scale up density

    return {
        "hiring_signal": density(HIRING_KW),
        "ai_ml_content": density(AI_KW),
        "remote_signal": density(REMOTE_KW),
        "engineering_culture": density(ENG_KW),
        "company_growth": density(CULTURE_KW),
        "thought_leadership": max(0.0, min(len(text) / 500.0, 0.5)),  # long text heuristic
        "noise": density(NOISE_KW),
    }


# ── DeepSeek labeling ──────────────────────────────────────────────────────

def deepseek_label(text: str, metadata: dict) -> dict[str, float] | None:
    """Label a post using DeepSeek API."""
    api_key = os.environ.get("DEEPSEEK_API_KEY")
    if not api_key:
        print("Error: DEEPSEEK_API_KEY not set", file=sys.stderr)
        return None

    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

    user_msg = (
        f"Classify this LinkedIn post:\n\n{text[:2000]}\n\n"
        f"Metadata: {metadata.get('reactions_count', 0)} reactions, "
        f"{metadata.get('comments_count', 0)} comments, "
        f"media: {metadata.get('media_type', 'none')}, "
        f"repost: {metadata.get('is_repost', False)}"
    )

    try:
        resp = requests.post(
            f"{base_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": POST_INTENT_SYSTEM},
                    {"role": "user", "content": user_msg},
                ],
                "temperature": 0.1,
                "max_tokens": 200,
            },
            timeout=30,
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"].strip()
        # Parse JSON response
        labels = json.loads(content)
        # Validate all keys present
        for key in INTENT_LABELS:
            if key not in labels:
                labels[key] = 0.0
            labels[key] = max(0.0, min(float(labels[key]), 1.0))
        return labels
    except Exception as e:
        print(f"  DeepSeek error: {e}", file=sys.stderr)
        return None


# ── Export functions ─────────────────────────────────────────────────────────

def fetch_posts() -> list[dict]:
    """Fetch all posts from Rust server."""
    resp = requests.get(f"{RUST_SERVER}/export", timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return data.get("posts", [])


def export_jsonl(posts: list[dict], labels: list[dict], output_dir: Path):
    """Write train/valid JSONL files for MLX fine-tuning."""
    output_dir.mkdir(parents=True, exist_ok=True)

    examples = []
    for post, label in zip(posts, labels):
        text = post.get("post_text") or ""
        if not text.strip():
            continue

        metadata = {
            "reactions_count": post.get("reactions_count", 0),
            "comments_count": post.get("comments_count", 0),
            "media_type": post.get("media_type", "none"),
            "is_repost": post.get("is_repost", False),
        }

        user_msg = (
            f"Classify this LinkedIn post:\n\n{text[:2000]}\n\n"
            f"Metadata: {metadata['reactions_count']} reactions, "
            f"{metadata['comments_count']} comments, "
            f"media: {metadata['media_type']}, "
            f"repost: {metadata['is_repost']}"
        )

        examples.append({
            "messages": [
                {"role": "system", "content": POST_INTENT_SYSTEM},
                {"role": "user", "content": user_msg},
                {"role": "assistant", "content": json.dumps(label)},
            ]
        })

    random.shuffle(examples)
    split = int(len(examples) * 0.8)
    train = examples[:split]
    valid = examples[split:]

    for name, data in [("train.jsonl", train), ("valid.jsonl", valid)]:
        path = output_dir / name
        with open(path, "w") as f:
            for ex in data:
                f.write(json.dumps(ex) + "\n")
        print(f"  Wrote {len(data)} examples to {path}")


# ── Main ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Export post intent labels for MLX training")
    parser.add_argument("--stats", action="store_true", help="Show post counts only")
    parser.add_argument("--mode", choices=["bootstrap", "deepseek"], default="bootstrap",
                        help="Labeling mode: bootstrap (keywords) or deepseek (API)")
    parser.add_argument("--limit", type=int, default=0, help="Max posts to label (0 = all)")
    args = parser.parse_args()

    try:
        posts = fetch_posts()
    except Exception as e:
        print(f"Error: Failed to fetch posts from {RUST_SERVER}: {e}", file=sys.stderr)
        print("Make sure the LinkedIn posts server is running (make -C chrome-extension server)", file=sys.stderr)
        sys.exit(1)

    print(f"Total posts in LanceDB: {len(posts)}")

    # Filter to posts with text
    posts_with_text = [p for p in posts if (p.get("post_text") or "").strip()]
    print(f"Posts with text: {len(posts_with_text)}")

    if args.stats:
        return

    if not posts_with_text:
        print("No posts to label. Scrape some LinkedIn posts first.", file=sys.stderr)
        sys.exit(1)

    if args.limit > 0:
        posts_with_text = posts_with_text[: args.limit]

    output_dir = Path("mlx-training/data/post-intent")
    print(f"\nLabeling {len(posts_with_text)} posts with mode={args.mode}...")

    labels = []
    for i, post in enumerate(posts_with_text):
        text = post["post_text"]
        if args.mode == "bootstrap":
            label = bootstrap_label(text)
        else:
            metadata = {
                "reactions_count": post.get("reactions_count", 0),
                "comments_count": post.get("comments_count", 0),
                "media_type": post.get("media_type", "none"),
                "is_repost": post.get("is_repost", False),
            }
            label = deepseek_label(text, metadata)
            if label is None:
                label = bootstrap_label(text)  # fallback

        labels.append(label)

        if (i + 1) % 50 == 0:
            print(f"  Labeled {i + 1}/{len(posts_with_text)}")

    print(f"\nExporting to {output_dir}...")
    export_jsonl(posts_with_text, labels, output_dir)
    print("Done!")


if __name__ == "__main__":
    main()
