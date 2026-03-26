Based on my research, I'll now provide comprehensive implementation guidance for pipeline evaluation in the Scrapus system. Let me organize this into actionable best practices.

# Implementation Best Practices for Scrapus Pipeline Evaluation

Based on literature research, here are actionable implementation guidelines for each of your focus areas:

## 1. Evaluation Harness Design — Reproducible Benchmarks & Dataset Versioning

### Dataset Versioning Implementation
```python
# dataset_versioning.py
import hashlib
import json
from datetime import datetime
from pathlib import Path
import dvc.api
import mlflow

class DatasetVersioning:
    def __init__(self, data_dir: Path):
        self.data_dir = data_dir
        self.metadata_file = data_dir / "dataset_metadata.json"
        
    def create_version(self, dataset_name: str, split: str = "train"):
        """Create versioned dataset with hash-based identifiers"""
        dataset_path = self.data_dir / f"{dataset_name}_{split}"
        
        # Calculate hash for reproducibility
        data_hash = self._calculate_hash(dataset_path)
        timestamp = datetime.now().isoformat()
        
        version_info = {
            "dataset_name": dataset_name,
            "split": split,
            "hash": data_hash,
            "timestamp": timestamp,
            "num_samples": self._count_samples(dataset_path),
            "storage_backend": "SQLite+LanceDB+ChromaDB"
        }
        
        # Store metadata
        self._update_metadata(version_info)
        
        # Log to MLflow/DVC
        mlflow.log_param(f"{dataset_name}_{split}_hash", data_hash)
        mlflow.log_param(f"{dataset_name}_{split}_timestamp", timestamp)
        
        return version_info
    
    def _calculate_hash(self, path: Path) -> str:
        """Calculate SHA256 hash of dataset directory"""
        hasher = hashlib.sha256()
        for file in sorted(path.rglob("*")):
            if file.is_file():
                hasher.update(file.read_bytes())
        return hasher.hexdigest()
```

### Reproducible Benchmark Framework
```python
# benchmark_framework.py
import pickle
import numpy as np
from sklearn.metrics import classification_report
from scipy import stats
import json

class ReproducibleBenchmark:
    def __init__(self, seed: int = 42):
        self.seed = seed
        np.random.seed(seed)
        self.results = {}
        
    def run_pipeline_benchmark(self, pipeline, dataset, metrics_config):
        """Run complete pipeline benchmark with reproducibility"""
        benchmark_id = f"{pipeline.name}_{dataset.version_hash}"
        
        # Store initial state
        initial_state = {
            "numpy_random_state": np.random.get_state(),
            "torch_random_state": None,  # Add PyTorch if used
            "dataset_version": dataset.version_info
        }
        
        # Run pipeline stages
        stage_results = {}
        for stage_name, stage_func in pipeline.stages.items():
            stage_start = datetime.now()
            stage_output = stage_func(dataset)
            stage_duration = datetime.now() - stage_start
            
            # Calculate stage-specific metrics
            stage_metrics = self._calculate_stage_metrics(
                stage_name, stage_output, metrics_config
            )
            
            stage_results[stage_name] = {
                "metrics": stage_metrics,
                "duration": stage_duration.total_seconds(),
                "memory_usage": self._get_memory_usage()
            }
        
        # Store results with full provenance
        self.results[benchmark_id] = {
            "initial_state": initial_state,
            "stage_results": stage_results,
            "timestamp": datetime.now().isoformat(),
            "environment": self._capture_environment()
        }
        
        return self.results[benchmark_id]
```

## 2. Metric Implementation — Micro/Macro F1, MAP, NDCG

