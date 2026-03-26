# File: /Users/vadimnicolai/Public/ai-apps/apps/lead-gen/scrapus/topic_modeling_optimized.py

"""
BERTopic v0.16+ optimization for M1 16GB with zero cloud dependency.
Implements online/incremental learning with memory benchmarking.
"""

import os
import json
import pickle
import logging
import psutil
import gc
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from contextlib import contextmanager
import time
import numpy as np
from collections import defaultdict

# Core ML libraries
import torch
from sentence_transformers import SentenceTransformer
from bertopic import BERTopic
from bertopic.vectorizers import ClassTfidfVectorizer
from umap import UMAP
from hdbscan import HDBSCAN
import lancedb

logger = logging.getLogger(__name__)


@dataclass
class MemorySnapshot:
    """Track memory usage at each stage."""
    stage: str
    timestamp: float
    rss_mb: float  # Resident set size (actual RAM)
    vms_mb: float  # Virtual memory
    available_mb: float  # Free RAM
    percent_used: float


class MemoryProfiler:
    """Context-aware memory tracking for M1."""
    
    def __init__(self, warn_threshold_mb=1500):
        self.snapshots: List[MemorySnapshot] = []
        self.warn_threshold_mb = warn_threshold_mb
        self.process = psutil.Process(os.getpid())
        self.start_memory = self.get_memory()
        
    def get_memory(self) -> MemorySnapshot:
        """Get current memory stats."""
        info = self.process.memory_info()
        vm = psutil.virtual_memory()
        return MemorySnapshot(
            stage="",
            timestamp=time.time(),
            rss_mb=info.rss / 1024 / 1024,
            vms_mb=info.vms / 1024 / 1024,
            available_mb=vm.available / 1024 / 1024,
            percent_used=vm.percent,
        )
    
    @contextmanager
    def track(self, stage: str):
        """Context manager for memory-aware stage execution."""
        before = self.get_memory()
        logger.info(f"[{stage}] START: {before.rss_mb:.1f}MB RSS, "
                   f"{before.available_mb:.1f}MB free, {before.percent_used:.1f}% used")
        
        try:
            yield self
        finally:
            after = self.get_memory()
            delta_rss = after.rss_mb - before.rss_mb
            delta_available = after.available_mb - before.available_mb
            
            logger.info(f"[{stage}] END: {after.rss_mb:.1f}MB RSS "
                       f"({delta_rss:+.1f}MB), {after.available_mb:.1f}MB free "
                       f"({delta_available:+.1f}MB)")
            
            if after.rss_mb > self.warn_threshold_mb:
                logger.warning(f"[{stage}] PEAK RAM {after.rss_mb:.1f}MB "
                              f"exceeds threshold {self.warn_threshold_mb}MB")
            
            after.stage = stage
            self.snapshots.append(after)
            gc.collect()  # Aggressive cleanup
    
    def report(self) -> Dict:
        """Generate memory report."""
        if not self.snapshots:
            return {}
        
        peak = max(s.rss_mb for s in self.snapshots)
        stages_report = {s.stage: s.rss_mb for s in self.snapshots}
        
        return {
            "peak_rss_mb": peak,
            "stages": stages_report,
            "final_rss_mb": self.snapshots[-1].rss_mb,
            "timestamp": time.time(),
        }


