"""closingtime/hub.py — HuggingFace Hub integration.

Provides from_pretrained, push_to_hub, and auto model card generation
for all ClosingTime modules. Follows HF patterns:

    model = ClosingTimeModel.from_pretrained("v9ai/closingtime-score-v1")
    result = model.predict("interested in your enterprise plan")
    model.push_to_hub("my-org/my-score-model")
"""

from __future__ import annotations

import json
import os
import tempfile
from typing import Any

import torch

from .config import ClosingTimeConfig, ALL_CONFIGS, HF_ORG


def _resolve_module_class(module_name: str):
    """Import and return the module class for a given name."""
    from .modules import MODULE_CLASSES
    if module_name not in MODULE_CLASSES:
        raise ValueError(f"Unknown module '{module_name}'. Available: {list(MODULE_CLASSES.keys())}")
    return MODULE_CLASSES[module_name]


class ClosingTimeModel:
    """HF-native wrapper providing from_pretrained/push_to_hub for all modules.

    Usage:
        # Load from Hub
        scorer = ClosingTimeModel.from_pretrained("v9ai/closingtime-score-v1")
        result = scorer.predict("interested in pricing for 500 seats")

        # Save locally and push
        scorer.save_pretrained("./my-scorer")
        scorer.push_to_hub("my-org/my-scorer")

        # Load with custom labels
        clf = ClosingTimeModel.from_pretrained(
            "v9ai/closingtime-reply-v1",
            labels=["interested", "not_interested", "question"]
        )
    """

    def __init__(self, module, config: ClosingTimeConfig):
        self._module = module
        self.config = config

    def predict(self, text: str, **kwargs) -> dict[str, Any]:
        """Run inference on text."""
        if hasattr(self._module, "predict"):
            return self._module.predict(text, **kwargs)
        return self._module(text, **kwargs)

    def __call__(self, text: str, **kwargs) -> dict[str, Any]:
        return self.predict(text, **kwargs)

    def encode(self, text: str) -> torch.Tensor:
        """Return the CLS embedding for the input text.

        Useful for downstream tasks, clustering, similarity search.
        """
        from .backbone import SharedEncoder
        encoded = SharedEncoder.encode(text)
        return encoded["encoder_output"].last_hidden_state[:, 0].detach()

    @classmethod
    def from_pretrained(
        cls,
        model_id: str,
        labels: list[str] | None = None,
        device: str | None = None,
        **kwargs,
    ) -> "ClosingTimeModel":
        """Load a ClosingTime module from the HF Hub or local directory.

        Args:
            model_id: HF model ID (e.g. "v9ai/closingtime-score-v1") or local path.
            labels: Optional custom label list (overrides config labels).
            device: Device to load onto (default: auto-detect).
        """
        from .backbone import get_device, set_device

        if device:
            set_device(device)
        target_device = get_device()

        # Load config
        try:
            config = ClosingTimeConfig.from_pretrained(model_id)
        except Exception:
            # Infer from model_id pattern: v9ai/closingtime-{name}-v{version}
            parts = model_id.rstrip("/").split("/")[-1]  # closingtime-score-v1
            segments = parts.replace("closingtime-", "").rsplit("-v", 1)
            module_name = segments[0] if segments else "score"
            config = ALL_CONFIGS.get(module_name, ClosingTimeConfig(module_name=module_name))

        if labels:
            config.labels = labels
            config.id2label = {i: l for i, l in enumerate(labels)}
            config.label2id = {l: i for i, l in enumerate(labels)}

        # Instantiate module
        module_cls = _resolve_module_class(config.module_name)
        module = module_cls(hidden=config.hidden_size, **kwargs)

        # Load weights
        try:
            if os.path.isdir(model_id):
                weight_path = os.path.join(model_id, "head.pt")
            else:
                from huggingface_hub import hf_hub_download
                weight_path = hf_hub_download(model_id, "head.pt")

            state = torch.load(weight_path, map_location=target_device, weights_only=True)
            module.load_state_dict(state)
        except Exception:
            pass  # Random init if no weights available

        module = module.to(target_device).eval()
        return cls(module, config)

    def save_pretrained(self, save_directory: str) -> None:
        """Save model weights and config to a directory."""
        os.makedirs(save_directory, exist_ok=True)

        # Save config
        self.config.save_pretrained(save_directory)

        # Save weights
        torch.save(
            self._module.state_dict(),
            os.path.join(save_directory, "head.pt"),
        )

        # Generate model card
        card = self._generate_model_card()
        with open(os.path.join(save_directory, "README.md"), "w") as f:
            f.write(card)

    def push_to_hub(
        self,
        repo_id: str,
        commit_message: str = "Upload ClosingTime model",
        private: bool = False,
    ) -> str:
        """Push model to HuggingFace Hub.

        Returns:
            URL of the uploaded model.
        """
        from huggingface_hub import HfApi

        with tempfile.TemporaryDirectory() as tmpdir:
            self.save_pretrained(tmpdir)
            api = HfApi()
            api.create_repo(repo_id, exist_ok=True, private=private)
            api.upload_folder(
                folder_path=tmpdir,
                repo_id=repo_id,
                commit_message=commit_message,
            )
        return f"https://huggingface.co/{repo_id}"

    def _generate_model_card(self) -> str:
        """Auto-generate a HF model card."""
        c = self.config
        labels_md = ""
        if c.labels:
            labels_md = "\n".join(f"- `{l}`" for l in c.labels)
            labels_md = f"\n## Labels\n\n{labels_md}\n"

        return f"""---
library_name: closingtime
tags:
- sales
- closingtime
- {c.module_name}
license: mit
---

# ClosingTime — {c.module_name}

{c.architectures[0] if c.architectures else c.module_name} module from the
[ClosingTime](https://github.com/v9ai/ai-apps) sales intelligence library.

## Usage

```python
from closingtime import ClosingTimeModel

model = ClosingTimeModel.from_pretrained("{c.model_id or f'{HF_ORG}/closingtime-{c.module_name}-v{c.version}'}")
result = model.predict("your sales text here")
print(result)
```

Or via the convenience API:

```python
from closingtime import ai
result = ai.{c.module_name}("your sales text here")
```
{labels_md}
## Architecture

- **Backbone**: `{c.backbone}` (shared encoder, {c.hidden_size}-dim)
- **Head**: `{c.architectures[0] if c.architectures else 'unknown'}`
- **Parameters**: head only (backbone loaded separately)

## Training

This model was trained on English sales text data.
See the [ClosingTime documentation](https://github.com/v9ai/ai-apps) for training details.
"""

    def __repr__(self) -> str:
        return (f"ClosingTimeModel(module={self.config.module_name!r}, "
                f"model_id={self.config.model_id!r})")
