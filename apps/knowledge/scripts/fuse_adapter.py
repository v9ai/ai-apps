"""Merge LoRA adapters into a base model for serving.

Produces a standalone model directory that can be loaded by mlx_lm.server
without needing to apply adapters at runtime.

Usage:
    python scripts/fuse_adapter.py                                    # defaults
    python scripts/fuse_adapter.py --model qwen-7b                    # fuse 7B
    python scripts/fuse_adapter.py --adapter-path data/adapters       # custom adapter
    python scripts/fuse_adapter.py --output data/models/custom-name   # custom output
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from finetune_config import CONFIGS


def main() -> None:
    parser = argparse.ArgumentParser(description="Fuse LoRA adapters into base model")
    parser.add_argument("--model", choices=list(CONFIGS.keys()), default="qwen-3b",
                        help="Model config to use (default: qwen-3b)")
    parser.add_argument("--adapter-path", type=str, default=None,
                        help="Path to adapter weights (default: data/adapters)")
    parser.add_argument("--output", type=str, default=None,
                        help="Output directory for fused model")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be done without fusing")
    args = parser.parse_args()

    cfg = CONFIGS[args.model]
    adapter_path = Path(args.adapter_path) if args.adapter_path else ROOT / cfg.adapter_path

    if args.output:
        output_path = Path(args.output)
    else:
        model_name = cfg.model.split("/")[-1].lower().replace("instruct-4bit", "knowledge-v1")
        output_path = ROOT / "data" / "models" / model_name

    print(f"Base model:    {cfg.model}")
    print(f"Adapter path:  {adapter_path}")
    print(f"Output path:   {output_path}")

    if args.dry_run:
        print("\n[dry-run] Would fuse adapters into base model.")
        return

    # Verify adapter exists
    if not adapter_path.exists():
        print(f"\nError: {adapter_path} not found. Run finetune.py first.")
        sys.exit(1)

    adapter_weights = adapter_path / "adapters.safetensors"
    if not adapter_weights.exists():
        print(f"\nError: {adapter_weights} not found. Training may not have completed.")
        sys.exit(1)

    try:
        from mlx_lm import fuse
    except ImportError:
        print("Error: mlx-lm not installed. Run: pip install mlx-lm")
        sys.exit(1)

    output_path.mkdir(parents=True, exist_ok=True)

    print("\nFusing adapters...")
    sys.argv = [
        "mlx_lm.fuse",
        "--model", cfg.model,
        "--adapter-path", str(adapter_path),
        "--save-path", str(output_path),
    ]
    fuse.main()

    print(f"\nFused model saved to {output_path}")
    print(f"\nServe with:")
    print(f"  mlx_lm.server --model {output_path} --port 8080")


if __name__ == "__main__":
    main()
