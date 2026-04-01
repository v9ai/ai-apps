"""MLX LoRA fine-tuning entry point for lead-gen classification tasks.

Usage:
  python3 mlx-training/finetune.py --task role-tag
  python3 mlx-training/finetune.py --task remote-worldwide
  python3 mlx-training/finetune.py --task role-tag --dry-run   # print config only
  python3 mlx-training/finetune.py --task role-tag --epochs 3  # override epochs

Requires: pip3 install mlx mlx-lm
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
from pathlib import Path

import yaml

from finetune_config import CONFIGS


def count_lines(path: Path) -> int:
    if not path.exists():
        return 0
    with open(path) as f:
        return sum(1 for _ in f)


def main():
    parser = argparse.ArgumentParser(description="Fine-tune Qwen for lead-gen classification")
    parser.add_argument("--task", choices=list(CONFIGS.keys()), required=True)
    parser.add_argument("--dry-run", action="store_true", help="Print config and exit")
    parser.add_argument("--epochs", type=int, help="Override number of epochs")
    parser.add_argument("--model", type=str, help="Override base model")
    args = parser.parse_args()

    config = CONFIGS[args.task]
    if args.epochs:
        config.epochs = args.epochs
    if args.model:
        config.model = args.model

    # Check training data exists
    train_path = Path(config.data_dir) / "train.jsonl"
    valid_path = Path(config.data_dir) / "valid.jsonl"

    if not train_path.exists():
        print(f"ERROR: Training data not found at {train_path}", file=sys.stderr)
        print("Run: python3 mlx-training/export_training_data.py --task " + args.task, file=sys.stderr)
        sys.exit(1)

    train_count = count_lines(train_path)
    valid_count = count_lines(valid_path)
    print(f"Task: {args.task}")
    print(f"Model: {config.model}")
    print(f"Training examples: {train_count}")
    print(f"Validation examples: {valid_count}")
    val_batches = config.val_batches
    val_examples = valid_count if val_batches == -1 else min(val_batches * config.batch_size, valid_count)
    print(f"Eval examples per pass: {val_examples}/{valid_count} (val_batches={val_batches})")

    # Calculate iterations from epochs
    effective_batch = config.batch_size * config.grad_accumulation_steps
    iters_per_epoch = max(1, train_count // effective_batch)
    total_iters = iters_per_epoch * config.epochs
    print(f"Effective batch size: {effective_batch}")
    print(f"Iterations per epoch: {iters_per_epoch}")
    print(f"Total iterations: {total_iters}")
    print(f"Adapter output: {config.adapter_path}")

    yaml_dict = config.to_yaml_dict(total_iters)

    if args.dry_run:
        print("\n--- Config YAML ---")
        print(yaml.dump(yaml_dict, default_flow_style=False))
        return

    # Write config to temp file and run mlx_lm.lora
    Path(config.adapter_path).mkdir(parents=True, exist_ok=True)

    with tempfile.NamedTemporaryFile(mode="w", suffix=".yaml", delete=False) as f:
        yaml.dump(yaml_dict, f)
        config_path = f.name

    print(f"\nConfig written to {config_path}")
    print("Starting training...\n")

    result = subprocess.run(
        [sys.executable, "-m", "mlx_lm.lora", "-c", config_path],
        check=False,
    )
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
