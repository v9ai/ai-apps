"""
Embedding-based similarity search for the RL-focused web crawler.

Provides:
1. FlatIndex: brute-force exact nearest neighbor (NumPy-backed, mmap for large N)
2. IVFIndex: inverted file index with K-means clustering (~10x faster for 100K+)
3. LeadPageIndex: index of confirmed lead pages for reward estimation
4. DomainEmbeddingIndex: running-average embeddings per domain + clustering
5. SemanticDeduplicator: detect near-duplicate pages in embedding space
6. SimilarityRewardEstimator: estimate reward for uncrawled URLs via lead similarity

All indices are pure Python + NumPy (no FAISS dependency).
Distance metrics: cosine, euclidean, dot product.

Memory estimates (768-dim float32):
- FlatIndex: 768 * 4 bytes * N entries (~3 MB per 1K entries)
- IVFIndex: same storage + cluster centroids (~0.8 MB for 256 clusters)
- LeadPageIndex: FlatIndex + reward array (~3.004 MB per 1K entries)
- DomainEmbeddingIndex: ~3 KB per domain

Target: Apple M1 16GB, zero cloud dependency.
"""

import logging
import os
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_similarity")


# ======================= Configuration ======================================

@dataclass
class SimilarityConfig:
    """Configuration for similarity search indices."""

    # Persistence
    index_path: str = "scrapus_data/similarity_index"

    # Capacity
    max_entries: int = 100_000

    # Embedding dimensions (matches nomic-embed-text-v1.5)
    embedding_dim: int = 768

    # IVF index parameters
    n_clusters: int = 256       # number of Voronoi cells
    n_probe: int = 16           # cells to search at query time

    # Distance metric: "cosine", "euclidean", "dot"
    distance_metric: str = "cosine"


# ======================= Distance Functions =================================

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Cosine similarity between a single query (D,) and a matrix (N, D).

    Returns (N,) array of similarities in [-1, 1]. Higher = more similar.
    """
    norm_a = np.linalg.norm(a)
    norms_b = np.linalg.norm(b, axis=1)
    # Guard against zero-norm vectors
    denom = np.maximum(norm_a * norms_b, 1e-12)
    return b @ a / denom


def _euclidean_distance(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Euclidean distance between a single query (D,) and a matrix (N, D).

    Returns (N,) array of distances. Lower = more similar.
    """
    diff = b - a[np.newaxis, :]
    return np.sqrt(np.sum(diff * diff, axis=1))