### Comprehensive Metric Suite
```python
# metrics_suite.py
import numpy as np
from sklearn.metrics import (
    precision_recall_fscore_support, 
    average_precision_score,
    ndcg_score,
    roc_auc_score
)
from typing import Dict, List, Tuple
import warnings

class ScrapusMetrics:
    """Comprehensive metric suite for all pipeline stages"""
    
    @staticmethod
    def calculate_ner_metrics(y_true: List[List[str]], 
                             y_pred: List[List[str]]) -> Dict:
        """Calculate NER-specific metrics (Module 2)"""
        # Convert to BIO format if needed
        y_true_flat = [tag for sent in y_true for tag in sent]
        y_pred_flat = [tag for sent in y_pred for tag in sent]
        
        # Micro and Macro F1
        micro_precision, micro_recall, micro_f1, _ = \
            precision_recall_fscore_support(
                y_true_flat, y_pred_flat, average='micro', zero_division=0
            )
        
        macro_precision, macro_recall, macro_f1, _ = \
            precision_recall_fscore_support(
                y_true_flat, y_pred_flat, average='macro', zero_division=0
            )
        
        # Per-entity metrics
        unique_labels = set(y_true_flat + y_pred_flat)
        per_entity_metrics = {}
        for label in unique_labels:
            if label != 'O':  # Skip 'O' (non-entity)
                label_precision, label_recall, label_f1, _ = \
                    precision_recall_fscore_support(
                        y_true_flat, y_pred_flat, 
                        labels=[label], average=None, zero_division=0
                    )
                per_entity_metrics[label] = {
                    'precision': float(label_precision[0]),
                    'recall': float(label_recall[0]),
                    'f1': float(label_f1[0])
                }
        
        return {
            'micro_f1': float(micro_f1),
            'macro_f1': float(macro_f1),
            'micro_precision': float(micro_precision),
            'micro_recall': float(micro_recall),
            'per_entity': per_entity_metrics
        }
    
    @staticmethod
    def calculate_matching_metrics(y_true: np.ndarray, 
                                  y_pred: np.ndarray,
                                  y_scores: np.ndarray) -> Dict:
        """Calculate matching metrics (Module 4)"""
        # Precision-Recall AUC
        pr_auc = average_precision_score(y_true, y_scores)
        
        # ROC AUC
        roc_auc = roc_auc_score(y_true, y_scores)
        
        # NDCG for ranking quality
        # Assuming y_true is relevance scores (0/1 for binary)
        try:
            ndcg = ndcg_score([y_true], [y_scores])
        except:
            ndcg = 0.0
        
        # Standard classification metrics
        precision, recall, f1, _ = precision_recall_fscore_support(
            y_true, y_pred, average='binary', zero_division=0
        )
        
        return {
            'precision': float(precision),
            'recall': float(recall),
            'f1': float(f1),
            'pr_auc': float(pr_auc),
            'roc_auc': float(roc_auc),
            'ndcg': float(ndcg)
        }
    
    @staticmethod
    def calculate_summarization_metrics(references: List[str],
                                       predictions: List[str]) -> Dict:
        """Calculate summarization metrics (Module 5)"""
        # ROUGE scores
        from rouge_score import rouge_scorer
        
        scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], 
                                         use_stemmer=True)
        
        rouge_scores = []
        for ref, pred in zip(references, predictions):
            scores = scorer.score(ref, pred)
            rouge_scores.append({
                'rouge1': scores['rouge1'].fmeasure,
                'rouge2': scores['rouge2'].fmeasure,
                'rougeL': scores['rougeL'].fmeasure
            })
        
        # Average ROUGE scores
        avg_rouge = {
            metric: np.mean([s[metric] for s in rouge_scores])
            for metric in ['rouge1', 'rouge2', 'rougeL']
        }
        
        # BERTScore for semantic similarity
        try:
            from bert_score import score
            P, R, F1 = score(predictions, references, lang="en", verbose=False)
            bert_scores = {
                'bert_precision': float(P.mean()),
                'bert_recall': float(R.mean()),
                'bert_f1': float(F1.mean())
            }
        except ImportError:
            bert_scores = {}
            warnings.warn("BERTScore not installed")
        
        return {
            'rouge': avg_rouge,
            'bert_score': bert_scores,
            'num_samples': len(references)
        }
```

## 3. Statistical Significance Testing

