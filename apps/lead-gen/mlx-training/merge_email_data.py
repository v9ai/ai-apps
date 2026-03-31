"""Merge real + synthetic email data into final train/valid/test splits.

Combines exported real emails and synthetic emails, shuffles,
applies data quality filters (coherence + TF-IDF dedup),
and produces the final splits for MLX LoRA fine-tuning.

Usage:
  python3 mlx-training/merge_email_data.py
  python3 mlx-training/merge_email_data.py --test-size 50
  python3 mlx-training/merge_email_data.py --no-dedup
  python3 mlx-training/merge_email_data.py --dedup-threshold 0.90
"""

from __future__ import annotations

import argparse
import json
import random
import re
from collections import Counter
from pathlib import Path

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    _HAS_SKLEARN = True
except ImportError:
    _HAS_SKLEARN = False


def load_jsonl(path: Path) -> list[dict]:
    if not path.exists():
        return []
    records = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records


def _extract_body(record: dict) -> str:
    """Extract the email body text from a chat-format record's assistant message."""
    for msg in record.get("messages", []):
        if msg.get("role") != "assistant":
            continue
        content = msg.get("content", "")
        # Strip <think>...</think> block if present
        think_match = re.match(r"<think>\s*</think>\s*", content, re.DOTALL)
        if think_match:
            content = content[think_match.end():]
        # Try to parse remaining content as JSON to get "body" field
        try:
            payload = json.loads(content)
            if isinstance(payload, dict) and "body" in payload:
                return payload["body"]
        except (json.JSONDecodeError, TypeError):
            pass
        # Fallback: return the raw content
        return content
    return ""


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences on '. ', '! ', '? ' boundaries."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    return [s for s in parts if s.strip()]


def filter_coherent(records: list[dict]) -> tuple[list[dict], list[dict]]:
    """Filter out incoherent records.

    Returns (kept, rejected) where each rejected record has a '_reject_reason' field.
    """
    kept = []
    rejected = []

    for rec in records:
        body = _extract_body(rec)
        reason = None

        sentences = _split_sentences(body)
        if len(sentences) < 3:
            reason = f"too_few_sentences ({len(sentences)})"

        elif "lorem ipsum" in body.lower():
            reason = "lorem_ipsum"

        elif "{{company}}" in body or "{{position}}" in body:
            reason = "unfilled_placeholder"

        else:
            # Check for repeated consecutive sentences
            for i in range(1, len(sentences)):
                if sentences[i].strip() == sentences[i - 1].strip():
                    reason = "repeated_consecutive_sentence"
                    break

        if reason:
            rej = {**rec, "_reject_reason": f"coherence:{reason}"}
            rejected.append(rej)
        else:
            kept.append(rec)

    return kept, rejected


def dedup_by_similarity(
    records: list[dict], threshold: float = 0.85
) -> tuple[list[dict], list[dict]]:
    """Remove near-duplicate records using TF-IDF cosine similarity.

    Returns (kept, rejected) where each rejected record has a '_reject_reason' field.
    """
    if not _HAS_SKLEARN:
        print("  WARNING: scikit-learn not installed, skipping deduplication")
        return records, []

    if len(records) <= 1:
        return records, []

    bodies = [_extract_body(rec) for rec in records]

    # Build TF-IDF on body text only
    vectorizer = TfidfVectorizer(stop_words="english", max_features=10000)
    tfidf_matrix = vectorizer.fit_transform(bodies)

    sim_matrix = cosine_similarity(tfidf_matrix)

    # Greedy dedup: keep first occurrence, remove later near-duplicates
    removed = set()
    for i in range(len(records)):
        if i in removed:
            continue
        for j in range(i + 1, len(records)):
            if j in removed:
                continue
            if sim_matrix[i, j] > threshold:
                removed.add(j)

    kept = []
    rejected = []
    for idx, rec in enumerate(records):
        if idx in removed:
            rej = {**rec, "_reject_reason": f"dedup:similarity>{threshold:.2f}"}
            rejected.append(rej)
        else:
            kept.append(rec)

    return kept, rejected