def _dot_product(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Dot product between a single query (D,) and a matrix (N, D).

    Returns (N,) array. Higher = more similar.
    """
    return b @ a


def _compute_similarity(
    query: np.ndarray,
    embeddings: np.ndarray,
    metric: str,
) -> np.ndarray:
    """Compute similarity/distance between query and all embeddings.

    For cosine and dot: higher = more similar (returned as similarity).
    For euclidean: lower = more similar (returned as negative distance for
    consistent "higher is better" ranking).
    """
    if metric == "cosine":
        return _cosine_similarity(query, embeddings)
    elif metric == "euclidean":
        # Negate so that higher = closer (consistent top-k selection)
        return -_euclidean_distance(query, embeddings)
    elif metric == "dot":
        return _dot_product(query, embeddings)
    else:
        raise ValueError(f"Unknown distance metric: {metric}")


# ======================= FlatIndex ==========================================

class FlatIndex:
    """Brute-force exact nearest neighbor search.

    NumPy-backed with optional mmap for large collections. Good for < 10K
    entries where the simplicity of exact search outweighs the cost.

    Memory: embedding_dim * 4 bytes * N entries (~3 MB per 1K at 768-dim).
    """

    def __init__(
        self,
        config: Optional[SimilarityConfig] = None,
        use_mmap: bool = False,
    ) -> None:
        self.config = config or SimilarityConfig()
        self._use_mmap = use_mmap
        self._lock = threading.Lock()

        # In-memory storage
        self._ids: List[str] = []
        self._embeddings: Optional[np.ndarray] = None  # (N, D)
        self._count = 0

        # Mmap file paths
        self._mmap_dir = os.path.join(self.config.index_path, "flat")
        self._mmap_embeddings: Optional[np.memmap] = None

        if use_mmap:
            self._init_mmap()

    def _init_mmap(self) -> None:
        """Initialise memory-mapped storage for large collections."""
        os.makedirs(self._mmap_dir, exist_ok=True)
        mmap_path = os.path.join(self._mmap_dir, "embeddings.dat")

        if os.path.exists(mmap_path):
            # Load existing mmap
            self._mmap_embeddings = np.memmap(
                mmap_path,
                dtype=np.float32,
                mode="r+",
                shape=(self.config.max_entries, self.config.embedding_dim),
            )
            # Load metadata
            ids_path = os.path.join(self._mmap_dir, "ids.txt")
            if os.path.exists(ids_path):
                with open(ids_path, "r", encoding="utf-8") as f:
                    self._ids = [line.strip() for line in f if line.strip()]
                self._count = len(self._ids)
            logger.info(
                "Loaded mmap FlatIndex: %d entries from %s",
                self._count, mmap_path,
            )
        else:
            self._mmap_embeddings = np.memmap(
                mmap_path,
                dtype=np.float32,
                mode="w+",
                shape=(self.config.max_entries, self.config.embedding_dim),
            )
            logger.info("Created mmap FlatIndex at %s", mmap_path)

    @property
    def size(self) -> int:
        """Number of entries in the index."""
        return self._count

    def add(self, entry_id: str, embedding: np.ndarray) -> None:
        """Add a single entry to the index.

        Args:
            entry_id: unique identifier for the entry.
            embedding: (embedding_dim,) float32 vector.
        """
        if embedding.shape != (self.config.embedding_dim,):
            raise ValueError(
                f"Expected ({self.config.embedding_dim},) embedding, "
                f"got {embedding.shape}"
            )

        with self._lock:
            if self._count >= self.config.max_entries:
                logger.warning(
                    "FlatIndex at capacity (%d), dropping oldest entry",
                    self.config.max_entries,
                )
                self._ids.pop(0)
                if self._use_mmap and self._mmap_embeddings is not None:
                    self._mmap_embeddings[:-1] = self._mmap_embeddings[1:]
                    self._count -= 1
                elif self._embeddings is not None:
                    self._embeddings = self._embeddings[1:]
                    self._count -= 1

            if self._use_mmap and self._mmap_embeddings is not None:
                self._mmap_embeddings[self._count] = embedding.astype(
                    np.float32
                )
            else:
                if self._embeddings is None:
                    self._embeddings = embedding.reshape(
                        1, -1
                    ).astype(np.float32)
                else:
                    self._embeddings = np.vstack(
                        [self._embeddings, embedding.reshape(1, -1)]
                    )

            self._ids.append(entry_id)
            self._count += 1

    def add_batch(
        self, ids: List[str], embeddings: np.ndarray
    ) -> None:
        """Add a batch of entries.

        Args:
            ids: list of unique identifiers.
            embeddings: (N, embedding_dim) float32 array.
        """
        for i, entry_id in enumerate(ids):
            self.add(entry_id, embeddings[i])

    def search(
        self,
        query: np.ndarray,
        k: int = 10,
    ) -> List[Tuple[str, float]]:
        """Find k nearest neighbors to the query embedding.

        Args:
            query: (embedding_dim,) float32 vector.
            k: number of results to return.

        Returns:
            List of (id, similarity_score) tuples, sorted by descending
            similarity (or ascending distance for euclidean).
        """
        if self._count == 0:
            return []

        with self._lock:
            if self._use_mmap and self._mmap_embeddings is not None:
                embeddings = self._mmap_embeddings[: self._count]
            else:
                embeddings = self._embeddings

            if embeddings is None:
                return []

            scores = _compute_similarity(
                query, embeddings, self.config.distance_metric
            )

            # Top-k (higher is better after our metric normalisation)
            k = min(k, self._count)
            top_indices = np.argpartition(scores, -k)[-k:]
            top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

            return [
                (self._ids[idx], float(scores[idx]))
                for idx in top_indices
            ]

    def save(self) -> None:
        """Persist index to disk."""
        os.makedirs(self._mmap_dir, exist_ok=True)

        if self._use_mmap and self._mmap_embeddings is not None:
            self._mmap_embeddings.flush()
        elif self._embeddings is not None:
            emb_path = os.path.join(self._mmap_dir, "embeddings.npy")
            np.save(emb_path, self._embeddings[: self._count])

        ids_path = os.path.join(self._mmap_dir, "ids.txt")
        with open(ids_path, "w", encoding="utf-8") as f:
            for entry_id in self._ids:
                f.write(entry_id + "\n")

        logger.info("FlatIndex saved: %d entries to %s", self._count, self._mmap_dir)

    def load(self) -> None:
        """Load index from disk."""
        if self._use_mmap:
            # Mmap is loaded on init
            return

        emb_path = os.path.join(self._mmap_dir, "embeddings.npy")
        ids_path = os.path.join(self._mmap_dir, "ids.txt")

        if os.path.exists(emb_path) and os.path.exists(ids_path):
            self._embeddings = np.load(emb_path).astype(np.float32)
            with open(ids_path, "r", encoding="utf-8") as f:
                self._ids = [line.strip() for line in f if line.strip()]
            self._count = len(self._ids)
            logger.info("FlatIndex loaded: %d entries from %s", self._count, emb_path)
        else:
            logger.info("No saved FlatIndex found at %s", self._mmap_dir)

    def clear(self) -> None:
        """Remove all entries from the index."""
        with self._lock:
            self._ids.clear()
            self._embeddings = None
            self._count = 0
            if self._mmap_embeddings is not None:
                self._mmap_embeddings[:] = 0.0

    def estimated_memory_mb(self) -> float:
        """Estimate memory usage in MB."""
        if self._use_mmap:
            # Mmap pages in on demand; estimate resident set as ~10%
            total_bytes = (
                self._count * self.config.embedding_dim * 4
            )
            return (total_bytes * 0.1) / (1024 * 1024)
        return (
            self._count * self.config.embedding_dim * 4
        ) / (1024 * 1024)


# ======================= IVFIndex ===========================================

class IVFIndex:
    """Inverted file index with K-means clustering for approximate NN search.

    Partitions the embedding space into n_clusters Voronoi cells. At query
    time, only the n_probe nearest cells are searched, giving ~10x speedup
    over brute force for 100K+ entries.

    Train on a representative sample before adding entries.
    Memory: embeddings + centroids (~0.8 MB for 256 clusters at 768-dim).
    """

    def __init__(self, config: Optional[SimilarityConfig] = None) -> None:
        self.config = config or SimilarityConfig()
        self._lock = threading.Lock()

        # Cluster centroids: (n_clusters, embedding_dim)
        self._centroids: Optional[np.ndarray] = None
        self._is_trained = False

        # Inverted lists: cluster_id -> list of (id, embedding)
        self._inverted_lists: Dict[int, List[Tuple[str, np.ndarray]]] = {}
        self._total_entries = 0

        # Persistence directory
        self._save_dir = os.path.join(self.config.index_path, "ivf")

    @property
    def is_trained(self) -> bool:
        return self._is_trained

    @property
    def size(self) -> int:
        return self._total_entries

    def train(
        self,
        embeddings: np.ndarray,
        max_iterations: int = 50,
        tolerance: float = 1e-4,
    ) -> None:
        """Train K-means clustering on a representative sample.

        Should be called with a representative subset of embeddings before
        adding entries. Typical sample size: 10x n_clusters.

        Args:
            embeddings: (N, embedding_dim) float32 array.
            max_iterations: maximum K-means iterations.
            tolerance: convergence threshold (centroid shift).
        """
        n_samples = embeddings.shape[0]
        n_clusters = min(self.config.n_clusters, n_samples)

        logger.info(
            "Training IVFIndex: %d samples, %d clusters, max %d iterations",
            n_samples, n_clusters, max_iterations,
        )

        # Initialise centroids via K-means++ style (pick spread-out seeds)
        centroids = self._kmeans_plusplus_init(embeddings, n_clusters)

        for iteration in range(max_iterations):
            # Assign each embedding to its nearest centroid
            # (N, n_clusters) similarity matrix
            if self.config.distance_metric == "cosine":
                # Normalise for cosine
                emb_norm = embeddings / np.maximum(
                    np.linalg.norm(embeddings, axis=1, keepdims=True), 1e-12
                )
                cent_norm = centroids / np.maximum(
                    np.linalg.norm(centroids, axis=1, keepdims=True), 1e-12
                )
                sims = emb_norm @ cent_norm.T
                assignments = np.argmax(sims, axis=1)
            else:
                # Euclidean: use squared distances for efficiency
                # (N, 1, D) - (1, K, D) -> (N, K, D)
                diffs = (
                    embeddings[:, np.newaxis, :]
                    - centroids[np.newaxis, :, :]
                )
                dists_sq = np.sum(diffs * diffs, axis=2)
                assignments = np.argmin(dists_sq, axis=1)

            # Update centroids
            new_centroids = np.zeros_like(centroids)
            for c in range(n_clusters):
                mask = assignments == c
                if np.any(mask):
                    new_centroids[c] = embeddings[mask].mean(axis=0)
                else:
                    # Dead cluster: reinitialise to a random sample
                    new_centroids[c] = embeddings[
                        np.random.randint(n_samples)
                    ]

            # Check convergence
            shift = np.linalg.norm(new_centroids - centroids)
            centroids = new_centroids

            if shift < tolerance:
                logger.info(
                    "K-means converged at iteration %d (shift=%.6f)",
                    iteration + 1, shift,
                )
                break

        self._centroids = centroids.astype(np.float32)
        self._is_trained = True
        self._inverted_lists = {c: [] for c in range(n_clusters)}
        logger.info("IVFIndex trained: %d clusters", n_clusters)

    def _kmeans_plusplus_init(
        self, embeddings: np.ndarray, n_clusters: int
    ) -> np.ndarray:
        """K-means++ initialisation for spread-out centroid seeds."""
        n_samples = embeddings.shape[0]
        centroids = np.zeros(
            (n_clusters, self.config.embedding_dim), dtype=np.float32
        )

        # First centroid: random sample
        idx = np.random.randint(n_samples)
        centroids[0] = embeddings[idx]

        for c in range(1, n_clusters):
            # Compute squared distances to nearest existing centroid
            dists = np.full(n_samples, np.inf)
            for j in range(c):
                d = np.sum(
                    (embeddings - centroids[j][np.newaxis, :]) ** 2, axis=1
                )
                dists = np.minimum(dists, d)

            # Sample proportional to distance squared
            probs = dists / (dists.sum() + 1e-12)
            idx = np.random.choice(n_samples, p=probs)
            centroids[c] = embeddings[idx]

        return centroids

    def _assign_cluster(self, embedding: np.ndarray) -> int:
        """Assign a single embedding to its nearest centroid."""
        if self._centroids is None:
            raise RuntimeError("IVFIndex not trained; call train() first")

        scores = _compute_similarity(
            embedding, self._centroids, self.config.distance_metric
        )
        return int(np.argmax(scores))

    def _find_probe_clusters(
        self, query: np.ndarray, n_probe: int
    ) -> List[int]:
        """Find the n_probe nearest clusters to the query."""
        if self._centroids is None:
            raise RuntimeError("IVFIndex not trained; call train() first")

        scores = _compute_similarity(
            query, self._centroids, self.config.distance_metric
        )
        n_probe = min(n_probe, len(self._centroids))
        top_indices = np.argpartition(scores, -n_probe)[-n_probe:]
        return top_indices.tolist()

    def add(self, entry_id: str, embedding: np.ndarray) -> None:
        """Add a single entry to the index.

        The embedding is assigned to its nearest cluster.

        Args:
            entry_id: unique identifier.
            embedding: (embedding_dim,) float32 vector.
        """
        if not self._is_trained:
            raise RuntimeError("IVFIndex not trained; call train() first")

        cluster_id = self._assign_cluster(embedding)

        with self._lock:
            if cluster_id not in self._inverted_lists:
                self._inverted_lists[cluster_id] = []
            self._inverted_lists[cluster_id].append(
                (entry_id, embedding.astype(np.float32))
            )
            self._total_entries += 1

    def add_batch(
        self, ids: List[str], embeddings: np.ndarray
    ) -> None:
        """Add a batch of entries.

        Args:
            ids: list of unique identifiers.
            embeddings: (N, embedding_dim) float32 array.
        """
        for i, entry_id in enumerate(ids):
            self.add(entry_id, embeddings[i])

    def search(
        self,
        query: np.ndarray,
        k: int = 10,
        n_probe: Optional[int] = None,
    ) -> List[Tuple[str, float]]:
        """Approximate nearest neighbor search.

        Searches only the n_probe nearest clusters for speed.

        Args:
            query: (embedding_dim,) float32 vector.
            k: number of results to return.
            n_probe: number of clusters to probe (defaults to config.n_probe).

        Returns:
            List of (id, similarity_score) tuples, sorted best-first.
        """
        if not self._is_trained:
            raise RuntimeError("IVFIndex not trained; call train() first")

        if n_probe is None:
            n_probe = self.config.n_probe

        probe_clusters = self._find_probe_clusters(query, n_probe)

        # Collect candidates from probed clusters
        candidate_ids: List[str] = []
        candidate_embeddings: List[np.ndarray] = []

        with self._lock:
            for cluster_id in probe_clusters:
                entries = self._inverted_lists.get(cluster_id, [])
                for entry_id, embedding in entries:
                    candidate_ids.append(entry_id)
                    candidate_embeddings.append(embedding)

        if not candidate_ids:
            return []

        candidate_matrix = np.array(candidate_embeddings, dtype=np.float32)
        scores = _compute_similarity(
            query, candidate_matrix, self.config.distance_metric
        )

        k = min(k, len(candidate_ids))
        top_indices = np.argpartition(scores, -k)[-k:]
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

        return [
            (candidate_ids[idx], float(scores[idx]))
            for idx in top_indices
        ]

    def save(self) -> None:
        """Persist the IVF index to disk."""
        os.makedirs(self._save_dir, exist_ok=True)

        if self._centroids is not None:
            np.save(
                os.path.join(self._save_dir, "centroids.npy"),
                self._centroids,
            )

        # Save inverted lists as a flat file: (cluster_id, entry_id, embedding)
        all_ids: List[str] = []
        all_embeddings: List[np.ndarray] = []
        all_cluster_ids: List[int] = []

        for cluster_id, entries in self._inverted_lists.items():
            for entry_id, embedding in entries:
                all_ids.append(entry_id)
                all_embeddings.append(embedding)
                all_cluster_ids.append(cluster_id)

        if all_embeddings:
            np.save(
                os.path.join(self._save_dir, "embeddings.npy"),
                np.array(all_embeddings, dtype=np.float32),
            )
            np.save(
                os.path.join(self._save_dir, "cluster_ids.npy"),
                np.array(all_cluster_ids, dtype=np.int32),
            )
            with open(
                os.path.join(self._save_dir, "ids.txt"),
                "w",
                encoding="utf-8",
            ) as f:
                for entry_id in all_ids:
                    f.write(entry_id + "\n")

        logger.info(
            "IVFIndex saved: %d entries, %d clusters to %s",
            self._total_entries,
            len(self._inverted_lists),
            self._save_dir,
        )

    def load(self) -> None:
        """Load the IVF index from disk."""
        centroids_path = os.path.join(self._save_dir, "centroids.npy")
        embeddings_path = os.path.join(self._save_dir, "embeddings.npy")
        cluster_ids_path = os.path.join(self._save_dir, "cluster_ids.npy")
        ids_path = os.path.join(self._save_dir, "ids.txt")

        if not os.path.exists(centroids_path):
            logger.info("No saved IVFIndex found at %s", self._save_dir)
            return

        self._centroids = np.load(centroids_path).astype(np.float32)
        self._is_trained = True
        n_clusters = self._centroids.shape[0]
        self._inverted_lists = {c: [] for c in range(n_clusters)}

        if os.path.exists(embeddings_path) and os.path.exists(ids_path):
            embeddings = np.load(embeddings_path).astype(np.float32)
            cluster_ids = np.load(cluster_ids_path).astype(np.int32)
            with open(ids_path, "r", encoding="utf-8") as f:
                ids = [line.strip() for line in f if line.strip()]

            for i, entry_id in enumerate(ids):
                c = int(cluster_ids[i])
                if c not in self._inverted_lists:
                    self._inverted_lists[c] = []
                self._inverted_lists[c].append((entry_id, embeddings[i]))

            self._total_entries = len(ids)

        logger.info(
            "IVFIndex loaded: %d entries, %d clusters from %s",
            self._total_entries, n_clusters, self._save_dir,
        )

    def clear(self) -> None:
        """Remove all entries (keeps trained centroids)."""
        with self._lock:
            for c in self._inverted_lists:
                self._inverted_lists[c] = []
            self._total_entries = 0

    def cluster_stats(self) -> Dict[str, int]:
        """Return per-cluster entry counts for debugging imbalance."""
        stats: Dict[str, int] = {}
        with self._lock:
            for c, entries in self._inverted_lists.items():
                stats[f"cluster_{c}"] = len(entries)
        return stats

    def estimated_memory_mb(self) -> float:
        """Estimate memory usage in MB."""
        centroid_bytes = 0
        if self._centroids is not None:
            centroid_bytes = self._centroids.nbytes

        entry_bytes = self._total_entries * self.config.embedding_dim * 4
        # IDs: ~100 bytes per entry average (URL strings)
        id_bytes = self._total_entries * 100

        return (centroid_bytes + entry_bytes + id_bytes) / (1024 * 1024)


# ======================= LeadPageIndex ======================================

class LeadPageIndex:
    """Index of confirmed lead pages (positive reward signals).

    Stores page embeddings alongside their observed rewards so that
    similarity to known leads can be used as a reward estimation signal
    for unvisited pages.

    "Is this page similar to pages that previously yielded leads?"
    """

    def __init__(
        self,
        config: Optional[SimilarityConfig] = None,
    ) -> None:
        self.config = config or SimilarityConfig()
        self._index = FlatIndex(config=self.config)
        self._rewards: Dict[str, float] = {}
        self._lock = threading.Lock()

    @property
    def size(self) -> int:
        return self._index.size

    def add_lead_page(
        self, url: str, embedding: np.ndarray, reward: float
    ) -> None:
        """Record a confirmed lead page with its embedding and reward.

        Args:
            url: the lead page URL (used as ID).
            embedding: (embedding_dim,) float32 vector.
            reward: observed reward for this page (e.g. 1.0 for lead).
        """
        with self._lock:
            self._index.add(url, embedding)
            self._rewards[url] = reward

    def find_similar(
        self, embedding: np.ndarray, k: int = 5
    ) -> List[Tuple[str, float, float]]:
        """Find the k most similar known lead pages.

        Args:
            embedding: (embedding_dim,) query vector.
            k: number of results.

        Returns:
            List of (url, similarity_score, reward) tuples, sorted by
            descending similarity.
        """
        results = self._index.search(embedding, k=k)
        enriched: List[Tuple[str, float, float]] = []
        with self._lock:
            for url, score in results:
                reward = self._rewards.get(url, 0.0)
                enriched.append((url, score, reward))
        return enriched

    def save(self) -> None:
        """Persist lead page index and rewards to disk."""
        self._index.save()
        rewards_path = os.path.join(
            self.config.index_path, "flat", "lead_rewards.npy"
        )
        # Save as structured array: [(url_hash, reward), ...]
        if self._rewards:
            reward_data = np.array(
                [(k, v) for k, v in self._rewards.items()],
                dtype=[("url", "U512"), ("reward", np.float32)],
            )
            np.save(rewards_path, reward_data)
        logger.info("LeadPageIndex saved: %d entries", self.size)

    def load(self) -> None:
        """Load lead page index and rewards from disk."""
        self._index.load()
        rewards_path = os.path.join(
            self.config.index_path, "flat", "lead_rewards.npy"
        )
        if os.path.exists(rewards_path):
            reward_data = np.load(rewards_path, allow_pickle=True)
            with self._lock:
                self._rewards = {
                    str(row["url"]): float(row["reward"])
                    for row in reward_data
                }
        logger.info("LeadPageIndex loaded: %d entries", self.size)

    def clear(self) -> None:
        """Remove all lead page entries."""
        with self._lock:
            self._index.clear()
            self._rewards.clear()


# ======================= DomainEmbeddingIndex ===============================

class DomainEmbeddingIndex:
    """Running-average embedding per domain, with domain-level clustering.

    Maintains a single representative embedding per domain (the running
    mean of all page embeddings from that domain). Useful for:
    - Domain-to-domain similarity search
    - Grouping similar domains into clusters
    - Predicting domain value from similar known domains
    """

    def __init__(
        self,
        config: Optional[SimilarityConfig] = None,
    ) -> None:
        self.config = config or SimilarityConfig()
        self._lock = threading.Lock()

        # domain -> (running_average_embedding, page_count)
        self._domains: Dict[str, Tuple[np.ndarray, int]] = {}

    @property
    def size(self) -> int:
        """Number of tracked domains."""
        return len(self._domains)

    def update_domain(
        self, domain: str, page_embedding: np.ndarray
    ) -> None:
        """Update the running average embedding for a domain.

        Uses incremental mean: new_mean = old_mean + (x - old_mean) / n

        Args:
            domain: the domain name (e.g. "example.com").
            page_embedding: (embedding_dim,) float32 vector from a page on
                this domain.
        """
        with self._lock:
            if domain in self._domains:
                current_mean, count = self._domains[domain]
                count += 1
                # Incremental mean update (numerically stable)
                new_mean = current_mean + (
                    page_embedding - current_mean
                ) / count
                self._domains[domain] = (
                    new_mean.astype(np.float32),
                    count,
                )
            else:
                self._domains[domain] = (
                    page_embedding.astype(np.float32).copy(),
                    1,
                )

    def get_domain_embedding(
        self, domain: str
    ) -> Optional[np.ndarray]:
        """Get the current average embedding for a domain.

        Returns None if the domain has not been seen.
        """
        with self._lock:
            if domain in self._domains:
                return self._domains[domain][0].copy()
            return None

    def get_domain_page_count(self, domain: str) -> int:
        """Number of pages seen from a domain."""
        with self._lock:
            if domain in self._domains:
                return self._domains[domain][1]
            return 0

    def find_similar_domains(
        self, domain: str, k: int = 10
    ) -> List[Tuple[str, float]]:
        """Find the k most similar domains to the given domain.

        Args:
            domain: the query domain (must already be in the index).
            k: number of results.

        Returns:
            List of (domain, similarity_score) tuples, excluding the
            query domain itself. Sorted by descending similarity.
        """
        with self._lock:
            if domain not in self._domains:
                return []

            query_emb = self._domains[domain][0]
            other_domains: List[str] = []
            other_embeddings: List[np.ndarray] = []

            for d, (emb, _count) in self._domains.items():
                if d != domain:
                    other_domains.append(d)
                    other_embeddings.append(emb)

        if not other_domains:
            return []

        other_matrix = np.array(other_embeddings, dtype=np.float32)
        scores = _compute_similarity(
            query_emb, other_matrix, self.config.distance_metric
        )

        k = min(k, len(other_domains))
        top_indices = np.argpartition(scores, -k)[-k:]
        top_indices = top_indices[np.argsort(scores[top_indices])[::-1]]

        return [
            (other_domains[idx], float(scores[idx]))
            for idx in top_indices
        ]

    def get_clusters(
        self, n_clusters: int = 20
    ) -> List[List[str]]:
        """Cluster domains by embedding similarity using K-means.

        Args:
            n_clusters: number of clusters.

        Returns:
            List of clusters, each a list of domain names.
        """
        with self._lock:
            domains = list(self._domains.keys())
            if len(domains) < n_clusters:
                # Too few domains for requested cluster count
                return [[d] for d in domains]

            embeddings = np.array(
                [self._domains[d][0] for d in domains], dtype=np.float32
            )

        # Simple K-means clustering
        n_clusters = min(n_clusters, len(domains))

        # Random centroid initialisation
        indices = np.random.choice(
            len(domains), size=n_clusters, replace=False
        )
        centroids = embeddings[indices].copy()

        for _iteration in range(30):
            # Assign to nearest centroid
            if self.config.distance_metric == "cosine":
                emb_norm = embeddings / np.maximum(
                    np.linalg.norm(embeddings, axis=1, keepdims=True), 1e-12
                )
                cent_norm = centroids / np.maximum(
                    np.linalg.norm(centroids, axis=1, keepdims=True), 1e-12
                )
                sims = emb_norm @ cent_norm.T
                assignments = np.argmax(sims, axis=1)
            else:
                diffs = (
                    embeddings[:, np.newaxis, :]
                    - centroids[np.newaxis, :, :]
                )
                dists_sq = np.sum(diffs * diffs, axis=2)
                assignments = np.argmin(dists_sq, axis=1)

            # Update centroids
            new_centroids = np.zeros_like(centroids)
            for c in range(n_clusters):
                mask = assignments == c
                if np.any(mask):
                    new_centroids[c] = embeddings[mask].mean(axis=0)
                else:
                    new_centroids[c] = embeddings[
                        np.random.randint(len(domains))
                    ]

            shift = np.linalg.norm(new_centroids - centroids)
            centroids = new_centroids
            if shift < 1e-4:
                break

        # Build cluster lists
        clusters: List[List[str]] = [[] for _ in range(n_clusters)]
        for i, assignment in enumerate(assignments):
            clusters[assignment].append(domains[i])

        # Filter out empty clusters
        return [c for c in clusters if c]

    def save(self, path: Optional[str] = None) -> None:
        """Persist domain embeddings to disk."""
        save_dir = path or os.path.join(
            self.config.index_path, "domains"
        )
        os.makedirs(save_dir, exist_ok=True)

        with self._lock:
            domains = list(self._domains.keys())
            if not domains:
                logger.info("No domains to save")
                return

            embeddings = np.array(
                [self._domains[d][0] for d in domains], dtype=np.float32
            )
            counts = np.array(
                [self._domains[d][1] for d in domains], dtype=np.int32
            )

        np.save(os.path.join(save_dir, "embeddings.npy"), embeddings)
        np.save(os.path.join(save_dir, "counts.npy"), counts)
        with open(
            os.path.join(save_dir, "domains.txt"), "w", encoding="utf-8"
        ) as f:
            for domain in domains:
                f.write(domain + "\n")

        logger.info(
            "DomainEmbeddingIndex saved: %d domains to %s",
            len(domains), save_dir,
        )

    def load(self, path: Optional[str] = None) -> None:
        """Load domain embeddings from disk."""
        save_dir = path or os.path.join(
            self.config.index_path, "domains"
        )
        emb_path = os.path.join(save_dir, "embeddings.npy")
        counts_path = os.path.join(save_dir, "counts.npy")
        domains_path = os.path.join(save_dir, "domains.txt")

        if not os.path.exists(emb_path):
            logger.info("No saved DomainEmbeddingIndex found at %s", save_dir)
            return

        embeddings = np.load(emb_path).astype(np.float32)
        counts = np.load(counts_path).astype(np.int32)
        with open(domains_path, "r", encoding="utf-8") as f:
            domains = [line.strip() for line in f if line.strip()]

        with self._lock:
            self._domains.clear()
            for i, domain in enumerate(domains):
                self._domains[domain] = (embeddings[i], int(counts[i]))

        logger.info(
            "DomainEmbeddingIndex loaded: %d domains from %s",
            len(domains), save_dir,
        )

    def clear(self) -> None:
        """Remove all domain entries."""
        with self._lock:
            self._domains.clear()


# ======================= SemanticDeduplicator ================================

class SemanticDeduplicator:
    """Detect semantically similar (near-duplicate) pages in embedding space.

    Unlike URL-based or SimHash deduplication, this catches paraphrased or
    templated content where the surface text differs but the semantic
    meaning is effectively identical.

    Maintains a rolling window of recent page embeddings. For each new page,
    checks if any existing page exceeds the similarity threshold.
    """

    def __init__(
        self,
        config: Optional[SimilarityConfig] = None,
        threshold: float = 0.95,
        max_history: int = 50_000,
    ) -> None:
        """
        Args:
            config: similarity configuration.
            threshold: cosine similarity threshold for duplicate detection.
                0.95 catches near-duplicates while allowing related-but-distinct
                pages through.
            max_history: maximum number of embeddings to retain. Older entries
                are dropped (FIFO) to bound memory.
        """
        self.config = config or SimilarityConfig()
        self.threshold = threshold
        self.max_history = max_history
        self._lock = threading.Lock()

        self._urls: List[str] = []
        self._embeddings: Optional[np.ndarray] = None
        self._count = 0
        self._duplicates_found = 0

    @property
    def size(self) -> int:
        return self._count

    @property
    def duplicates_found(self) -> int:
        return self._duplicates_found

    def is_semantically_duplicate(
        self,
        embedding: np.ndarray,
        url: Optional[str] = None,
        threshold: Optional[float] = None,
    ) -> Optional[str]:
        """Check if an embedding is a near-duplicate of any stored page.

        If a duplicate is found, returns the URL of the most similar existing
        page. Otherwise returns None and adds the embedding to the history.

        Args:
            embedding: (embedding_dim,) float32 vector for the new page.
            url: URL of the new page (stored if not a duplicate).
            threshold: override the default similarity threshold.

        Returns:
            URL of the duplicate page if found, None otherwise.
        """
        thresh = threshold if threshold is not None else self.threshold

        with self._lock:
            if self._count > 0 and self._embeddings is not None:
                scores = _compute_similarity(
                    embedding,
                    self._embeddings[: self._count],
                    "cosine",  # Always use cosine for dedup
                )
                max_idx = int(np.argmax(scores))
                max_score = float(scores[max_idx])

                if max_score >= thresh:
                    self._duplicates_found += 1
                    return self._urls[max_idx]

            # Not a duplicate: add to history
            self._add_to_history(url or f"page_{self._count}", embedding)

        return None

    def _add_to_history(
        self, url: str, embedding: np.ndarray
    ) -> None:
        """Add an embedding to the history buffer (called under lock)."""
        if self._embeddings is None:
            # Pre-allocate buffer
            self._embeddings = np.zeros(
                (self.max_history, self.config.embedding_dim),
                dtype=np.float32,
            )

        if self._count >= self.max_history:
            # FIFO: shift everything left by 1 (drop oldest)
            self._embeddings[:-1] = self._embeddings[1:]
            self._urls.pop(0)
            self._count -= 1

        self._embeddings[self._count] = embedding.astype(np.float32)
        self._urls.append(url)
        self._count += 1

    def stats(self) -> Dict[str, int]:
        """Return deduplication statistics."""
        return {
            "history_size": self._count,
            "duplicates_found": self._duplicates_found,
            "max_history": self.max_history,
        }

    def clear(self) -> None:
        """Clear all history."""
        with self._lock:
            self._urls.clear()
            self._embeddings = None
            self._count = 0
            self._duplicates_found = 0

    def estimated_memory_mb(self) -> float:
        """Estimate memory usage in MB."""
        if self._embeddings is not None:
            return self._embeddings.nbytes / (1024 * 1024)
        return 0.0


# ======================= SimilarityRewardEstimator ==========================

class SimilarityRewardEstimator:
    """Estimate expected reward for uncrawled URLs based on lead similarity.

    Uses the LeadPageIndex to find pages similar to the query embedding,
    then computes a weighted average of their rewards as a proxy signal.

    This can be used as a potential function for reward shaping (Ng et al.
    1999) or as a soft prior for frontier prioritisation.

    Estimation formula:
        estimated_reward = sum(similarity_i * reward_i) / sum(similarity_i)

    Only considers neighbors with similarity above min_similarity to avoid
    noise from unrelated pages.
    """

    def __init__(
        self,
        lead_index: LeadPageIndex,
        k: int = 5,
        min_similarity: float = 0.3,
        decay: float = 1.0,
    ) -> None:
        """
        Args:
            lead_index: index of confirmed lead pages.
            k: number of neighbors to consider.
            min_similarity: ignore neighbors below this similarity.
            decay: exponential decay applied to similarity weights. 1.0 = no
                decay (linear weighting). > 1.0 = sharper (emphasises top match).
        """
        self._lead_index = lead_index
        self._k = k
        self._min_similarity = min_similarity
        self._decay = decay

        # Running statistics for calibration
        self._estimates: List[float] = []
        self._max_estimates = 10_000

    def estimate_reward(self, page_embedding: np.ndarray) -> float:
        """Estimate the expected reward for a page based on lead similarity.

        Args:
            page_embedding: (embedding_dim,) float32 vector.

        Returns:
            Estimated reward in [0, max_lead_reward]. Returns 0.0 if no
            similar leads are found.
        """
        if self._lead_index.size == 0:
            return 0.0

        neighbors = self._lead_index.find_similar(
            page_embedding, k=self._k
        )

        # Filter by minimum similarity
        filtered = [
            (url, sim, reward)
            for url, sim, reward in neighbors
            if sim >= self._min_similarity
        ]

        if not filtered:
            return 0.0

        # Weighted average: weight = similarity^decay
        total_weight = 0.0
        weighted_reward = 0.0
        for _url, sim, reward in filtered:
            weight = sim ** self._decay
            weighted_reward += weight * reward
            total_weight += weight

        estimate = weighted_reward / max(total_weight, 1e-12)

        # Track for calibration stats
        if len(self._estimates) < self._max_estimates:
            self._estimates.append(estimate)

        return estimate

    def estimate_batch(
        self, embeddings: np.ndarray
    ) -> np.ndarray:
        """Estimate rewards for a batch of page embeddings.

        Args:
            embeddings: (N, embedding_dim) float32 array.

        Returns:
            (N,) float32 array of estimated rewards.
        """
        return np.array(
            [self.estimate_reward(emb) for emb in embeddings],
            dtype=np.float32,
        )

    def stats(self) -> Dict[str, float]:
        """Return estimation statistics for monitoring."""
        if not self._estimates:
            return {
                "count": 0,
                "mean": 0.0,
                "std": 0.0,
                "min": 0.0,
                "max": 0.0,
                "nonzero_ratio": 0.0,
            }

        arr = np.array(self._estimates)
        nonzero = np.count_nonzero(arr)
        return {
            "count": len(self._estimates),
            "mean": float(np.mean(arr)),
            "std": float(np.std(arr)),
            "min": float(np.min(arr)),
            "max": float(np.max(arr)),
            "nonzero_ratio": nonzero / len(self._estimates),
        }

    def reset_stats(self) -> None:
        """Reset running estimation statistics."""
        self._estimates.clear()