### Bootstrap Confidence Intervals & Paired Tests
```python
# statistical_testing.py
import numpy as np
from scipy import stats
from typing import Tuple, List
import warnings

class StatisticalTesting:
    """Statistical significance testing for pipeline comparisons"""
    
    @staticmethod
    def bootstrap_confidence_interval(scores: np.ndarray, 
                                     n_bootstrap: int = 1000,
                                     confidence_level: float = 0.95) -> Tuple:
        """Calculate bootstrap confidence intervals"""
        bootstrap_means = []
        n = len(scores)
        
        for _ in range(n_bootstrap):
            # Sample with replacement
            bootstrap_sample = np.random.choice(scores, size=n, replace=True)
            bootstrap_means.append(np.mean(bootstrap_sample))
        
        # Calculate confidence interval
        alpha = (1 - confidence_level) / 2
        lower = np.percentile(bootstrap_means, 100 * alpha)
        upper = np.percentile(bootstrap_means, 100 * (1 - alpha))
        mean = np.mean(scores)
        
        return mean, (lower, upper)
    
    @staticmethod
    def paired_statistical_test(scores_a: np.ndarray,
                               scores_b: np.ndarray,
                               test_type: str = 't-test') -> Dict:
        """Perform paired statistical tests"""
        # Check assumptions
        n = len(scores_a)
        if n != len(scores_b):
            raise ValueError("Score arrays must have same length")
        
        # Calculate differences
        differences = scores_a - scores_b
        
        results = {
            'n_samples': n,
            'mean_difference': float(np.mean(differences)),
            'std_difference': float(np.std(differences, ddof=1))
        }
        
        if test_type == 't-test':
            # Paired t-test
            t_stat, p_value = stats.ttest_rel(scores_a, scores_b)
            results.update({
                'test': 'paired_t_test',
                't_statistic': float(t_stat),
                'p_value': float(p_value),
                'significant_0.01': p_value < 0.01,
                'significant_0.05': p_value < 0.05
            })
        
        elif test_type == 'wilcoxon':
            # Wilcoxon signed-rank test (non-parametric)
            if n < 20:
                warnings.warn("Wilcoxon test may be unreliable with n < 20")
            
            stat, p_value = stats.wilcoxon(scores_a, scores_b)
            results.update({
                'test': 'wilcoxon_signed_rank',
                'statistic': float(stat),
                'p_value': float(p_value),
                'significant_0.01': p_value < 0.01,
                'significant_0.05': p_value < 0.05
            })
        
        elif test_type == 'permutation':
            # Permutation test
            observed_diff = np.mean(scores_a) - np.mean(scores_b)
            combined = np.concatenate([scores_a, scores_b])
            
            perm_diffs = []
            n_perm = 1000
            for _ in range(n_perm):
                np.random.shuffle(combined)
                perm_a = combined[:n]
                perm_b = combined[n:]
                perm_diffs.append(np.mean(perm_a) - np.mean(perm_b))
            
            # Two-tailed p-value
            p_value = (np.sum(np.abs(perm_diffs) >= np.abs(observed_diff)) + 1) / (n_perm + 1)
            
            results.update({
                'test': 'permutation_test',
                'observed_difference': float(observed_diff),
                'p_value': float(p_value),
                'significant_0.01': p_value < 0.01,
                'significant_0.05': p_value < 0.05
            })
        
        return results
    
    @staticmethod
    def multiple_comparison_correction(p_values: List[float],
                                      method: str = 'fdr_bh') -> List[float]:
        """Apply multiple comparison correction"""
        from statsmodels.stats.multitest import multipletests
        
        rejected, corrected_p, _, _ = multipletests(
            p_values, alpha=0.05, method=method
        )
        
        return {
            'original_p_values': p_values,
            'corrected_p_values': corrected_p.tolist(),
            'rejected': rejected.tolist(),
            'method': method
        }
```

## 4. Profiling Local Inference

