"""Convert an MLX-trained LoRA adapter (`adapters.safetensors` produced by
`mlx_lm.lora`) into the HuggingFace PEFT format that Cloudflare Workers AI
`wrangler ai finetune create` accepts.

MLX stores LoRA weights with keys like:
    model.layers.<N>.self_attn.q_proj.lora_a    (shape [r, in_features])
    model.layers.<N>.self_attn.q_proj.lora_b    (shape [out_features, r])

HF PEFT expects:
    base_model.model.model.layers.<N>.self_attn.q_proj.lora_A.default.weight
    base_model.model.model.layers.<N>.self_attn.q_proj.lora_B.default.weight

Usage:
    python mlx_adapter_to_peft.py \\
        --mlx-adapter ../models/outreach-email-mistral/adapters.safetensors \\
        --out ./out/adapter/final \\
        --base-model mistralai/Mistral-7B-Instruct-v0.2 \\
        --rank 8 --alpha 32 --dropout 0.1 \\
        --target-modules q_proj v_proj
Then run `postprocess_adapter.py` on the output dir.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


MLX_LORA_A_SUFFIXES = (".lora_a", ".lora_a.weight")
MLX_LORA_B_SUFFIXES = (".lora_b", ".lora_b.weight")


def mlx_key_to_peft(key: str) -> tuple[str, str] | None:
    """Return (peft_key, matrix_type) where matrix_type is 'A' or 'B'.
    Returns None for keys that aren't LoRA adapter weights.
    """
    for suf in MLX_LORA_A_SUFFIXES:
        if key.endswith(suf):
            module = key[: -len(suf)]
            return f"base_model.model.{module}.lora_A.default.weight", "A"
    for suf in MLX_LORA_B_SUFFIXES:
        if key.endswith(suf):
            module = key[: -len(suf)]
            return f"base_model.model.{module}.lora_B.default.weight", "B"
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mlx-adapter", type=Path, required=True, help="MLX adapters.safetensors path")
    parser.add_argument("--out", type=Path, required=True, help="Output dir for PEFT adapter")
    parser.add_argument("--base-model", default="mistralai/Mistral-7B-Instruct-v0.2")
    parser.add_argument("--rank", type=int, default=8)
    parser.add_argument("--alpha", type=int, default=32)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--target-modules", nargs="+", default=["q_proj", "v_proj"])
    args = parser.parse_args()

    try:
        from safetensors import safe_open
        from safetensors.torch import save_file
    except ImportError as e:
        print(f"ERROR: missing dependency — `pip install safetensors torch`: {e}", file=sys.stderr)
        sys.exit(1)

    if not args.mlx_adapter.exists():
        print(f"ERROR: {args.mlx_adapter} does not exist", file=sys.stderr)
        sys.exit(1)

    args.out.mkdir(parents=True, exist_ok=True)

    peft_tensors: dict[str, "torch.Tensor"] = {}
    seen_suffixes: set[str] = set()
    passed_through: list[str] = []
    skipped: list[str] = []

    with safe_open(str(args.mlx_adapter), framework="pt") as f:  # type: ignore[arg-type]
        for key in f.keys():
            tensor = f.get_tensor(key)
            mapped = mlx_key_to_peft(key)
            if mapped is None:
                skipped.append(key)
                continue
            peft_key, _mat = mapped
            peft_tensors[peft_key] = tensor
            passed_through.append(key)
            # Track suffix form so we can emit a diagnostic if the file is empty.
            for s in MLX_LORA_A_SUFFIXES + MLX_LORA_B_SUFFIXES:
                if key.endswith(s):
                    seen_suffixes.add(s)
                    break

    if not peft_tensors:
        print(
            "ERROR: no LoRA tensors recognized. MLX key format may have changed — "
            f"first 5 keys: {passed_through[:5] or skipped[:5]}",
            file=sys.stderr,
        )
        sys.exit(1)

    # Sanity: every A should have a matching B.
    a_keys = {k for k in peft_tensors if k.endswith(".lora_A.default.weight")}
    b_keys = {k for k in peft_tensors if k.endswith(".lora_B.default.weight")}
    unmatched_a = {k.replace(".lora_A.default.weight", "") for k in a_keys} - {
        k.replace(".lora_B.default.weight", "") for k in b_keys
    }
    if unmatched_a:
        print(f"WARNING: {len(unmatched_a)} A matrices have no matching B: {list(unmatched_a)[:3]}...", file=sys.stderr)

    out_safetensors = args.out / "adapter_model.safetensors"
    save_file(peft_tensors, str(out_safetensors))

    # Infer target_modules from the keys actually present, as a sanity check.
    inferred_targets: set[str] = set()
    module_re = re.compile(r"\.([a-z_]+_proj)\.lora_[AB]\.default\.weight$")
    for k in peft_tensors:
        m = module_re.search(k)
        if m:
            inferred_targets.add(m.group(1))

    if inferred_targets and set(args.target_modules) != inferred_targets:
        print(
            f"WARNING: CLI --target-modules={args.target_modules} doesn't match inferred "
            f"{sorted(inferred_targets)} — using inferred.",
            file=sys.stderr,
        )
        target_modules = sorted(inferred_targets)
    else:
        target_modules = sorted(args.target_modules)

    adapter_config = {
        "alpha_pattern": {},
        "auto_mapping": None,
        "base_model_name_or_path": args.base_model,
        "bias": "none",
        "fan_in_fan_out": False,
        "inference_mode": True,
        "init_lora_weights": True,
        "layers_pattern": None,
        "layers_to_transform": None,
        "lora_alpha": args.alpha,
        "lora_dropout": args.dropout,
        "modules_to_save": None,
        "peft_type": "LORA",
        "r": args.rank,
        "rank_pattern": {},
        "revision": None,
        "target_modules": target_modules,
        "task_type": "CAUSAL_LM",
        # model_type is injected by postprocess_adapter.py (Cloudflare requirement).
    }
    (args.out / "adapter_config.json").write_text(json.dumps(adapter_config, indent=2))

    size_mb = out_safetensors.stat().st_size / 1e6
    print(f"wrote {len(peft_tensors)} tensors to {out_safetensors} ({size_mb:.1f} MB)")
    print(f"wrote adapter_config.json to {args.out}")
    print(f"target_modules: {target_modules}")
    print(f"next: python postprocess_adapter.py {args.out} --model-type mistral")


if __name__ == "__main__":
    main()
