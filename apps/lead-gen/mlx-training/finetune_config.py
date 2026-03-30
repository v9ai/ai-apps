"""LoRA fine-tuning configs for lead-gen classification tasks.

Produces YAML configs compatible with `mlx_lm.lora -c config.yaml`.
LoRA scale = alpha / rank (mlx_lm uses `scale`, not `alpha`).

Hardware target: M1 MacBook Pro, 16GB RAM, Metal GPU.
"""

from __future__ import annotations

from dataclasses import dataclass, field


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
    model: str = "mlx-community/Qwen2.5-3B-Instruct-4bit"
    max_seq_length: int = 2048  # job descriptions fit in 2K tokens
    batch_size: int = 2
    grad_accumulation_steps: int = 8  # effective batch = 16
    learning_rate: float = 2e-5
    epochs: int = 5
    num_layers: int = -1  # all layers
    lora: LoRAConfig = field(default_factory=LoRAConfig)
    data_dir: str = "mlx-training/data/role-tag"
    adapter_path: str = "mlx-training/models/role-tag"
    steps_per_report: int = 10
    steps_per_eval: int = 50
    save_every: int = 100
    warmup_steps: int = 50

    def to_yaml_dict(self, iters: int) -> dict:
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
}
