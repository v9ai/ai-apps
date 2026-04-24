# Requires: transformers, torch, numpy, huggingface_hub
"""JobBERT-v3 inference: job embedding + skill extraction (native Python port).

Ported from the ``jobbert`` Rust crate (XLMRoberta + custom Dense head for
embeddings; BERT-for-token-classification for NER). Two singletons:

1. **Embedder** — ``TechWolf/JobBERT-v3`` (sentence-transformers with an
   asymmetric Router). At inference the Router uses the "anchor" Dense head
   (``2_Asym/6235903824_Dense/model.safetensors``): Linear(768->1024) + Tanh
   on top of mean-pooled XLMRoberta hidden states, followed by L2 normalization.
2. **Skill NER** — ``jjzha/jobbert_knowledge_extraction`` (BIO token tagging:
   0=B, 1=I, 2=O). Adjacent ``B`` tokens are merged into single spans because
   this model rarely emits ``I`` for continuation subwords.

All model loads are lazy (first call downloads via ``huggingface_hub`` cache).
"""

from __future__ import annotations

import logging
import os
import threading
from typing import Any

import numpy as np
import torch
from huggingface_hub import hf_hub_download
from transformers import AutoModel, AutoModelForTokenClassification, AutoTokenizer
from safetensors.torch import load_file as load_safetensors

log = logging.getLogger(__name__)


# -- Embedder constants --------------------------------------------------------

EMBED_REPO_ID = "TechWolf/JobBERT-v3"
EMBED_MAX_SEQ_LEN = 64
EMBED_OUTPUT_DIM = 1024
EMBED_HIDDEN_DIM = 768
# Router defaults to the "anchor" Dense head during inference; the "positive"
# head is only used during contrastive training.
EMBED_DENSE_PATH = "2_Asym/6235903824_Dense/model.safetensors"

# -- NER constants -------------------------------------------------------------

NER_REPO_ID = "jjzha/jobbert_knowledge_extraction"
NER_LABELS = {0: "B", 1: "I", 2: "O"}


def _select_device() -> torch.device:
    """Pick the best available device (CUDA > MPS > CPU)."""
    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) is not None and torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


# =============================================================================
# Embedder
# =============================================================================


class _JobBertEmbedder:
    """XLMRoberta + Dense(768->1024, Tanh) + L2-norm.

    Mirrors ``crates/jobbert/src/embedder.rs``. Tokenizer is configured with
    ``<pad>`` padding and truncation to 64 tokens.
    """

    def __init__(self) -> None:
        self.device = _select_device()
        log.info("Loading %s on %s", EMBED_REPO_ID, self.device)

        self.tokenizer = AutoTokenizer.from_pretrained(EMBED_REPO_ID)
        self.model = AutoModel.from_pretrained(EMBED_REPO_ID).to(self.device).eval()

        dense_local = hf_hub_download(repo_id=EMBED_REPO_ID, filename=EMBED_DENSE_PATH)
        dense_state = load_safetensors(dense_local)
        # Safetensors keys: "linear.weight" (1024,768), "linear.bias" (1024,).
        self.dense_weight = dense_state["linear.weight"].to(self.device, dtype=torch.float32)
        self.dense_bias = dense_state["linear.bias"].to(self.device, dtype=torch.float32)

        log.info(
            "JobBERT-v3 ready (dim=%d, max_seq=%d)",
            EMBED_OUTPUT_DIM,
            EMBED_MAX_SEQ_LEN,
        )

    @torch.inference_mode()
    def embed_batch(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, EMBED_OUTPUT_DIM), dtype=np.float32)

        enc = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            max_length=EMBED_MAX_SEQ_LEN,
            return_tensors="pt",
        )
        input_ids = enc["input_ids"].to(self.device)
        attention_mask = enc["attention_mask"].to(self.device)
        token_type_ids = enc.get("token_type_ids")
        if token_type_ids is not None:
            token_type_ids = token_type_ids.to(self.device)

        kwargs: dict[str, Any] = {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
        }
        if token_type_ids is not None:
            kwargs["token_type_ids"] = token_type_ids

        out = self.model(**kwargs)
        hidden = out.last_hidden_state  # [batch, seq, 768]

        # Mean-pool with attention mask.
        mask = attention_mask.unsqueeze(-1).to(hidden.dtype)
        summed = (hidden * mask).sum(dim=1)
        counts = mask.sum(dim=1).clamp(min=1e-9)
        pooled = summed / counts  # [batch, 768]

        # Dense: Linear(768->1024) + Tanh.
        projected = torch.tanh(pooled @ self.dense_weight.T + self.dense_bias)

        # L2-normalize.
        norms = projected.norm(dim=1, keepdim=True).clamp(min=1e-12)
        normed = projected / norms

        return normed.detach().cpu().to(torch.float32).numpy()

    def embed_one(self, text: str) -> np.ndarray:
        return self.embed_batch([text])[0]


# =============================================================================
# Skill NER
# =============================================================================


