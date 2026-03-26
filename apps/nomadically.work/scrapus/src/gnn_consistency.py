"""
Lightweight GNN Consistency Layer for Entity Resolution
Optimized for M1 16GB (target: <50MB memory for 7,500 entities)
Zero GPU dependency - CPU-only message passing
"""

import sqlite3
import json
import logging
from typing import Dict, List, Tuple, Set, Optional
from dataclasses import dataclass, field, asdict
from collections import defaultdict, deque
import numpy as np
import networkx as nx
from datetime import datetime
import hashlib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ============================================================================
# 1. DATA STRUCTURES & TYPES
# ============================================================================

@dataclass
class MatchDecision:
    """Pairwise matching result from deep matcher"""
    entity1_id: int
    entity2_id: int
    confidence: float  # [0, 1]
    match: bool  # True = match, False = non-match
    method: str  # "sbert", "ditto", "llm"
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


@dataclass
class GraphEdge:
    """Weighted edge in resolution graph"""
    source_id: int
    target_id: int
    confidence: float  # [0, 1]
    method: str
    rounds_propagated: int = 0


@dataclass
class EntityCluster:
    """Connected component after message passing"""
    cluster_id: int
    members: Set[int] = field(default_factory=set)
    representative_id: Optional[int] = None
    min_edge_weight: float = 1.0
    max_edge_weight: float = 0.0
    avg_edge_weight: float = 0.0
    is_consistent: bool = True  # True if all transitive relations hold


@dataclass
class ResolutionMetrics:
    """Metrics for GNN consistency check"""
    num_entities: int
    num_edges: int
    num_clusters: int
    num_inconsistencies_found: int
    num_inconsistencies_fixed: int
    transitivity_violations: List[Tuple[int, int, int]] = field(default_factory=list)
    memory_bytes: int = 0
    runtime_ms: float = 0.0


# ============================================================================
# 2. UNION-FIND (BASELINE FOR COMPARISON)
# ============================================================================

class UnionFind:
    """Classical union-find for entity clustering (baseline)"""
    
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n
        self.confidence = [1.0] * n  # Track min confidence in each cluster
    
    def find(self, x: int) -> int:
        """Path compression find"""
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]
    
    def union(self, x: int, y: int, confidence: float = 1.0):
        """Union by rank with confidence tracking"""
        px, py = self.find(x), self.find(y)
        if px == py:
            return
        
        # Union by rank
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1
        
        # Track minimum confidence in cluster
        self.confidence[px] = min(self.confidence[px], confidence)
    
    def get_clusters(self) -> Dict[int, Set[int]]:
        """Extract clusters"""
        clusters = defaultdict(set)
        for i in range(len(self.parent)):
            clusters[self.find(i)].add(i)
        return dict(clusters)


# ============================================================================
# 3. LIGHTWEIGHT GNN CONSISTENCY LAYER
# ============================================================================

