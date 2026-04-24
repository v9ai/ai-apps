"""Train a LoRA adapter on Mistral-7B-Instruct-v0.2 for outreach email generation.

Hyperparameters mirror the MLX outreach-email config in
`mlx-training/finetune_config.py:109-122` so the two paths produce comparable
adapters (Qwen3-1.7B for local M1 dev, Mistral-7B for Cloudflare Workers AI).

CF constraints this script must satisfy:
  - base model loaded non-quantized (CF rejects quantized LoRAs)
  - output filenames exactly `adapter_model.safetensors` + `adapter_config.json`
  - rank <= 32 (we use 8), file size < 300 MB (rank-8 Mistral LoRA ≈ 17 MB)
  - `model_type` injected into adapter_config.json post-training by postprocess_adapter.py

Run locally (A100/H100/RTX 4090) after `convert_data.py`:
    python train_mistral_email_lora.py --data-dir ./out --out ./out/adapter
Or via Modal (preferred — see train_modal.py).
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-model", default="mistralai/Mistral-7B-Instruct-v0.2")
    parser.add_argument("--data-dir", type=Path, default=Path(__file__).parent / "out")
    parser.add_argument("--out", type=Path, default=Path(__file__).parent / "out" / "adapter")
    parser.add_argument("--epochs", type=float, default=5.0)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--grad-accum", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-5)
    parser.add_argument("--warmup-steps", type=int, default=30)
    parser.add_argument("--max-seq-length", type=int, default=512)
    parser.add_argument("--rank", type=int, default=8)
    parser.add_argument("--alpha", type=int, default=32)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    import torch
    from datasets import load_dataset
    from peft import LoraConfig, TaskType, get_peft_model
    from transformers import AutoModelForCausalLM, AutoTokenizer
    from trl import SFTConfig, SFTTrainer

    train_path = args.data_dir / "peft-train.jsonl"
    valid_path = args.data_dir / "peft-valid.jsonl"
    assert train_path.exists(), f"missing {train_path} — run convert_data.py first"
    assert valid_path.exists(), f"missing {valid_path} — run convert_data.py first"

    tokenizer = AutoTokenizer.from_pretrained(args.base_model)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=torch.bfloat16,
        device_map="auto",
    )
    model.config.use_cache = False
    model.gradient_checkpointing_enable()

    lora_config = LoraConfig(
        r=args.rank,
        lora_alpha=args.alpha,
        lora_dropout=args.dropout,
        bias="none",
        task_type=TaskType.CAUSAL_LM,
        target_modules=["q_proj", "v_proj"],
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    dataset = load_dataset(
        "json",
        data_files={"train": str(train_path), "validation": str(valid_path)},
    )

    args.out.mkdir(parents=True, exist_ok=True)
    sft_config = SFTConfig(
        output_dir=str(args.out),
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=args.grad_accum,
        learning_rate=args.lr,
        lr_scheduler_type="cosine",
        warmup_steps=args.warmup_steps,
        weight_decay=0.01,
        optim="adamw_torch",
        bf16=True,
        logging_steps=10,
        eval_strategy="epoch",
        save_strategy="epoch",
        save_total_limit=2,
        seed=args.seed,
        max_seq_length=args.max_seq_length,
        packing=False,
        dataset_text_field="text",
        report_to=[],
    )

    trainer = SFTTrainer(
        model=model,
        args=sft_config,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        processing_class=tokenizer,
    )
    trainer.train()

    # PEFT's save_pretrained emits adapter_model.safetensors + adapter_config.json
    # into args.out. Other checkpoint-dir artifacts (optimizer state etc.) stay
    # outside this dir and can be discarded.
    adapter_out = args.out / "final"
    adapter_out.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(str(adapter_out))
    tokenizer.save_pretrained(str(adapter_out))

    metrics_path = adapter_out / "train_metrics.json"
    metrics_path.write_text(json.dumps(trainer.state.log_history, indent=2))
    print(f"adapter saved to {adapter_out}")


if __name__ == "__main__":
    main()