class _SkillClassifier:
    """BERT for token classification over BIO tags (``jobbert_knowledge_extraction``)."""

    def __init__(self) -> None:
        self.device = _select_device()
        log.info("Loading %s on %s", NER_REPO_ID, self.device)

        self.tokenizer = AutoTokenizer.from_pretrained(NER_REPO_ID)
        self.model = (
            AutoModelForTokenClassification.from_pretrained(NER_REPO_ID)
            .to(self.device)
            .eval()
        )
        log.info("Skill classifier ready (labels=%d)", len(NER_LABELS))

    @torch.inference_mode()
    def extract_batch(self, texts: list[str]) -> list[list[dict]]:
        if not texts:
            return []

        enc = self.tokenizer(
            texts,
            padding=True,
            truncation=True,
            return_tensors="pt",
            return_offsets_mapping=True,
        )
        offsets_all = enc.pop("offset_mapping")
        inputs = {k: v.to(self.device) for k, v in enc.items()}

        logits = self.model(**inputs).logits  # [batch, seq, 3]
        probs = torch.softmax(logits, dim=-1)
        pred_labels = logits.argmax(dim=-1)

        results: list[list[dict]] = []
        for i, text in enumerate(texts):
            labels_i = pred_labels[i].tolist()
            probs_i = probs[i]
            # Max-prob along the predicted label for each token.
            token_probs = probs_i.gather(1, pred_labels[i].unsqueeze(-1)).squeeze(-1).tolist()
            offsets_i = [tuple(o) for o in offsets_all[i].tolist()]
            spans = _decode_bio(labels_i, offsets_i, token_probs, text)
            results.append(spans)
        return results

    def extract(self, text: str) -> list[dict]:
        out = self.extract_batch([text])
        return out[0] if out else []


# =============================================================================
# BIO decoder
# =============================================================================


def _decode_bio(
    labels: list[int],
    offsets: list[tuple[int, int]],
    probs: list[float],
    text: str,
) -> list[dict]:
    """Port of ``crates/jobbert/src/bio.rs::decode_bio``.

    Returns list of ``{"span": str, "label": "SKILL", "score": float,
    "start": int, "end": int}``. Special tokens (offset (0,0)) flush any open
    span. Adjacent ``B`` tokens merge into a single span.
    """
    skills: list[dict] = []
    cur_start: int | None = None
    cur_end: int = 0
    cur_probs: list[float] = []

    def flush() -> None:
        nonlocal cur_start, cur_end, cur_probs
        if cur_start is None:
            return
        start, end = cur_start, cur_end
        cur_start = None
        span_probs = cur_probs
        cur_probs = []
        if start >= end or end > len(text):
            return
        span_text = text[start:end].strip()
        if not span_text:
            return
        confidence = (sum(span_probs) / len(span_probs)) if span_probs else 0.0
        skills.append(
            {
                "span": span_text,
                "label": "SKILL",
                "score": float(confidence),
                "start": start,
                "end": end,
            }
        )

    for i, (label, (off_start, off_end)) in enumerate(zip(labels, offsets)):
        # Special tokens (CLS/SEP/PAD) have offset (0, 0).
        if off_start == 0 and off_end == 0:
            flush()
            continue

        if label == 0:  # B
            if cur_start is not None:
                if off_start <= cur_end + 1:
                    cur_end = off_end
                    cur_probs.append(probs[i])
                else:
                    flush()
                    cur_start = off_start
                    cur_end = off_end
                    cur_probs.append(probs[i])
            else:
                cur_start = off_start
                cur_end = off_end
                cur_probs.append(probs[i])
        elif label == 1:  # I
            if cur_start is not None:
                cur_end = off_end
                cur_probs.append(probs[i])
            # I without preceding B: skip.
        else:  # O
            flush()

    flush()
    return skills


# =============================================================================
# Public API — lazy singletons
# =============================================================================


_embedder_lock = threading.Lock()
_embedder: _JobBertEmbedder | None = None

_classifier_lock = threading.Lock()
_classifier: _SkillClassifier | None = None


def _get_embedder() -> _JobBertEmbedder:
    global _embedder
    if _embedder is None:
        with _embedder_lock:
            if _embedder is None:
                _embedder = _JobBertEmbedder()
    return _embedder


def _get_classifier() -> _SkillClassifier:
    global _classifier
    if _classifier is None:
        with _classifier_lock:
            if _classifier is None:
                _classifier = _SkillClassifier()
    return _classifier


def embed(text: str) -> np.ndarray:
    """Return the 1024-dim L2-normalized JobBERT-v3 embedding for ``text``."""
    return _get_embedder().embed_one(text)


def embed_batch(texts: list[str]) -> np.ndarray:
    """Return ``[len(texts), 1024]`` L2-normalized JobBERT-v3 embeddings."""
    return _get_embedder().embed_batch(list(texts))


def extract_skills(text: str) -> list[dict]:
    """Extract skill spans from ``text`` via the JobBERT NER head.

    Returns list of dicts with keys: ``span`` (str), ``label`` (``"SKILL"``),
    ``score`` (float mean softmax over span tokens), ``start``/``end`` (char
    offsets in the original text).
    """
    return _get_classifier().extract(text)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two L2-normalized vectors (dot product)."""
    return float(np.dot(a, b))


__all__ = [
    "embed",
    "embed_batch",
    "extract_skills",
    "cosine_similarity",
    "EMBED_OUTPUT_DIM",
    "EMBED_MAX_SEQ_LEN",
]
