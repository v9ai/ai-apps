"""
Evaluation harness for blocking algorithms.

Metrics:
- Blocking recall: fraction of true duplicates in candidate pairs
- Reduction ratio: fraction of non-duplicate pairs eliminated
- Pair completeness: candidate pairs / all possible pairs
- Comparison: SBERT+DBSCAN vs. LSH vs. Sorted Neighborhood
"""

import time
from typing import List, Tuple, Dict, Set
import numpy as np
import logging
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BlockingMetrics:
    """Blocking performance metrics."""
    algorithm: str
    blocking_recall: float  # true positives / all positive pairs
    reduction_ratio: float  # (non-positives in blocks) / all non-positive pairs
    pair_completeness: float  # candidate pairs / all pairs
    pairs_compared: int
    total_pairs: int
    execution_time: float
    memory_mb: float


class BlockingEvaluator:
    """Comprehensive blocking evaluation harness."""
    
    def __init__(self, labeled_pairs: List[Tuple[int, int, int]]):
        """
        Args:
            labeled_pairs: List of (entity1_id, entity2_id, is_duplicate) tuples
        """
        self.labeled_pairs = labeled_pairs
        self.duplicate_pairs = set([
            (p[0], p[1]) if p[0] < p[1] else (p[1], p[0])
            for p in labeled_pairs if p[2] == 1
        ])
        self.non_duplicate_pairs = set([
            (p[0], p[1]) if p[0] < p[1] else (p[1], p[0])
            for p in labeled_pairs if p[2] == 0
        ])
    
    def evaluate(
        self,
        blocking_result: Dict[int, List[int]],
        algorithm: str = "unknown",
        execution_time: float = 0.0,
        memory_mb: float = 0.0
    ) -> BlockingMetrics:
        """
        Evaluate blocking result.
        
        Args:
            blocking_result: Dict mapping entity_id -> list of candidate entity_ids
            algorithm: Name of blocking algorithm
            execution_time: Time taken to block (seconds)
            memory_mb: Peak memory used (MB)
        
        Returns:
            BlockingMetrics with all evaluation metrics
        """
        # Normalize candidate pairs
        candidate_pairs = set()
        for eid1, candidates in blocking_result.items():
            for eid2 in candidates:
                pair = (eid1, eid2) if eid1 < eid2 else (eid2, eid1)
                candidate_pairs.add(pair)
        
        # Blocking recall: duplicates caught / all duplicates
        duplicates_caught = len(self.duplicate_pairs & candidate_pairs)
        blocking_recall = (
            duplicates_caught / len(self.duplicate_pairs)
            if self.duplicate_pairs
            else 0.0
        )
        
        # Reduction ratio: non-duplicates removed / all non-duplicates
        non_duplicates_in_candidates = len(self.non_duplicate_pairs & candidate_pairs)
        reduction_ratio = (
            1.0 - (non_duplicates_in_candidates / len(self.non_duplicate_pairs))
            if self.non_duplicate_pairs
            else 1.0
        )
        
        # Pair completeness
        all_pairs = len(self.duplicate_pairs) + len(self.non_duplicate_pairs)
        pair_completeness = len(candidate_pairs) / all_pairs if all_pairs > 0 else 0.0
        
        return BlockingMetrics(
            algorithm=algorithm,
            blocking_recall=blocking_recall,
            reduction_ratio=reduction_ratio,
            pair_completeness=pair_completeness,
            pairs_compared=len(candidate_pairs),
            total_pairs=all_pairs,
            execution_time=execution_time,
            memory_mb=memory_mb
        )
    
    def print_comparison(self, results: List[BlockingMetrics]):
        """Pretty-print comparison of blocking algorithms."""
        print("\n" + "="*100)
        print("BLOCKING ALGORITHM COMPARISON")
        print("="*100)
        print(f"{'Algorithm':<20} {'Recall':<10} {'Reduction':<12} {'Completeness':<14} {'Time (ms)':<12} {'Memory (MB)':<12}")
        print("-"*100)
        
        for m in sorted(results, key=lambda x: x.blocking_recall, reverse=True):
            print(
                f"{m.algorithm:<20} "
                f"{m.blocking_recall:>8.1%}  "
                f"{m.reduction_ratio:>10.1%}  "
                f"{m.pair_completeness:>12.1%}  "
                f"{m.execution_time*1000:>10.1f}ms  "
                f"{m.memory_mb:>10.1f}MB"
            )
        
        print("="*100)


