"""mlx-training/hub.py — HuggingFace Hub integration for MLX LoRA adapters.

Upload fine-tuned LoRA adapters to HF Hub and resolve HF repo IDs to local
paths for mlx_lm.load() (which only accepts local filesystem paths).

Usage:
    # Upload adapter to HF Hub
    python3 mlx-training/hub.py upload \
        --adapter-path mlx-training/models/outreach-email \
        --repo v9ai/outreach-email-qwen3-1.7b-lora

    # Dry run (stage locally, print what would upload)
    python3 mlx-training/hub.py upload \
        --adapter-path mlx-training/models/outreach-email \
        --repo v9ai/outreach-email-qwen3-1.7b-lora \
        --dry-run

    # Resolve an HF repo ID to a local cached path
    python3 mlx-training/hub.py resolve v9ai/outreach-email-qwen3-1.7b-lora
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
from pathlib import Path


DEFAULT_ORG = "v9ai"


def resolve_adapter(adapter_path_or_repo: str) -> str | None:
    """Resolve an adapter path or HF repo ID to a local filesystem path.

    - If the input is a local directory that exists, returns it as-is.
    - If it looks like an HF repo ID (contains '/' and is not a local path),
      downloads it via huggingface_hub.snapshot_download to the HF cache.
    - Returns None if the adapter cannot be resolved.
    """
    local = Path(adapter_path_or_repo)
    if local.is_dir():
        return str(local)

    # Check if it looks like an HF repo ID (org/name pattern)
    if "/" in adapter_path_or_repo and not local.exists():
        try:
            from huggingface_hub import snapshot_download
            cached_path = snapshot_download(adapter_path_or_repo)
            return cached_path
        except Exception as e:
            print(f"Warning: could not download adapter from HF: {e}", file=sys.stderr)
            return None

    return None


def _read_adapter_config(adapter_path: str) -> dict:
    """Read adapter_config.json from an adapter directory."""
    config_path = Path(adapter_path) / "adapter_config.json"
    if not config_path.exists():
        return {}
    with open(config_path) as f:
        return json.load(f)


def _clean_adapter_config(config: dict) -> dict:
    """Remove local-only fields from adapter config before upload."""
    cleaned = dict(config)
    # Strip temp file path that points to /var/folders/.../tmp*.yaml
    cleaned.pop("config", None)
    return cleaned


def _generate_model_card(adapter_path: str, repo_id: str, config: dict) -> str:
    """Generate a HuggingFace model card for the LoRA adapter."""
    base_model = config.get("model", "unknown")
    lora_params = config.get("lora_parameters", {})
    rank = lora_params.get("rank", "?")
    scale = lora_params.get("scale", "?")
    dropout = lora_params.get("dropout", "?")
    max_seq = config.get("max_seq_length", "?")
    iters = config.get("iters", "?")

    # Infer task from repo_id or adapter_path
    task = Path(adapter_path).name
    task_display = task.replace("-", " ").title()

    lr_schedule = config.get("lr_schedule", {})
    lr = lr_schedule.get("arguments", [None])[0] if lr_schedule.get("arguments") else config.get("learning_rate", "?")

    return f"""---
library_name: mlx
pipeline_tag: text-generation
language:
- en
base_model: {base_model}
tags:
- mlx
- lora
- sales
- email-generation
- b2b
- outreach
license: mit
---

# {task_display} — MLX LoRA Adapter

