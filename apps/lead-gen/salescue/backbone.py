"""salescue/backbone.py — Shared encoder singleton with thread safety.

All modules share a single DeBERTa-v3-base encoder. Thread-safe singleton
with lazy loading and device auto-detection (CPU/CUDA/MPS).

Includes `encode_embeddings()` which produces discriminative sentence
embeddings via mean-pooling + centering + L2 normalization.  Raw DeBERTa
mean-pooled vectors suffer from *anisotropy* (all vectors cluster in a
narrow cone, cosine similarity ≈ 0.95 for everything).  Subtracting the
corpus mean and normalizing spreads the vectors across the unit sphere,
restoring cosine similarity as a meaningful distance metric.
"""

from __future__ import annotations

import threading
from typing import TYPE_CHECKING

import torch
import torch.nn.functional as F

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

    # ── Discriminative embedding helpers ──────────────────────────────────

    @staticmethod
    def _mean_pool(encoder_output: dict) -> torch.Tensor:
        """Mean-pool last_hidden_state using attention mask. Returns [B, hidden]."""
        last_hidden = encoder_output["encoder_output"].last_hidden_state
        mask = encoder_output["attention_mask"].unsqueeze(-1).float()
        return (last_hidden * mask).sum(dim=1) / mask.sum(dim=1)

    @staticmethod
    def compute_center(texts: list[str], max_length: int = 512) -> torch.Tensor:
        """Compute the mean embedding over a set of texts (before normalization).

        Use this to obtain a centering vector from a representative corpus
        (e.g. all prototype sentences).  Subtracting this center from new
        embeddings before L2-normalizing removes the anisotropic bias.

        Returns:
            Tensor of shape [1, hidden] — the centroid.
        """
        enc = SharedEncoder.encode(texts, max_length=max_length)
        pooled = SharedEncoder._mean_pool(enc)  # [B, hidden]
        return pooled.mean(dim=0, keepdim=True)  # [1, hidden]

    @staticmethod
    def encode_embeddings(
        text: str | list[str],
        center: torch.Tensor | None = None,
        max_length: int = 512,
    ) -> torch.Tensor:
        """Produce discriminative sentence embeddings.

        Pipeline:
            1. Mean-pool DeBERTa last_hidden_state (attention-masked).
            2. Subtract *center* (corpus mean) to break anisotropy.
            3. L2-normalize to the unit sphere.

        Without centering, DeBERTa mean-pooled cosine similarities are
        compressed into [0.93, 0.97] regardless of semantic content.
        Centering spreads the distribution so that cosine similarity
        between related texts is >0.7 and unrelated texts <0.4.

        Args:
            text: Single string or list of strings.
            center: Optional [1, hidden] centroid tensor from `compute_center()`.
                    If None, only L2 normalization is applied (still helpful,
                    but centering gives the best discrimination).
            max_length: Max token length for the encoder.

        Returns:
            Tensor of shape [B, hidden], L2-normalized.
        """
        if isinstance(text, str):
            text = [text]

        enc = SharedEncoder.encode(text, max_length=max_length)
        pooled = SharedEncoder._mean_pool(enc)  # [B, hidden]

        if center is not None:
            pooled = pooled - center  # shift away from the common direction

        return F.normalize(pooled, p=2, dim=1)

    @staticmethod
    def unload() -> None:
        global _encoder, _tokenizer
        with _lock:
            _encoder = None
            _tokenizer = None
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
