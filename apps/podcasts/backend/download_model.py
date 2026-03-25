#!/usr/bin/env python3
"""Download an MLX model for local inference.

Usage:
    python download_model.py                                          # default 7B
    python download_model.py --model mlx-community/Qwen2.5-3B-Instruct-4bit
"""

import argparse

from mlx_client import DEFAULT_MODEL


def main() -> None:
    parser = argparse.ArgumentParser(description="Download MLX model")
    parser.add_argument("--model", default=DEFAULT_MODEL, help=f"HuggingFace model ID (default: {DEFAULT_MODEL})")
    args = parser.parse_args()

    from huggingface_hub import snapshot_download
    from rich.console import Console

    console = Console()
    console.print(f"[bold cyan]Downloading:[/] {args.model}")
    path = snapshot_download(args.model)
    console.print(f"[green]Saved to:[/] {path}")


if __name__ == "__main__":
    main()
