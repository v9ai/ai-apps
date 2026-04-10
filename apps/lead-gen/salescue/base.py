"""salescue/base.py — Abstract base class for all modules.

Every SalesCue module inherits from BaseModule and implements
the `process` method. Provides consistent interface for the pipe
operator, display rendering, and module registration.
"""

from __future__ import annotations

from abc import abstractmethod
from typing import Any

import torch.nn as nn

from .backbone import SharedEncoder
from .display import CardRenderer


class BaseModule(nn.Module):
    """Abstract base class for SalesCue modules.

    Subclasses must set `name` and `description` class attributes
    and implement the `process` method.
    """

    name: str = "unnamed"
    description: str = ""

    @abstractmethod
    def process(self, encoded: dict, text: str, **kwargs: Any) -> dict[str, Any]:
        """Run the module on pre-encoded input. Returns a result dict."""
        ...

    def process_batch(
        self,
        batch_encoded: dict,
        texts: list[str],
        **kwargs: Any,
    ) -> list[dict[str, Any]]:
        """Run the module on a batch of pre-encoded inputs.

        Default implementation slices the batch-encoded tensor along dim 0
        and calls process() per item. Subclasses can override this with
        true vectorized batch processing for better throughput.

        Args:
            batch_encoded: Dict from SharedEncoder.encode() with batch inputs.
                Contains encoder_output with last_hidden_state (B, seq, hidden),
                input_ids (B, seq), attention_mask (B, seq).
            texts: List of original text strings (length B).

        Returns:
            List of result dicts, one per input.
        """
        results = []
        B = batch_encoded["input_ids"].shape[0]
        for i in range(B):
            single_encoded = _slice_encoded(batch_encoded, i)
            results.append(self.process(single_encoded, texts[i], **kwargs))
        return results

    def forward(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Validate input, encode via shared backbone, and delegate to process."""
        from .validation import validate_text
        text = validate_text(text)
        encoded = self.encode(text)
        return self.process(encoded, text, **kwargs)

    def display(self, result: dict[str, Any], mode: str = "rich") -> str | None:
        """Render the result as a visual card."""
        if mode == "rich":
            CardRenderer.render_rich(self.name, result)
            return None
        elif mode == "html":
            return CardRenderer.render_html(self.name, result)
        else:
            return CardRenderer.render_terminal(self.name, result)

    def predict(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Public convenience API — alias for forward()."""
        return self.forward(text, **kwargs)

    def encode(self, text: str, max_length: int = 512) -> dict:
        """Encode text using the shared backbone."""
        return SharedEncoder.encode(text, max_length=max_length)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r}>"


def _slice_encoded(batch_encoded: dict, index: int) -> dict:
    """Extract a single item from a batch-encoded dict.

    Slices all tensors at dim 0 and wraps BaseModelOutput so that
    downstream module.process() sees the same structure as a single encode().
    """
    encoder_output = batch_encoded["encoder_output"]

    # Build a lightweight namespace that mirrors BaseModelOutput
    class _SlicedOutput:
        """Single-item slice of a batched encoder output."""
        def __init__(self, full_output, idx):
            self.last_hidden_state = full_output.last_hidden_state[idx : idx + 1]
            if hasattr(full_output, "attentions") and full_output.attentions is not None:
                self.attentions = tuple(a[idx : idx + 1] for a in full_output.attentions)
            else:
                self.attentions = None
            if hasattr(full_output, "hidden_states") and full_output.hidden_states is not None:
                self.hidden_states = tuple(h[idx : idx + 1] for h in full_output.hidden_states)
            else:
                self.hidden_states = None

    return {
        "encoder_output": _SlicedOutput(encoder_output, index),
        "tokens": {k: v[index : index + 1] for k, v in batch_encoded["tokens"].items()}
            if "tokens" in batch_encoded else None,
        "input_ids": batch_encoded["input_ids"][index : index + 1],
        "attention_mask": batch_encoded["attention_mask"][index : index + 1]
            if batch_encoded.get("attention_mask") is not None else None,
    }