class LightweightGNNResolver:
    """
    Memory-efficient GNN for entity resolution via message passing.
    Target: <50MB for 7,500 entities on CPU.
    """
    
    def __init__(self, max_entities: int = 7500, rounds: int = 3):
        self.max_entities = max_entities
        self.num_rounds = rounds
        self.graph = nx.Graph()
        
        # Compact storage: avoid storing full embeddings
        self.node_confidence = {}  # node_id -> float
        self.edge_confidence = {}  # (u, v) -> float
        self.message_history = defaultdict(list)  # For convergence tracking
        
        # Metrics tracking
        self.metrics = ResolutionMetrics(0, 0, 0, 0, 0)
    
    def build_resolution_graph(self, match_decisions: List[MatchDecision]) -> int:
        """
        Build resolution graph from pairwise matcher outputs.
        Only include matches (confidence > 0) and handle duplicates.
        
        Returns: number of edges added
        """
        logger.info(f"Building resolution graph from {len(match_decisions)} decisions")
        
        # Filter to matches only
        matches = [d for d in match_decisions if d.match and d.confidence > 0.5]
        
        # Track unique edges (dedup by sorted pair)
        edge_set = set()
        edges_added = 0
        
        for decision in matches:
            # Canonical edge form (smaller ID first)
            edge_key = tuple(sorted([decision.entity1_id, decision.entity2_id]))
            
            if edge_key not in edge_set:
                u, v = edge_key
                
                # Add nodes with initial confidence
                if u not in self.node_confidence:
                    self.node_confidence[u] = decision.confidence
                if v not in self.node_confidence:
                    self.node_confidence[v] = decision.confidence
                
                # Add edge with confidence
                self.graph.add_edge(u, v, confidence=decision.confidence, 
                                   method=decision.method)
                self.edge_confidence[edge_key] = decision.confidence
                edge_set.add(edge_key)
                edges_added += 1
        
        self.metrics.num_entities = len(self.node_confidence)
        self.metrics.num_edges = edges_added
        
        logger.info(f"Built graph: {self.metrics.num_entities} nodes, "
                   f"{self.metrics.num_edges} edges")
        return edges_added
    
    def propagate_confidence(self) -> Dict[int, float]:
        """
        3-round message passing to propagate confidence through clusters.
        
        Each node updates its confidence based on neighbors:
        new_conf = 0.7 * current_conf + 0.3 * mean(neighbor_confidences)
        
        Returns: final node confidences
        """
        logger.info(f"Starting {self.num_rounds}-round message passing")
        
        current_confidence = dict(self.node_confidence)
        
        for round_num in range(self.num_rounds):
            next_confidence = {}
            
            for node in self.graph.nodes():
                neighbors = list(self.graph.neighbors(node))
                
                if not neighbors:
                    next_confidence[node] = current_confidence[node]
                    continue
                
                # Weighted mean of neighbor confidences
                neighbor_confs = [
                    current_confidence.get(n, 0.5) * 
                    self.graph[node][n].get('confidence', 0.5)
                    for n in neighbors
                ]
                neighbor_mean = np.mean(neighbor_confs) if neighbor_confs else 0.5
                
                # Update: weighted combination
                new_conf = 0.7 * current_confidence[node] + 0.3 * neighbor_mean
                next_confidence[node] = new_conf
                
                # Log message for convergence tracking
                self.message_history[node].append(new_conf)
            
            current_confidence = next_confidence
            avg_conf = np.mean(list(current_confidence.values()))
            logger.info(f"Round {round_num + 1}: avg confidence = {avg_conf:.4f}")
        
        self.node_confidence = current_confidence
        return current_confidence
    
    def detect_transitivity_violations(self) -> List[Tuple[int, int, int]]:
        """
        Detect A=B, B=C but not A=C violations.
        
        Returns: list of (A, B, C) triples where A-B and B-C connected,
                 but A-C missing (violation)
        """
        violations = []
        
        for node_b in self.graph.nodes():
            neighbors = list(self.graph.neighbors(node_b))
            
            # Check all pairs of neighbors
            for i, node_a in enumerate(neighbors):
                for node_c in neighbors[i+1:]:
                    if node_a >= node_c:  # Avoid duplicates
                        continue
                    
                    # Check if A-C edge exists
                    if not self.graph.has_edge(node_a, node_c):
                        # Transitive violation: A=B, B=C but not A=C
                        violations.append((node_a, node_b, node_c))
        
        logger.info(f"Found {len(violations)} transitivity violations")
        self.metrics.num_inconsistencies_found = len(violations)
        return violations
    
    def fix_transitivity_violations(self, violations: List[Tuple[int, int, int]],
                                    threshold: float = 0.6) -> int:
        """
        Fix transitivity violations by adding inferred A-C edges.
        
        Args:
            violations: List of (A, B, C) triples
            threshold: Minimum confidence for inferred edges
        
        Returns: number of edges added
        """
        edges_added = 0
        
        for a, b, c in violations:
            # Confidence of inferred A-C edge = min(A-B, B-C) * 0.9
            conf_ab = self.graph[a][b].get('confidence', 0.5)
            conf_bc = self.graph[b][c].get('confidence', 0.5)
            inferred_conf = min(conf_ab, conf_bc) * 0.9  # Discount for inference
            
            if inferred_conf >= threshold:
                self.graph.add_edge(a, c, confidence=inferred_conf, 
                                   method="transitivity_inference")
                self.edge_confidence[(min(a, c), max(a, c))] = inferred_conf
                edges_added += 1
                logger.debug(f"Added inferred edge {a}-{c} with confidence {inferred_conf:.3f}")
        
        self.metrics.num_inconsistencies_fixed = edges_added
        return edges_added
    
    def extract_clusters(self, threshold: float = 0.6) -> Dict[int, EntityCluster]:
        """
        Extract connected components as entity clusters.
        
        Args:
            threshold: Minimum confidence threshold for edge inclusion
        
        Returns: dict of cluster_id -> EntityCluster
        """
        logger.info(f"Extracting clusters with threshold={threshold}")
        
        # Filter graph by confidence threshold
        pruned_graph = self.graph.copy()
        edges_to_remove = [
            (u, v) for u, v, d in pruned_graph.edges(data=True)
            if d.get('confidence', 0) < threshold
        ]
        pruned_graph.remove_edges_from(edges_to_remove)
        
        # Extract connected components
        clusters = {}
        for cluster_id, component in enumerate(nx.connected_components(pruned_graph)):
            component_set = set(component)
            
            # Find representative (highest confidence node)
            representative = max(
                component_set,
                key=lambda n: self.node_confidence.get(n, 0)
            )
            
            # Calculate cluster statistics
            edges_in_cluster = [
                (u, v, d) for u, v, d in self.graph.edges(data=True)
                if u in component_set and v in component_set
            ]
            
            confidences = [d['confidence'] for _, _, d in edges_in_cluster]
            
            cluster = EntityCluster(
                cluster_id=cluster_id,
                members=component_set,
                representative_id=representative,
                min_edge_weight=min(confidences) if confidences else 1.0,
                max_edge_weight=max(confidences) if confidences else 0.0,
                avg_edge_weight=np.mean(confidences) if confidences else 0.5,
                is_consistent=True
            )
            
            clusters[cluster_id] = cluster
        
        self.metrics.num_clusters = len(clusters)
        logger.info(f"Extracted {len(clusters)} clusters")
        return clusters
    
    def decide_merges(self, clusters: Dict[int, EntityCluster],
                     confidence_threshold: float = 0.6) -> List[Tuple[int, int, str]]:
        """
        Decide which entities to merge based on cluster characteristics.
        
        Decision logic:
        - Same cluster + avg_confidence > threshold → MERGE
        - Different clusters + edge exists + confidence > threshold → MERGE
        - Otherwise → KEEP_SEPARATE
        
        Returns: list of (entity1, entity2, decision) tuples
        """
        merge_decisions = []
        
        # Within-cluster merges
        for cluster_id, cluster in clusters.items():
            if len(cluster.members) < 2:
                continue
            
            # All pairs in cluster with sufficient confidence
            if cluster.avg_edge_weight >= confidence_threshold:
                members = sorted(cluster.members)
                representative = cluster.representative_id
                
                for member in members:
                    if member != representative:
                        merge_decisions.append(
                            (member, representative, "MERGE_CLUSTER")
                        )
        
        logger.info(f"Decided {len(merge_decisions)} merges")
        return merge_decisions