class BERTopicM1Optimized:
    """
    BERTopic v0.16+ with M1-specific tuning for online learning.
    
    Key optimizations:
    - all-MiniLM-L3-v2 embeddings (60MB vs 80MB)
    - UMAP: n_components=2, low_memory=True
    - HDBSCAN: min_cluster_size tuned for B2B documents
    - Incremental learning via partial_fit() with 500-doc batches
    - Disk persistence between pipeline runs
    """
    
    def __init__(
        self,
        model_cache_dir: str = "scrapus_data/models/bertopic",
        embedding_model: str = "sentence-transformers/all-MiniLM-L3-v2",
        min_cluster_size: int = 8,
        n_components: int = 2,
        persistence_dir: str = "scrapus_data/persistence",
    ):
        self.model_cache_dir = Path(model_cache_dir)
        self.model_cache_dir.mkdir(parents=True, exist_ok=True)
        self.persistence_dir = Path(persistence_dir)
        self.persistence_dir.mkdir(parents=True, exist_ok=True)
        
        self.embedding_model_name = embedding_model
        self.min_cluster_size = min_cluster_size
        self.n_components = n_components
        
        self.embedding_model: Optional[SentenceTransformer] = None
        self.topic_model: Optional[BERTopic] = None
        self.memory_profiler = MemoryProfiler()
        
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize embedding model and BERTopic with M1 tuning."""
        with self.memory_profiler.track("embedding_model_load"):
            # Use smaller L3 variant for M1
            self.embedding_model = SentenceTransformer(
                self.embedding_model_name,
                device="cpu",  # M1 handles CPU better than GPU for small models
                cache_folder=str(self.model_cache_dir),
            )
            logger.info(f"Loaded {self.embedding_model_name}: "
                       f"{self.embedding_model.get_sentence_embedding_dimension()}-dim")
        
        # M1-optimized UMAP configuration
        umap_model = UMAP(
            n_neighbors=15,
            n_components=self.n_components,  # 2 for memory efficiency
            min_dist=0.0,
            metric="cosine",
            low_memory=True,  # Critical for M1
            random_state=42,
            # M1-specific thread settings
            n_jobs=1,  # Avoid multi-threading overhead on M1
        )
        
        # HDBSCAN tuned for B2B web pages
        hdbscan_model = HDBSCAN(
            min_cluster_size=self.min_cluster_size,
            min_samples=3,
            metric="euclidean",
            prediction_data=True,
            # M1-specific
            allow_single_cluster=False,
            cluster_selection_epsilon=0.0,
        )
        
        with self.memory_profiler.track("bertopic_init"):
            # Try to load persisted model
            if (self.persistence_dir / "topic_model.pkl").exists():
                logger.info("Loading persisted BERTopic model from disk")
                self.topic_model = self._load_from_disk()
            else:
                logger.info("Initializing new BERTopic model")
                self.topic_model = BERTopic(
                    embedding_model=self.embedding_model,
                    umap_model=umap_model,
                    hdbscan_model=hdbscan_model,
                    vectorizer_model=ClassTfidfVectorizer(
                        reduce_frequent_words=True,
                        bm25_weighting=True,
                    ),
                    nr_topics=20,
                    top_n_words=10,
                    verbose=False,  # Reduce logging overhead
                )
    
    def fit_batch(self, documents: List[str], batch_size: int = 500) -> Dict:
        """
        Fit/update topic model with new batch of documents.
        Uses partial_fit() for incremental learning (M1 friendly).
        
        Args:
            documents: List of text documents
            batch_size: Process in chunks of this size (default 500)
            
        Returns:
            Dictionary with topics, metrics, and memory stats
        """
        logger.info(f"Processing {len(documents)} documents in batches of {batch_size}")
        
        all_topics = []
        total_probs = []
        
        # Process in batches to keep memory usage under control
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i+batch_size]
            batch_idx = i // batch_size
            
            with self.memory_profiler.track(f"batch_{batch_idx}_fit"):
                if not all_topics:  # First batch: use fit()
                    logger.info(f"Batch {batch_idx}: Initial fit with {len(batch)} docs")
                    topics, probs = self.topic_model.fit_transform(batch)
                else:  # Subsequent batches: use partial_fit()
                    logger.info(f"Batch {batch_idx}: Incremental fit with {len(batch)} docs")
                    topics, probs = self.topic_model.partial_fit(batch)
                
                all_topics.extend(topics)
                total_probs.extend(probs)
                
                logger.info(f"Batch {batch_idx}: {len(set(topics))} unique topics, "
                           f"avg prob {np.mean(probs):.3f}")
        
        # Persist model to disk after fitting
        self._save_to_disk()
        
        return {
            "topics": all_topics,
            "probabilities": total_probs,
            "n_topics": len(set(all_topics)),
            "memory": self.memory_profiler.report(),
        }
    
    def get_topics(self, topic_id: Optional[int] = None) -> Dict:
        """Retrieve topic information."""
        if topic_id is not None:
            return self.topic_model.get_topic(topic_id)
        else:
            return self.topic_model.get_topics()
    
    def _save_to_disk(self):
        """Persist model to disk between pipeline runs."""
        with self.memory_profiler.track("save_to_disk"):
            model_path = self.persistence_dir / "topic_model.pkl"
            with open(model_path, "wb") as f:
                pickle.dump(self.topic_model, f)
            logger.info(f"Saved BERTopic model to {model_path} "
                       f"({model_path.stat().st_size / 1024 / 1024:.1f}MB)")
    
    def _load_from_disk(self) -> BERTopic:
        """Load persisted model from disk."""
        model_path = self.persistence_dir / "topic_model.pkl"
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        logger.info(f"Loaded BERTopic model from {model_path}")
        return model
    
    def get_memory_report(self) -> Dict:
        """Return detailed memory profiling report."""
        return self.memory_profiler.report()


# ============================================================================
# BENCHMARK HARNESS: Compare fit() vs partial_fit() at different batch sizes
# ============================================================================

class BERTopicMemoryBenchmark:
    """
    Compare memory usage:
    1. Standard fit() (current approach, 3GB peak)
    2. Incremental partial_fit() with 500-doc batches (target 800MB)
    3. Different batch sizes (100, 250, 500, 1000)
    """
    
    def __init__(self, test_documents_dir: str = "scrapus_data/test_docs"):
        self.test_dir = Path(test_documents_dir)
        self.test_dir.mkdir(parents=True, exist_ok=True)
        self.results = defaultdict(dict)
    
    def generate_test_corpus(self, n_docs: int = 5000) -> List[str]:
        """Generate synthetic B2B documents for testing."""
        templates = [
            "Company {company} announced funding of ${amount}M in {round} round.",
            "{person} joined {company} as {position}. The company focuses on {industry}.",
            "{company} acquired {target} for ${price}M. The product {product} will be integrated.",
            "Industry report: {industry} sector shows {trend}. {company} is expanding in {location}.",
            "Partnership: {company} partners with {partner} to develop {technology}.",
        ]
        
        companies = ["Acme", "TechCorp", "DataSystems", "CloudInc", "AIVentures"]
        persons = ["Alice", "Bob", "Charlie", "Diana", "Eve"]
        positions = ["CEO", "CTO", "VP Engineering", "Product Lead", "Founder"]
        industries = ["AI", "Fintech", "Cybersecurity", "Cloud", "Healthcare"]
        
        documents = []
        for i in range(n_docs):
            template = np.random.choice(templates)
            doc = template.format(
                company=np.random.choice(companies),
                amount=np.random.randint(1, 100),
                round=np.random.choice(["Seed", "Series A", "Series B", "Series C"]),
                person=np.random.choice(persons),
                position=np.random.choice(positions),
                industry=np.random.choice(industries),
                target=np.random.choice(companies),
                price=np.random.randint(10, 500),
                product=f"Product{np.random.randint(1, 10)}",
                trend=np.random.choice(["growth", "consolidation", "innovation"]),
                location=np.random.choice(["San Francisco", "London", "Berlin", "Tokyo"]),
                technology=np.random.choice(["ML", "Blockchain", "IoT", "5G"]),
                partner=np.random.choice(companies),
            )
            documents.append(doc)
        
        logger.info(f"Generated {len(documents)} synthetic B2B documents")
        return documents
    
    def benchmark_fit_full(self, documents: List[str]) -> Dict:
        """Benchmark standard fit() approach (current)."""
        logger.info("=" * 80)
        logger.info("BENCHMARK 1: Standard fit() (current approach)")
        logger.info("=" * 80)
        
        profiler = MemoryProfiler()
        
        with profiler.track("fit_full"):
            model = BERTopicM1Optimized()
            topics, probs = model.topic_model.fit_transform(documents)
        
        report = profiler.report()
        report["method"] = "fit_full"
        report["n_documents"] = len(documents)
        report["n_topics"] = len(set(topics))
        
        self.results["fit_full"] = report
        return report
    
    def benchmark_partial_fit(self, documents: List[str], batch_sizes: List[int]) -> Dict:
        """Benchmark incremental partial_fit() at different batch sizes."""
        results = {}
        
        for batch_size in batch_sizes:
            logger.info("=" * 80)
            logger.info(f"BENCHMARK 2: partial_fit() with batch_size={batch_size}")
            logger.info("=" * 80)
            
            profiler = MemoryProfiler()
            model = BERTopicM1Optimized()
            
            all_topics = []
            for i in range(0, len(documents), batch_size):
                batch = documents[i:i+batch_size]
                
                with profiler.track(f"batch_{i//batch_size}"):
                    if i == 0:
                        topics, probs = model.topic_model.fit_transform(batch)
                    else:
                        topics, probs = model.topic_model.partial_fit(batch)
                    all_topics.extend(topics)
            
            report = profiler.report()
            report["method"] = f"partial_fit_batch_{batch_size}"
            report["batch_size"] = batch_size
            report["n_documents"] = len(documents)
            report["n_topics"] = len(set(all_topics))
            
            results[batch_size] = report
            self.results[f"partial_fit_{batch_size}"] = report
        
        return results
    
    def report_comparison(self) -> str:
        """Generate comparison report."""
        if not self.results:
            return "No benchmarks run yet"
        
        lines = []
        lines.append("\n" + "=" * 100)
        lines.append("BERTOPIC MEMORY OPTIMIZATION BENCHMARK REPORT (M1 16GB)")
        lines.append("=" * 100 + "\n")
        
        # Summary table
        lines.append("METHOD | PEAK RAM | N_DOCS | N_TOPICS | DELTA_MB | SAVINGS")
        lines.append("-" * 70)
        
        baseline_peak = None
        for method, report in sorted(self.results.items()):
            peak = report.get("peak_rss_mb", 0)
            n_docs = report.get("n_documents", 0)
            n_topics = report.get("n_topics", 0)
            
            if baseline_peak is None and "fit_full" in method:
                baseline_peak = peak
            
            delta = peak - baseline_peak if baseline_peak else 0
            savings_pct = (delta / baseline_peak * 100) if baseline_peak else 0
            
            lines.append(f"{method:30s} | {peak:7.1f}MB | {n_docs:6d} | {n_topics:8d} | "
                        f"{delta:+7.1f}MB | {savings_pct:+6.1f}%")
        
        lines.append("\n" + "=" * 100)
        lines.append("RECOMMENDATION")
        lines.append("=" * 100)
        
        # Find best partial_fit result
        partial_results = {k: v for k, v in self.results.items() 
                          if "partial_fit" in k}
        if partial_results:
            best_method = min(partial_results.items(), 
                            key=lambda x: x[1]["peak_rss_mb"])
            best_name, best_report = best_method
            savings = baseline_peak - best_report["peak_rss_mb"]
            savings_pct = savings / baseline_peak * 100
            
            lines.append(f"\nUse {best_name} for M1 deployment:")
            lines.append(f"  Peak RAM: {best_report['peak_rss_mb']:.1f}MB "
                        f"(vs {baseline_peak:.1f}MB baseline)")
            lines.append(f"  Memory savings: {savings:.1f}MB ({savings_pct:.1f}%)")
            lines.append(f"  Batch size: {best_report.get('batch_size', '?')}")
        
        return "\n".join(lines)


# ============================================================================
# ALTERNATIVE: LanceDB FTS + Clustering (if BERTopic too memory-hungry)
# ============================================================================

class LanceDBTopicAlternative:
    """
    Alternative to BERTopic using LanceDB full-text search + clustering.
    Much lighter memory footprint (~200MB), but less sophisticated.
    
    Use if BERTopic partial_fit still exceeds memory budget.
    """
    
    def __init__(self, db_uri: str = "data/topics.lance"):
        self.db = lancedb.connect(db_uri)
        self.table_name = "topic_embeddings"
    
    def index_documents(self, documents: List[str], 
                       embeddings: np.ndarray):
        """Index documents with embeddings for FTS + clustering."""
        data = [
            {
                "doc_id": i,
                "text": doc,
                "embedding": embeddings[i].tolist(),
            }
            for i, doc in enumerate(documents)
        ]
        
        # LanceDB handles the rest: FTS indexing, vector quantization
        if self.table_name in self.db.table_names():
            self.db.drop_table(self.table_name)
        
        self.db.create_table(self.table_name, data=data)
        logger.info(f"Indexed {len(documents)} docs in LanceDB")
    
    def cluster_documents(self, n_clusters: int = 20) -> np.ndarray:
        """Simple clustering via embedding similarity (no HDBSCAN needed)."""
        from sklearn.cluster import KMeans
        
        # Fetch all embeddings
        table = self.db.open_table(self.table_name)
        embeddings = np.array([row["embedding"] for row in table.to_pandas().values])
        
        # Lightweight K-means clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(embeddings)
        
        logger.info(f"Clustered into {n_clusters} topics")
        return clusters
    
    def get_topic_terms(self, cluster_id: int, n_terms: int = 10) -> List[str]:
        """Extract top terms for cluster via FTS."""
        table = self.db.open_table(self.table_name)
        
        # Get documents in this cluster
        docs = table.search().where(f"cluster == {cluster_id}").limit(100).to_list()
        
        # Simple TF-IDF-like extraction
        from collections import Counter
        import re
        
        all_words = []
        for doc in docs:
            words = re.findall(r"\b\w+\b", doc["text"].lower())
            all_words.extend([w for w in words if len(w) > 3])
        
        top_words = Counter(all_words).most_common(n_terms)
        return [w for w, _ in top_words]


# ============================================================================
# MAIN: Integration with Scrapus extraction pipeline
# ============================================================================

def integrate_bertopic_optimized(
    documents: List[str],
    batch_size: int = 500,
    persistence_enabled: bool = True,
) -> Dict:
    """
    Drop-in replacement for current BERTopic integration.
    
    Usage:
        from scrapus.topic_modeling_optimized import integrate_bertopic_optimized
        
        pages = [page["clean_text"] for page in extracted_pages]
        result = integrate_bertopic_optimized(pages, batch_size=500)
        
        print(result["memory"]["peak_rss_mb"])  # Check memory
    """
    
    logger.info(f"Integrating optimized BERTopic for {len(documents)} documents")
    
    model = BERTopicM1Optimized(
        persistence_dir="scrapus_data/persistence"
        if persistence_enabled else None
    )
    
    # Fit with incremental learning
    result = model.fit_batch(documents, batch_size=batch_size)
    
    return {
        "topics": result["topics"],
        "probabilities": result["probabilities"],
        "topic_model": model.topic_model,
        "memory_report": result["memory"],
        "persistence_enabled": persistence_enabled,
    }


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    
    # Run comprehensive benchmark
    print("\n" + "=" * 100)
    print("RUNNING BERTOPIC MEMORY OPTIMIZATION BENCHMARKS")
    print("=" * 100 + "\n")
    
    benchmark = BERTopicMemoryBenchmark()
    
    # Generate test corpus
    test_docs = benchmark.generate_test_corpus(n_docs=5000)
    
    # Benchmark standard fit()
    fit_full_result = benchmark.benchmark_fit_full(test_docs)
    print(f"\nStandard fit() peak RAM: {fit_full_result['peak_rss_mb']:.1f}MB")
    
    # Benchmark partial_fit() with various batch sizes
    partial_results = benchmark.benchmark_partial_fit(
        test_docs, 
        batch_sizes=[100, 250, 500, 1000]
    )
    
    # Print comparison report
    print(benchmark.report_comparison())
    
    # Save results
    results_file = Path("scrapus_data/persistence/benchmark_results.json")
    results_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(results_file, "w") as f:
        # Convert numpy types for JSON serialization
        json_results = {
            k: {
                kk: float(vv) if isinstance(vv, (np.floating, float)) else vv
                for kk, vv in v.items()
            }
            for k, v in benchmark.results.items()
        }
        json.dump(json_results, f, indent=2)
    
    logger.info(f"Benchmark results saved to {results_file}")
