# /Users/vadimnicolai/Public/ai-apps/apps/lead-gen/scrapus/advanced_retrieval.py

"""
Advanced Retrieval Pipeline for Scrapus M1 Local Deployment
Implements: Cross-encoder reranking + MMR diversity + Hybrid retrieval + RRF

Architecture:
  BM25 (sparse) → RRF → MMR diversity → Cross-encoder reranking → Cached results
  Embeddings (dense) ↘       ↗
  
M1 Memory: 4.7 GB (LLM) + 0.57 GB (reranker) = 5.27 GB peak
Lazy loading: Load reranker only during retrieval, unload before LLM generation

Components:
  1. BGE Reranker v2-m3 with lazy loading
  2. Maximal Marginal Relevance (MMR) for diversity
  3. Hybrid pipeline: BM25 + embedding + reranker
  4. Reciprocal Rank Fusion for combining results
  5. Document deduplication (near-duplicate detection)
  6. Result caching for same company across reports
  7. Multi-reranker comparison framework
  8. Precision@5 benchmarking
"""

import json
import sqlite3
import logging
import gc
import hashlib
import pickle
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict
import time
import re

import numpy as np
from sentence_transformers import CrossEncoder
import lancedb


# ============================================================================
# LOGGING CONFIGURATION
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class RetrievalDocument:
    """Represents a document in the retrieval pipeline."""
    doc_id: str
    text: str
    metadata: Dict
    source_url: str
    crawl_date: str
    embedding: Optional[np.ndarray] = None
    bm25_score: float = 0.0
    embedding_score: float = 0.0
    rerank_score: float = 0.0
    final_score: float = 0.0
    duplicate_cluster_id: Optional[str] = None

    def to_dict(self) -> Dict:
        """Convert to dictionary, excluding numpy arrays."""
        d = asdict(self)
        if d.get("embedding") is not None:
            d["embedding"] = d["embedding"].tolist() if isinstance(d["embedding"], np.ndarray) else d["embedding"]
        return d


@dataclass
class RetrievalResult:
    """Result from the advanced retrieval pipeline."""
    company_id: int
    company_name: str
    documents: List[RetrievalDocument]
    reranking_model: str
    total_retrieved: int
    mmr_lambda: float
    retrieval_latency_ms: float
    from_cache: bool = False
    cache_age_seconds: float = 0.0
    precision_at_5: Optional[float] = None
    dedup_removed_count: int = 0


@dataclass
class BenchmarkResult:
    """Benchmark result for retrieval performance."""
    company_id: int
    company_name: str
    reranker_model: str
    precision_at_5: float
    recall_at_10: float
    ndcg_at_5: float
    mean_reciprocal_rank: float
    latency_ms: float
    docs_reranked: int
    timestamp: str


# ============================================================================
# BM25 SPARSE RETRIEVAL (Lightweight Implementation)
# ============================================================================

