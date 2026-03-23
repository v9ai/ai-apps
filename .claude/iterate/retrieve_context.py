#!/usr/bin/env python3
"""Retrieve relevant context from ChromaDB for the next iteration."""

import argparse
import json
import os
import chromadb

from embeddings import get_embedding_function
from reranker import rerank, reranker_available
from bm25_index import build_or_load as bm25_build_or_load, bm25_available
from rrf import reciprocal_rank_fusion

CHROMA_PATH = os.environ.get("CLAUDE_ITERATE_CHROMA_PATH", "/tmp/claude-iterate/chroma")
COLLECTION_NAME = "iterate_context"


def get_collection():
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    ef = get_embedding_function()
    kwargs: dict = {"name": COLLECTION_NAME, "metadata": {"hnsw:space": "cosine"}}
    if ef is not None:
        kwargs["embedding_function"] = ef
    return client.get_or_create_collection(**kwargs)


# ---------------------------------------------------------------------------
# Cosine similarity helper
# ---------------------------------------------------------------------------

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two embedding vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(x * x for x in b) ** 0.5
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


def _mean_embedding(embeddings) -> list[float] | None:
    """Return element-wise mean of a list of embedding vectors."""
    if embeddings is None or len(embeddings) == 0:
        return None
    dim = len(embeddings[0])
    mean = [0.0] * dim
    for emb in embeddings:
        for i, v in enumerate(emb):
            mean[i] += v
    n = len(embeddings)
    return [v / n for v in mean]


# ---------------------------------------------------------------------------
# Semantic repetition detection
# ---------------------------------------------------------------------------

def compute_iter_similarity(collection, iter_a: int, iter_b: int) -> float | None:
    """Compute cosine similarity between two iterations' output embeddings.

    Uses the stored embeddings in ChromaDB — no additional LLM/embedding call.
    Returns None if embeddings are unavailable (e.g. chroma default ef).
    """
    results = {}
    for it in (iter_a, iter_b):
        try:
            r = collection.get(
                where={"$and": [{"iteration": it}, {"doc_type": "output"}]},
                include=["embeddings"],
            )
            if r["embeddings"] is not None and len(r["embeddings"]) > 0:
                # Convert numpy arrays to plain Python lists for safe
                # truthiness checks and arithmetic downstream.
                embs = r["embeddings"]
                try:
                    embs = [e.tolist() if hasattr(e, "tolist") else list(e) for e in embs]
                except Exception:
                    embs = list(embs)
                results[it] = embs
        except Exception:
            return None

    if iter_a not in results or iter_b not in results:
        return None

    emb_a = _mean_embedding(results[iter_a])
    emb_b = _mean_embedding(results[iter_b])
    if emb_a is None or emb_b is None:
        return None

    sim = _cosine_similarity(emb_a, emb_b)
    return round(sim, 4)


# ---------------------------------------------------------------------------
# MMR (Maximal Marginal Relevance)
# ---------------------------------------------------------------------------

def _mmr_select(
    docs: list[tuple[str, dict, float]],
    k: int,
    lambda_mult: float = 0.6,
    ef=None,
) -> list[tuple[str, dict, float]]:
    """Greedy MMR selection for diversity in retrieved docs.

    lambda_mult controls relevance vs. diversity:
      - 1.0 = pure relevance (no MMR)
      - 0.0 = pure diversity
      - 0.6 = default: prefer relevance but penalise redundancy

    Falls back to top-k by score if embedding function is unavailable.
    """
    if ef is None or len(docs) <= k:
        return docs[:k]

    # Embed all candidate documents
    texts = [d for d, _, _ in docs]
    try:
        embeddings = ef.embed_documents(texts)
    except Exception:
        return docs[:k]

    selected_indices: list[int] = []
    remaining = list(range(len(docs)))

    # Seed: pick the most relevant doc (lowest distance = index 0 after sort)
    best = min(remaining, key=lambda i: docs[i][2])
    selected_indices.append(best)
    remaining.remove(best)

    while len(selected_indices) < k and remaining:
        best_score = float("-inf")
        best_idx = remaining[0]

        sel_embs = [embeddings[i] for i in selected_indices]

        for idx in remaining:
            relevance = 1.0 - docs[idx][2]  # convert distance to similarity
            redundancy = max(
                _cosine_similarity(embeddings[idx], sel_emb) for sel_emb in sel_embs
            )
            score = lambda_mult * relevance - (1 - lambda_mult) * redundancy
            if score > best_score:
                best_score = score
                best_idx = idx

        selected_indices.append(best_idx)
        remaining.remove(best_idx)

    return [docs[i] for i in selected_indices]


