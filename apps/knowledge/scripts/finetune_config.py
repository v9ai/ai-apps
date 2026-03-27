"""Hyperparameter configs for MLX LoRA fine-tuning.

Produces YAML configs compatible with `mlx_lm.lora -c config.yaml`.
LoRA scale = alpha / rank (mlx_lm uses `scale`, not `alpha`).
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class LoRAConfig:
    """LoRA adapter configuration."""
    rank: int = 16
    alpha: float = 32.0  # scale = alpha / rank
    dropout: float = 0.05

    @property
    def scale(self) -> float:
        return self.alpha / self.rank


@dataclass
class TrainConfig:
    """Training hyperparameters."""
    # Model
    model: str = "mlx-community/Qwen2.5-3B-Instruct-4bit"
    max_seq_length: int = 4096  # 8192 OOMs on 16GB M1

    # Training
    batch_size: int = 2
    grad_accumulation_steps: int = 8  # effective batch = 16
    learning_rate: float = 2e-5
    epochs: int = 3
    num_layers: int = -1  # -1 = all layers

    # LoRA
    lora: LoRAConfig = field(default_factory=LoRAConfig)

    # Paths
    data_dir: str = "data"
    adapter_path: str = "data/adapters"

    # Logging
    steps_per_report: int = 10
    steps_per_eval: int = 50
    save_every: int = 100

    warmup_steps: int = 50

    def to_yaml_dict(self, iters: int) -> dict:
        """Convert to dict matching mlx_lm.lora CONFIG_DEFAULTS keys."""
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
                "arguments": [self.learning_rate, iters, 0.0],
                "warmup": self.warmup_steps,
            },
            "steps_per_report": self.steps_per_report,
            "steps_per_eval": self.steps_per_eval,
            "save_every": self.save_every,
            "adapter_path": self.adapter_path,
            "max_seq_length": self.max_seq_length,
            "grad_checkpoint": True,
            "grad_accumulation_steps": self.grad_accumulation_steps,
            "lora_parameters": {
                "rank": self.lora.rank,
                "dropout": self.lora.dropout,
                "scale": self.lora.scale,
            },
            "mask_prompt": True,
        }


# Pre-built configs for different model sizes
CONFIGS = {
    "qwen-3b": TrainConfig(),
    "qwen-7b": TrainConfig(
        model="mlx-community/Qwen2.5-7B-Instruct-4bit",
        batch_size=2,
        grad_accumulation_steps=8,  # effective batch = 16
        max_seq_length=4096,  # reduced for memory
    ),
}
