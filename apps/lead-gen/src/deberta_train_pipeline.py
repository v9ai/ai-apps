# File: scrapus/module-3-entity-resolution/train_pipeline.py
"""
Complete end-to-end training pipeline for DeBERTa entity matching on M1.
"""

import logging
import json
from pathlib import Path
from typing import List, Tuple, Dict
import numpy as np
from sklearn.model_selection import train_test_split

from data_augmentation import DittoAugmenter, format_matching_pair, entity_to_text
from training import M1AdapterTrainer
from hard_negative_mining import HardNegativeMiner, create_balanced_training_set
from evaluation import EntityMatchingEvaluator, evaluate_on_test_set
from hyperparameter_search import run_hyperparameter_search
from inference import EntityMatcher, EntityEmbeddingCache

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DeBertaEntityMatchingPipeline:
    """Complete training pipeline for entity matching."""
    
    def __init__(
        self,
        output_dir: str = "scrapus_data/entity_matching",
        device: str = "mps",
        model_name: str = "microsoft/deberta-v3-base"
    ):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.device = device
        self.model_name = model_name
    
    def load_labeled_pairs(
        self,
        json_file: str
    ) -> Tuple[List[Dict], List[Dict], List[int]]:
        """
        Load labeled pairs from JSON.
        
        Format:
        [
            {
                "entity1": {"name": "...", "location": "...", "industry": "..."},
                "entity2": {"name": "...", "location": "...", "industry": "..."},
                "label": 1  # 1 = match, 0 = non-match
            },
            ...
        ]
        """
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        entities1 = []
        entities2 = []
        labels = []
        
        for item in data:
            entities1.append(item['entity1'])
            entities2.append(item['entity2'])
            labels.append(item['label'])
        
        return entities1, entities2, labels
    
    def run(
        self,
        labeled_pairs_file: str,
        all_entities_file: str,
        n_hpo_trials: int = 10,
        run_hpo: bool = True
    ):
        """
        Run complete pipeline:
        1. Load data
        2. Data augmentation
        3. Hard negative mining
        4. Train/val/test split
        5. Hyperparameter search (optional)
        6. Train final model
        7. Evaluate
        8. Cache embeddings
        """
        
        logger.info("="*60)
        logger.info("DeBERTa Entity Matching Pipeline")
        logger.info("="*60)
        
        # 1. Load data
        logger.info("\n[1/8] Loading labeled pairs...")
        entities1, entities2, labels = self.load_labeled_pairs(labeled_pairs_file)
        
        with open(all_entities_file, 'r') as f:
            all_entities = json.load(f)
        
        logger.info(f"Loaded {len(entities1)} labeled pairs")
        logger.info(f"Loaded {len(all_entities)} total entities")
        
        # 2. Data augmentation
        logger.info("\n[2/8] Data augmentation...")
        augmenter = DittoAugmenter(seed=42)
        
        positive_indices = [i for i, l in enumerate(labels) if l == 1]
        negative_indices = [i for i, l in enumerate(labels) if l == 0]
        
        positive_pairs = [(entities1[i], entities2[i]) for i in positive_indices]
        negative_pairs = [(entities1[i], entities2[i]) for i in negative_indices]
        
        logger.info(f"  Positive pairs: {len(positive_pairs)}")
        logger.info(f"  Negative pairs: {len(negative_pairs)}")
        
        # 3. Hard negative mining
        logger.info("\n[3/8] Hard negative mining...")
        
        # First train a simple model for mining
        trainer_temp = M1AdapterTrainer(
            model_name=self.model_name,
            output_dir=str(self.output_dir / "temp_for_mining"),
            device=self.device
        )
        
        # Format pairs for training
        train_texts_pos = [
            (entity_to_text(e1), entity_to_text(e2))
            for e1, e2 in positive_pairs[:500]  # Use subset for mining
        ]
        train_labels_pos = [1] * len(train_texts_pos)
        
        train_texts_neg = [
            (entity_to_text(e1), entity_to_text(e2))
            for e1, e2 in negative_pairs[:500]
        ]
        train_labels_neg = [0] * len(train_texts_neg)
        
        train_texts = train_texts_pos + train_texts_neg
        train_labels = train_labels_pos + train_labels_neg
        
        # Train temp model briefly
        train_texts_split, val_texts_split, train_labels_split, val_labels_split = \
            train_test_split(train_texts, train_labels, test_size=0.2, random_state=42)
        
        logger.info("  Training temporary model for mining...")
        trainer_temp.add_adapter_layers()
        trainer_temp.freeze_base_model()
        
        trainer_temp.train(
            train_pairs=train_texts_split,
            train_labels=train_labels_split,
            val_pairs=val_texts_split,
            val_labels=val_labels_split,
            batch_size=16,
            epochs=5,
            early_stopping_patience=2
        )
        
        # Mine hard negatives
        miner = HardNegativeMiner(
            model=trainer_temp.model,
            device=self.device,
            batch_size=32
        )
        
        hard_negative_indices = miner.mine_hard_negatives(
            entities=all_entities,
            positive_pairs=positive_indices,
            text_formatter=entity_to_text,
            k=10,
            similarity_threshold=0.65
        )
        
        hard_negative_pairs = [
            (all_entities[i], all_entities[j]) for i, j in hard_negative_indices[:len(positive_pairs)]
        ]
        
        logger.info(f"  Mined {len(hard_negative_pairs)} hard negatives")
        
        # Create balanced training set
        logger.info("\n[4/8] Creating balanced training set...")
        
        all_pairs, all_labels = create_balanced_training_set(
            positive_pairs=positive_pairs,
            hard_negative_pairs=hard_negative_pairs,
            soft_negative_pairs=negative_pairs,
            ratio=(0.6, 0.4)
        )
        
        # Convert to text format
        train_texts_aug = [
            (entity_to_text(e1), entity_to_text(e2))
            for e1, e2 in all_pairs
        ]
        
        # Train/val/test split
        train_texts, test_texts, train_labels_arr, test_labels = \
            train_test_split(train_texts_aug, all_labels, test_size=0.1, random_state=42)
        
        train_texts, val_texts, train_labels_arr, val_labels = \
            train_test_split(train_texts, train_labels_arr, test_size=0.2, random_state=42)
        
        logger.info(f"  Train: {len(train_texts)} pairs")
        logger.info(f"  Val: {len(val_texts)} pairs")
        logger.info(f"  Test: {len(test_texts)} pairs")
        
        # Save data splits
        splits_data = {
            'train_size': len(train_texts),
            'val_size': len(val_texts),
            'test_size': len(test_texts),
            'positive_ratio_train': sum(train_labels_arr) / len(train_labels_arr),
            'positive_ratio_test': sum(test_labels) / len(test_labels),
        }
        
        with open(self.output_dir / "data_splits.json", 'w') as f:
            json.dump(splits_data, f, indent=2)
        
        # 5. Hyperparameter search
        if run_hpo:
            logger.info("\n[5/8] Hyperparameter optimization (Optuna)...")
            
            study = run_hyperparameter_search(
                train_pairs=train_texts,
                train_labels=train_labels_arr,
                val_pairs=val_texts,
                val_labels=val_labels,
                test_pairs=test_texts,
                test_labels=test_labels,
                trainer_class=M1AdapterTrainer,
                n_trials=n_hpo_trials,
                output_dir=str(self.output_dir / "hpo")
            )
            
            best_params = study.best_trial.params
        else:
            logger.info("\n[5/8] Skipping HPO, using default parameters")
            best_params = {
                'learning_rate': 1e-4,
                'warmup_steps': 500,
                'epochs': 20,
                'batch_size': 16,
                'gradient_accumulation': 4,
                'weight_decay': 0.01
            }
        
        # 6. Train final model
        logger.info("\n[6/8] Training final model...")
        
        trainer = M1AdapterTrainer(
            model_name=self.model_name,
            output_dir=str(self.output_dir / "final_model"),
            device=self.device,
            fp16=True
        )
        
        trainer.add_adapter_layers(hidden_dim=256)
        trainer.freeze_base_model()
        
        history = trainer.train(
            train_pairs=train_texts,
            train_labels=train_labels_arr,
            val_pairs=val_texts,
            val_labels=val_labels,
            batch_size=best_params['batch_size'],
            gradient_accumulation_steps=best_params['gradient_accumulation'],
            epochs=best_params['epochs'],
            learning_rate=best_params['learning_rate'],
            warmup_steps=best_params['warmup_steps'],
            weight_decay=best_params['weight_decay'],
            early_stopping_patience=5
        )
        
        # 7. Evaluate
        logger.info("\n[7/8] Evaluating on test set...")
        
        metrics = evaluate_on_test_set(
            model=trainer.model,
            test_pairs=test_texts,
            test_labels=test_labels,
            threshold=0.7,
            device=self.device
        )
        
        evaluator = EntityMatchingEvaluator()
        evaluator.print_results(metrics)
        
        # Save evaluation results
        eval_results = {
            'threshold': 0.7,
            'metrics': metrics,
            'best_hpo_params': best_params
        }
        
        with open(self.output_dir / "evaluation_results.json", 'w') as f:
            json.dump(eval_results, f, indent=2)
        
        # 8. Cache embeddings for inference
        logger.info("\n[8/8] Caching entity embeddings in LanceDB...")
        
        cache = EntityEmbeddingCache(
            model=trainer.model,
            db_path="scrapus_data/lancedb",
            table_name="entity_embeddings_deberta",
            device=self.device
        )
        
        cache.precompute_entity_embeddings(all_entities, batch_size=32)
        
        logger.info("\n" + "="*60)
        logger.info("PIPELINE COMPLETE")
        logger.info("="*60)
        logger.info(f"Results saved to: {self.output_dir}")
        logger.info(f"\nKey Metrics:")
        logger.info(f"  Precision: {metrics['precision']:.4f}")
        logger.info(f"  Recall:    {metrics['recall']:.4f}")
        logger.info(f"  F1 Score:  {metrics['f1']:.4f}")
        logger.info(f"  AUC-ROC:   {metrics['auc_roc']:.4f}")
        
        return trainer.model, metrics


if __name__ == "__main__":
    # Example usage
    pipeline = DeBertaEntityMatchingPipeline(
        output_dir="scrapus_data/entity_matching",
        device="mps",
        model_name="microsoft/deberta-v3-base"
    )
    
    model, metrics = pipeline.run(
        labeled_pairs_file="scrapus_data/labeled_pairs_5k.json",
        all_entities_file="scrapus_data/all_entities.json",
        n_hpo_trials=10,
        run_hpo=True
    )
