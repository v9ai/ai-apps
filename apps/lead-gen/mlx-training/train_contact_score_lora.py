"""Train a Qwen2.5-1.5B-Instruct LoRA on the contact-score dataset.

Student trainer that consumes the JSONL produced by ``label_contact_score.py``
and emits a LoRA adapter. Merge + quantize to GGUF happens separately via
``merge_and_quantize_contact_score.py``; the GGUF is what the HF Space serves.

Why Qwen2.5-1.5B: free HF Space CPU (2 vCPU, 16 GB) cannot serve anything
larger with acceptable latency. Quantized Q4_K_M 1.5B runs at ~5-10 tok/s.
Apache-2.0 licensed and strong at strict-JSON output.

Why PEFT/transformers and not MLX: we need a HF-Hub-compatible adapter
artifact (``adapter_model.safetensors`` + ``adapter_config.json``) so we can
merge-and-unload with the standard base model on any CUDA host. MLX adapter
format doesn't round-trip through ``PeftModel.from_pretrained``.

Runs on **Colab free T4** (3-4 h for 5k examples). Not on M1.

Dataset layout expected:
    mlx-training/datasets/contact_score/{train,val,test}.jsonl
    Each line: {"messages": [{role, content}, …]}  (OpenAI chat format)

Output:
    mlx-training/models/contact-score-qwen-1.5b/
      ├── adapter_config.json
      ├── adapter_model.safetensors
      └── training_args.json

Next step after training:
    python3 mlx-training/merge_and_quantize_contact_score.py

Usage (Colab T4 or any CUDA host):
    pip install "transformers>=4.46" peft trl accelerate datasets
    huggingface-cli login
    python3 mlx-training/train_contact_score_lora.py
    python3 mlx-training/train_contact_score_lora.py --epochs 5 --lr 1e-4
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

# Heavy deps are imported lazily inside main() so the file can be syntax-checked
# and imported on the M1 dev host (where torch/transformers aren't installed).


DEFAULT_BASE = "Qwen/Qwen2.5-1.5B-Instruct"
DEFAULT_DATA = Path("mlx-training/datasets/contact_score")
DEFAULT_OUT = Path("mlx-training/models/contact-score-qwen-1.5b")

# Qwen2 decoder blocks expose these exact projection names; targeting all seven
# covers attention (q/k/v/o) and the MLP (gate/up/down) which matters more for
# small models where attention-only LoRA underfits.
QWEN_TARGET_MODULES = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]


def _require_gpu() -> None:
    import torch
    if not torch.cuda.is_available():
        raise SystemExit(
            "ERROR: CUDA not available. Run on Colab (free T4 is enough for "
            "Qwen2.5-1.5B) or any CUDA host. This trainer does not run on M1 "
            "— use mlx_lm.lora for MLX adapters instead."
        )


def _pick_precision() -> tuple[bool, bool]:
    """Return (use_bf16, use_fp16). bf16 needs Ampere+ (T4 is Turing → fp16)."""
    import torch
    major, _ = torch.cuda.get_device_capability()
    if major >= 8:
        return True, False  # A100/L4/H100: bf16
    return False, True  # T4: fp16


def _load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise SystemExit(f"ERROR: dataset file missing: {path}")
    out = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if line:
            out.append(json.loads(line))
    return out


def _build_dataset(tokenizer, rows: list[dict[str, Any]], max_len: int):
    """Render each row's messages through the tokenizer's chat template.

    The LoRA learns to emit the assistant JSON conditioned on system + user.
    We train on the full sequence but label-mask the prompt so loss only
    fires on the assistant completion.
    """
    from datasets import Dataset

    def _render(example: dict[str, Any]) -> dict[str, Any]:
        msgs = example["messages"]
        # Full sequence (system + user + assistant): used as input_ids + labels source
        full = tokenizer.apply_chat_template(
            msgs, tokenize=True, add_generation_prompt=False,
            return_tensors="pt", truncation=True, max_length=max_len,
        )[0]
        # Prompt-only (system + user + generation prefix): used to compute how
        # many leading tokens to mask out of the loss.
        prompt = tokenizer.apply_chat_template(
            msgs[:-1], tokenize=True, add_generation_prompt=True,
            return_tensors="pt", truncation=True, max_length=max_len,
        )[0]
        prompt_len = prompt.shape[0]
        labels = full.clone()
        labels[:prompt_len] = -100  # ignore prompt in loss
        return {
            "input_ids": full.tolist(),
            "attention_mask": [1] * full.shape[0],
            "labels": labels.tolist(),
        }

    ds = Dataset.from_list(rows)
    return ds.map(_render, remove_columns=ds.column_names)


def _data_collator(tokenizer):
    """Right-pad input_ids + labels; mask padding in labels with -100."""
    import torch

    def collate(batch: list[dict[str, Any]]):
        max_len = max(len(b["input_ids"]) for b in batch)
        pad_id = tokenizer.pad_token_id or tokenizer.eos_token_id
        input_ids, attn, labels = [], [], []
        for b in batch:
            n = len(b["input_ids"])
            pad = max_len - n
            input_ids.append(b["input_ids"] + [pad_id] * pad)
            attn.append(b["attention_mask"] + [0] * pad)
            labels.append(b["labels"] + [-100] * pad)
        return {
            "input_ids": torch.tensor(input_ids, dtype=torch.long),
            "attention_mask": torch.tensor(attn, dtype=torch.long),
            "labels": torch.tensor(labels, dtype=torch.long),
        }

    return collate


def main() -> None:
    parser = argparse.ArgumentParser(description="Train Qwen2.5-1.5B-Instruct LoRA for contact scoring")
    parser.add_argument("--base-model", default=DEFAULT_BASE)
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--grad-accum", type=int, default=2)
    parser.add_argument("--lr", type=float, default=2e-4)
    parser.add_argument("--max-len", type=int, default=768)
    parser.add_argument("--lora-r", type=int, default=16)
    parser.add_argument("--lora-alpha", type=int, default=32)
    parser.add_argument("--lora-dropout", type=float, default=0.05)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    _require_gpu()

    import torch
    from transformers import (
        AutoModelForCausalLM,
        AutoTokenizer,
        TrainingArguments,
        Trainer,
        set_seed,
    )
    from peft import LoraConfig, get_peft_model

    set_seed(args.seed)
    args.out_dir.mkdir(parents=True, exist_ok=True)

    use_bf16, use_fp16 = _pick_precision()
    dtype = torch.bfloat16 if use_bf16 else torch.float16
    print(f"Precision: {'bf16' if use_bf16 else 'fp16'} (compute capability {torch.cuda.get_device_capability()})")

    tokenizer = AutoTokenizer.from_pretrained(args.base_model, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(f"Loading base model: {args.base_model}…")
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=dtype,
        device_map="auto",
    )
    model.gradient_checkpointing_enable()
    model.config.use_cache = False

    lora_cfg = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        lora_dropout=args.lora_dropout,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=QWEN_TARGET_MODULES,
    )
    model = get_peft_model(model, lora_cfg)
    model.print_trainable_parameters()

    train_raw = _load_jsonl(args.data_dir / "train.jsonl")
    val_raw = _load_jsonl(args.data_dir / "val.jsonl")
    print(f"Train: {len(train_raw)}  Val: {len(val_raw)}")

    train_ds = _build_dataset(tokenizer, train_raw, args.max_len)
    val_ds = _build_dataset(tokenizer, val_raw, args.max_len)

    training_args = TrainingArguments(
        output_dir=str(args.out_dir / "_trainer"),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        bf16=use_bf16,
        fp16=use_fp16,
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        report_to=[],
        seed=args.seed,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        data_collator=_data_collator(tokenizer),
        tokenizer=tokenizer,
    )

    trainer.train()

    # Save the LoRA adapter (what merge_and_quantize_contact_score.py consumes).
    model.save_pretrained(args.out_dir)
    tokenizer.save_pretrained(args.out_dir)
    (args.out_dir / "training_args.json").write_text(json.dumps({
        "base_model": args.base_model,
        "epochs": args.epochs,
        "batch_size": args.batch_size,
        "grad_accum": args.grad_accum,
        "lr": args.lr,
        "max_len": args.max_len,
        "lora_r": args.lora_r,
        "lora_alpha": args.lora_alpha,
        "lora_dropout": args.lora_dropout,
        "seed": args.seed,
        "precision": "bf16" if use_bf16 else "fp16",
        "final_eval": trainer.state.log_history[-1] if trainer.state.log_history else None,
    }, indent=2))
    print(f"Done. Adapter saved to {args.out_dir}")
    print("Next: python3 mlx-training/merge_and_quantize_contact_score.py")


if __name__ == "__main__":
    main()
