"""Merge real + synthetic email data into final train/valid/test splits.

Combines exported real emails and synthetic emails, shuffles,
and produces the final splits for MLX LoRA fine-tuning.

Usage:
  python3 mlx-training/merge_email_data.py
  python3 mlx-training/merge_email_data.py --test-size 50
"""

from __future__ import annotations

import argparse
import json
import random
from pathlib import Path


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


def main():
    parser = argparse.ArgumentParser(description="Merge email training data")
    parser.add_argument("--data-dir", type=Path, default=Path("mlx-training/data/outreach-email"))
    parser.add_argument("--test-size", type=int, default=50, help="Held-out test examples (from real data)")
    parser.add_argument("--valid-ratio", type=float, default=0.15, help="Validation split ratio")
    args = parser.parse_args()

    data_dir = args.data_dir

    # Load sources
    real_train = load_jsonl(data_dir / "train.jsonl")
    real_valid = load_jsonl(data_dir / "valid.jsonl")
    resend = load_jsonl(data_dir / "resend.jsonl")
    synthetic = load_jsonl(data_dir / "synthetic.jsonl")

    real_all = real_train + real_valid + resend
    print(f"Real emails (DB): {len(real_train) + len(real_valid)}")
    print(f"Real emails (Resend): {len(resend)}")
    print(f"Synthetic emails: {len(synthetic)}")

    if not real_all and not synthetic:
        print("No data found. Run export_email_data.py and/or generate_synthetic_emails.py first.")
        return

    # Reserve test set from real data only
    random.seed(42)
    random.shuffle(real_all)

    test_size = min(args.test_size, len(real_all) // 3) if real_all else 0
    test_set = real_all[:test_size]
    real_remaining = real_all[test_size:]

    print(f"Test set (real only): {len(test_set)}")

    # Combine remaining real + synthetic
    combined = real_remaining + synthetic
    random.shuffle(combined)

    # Split into train/valid
    valid_size = max(1, int(len(combined) * args.valid_ratio))
    valid_set = combined[:valid_size]
    train_set = combined[valid_size:]

    print(f"Train: {len(train_set)}")
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
