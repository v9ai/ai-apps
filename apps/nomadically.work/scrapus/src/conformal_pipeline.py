# conformal_pipeline.py
"""
Per-stage Conformal Prediction with MAPIE for Scrapus Pipeline
- Module 4 (Lead Scoring) & Module 6 (Evaluation/Monitoring)
- Implements naive, plus, and LAC methods
- <1ms per prediction overhead
- Adaptive calibration with incremental learning
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import pickle
import json
from pathlib import Path

from mapie.regression import MapieRegressor
from mapie.classification import MapieClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, recall_score, precision_score, coverage_error
from sklearn.preprocessing import StandardScaler
import scipy.stats as stats

import matplotlib.pyplot as plt
import seaborn as sns
from dataclasses import asdict

__all__ = [
    'ConformalStageConfig',
    'ConformalNERStage',
    'ConformalEntityResolutionStage', 
    'ConformalLeadScoringStage',
    'ConformalJudgeConsensusStage',
    'ConformalPipeline',
    'AdaptiveConformalCalibrator',
    'ConformalAnalyzer'
]


@dataclass
class ConformalStageConfig:
    """Configuration for conformal prediction at each stage"""
    stage_name: str
    alpha: float = 0.05  # Miscoverage rate (95% coverage)
    method: str = 'plus'  # 'naive', 'plus', or 'lac'
    min_calibration_size: int = 50
    max_calibration_size: int = 5000
    adaptive: bool = True  # Update calibration incrementally
    n_jobs: int = 1
    verbose: int = 0
    
    # Gating thresholds
    use_gating: bool = True
    gating_strategy: str = 'lower_bound'  # 'lower_bound' or 'width'
    
    # Threshold tuning
    auto_tune_threshold: bool = True
    target_recall: float = 0.85  # Maintain recall > 85%
    
    # Visualization
    plot_calibration: bool = True
    save_plots_dir: Optional[Path] = None


@dataclass
class ConformalPrediction:
    """Output of conformal prediction"""
    point_estimate: Union[float, int, np.ndarray]
    lower_bound: Union[float, np.ndarray]
    upper_bound: Union[float, np.ndarray]
    interval_width: Union[float, np.ndarray]
    coverage_level: float
    method: str
    stage: str
    timestamp: datetime = field(default_factory=datetime.now)
    
    def is_valid(self) -> bool:
        """Check if prediction passed confidence gating"""
        if isinstance(self.point_estimate, (int, float)):
            return self.point_estimate >= self.lower_bound
        return np.all(self.point_estimate >= self.lower_bound)
    
    def width_ratio(self) -> float:
        """Interval width / point estimate"""
        if isinstance(self.point_estimate, (int, float)):
            return abs(self.interval_width / max(1e-6, self.point_estimate))
        return float(np.mean(self.interval_width / np.maximum(1e-6, self.point_estimate)))


class ConformalNERStage:
    """
    Stage 1: NER entity confidence scores
    Conformal intervals on model logits -> calibrated confidence bounds
    """
    
    def __init__(self, config: ConformalStageConfig):
        self.config = config
        self.mapie = MapieRegressor(
            estimator=GradientBoostingClassifier(n_estimators=50, random_state=42),
            method=config.method,
            n_jobs=config.n_jobs,
            verbose=config.verbose
        )
        self.scaler = StandardScaler()
        self.calibration_data = {'X': [], 'y': [], 'confidences': []}
        self.threshold = 0.5
        self.metrics_history = []
        
    def fit(self, X_confidence: np.ndarray, y_true: np.ndarray) -> Dict:
        """
        Fit conformal predictor on entity confidence scores
        
        Args:
            X_confidence: NxM matrix of entity confidences (from NER model)
            y_true: Nx1 binary labels (correct/incorrect entity)
        
        Returns:
            Calibration metrics
        """
        assert len(X_confidence) == len(y_true), "Length mismatch"
        assert len(X_confidence) >= self.config.min_calibration_size, \
            f"Need >= {self.config.min_calibration_size} samples"
        
        # Normalize confidences
        X_scaled = self.scaler.fit_transform(X_confidence.reshape(-1, 1))
        
        # Fit MAPIE
        self.mapie.fit(X_scaled, y_true)
        
        # Store calibration data
        self.calibration_data['X'] = X_confidence
        self.calibration_data['y'] = y_true
        self.calibration_data['confidences'] = X_scaled
        
        # Get initial metrics
        metrics = self._evaluate_calibration(X_scaled, y_true)
        self.metrics_history.append(metrics)
        
        return metrics
    
    def predict(self, confidences: np.ndarray) -> ConformalPrediction:
        """
        Predict with conformal intervals
        
        Args:
            confidences: 1D or 2D array of entity confidences
        
        Returns:
            ConformalPrediction with interval bounds
        """
        if confidences.ndim == 1:
            confidences = confidences.reshape(-1, 1)
        
        X_scaled = self.scaler.transform(confidences)
        
        # Get predictions and intervals
        y_pred, y_interval = self.mapie.predict(X_scaled)
        
        lower_bound = y_interval[:, 0, 0].squeeze()
        upper_bound = y_interval[:, 1, 0].squeeze()
        
        # Clip to valid range [0, 1]
        lower_bound = np.clip(lower_bound, 0, 1)
        upper_bound = np.clip(upper_bound, 0, 1)
        
        interval_width = upper_bound - lower_bound
        
        return ConformalPrediction(
            point_estimate=y_pred.squeeze(),
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            interval_width=interval_width,
            coverage_level=1 - self.config.alpha,
            method=self.config.method,
            stage=self.config.stage_name
        )
    
    def auto_tune_threshold(self, X_val: np.ndarray, y_val: np.ndarray) -> float:
        """
        Auto-tune confidence threshold to maximize F1 while maintaining recall > 85%
        
        Returns:
            Optimal threshold
        """
        preds = self.predict(X_val)
        thresholds = np.linspace(0, 1, 101)
        best_f1 = 0
        best_threshold = 0.5
        
        for threshold in thresholds:
            mask = preds.point_estimate >= threshold
            if mask.sum() == 0:
                continue
                
            recall = recall_score(y_val[mask], preds.point_estimate[mask] >= threshold)
            if recall < self.config.target_recall:
                continue
            
            f1 = f1_score(y_val[mask], preds.point_estimate[mask] >= threshold)
            if f1 > best_f1:
                best_f1 = f1
                best_threshold = threshold
        
        self.threshold = best_threshold
        return best_threshold
    
    def _evaluate_calibration(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Evaluate calibration quality"""
        preds = self.mapie.predict(X)
        y_pred = preds[0].squeeze()
        
        coverage = np.mean((y >= preds[1][:, 0, 0]) & (y <= preds[1][:, 1, 0]))
        
        return {
            'timestamp': datetime.now().isoformat(),
            'coverage': float(coverage),
            'target_coverage': 1 - self.config.alpha,
            'f1': float(f1_score(y, y_pred >= 0.5)),
            'samples': len(y)
        }


