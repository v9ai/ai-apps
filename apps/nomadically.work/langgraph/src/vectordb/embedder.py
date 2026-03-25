"""MLX Metal GPU embedder for all-MiniLM-L6-v2.

Singleton pattern: load once, reuse across sync + search calls.
~4,618 texts/sec on M1 16GB (warm).

Extracted from mlx-training/score_ai_recruiters.py.
"""

from __future__ import annotations

import numpy as np

from .config import BATCH_SIZE, MAX_TOKEN_LENGTH, MODEL_ID

_model = None
_tokenizer = None


def _load_mlx_model():
    """Load embedding model in MLX (native Metal GPU) with HF batch tokenizer."""
    global _model, _tokenizer
    if _model is None:
        from mlx_embeddings.utils import load as mlx_load
        from transformers import AutoTokenizer

        _model, _ = mlx_load(MODEL_ID)
        _tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    return _model, _tokenizer


def _mlx_encode(
    texts: list[str], model, tokenizer, batch_size: int = BATCH_SIZE
) -> np.ndarray:
    """Batch-encode texts on Metal GPU via MLX. Returns L2-normalized embeddings."""
    import mlx.core as mx

    all_embs: list[np.ndarray] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        inputs = tokenizer(
            batch,
            padding=True,
            truncation=True,
            max_length=MAX_TOKEN_LENGTH,
            return_tensors="np",
        )

        input_ids = mx.array(inputs["input_ids"])
        attention_mask = mx.array(inputs["attention_mask"])
        token_type_ids = mx.zeros_like(input_ids)

        output = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
        )
        hidden = output.last_hidden_state

        # Mean pooling with attention mask
        mask = mx.expand_dims(attention_mask, -1).astype(mx.float32)
        summed = mx.sum(hidden * mask, axis=1)
        counts = mx.maximum(mx.sum(mask, axis=1), mx.array(1e-9))
        embs = summed / counts

        # L2 normalize
        norms = mx.sqrt(mx.sum(embs * embs, axis=-1, keepdims=True))
        embs = embs / mx.maximum(norms, mx.array(1e-9))

        mx.eval(embs)
        all_embs.append(np.array(embs))

    return np.concatenate(all_embs, axis=0)


def embed_texts(texts: list[str]) -> np.ndarray:
    """Batch-encode texts on Metal GPU. Returns L2-normalized (N, 384) array."""
    model, tokenizer = _load_mlx_model()
    return _mlx_encode(texts, model, tokenizer, batch_size=BATCH_SIZE)


def embed_query(query: str) -> list[float]:
    """Embed a single query string. Returns list[float] for LanceDB search."""
    return embed_texts([query])[0].tolist()