def main():
    parser = argparse.ArgumentParser(description="Merge email training data")
    parser.add_argument("--data-dir", type=Path, default=Path("mlx-training/data/outreach-email"))
    parser.add_argument("--test-size", type=int, default=50, help="Held-out test examples (from real data)")
    parser.add_argument("--valid-ratio", type=float, default=0.15, help="Validation split ratio")
    parser.add_argument("--no-dedup", action="store_true", help="Skip deduplication step")
    parser.add_argument("--dedup-threshold", type=float, default=0.85, help="Cosine similarity threshold (default: 0.85)")
    args = parser.parse_args()

    data_dir = args.data_dir

    # Load sources
    resend = load_jsonl(data_dir / "resend.jsonl")
    synthetic = load_jsonl(data_dir / "synthetic.jsonl")

    real_all = resend  # Only use Resend data (DB is empty, old splits may be stale)
    print(f"Real emails (Resend): {len(resend)}")
    print(f"Synthetic emails: {len(synthetic)}")

    if not real_all and not synthetic:
        print("No data found. Run export_email_data.py and/or generate_synthetic_emails.py first.")
        return

    # Reserve test set from real data only (test set is NOT filtered)
    random.seed(42)
    random.shuffle(real_all)

    test_size = min(args.test_size, len(real_all) // 3) if real_all else 0
    test_set = real_all[:test_size]
    real_remaining = real_all[test_size:]

    print(f"Test set (real only): {len(test_set)}")

    # Combine remaining real + synthetic
    combined = real_remaining + synthetic

    # --- Data quality filters ---
    all_rejected: list[dict] = []

    # 1. Coherence filter (applied first)
    print("\nApplying coherence filter...")
    combined, coherence_rejected = filter_coherent(combined)
    all_rejected.extend(coherence_rejected)
    if coherence_rejected:
        reasons = Counter(r["_reject_reason"] for r in coherence_rejected)
        reason_str = ", ".join(f"{k}: {v}" for k, v in reasons.items())
        print(f"  Coherence filter removed {len(coherence_rejected)} records ({reason_str})")
    else:
        print("  Coherence filter: all records passed")

    # 2. TF-IDF deduplication
    if args.no_dedup:
        print("Deduplication skipped (--no-dedup)")
    else:
        print(f"Applying TF-IDF deduplication (threshold={args.dedup_threshold})...")
        combined, dedup_rejected = dedup_by_similarity(combined, threshold=args.dedup_threshold)
        all_rejected.extend(dedup_rejected)
        if dedup_rejected:
            print(f"  Dedup removed {len(dedup_rejected)} records")
        else:
            print("  Dedup: no duplicates found")

    # Write rejected records
    if all_rejected:
        rejected_path = data_dir / "rejected.jsonl"
        with open(rejected_path, "w") as f:
            for rec in all_rejected:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(f"  Rejected total: {len(all_rejected)} → {rejected_path}")

    # Shuffle after filtering
    random.shuffle(combined)

    # Split into train/valid
    valid_size = max(1, int(len(combined) * args.valid_ratio))
    valid_set = combined[:valid_size]
    train_set = combined[valid_size:]

    print(f"\nTrain: {len(train_set)}")
    print(f"Valid: {len(valid_set)}")
    print(f"Total: {len(train_set) + len(valid_set) + len(test_set)}")

    # Write final splits
    for name, subset in [("train", train_set), ("valid", valid_set), ("test", test_set)]:
        path = data_dir / f"{name}.jsonl"
        with open(path, "w") as f:
            for rec in subset:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        print(f"  {name}: {len(subset)} → {path}")

    print("\nDone. Ready for: python3 mlx-training/finetune.py --task outreach-email")


if __name__ == "__main__":
    main()
