# File: scrapus/module-3-entity-resolution/hard_negative_mining.py
"""
Hard negative mining: find confusing non-matches for focused training.
"""

import torch
from typing import List, Tuple, Dict
import numpy as np
from sentence_transformers import SentenceTransformer
import logging

logger = logging.getLogger(__name__)


class HardNegativeMiner:
    """Find hard negatives: negative pairs that are highly similar."""
    
    def __init__(
        self,
        model: SentenceTransformer,
        device: str = "mps",
        batch_size: int = 64
    ):
        self.model = model
        self.device = device
        self.batch_size = batch_size
    
    def encode_entities(
        self,
        entities: List[Dict[str, str]],
        text_formatter
    ) -> np.ndarray:
        """Encode all entities to embeddings."""
        texts = [text_formatter(e) for e in entities]
        
        embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch_texts = texts[i:i+self.batch_size]
            batch_embeddings = self.model.encode(
                batch_texts,
                convert_to_numpy=True,
                show_progress_bar=False
            )
            embeddings.extend(batch_embeddings)
        
        return np.array(embeddings)
    
    def compute_similarity_matrix(
        self,
        embeddings: np.ndarray
    ) -> np.ndarray:
        """Compute cosine similarity matrix."""
        embeddings = embeddings / (np.linalg.norm(embeddings, axis=1, keepdims=True) + 1e-8)
        return embeddings @ embeddings.T
    
    def mine_hard_negatives(
        self,
        entities: List[Dict[str, str]],
        positive_pairs: List[Tuple[int, int]],
        text_formatter,
        k: int = 10,
        similarity_threshold: float = 0.7
    ) -> List[Tuple[int, int]]:
        """
        Find hard negatives: pairs with high similarity but different entities.
        
        Args:
            entities: List of entity dicts with 'id' field
            positive_pairs: List of (idx1, idx2) tuples of known matches
            k: Number of hard negatives to return per entity
            similarity_threshold: Min similarity to consider as hard negative
        
        Returns:
            List of (idx1, idx2) tuples of hard negative pairs
        """
        
        logger.info(f"Encoding {len(entities)} entities...")
        embeddings = self.encode_entities(entities, text_formatter)
        
        logger.info("Computing similarity matrix...")
        sim_matrix = self.compute_similarity_matrix(embeddings)
        
        # Convert positive pairs to set for fast lookup
        positive_set = set()
        for i, j in positive_pairs:
            positive_set.add((min(i, j), max(i, j)))
        
        hard_negatives = []
        
        for i in range(len(entities)):
            # Get top similar entities (excluding self and positives)
            similarities = sim_matrix[i].copy()
            similarities[i] = -1  # Exclude self
            
            # Exclude known positives
            for j in range(len(entities)):
                if (min(i, j), max(i, j)) in positive_set:
                    similarities[j] = -1
            
            # Find hard negatives
            top_indices = np.argsort(similarities)[::-1][:k*5]  # Get more than needed
            
            for j in top_indices:
                if similarities[j] >= similarity_threshold:
                    pair = (min(i, j), max(i, j))
                    if pair not in positive_set and pair not in hard_negatives:
                        hard_negatives.append(pair)
                        if len(hard_negatives) % 100 == 0:
                            logger.info(f"Found {len(hard_negatives)} hard negatives...")
        
        logger.info(f"Mined {len(hard_negatives)} hard negative pairs")
        return hard_negatives[:len(entities) * k]  # Limit to reasonable number


def create_balanced_training_set(
    positive_pairs: List[Tuple[int, int]],
    hard_negative_pairs: List[Tuple[int, int]],
    soft_negative_pairs: List[Tuple[int, int]],
    ratio: Tuple[float, float] = (0.6, 0.4)  # Hard vs soft negatives
) -> Tuple[List[Tuple[int, int]], List[int]]:
    """
    Create balanced training set: positives + hard negatives + soft negatives.
    
    Args:
        ratio: (hard_negative_fraction, soft_negative_fraction) of negatives
    
    Returns:
        (pairs, labels) tuples for training
    """
    
    num_positives = len(positive_pairs)
    num_negatives = num_positives  # 1:1 pos:neg ratio is good for binary classification
    
    hard_neg_count = int(num_negatives * ratio[0])
    soft_neg_count = num_negatives - hard_neg_count
    
    # Sample hard and soft negatives
    hard_neg_sample = hard_negative_pairs[:hard_neg_count]
    soft_neg_sample = soft_negative_pairs[:soft_neg_count]
    
    # Combine
    all_pairs = positive_pairs + hard_neg_sample + soft_neg_sample
    all_labels = [1] * len(positive_pairs) + [0] * (hard_neg_count + soft_neg_count)
    
    # Shuffle
    shuffled = list(zip(all_pairs, all_labels))
    np.random.shuffle(shuffled)
    
    pairs, labels = zip(*shuffled)
    return list(pairs), list(labels)