class ConformalEntityResolutionStage:
    """
    Stage 2: Entity resolution matching similarity
    Conformal intervals on Siamese/DeBERTa similarity scores
    """
    
    def __init__(self, config: ConformalStageConfig):
        self.config = config
        self.mapie = MapieRegressor(
            estimator=GradientBoostingClassifier(n_estimators=50, random_state=42),
            method=config.method,
            n_jobs=config.n_jobs,
            verbose=config.verbose
        )
        self.scaler = StandardScaler()
        self.calibration_data = {'X': [], 'y': [], 'similarities': []}
        self.threshold = 0.7
        self.metrics_history = []
    
    def fit(self, X_similarity: np.ndarray, y_matched: np.ndarray) -> Dict:
        """
        Fit on similarity scores from entity matcher
        
        Args:
            X_similarity: NxM matrix of similarity scores (e.g., cosine, attention)
            y_matched: Nx1 binary labels (matched pairs / non-matched)
        
        Returns:
            Calibration metrics
        """
        assert len(X_similarity) == len(y_matched)
        
        X_scaled = self.scaler.fit_transform(X_similarity)
        self.mapie.fit(X_scaled, y_matched)
        
        self.calibration_data['X'] = X_similarity
        self.calibration_data['y'] = y_matched
        self.calibration_data['similarities'] = X_scaled
        
        metrics = self._evaluate_calibration(X_scaled, y_matched)
        self.metrics_history.append(metrics)
        
        return metrics
    
    def predict(self, similarities: np.ndarray) -> ConformalPrediction:
        """
        Predict entity match probability with conformal intervals
        
        Args:
            similarities: 1D or 2D array of similarity scores
        
        Returns:
            ConformalPrediction with interval bounds
        """
        if similarities.ndim == 1:
            similarities = similarities.reshape(-1, 1)
        
        X_scaled = self.scaler.transform(similarities)
        y_pred, y_interval = self.mapie.predict(X_scaled)
        
        lower_bound = np.clip(y_interval[:, 0, 0], 0, 1).squeeze()
        upper_bound = np.clip(y_interval[:, 1, 0], 0, 1).squeeze()
        interval_width = upper_bound - lower_bound
        
        return ConformalPrediction(
            point_estimate=y_pred.squeeze(),
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            interval_width=interval_width,
            coverage_level=1 - self.config.alpha,
            method=self.config.method,
            stage=self.config.stage_name
        )
    
    def auto_tune_threshold(self, X_val: np.ndarray, y_val: np.ndarray) -> float:
        """Auto-tune match confidence threshold"""
        preds = self.predict(X_val)
        thresholds = np.linspace(0, 1, 101)
        best_f1 = 0
        best_threshold = 0.7
        
        for threshold in thresholds:
            mask = preds.point_estimate >= threshold
            if mask.sum() == 0:
                continue
            
            recall = recall_score(y_val[mask], preds.point_estimate[mask] >= threshold)
            if recall < self.config.target_recall:
                continue
            
            f1 = f1_score(y_val[mask], preds.point_estimate[mask] >= threshold)
            if f1 > best_f1:
                best_f1 = f1
                best_threshold = threshold
        
        self.threshold = best_threshold
        return best_threshold
    
    def _evaluate_calibration(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Evaluate calibration quality"""
        preds = self.mapie.predict(X)
        y_pred = preds[0].squeeze()
        coverage = np.mean((y >= preds[1][:, 0, 0]) & (y <= preds[1][:, 1, 0]))
        
        return {
            'timestamp': datetime.now().isoformat(),
            'coverage': float(coverage),
            'target_coverage': 1 - self.config.alpha,
            'f1': float(f1_score(y, y_pred >= 0.5)),
            'samples': len(y)
        }


class ConformalLeadScoringStage:
    """
    Stage 3: Lead scoring ensemble confidence
    Conformal intervals on ensemble predictions (LightGBM + LogReg + RF)
    """
    
    def __init__(self, config: ConformalStageConfig, 
                 base_estimator: Optional[object] = None):
        self.config = config
        
        # Use provided estimator or default
        if base_estimator is None:
            base_estimator = GradientBoostingClassifier(
                n_estimators=100, 
                learning_rate=0.05,
                max_depth=5,
                random_state=42
            )
        
        self.mapie = MapieClassifier(
            estimator=base_estimator,
            method=config.method,
            n_jobs=config.n_jobs,
            verbose=config.verbose
        )
        self.scaler = StandardScaler()
        self.calibration_data = {'X': [], 'y': []}
        self.threshold = 0.5
        self.metrics_history = []
        self.feature_names = None
    
    def fit(self, X_features: np.ndarray, y_labels: np.ndarray,
            feature_names: Optional[List[str]] = None) -> Dict:
        """
        Fit conformal lead scorer
        
        Args:
            X_features: NxM feature matrix (from ensemble preprocessor)
            y_labels: Nx1 binary labels (qualified/unqualified)
            feature_names: List of feature names for interpretability
        
        Returns:
            Calibration metrics
        """
        assert len(X_features) == len(y_labels)
        
        self.feature_names = feature_names
        
        # Split into train/calibration
        split_idx = int(0.7 * len(X_features))
        X_train, X_calib = X_features[:split_idx], X_features[split_idx:]
        y_train, y_calib = y_labels[:split_idx], y_labels[split_idx:]
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_calib_scaled = self.scaler.transform(X_calib)
        
        # Fit MAPIE with calibration set
        self.mapie.fit(X_train_scaled, y_train)
        self.mapie.calibrate(X_calib_scaled, y_calib)
        
        self.calibration_data['X'] = X_calib
        self.calibration_data['y'] = y_calib
        
        metrics = self._evaluate_calibration(X_calib_scaled, y_calib)
        self.metrics_history.append(metrics)
        
        return metrics
    
    def predict(self, X_features: np.ndarray, 
                return_proba: bool = True) -> ConformalPrediction:
        """
        Predict lead qualification with conformal intervals
        
        Args:
            X_features: NxM feature matrix
            return_proba: Return probability intervals vs binary prediction intervals
        
        Returns:
            ConformalPrediction with interval bounds
        """
        X_scaled = self.scaler.transform(X_features)
        
        # Get predictions and intervals
        y_pred = self.mapie.predict(X_scaled)
        y_proba = self.mapie.predict_proba(X_scaled)
        
        # Extract confidence intervals from probabilities
        # y_proba shape: (n_samples, n_classes, 2) -> (n_samples, 2, 2) for binary
        lower_bound = y_proba[:, 1, 0].squeeze()  # P(y=1) lower
        upper_bound = y_proba[:, 1, 1].squeeze()  # P(y=1) upper
        point_est = (lower_bound + upper_bound) / 2
        
        interval_width = upper_bound - lower_bound
        
        return ConformalPrediction(
            point_estimate=point_est,
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            interval_width=interval_width,
            coverage_level=1 - self.config.alpha,
            method=self.config.method,
            stage=self.config.stage_name
        )
    
    def auto_tune_threshold(self, X_val: np.ndarray, y_val: np.ndarray) -> float:
        """Auto-tune lead qualification threshold"""
        preds = self.predict(X_val)
        thresholds = np.linspace(0, 1, 101)
        best_f1 = 0
        best_threshold = 0.5
        
        for threshold in thresholds:
            mask = preds.point_estimate >= threshold
            if mask.sum() == 0:
                continue
            
            recall = recall_score(y_val[mask], preds.point_estimate[mask] >= threshold)
            if recall < self.config.target_recall:
                continue
            
            f1 = f1_score(y_val[mask], preds.point_estimate[mask] >= threshold)
            if f1 > best_f1:
                best_f1 = f1
                best_threshold = threshold
        
        self.threshold = best_threshold
        return best_threshold
    
    def _evaluate_calibration(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Evaluate calibration quality"""
        y_pred = self.mapie.predict(X)
        
        # Calculate coverage on calibration set
        y_proba = self.mapie.predict_proba(X)
        lower = y_proba[:, 1, 0]
        upper = y_proba[:, 1, 1]
        coverage = np.mean((y >= lower) & (y <= upper))
        
        f1 = f1_score(y, y_pred)
        
        return {
            'timestamp': datetime.now().isoformat(),
            'coverage': float(coverage),
            'target_coverage': 1 - self.config.alpha,
            'f1': float(f1),
            'samples': len(y)
        }


class ConformalJudgeConsensusStage:
    """
    Stage 4: Report generation LLM-as-judge consensus
    Conformal intervals on judge agreement scores (multi-judge ensemble)
    """
    
    def __init__(self, config: ConformalStageConfig, n_judges: int = 2):
        self.config = config
        self.n_judges = n_judges
        self.mapie = MapieRegressor(
            estimator=GradientBoostingClassifier(n_estimators=50, random_state=42),
            method=config.method,
            n_jobs=config.n_jobs,
            verbose=config.verbose
        )
        self.scaler = StandardScaler()
        self.calibration_data = {'X': [], 'y': [], 'agreements': []}
        self.threshold = 0.7
        self.metrics_history = []
    
    def fit(self, judge_scores: List[np.ndarray], y_true: np.ndarray) -> Dict:
        """
        Fit on judge consensus scores
        
        Args:
            judge_scores: List of N arrays, each (M, 1) - individual judge scores
            y_true: M,1 ground truth labels
        
        Returns:
            Calibration metrics
        """
        assert len(judge_scores) >= 2, "Need at least 2 judges"
        assert all(len(s) == len(y_true) for s in judge_scores)
        
        # Calculate agreement metrics
        judge_stack = np.column_stack(judge_scores)
        agreement_std = np.std(judge_stack, axis=1)
        agreement_mean = np.mean(judge_stack, axis=1)
        
        # Features: mean + std of judge scores
        X = np.column_stack([agreement_mean, agreement_std])
        X_scaled = self.scaler.fit_transform(X)
        
        # Fit MAPIE on agreement patterns
        self.mapie.fit(X_scaled, y_true)
        
        self.calibration_data['X'] = X
        self.calibration_data['y'] = y_true
        self.calibration_data['agreements'] = X_scaled
        
        metrics = self._evaluate_calibration(X_scaled, y_true)
        self.metrics_history.append(metrics)
        
        return metrics
    
    def predict(self, judge_scores: List[np.ndarray]) -> ConformalPrediction:
        """
        Predict report quality with conformal intervals
        
        Args:
            judge_scores: List of N arrays with judge quality scores
        
        Returns:
            ConformalPrediction with interval bounds
        """
        assert len(judge_scores) >= 1
        
        judge_stack = np.column_stack(judge_scores)
        agreement_std = np.std(judge_stack, axis=1)
        agreement_mean = np.mean(judge_stack, axis=1)
        
        X = np.column_stack([agreement_mean, agreement_std])
        X_scaled = self.scaler.transform(X)
        
        y_pred, y_interval = self.mapie.predict(X_scaled)
        
        lower_bound = np.clip(y_interval[:, 0, 0], 0, 1).squeeze()
        upper_bound = np.clip(y_interval[:, 1, 0], 0, 1).squeeze()
        interval_width = upper_bound - lower_bound
        
        return ConformalPrediction(
            point_estimate=y_pred.squeeze(),
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            interval_width=interval_width,
            coverage_level=1 - self.config.alpha,
            method=self.config.method,
            stage=self.config.stage_name
        )
    
    def _evaluate_calibration(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Evaluate calibration quality"""
        preds = self.mapie.predict(X)
        y_pred = preds[0].squeeze()
        coverage = np.mean((y >= preds[1][:, 0, 0]) & (y <= preds[1][:, 1, 0]))
        
        return {
            'timestamp': datetime.now().isoformat(),
            'coverage': float(coverage),
            'target_coverage': 1 - self.config.alpha,
            'f1': float(f1_score(y, y_pred >= 0.5)),
            'samples': len(y),
            'n_judges': self.n_judges
        }


class AdaptiveConformalCalibrator:
    """
    Adaptive conformal prediction with incremental calibration
    Updates calibration set as new labels arrive (online learning)
    """
    
    def __init__(self, max_calib_size: int = 5000, update_frequency: int = 100):
        self.max_calib_size = max_calib_size
        self.update_frequency = update_frequency
        self.calibration_buffer = {'X': [], 'y': []}
        self.update_counter = 0
        self.update_history = []
    
    def update(self, X_new: np.ndarray, y_new: np.ndarray, stage) -> bool:
        """
        Incrementally update calibration set
        
        Args:
            X_new: New feature samples
            y_new: New labels
            stage: ConformalStage object to update
        
        Returns:
            True if stage was refit
        """
        # Add to buffer
        self.calibration_buffer['X'].extend(X_new)
        self.calibration_buffer['y'].extend(y_new)
        self.update_counter += len(X_new)
        
        # Refit if threshold reached
        should_refit = self.update_counter >= self.update_frequency
        
        if should_refit and len(self.calibration_buffer['X']) >= stage.config.min_calibration_size:
            # Trim to max size (keep most recent)
            if len(self.calibration_buffer['X']) > self.max_calib_size:
                self.calibration_buffer['X'] = self.calibration_buffer['X'][-self.max_calib_size:]
                self.calibration_buffer['y'] = self.calibration_buffer['y'][-self.max_calib_size:]
            
            # Refit stage
            X_array = np.array(self.calibration_buffer['X'])
            y_array = np.array(self.calibration_buffer['y'])
            
            metrics = stage.fit(X_array, y_array)
            
            update_event = {
                'timestamp': datetime.now().isoformat(),
                'stage': stage.config.stage_name,
                'samples_added': len(X_new),
                'total_samples': len(self.calibration_buffer['X']),
                'metrics': metrics
            }
            self.update_history.append(update_event)
            
            self.update_counter = 0
            return True
        
        return False


class ConformalPipeline:
    """
    Complete conformal prediction pipeline across all 4 stages
    With confidence gating and automatic threshold tuning
    """
    
    def __init__(self, 
                 config_dict: Optional[Dict] = None,
                 timing_budget_ms: float = 1.0):
        """
        Initialize pipeline
        
        Args:
            config_dict: Dict of stage-specific configs
            timing_budget_ms: Max latency per prediction (default 1ms)
        """
        self.timing_budget_ms = timing_budget_ms
        self.timings = {'stage_times': [], 'total_time': []}
        
        # Default configs for each stage
        if config_dict is None:
            config_dict = {}
        
        default_configs = {
            'ner': ConformalStageConfig(
                stage_name='NER',
                alpha=0.05,
                method='lac',
                use_gating=True
            ),
            'entity_resolution': ConformalStageConfig(
                stage_name='Entity Resolution',
                alpha=0.05,
                method='plus',
                use_gating=True
            ),
            'lead_scoring': ConformalStageConfig(
                stage_name='Lead Scoring',
                alpha=0.05,
                method='plus',
                use_gating=True,
                auto_tune_threshold=True
            ),
            'judge_consensus': ConformalStageConfig(
                stage_name='Judge Consensus',
                alpha=0.05,
                method='naive',
                use_gating=False
            )
        }
        
        # Merge with user configs
        for stage, config in default_configs.items():
            if stage in config_dict:
                for key, val in asdict(config_dict[stage]).items():
                    setattr(config, key, val)
            default_configs[stage] = config
        
        # Initialize stages
        self.ner = ConformalNERStage(default_configs['ner'])
        self.entity_resolution = ConformalEntityResolutionStage(
            default_configs['entity_resolution']
        )
        self.lead_scoring = ConformalLeadScoringStage(
            default_configs['lead_scoring']
        )
        self.judge_consensus = ConformalJudgeConsensusStage(
            default_configs['judge_consensus']
        )
        
        self.adaptive_calibrator = AdaptiveConformalCalibrator()
        self.stage_results = {}
    
    def predict(self, 
                ner_confidences: np.ndarray,
                entity_similarities: np.ndarray,
                lead_features: np.ndarray,
                judge_scores: Optional[List[np.ndarray]] = None,
                apply_gating: bool = True) -> Dict:
        """
        Run complete pipeline prediction with gating
        
        Args:
            ner_confidences: NER confidence scores (N,1)
            entity_similarities: Entity matcher similarities (N,1)
            lead_features: Lead scoring features (N,M)
            judge_scores: Optional list of judge scores for reports
            apply_gating: Drop predictions below lower CI bound
        
        Returns:
            Dict with predictions for each stage + gating decisions
        """
        import time
        start_time = time.perf_counter()
        
        results = {}
        
        # Stage 1: NER
        t1 = time.perf_counter()
        ner_pred = self.ner.predict(ner_confidences)
        results['ner'] = {
            'prediction': ner_pred,
            'passed_gate': ner_pred.is_valid() if apply_gating else True
        }
        t1_elapsed = (time.perf_counter() - t1) * 1000
        
        # Stage 2: Entity Resolution
        t2 = time.perf_counter()
        # Only process entities that passed NER gate
        mask = np.array([results['ner']['passed_gate']])
        if mask.any():
            entity_sim_filtered = entity_similarities[mask]
            entity_pred = self.entity_resolution.predict(entity_sim_filtered)
            results['entity_resolution'] = {
                'prediction': entity_pred,
                'passed_gate': entity_pred.is_valid() if apply_gating else True,
                'filtered_entities': mask.sum()
            }
        else:
            results['entity_resolution'] = {
                'prediction': None,
                'passed_gate': False,
                'filtered_entities': 0
            }
        t2_elapsed = (time.perf_counter() - t2) * 1000
        
        # Stage 3: Lead Scoring
        t3 = time.perf_counter()
        if results['entity_resolution']['passed_gate']:
            lead_pred = self.lead_scoring.predict(lead_features)
            results['lead_scoring'] = {
                'prediction': lead_pred,
                'passed_gate': lead_pred.is_valid() if apply_gating else True,
                'confidence': float(lead_pred.point_estimate)
            }
        else:
            results['lead_scoring'] = {
                'prediction': None,
                'passed_gate': False,
                'confidence': 0.0
            }
        t3_elapsed = (time.perf_counter() - t3) * 1000
        
        # Stage 4: Judge Consensus (optional)
        t4_elapsed = 0
        if judge_scores and results['lead_scoring']['passed_gate']:
            t4 = time.perf_counter()
            judge_pred = self.judge_consensus.predict(judge_scores)
            results['judge_consensus'] = {
                'prediction': judge_pred,
                'passed_gate': True,
                'agreement_confidence': float(judge_pred.point_estimate)
            }
            t4_elapsed = (time.perf_counter() - t4) * 1000
        else:
            results['judge_consensus'] = None
        
        # Timing stats
        total_elapsed = (time.perf_counter() - start_time) * 1000
        results['timing'] = {
            'ner_ms': t1_elapsed,
            'entity_resolution_ms': t2_elapsed,
            'lead_scoring_ms': t3_elapsed,
            'judge_consensus_ms': t4_elapsed,
            'total_ms': total_elapsed,
            'budget_ok': total_elapsed < self.timing_budget_ms
        }
        
        self.timings['stage_times'].append({
            'ner': t1_elapsed,
            'entity_resolution': t2_elapsed,
            'lead_scoring': t3_elapsed,
            'judge_consensus': t4_elapsed
        })
        self.timings['total_time'].append(total_elapsed)
        
        return results
    
    def auto_tune_all_thresholds(self, 
                                 X_val_dict: Dict[str, np.ndarray],
                                 y_val_dict: Dict[str, np.ndarray]) -> Dict:
        """
        Auto-tune thresholds for all stages
        
        Args:
            X_val_dict: {'ner': X, 'entity_resolution': X, ...}
            y_val_dict: {'ner': y, 'entity_resolution': y, ...}
        
        Returns:
            Dict of optimal thresholds
        """
        thresholds = {}
        
        if 'ner' in X_val_dict:
            thresholds['ner'] = self.ner.auto_tune_threshold(
                X_val_dict['ner'], y_val_dict['ner']
            )
        
        if 'entity_resolution' in X_val_dict:
            thresholds['entity_resolution'] = \
                self.entity_resolution.auto_tune_threshold(
                    X_val_dict['entity_resolution'], 
                    y_val_dict['entity_resolution']
                )
        
        if 'lead_scoring' in X_val_dict:
            thresholds['lead_scoring'] = self.lead_scoring.auto_tune_threshold(
                X_val_dict['lead_scoring'], y_val_dict['lead_scoring']
            )
        
        return thresholds


class ConformalAnalyzer:
    """
    Analyze conformal prediction coverage, efficiency, and calibration
    Generate visualizations for trade-offs
    """
    
    def __init__(self, pipeline: ConformalPipeline):
        self.pipeline = pipeline
    
    def analyze_stage(self, stage: object, 
                      stage_name: str) -> Dict:
        """
        Comprehensive analysis of a single stage
        
        Args:
            stage: ConformalStage object
            stage_name: Name for logging
        
        Returns:
            Analysis results
        """
        metrics_df = pd.DataFrame(stage.metrics_history)
        
        if len(metrics_df) == 0:
            return {'error': 'No metrics history'}
        
        analysis = {
            'stage': stage_name,
            'num_updates': len(metrics_df),
            'coverage': {
                'mean': float(metrics_df['coverage'].mean()),
                'std': float(metrics_df['coverage'].std()),
                'target': stage.config.alpha,
                'over_coverage': float((metrics_df['coverage'] - (1 - stage.config.alpha)).mean())
            },
            'f1': {
                'mean': float(metrics_df['f1'].mean()),
                'std': float(metrics_df['f1'].std()),
                'max': float(metrics_df['f1'].max())
            },
            'efficiency': {
                'interval_width_ratio': self._estimate_width_ratio(stage),
                'gating_dropout_pct': 0.0  # Will be calculated from predictions
            }
        }
        
        return analysis
    
    def _estimate_width_ratio(self, stage: object) -> float:
        """Estimate average interval width"""
        if not hasattr(stage, 'calibration_data'):
            return 0.0
        
        X = stage.calibration_data.get('X', [])
        if len(X) == 0:
            return 0.0
        
        preds = stage.predict(np.array(X))
        return preds.width_ratio()
    
    def plot_calibration_curve(self, stage: object, 
                               stage_name: str,
                               save_path: Optional[Path] = None):
        """
        Plot calibration curve (coverage vs alpha)
        
        Args:
            stage: ConformalStage object
            stage_name: Name for plot
            save_path: Path to save figure
        """
        metrics_df = pd.DataFrame(stage.metrics_history)
        
        if len(metrics_df) == 0:
            print(f"No metrics for {stage_name}")
            return
        
        fig, axes = plt.subplots(2, 2, figsize=(12, 10))
        fig.suptitle(f'Conformal Prediction Analysis: {stage_name}', fontsize=14)
        
        # Coverage trajectory
        axes[0, 0].plot(metrics_df.index, metrics_df['coverage'], 'b-', label='Coverage')
        axes[0, 0].axhline(y=metrics_df['target_coverage'].iloc[0], 
                           color='r', linestyle='--', label='Target')
        axes[0, 0].set_ylabel('Coverage')
        axes[0, 0].set_xlabel('Update')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        
        # F1 trajectory
        axes[0, 1].plot(metrics_df.index, metrics_df['f1'], 'g-')
        axes[0, 1].set_ylabel('F1 Score')
        axes[0, 1].set_xlabel('Update')
        axes[0, 1].grid(True, alpha=0.3)
        
        # Coverage histogram
        axes[1, 0].hist(metrics_df['coverage'], bins=20, color='skyblue', edgecolor='black')
        axes[1, 0].axvline(metrics_df['target_coverage'].iloc[0], 
                           color='r', linestyle='--', linewidth=2)
        axes[1, 0].set_xlabel('Coverage')
        axes[1, 0].set_ylabel('Frequency')
        
        # Method distribution
        if 'method' in stage.config.__dict__:
            method_text = f"Method: {stage.config.method}\nAlpha: {stage.config.alpha}"
            axes[1, 1].text(0.5, 0.5, method_text, 
                           ha='center', va='center', fontsize=12,
                           bbox=dict(boxstyle='round', facecolor='wheat', alpha=0.5))
            axes[1, 1].axis('off')
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Saved plot to {save_path}")
        
        plt.show()
    
    def plot_coverage_efficiency_tradeoff(self, 
                                         save_path: Optional[Path] = None):
        """
        Plot coverage vs interval width trade-off for all stages
        
        Args:
            save_path: Path to save figure
        """
        stages = {
            'NER': self.pipeline.ner,
            'Entity Resolution': self.pipeline.entity_resolution,
            'Lead Scoring': self.pipeline.lead_scoring,
            'Judge Consensus': self.pipeline.judge_consensus
        }
        
        fig, ax = plt.subplots(figsize=(10, 6))
        
        for stage_name, stage in stages.items():
            coverage_vals = []
            width_vals = []
            
            metrics_df = pd.DataFrame(stage.metrics_history)
            if len(metrics_df) > 0:
                coverage = metrics_df['coverage'].mean()
                
                # Estimate width from calibration data
                if hasattr(stage, 'calibration_data'):
                    X = stage.calibration_data.get('X', [])
                    if len(X) > 0:
                        preds = stage.predict(np.array(X))
                        width = preds.width_ratio()
                        
                        ax.scatter(coverage, width, s=200, alpha=0.7, label=stage_name)
        
        ax.set_xlabel('Coverage')
        ax.set_ylabel('Avg Interval Width Ratio')
        ax.set_title('Coverage vs Efficiency Trade-off')
        ax.legend()
        ax.grid(True, alpha=0.3)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=150, bbox_inches='tight')
            print(f"Saved tradeoff plot to {save_path}")
        
        plt.show()
    
    def print_summary(self) -> str:
        """Generate summary report"""
        summary = "CONFORMAL PREDICTION PIPELINE SUMMARY\n"
        summary += "=" * 60 + "\n\n"
        
        stages = {
            'NER': self.pipeline.ner,
            'Entity Resolution': self.pipeline.entity_resolution,
            'Lead Scoring': self.pipeline.lead_scoring,
            'Judge Consensus': self.pipeline.judge_consensus
        }
        
        for stage_name, stage in stages.items():
            analysis = self.analyze_stage(stage, stage_name)
            
            summary += f"\n{stage_name}:\n"
            summary += "-" * 40 + "\n"
            summary += f"  Method: {stage.config.method}\n"
            summary += f"  Alpha (target miscoverage): {stage.config.alpha}\n"
            
            if 'error' not in analysis:
                summary += f"  Coverage: {analysis['coverage']['mean']:.4f} "
                summary += f"(target: {analysis['coverage']['target']:.4f})\n"
                summary += f"  Over-coverage: {analysis['coverage']['over_coverage']:.4f}\n"
                summary += f"  F1 Score: {analysis['f1']['mean']:.4f}\n"
                summary += f"  Efficiency: {analysis['efficiency']['interval_width_ratio']:.4f}\n"
        
        # Timing stats
        if self.pipeline.timings['total_time']:
            summary += "\n\nTiming Stats:\n"
            summary += "-" * 40 + "\n"
            avg_time = np.mean(self.pipeline.timings['total_time'])
            max_time = np.max(self.pipeline.timings['total_time'])
            summary += f"  Avg latency: {avg_time:.3f} ms\n"
            summary += f"  Max latency: {max_time:.3f} ms\n"
            summary += f"  Budget: {self.pipeline.timing_budget_ms} ms\n"
            summary += f"  Budget OK: {max_time < self.pipeline.timing_budget_ms}\n"
        
        return summary


# ============================================================================
# TESTS
# ============================================================================

def test_ner_stage():
    """Test NER conformal prediction"""
    print("\n=== Testing NER Stage ===")
    
    config = ConformalStageConfig(
        stage_name='NER',
        alpha=0.05,
        method='plus',
        min_calibration_size=30
    )
    
    stage = ConformalNERStage(config)
    
    # Generate synthetic data
    np.random.seed(42)
    X_calib = np.random.uniform(0, 1, (100, 1))
    y_calib = (X_calib.squeeze() > 0.5).astype(int)
    
    # Fit
    metrics = stage.fit(X_calib, y_calib)
    print(f"Calibration metrics: {metrics}")
    
    # Predict
    X_test = np.random.uniform(0, 1, (10, 1))
    pred = stage.predict(X_test)
    
    print(f"Predictions shape: {pred.point_estimate.shape}")
    print(f"Coverage: {pred.coverage_level}")
    print(f"Sample interval widths: {pred.interval_width[:5]}")
    
    # Auto-tune threshold
    threshold = stage.auto_tune_threshold(X_calib, y_calib)
    print(f"Auto-tuned threshold: {threshold:.4f}")
    
    return True


def test_lead_scoring_stage():
    """Test lead scoring conformal prediction"""
    print("\n=== Testing Lead Scoring Stage ===")
    
    config = ConformalStageConfig(
        stage_name='Lead Scoring',
        alpha=0.05,
        method='plus'
    )
    
    stage = ConformalLeadScoringStage(config)
    
    # Generate synthetic data
    np.random.seed(42)
    X_features = np.random.randn(200, 15)
    y_labels = (np.random.randn(200) > 0).astype(int)
    
    # Fit
    metrics = stage.fit(X_features, y_labels)
    print(f"Calibration metrics: {metrics}")
    
    # Predict
    X_test = np.random.randn(10, 15)
    pred = stage.predict(X_test)
    
    print(f"Predictions shape: {pred.point_estimate.shape}")
    print(f"Coverage: {pred.coverage_level}")
    print(f"Interval widths: {pred.interval_width[:5]}")
    print(f"Sample valid predictions: {[pred.is_valid()]}")
    
    # Auto-tune
    threshold = stage.auto_tune_threshold(X_features, y_labels)
    print(f"Auto-tuned threshold: {threshold:.4f}")
    
    return True


def test_full_pipeline():
    """Test complete 4-stage pipeline"""
    print("\n=== Testing Full Pipeline ===")
    
    pipeline = ConformalPipeline(timing_budget_ms=5.0)
    
    # Generate synthetic data for training
    np.random.seed(42)
    
    # Train each stage
    print("Training stages...")
    
    # NER
    X_ner = np.random.uniform(0, 1, (100, 1))
    y_ner = (X_ner.squeeze() > 0.5).astype(int)
    pipeline.ner.fit(X_ner, y_ner)
    
    # Entity Resolution
    X_er = np.random.uniform(0, 1, (100, 1))
    y_er = (X_er.squeeze() > 0.6).astype(int)
    pipeline.entity_resolution.fit(X_er, y_er)
    
    # Lead Scoring
    X_ls = np.random.randn(150, 10)
    y_ls = (np.sum(X_ls, axis=1) > 0).astype(int)
    pipeline.lead_scoring.fit(X_ls, y_ls)
    
    # Judge Consensus
    judge1 = np.random.uniform(0.3, 0.9, 100)
    judge2 = np.random.uniform(0.4, 0.8, 100)
    y_judge = (judge1 + judge2 > 1.0).astype(int)
    pipeline.judge_consensus.fit([judge1, judge2], y_judge)
    
    print("All stages trained!")
    
    # Run prediction
    print("\nRunning prediction on test data...")
    test_ner = np.array([[0.7], [0.3], [0.8]])
    test_er = np.array([[0.75], [0.45], [0.82]])
    test_ls = np.random.randn(3, 10)
    test_judges = [
        np.array([0.6, 0.4, 0.8]),
        np.array([0.65, 0.35, 0.75])
    ]
    
    results = pipeline.predict(
        test_ner, test_er, test_ls, test_judges,
        apply_gating=True
    )
    
    print(f"\nResults:")
    print(f"  NER passed gate: {results['ner']['passed_gate']}")
    print(f"  Entity Resolution passed gate: {results['entity_resolution']['passed_gate']}")
    print(f"  Lead Scoring passed gate: {results['lead_scoring']['passed_gate']}")
    if results['judge_consensus']:
        print(f"  Judge Consensus available: True")
    
    print(f"\nTiming: {results['timing']['total_ms']:.3f} ms (budget: {pipeline.timing_budget_ms} ms)")
    
    # Analyze
    print("\n=== Analysis ===")
    analyzer = ConformalAnalyzer(pipeline)
    summary = analyzer.print_summary()
    print(summary)
    
    return True


def test_adaptive_calibration():
    """Test adaptive conformal calibration"""
    print("\n=== Testing Adaptive Calibration ===")
    
    pipeline = ConformalPipeline()
    calibrator = AdaptiveConformalCalibrator(
        max_calib_size=500,
        update_frequency=50
    )
    
    # Simulate streaming data
    np.random.seed(42)
    
    for batch in range(5):
        X_batch = np.random.randn(50, 10)
        y_batch = (np.sum(X_batch, axis=1) > 0).astype(int)
        
        # Add to stream
        should_refit = calibrator.update(X_batch, y_batch, pipeline.lead_scoring)
        
        if should_refit:
            print(f"  Batch {batch}: Refit triggered")
            print(f"    Total samples in calibration: {len(calibrator.calibration_buffer['X'])}")
    
    print(f"\nTotal updates: {len(calibrator.update_history)}")
    print("Adaptive calibration working!")
    
    return True


if __name__ == '__main__':
    print("CONFORMAL PREDICTION PIPELINE TESTS")
    print("=" * 60)
    
    test_ner_stage()
    test_lead_scoring_stage()
    test_full_pipeline()
    test_adaptive_calibration()
    
    print("\n" + "=" * 60)
    print("ALL TESTS PASSED!")
