# File: scrapus/module-3-entity-resolution/evaluation.py
"""
Evaluation metrics for entity matching.
Precision@k, Recall@k, MRR on held-out test set.
"""

import numpy as np
from typing import List, Tuple, Dict
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score
import logging

logger = logging.getLogger(__name__)


class EntityMatchingEvaluator:
    """Evaluate entity matching model."""
    
    @staticmethod
    def precision_at_k(
        rankings: List[List[int]],
        ground_truth: List[List[int]],
        k: int = 1
    ) -> float:
        """
        Compute Precision@k.
        
        Args:
            rankings: List of ranked candidate indices for each query
            ground_truth: List of correct candidate indices for each query
            k: Consider only top-k results
        """
        precisions = []
        for rank, truth in zip(rankings, ground_truth):
            top_k = set(rank[:k])
            truth_set = set(truth)
            if len(top_k) == 0:
                precisions.append(0.0)
            else:
                precisions.append(len(top_k & truth_set) / k)
        
        return np.mean(precisions)
    
    @staticmethod
    def recall_at_k(
        rankings: List[List[int]],
        ground_truth: List[List[int]],
        k: int = 5
    ) -> float:
        """
        Compute Recall@k.
        """
        recalls = []
        for rank, truth in zip(rankings, ground_truth):
            top_k = set(rank[:k])
            truth_set = set(truth)
            if len(truth_set) == 0:
                recalls.append(1.0)
            else:
                recalls.append(len(top_k & truth_set) / len(truth_set))
        
        return np.mean(recalls)
    
    @staticmethod
    def mean_reciprocal_rank(
        rankings: List[List[int]],
        ground_truth: List[List[int]]
    ) -> float:
        """
        Compute Mean Reciprocal Rank (MRR).
        Measures rank of first correct result.
        """
        mrrs = []
        for rank, truth in zip(rankings, ground_truth):
            truth_set = set(truth)
            for i, candidate in enumerate(rank):
                if candidate in truth_set:
                    mrrs.append(1.0 / (i + 1))
                    break
            else:
                mrrs.append(0.0)
        
        return np.mean(mrrs)
    
    @staticmethod
    def evaluate_classification(
        predictions: np.ndarray,
        labels: np.ndarray,
        threshold: float = 0.5
    ) -> Dict[str, float]:
        """
        Evaluate binary classification metrics.
        
        Args:
            predictions: Raw similarity scores or probabilities
            labels: Ground truth labels (0 or 1)
            threshold: Decision threshold
        
        Returns:
            Dict with precision, recall, f1, auc-roc
        """
        preds_binary = (predictions >= threshold).astype(int)
        
        metrics = {
            'precision': precision_score(labels, preds_binary),
            'recall': recall_score(labels, preds_binary),
            'f1': f1_score(labels, preds_binary),
            'auc_roc': roc_auc_score(labels, predictions),
        }
        
        return metrics
    
    @staticmethod
    def print_results(metrics: Dict[str, float]):
        """Pretty print evaluation results."""
        logger.info("=" * 50)
        logger.info("EVALUATION RESULTS")
        logger.info("=" * 50)
        for key, value in metrics.items():
            logger.info(f"{key:20s}: {value:.4f}")


def evaluate_on_test_set(
    model,
    test_pairs: List[Tuple[str, str]],
    test_labels: List[int],
    threshold: float = 0.5,
    device: str = "mps"
) -> Dict[str, float]:
    """
    Full evaluation pipeline on test set.
    """
    model.eval()
    
    # Get embeddings for all test pairs
    embeddings1_list = []
    embeddings2_list = []
    
    for text1, text2 in test_pairs:
        with torch.no_grad():
            emb1 = model.encode([text1], convert_to_tensor=True)
            emb2 = model.encode([text2], convert_to_tensor=True)
            embeddings1_list.append(emb1)
            embeddings2_list.append(emb2)
    
    embeddings1 = torch.cat(embeddings1_list, dim=0)
    embeddings2 = torch.cat(embeddings2_list, dim=0)
    
    # Compute cosine similarity
    similarities = torch.nn.functional.cosine_similarity(embeddings1, embeddings2)
    similarities = similarities.cpu().numpy()
    
    # Evaluate
    evaluator = EntityMatchingEvaluator()
    metrics = evaluator.evaluate_classification(
        similarities, np.array(test_labels), threshold
    )
    
    return metrics
