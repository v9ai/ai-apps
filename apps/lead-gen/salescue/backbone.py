"""salescue/backbone.py — Shared encoder singleton with thread safety.

All modules share a single DeBERTa-v3-base encoder. Thread-safe singleton
with lazy loading and device auto-detection (CPU/CUDA/MPS).
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

import torch

if TYPE_CHECKING:
    from transformers import AutoModel, AutoTokenizer


_lock = threading.RLock()  # RLock: encode() -> load() won't deadlock
_encoder: "AutoModel | None" = None
_tokenizer: "AutoTokenizer | None" = None
_device: torch.device | None = None

MODEL_NAME = "microsoft/deberta-v3-base"


def _detect_device() -> torch.device:
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def get_device() -> torch.device:
    global _device
    if _device is None:
        _device = _detect_device()
    return _device


def set_device(device: str | torch.device) -> None:
    global _device, _encoder
    _device = torch.device(device) if isinstance(device, str) else device
    if _encoder is not None:
        _encoder = _encoder.to(_device)


class SharedEncoder:
    """Thread-safe singleton wrapper around the shared encoder and tokenizer."""

    @staticmethod
    def load(model_name: str = MODEL_NAME) -> tuple["AutoModel", "AutoTokenizer"]:
        global _encoder, _tokenizer

        if _encoder is not None and _tokenizer is not None:
            return _encoder, _tokenizer

        with _lock:
            if _encoder is not None and _tokenizer is not None:
                return _encoder, _tokenizer

            from transformers import AutoModel, AutoTokenizer

            device = get_device()
            _tokenizer = AutoTokenizer.from_pretrained(model_name)
            _encoder = AutoModel.from_pretrained(model_name).to(device).eval()

            return _encoder, _tokenizer

    @staticmethod
    def encode(
        text: str | list[str],
        max_length: int = 512,
        output_attentions: bool = False,
    ) -> dict:
        """Tokenize and encode text, returning encoder output.

        Args:
            text: Single string or list of strings for batch encoding.
            max_length: Maximum token length (truncates beyond this).
            output_attentions: If True, include attention weights in output.

        Returns:
            Dict with encoder_output, tokens, input_ids, attention_mask.
        """
        encoder, tokenizer = SharedEncoder.load()
        device = get_device()

        is_batch = isinstance(text, list)

        tokens = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=max_length,
            padding=is_batch,
        ).to(device)

        with torch.no_grad():
            output = encoder(**tokens, output_attentions=output_attentions)

        return {
            "encoder_output": output,
            "tokens": tokens,
            "input_ids": tokens["input_ids"],
            "attention_mask": tokens.get("attention_mask"),
        }

    @staticmethod
    def encode_batch(
        texts: list[str],
        max_length: int = 512,
        sort_by_length: bool = True,
    ) -> dict:
        """Encode a batch of texts with optional length-sorting for efficiency.

        Sorting by length minimizes padding waste in batched encoding.
        """
        if sort_by_length:
            indexed = sorted(enumerate(texts), key=lambda x: len(x[1]))
            sorted_texts = [t for _, t in indexed]
            original_order = [i for i, _ in indexed]
        else:
            sorted_texts = texts
            original_order = list(range(len(texts)))

        result = SharedEncoder.encode(sorted_texts, max_length=max_length)

        # Restore original order
        if sort_by_length:
            inv = [0] * len(original_order)
            for new_pos, orig_pos in enumerate(original_order):
                inv[orig_pos] = new_pos
            result["_original_order"] = inv

        return result

    @staticmethod
    def unload() -> None:
        global _encoder, _tokenizer
        with _lock:
            _encoder = None
            _tokenizer = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
