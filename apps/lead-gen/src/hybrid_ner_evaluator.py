import numpy as np
from sklearn.metrics import precision_recall_fscore_support, confusion_matrix

class NERBenchmark:
    """Evaluate hybrid pipeline vs baseline models."""
    
    def __init__(self, test_texts: list, test_labels: list):
        self.test_texts = test_texts
        self.test_labels = test_labels  # List of list of Entity
    
    def evaluate_model(self, model_name: str, predictions: list) -> dict:
        """Compute precision, recall, F1 for entity extraction.
        
        Args:
            model_name: "gliner", "distilbert", "hybrid"
            predictions: List of list of Entity
        
        Returns:
            dict with overall and per-type metrics
        """
        
        # Flatten predictions to (text, type, start, end) tuples
        pred_spans = set()
        for pred_entities in predictions:
            for entity in pred_entities:
                pred_spans.add((entity.text, entity.type, entity.start, entity.end))
        
        # Flatten gold labels
        gold_spans = set()
        for label_entities in self.test_labels:
            for entity in label_entities:
                gold_spans.add((entity.text, entity.type, entity.start, entity.end))
        
        # Compute metrics
        tp = len(pred_spans & gold_spans)
        fp = len(pred_spans - gold_spans)
        fn = len(gold_spans - pred_spans)
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0
        
        # Per-type metrics
        per_type = {}
        for entity_type in set(
            entity.type for entities in self.test_labels for entity in entities
        ):
            type_pred = {s for s in pred_spans if s[1] == entity_type}
            type_gold = {s for s in gold_spans if s[1] == entity_type}
            
            type_tp = len(type_pred & type_gold)
            type_fp = len(type_pred - type_gold)
            type_fn = len(type_gold - type_pred)
            
            type_precision = type_tp / (type_tp + type_fp) if (type_tp + type_fp) > 0 else 0
            type_recall = type_tp / (type_tp + type_fn) if (type_tp + type_fn) > 0 else 0
            type_f1 = 2 * type_precision * type_recall / (type_precision + type_recall) \
                if (type_precision + type_recall) > 0 else 0
            
            per_type[entity_type] = {
                "precision": type_precision,
                "recall": type_recall,
                "f1": type_f1,
            }
        
        return {
            "model": model_name,
            "overall": {"precision": precision, "recall": recall, "f1": f1},
            "per_type": per_type,
        }
    
    def compare_all(self, 
                    hybrid_predictions: list,
                    gliner_predictions: list,
                    bert_predictions: list) -> dict:
        """Compare three models and print results."""
        
        results = {
            "hybrid": self.evaluate_model("hybrid", hybrid_predictions),
            "gliner": self.evaluate_model("gliner", gliner_predictions),
            "bert": self.evaluate_model("bert", bert_predictions),
        }
        
        # Print summary
        print("\n" + "="*70)
        print("HYBRID NER PIPELINE EVALUATION")
        print("="*70)
        
        print("\nOVERALL F1 SCORES:")
        for model, result in results.items():
            f1 = result["overall"]["f1"]
            print(f"  {model:12s}: {f1:.1%}")
        
        print("\nPER-TYPE F1 SCORES:")
        print(f"{'Entity Type':<15} {'Hybrid':>10} {'GLiNER':>10} {'DistilBERT':>12}")
        print("-" * 50)
        
        for entity_type in sorted(set(
            et for r in results.values() for et in r["per_type"].keys()
        )):
            hybrid_f1 = results["hybrid"]["per_type"].get(entity_type, {}).get("f1", 0)
            gliner_f1 = results["gliner"]["per_type"].get(entity_type, {}).get("f1", 0)
            bert_f1 = results["bert"]["per_type"].get(entity_type, {}).get("f1", 0)
            
            print(f"{entity_type:<15} {hybrid_f1:>9.1%} {gliner_f1:>9.1%} {bert_f1:>11.1%}")
        
        print("\n" + "="*70)
        return results