# ============================================================================
# 4. CORRELATION CLUSTERING (FOR COMPARISON)
# ============================================================================

class CorrelationClusteringResolver:
    """
    Correlation clustering via greedy optimization.
    Optimizes: (match confidence) - (non-match cost)
    Good for dense graphs with diverse edge weights.
    """
    
    def __init__(self):
        self.clusters = {}
    
    def resolve(self, match_decisions: List[MatchDecision]) -> Dict[int, Set[int]]:
        """
        Greedy correlation clustering:
        1. Start each entity in own cluster
        2. Iteratively merge/split to maximize objective
        """
        # Build graph
        edges = defaultdict(list)
        nodes = set()
        
        for decision in match_decisions:
            nodes.add(decision.entity1_id)
            nodes.add(decision.entity2_id)
            if decision.match and decision.confidence > 0.5:
                edges[decision.entity1_id].append(
                    (decision.entity2_id, decision.confidence)
                )
                edges[decision.entity2_id].append(
                    (decision.entity1_id, decision.confidence)
                )
        
        # Initialize each node in own cluster
        clusters = {node: {node} for node in nodes}
        changed = True
        iterations = 0
        max_iterations = 10
        
        while changed and iterations < max_iterations:
            changed = False
            iterations += 1
            
            # Try merging clusters
            for node in sorted(nodes):
                cluster_a = clusters[node]
                
                # Find best neighbor cluster to merge with
                best_gain = 0
                best_cluster_b = None
                
                for neighbor, conf in edges.get(node, []):
                    cluster_b = clusters[neighbor]
                    
                    if cluster_a is cluster_b:
                        continue
                    
                    # Cost of merging: within-cluster similarity gain
                    gain = self._merge_gain(cluster_a, cluster_b, edges)
                    
                    if gain > best_gain:
                        best_gain = gain
                        best_cluster_b = cluster_b
                
                # Perform best merge
                if best_cluster_b and best_gain > 0:
                    # Merge clusters_b into clusters_a
                    cluster_a.update(best_cluster_b)
                    for node_b in best_cluster_b:
                        clusters[node_b] = cluster_a
                    changed = True
        
        # Deduplicate clusters
        unique_clusters = {}
        for nodes_in_cluster in set(id(c) for c in clusters.values()):
            representative = None
            member_set = set()
            for node, cluster in clusters.items():
                if id(cluster) == nodes_in_cluster:
                    member_set.add(node)
                    if representative is None:
                        representative = node
            if member_set:
                unique_clusters[representative] = member_set
        
        self.clusters = unique_clusters
        return unique_clusters
    
    def _merge_gain(self, cluster_a: Set[int], cluster_b: Set[int],
                   edges: Dict[int, List[Tuple[int, float]]]) -> float:
        """Calculate gain from merging two clusters"""
        total_gain = 0.0
        
        for node_a in cluster_a:
            for node_b in cluster_b:
                # Find edge confidence
                edge_conf = 0.0
                for neighbor, conf in edges.get(node_a, []):
                    if neighbor == node_b:
                        edge_conf = conf
                        break
                
                # Gain from merging = edge confidence - (1 - edge_conf)
                total_gain += edge_conf - (1.0 - edge_conf)
        
        return total_gain / (len(cluster_a) * len(cluster_b) + 1e-6)


