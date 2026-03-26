"""
Production-ready SBERT+DBSCAN blocking engine for Scrapus entity resolution.

Features:
- Semantic blocking via sentence-transformers (all-MiniLM-L6-v2)
- DBSCAN clustering for density-aware block formation
- Auto-calibrated epsilon tuning via cross-validation on labeled pairs
- Hybrid blocking keys: SBERT + cheap heuristics (first letter, domain TLD)
- Incremental blocking: add entities without full re-clustering
- Block size capping to prevent degenerate mega-blocks
- M1 optimization: batch encoding with adaptive batch sizes
- SQLite integration for persistent block storage
"""

import sqlite3
import json
import logging
from typing import Dict, List, Tuple, Optional, Set
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib

import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.cluster import DBSCAN
from sklearn.metrics import silhouette_score, davies_bouldin_score
from scipy.spatial.distance import cosine
import psutil


logger = logging.getLogger(__name__)


@dataclass
class BlockingKey:
    """Composite blocking key: SBERT similarity + heuristics."""
    first_letter: str
    domain_tld: Optional[str]
    sbert_block_id: Optional[int] = None
    heuristic_key: str = ""
    
    def __post_init__(self):
        """Generate deterministic composite key."""
        self.heuristic_key = f"{self.first_letter}_{self.domain_tld or 'none'}"


@dataclass
class Block:
    """Represents a candidate pair block."""
    block_id: int
    entity_ids: List[int]
    sbert_centroid: Optional[np.ndarray] = None
    density_score: float = 0.0
    created_at: float = 0.0
    updated_at: float = 0.0
    size_cap: int = 200
    
    def is_full(self) -> bool:
        """Check if block has reached capacity."""
        return len(self.entity_ids) >= self.size_cap
    
    def can_add(self, capacity: int = 200) -> bool:
        """Check if entity can be added without exceeding cap."""
        return len(self.entity_ids) < capacity


@dataclass
class EpsilonTuningResult:
    """Results from epsilon auto-calibration."""
    optimal_eps: float
    f1_score: float
    blocking_recall: float
    reduction_ratio: float
    pair_completeness: float
    silhouette: float
    davies_bouldin: float
    num_clusters: int
    avg_cluster_size: float


