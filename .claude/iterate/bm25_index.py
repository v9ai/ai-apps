#!/usr/bin/env python3
"""BM25 keyword index alongside ChromaDB for hybrid retrieval.

Uses rank_bm25.BM25Okapi for keyword search, persisted as JSON alongside
the ChromaDB directory.  Gracefully degrades to a no-op when rank-bm25 is
not installed.
"""

import json
import os
import re

try:
    from rank_bm25 import BM25Okapi

    _BM25_AVAILABLE = True
except ImportError:
    _BM25_AVAILABLE = False


def bm25_available() -> bool:
    return _BM25_AVAILABLE


def _tokenize(text: str) -> list[str]:
    """Simple whitespace + lowercasing tokenizer."""
    return re.findall(r"[a-z0-9_]+", text.lower())


class BM25Index:
    """Thin wrapper around BM25Okapi with persistence."""

    def __init__(self, index_path: str):
        self._index_path = index_path
        self._docs: list[str] = []
        self._metadatas: list[dict] = []
        self._ids: list[str] = []
        self._corpus: list[list[str]] = []  # tokenized docs
        self._bm25: "BM25Okapi | None" = None
        self._id_set: set[str] = set()

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self) -> None:
        data = {
            "docs": self._docs,
            "metadatas": self._metadatas,
            "ids": self._ids,
        }
        os.makedirs(os.path.dirname(self._index_path) or ".", exist_ok=True)
        with open(self._index_path, "w") as f:
            json.dump(data, f)

    def load(self) -> bool:
        """Load from JSON.  Returns True on success, False if file missing."""
        if not os.path.exists(self._index_path):
            return False
        try:
            with open(self._index_path, "r") as f:
                data = json.load(f)
            self._docs = data["docs"]
            self._metadatas = data["metadatas"]
            self._ids = data["ids"]
            self._id_set = set(self._ids)
            self._corpus = [_tokenize(d) for d in self._docs]
            self._rebuild_bm25()
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Index management
    # ------------------------------------------------------------------

    def _rebuild_bm25(self) -> None:
        if not _BM25_AVAILABLE or not self._corpus:
            self._bm25 = None
            return
        self._bm25 = BM25Okapi(self._corpus)

    def add_documents(
        self,
        docs: list[str],
        metadatas: list[dict],
        ids: list[str],
    ) -> None:
        """Add documents incrementally (skips already-known IDs)."""
        added = False
        for doc, meta, doc_id in zip(docs, metadatas, ids):
            if doc_id in self._id_set:
                continue
            self._docs.append(doc)
            self._metadatas.append(meta)
            self._ids.append(doc_id)
            self._id_set.add(doc_id)
            self._corpus.append(_tokenize(doc))
            added = True
        if added:
            self._rebuild_bm25()

    def query(
        self, query_text: str, n_results: int = 20
    ) -> list[tuple[str, dict, float]]:
        """Return (doc, metadata, bm25_score) sorted best-first."""
        if self._bm25 is None or not self._docs:
            return []
        tokens = _tokenize(query_text)
        if not tokens:
            return []
        scores = self._bm25.get_scores(tokens)
        # Pair indices with scores, sort descending by score
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        results: list[tuple[str, dict, float]] = []
        for idx, score in ranked[:n_results]:
            if score <= 0:
                break
            results.append((self._docs[idx], self._metadatas[idx], float(score)))
        return results

    @property
    def size(self) -> int:
        return len(self._docs)


# ------------------------------------------------------------------
# Factory
# ------------------------------------------------------------------

def build_or_load(chroma_path: str) -> "BM25Index | None":
    """Load BM25 index from JSON cache, or return empty index.

    Returns None if rank-bm25 is not installed.
    """
    if not _BM25_AVAILABLE:
        return None
    index_path = os.path.join(chroma_path, "bm25_index.json")
    idx = BM25Index(index_path)
    idx.load()  # OK if file doesn't exist yet
    return idx
