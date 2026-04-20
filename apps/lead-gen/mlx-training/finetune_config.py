"""LoRA fine-tuning configs for lead-gen classification tasks.

Produces YAML configs compatible with `mlx_lm.lora -c config.yaml`.
LoRA scale = alpha / rank (mlx_lm uses `scale`, not `alpha`).

Hardware target: M1 MacBook Pro, 16GB RAM, Metal GPU.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class LoRAConfig:
    rank: int = 16
    alpha: float = 32.0
    dropout: float = 0.05

    @property
    def scale(self) -> float:
        return self.alpha / self.rank


@dataclass
class TrainConfig:
    name: str = ""
    model: str = "mlx-community/Qwen2.5-3B-Instruct-4bit"
    max_seq_length: int = 2048  # job descriptions fit in 2K tokens
    # batch_size=4 + grad_accum=4: effective batch stays 16; doubles M1 GPU utilization
    # vs batch=2 without meaningful memory cost (adds ~576 MB activations, well under budget)
    batch_size: int = 4
    grad_accumulation_steps: int = 4
    # grad_checkpoint=False: at 6.5 GB peak we have 5.2 GB headroom to max_recommended_working_set.
    # Keeping it True would recompute all 36 layers on backward — a ~40% throughput penalty for
    # zero memory benefit. Set to True only if peak ever exceeds ~10.5 GB.
    grad_checkpoint: bool = False
    # adamw: identical memory to adam (same moment tensors) but adds weight_decay on LoRA params.
    # Critical for small datasets where LoRA can overfit in <200 iters.
    optimizer: str = "adamw"
    learning_rate: float = 2e-5
    epochs: int = 5
    num_layers: int = -1  # all layers
    lora: LoRAConfig = field(default_factory=LoRAConfig)
    data_dir: str = "mlx-training/data/role-tag"
    adapter_path: str = "mlx-training/models/role-tag"
    steps_per_report: int = 10
    steps_per_eval: int = 50
    val_batches: int = 10   # cap eval at 10 batches (20 examples); -1 = full val set
    save_every: int = 100
    warmup_steps: int = 50

    def to_yaml_dict(self, iters: int) -> dict:
        # min_lr = 10% of peak; keeps cosine tail useful rather than decaying to zero
        min_lr = round(self.learning_rate * 0.1, 8)
        return {
            "model": self.model,
            "train": True,
            "data": self.data_dir,
            "fine_tune_type": "lora",
            "num_layers": self.num_layers,
            "batch_size": self.batch_size,
            "iters": iters,
            "learning_rate": self.learning_rate,
            "lr_schedule": {
                "name": "cosine_decay",
                "arguments": [self.learning_rate, iters, min_lr],
                "warmup": self.warmup_steps,
            },
            "steps_per_report": self.steps_per_report,
            "steps_per_eval": self.steps_per_eval,
            "val_batches": self.val_batches,
            "save_every": self.save_every,
            "adapter_path": self.adapter_path,
            "max_seq_length": self.max_seq_length,
            "grad_checkpoint": self.grad_checkpoint,
            "grad_accumulation_steps": self.grad_accumulation_steps,
            "optimizer": self.optimizer,
            "optimizer_config": {
                self.optimizer: {"weight_decay": 0.01},
            },
            "lora_parameters": {
                "rank": self.lora.rank,
                "dropout": self.lora.dropout,
                "scale": self.lora.scale,
            },
            "mask_prompt": True,
        }


CONFIGS = {
    "role-tag": TrainConfig(
        data_dir="mlx-training/data/role-tag",
        adapter_path="mlx-training/models/role-tag",
    ),
    "remote-worldwide": TrainConfig(
        data_dir="mlx-training/data/remote-worldwide",
        adapter_path="mlx-training/models/remote-worldwide",
    ),
    "post-intent": TrainConfig(
        data_dir="mlx-training/data/post-intent",
        adapter_path="mlx-training/models/post-intent",
        max_seq_length=1024,  # LinkedIn posts are shorter than job descriptions
        epochs=8,  # smaller dataset needs more epochs
        learning_rate=3e-5,  # slightly higher for small dataset
    ),
    "outreach-email": TrainConfig(
        name="outreach-email",
        model="mlx-community/Qwen3-1.7B-4bit",
        data_dir="mlx-training/data/outreach-email",
        adapter_path="mlx-training/models/outreach-email",
        max_seq_length=512,  # emails are short (~400 tokens)
        # Qwen3-1.7B-4bit peak <3 GB: batch=4 is safe, halved grad_accum keeps effective=16
        batch_size=4,
        grad_accumulation_steps=4,
        learning_rate=1e-5,  # gentler for QLoRA on small 1.7B model
        epochs=5,
        lora=LoRAConfig(rank=8, alpha=32.0, dropout=0.1),
        warmup_steps=30,
    ),
    "reply-classification": TrainConfig(
        data_dir="mlx-training/data/reply-classification",
        adapter_path="mlx-training/models/reply-classification",
        max_seq_length=512,  # emails are short; subject + stripped body < 500 tokens
        epochs=5,
        lora=LoRAConfig(rank=8, alpha=16.0, dropout=0.1),
    ),
    "contact-title": TrainConfig(
        model="mlx-community/Qwen2.5-1.5B-Instruct-4bit",
        data_dir="mlx-training/data/contact-title",
        adapter_path="mlx-training/models/contact-title",
        max_seq_length=256,  # job titles are < 20 tokens
        epochs=3,  # large dataset (10k+), fewer epochs to avoid overfitting
        learning_rate=1e-5,  # gentler for small 1.5B model
        lora=LoRAConfig(rank=4, alpha=8.0, dropout=0.1),
        warmup_steps=30,
    ),
    "company-vertical": TrainConfig(
        data_dir="mlx-training/data/company-vertical",
        adapter_path="mlx-training/models/company-vertical",
        max_seq_length=512,  # name + description + website < 300 tokens
        epochs=5,
        lora=LoRAConfig(rank=8, alpha=16.0, dropout=0.1),
    ),
    "opportunity-score": TrainConfig(
        # Structured extraction from opportunity.raw_context (full job description)
        # → {score, tags, seniority, tech_stack, remote_policy, reward_usd, tldr}.
        # Same shape as intent-signal (multi-field JSON), student = Qwen2.5-3B.
        data_dir="mlx-training/data/opportunity-score",
        adapter_path="mlx-training/models/opportunity-score",
        # JDs can be long. 1536 covers ~95% of LinkedIn posts + ATS descriptions;
        # MLX pads to batch-max so unused headroom is free.
        max_seq_length=1536,
        batch_size=4,
        grad_accumulation_steps=4,
        # Same memory profile as intent-signal at this seq length on M1 16GB.
        grad_checkpoint=True,
        learning_rate=5e-5,
        epochs=8,
        # Rank 8 for structured-output tasks (not creative generation).
        lora=LoRAConfig(rank=8, alpha=16.0, dropout=0.1),
        warmup_steps=9,
    ),
    "intent-signal": TrainConfig(
        data_dir="mlx-training/data/intent-signal",
        adapter_path="mlx-training/models/intent-signal",
        # max_seq_length: all 475 examples peak at ~1395-1445 tokens (chars/3.5 + chat template).
        # MLX pads to batch-max, not max_seq_length, so 2048 was never binding — but 1536 acts
        # as a safety ceiling with 91-token headroom. 1280 would truncate ~31% of the dataset.
        max_seq_length=1536,
        # batch_size 2→4: 4.4 GB of headroom (6.5/11 GB used). Larger batches improve Metal
        # ALU utilization on the matmuls that dominate LoRA compute. Halving grad_accum keeps
        # effective batch at 16. Expected: ~8s/iter → ~5s/iter (~40% faster).
        batch_size=4,
        # grad_accum 8→4: half the accumulation steps per optimizer update, less Python/Metal
        # dispatch overhead. Effective batch stays at 4×4 = 16.
        grad_accumulation_steps=4,
        # grad_checkpoint=True: batch_size=4 + no checkpoint OOM'd on M1 16GB (3B model keeps
        # activations for all 36 transformer layers). With checkpoint, only 1 layer's activations
        # are stored at a time — trades ~15% compute for staying within memory budget.
        grad_checkpoint=True,
        # lr: 5e-5 with rank-8 LoRA. Old config had 2e-5 + warmup=50/115 which meant LR
        # never exceeded 5.2e-6 (26% of peak). With warmup=9 and halved rank, 5e-5 gives
        # the adapter a strong enough signal to converge in 184 iters.
        learning_rate=5e-5,
        # epochs: train loss was still dropping fast at iter 90 (0.697), no val overfitting
        # detected. 8 epochs (184 iters) gives ~4x the original budget with room to stop early.
        # Avoid 10 epochs: with only 380 examples each seen 10x, memorization risk increases
        # significantly beyond epoch 8 for a structured-output task with repetitive patterns.
        epochs=8,
        # rank 16→8: halves trainable params (30M→15M). 380 examples with rank-16 had
        # ~79K examples/parameter — underdetermined. Rank-8 is standard for structured
        # extraction tasks (not creative generation). alpha=16 keeps scale=2.0.
        lora=LoRAConfig(rank=8, alpha=16.0, dropout=0.1),
        # warmup: 9 steps = ~5% of 184 total iters, canonical warmup ratio for fine-tuning.
        warmup_steps=9,
        # steps_per_eval=46: eval every 2 epochs → 4 eval passes instead of 8.
        # Each eval costs ~3 min; skipping 4 saves ~12 min. Loss trend still visible at 2-epoch
        # resolution; overfitting on 380 examples emerges gradually, not epoch-to-epoch.
        steps_per_eval=46,
        # val_batches=6: with batch_size=4, 6 batches = 24 examples (51% of the 47-example val
        # set). Batches are sorted by length so the 24 evaluated examples span the full length
        # distribution. Cuts each eval from ~179s to ~46s (74% reduction). Use val_batches=-1
        # for the final end-of-training eval by passing it explicitly via --val-batches -1.
        val_batches=6,
        # save_every=46: checkpoint every 2 epochs (4 checkpoints, ~100MB total).
        save_every=46,
    ),
}

# ---------------------------------------------------------------------------
# Hyperparameter sweep: 3×3 grid over rank × learning rate for outreach-email
# Short 2-epoch runs to conserve M1 compute.
# ---------------------------------------------------------------------------

SWEEP_CONFIGS: dict[str, TrainConfig] = {}
for _rank in [4, 8, 16]:
    for _lr in [5e-6, 1e-5, 2e-5]:
        _key = f"outreach-email-sweep/r{_rank}_lr{_lr:.0e}"
        SWEEP_CONFIGS[_key] = TrainConfig(
            name=_key,
            model="mlx-community/Qwen3-1.7B-4bit",
            data_dir="mlx-training/data/outreach-email",
            adapter_path=f"mlx-training/models/{_key}",
            max_seq_length=512,
            # sweep runs are short; use same batch/accum as outreach-email for comparable results
            batch_size=4,
            grad_accumulation_steps=4,
            learning_rate=_lr,
            epochs=2,  # short sweep
            lora=LoRAConfig(rank=_rank, alpha=float(_rank * 4), dropout=0.1),
            warmup_steps=10,
        )


def get_best_sweep_config() -> tuple[str, TrainConfig] | None:
    """Read val loss from sweep adapter dirs, return (key, config) with lowest val loss."""
    best_key: str | None = None
    best_loss: float = float("inf")
    best_config: TrainConfig | None = None

    for key, config in SWEEP_CONFIGS.items():
        log_path = Path(config.adapter_path) / "train_log.jsonl"
        if not log_path.exists():
            continue
        # Parse last eval entry with val_loss from the JSONL log
        last_val_loss: float | None = None
        for line in log_path.read_text().splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue
            if "val_loss" in entry:
                last_val_loss = float(entry["val_loss"])
        if last_val_loss is not None and last_val_loss < best_loss:
            best_loss = last_val_loss
            best_key = key
            best_config = config

    if best_key is None or best_config is None:
        return None
    return (best_key, best_config)


def run_sweep(finetune_py: str = "mlx-training/finetune.py") -> None:
    """Print the commands needed to run all sweep configs."""
    print("# Run these commands to execute the hyperparameter sweep:")
    for key in SWEEP_CONFIGS:
        print(f"python3 {finetune_py} --task-override {key}")
    print("\nAfter all sweeps complete, run:")
    print(
        'python3 -c "from mlx_training.finetune_config import get_best_sweep_config;'
        ' print(get_best_sweep_config())"'
    )