class SyntheticLabeledDataGenerator:
    """Generate synthetic labeled entity pairs for evaluation."""
    
    @staticmethod
    def generate_duplicate_pairs(
        base_entity: Dict,
        num_variants: int = 3,
        error_rate: float = 0.1
    ) -> List[Dict]:
        """
        Generate synthetic duplicates with controlled noise.
        
        Args:
            base_entity: Base entity dict
            num_variants: Number of variants to generate
            error_rate: Fraction of characters to corrupt
        
        Returns:
            List of variant entities
        """
        import random
        import string
        
        variants = []
        for i in range(num_variants):
            variant = base_entity.copy()
            variant["id"] = base_entity["id"] * 1000 + i
            
            # Corrupt name with typos
            if "name" in variant:
                name_chars = list(variant["name"])
                num_errors = int(len(name_chars) * error_rate)
                for _ in range(num_errors):
                    idx = random.randint(0, len(name_chars) - 1)
                    name_chars[idx] = random.choice(string.ascii_lowercase)
                variant["name"] = "".join(name_chars)
            
            variants.append(variant)
        
        return variants
    
    @staticmethod
    def create_labeled_pairs(
        entities: List[Dict],
        duplicate_clusters: List[List[int]],
        non_duplicate_sample_ratio: float = 0.1
    ) -> List[Tuple[int, int, int]]:
        """
        Create labeled pair dataset from duplicate clusters.
        
        Args:
            entities: List of all entities
            duplicate_clusters: List of lists, each containing duplicate entity IDs
            non_duplicate_sample_ratio: Fraction of possible non-duplicate pairs to include
        
        Returns:
            List of (entity1_id, entity2_id, is_duplicate) tuples
        """
        labeled_pairs = []
        
        # Positive pairs from clusters
        for cluster in duplicate_clusters:
            for i in range(len(cluster)):
                for j in range(i + 1, len(cluster)):
                    labeled_pairs.append((cluster[i], cluster[j], 1))
        
        # Negative pairs (sample)
        entity_ids = [e["id"] for e in entities]
        all_possible_pairs = [
            (entity_ids[i], entity_ids[j])
            for i in range(len(entity_ids))
            for j in range(i + 1, len(entity_ids))
        ]
        
        # Remove pairs that are duplicates
        duplicate_set = set()
        for cluster in duplicate_clusters:
            for i in range(len(cluster)):
                for j in range(i + 1, len(cluster)):
                    pair = (cluster[i], cluster[j]) if cluster[i] < cluster[j] else (cluster[j], cluster[i])
                    duplicate_set.add(pair)
        
        negative_pairs = [p for p in all_possible_pairs if p not in duplicate_set]
        sampled_negative = list(np.random.choice(
            len(negative_pairs),
            size=int(len(negative_pairs) * non_duplicate_sample_ratio),
            replace=False
        ))
        
        for idx in sampled_negative:
            pair = negative_pairs[idx]
            labeled_pairs.append((pair[0], pair[1], 0))
        
        return labeled_pairs


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Example: compare blocking algorithms
    from sbert_blocker import SBERTBlocker, LSHBlocker, SortedNeighborhoodBlocker
    
    # Generate test entities
    test_entities = [
        {"id": 1, "name": "Acme Corporation"},
        {"id": 2, "name": "ACME Corp"},
        {"id": 3, "name": "TechStartup GmbH"},
        {"id": 4, "name": "Tech Startup"},
    ]
    
    # Create labeled pairs
    duplicate_clusters = [[1, 2], [3, 4]]
    labeled_pairs = SyntheticLabeledDataGenerator.create_labeled_pairs(
        test_entities,
        duplicate_clusters
    )
    
    evaluator = BlockingEvaluator(labeled_pairs)
    
    # Evaluate SBERT
    sbert = SBERTBlocker()
    embeddings = sbert.encode(test_entities)
    blocks = sbert.create_blocks(test_entities, embeddings)
    
    sbert_result = defaultdict(list)
    for bid, block in blocks.items():
        for i, e1 in enumerate(block.entity_ids):
            for e2 in block.entity_ids[i+1:]:
                sbert_result[e1].append(e2)
    
    metrics_sbert = evaluator.evaluate(sbert_result, "SBERT+DBSCAN")
    
    print(f"SBERT Blocking Recall: {metrics_sbert.blocking_recall:.1%}")
    print(f"Reduction Ratio: {metrics_sbert.reduction_ratio:.1%}")