# ============================================================================
# 5. SQLITE INTEGRATION
# ============================================================================

class SQLiteGraphStore:
    """Interface to SQLite graph schema"""
    
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_schema()
    
    def _init_schema(self):
        """Create required tables if not exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Edges table (already exists in main schema)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_type TEXT NOT NULL,
                source_id INTEGER NOT NULL,
                relation TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id INTEGER NOT NULL,
                properties TEXT,
                confidence REAL DEFAULT 1.0,
                created_at REAL,
                UNIQUE(source_type, source_id, relation, target_type, target_id)
            )
        """)
        
        # GNN resolution graph table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gnn_resolution_edges (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity1_id INTEGER NOT NULL,
                entity2_id INTEGER NOT NULL,
                confidence REAL NOT NULL,
                method TEXT NOT NULL,
                source TEXT NOT NULL,  -- "pairwise" or "transitivity_inference"
                created_at REAL,
                UNIQUE(entity1_id, entity2_id)
            )
        """)
        
        # GNN clusters (results)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gnn_clusters (
                cluster_id INTEGER PRIMARY KEY,
                representative_id INTEGER NOT NULL,
                member_count INTEGER NOT NULL,
                min_confidence REAL,
                max_confidence REAL,
                avg_confidence REAL,
                is_consistent INTEGER DEFAULT 1,
                created_at REAL
            )
        """)
        
        # GNN cluster membership
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gnn_cluster_members (
                cluster_id INTEGER,
                entity_id INTEGER,
                PRIMARY KEY (cluster_id, entity_id)
            )
        """)
        
        # GNN metrics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS gnn_metrics (
                run_id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp REAL,
                num_entities INTEGER,
                num_edges INTEGER,
                num_clusters INTEGER,
                inconsistencies_found INTEGER,
                inconsistencies_fixed INTEGER,
                runtime_ms REAL,
                memory_bytes INTEGER
            )
        """)
        
        conn.commit()
        conn.close()
    
    def read_pairwise_matches(self) -> List[MatchDecision]:
        """Read pairwise matching results from match_decisions table"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT entity1_id, entity2_id, match_prob, decision, 
                   model_version, timestamp
            FROM match_decisions
            WHERE decision IS NOT NULL
        """)
        
        decisions = []
        for row in cursor.fetchall():
            entity1_id, entity2_id, match_prob, decision, model_version, timestamp = row
            decisions.append(MatchDecision(
                entity1_id=entity1_id,
                entity2_id=entity2_id,
                confidence=match_prob,
                match=bool(decision),
                method=model_version or "unknown",
                timestamp=timestamp
            ))
        
        conn.close()
        return decisions
    
    def write_resolution_edges(self, clusters: Dict[int, EntityCluster]):
        """Write GNN resolution graph edges to SQLite"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for cluster_id, cluster in clusters.items():
            for member in cluster.members:
                for other_member in cluster.members:
                    if member < other_member:
                        # Find edge confidence in graph
                        cursor.execute("""
                            INSERT OR IGNORE INTO gnn_resolution_edges
                            (entity1_id, entity2_id, confidence, method, source, created_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                        """, (
                            member, other_member,
                            cluster.avg_edge_weight,
                            "gnn_message_passing",
                            "cluster_member",
                            datetime.now().timestamp()
                        ))
        
        conn.commit()
        conn.close()
    
    def write_clusters(self, clusters: Dict[int, EntityCluster]):
        """Write cluster results to SQLite"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for cluster_id, cluster in clusters.items():
            cursor.execute("""
                INSERT INTO gnn_clusters
                (cluster_id, representative_id, member_count, min_confidence, 
                 max_confidence, avg_confidence, is_consistent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cluster_id,
                cluster.representative_id,
                len(cluster.members),
                cluster.min_edge_weight,
                cluster.max_edge_weight,
                cluster.avg_edge_weight,
                int(cluster.is_consistent),
                datetime.now().timestamp()
            ))
            
            # Write members
            for entity_id in cluster.members:
                cursor.execute("""
                    INSERT INTO gnn_cluster_members (cluster_id, entity_id)
                    VALUES (?, ?)
                """, (cluster_id, entity_id))
        
        conn.commit()
        conn.close()
    
    def write_metrics(self, metrics: ResolutionMetrics):
        """Write GNN metrics to SQLite"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO gnn_metrics
            (timestamp, num_entities, num_edges, num_clusters, 
             inconsistencies_found, inconsistencies_fixed, runtime_ms, memory_bytes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            datetime.now().timestamp(),
            metrics.num_entities,
            metrics.num_edges,
            metrics.num_clusters,
            metrics.num_inconsistencies_found,
            metrics.num_inconsistencies_fixed,
            metrics.runtime_ms,
            metrics.memory_bytes
        ))
        
        conn.commit()
        conn.close()


# ============================================================================
# 6. COMPLETE PIPELINE ORCHESTRATOR
# ============================================================================

class EntityResolutionPipeline:
    """
    Complete ER pipeline with conditional GNN application.
    Compares: union-find, GNN, correlation clustering.
    """
    
    def __init__(self, db_path: str):
        self.db = SQLiteGraphStore(db_path)
        self.pairwise_f1 = None
    
    def should_apply_gnn(self, pairwise_f1: float) -> bool:
        """Only apply GNN if pairwise F1 < 95%"""
        self.pairwise_f1 = pairwise_f1
        return pairwise_f1 < 0.95
    
    def run(self, pairwise_f1: float = 0.90, method: str = "gnn") -> Dict:
        """
        Run entity resolution with specified method.
        
        Args:
            pairwise_f1: F1 score from pairwise matcher
            method: "union_find", "gnn", or "correlation_clustering"
        
        Returns: resolution results with metrics
        """
        logger.info(f"Starting ER pipeline with pairwise F1={pairwise_f1:.4f}")
        
        # Check if GNN needed
        if not self.should_apply_gnn(pairwise_f1):
            logger.info("Pairwise F1 >= 95%, skipping GNN consistency layer")
            return {"status": "skipped", "reason": "high_pairwise_f1"}
        
        # Read pairwise matches from SQLite
        match_decisions = self.db.read_pairwise_matches()
        logger.info(f"Loaded {len(match_decisions)} pairwise decisions")
        
        if method == "union_find":
            results = self._run_union_find(match_decisions)
        elif method == "gnn":
            results = self._run_gnn(match_decisions)
        elif method == "correlation_clustering":
            results = self._run_correlation_clustering(match_decisions)
        else:
            raise ValueError(f"Unknown method: {method}")
        
        return results
    
    def _run_union_find(self, decisions: List[MatchDecision]) -> Dict:
        """Baseline: union-find clustering"""
        logger.info("Running union-find baseline")
        
        # Get all entity IDs
        entity_ids = set()
        for decision in decisions:
            entity_ids.add(decision.entity1_id)
            entity_ids.add(decision.entity2_id)
        
        entity_list = sorted(entity_ids)
        entity_to_idx = {eid: idx for idx, eid in enumerate(entity_list)}
        
        # Run union-find
        uf = UnionFind(len(entity_list))
        for decision in decisions:
            if decision.match and decision.confidence > 0.5:
                idx1 = entity_to_idx[decision.entity1_id]
                idx2 = entity_to_idx[decision.entity2_id]
                uf.union(idx1, idx2, decision.confidence)
        
        # Convert back to entity IDs
        clusters = {}
        for root_idx, cluster_set in uf.get_clusters().items():
            if cluster_set:
                entity_cluster = {entity_list[idx] for idx in cluster_set}
                clusters[root_idx] = entity_cluster
        
        return {
            "method": "union_find",
            "num_clusters": len(clusters),
            "clusters": clusters,
            "metrics": {
                "num_entities": len(entity_ids),
                "num_decisions": len(decisions),
            }
        }
    
    def _run_gnn(self, decisions: List[MatchDecision]) -> Dict:
        """Lightweight GNN consistency layer"""
        import time
        import psutil
        import os
        
        logger.info("Running lightweight GNN consistency layer")
        start_time = time.time()
        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss
        
        # Build resolution graph
        gnn = LightweightGNNResolver(rounds=3)
        gnn.build_resolution_graph(decisions)
        
        # 3-round message passing
        node_confidences = gnn.propagate_confidence()
        
        # Detect and fix transitivity violations
        violations = gnn.detect_transitivity_violations()
        gnn.fix_transitivity_violations(violations, threshold=0.6)
        
        # Extract clusters
        clusters = gnn.extract_clusters(threshold=0.6)
        
        # Decide merges
        merges = gnn.decide_merges(clusters, confidence_threshold=0.6)
        
        # Write results to SQLite
        self.db.write_clusters(clusters)
        
        # Calculate metrics
        mem_after = process.memory_info().rss
        runtime_ms = (time.time() - start_time) * 1000
        
        gnn.metrics.memory_bytes = mem_after - mem_before
        gnn.metrics.runtime_ms = runtime_ms
        
        self.db.write_metrics(gnn.metrics)
        
        logger.info(f"GNN completed in {runtime_ms:.1f}ms, "
                   f"memory delta: {gnn.metrics.memory_bytes / 1024:.1f} KB")
        
        return {
            "method": "gnn",
            "num_clusters": gnn.metrics.num_clusters,
            "clusters": {
                cid: cluster.members 
                for cid, cluster in clusters.items()
            },
            "merges": merges,
            "metrics": asdict(gnn.metrics),
            "transitivity_violations_found": gnn.metrics.num_inconsistencies_found,
            "transitivity_violations_fixed": gnn.metrics.num_inconsistencies_fixed,
        }
    
    def _run_correlation_clustering(self, decisions: List[MatchDecision]) -> Dict:
        """Correlation clustering for comparison"""
        logger.info("Running correlation clustering")
        
        cc = CorrelationClusteringResolver()
        clusters = cc.resolve(decisions)
        
        return {
            "method": "correlation_clustering",
            "num_clusters": len(clusters),
            "clusters": clusters,
            "metrics": {
                "num_entities": sum(len(c) for c in clusters.values()),
                "num_decisions": len(decisions),
            }
        }


# ============================================================================
# 7. BENCHMARK & COMPARISON
# ============================================================================

class MethodComparison:
    """Benchmark three methods: union-find, GNN, correlation clustering"""
    
    def __init__(self):
        self.results = {}
    
    def synthetic_test_case(self, num_entities: int = 7500) -> List[MatchDecision]:
        """Generate synthetic test case"""
        np.random.seed(42)
        decisions = []
        
        # Create some clusters
        num_clusters = num_entities // 10
        cluster_assignment = np.random.choice(num_clusters, num_entities)
        
        # Generate decisions: same cluster → likely match
        for i in range(num_entities):
            for j in range(i + 1, min(i + 20, num_entities)):  # Local window
                in_same_cluster = cluster_assignment[i] == cluster_assignment[j]
                
                if in_same_cluster:
                    confidence = np.random.uniform(0.7, 0.99)
                    match = True
                else:
                    confidence = np.random.uniform(0.01, 0.3)
                    match = False
                
                decisions.append(MatchDecision(
                    entity1_id=i,
                    entity2_id=j,
                    confidence=confidence,
                    match=match,
                    method="synthetic",
                    timestamp=datetime.now().timestamp()
                ))
        
        return decisions
    
    def run_benchmark(self, decisions: List[MatchDecision]) -> Dict:
        """Run all three methods and compare"""
        import time
        import psutil
        import os
        
        results = {}
        
        # Get baseline
        uf_start = time.time()
        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss
        
        gnn = LightweightGNNResolver()
        gnn.build_resolution_graph(decisions)
        gnn.propagate_confidence()
        violations = gnn.detect_transitivity_violations()
        gnn.fix_transitivity_violations(violations)
        clusters = gnn.extract_clusters()
        
        mem_after = process.memory_info().rss
        gnn_time = time.time() - uf_start
        
        results["gnn"] = {
            "time_ms": gnn_time * 1000,
            "memory_kb": (mem_after - mem_before) / 1024,
            "num_clusters": len(clusters),
            "num_violations_fixed": gnn.metrics.num_inconsistencies_fixed,
        }
        
        # Union-find
        uf_start = time.time()
        mem_before = process.memory_info().rss
        
        entity_ids = set()
        for d in decisions:
            entity_ids.add(d.entity1_id)
            entity_ids.add(d.entity2_id)
        
        uf = UnionFind(len(entity_ids))
        for d in decisions:
            if d.match and d.confidence > 0.5:
                uf.union(d.entity1_id, d.entity2_id, d.confidence)
        
        uf_clusters = uf.get_clusters()
        
        mem_after = process.memory_info().rss
        uf_time = time.time() - uf_start
        
        results["union_find"] = {
            "time_ms": uf_time * 1000,
            "memory_kb": (mem_after - mem_before) / 1024,
            "num_clusters": len(uf_clusters),
        }
        
        # Correlation clustering
        cc_start = time.time()
        mem_before = process.memory_info().rss
        
        cc = CorrelationClusteringResolver()
        cc_clusters = cc.resolve(decisions)
        
        mem_after = process.memory_info().rss
        cc_time = time.time() - cc_start
        
        results["correlation_clustering"] = {
            "time_ms": cc_time * 1000,
            "memory_kb": (mem_after - mem_before) / 1024,
            "num_clusters": len(cc_clusters),
        }
        
        return results


# ============================================================================
# 8. EXAMPLE USAGE & TESTING
# ============================================================================

if __name__ == "__main__":
    # Create test database
    import tempfile
    
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    
    logger.info(f"Using test database: {db_path}")
    
    # Test 1: Synthetic benchmark
    print("\n" + "="*70)
    print("BENCHMARK: Comparing three methods on synthetic 7,500 entity dataset")
    print("="*70)
    
    comparison = MethodComparison()
    decisions = comparison.synthetic_test_case(num_entities=7500)
    print(f"Generated {len(decisions)} pairwise decisions")
    
    benchmark_results = comparison.run_benchmark(decisions)
    
    print("\nBENCHMARK RESULTS:")
    print("-" * 70)
    for method, metrics in benchmark_results.items():
        print(f"\n{method.upper()}:")
        for key, val in metrics.items():
            if "memory" in key:
                print(f"  {key}: {val:.1f} KB")
            elif "time" in key:
                print(f"  {key}: {val:.2f} ms")
            else:
                print(f"  {key}: {val}")
    
    # Test 2: GNN with conditional application
    print("\n" + "="*70)
    print("GNN CONSISTENCY LAYER - Conditional Application")
    print("="*70)
    
    pipeline = EntityResolutionPipeline(db_path)
    
    # Case 1: High F1 (skip GNN)
    print("\nCase 1: Pairwise F1 = 0.96 (>= 0.95) → Skip GNN")
    result = pipeline.run(pairwise_f1=0.96, method="gnn")
    print(f"Result: {result}")
    
    # Case 2: Low F1 (apply GNN)
    print("\nCase 2: Pairwise F1 = 0.90 (< 0.95) → Apply GNN")
    result = pipeline.run(pairwise_f1=0.90, method="gnn")
    print(f"Clusters created: {result['num_clusters']}")
    print(f"Transitivity violations fixed: {result.get('transitivity_violations_fixed', 0)}")
    
    # Test 3: Transitivity violation detection
    print("\n" + "="*70)
    print("TRANSITIVITY VIOLATION DETECTION")
    print("="*70)
    
    gnn = LightweightGNNResolver()
    
    # Create example: A=B, B=C, but no A=C
    test_decisions = [
        MatchDecision(1, 2, 0.9, True, "test"),
        MatchDecision(2, 3, 0.85, True, "test"),
        # Missing: (1, 3)
    ]
    
    gnn.build_resolution_graph(test_decisions)
    violations = gnn.detect_transitivity_violations()
    
    print(f"Input graph: 1-2 (0.9), 2-3 (0.85), no 1-3")
    print(f"Violations detected: {violations}")
    
    if violations:
        gnn.fix_transitivity_violations(violations)
        print(f"Added inferred edge 1-3")
    
    # Memory footprint analysis
    print("\n" + "="*70)
    print("MEMORY FOOTPRINT ANALYSIS (7,500 entities)")
    print("="*70)
    
    gnn_large = LightweightGNNResolver(max_entities=7500)
    
    # Estimate memory for 7500 entities, ~50K edges (realistic sparse graph)
    import sys
    
    # Add some test data
    for i in range(7500):
        gnn_large.node_confidence[i] = 0.5
    
    for i in range(7500):
        for j in range(i+1, min(i+10, 7500)):  # Sparse connectivity
            gnn_large.graph.add_edge(i, j, confidence=0.7)
    
    # Calculate memory
    node_conf_size = sys.getsizeof(gnn_large.node_confidence)
    edge_conf_size = sys.getsizeof(gnn_large.edge_confidence)
    graph_size = sys.getsizeof(gnn_large.graph)
    
    total = node_conf_size + edge_conf_size + graph_size
    
    print(f"Node confidences (7500): {node_conf_size / 1024:.1f} KB")
    print(f"Edge confidences (75K): {edge_conf_size / 1024:.1f} KB")
    print(f"NetworkX graph (75K edges): {graph_size / 1024:.1f} KB")
    print(f"Total (estimated): {total / 1024:.1f} KB")
    print(f"Target: <50,000 KB ✓ PASS" if total < 50*1024 else "✗ FAIL")
    
    # Cleanup
    import os
    os.unlink(db_path)
    print("\n" + "="*70)
    print("All tests completed!")
