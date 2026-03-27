"""MLX LoRA fine-tuning wrapper for knowledge model.

Generates a YAML config and invokes mlx_lm.lora for training.

Usage:
    python scripts/finetune.py                     # train qwen-3b (default)
    python scripts/finetune.py --model qwen-7b     # train qwen-7b
    python scripts/finetune.py --dry-run            # print config only
"""

from __future__ import annotations

import argparse
import sys
import yaml
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from finetune_config import CONFIGS, TrainConfig


def estimate_iters(cfg: TrainConfig) -> int:
    """Estimate total iterations from epochs, data size, and batch config."""
    train_path = ROOT / cfg.data_dir / "train.jsonl"
    if train_path.exists():
        n_examples = sum(1 for _ in open(train_path))
    else:
        n_examples = 432  # fallback estimate
    effective_batch = cfg.batch_size * cfg.grad_accumulation_steps
    iters_per_epoch = max(1, n_examples // effective_batch)
    return iters_per_epoch * cfg.epochs


def main() -> None:
    parser = argparse.ArgumentParser(description="MLX LoRA fine-tuning for knowledge model")
    parser.add_argument("--model", choices=list(CONFIGS.keys()), default="qwen-3b",
                        help="Model config to use (default: qwen-3b)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print config and estimated iters without training")
    args = parser.parse_args()

    cfg = CONFIGS[args.model]
    iters = estimate_iters(cfg)
    effective = cfg.batch_size * cfg.grad_accumulation_steps

    print(f"Model:            {cfg.model}")
    print(f"LoRA rank:        {cfg.lora.rank}, scale: {cfg.lora.scale:.1f} (alpha={cfg.lora.alpha})")
    print(f"Batch size:       {cfg.batch_size} x {cfg.grad_accumulation_steps} grad_accum = {effective} effective")
    print(f"Learning rate:    {cfg.learning_rate}")
    print(f"Max seq length:   {cfg.max_seq_length}")
    print(f"Epochs:           {cfg.epochs}")
    print(f"Estimated iters:  {iters}")
    print(f"Adapter path:     {ROOT / cfg.adapter_path}")

    # Build YAML config dict with absolute paths
    yaml_dict = cfg.to_yaml_dict(iters)
    yaml_dict["data"] = str(ROOT / cfg.data_dir)
    yaml_dict["adapter_path"] = str(ROOT / cfg.adapter_path)

    if args.dry_run:
        print(f"\n[dry-run] YAML config:\n")
        print(yaml.dump(yaml_dict, default_flow_style=False))
        return

    # Verify data exists
    train_path = ROOT / cfg.data_dir / "train.jsonl"
    valid_path = ROOT / cfg.data_dir / "valid.jsonl"
    if not train_path.exists():
        print(f"\nError: {train_path} not found. Run build_splits.py first.")
        sys.exit(1)
    if not valid_path.exists():
        print(f"\nError: {valid_path} not found. Run build_splits.py first.")
        sys.exit(1)

    # Write temp config and run training
    config_path = ROOT / "data" / "lora_config.yaml"
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(yaml.dump(yaml_dict, default_flow_style=False))
    print(f"\nConfig written to {config_path}")

    print("Starting LoRA training...\n")
    try:
        from mlx_lm import lora
    except ImportError:
        print("Error: mlx-lm not installed. Run: pip install mlx-lm")
        sys.exit(1)

    sys.argv = ["mlx_lm.lora", "--config", str(config_path)]
    lora.main()

    print(f"\nTraining complete. Adapters saved to {ROOT / cfg.adapter_path}")


if __name__ == "__main__":
    main()