### PyTorch Profiler & Memory Tracking
```python
# performance_profiling.py
import torch
import time
import psutil
import GPUtil
from contextlib import contextmanager
from typing import Dict, Optional
import json
from datetime import datetime

class PipelineProfiler:
    """Comprehensive profiling for local inference"""
    
    def __init__(self, output_dir: str = "./profiling_results"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.profiles = {}
        
    @contextmanager
    def profile_stage(self, stage_name: str, use_torch_profiler: bool = True):
        """Context manager for profiling pipeline stages"""
        profile_data = {
            'stage': stage_name,
            'start_time': time.time(),
            'start_memory': self._get_memory_usage(),
            'start_gpu_memory': self._get_gpu_memory() if torch.cuda.is_available() else None
        }
        
        if use_torch_profiler and torch.cuda.is_available():
            # Use PyTorch profiler for GPU operations
            with torch.profiler.profile(
                activities=[
                    torch.profiler.ProfilerActivity.CPU,
                    torch.profiler.ProfilerActivity.CUDA,
                ],
                schedule=torch.profiler.schedule(
                    wait=1,
                    warmup=1,
                    active=3,
                    repeat=1
                ),
                on_trace_ready=torch.profiler.tensorboard_trace_handler(
                    str(self.output_dir / "torch_traces")
                ),
                record_shapes=True,
                profile_memory=True,
                with_stack=True
            ) as prof:
                profile_data['torch_profiler'] = prof
                yield profile_data
                prof.step()
        else:
            # Simple timing and memory profiling
            yield profile_data
        
        # Capture end metrics
        profile_data.update({
            'end_time': time.time(),
            'end_memory': self._get_memory_usage(),
            'end_gpu_memory': self._get_gpu_memory() if torch.cuda.is_available() else None,
            'duration': time.time() - profile_data['start_time']
        })
        
        # Calculate throughput if applicable
        if 'num_processed' in profile_data:
            profile_data['throughput'] = \
                profile_data['num_processed'] / profile_data['duration']
        
        self._save_profile(profile_data)
    
    def _get_memory_usage(self) -> Dict:
        """Get detailed memory usage"""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        return {
            'rss_mb': memory_info.rss / 1024 / 1024,
            'vms_mb': memory_info.vms / 1024 / 1024,
            'percent': process.memory_percent(),
            'available_mb': psutil.virtual_memory().available / 1024 / 1024
        }
    
    def _get_gpu_memory(self) -> Optional[Dict]:
        """Get GPU memory usage if available"""
        try:
            gpus = GPUtil.getGPUs()
            if gpus:
                gpu = gpus[0]  # Assuming single GPU for local stack
                return {
                    'memory_used_mb': gpu.memoryUsed,
                    'memory_total_mb': gpu.memoryTotal,
                    'memory_free_mb': gpu.memoryFree,
                    'utilization_percent': gpu.load * 100
                }
        except:
            return None
    
    def _save_profile(self, profile_data: Dict):
        """Save profiling results"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{profile_data['stage']}_{timestamp}.json"
        
        # Remove torch profiler object if present (not JSON serializable)
        if 'torch_profiler' in profile_data:
            del profile_data['torch_profiler']
        
        with open(self.output_dir / filename, 'w') as f:
            json.dump(profile_data, f, indent=2, default=str)
        
        self.profiles[profile_data['stage']] = profile_data
    
    def generate_performance_report(self) -> Dict:
        """Generate comprehensive performance report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'system_info': self._get_system_info(),
            'stage_profiles': self.profiles,
            'summary': self._calculate_summary_metrics()
        }
        
        # Save report
        report_file = self.output_dir / "performance_report.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        return report
```

## 5. Regression Testing & CI Integration

### Automated Quality Gates
```python
# regression_testing.py
import pytest
import numpy as np
from typing import Dict, Any
import json
from pathlib import Path

class RegressionTestSuite:
    """Automated regression testing with quality gates"""
    
    def __init__(self, baseline_file: str = "baseline_metrics.json"):
        self.baseline_file = Path(bas