def _get_latest_eval(collection, current_iteration: int) -> str | None:
    """Directly fetch the most recent eval doc by ID (deterministic, not similarity-based).

    Returns the raw document string or None if no eval has been stored yet.
    """
    for it in range(current_iteration - 1, -1, -1):
        doc_id = f"iter-{it}-eval"
        result = collection.get(ids=[doc_id], include=["documents"])
        if result["ids"]:
            return result["documents"][0]
    return None


def _recency_boost(dist: float, iteration: int, current_iteration: int) -> float:
    """Apply a small distance penalty per iteration of staleness.

    More recent iterations rank slightly higher even if their cosine distance
    is not the absolute minimum — prevents the system from fixating on early
    (possibly outdated) context.
    """
    staleness = max(0, current_iteration - iteration - 1)
    return dist + staleness * 0.04


def retrieve(
    query: str,
    current_iteration: int,
    n_results: int = 8,
    include_errors: bool = True,
    use_mmr: bool = True,
    similarity_override: float | None = None,
) -> str:
    collection = get_collection()
    ef = get_embedding_function()
    total = collection.count()

    if total == 0:
        return "No previous context available. This is the first iteration."

    # Multi-query strategy:
    # 1. General query — no filter, broad semantic match
    # 2. Error-focused — filter to docs that recorded errors (where has_errors=True)
    # 3. Eval-focused  — filter to eval doc_type for score history
    # 4. Diff-focused  — filter to diff doc_type for code change context
    queries_with_filters: list[tuple[str, dict | None]] = [
        (query, None),
        (f"eval scores completion progress quality for: {query}", {"doc_type": "eval"}),
        (f"code changes git diff files modified for: {query}", {"doc_type": "diff"}),
    ]
    if include_errors:
        queries_with_filters.append(
            (f"errors failures bugs in: {query}", {"has_errors": True})
        )

    all_docs: dict[str, tuple[str, dict, float]] = {}

    for q, where_filter in queries_with_filters:
        kwargs: dict = {
            "query_texts": [q],
            "n_results": min(n_results, total),
            "include": ["documents", "metadatas", "distances"],
        }
        if where_filter:
            kwargs["where"] = where_filter
        try:
            results = collection.query(**kwargs)
        except Exception:
            # where filter may match 0 docs — fall back to unfiltered
            try:
                results = collection.query(
                    query_texts=[q],
                    n_results=min(n_results, total),
                    include=["documents", "metadatas", "distances"],
                )
            except Exception:
                continue

        if not results.get("documents") or not results["documents"][0]:
            continue

        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            doc_id = f"{meta['iteration']}-{meta['chunk_index']}"
            # Apply recency boost before deduplication so the boosted score wins
            boosted = _recency_boost(dist, meta["iteration"], current_iteration)
            if doc_id not in all_docs or boosted < all_docs[doc_id][2]:
                all_docs[doc_id] = (doc, meta, boosted)

    # Sort by boosted distance for candidate selection, then by iteration for display
    dense_candidates = sorted(all_docs.values(), key=lambda x: x[2])

    # BM25 keyword retrieval leg — fuse with dense results via RRF
    use_bm25 = os.environ.get("ITERATE_BM25", "1") == "1"
    if use_bm25 and bm25_available():
        try:
            bm25_idx = bm25_build_or_load(CHROMA_PATH)
            if bm25_idx is not None and bm25_idx.size > 0:
                bm25_results = bm25_idx.query(query, n_results=n_results * 2)
                if bm25_results:
                    # RRF expects ranked lists sorted best-first.
                    # dense_candidates is sorted by distance (lower=better) — already best-first.
                    # bm25_results is sorted by BM25 score (higher=better) — already best-first.
                    candidate_docs = reciprocal_rank_fusion(
                        [dense_candidates, bm25_results],
                        k=60,
                        weights=[1.0, 1.0],
                    )
                    # Convert RRF scores to distance-like values (lower=better)
                    # by inverting: max_rrf - rrf_score, so MMR's distance math works.
                    if candidate_docs:
                        max_rrf = candidate_docs[0][2]  # highest RRF score (first item)
                        candidate_docs = [
                            (doc, meta, max_rrf - score + 0.01)
                            for doc, meta, score in candidate_docs
                        ]
                else:
                    candidate_docs = dense_candidates
            else:
                candidate_docs = dense_candidates
        except Exception:
            candidate_docs = dense_candidates
    else:
        candidate_docs = dense_candidates

    # CrossEncoder reranking: rescore candidates for higher-quality ranking
    # before MMR diversity selection (gives MMR better candidates to pick from)
    use_rerank = os.environ.get("ITERATE_RERANK", "1") == "1"
    if use_rerank and reranker_available() and len(candidate_docs) > 1:
        candidate_docs = rerank(query, candidate_docs, top_k=n_results * 2)

    # Apply MMR to select a diverse subset from the candidates
    if use_mmr and ef is not None and len(candidate_docs) > n_results:
        sorted_docs = _mmr_select(candidate_docs, k=n_results, lambda_mult=0.6, ef=ef)
        sorted_docs = sorted(sorted_docs, key=lambda x: (x[1]["iteration"], x[2]))
    else:
        sorted_docs = candidate_docs

    # Group by iteration
    iter_chunks: dict[int, list[tuple[str, dict, float]]] = {}
    for doc, meta, dist in sorted_docs:
        it = meta["iteration"]
        iter_chunks.setdefault(it, []).append((doc, meta, dist))

    sections = []
    for it in sorted(iter_chunks.keys()):
        items = iter_chunks[it]
        # Separate by doc_type: summary, eval, diff, output
        summaries = [d for d, m, _ in items if m.get("doc_type") == "summary"]
        evals = [d for d, m, _ in items if m.get("doc_type") == "eval"]
        diffs = [d for d, m, _ in items if m.get("doc_type") == "diff"]
        outputs = [d for d, m, _ in items if m.get("doc_type") == "output"]

        parts = []
        if summaries:
            parts.append(summaries[0])
        if evals:
            parts.append(evals[0])
        if diffs:
            # Show diff only if it was semantically relevant (first result)
            parts.append(diffs[0])
        if outputs:
            parts.extend(outputs[:2])

        sections.append(f"### Iteration {it}\n" + "\n\n".join(parts))

    context = "\n\n---\n\n".join(sections)

    # Header
    all_iters = sorted(iter_chunks.keys())
    error_iters = sorted({
        it for it, items in iter_chunks.items()
        if any(m.get("has_errors") for _, m, _ in items)
    })

    header = f"**Iterations completed:** {all_iters or 'None'}\n"
    header += f"**Current iteration:** {current_iteration}\n"
    header += f"**Relevant chunks retrieved:** {len(sorted_docs)}\n"
    if error_iters:
        header += f"**Iterations with errors:** {error_iters}\n"

    # Semantic repetition detection: compare the last two completed iterations.
    # High similarity means Claude is producing semantically identical work.
    if current_iteration >= 2:
        sim = compute_iter_similarity(collection, current_iteration - 1, current_iteration - 2)
        if sim is not None:
            header += f"**Output similarity (iter {current_iteration - 1} vs {current_iteration - 2}):** {sim:.2f}\n"
            if sim > 0.88:
                header += (
                    "**WARNING: Outputs are highly similar — you may be repeating prior work. "
                    "Focus on something NEW that is not yet done.**\n"
                )

    # Pin latest eval scores so Claude always sees them, even if not top-ranked by similarity
    latest_eval = _get_latest_eval(collection, current_iteration)
    if latest_eval:
        header += f"\n**Latest eval:**\n{latest_eval}\n"

    header += "\n"

    return header + context


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", type=str, required=True)
    parser.add_argument("--iteration", type=int, required=True)
    parser.add_argument("--n-results", type=int, default=8)
    parser.add_argument("--no-errors", action="store_true")
    parser.add_argument("--no-mmr", action="store_true")
    args = parser.parse_args()

    print(retrieve(
        args.query,
        args.iteration,
        args.n_results,
        include_errors=not args.no_errors,
        use_mmr=not args.no_mmr,
    ))