Fine-tuned LoRA adapter for B2B outreach email generation, trained on Apple Silicon
via [MLX](https://github.com/ml-explore/mlx).

## Usage

```python
import mlx_lm

# Load base model with adapter
model, tokenizer = mlx_lm.load(
    "{base_model}",
    adapter_path="{repo_id}",  # downloads from HF Hub automatically
)

# Or download first, then load
from huggingface_hub import snapshot_download
adapter_path = snapshot_download("{repo_id}")
model, tokenizer = mlx_lm.load("{base_model}", adapter_path=adapter_path)

# Generate
messages = [
    {{"role": "system", "content": "You write B2B outreach emails..."}},
    {{"role": "user", "content": "Write an initial outreach email..."}},
]
prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
output = mlx_lm.generate(model, tokenizer, prompt=prompt, max_tokens=512)
```

## Serving

```bash
# Serve via mlx_lm.server (OpenAI-compatible API)
python3 -m mlx_lm.server \\
    --model {base_model} \\
    --adapter-path {repo_id} \\
    --port 8080
```

## Training Details

| Parameter | Value |
|---|---|
| Base model | `{base_model}` |
| Fine-tune type | LoRA |
| Rank | {rank} |
| Scale | {scale} |
| Dropout | {dropout} |
| Max sequence length | {max_seq} |
| Training iterations | {iters} |
| Learning rate | {lr} |
| Hardware | Apple M1 MacBook Pro, 16GB |

## Task

Generates personalized B2B outreach emails (initial + 3 follow-up stages) as JSON:

```json
{{"subject": "...", "body": "..."}}
```

Trained on synthetic examples generated via DeepSeek teacher model, validated against
quality rubrics (JSON validity, word count compliance, personalization, CTA presence).

## About

Part of the [lead-gen](https://github.com/v9ai/ai-apps/tree/main/apps/lead-gen)
B2B sales intelligence platform. See also the SalesCue ML modules for lead scoring,
intent detection, sentiment analysis, and more.
"""


def upload_adapter(
    adapter_path: str,
    repo_id: str,
    dry_run: bool = False,
) -> str | None:
    """Upload a LoRA adapter to HuggingFace Hub.

    Stages only the final adapter files (excludes checkpoint files) in a temp
    directory, generates a model card, and uploads via HfApi.

    Returns the HF URL on success, None on dry run.
    """
    adapter_dir = Path(adapter_path)
    if not adapter_dir.is_dir():
        print(f"ERROR: adapter directory not found: {adapter_path}", file=sys.stderr)
        return None

    final_adapter = adapter_dir / "adapters.safetensors"
    config_file = adapter_dir / "adapter_config.json"

    if not final_adapter.exists():
        print(f"ERROR: no final adapter found at {final_adapter}", file=sys.stderr)
        return None

    if not config_file.exists():
        print(f"ERROR: no adapter_config.json found at {config_file}", file=sys.stderr)
        return None

    # Read and clean config
    config = _read_adapter_config(adapter_path)
    cleaned_config = _clean_adapter_config(config)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Copy final adapter weights
        shutil.copy2(final_adapter, Path(tmpdir) / "adapters.safetensors")

        # Write cleaned config
        with open(Path(tmpdir) / "adapter_config.json", "w") as f:
            json.dump(cleaned_config, f, indent=2)

        # Generate model card
        card = _generate_model_card(adapter_path, repo_id, cleaned_config)
        with open(Path(tmpdir) / "README.md", "w") as f:
            f.write(card)

        # List staged files
        staged = list(Path(tmpdir).iterdir())
        total_mb = sum(f.stat().st_size for f in staged) / (1024 * 1024)
        print(f"Staged {len(staged)} files ({total_mb:.1f} MB):")
        for f in sorted(staged):
            size_mb = f.stat().st_size / (1024 * 1024)
            print(f"  {f.name} ({size_mb:.1f} MB)")

        # Count excluded checkpoints
        checkpoints = list(adapter_dir.glob("[0-9]*_adapters.safetensors"))
        if checkpoints:
            excluded_mb = sum(f.stat().st_size for f in checkpoints) / (1024 * 1024)
            print(f"Excluded {len(checkpoints)} checkpoint(s) ({excluded_mb:.1f} MB)")

        if dry_run:
            print(f"\nDRY RUN: would upload to {repo_id}")
            print(f"  Files staged in {tmpdir}")
            return None

        # Upload to HF Hub
        from huggingface_hub import HfApi
        api = HfApi()
        api.create_repo(repo_id, exist_ok=True, repo_type="model")
        api.upload_folder(
            folder_path=tmpdir,
            repo_id=repo_id,
            commit_message=f"Upload {Path(adapter_path).name} LoRA adapter",
        )

    url = f"https://huggingface.co/{repo_id}"
    print(f"\nUploaded: {url}")
    return url


def main():
    parser = argparse.ArgumentParser(description="HF Hub integration for MLX LoRA adapters")
    sub = parser.add_subparsers(dest="command")

    # upload subcommand
    up = sub.add_parser("upload", help="Upload adapter to HF Hub")
    up.add_argument("--adapter-path", required=True, help="Path to local adapter directory")
    up.add_argument("--repo", required=True, help="HF repo ID (e.g. v9ai/outreach-email-qwen3-1.7b-lora)")
    up.add_argument("--dry-run", action="store_true", help="Stage locally, don't push")

    # resolve subcommand
    res = sub.add_parser("resolve", help="Resolve HF repo ID to local path")
    res.add_argument("repo_id", help="HF repo ID or local path")

    args = parser.parse_args()

    if args.command == "upload":
        upload_adapter(args.adapter_path, args.repo, dry_run=args.dry_run)
    elif args.command == "resolve":
        path = resolve_adapter(args.repo_id)
        if path:
            print(path)
        else:
            print(f"Could not resolve: {args.repo_id}", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