class SimpleBM25Retriever:
    """Lightweight BM25 implementation for sparse retrieval."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        """
        Initialize BM25 with standard parameters.
        k1: controls term frequency saturation
        b: controls length normalization
        """
        self.k1 = k1
        self.b = b
        self.documents = []
        self.doc_frequencies = {}
        self.idf = {}
        self.avg_doc_length = 0.0

    def index(self, documents: List[RetrievalDocument]):
        """Index documents for BM25 retrieval."""
        self.documents = documents
        self.doc_frequencies = defaultdict(int)
        doc_lengths = []

        # Build term frequencies
        for doc in documents:
            tokens = self._tokenize(doc.text)
            doc_lengths.append(len(tokens))
            for token in set(tokens):
                self.doc_frequencies[token] += 1

        # Calculate IDF for all tokens
        num_docs = len(documents)
        all_tokens = set(self.doc_frequencies.keys())
        for token in all_tokens:
            self.idf[token] = np.log(
                (num_docs - self.doc_frequencies[token] + 0.5) /
                (self.doc_frequencies[token] + 0.5) + 1.0
            )

        self.avg_doc_length = np.mean(doc_lengths) if doc_lengths else 0

    def search(self, query: str, top_k: int = 10) -> List[Tuple[str, float]]:
        """Search for top-k documents matching the query."""
        query_tokens = self._tokenize(query)
        scores = []

        for doc in self.documents:
            doc_tokens = self._tokenize(doc.text)
            doc_length = len(doc_tokens)
            score = 0.0

            for token in query_tokens:
                if token not in self.idf:
                    continue

                # Count token occurrences in document
                term_freq = doc_tokens.count(token)
                idf = self.idf[token]

                # BM25 formula
                numerator = idf * term_freq * (self.k1 + 1)
                denominator = (
                    term_freq + self.k1 * (
                        1 - self.b + self.b * (doc_length / (self.avg_doc_length + 1e-6))
                    )
                )
                score += numerator / (denominator + 1e-6)

            scores.append((doc.doc_id, score))

        # Sort by score descending
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        """Simple tokenization."""
        return re.findall(r'\b\w+\b', text.lower())


# ============================================================================
# RECIPROCAL RANK FUSION
# ============================================================================

class ReciprocalRankFusion:
    """Combines multiple ranking lists using Reciprocal Rank Fusion."""

    @staticmethod
    def combine(
        rankings: List[List[Tuple[str, float]]],
        k: float = 60.0
    ) -> List[Tuple[str, float]]:
        """
        Combine multiple ranked lists using RRF.
        
        Args:
            rankings: List of (doc_id, score) tuples from different rankers
            k: RRF constant (typically 60)
        
        Returns:
            Combined rankings with RRF scores
        """
        rrf_scores = defaultdict(float)

        for ranking in rankings:
            for rank, (doc_id, _) in enumerate(ranking, 1):
                # RRF formula: 1 / (k + rank)
                rrf_scores[doc_id] += 1.0 / (k + rank)

        # Convert to sorted list
        combined = sorted(
            rrf_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        return combined


# ============================================================================
# MAXIMAL MARGINAL RELEVANCE (MMR)
# ============================================================================

class MaximalMarginalRelevance:
    """Implements MMR for diversity-aware document selection."""

    def __init__(self, lambda_param: float = 0.7):
        """
        Initialize MMR.
        
        Args:
            lambda_param: Trade-off between relevance (1.0) and diversity (0.0)
                         Higher = more relevant but less diverse
        """
        self.lambda_param = lambda_param

    def select(
        self,
        documents: List[RetrievalDocument],
        relevance_scores: np.ndarray,
        embeddings: np.ndarray,
        top_k: int = 5
    ) -> Tuple[List[RetrievalDocument], np.ndarray]:
        """
        Select diverse documents using MMR.
        
        Args:
            documents: List of documents
            relevance_scores: Relevance scores for each document
            embeddings: Embedding vectors for each document (normalized)
            top_k: Number of documents to select
        
        Returns:
            Selected documents and their final scores
        """
        selected_indices = []
        remaining_indices = set(range(len(documents)))
        mmr_scores = np.zeros(len(documents))

        for _ in range(min(top_k, len(documents))):
            best_idx = None
            best_score = -np.inf

            for idx in remaining_indices:
                # Relevance term
                relevance = relevance_scores[idx]

                # Diversity term: max similarity to already selected documents
                diversity_term = 0.0
                if selected_indices:
                    selected_embeddings = embeddings[selected_indices]
                    current_embedding = embeddings[idx].reshape(1, -1)
                    similarities = np.dot(current_embedding, selected_embeddings.T)[0]
                    diversity_term = np.max(similarities)

                # MMR score
                mmr_score = (
                    self.lambda_param * relevance -
                    (1 - self.lambda_param) * diversity_term
                )

                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx

            if best_idx is not None:
                selected_indices.append(best_idx)
                remaining_indices.remove(best_idx)
                mmr_scores[best_idx] = best_score

        selected_documents = [documents[i] for i in selected_indices]
        selected_scores = mmr_scores[selected_indices]

        return selected_documents, selected_scores


# ============================================================================
# CROSS-ENCODER RERANKER
# ============================================================================

class CrossEncoderReranker:
    """
    Cross-encoder reranker with lazy loading for M1 memory optimization.
    
    Models supported:
    - bge-reranker-v2-m3 (570 MB) - PRIMARY
    - ms-marco-MiniLM-L-6-v2 (440 MB) - Fast alternative
    - jina-reranker-v2 (680 MB) - High accuracy
    """

    def __init__(
        self,
        model_name: str = "BAAI/bge-reranker-v2-m3",
        device: str = "cpu",
        lazy_load: bool = True
    ):
        """
        Initialize reranker.
        
        Args:
            model_name: HuggingFace model identifier
            device: 'cpu' or 'mps' (for M1)
            lazy_load: If True, load model only when needed
        """
        self.model_name = model_name
        self.device = device
        self.lazy_load = lazy_load
        self.model = None
        self.loaded = False
        self._model_size_mb = {
            "BAAI/bge-reranker-v2-m3": 570,
            "cross-encoder/ms-marco-MiniLM-L-6-v2": 440,
            "jinaai/jina-reranker-v2-base-multilingual": 680,
        }

    def _load_model(self):
        """Load model into memory (lazy loading)."""
        if self.loaded:
            return

        logger.info(f"Loading reranker: {self.model_name} (~{self._model_size_mb.get(self.model_name, '?')} MB)")
        try:
            self.model = CrossEncoder(self.model_name, device=self.device)
            self.loaded = True
            logger.info(f"✓ Reranker loaded. Memory: ~{self._model_size_mb.get(self.model_name, '?')} MB")
        except Exception as e:
            logger.error(f"Failed to load reranker: {e}")
            raise

    def _unload_model(self):
        """Unload model to free memory (for M1 optimization)."""
        if self.loaded:
            del self.model
            self.model = None
            self.loaded = False
            gc.collect()
            logger.debug("Reranker unloaded from memory")

    def rerank(
        self,
        query: str,
        documents: List[RetrievalDocument],
        top_k: int = 5,
        unload_after: bool = True
    ) -> List[RetrievalDocument]:
        """
        Rerank documents using cross-encoder.
        
        Args:
            query: Query string
            documents: Documents to rerank
            top_k: Keep top-k documents
            unload_after: If True, unload model after reranking (M1 optimization)
        
        Returns:
            Top-k reranked documents
        """
        if not documents:
            return []

        # Lazy load model
        self._load_model()

        # Prepare pairs
        pairs = [[query, doc.text] for doc in documents]

        # Rerank
        start_time = time.time()
        scores = self.model.predict(pairs, convert_to_numpy=True)
        latency_ms = (time.time() - start_time) * 1000

        # Attach scores and sort
        for doc, score in zip(documents, scores):
            doc.rerank_score = float(score)

        documents.sort(key=lambda x: x.rerank_score, reverse=True)
        reranked = documents[:top_k]

        logger.debug(f"Reranked {len(documents)} docs → top-{top_k} in {latency_ms:.1f}ms")

        # Lazy unload for M1
        if unload_after and self.lazy_load:
            self._unload_model()

        return reranked

    def get_memory_usage_mb(self) -> int:
        """Return estimated memory usage in MB."""
        return self._model_size_mb.get(self.model_name, 0)


# ============================================================================
# DOCUMENT DEDUPLICATION
# ============================================================================

class NearDuplicateDetector:
    """
    Detects and deduplicates near-duplicate documents.
    Uses Jaccard similarity on token sets.
    """

    def __init__(self, similarity_threshold: float = 0.85):
        """
        Initialize detector.
        
        Args:
            similarity_threshold: Jaccard threshold (0-1) for duplicates
        """
        self.similarity_threshold = similarity_threshold

    def deduplicate(
        self,
        documents: List[RetrievalDocument]
    ) -> Tuple[List[RetrievalDocument], Dict[str, List[str]]]:
        """
        Remove near-duplicate documents.
        
        Args:
            documents: List of documents
        
        Returns:
            Deduplicated documents and mapping of cluster_id -> [doc_ids]
        """
        if len(documents) <= 1:
            return documents, {}

        # Tokenize documents
        doc_tokens = {}
        for doc in documents:
            tokens = set(re.findall(r'\b\w+\b', doc.text.lower()))
            doc_tokens[doc.doc_id] = tokens

        # Find clusters of near-duplicates
        clusters = []
        processed = set()

        for doc_id_a in doc_tokens:
            if doc_id_a in processed:
                continue

            cluster = [doc_id_a]
            processed.add(doc_id_a)

            for doc_id_b in doc_tokens:
                if doc_id_b in processed:
                    continue

                # Calculate Jaccard similarity
                tokens_a = doc_tokens[doc_id_a]
                tokens_b = doc_tokens[doc_id_b]
                intersection = len(tokens_a & tokens_b)
                union = len(tokens_a | tokens_b)
                jaccard = intersection / union if union > 0 else 0.0

                if jaccard >= self.similarity_threshold:
                    cluster.append(doc_id_b)
                    processed.add(doc_id_b)

            clusters.append(cluster)

        # Keep first document from each cluster, mark others as duplicates
        kept_doc_ids = {cluster[0] for cluster in clusters}
        deduplicated = [doc for doc in documents if doc.doc_id in kept_doc_ids]
        removed_count = len(documents) - len(deduplicated)

        # Assign cluster IDs
        cluster_mapping = {}
        for cluster_id, cluster in enumerate(clusters):
            cluster_hash = hashlib.md5(
                str(sorted(cluster)).encode()
            ).hexdigest()[:8]
            cluster_mapping[cluster_hash] = cluster
            for doc_id in cluster:
                doc = next((d for d in documents if d.doc_id == doc_id), None)
                if doc:
                    doc.duplicate_cluster_id = cluster_hash

        logger.info(f"Deduplication: {len(documents)} → {len(deduplicated)} (+{removed_count} duplicates removed)")

        return deduplicated, cluster_mapping


# ============================================================================
# RESULT CACHING
# ============================================================================

class RetrievalCache:
    """
    LRU cache for reranked retrieval results.
    Cache key: company_id → reranked documents
    TTL: configurable (default 24 hours)
    """

    def __init__(
        self,
        cache_dir: Path = Path("scrapus_data/cache"),
        ttl_hours: int = 24
    ):
        """
        Initialize cache.
        
        Args:
            cache_dir: Directory to store cache files
            ttl_hours: Time-to-live for cache entries
        """
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.ttl = timedelta(hours=ttl_hours)
        self.metadata = {}
        self._load_metadata()

    def _get_cache_path(self, company_id: int) -> Path:
        """Get cache file path for company."""
        return self.cache_dir / f"company_{company_id}.pkl"

    def _load_metadata(self):
        """Load cache metadata (timestamps)."""
        metadata_path = self.cache_dir / "metadata.json"
        if metadata_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    self.metadata = json.load(f)
            except Exception as e:
                logger.warning(f"Failed to load cache metadata: {e}")
                self.metadata = {}

    def _save_metadata(self):
        """Save cache metadata."""
        metadata_path = self.cache_dir / "metadata.json"
        try:
            with open(metadata_path, 'w') as f:
                json.dump(self.metadata, f)
        except Exception as e:
            logger.warning(f"Failed to save cache metadata: {e}")

    def get(self, company_id: int) -> Optional[RetrievalResult]:
        """
        Retrieve cached result for company.
        
        Returns:
            RetrievalResult if cache hit and not expired, None otherwise
        """
        cache_path = self._get_cache_path(company_id)
        if not cache_path.exists():
            return None

        # Check if expired
        company_key = str(company_id)
        if company_key in self.metadata:
            cached_time = datetime.fromisoformat(self.metadata[company_key])
            if datetime.now() - cached_time > self.ttl:
                logger.info(f"Cache expired for company {company_id}")
                cache_path.unlink()
                return None

        # Load from cache
        try:
            with open(cache_path, 'rb') as f:
                result = pickle.load(f)
                result.from_cache = True
                result.cache_age_seconds = (
                    datetime.now() - datetime.fromisoformat(self.metadata[company_key])
                ).total_seconds()
                logger.info(f"Cache hit for company {company_id} (age: {result.cache_age_seconds:.0f}s)")
                return result
        except Exception as e:
            logger.warning(f"Failed to load cache for company {company_id}: {e}")
            return None

    def set(self, company_id: int, result: RetrievalResult):
        """Cache retrieval result for company."""
        cache_path = self._get_cache_path(company_id)
        try:
            with open(cache_path, 'wb') as f:
                pickle.dump(result, f)
            self.metadata[str(company_id)] = datetime.now().isoformat()
            self._save_metadata()
            logger.debug(f"Cached result for company {company_id}")
        except Exception as e:
            logger.warning(f"Failed to cache result for company {company_id}: {e}")

    def clear_expired(self):
        """Remove expired cache entries."""
        expired_ids = []
        for company_key, cached_time_str in list(self.metadata.items()):
            try:
                cached_time = datetime.fromisoformat(cached_time_str)
                if datetime.now() - cached_time > self.ttl:
                    expired_ids.append(company_key)
            except Exception:
                expired_ids.append(company_key)

        for company_key in expired_ids:
            cache_path = self._get_cache_path(int(company_key))
            cache_path.unlink(missing_ok=True)
            del self.metadata[company_key]

        if expired_ids:
            self._save_metadata()
            logger.info(f"Cleared {len(expired_ids)} expired cache entries")


# ============================================================================
# ADVANCED RETRIEVAL PIPELINE
# ============================================================================

class AdvancedRetrievalPipeline:
    """
    Complete advanced retrieval pipeline combining:
    - BM25 sparse retrieval
    - Dense embedding retrieval
    - Reciprocal Rank Fusion
    - Maximal Marginal Relevance
    - Cross-encoder reranking
    - Document deduplication
    - Result caching
    """

    def __init__(
        self,
        db_path: str = "scrapus_data/scrapus.db",
        lancedb_path: str = "scrapus_data/lancedb",
        cache_dir: Path = Path("scrapus_data/cache"),
        reranker_model: str = "BAAI/bge-reranker-v2-m3",
        mmr_lambda: float = 0.7,
        device: str = "cpu"
    ):
        """
        Initialize retrieval pipeline.
        
        Args:
            db_path: Path to SQLite database
            lancedb_path: Path to LanceDB vector store
            cache_dir: Cache directory
            reranker_model: Cross-encoder model name
            mmr_lambda: MMR diversity parameter (0-1)
            device: 'cpu' or 'mps' (M1)
        """
        self.db_path = db_path
        self.lancedb_path = lancedb_path
        self.reranker_model = reranker_model
        self.mmr_lambda = mmr_lambda
        self.device = device

        # Initialize components
        self.bm25 = SimpleBM25Retriever()
        self.reranker = CrossEncoderReranker(reranker_model, device)
        self.mmr = MaximalMarginalRelevance(lambda_param=mmr_lambda)
        self.dedup = NearDuplicateDetector(similarity_threshold=0.85)
        self.cache = RetrievalCache(cache_dir=cache_dir, ttl_hours=24)

        logger.info(f"✓ Advanced Retrieval Pipeline initialized")
        logger.info(f"  Reranker: {reranker_model} (~{self.reranker.get_memory_usage_mb()} MB)")
        logger.info(f"  MMR lambda: {mmr_lambda}")
        logger.info(f"  Device: {device}")

    def _load_documents_from_db(
        self,
        company_id: int,
        query: str,
        limit: int = 20
    ) -> List[RetrievalDocument]:
        """
        Load documents from SQLite for company (structured facts).
        """
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Query documents related to company
            cursor.execute("""
                SELECT id, text, metadata, source_url, crawl_date
                FROM documents
                WHERE company_id = ?
                LIMIT ?
            """, (company_id, limit))

            documents = []
            for doc_id, text, metadata_json, url, crawl_date in cursor.fetchall():
                try:
                    metadata = json.loads(metadata_json) if metadata_json else {}
                except:
                    metadata = {}

                doc = RetrievalDocument(
                    doc_id=str(doc_id),
                    text=text,
                    metadata=metadata,
                    source_url=url,
                    crawl_date=crawl_date
                )
                documents.append(doc)

            conn.close()
            return documents
        except Exception as e:
            logger.error(f"Error loading documents from DB: {e}")
            return []

    def _load_embeddings_from_lancedb(
        self,
        company_id: int,
        query: str,
        query_embedding: np.ndarray,
        top_k: int = 10
    ) -> List[RetrievalDocument]:
        """
        Load documents from LanceDB using embedding similarity.
        """
        try:
            db = lancedb.connect(self.lancedb_path)
            table = db.open_table("documents")

            # Vector search
            results = table.search(query_embedding).limit(top_k).to_list()

            documents = []
            for result in results:
                doc = RetrievalDocument(
                    doc_id=result.get("id", ""),
                    text=result.get("text", ""),
                    metadata=result.get("metadata", {}),
                    source_url=result.get("source_url", ""),
                    crawl_date=result.get("crawl_date", ""),
                    embedding=np.array(result.get("embedding", []))
                )
                doc.embedding_score = float(result.get("_distance", 0.0))
                documents.append(doc)

            return documents
        except Exception as e:
            logger.error(f"Error loading embeddings from LanceDB: {e}")
            return []

    def retrieve(
        self,
        company_id: int,
        company_name: str,
        query: str,
        query_embedding: Optional[np.ndarray] = None,
        top_k: int = 5,
        use_cache: bool = True,
        use_mmr: bool = True,
        use_dedup: bool = True
    ) -> RetrievalResult:
        """
        Execute complete retrieval pipeline.
        
        Args:
            company_id: Company identifier
            company_name: Company name (for logging)
            query: Query string
            query_embedding: Query embedding vector (if None, uses text only)
            top_k: Number of documents to return
            use_cache: Check cache first
            use_mmr: Apply MMR for diversity
            use_dedup: Remove near-duplicates
        
        Returns:
            RetrievalResult with reranked documents
        """
        start_time = time.time()

        # 1. Check cache
        if use_cache:
            cached_result = self.cache.get(company_id)
            if cached_result:
                return cached_result

        logger.info(f"\n{'='*60}")
        logger.info(f"Retrieving documents for: {company_name} (ID: {company_id})")
        logger.info(f"Query: {query}")

        documents = []

        # 2. Sparse retrieval (BM25)
        logger.info("→ Stage 1: BM25 sparse retrieval...")
        db_docs = self._load_documents_from_db(company_id, query, limit=20)
        if db_docs:
            self.bm25.index(db_docs)
            bm25_results = self.bm25.search(query, top_k=10)
            for doc_id, score in bm25_results:
                for doc in db_docs:
                    if doc.doc_id == doc_id:
                        doc.bm25_score = score
                        documents.append(doc)
                        break
            logger.info(f"  ✓ {len(bm25_results)} BM25 results")

        # 3. Dense retrieval (embedding-based)
        logger.info("→ Stage 2: Dense embedding retrieval...")
        if query_embedding is not None:
            emb_docs = self._load_embeddings_from_lancedb(
                company_id, query, query_embedding, top_k=10
            )
            logger.info(f"  ✓ {len(emb_docs)} embedding results")
            documents.extend(emb_docs)
        else:
            logger.info("  ⊘ No query embedding provided")

        # 4. Deduplicate
        if use_dedup and len(documents) > 1:
            logger.info("→ Stage 3: Near-duplicate detection...")
            documents, clusters = self.dedup.deduplicate(documents)
            dedup_removed = len(db_docs) + len(emb_docs if query_embedding else []) - len(documents)
        else:
            dedup_removed = 0

        if not documents:
            logger.warning("No documents retrieved!")
            result = RetrievalResult(
                company_id=company_id,
                company_name=company_name,
                documents=[],
                reranking_model=self.reranker_model,
                total_retrieved=0,
                mmr_lambda=self.mmr_lambda,
                retrieval_latency_ms=(time.time() - start_time) * 1000,
                dedup_removed_count=dedup_removed
            )
            return result

        # 5. Reciprocal Rank Fusion
        logger.info("→ Stage 4: Reciprocal Rank Fusion...")
        bm25_rankings = [
            (doc.doc_id, doc.bm25_score)
            for doc in documents
            if doc.bm25_score > 0
        ]
        emb_rankings = [
            (doc.doc_id, doc.embedding_score)
            for doc in documents
            if doc.embedding_score > 0
        ]

        rankings_to_fuse = []
        if bm25_rankings:
            rankings_to_fuse.append(bm25_rankings)
        if emb_rankings:
            rankings_to_fuse.append(emb_rankings)

        if rankings_to_fuse:
            rrf_combined = ReciprocalRankFusion.combine(rankings_to_fuse)
            # Reorder documents by RRF score
            doc_dict = {doc.doc_id: doc for doc in documents}
            documents_rrf = []
            for doc_id, rrf_score in rrf_combined:
                if doc_id in doc_dict:
                    doc_dict[doc_id].final_score = rrf_score
                    documents_rrf.append(doc_dict[doc_id])
            documents = documents_rrf
            logger.info(f"  ✓ RRF combined {len(rankings_to_fuse)} rankings")

        # 6. Maximal Marginal Relevance
        if use_mmr and len(documents) > top_k:
            logger.info(f"→ Stage 5: Maximal Marginal Relevance (λ={self.mmr_lambda})...")
            relevance_scores = np.array([doc.final_score or doc.embedding_score or doc.bm25_score for doc in documents])
            embeddings_array = np.array([
                doc.embedding if doc.embedding is not None else np.zeros(384)
                for doc in documents
            ])
            # Normalize embeddings
            norms = np.linalg.norm(embeddings_array, axis=1, keepdims=True)
            embeddings_array = embeddings_array / (norms + 1e-6)

            mmr_docs, mmr_scores = self.mmr.select(
                documents, relevance_scores, embeddings_array, top_k=top_k * 2
            )
            documents = mmr_docs
            logger.info(f"  ✓ MMR selected {len(documents)} diverse documents")

        # 7. Cross-encoder Reranking
        logger.info("→ Stage 6: Cross-encoder reranking...")
        rerank_start = time.time()
        documents = self.reranker.rerank(
            query, documents, top_k=top_k, unload_after=True
        )
        rerank_latency = (time.time() - rerank_start) * 1000
        logger.info(f"  ✓ Reranked to top-{len(documents)} in {rerank_latency:.1f}ms")

        # 8. Calculate precision@5 (if ground truth available)
        precision_at_5 = self._calculate_precision_at_5(documents, query)

        # Build result
        total_latency = (time.time() - start_time) * 1000
        result = RetrievalResult(
            company_id=company_id,
            company_name=company_name,
            documents=documents,
            reranking_model=self.reranker_model,
            total_retrieved=len(documents),
            mmr_lambda=self.mmr_lambda,
            retrieval_latency_ms=total_latency,
            precision_at_5=precision_at_5,
            dedup_removed_count=dedup_removed
        )

        # 9. Cache result
        if use_cache:
            self.cache.set(company_id, result)

        logger.info(f"\n{'='*60}")
        logger.info(f"✓ Retrieval complete in {total_latency:.0f}ms")
        logger.info(f"  Documents: {len(documents)}, Precision@5: {precision_at_5:.2f if precision_at_5 else 'N/A'}")
        logger.info(f"{'='*60}\n")

        return result

    def _calculate_precision_at_5(
        self,
        documents: List[RetrievalDocument],
        query: str
    ) -> Optional[float]:
        """
        Calculate precision@5 (simplified - token overlap with query).
        In production, use ground truth relevance labels.
        """
        if not documents or len(documents) == 0:
            return None

        query_tokens = set(re.findall(r'\b\w+\b', query.lower()))
        if not query_tokens:
            return None

        top_5 = documents[:5]
        relevant_count = 0

        for doc in top_5:
            doc_tokens = set(re.findall(r'\b\w+\b', doc.text.lower()))
            overlap = len(query_tokens & doc_tokens) / len(query_tokens)
            if overlap > 0.3:  # Heuristic threshold
                relevant_count += 1

        precision = relevant_count / len(top_5) if top_5 else 0.0
        return precision


# ============================================================================
# BENCHMARKING FRAMEWORK
# ============================================================================

class RetrievalBenchmark:
    """
    Benchmark retrieval performance across different reranker models.
    Measures: precision@5, recall@10, NDCG@5, MRR, latency
    """

    def __init__(
        self,
        test_cases: List[Dict],
        results_file: str = "scrapus_data/benchmark_results.jsonl"
    ):
        """
        Initialize benchmark.
        
        Args:
            test_cases: List of {"company_id", "company_name", "query", "expected_docs"} dicts
            results_file: Output file for benchmark results
        """
        self.test_cases = test_cases
        self.results_file = results_file

    def run(
        self,
        models: List[str],
        pipeline_factory,
        output_metrics: bool = True
    ) -> List[BenchmarkResult]:
        """
        Run benchmark across multiple reranker models.
        
        Args:
            models: List of reranker model names
            pipeline_factory: Function that creates pipeline with given model
            output_metrics: Write results to file
        
        Returns:
            List of benchmark results
        """
        all_results = []

        for model_name in models:
            logger.info(f"\n{'='*60}")
            logger.info(f"Benchmarking: {model_name}")
            logger.info(f"{'='*60}")

            pipeline = pipeline_factory(model_name)

            for test_case in self.test_cases:
                company_id = test_case["company_id"]
                company_name = test_case["company_name"]
                query = test_case["query"]
                expected_docs = test_case.get("expected_docs", [])

                # Run retrieval
                result = pipeline.retrieve(
                    company_id=company_id,
                    company_name=company_name,
                    query=query,
                    top_k=5,
                    use_cache=False
                )

                # Calculate metrics
                metrics = self._calculate_metrics(
                    result.documents,
                    expected_docs
                )

                bench_result = BenchmarkResult(
                    company_id=company_id,
                    company_name=company_name,
                    reranker_model=model_name,
                    precision_at_5=metrics["precision_at_5"],
                    recall_at_10=metrics["recall_at_10"],
                    ndcg_at_5=metrics["ndcg_at_5"],
                    mean_reciprocal_rank=metrics["mrr"],
                    latency_ms=result.retrieval_latency_ms,
                    docs_reranked=len(result.documents),
                    timestamp=datetime.now().isoformat()
                )
                all_results.append(bench_result)

                logger.info(
                    f"  {company_name}: "
                    f"P@5={bench_result.precision_at_5:.3f}, "
                    f"NDCG@5={bench_result.ndcg_at_5:.3f}, "
                    f"MRR={bench_result.mean_reciprocal_rank:.3f}, "
                    f"Latency={bench_result.latency_ms:.0f}ms"
                )

        # Save results
        if output_metrics:
            self._save_results(all_results)

        # Print summary
        self._print_summary(all_results)

        return all_results

    @staticmethod
    def _calculate_metrics(
        retrieved_docs: List[RetrievalDocument],
        expected_docs: List[str]
    ) -> Dict[str, float]:
        """Calculate retrieval metrics."""
        if not expected_docs:
            return {
                "precision_at_5": 0.0,
                "recall_at_10": 0.0,
                "ndcg_at_5": 0.0,
                "mrr": 0.0
            }

        retrieved_ids = {doc.doc_id for doc in retrieved_docs[:5]}
        expected_set = set(expected_docs)

        # Precision@5
        relevant_at_5 = len(retrieved_ids & expected_set)
        precision_at_5 = relevant_at_5 / 5 if retrieved_ids else 0.0

        # Recall@10
        retrieved_ids_10 = {doc.doc_id for doc in retrieved_docs[:10]}
        relevant_at_10 = len(retrieved_ids_10 & expected_set)
        recall_at_10 = relevant_at_10 / len(expected_set) if expected_set else 0.0

        # NDCG@5
        dcg = 0.0
        for rank, doc in enumerate(retrieved_docs[:5], 1):
            if doc.doc_id in expected_set:
                dcg += 1.0 / np.log2(rank + 1)
        idcg = sum(1.0 / np.log2(i + 1) for i in range(1, min(6, len(expected_set) + 1)))
        ndcg_at_5 = dcg / idcg if idcg > 0 else 0.0

        # MRR
        mrr = 0.0
        for rank, doc in enumerate(retrieved_docs, 1):
            if doc.doc_id in expected_set:
                mrr = 1.0 / rank
                break

        return {
            "precision_at_5": precision_at_5,
            "recall_at_10": recall_at_10,
            "ndcg_at_5": ndcg_at_5,
            "mrr": mrr
        }

    def _save_results(self, results: List[BenchmarkResult]):
        """Save benchmark results to JSONL file."""
        try:
            with open(self.results_file, 'w') as f:
                for result in results:
                    f.write(json.dumps(asdict(result)) + '\n')
            logger.info(f"✓ Benchmark results saved to {self.results_file}")
        except Exception as e:
            logger.error(f"Failed to save benchmark results: {e}")

    @staticmethod
    def _print_summary(results: List[BenchmarkResult]):
        """Print summary statistics by model."""
        logger.info(f"\n{'='*80}")
        logger.info("BENCHMARK SUMMARY BY MODEL")
        logger.info(f"{'='*80}\n")

        models = {}
        for result in results:
            if result.reranker_model not in models:
                models[result.reranker_model] = []
            models[result.reranker_model].append(result)

        for model_name in sorted(models.keys()):
            model_results = models[model_name]
            avg_p5 = np.mean([r.precision_at_5 for r in model_results])
            avg_ndcg = np.mean([r.ndcg_at_5 for r in model_results])
            avg_mrr = np.mean([r.mean_reciprocal_rank for r in model_results])
            avg_latency = np.mean([r.latency_ms for r in model_results])

            logger.info(f"{model_name}")
            logger.info(f"  Precision@5: {avg_p5:.3f}")
            logger.info(f"  NDCG@5:      {avg_ndcg:.3f}")
            logger.info(f"  MRR:         {avg_mrr:.3f}")
            logger.info(f"  Latency:     {avg_latency:.0f}ms\n")


# ============================================================================
# MULTI-RERANKER COMPARISON
# ============================================================================

class RerankerComparison:
    """
    Compare multiple reranker models on same documents.
    Models: bge-reranker-v2-m3 vs ms-marco-MiniLM vs jina-reranker-v2
    """

    MODELS = {
        "bge-reranker-v2-m3": {
            "name": "BAAI/bge-reranker-v2-m3",
            "size_mb": 570,
            "accuracy": "High",
            "speed": "Medium"
        },
        "ms-marco-MiniLM": {
            "name": "cross-encoder/ms-marco-MiniLM-L-6-v2",
            "size_mb": 440,
            "accuracy": "Medium",
            "speed": "Fast"
        },
        "jina-reranker-v2": {
            "name": "jinaai/jina-reranker-v2-base-multilingual",
            "size_mb": 680,
            "accuracy": "Very High",
            "speed": "Medium"
        }
    }

    @staticmethod
    def compare(
        query: str,
        documents: List[RetrievalDocument],
        device: str = "cpu"
    ) -> Dict[str, Dict]:
        """
        Compare reranker outputs on same documents.
        
        Returns:
            Dict mapping model name → {scores, rankings, latency}
        """
        results = {}

        for model_key, model_info in RerankerComparison.MODELS.items():
            logger.info(f"\nTesting: {model_key}")
            model_name = model_info["name"]

            try:
                reranker = CrossEncoderReranker(model_name, device)
                reranked = reranker.rerank(
                    query, documents, top_k=5, unload_after=True
                )

                results[model_key] = {
                    "model_name": model_name,
                    "size_mb": model_info["size_mb"],
                    "accuracy": model_info["accuracy"],
                    "speed": model_info["speed"],
                    "rankings": [
                        {
                            "rank": i + 1,
                            "doc_id": doc.doc_id,
                            "score": doc.rerank_score,
                            "text_preview": doc.text[:100]
                        }
                        for i, doc in enumerate(reranked)
                    ]
                }
            except Exception as e:
                logger.error(f"Error with {model_key}: {e}")
                results[model_key] = {"error": str(e)}

        return results


# ============================================================================
# DEMO & TESTING
# ============================================================================

def demo_advanced_retrieval():
    """
    Demo script showing all components in action.
    """
    logger.info("\n" + "="*80)
    logger.info("ADVANCED RETRIEVAL PIPELINE DEMO")
    logger.info("="*80)

    # Initialize pipeline
    pipeline = AdvancedRetrievalPipeline(
        reranker_model="BAAI/bge-reranker-v2-m3",
        mmr_lambda=0.7,
        device="cpu"
    )

    # Example test case
    company_id = 1
    company_name = "TechCorp AI"
    query = "AI funding rounds series investments"

    # Mock query embedding (in production, use real embeddings)
    query_embedding = np.random.randn(384)
    query_embedding = query_embedding / np.linalg.norm(query_embedding)

    # Run retrieval
    result = pipeline.retrieve(
        company_id=company_id,
        company_name=company_name,
        query=query,
        query_embedding=query_embedding,
        top_k=5,
        use_cache=False,
        use_mmr=True,
        use_dedup=True
    )

    # Print results
    logger.info("\nTop Documents:")
    for i, doc in enumerate(result.documents, 1):
        logger.info(f"\n{i}. {doc.doc_id}")
        logger.info(f"   Rerank Score: {doc.rerank_score:.4f}")
        logger.info(f"   Text: {doc.text[:100]}...")
        logger.info(f"   Source: {doc.source_url}")

    # Benchmark
    logger.info("\n" + "="*80)
    logger.info("BENCHMARK COMPARISON")
    logger.info("="*80)

    test_cases = [
        {
            "company_id": 1,
            "company_name": "TechCorp",
            "query": "AI funding investment",
            "expected_docs": ["doc_1", "doc_2", "doc_3"]
        }
    ]

    def pipeline_factory(model_name):
        return AdvancedRetrievalPipeline(
            reranker_model=model_name,
            device="cpu"
        )

    benchmark = RetrievalBenchmark(test_cases)
    results = benchmark.run(
        models=["BAAI/bge-reranker-v2-m3"],
        pipeline_factory=pipeline_factory
    )

    logger.info("✓ Demo complete!")


if __name__ == "__main__":
    demo_advanced_retrieval()