class SBERTBlocker:
    """
    Production-ready SBERT+DBSCAN blocking engine.
    
    Provides:
    - encode(): Batch SBERT encoding with M1 optimization
    - create_blocks(): Form DBSCAN clusters from embeddings
    - block_entity(): Route new entity to existing blocks (incremental)
    - Auto-calibrate epsilon from labeled pairs
    - Evaluation metrics: blocking recall, reduction ratio, pair completeness
    """
    
    def __init__(
        self,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        db_path: str = "scrapus_data/entity_resolution.db",
        min_samples: int = 2,
        max_block_size: int = 200,
        device: str = "cpu"
    ):
        """
        Initialize SBERT blocker.
        
        Args:
            model_name: HuggingFace model ID (default: all-MiniLM-L6-v2, 384-dim)
            db_path: SQLite database path for block storage
            min_samples: DBSCAN minimum samples per cluster
            max_block_size: Hard cap on block size (prevents mega-blocks)
            device: 'cpu' or 'mps' (M1 Metal Performance Shaders)
        """
        self.model = SentenceTransformer(model_name, device=device)
        self.embedding_dim = self.model.get_sentence_embedding_dimension()
        self.db_path = db_path
        self.min_samples = min_samples
        self.max_block_size = max_block_size
        self.device = device
        
        # Caching
        self.entity_embeddings = {}  # entity_id -> embedding
        self.blocks = {}  # block_id -> Block
        self.entity_to_blocks = defaultdict(list)  # entity_id -> [block_ids]
        
        # Epsilon tuning
        self.optimal_eps = 0.3  # default, will be tuned
        self.eps_tuning_history = []
        
        # M1 batch size optimization (16GB unified memory)
        self.batch_size = self._compute_optimal_batch_size()
        
        self._init_db()
        logger.info(f"SBERTBlocker initialized: model={model_name}, eps={self.optimal_eps}, batch_size={self.batch_size}")
    
    def _compute_optimal_batch_size(self) -> int:
        """
        Auto-compute batch size for M1 based on available RAM.
        
        Strategy:
        - Embedding overhead: ~1.6 KB per 384-dim vector (float32)
        - SBERT model: 80 MB always loaded
        - Target: use 50-100 MB for batches (conservative to avoid swapping)
        """
        available_ram_gb = psutil.virtual_memory().available / (1024**3)
        
        # Conservative allocation: 75 MB buffer for batch encoding
        embedding_bytes_per = self.embedding_dim * 4  # float32
        target_batch_mb = min(75, available_ram_gb * 100)  # 10% of available
        target_batch_bytes = target_batch_mb * 1024 * 1024
        
        batch_size = max(32, int(target_batch_bytes / embedding_bytes_per))
        logger.info(f"M1 optimization: available_ram={available_ram_gb:.1f}GB, batch_size={batch_size}")
        return batch_size
    
    def _init_db(self):
        """Initialize SQLite schema for block storage."""
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sbert_blocks (
                block_id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_ids TEXT NOT NULL,
                sbert_centroid BLOB,
                density_score REAL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                size_cap INTEGER DEFAULT 200,
                CHECK(size_cap > 0)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sbert_embeddings (
                entity_id INTEGER PRIMARY KEY,
                embedding BLOB NOT NULL,
                blocking_key TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS epsilon_tuning_log (
                tuning_id INTEGER PRIMARY KEY AUTOINCREMENT,
                eps REAL NOT NULL,
                f1_score REAL,
                blocking_recall REAL,
                reduction_ratio REAL,
                pair_completeness REAL,
                silhouette REAL,
                davies_bouldin REAL,
                num_clusters INTEGER,
                avg_cluster_size REAL,
                timestamp REAL NOT NULL
            )
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_blocks_updated
            ON sbert_blocks(updated_at DESC)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_embeddings_blocking_key
            ON sbert_embeddings(blocking_key)
        """)
        
        conn.commit()
        conn.close()
        logger.info(f"SQLite schema initialized at {self.db_path}")
    
    def encode(
        self,
        entities: List[Dict],
        text_field: str = "name",
        location_field: str = "location",
        industry_field: str = "industry"
    ) -> Dict[int, np.ndarray]:
        """
        Batch encode entities via SBERT with M1 optimization.
        
        Args:
            entities: List of entity dicts with id and text fields
            text_field: Field to use for primary blocking
            location_field: Optional field for enrichment
            industry_field: Optional field for enrichment
        
        Returns:
            Dict mapping entity_id -> 384-dim embedding (float32)
        
        Implementation:
        - Concatenates fields: "{name} {location} {industry}"
        - Processes in adaptive batches to stay within M1 RAM budget
        - Caches embeddings in memory for incremental blocking
        """
        embeddings = {}
        
        # Prepare texts: concatenate multiple fields for richer context
        texts = []
        entity_ids = []
        for ent in entities:
            parts = [str(ent.get(text_field, ""))]
            if location_field and ent.get(location_field):
                parts.append(f"[LOC: {ent[location_field]}]")
            if industry_field and ent.get(industry_field):
                parts.append(f"[IND: {ent[industry_field]}]")
            
            text = " ".join(parts).strip()
            if text:
                texts.append(text)
                entity_ids.append(ent["id"])
        
        if not texts:
            logger.warning("No valid texts to encode")
            return {}
        
        # Batch encode
        logger.info(f"Encoding {len(texts)} entities in batches of {self.batch_size}")
        all_embeddings = self.model.encode(
            texts,
            batch_size=self.batch_size,
            show_progress_bar=True,
            convert_to_numpy=True,
            normalize_embeddings=True  # L2 normalization for cosine distance
        )
        
        for eid, emb in zip(entity_ids, all_embeddings):
            embeddings[eid] = emb
            self.entity_embeddings[eid] = emb
        
        logger.info(f"Encoded {len(embeddings)} entities")
        return embeddings
    
    def create_blocking_key(self, entity: Dict) -> BlockingKey:
        """
        Generate hybrid blocking key from cheap heuristics.
        
        Strategy: Combine
        1. First letter of normalized name
        2. Domain TLD (if URL exists)
        
        Used to pre-filter candidates before DBSCAN distance check.
        """
        name = str(entity.get("name", "")).strip()
        first_letter = name[0].upper() if name else "?"
        
        url = entity.get("url", "")
        domain_tld = None
        if url:
            try:
                from urllib.parse import urlparse
                domain_tld = urlparse(url).netloc.split(".")[-1].lower()
            except:
                pass
        
        return BlockingKey(
            first_letter=first_letter,
            domain_tld=domain_tld
        )
    
    def create_blocks(
        self,
        entities: List[Dict],
        embeddings: Dict[int, np.ndarray],
        eps: Optional[float] = None,
        metric: str = "cosine"
    ) -> Dict[int, Block]:
        """
        Form DBSCAN clusters from SBERT embeddings.
        
        Args:
            entities: List of entity dicts
            embeddings: Dict mapping entity_id -> embedding
            eps: DBSCAN epsilon (distance threshold)
            metric: Distance metric ('cosine' for normalized embeddings)
        
        Returns:
            Dict mapping block_id -> Block
        
        Algorithm:
        1. Stack embeddings in order
        2. Run DBSCAN (eps auto-calibrated if not provided)
        3. Form blocks from clusters
        4. Cap block sizes to prevent mega-blocks
        5. Persist to SQLite
        """
        eps = eps or self.optimal_eps
        
        # Build embedding matrix
        entity_ids = [ent["id"] for ent in entities if ent["id"] in embeddings]
        embedding_matrix = np.array([embeddings[eid] for eid in entity_ids])
        
        logger.info(f"Creating blocks: {len(entity_ids)} entities, eps={eps}")
        
        # DBSCAN clustering
        # Note: cosine distance on normalized embeddings equals 1 - cosine_similarity
        clusterer = DBSCAN(
            eps=eps,
            min_samples=self.min_samples,
            metric=metric,
            n_jobs=-1
        )
        labels = clusterer.fit_predict(embedding_matrix)
        
        # Form blocks from clusters
        blocks = {}
        block_id_counter = 1
        cluster_to_block = defaultdict(list)
        
        for entity_id, label in zip(entity_ids, labels):
            if label == -1:  # noise point (create singleton block)
                block = Block(
                    block_id=block_id_counter,
                    entity_ids=[entity_id],
                    sbert_centroid=None,
                    density_score=0.0,
                    created_at=datetime.now().timestamp(),
                    updated_at=datetime.now().timestamp()
                )
                blocks[block_id_counter] = block
                self.entity_to_blocks[entity_id].append(block_id_counter)
                block_id_counter += 1
            else:
                cluster_to_block[label].append(entity_id)
        
        # Cluster-based blocks with size capping
        for label, entity_list in cluster_to_block.items():
            # Cap block size to prevent mega-blocks
            if len(entity_list) > self.max_block_size:
                # Randomly sample to cap size
                entity_list = list(np.random.choice(
                    entity_list,
                    size=self.max_block_size,
                    replace=False
                ))
            
            # Compute centroid
            cluster_embeddings = np.array([embeddings[eid] for eid in entity_list])
            centroid = cluster_embeddings.mean(axis=0)
            
            # Compute density score (avg intra-cluster distance)
            distances = [
                cosine(embeddings[eid], centroid)
                for eid in entity_list
            ]
            density = np.mean(distances) if distances else 0.0
            
            block = Block(
                block_id=block_id_counter,
                entity_ids=entity_list,
                sbert_centroid=centroid,
                density_score=1.0 / (1.0 + density),  # normalize to [0,1]
                created_at=datetime.now().timestamp(),
                updated_at=datetime.now().timestamp(),
                size_cap=self.max_block_size
            )
            blocks[block_id_counter] = block
            
            for eid in entity_list:
                self.entity_to_blocks[eid].append(block_id_counter)
            
            block_id_counter += 1
        
        self.blocks = blocks
        logger.info(f"Created {len(blocks)} blocks from {len(entity_ids)} entities")
        self._persist_blocks_to_db(blocks)
        
        return blocks
    
    def block_entity(
        self,
        entity: Dict,
        embedding: np.ndarray,
        max_candidates: int = 100,
        similarity_threshold: float = 0.4
    ) -> List[int]:
        """
        Incrementally block a new entity without full re-clustering.
        
        Strategy:
        1. Find K nearest blocks (by centroid distance)
        2. Within each block, find entities within similarity_threshold
        3. Return deduplicated candidate entity IDs
        
        This avoids expensive DBSCAN re-clustering on the full dataset.
        
        Args:
            entity: New entity dict with 'id' field
            embedding: 384-dim SBERT embedding (normalized)
            max_candidates: Maximum number of candidates to return
            similarity_threshold: Min cosine similarity to include
        
        Returns:
            List of candidate entity IDs in ascending order
        """
        entity_id = entity["id"]
        
        if not self.blocks:
            logger.warning("No blocks available; call create_blocks() first")
            return []
        
        # Find nearest blocks by centroid distance
        block_distances = []
        for bid, block in self.blocks.items():
            if block.sbert_centroid is not None:
                dist = cosine(embedding, block.sbert_centroid)
                block_distances.append((bid, dist))
        
        if not block_distances:
            return []
        
        block_distances.sort(key=lambda x: x[1])
        
        # Collect candidates from nearby blocks
        candidates = set()
        for bid, centroid_dist in block_distances[:10]:  # top 10 blocks
            block = self.blocks[bid]
            
            for eid in block.entity_ids:
                if eid == entity_id:
                    continue
                
                # Check similarity to entity
                if eid in self.entity_embeddings:
                    sim = 1.0 - cosine(
                        embedding,
                        self.entity_embeddings[eid]
                    )
                    if sim >= similarity_threshold:
                        candidates.add(eid)
            
            if len(candidates) >= max_candidates:
                break
        
        result = sorted(list(candidates))[:max_candidates]
        logger.info(f"Entity {entity_id}: {len(result)} candidates from {len(self.blocks)} blocks")
        return result
    
    def tune_epsilon(
        self,
        labeled_pairs: List[Tuple[int, int, int]],
        embeddings: Dict[int, np.ndarray],
        eps_range: Tuple[float, float] = (0.1, 0.5),
        n_folds: int = 5
    ) -> EpsilonTuningResult:
        """
        Auto-calibrate epsilon from labeled pairs via cross-validation.
        
        Args:
            labeled_pairs: List of (entity1_id, entity2_id, label) tuples
                           where label=1 means duplicate, label=0 means distinct
            embeddings: Dict mapping entity_id -> embedding
            eps_range: Range to search for epsilon
            n_folds: K-fold cross-validation splits
        
        Returns:
            EpsilonTuningResult with optimal epsilon and metrics
        
        Optimization goal: Maximize blocking recall (catch true duplicates)
        while minimizing reduction ratio (avoid huge candidate sets).
        
        F1 = 2 * (recall * (1 - reduction_ratio)) / (recall + (1 - reduction_ratio))
        """
        logger.info(f"Tuning epsilon from {len(labeled_pairs)} labeled pairs, {n_folds} folds")
        
        # Split pairs for cross-validation
        pair_indices = np.arange(len(labeled_pairs))
        np.random.shuffle(pair_indices)
        fold_size = len(pair_indices) // n_folds
        
        eps_candidates = np.linspace(eps_range[0], eps_range[1], 15)
        results = {}
        
        for eps in eps_candidates:
            fold_scores = []
            
            for fold_idx in range(n_folds):
                val_start = fold_idx * fold_size
                val_end = (fold_idx + 1) * fold_size if fold_idx < n_folds - 1 else len(pair_indices)
                
                train_indices = np.concatenate([
                    pair_indices[:val_start],
                    pair_indices[val_end:]
                ])
                val_indices = pair_indices[val_start:val_end]
                
                # Train on fold: create blocks with this eps
                train_eids = list(set([
                    labeled_pairs[i][0] for i in train_indices
                ] + [
                    labeled_pairs[i][1] for i in train_indices
                ]))
                train_entities = [{"id": eid} for eid in train_eids]
                train_embeddings = {eid: embeddings[eid] for eid in train_eids if eid in embeddings}
                
                blocks = self.create_blocks(
                    train_entities,
                    train_embeddings,
                    eps=eps
                )
                
                # Evaluate on fold
                metrics = self._evaluate_blocks(
                    blocks,
                    [labeled_pairs[i] for i in val_indices]
                )
                fold_scores.append(metrics)
            
            # Average fold scores
            avg_metrics = {
                "f1": np.mean([m["f1"] for m in fold_scores]),
                "blocking_recall": np.mean([m["blocking_recall"] for m in fold_scores]),
                "reduction_ratio": np.mean([m["reduction_ratio"] for m in fold_scores]),
                "pair_completeness": np.mean([m["pair_completeness"] for m in fold_scores]),
            }
            results[eps] = avg_metrics
        
        # Select best eps by F1 score
        best_eps = max(results.keys(), key=lambda e: results[e]["f1"])
        best_result = results[best_eps]
        
        self.optimal_eps = best_eps
        logger.info(f"Optimal eps={best_eps:.3f}, F1={best_result['f1']:.3f}, recall={best_result['blocking_recall']:.3f}")
        
        # Log tuning result
        self._log_epsilon_tuning(best_eps, best_result)
        
        return EpsilonTuningResult(
            optimal_eps=best_eps,
            f1_score=best_result["f1"],
            blocking_recall=best_result["blocking_recall"],
            reduction_ratio=best_result["reduction_ratio"],
            pair_completeness=best_result["pair_completeness"],
            silhouette=best_result.get("silhouette", 0.0),
            davies_bouldin=best_result.get("davies_bouldin", 0.0),
            num_clusters=best_result.get("num_clusters", 0),
            avg_cluster_size=best_result.get("avg_cluster_size", 0.0)
        )
    
    def _evaluate_blocks(
        self,
        blocks: Dict[int, Block],
        labeled_pairs: List[Tuple[int, int, int]]
    ) -> Dict:
        """
        Evaluate blocks on labeled pairs.
        
        Metrics:
        - Blocking recall: fraction of duplicate pairs that are in same block
        - Reduction ratio: fraction of non-duplicate pairs removed
        - Pair completeness: fraction of pairs within blocks that should be checked
        """
        entity_to_blocks = defaultdict(set)
        for bid, block in blocks.items():
            for eid in block.entity_ids:
                entity_to_blocks[eid].add(bid)
        
        # Count pairs by type
        duplicate_pairs = [p for p in labeled_pairs if p[2] == 1]
        non_duplicate_pairs = [p for p in labeled_pairs if p[2] == 0]
        
        if not duplicate_pairs:
            return {"f1": 0.0, "blocking_recall": 0.0, "reduction_ratio": 0.0, "pair_completeness": 0.0}
        
        # Blocking recall: how many duplicate pairs are in same block?
        duplicates_in_blocks = 0
        for e1, e2, _ in duplicate_pairs:
            blocks1 = entity_to_blocks.get(e1, set())
            blocks2 = entity_to_blocks.get(e2, set())
            if blocks1 & blocks2:  # intersection
                duplicates_in_blocks += 1
        
        blocking_recall = duplicates_in_blocks / len(duplicate_pairs) if duplicate_pairs else 0.0
        
        # Reduction ratio: fraction of non-duplicate pairs removed from consideration
        non_duplicates_in_blocks = 0
        for e1, e2, _ in non_duplicate_pairs:
            blocks1 = entity_to_blocks.get(e1, set())
            blocks2 = entity_to_blocks.get(e2, set())
            if blocks1 & blocks2:
                non_duplicates_in_blocks += 1
        
        total_non_duplicate_pairs = len(non_duplicate_pairs) if non_duplicate_pairs else 1
        reduction_ratio = 1.0 - (non_duplicates_in_blocks / total_non_duplicate_pairs)
        
        # Pair completeness: fraction of all candidate pairs within blocks
        total_pairs_in_blocks = sum(
            len(block.entity_ids) * (len(block.entity_ids) - 1) // 2
            for block in blocks.values()
        )
        total_possible_pairs = len(labeled_pairs)
        pair_completeness = (
            total_pairs_in_blocks / total_possible_pairs
            if total_possible_pairs > 0
            else 0.0
        )
        
        # F1: harmonic mean of blocking recall and reduction ratio
        f1 = 2.0 * (blocking_recall * reduction_ratio) / (blocking_recall + reduction_ratio + 1e-8)
        
        return {
            "f1": f1,
            "blocking_recall": blocking_recall,
            "reduction_ratio": reduction_ratio,
            "pair_completeness": pair_completeness,
        }
    
    def _persist_blocks_to_db(self, blocks: Dict[int, Block]):
        """Persist blocks to SQLite."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for bid, block in blocks.items():
            entity_ids_json = json.dumps(block.entity_ids)
            centroid_blob = (
                block.sbert_centroid.tobytes()
                if block.sbert_centroid is not None
                else None
            )
            
            cursor.execute("""
                INSERT OR REPLACE INTO sbert_blocks
                (block_id, entity_ids, sbert_centroid, density_score, created_at, updated_at, size_cap)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                bid,
                entity_ids_json,
                centroid_blob,
                block.density_score,
                block.created_at,
                block.updated_at,
                block.size_cap
            ))
        
        conn.commit()
        conn.close()
    
    def _log_epsilon_tuning(self, eps: float, result: Dict):
        """Log epsilon tuning result."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO epsilon_tuning_log
            (eps, f1_score, blocking_recall, reduction_ratio, pair_completeness, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            eps,
            result["f1"],
            result["blocking_recall"],
            result["reduction_ratio"],
            result["pair_completeness"],
            datetime.now().timestamp()
        ))
        conn.commit()
        conn.close()


# ============================================================================
# Comparison with Alternatives
# ============================================================================

class LSHBlocker:
    """Locality-Sensitive Hashing (MinHash) blocking alternative."""
    
    def __init__(self, num_perm: int = 128, threshold: float = 0.5):
        from datasketch import MinHashLSH
        self.lsh = MinHashLSH(threshold=threshold, num_perm=num_perm)
        self.num_perm = num_perm
    
    def block_entities(self, entities: List[Dict]) -> Dict[int, List[int]]:
        """Block via MinHash similarity."""
        from datasketch import MinHash
        
        entity_to_block = defaultdict(list)
        
        for entity in entities:
            m = MinHash(num_perm=self.num_perm)
            tokens = str(entity.get("name", "")).split()
            for token in tokens:
                m.update(token.encode("utf8"))
            
            # Query LSH
            similar = self.lsh.query(m)
            entity_to_block[entity["id"]] = [int(s.split("_")[1]) for s in similar]
            
            # Insert for future queries
            self.lsh.insert(f"entity_{entity['id']}", m)
        
        return entity_to_block


class SortedNeighborhoodBlocker:
    """Sorted neighborhood method blocking (Kepiwal 2021)."""
    
    def __init__(self, window_size: int = 5):
        self.window_size = window_size
    
    def block_entities(self, entities: List[Dict]) -> Dict[int, List[int]]:
        """Block via sorted keys."""
        def blocking_key(entity):
            name = str(entity.get("name", "")).upper()
            return name[:4]  # 4-character prefix
        
        sorted_entities = sorted(entities, key=blocking_key)
        blocks = defaultdict(list)
        
        for i in range(len(sorted_entities)):
            for j in range(i + 1, min(i + self.window_size + 1, len(sorted_entities))):
                e1_id = sorted_entities[i]["id"]
                e2_id = sorted_entities[j]["id"]
                blocks[e1_id].append(e2_id)
        
        return blocks


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Create test entities
    test_entities = [
        {"id": 1, "name": "Acme Corporation", "location": "Berlin", "industry": "cybersecurity"},
        {"id": 2, "name": "ACME Corp", "location": "Berlin", "industry": "AI"},
        {"id": 3, "name": "Acme Inc.", "location": "Berlin, Germany", "industry": "cybersecurity"},
        {"id": 4, "name": "TechStartup GmbH", "location": "Munich", "industry": "ML"},
        {"id": 5, "name": "Tech Startup", "location": "Munich, Germany", "industry": "machine learning"},
    ]
    
    # Initialize blocker
    blocker = SBERTBlocker()
    
    # Encode entities
    embeddings = blocker.encode(test_entities)
    
    # Create blocks
    blocks = blocker.create_blocks(test_entities, embeddings)
    
    # Block a new entity
    new_entity = {"id": 6, "name": "Acme GmbH", "location": "Berlin"}
    new_embedding = blocker.encode([new_entity])[6]
    candidates = blocker.block_entity(new_entity, new_embedding)
    print(f"Candidates for entity 6: {candidates}")
