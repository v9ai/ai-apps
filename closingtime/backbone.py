"""closingtime/backbone.py — Shared encoder singleton with thread safety.

All 12 modules share a single DeBERTa-v3-base encoder. This module provides
a thread-safe singleton that lazy-loads on first access and manages device
placement (CPU/CUDA/MPS auto-detection).
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

import torch

if TYPE_CHECKING:
    from transformers import AutoModel, AutoTokenizer


_lock = threading.Lock()
_encoder: "AutoModel | None" = None
_tokenizer: "AutoTokenizer | None" = None
_device: torch.device | None = None

MODEL_NAME = "microsoft/deberta-v3-base"


def _detect_device() -> torch.device:
    """Auto-detect best available device."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def get_device() -> torch.device:
    """Return the active device, detecting if needed."""
    global _device
    if _device is None:
        _device = _detect_device()
    return _device


def set_device(device: str | torch.device) -> None:
    """Override the auto-detected device."""
    global _device, _encoder
    _device = torch.device(device) if isinstance(device, str) else device
    # move encoder if already loaded
    if _encoder is not None:
        _encoder = _encoder.to(_device)


class SharedEncoder:
    """Thread-safe singleton wrapper around the shared encoder and tokenizer."""

    @staticmethod
    def load(model_name: str = MODEL_NAME) -> tuple["AutoModel", "AutoTokenizer"]:
        """Load or return the cached encoder and tokenizer."""
        global _encoder, _tokenizer

        if _encoder is not None and _tokenizer is not None:
            return _encoder, _tokenizer

        with _lock:
            # double-checked locking
            if _encoder is not None and _tokenizer is not None:
                return _encoder, _tokenizer

            from transformers import AutoModel, AutoTokenizer

            device = get_device()
            _tokenizer = AutoTokenizer.from_pretrained(model_name)
            _encoder = AutoModel.from_pretrained(model_name).to(device).eval()

            return _encoder, _tokenizer

    @staticmethod
    def encode(text: str, max_length: int = 512) -> dict:
        """Tokenize and encode text, returning encoder output."""
        encoder, tokenizer = SharedEncoder.load()
        device = get_device()

        tokens = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=max_length,
            padding=False,
        ).to(device)

        with torch.no_grad():
            output = encoder(**tokens)

        return {"encoder_output": output, "tokens": tokens, "input_ids": tokens["input_ids"]}

    @staticmethod
    def unload() -> None:
        """Release the encoder and tokenizer from memory."""
        global _encoder, _tokenizer
        with _lock:
            _encoder = None
            _tokenizer = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
