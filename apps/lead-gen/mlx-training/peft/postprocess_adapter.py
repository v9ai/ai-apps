"""Post-process a PEFT-trained LoRA adapter for Cloudflare Workers AI upload.

Cloudflare's `wrangler ai finetune create` expects exactly two files in the
upload folder:
  - adapter_model.safetensors
  - adapter_config.json

and rejects the adapter unless `adapter_config.json` contains a top-level
`model_type` key set to one of `mistral`, `gemma`, or `llama`. HuggingFace PEFT
does not emit this field, so we inject it here.

Also validates:
  - rank (r) <= 32
  - adapter_model.safetensors < 300 MB
  - filenames exact (PEFT occasionally emits `adapter.safetensors` — normalize)

Usage:
    python postprocess_adapter.py ./out/adapter/final --model-type mistral
Upload folder is prepared in-place; no copying. Exit code is 0 on success.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

MAX_SIZE_BYTES = 300 * 1024 * 1024
MAX_RANK = 32
ALLOWED_MODEL_TYPES = {"mistral", "gemma", "llama"}
REQUIRED_FILES = {"adapter_model.safetensors", "adapter_config.json"}


def fail(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("adapter_dir", type=Path)
    parser.add_argument("--model-type", default="mistral", choices=sorted(ALLOWED_MODEL_TYPES))
    args = parser.parse_args()

    d = args.adapter_dir
    if not d.is_dir():
        fail(f"{d} is not a directory")

    # Normalize safetensors filename (PEFT variants occasionally ship it as
    # `adapter.safetensors`).
    alt = d / "adapter.safetensors"
    target = d / "adapter_model.safetensors"
    if alt.exists() and not target.exists():
        shutil.move(str(alt), str(target))
        print(f"renamed {alt.name} -> {target.name}")

    cfg_path = d / "adapter_config.json"
    if not cfg_path.exists():
        fail(f"missing adapter_config.json in {d}")

    cfg = json.loads(cfg_path.read_text())
    r = cfg.get("r")
    if not isinstance(r, int) or r > MAX_RANK:
        fail(f"rank must be int <= {MAX_RANK}; got {r!r}")

    cfg["model_type"] = args.model_type
    cfg_path.write_text(json.dumps(cfg, indent=2))
    print(f"injected model_type={args.model_type!r} into {cfg_path.name}")

    size = target.stat().st_size
    if size > MAX_SIZE_BYTES:
        fail(f"adapter_model.safetensors is {size / 1e6:.1f} MB (> 300 MB)")

    # Delete any extras — CF's upload endpoint accepts both required files
    # but anything else in the dir can cause confusion. Keep tokenizer files
    # in a sibling dir if they exist; CF doesn't consume them.
    upload_dir = d / "cf-upload"
    upload_dir.mkdir(exist_ok=True)
    for name in REQUIRED_FILES:
        src = d / name
        if not src.exists():
            fail(f"missing required file {name}")
        dst = upload_dir / name
        if dst.exists():
            dst.unlink()
        shutil.copy(str(src), str(dst))

    print(f"CF-ready upload folder: {upload_dir}")
    print(f"  adapter_model.safetensors: {size / 1e6:.1f} MB, rank={r}")
    print(f"next: npx wrangler ai finetune create @cf/mistral/mistral-7b-instruct-v0.2-lora email-lora-v1 {upload_dir}")


if __name__ == "__main__":
    main()
