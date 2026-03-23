#!/usr/bin/env python3
"""Shared embedding function for the iterate pipeline.

Uses FastEmbed (ONNX-based, no PyTorch) when available.
Falls back to ChromaDB's default embedding (sentence-transformers/all-MiniLM-L6-v2) otherwise.

Both store_context.py and retrieve_context.py import from here so embeddings
are always consistent between storage and retrieval.
"""

import os

FASTEMBED_MODEL = os.environ.get("ITERATE_EMBED_MODEL", "BAAI/bge-small-en-v1.5")
FASTEMBED_CACHE = os.environ.get("ITERATE_EMBED_CACHE", "/tmp/claude-iterate/fastembed-cache")

# Module-level cache: model loads once per process
_cached_fn = None
_initialized = False


def fastembed_available() -> bool:
    """Return True if fastembed is importable."""
    try:
        import fastembed  # noqa: F401
        return True
    except ImportError:
        return False


def get_embedding_function():
    """Return a ChromaDB-compatible embedding function, or None to use ChromaDB's default.

    FastEmbed advantages over ChromaDB default:
    - ONNX runtime — no PyTorch, much smaller footprint
    - BAAI/bge-small-en-v1.5 is ~23 MB vs ~80 MB for all-MiniLM-L6-v2
    - Faster cold start, same or better retrieval quality

    Cached at module level — safe to call multiple times per process.
    """
    global _cached_fn, _initialized
    if _initialized:
        return _cached_fn
    _initialized = True

    if not fastembed_available():
        _cached_fn = None
        return None

    try:
        from fastembed import TextEmbedding
        os.makedirs(FASTEMBED_CACHE, exist_ok=True)
        model = TextEmbedding(FASTEMBED_MODEL, cache_dir=FASTEMBED_CACHE)

        def _embed(texts: list[str]) -> list[list[float]]:
            return [v.tolist() for v in model.embed(texts)]

        class _FastEmbedFn:
            """ChromaDB-compatible embedding function backed by FastEmbed.

            Implements the full ChromaDB EmbeddingFunction interface for ≥0.6:
              - embed_documents(input)   — called when storing
              - embed_query(input)       — called when querying
              - __call__(input)          — legacy __call__ path
              - name()                   — used for collection config validation
              - is_legacy()              — ChromaDB deprecation-check hook
              - supported_spaces()       — distance metrics this function supports
              - get_config()             — returns config dict for ChromaDB metadata
            """

            @staticmethod
            def name() -> str:  # noqa: A003
                return f"fastembed:{FASTEMBED_MODEL}"

            @staticmethod
            def is_legacy() -> bool:
                return False

            @staticmethod
            def supported_spaces() -> list[str]:
                return ["cosine", "l2", "ip"]

            @staticmethod
            def get_config() -> dict:
                return {"model": FASTEMBED_MODEL, "type": "fastembed"}

            @classmethod
            def build_from_config(cls, config: dict) -> "_FastEmbedFn":
                return cls()

            def embed_documents(self, input: list[str]) -> list[list[float]]:  # noqa: A002
                return _embed(input)

            def embed_query(self, input: list[str]) -> list[list[float]]:  # noqa: A002
                return _embed(input)

            def __call__(self, input: list[str]) -> list[list[float]]:  # noqa: A002
                return _embed(input)

        _cached_fn = _FastEmbedFn()
    except Exception:
        _cached_fn = None

    return _cached_fn


def backend_name() -> str:
    """Return 'fastembed' or 'chroma_default'."""
    fn = get_embedding_function()
    return "fastembed" if fn is not None else "chroma_default"


def _reset_cache() -> None:
    """Reset module-level cache. Used in tests only."""
    global _cached_fn, _initialized
    _cached_fn = None
    _initialized = False
