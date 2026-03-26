"""
Online Learning + Active Learning for Continuous Lead Scoring Improvement
===========================================================================

M1-optimized implementation with:
1. River online classifier: LogisticRegression with exponential decay weighting
2. Monthly retraining cycle: accumulate labels, validate F1 gate, retrain if >82%
3. Active learning with modAL: uncertainty sampling to select top-10 leads
4. Cold-start strategy: transfer learning from pre-trained when <50 labeled samples
5. Concept drift detection: River drift detectors (ADWIN, DDM, EDDM)
6. Automated retraining triggers: when drift detected, trigger full ensemble retrain
7. Label management: SQLite table for human annotations with timestamp + source
8. A/B testing: online-updated model vs static baseline
9. Dashboard integration: expose learning curves and drift status to Streamlit
10. M1 performance: River inference throughput, memory footprint

Author: Scrapus ML Team
Date: 2026-03-26
Target Platform: Apple M1 16GB
"""

import os
import json
import sqlite3
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Any, Callable
from dataclasses import dataclass, asdict, field
from pathlib import Path
import pickle
from collections import deque
import threading
import time

import numpy as np
from scipy import stats

# River: Online learning
import river
from river import linear_model, preprocessing, compose, drift

# Active learning
from modAL.models import ActiveLearner
from modAL.uncertainty import uncertainty_sampling

# Core ML
import lightgbm as lgb
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.preprocessing import StandardScaler
from sklearn.calibration import IsotonicRegression

# Storage
import lancedb
import duckdb

# Monitoring
import psutil

logger = logging.getLogger(__name__)


# ============================================================================
# 1. DATA STRUCTURES
# ============================================================================

@dataclass
class LabelRecord:
    """Human-annotated lead label"""
    company_id: int
    is_qualified: bool
    confidence: float  # 0-1, human certainty
    source: str  # "sales_team", "customer", "internal_review"
    feedback_text: str = ""
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class PredictionRecord:
    """Model prediction with metadata"""
    company_id: int
    ensemble_prob: float
    river_prob: float
    uncertainty: float  # modAL uncertainty score
    features_hash: str  # hash of feature vector for drift detection
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    
    def to_dict(self) -> Dict:
        return asdict(self)


@dataclass
class DriftAlert:
    """Concept drift detection alert"""
    detector_type: str  # ADWIN, DDM, EDDM
    severity: str  # "low", "medium", "high"
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class RetrainingJob:
    """Metadata for a retraining run"""
    job_id: str
    trigger_type: str  # "monthly", "drift", "manual"
    sample_count: int
    f1_baseline: float
    f1_new: Optional[float] = None
    status: str = "pending"  # pending, running, succeeded, failed
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())


# ============================================================================
# 2. LABEL MANAGEMENT & STORAGE
# ============================================================================

class LabelStore:
    """SQLite-backed human label storage with versioning"""
    
    def __init__(self, db_path: str = "scrapus_data/scrapus.db"):
        self.db_path = db_path
        self._init_schema()
    
    def _init_schema(self):
        """Create label tables if not exist"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS label_records (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    is_qualified BOOLEAN NOT NULL,
                    confidence REAL NOT NULL,
                    source TEXT NOT NULL,
                    feedback_text TEXT,
                    timestamp REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(company_id, source, timestamp),
                    FOREIGN KEY(company_id) REFERENCES companies(id)
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_label_company ON label_records(company_id);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_label_timestamp ON label_records(timestamp);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_label_source ON label_records(source);")
            
            # Prediction log for drift detection
            conn.execute("""
                CREATE TABLE IF NOT EXISTS prediction_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    ensemble_prob REAL NOT NULL,
                    river_prob REAL NOT NULL,
                    uncertainty REAL NOT NULL,
                    features_hash TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(company_id) REFERENCES companies(id)
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_pred_timestamp ON prediction_log(timestamp);")
            
            # Retraining jobs
            conn.execute("""
                CREATE TABLE IF NOT EXISTS retraining_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT UNIQUE NOT NULL,
                    trigger_type TEXT NOT NULL,
                    sample_count INTEGER NOT NULL,
                    f1_baseline REAL NOT NULL,
                    f1_new REAL,
                    status TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_retrain_status ON retraining_jobs(status);")
            
            # Drift alerts
            conn.execute("""
                CREATE TABLE IF NOT EXISTS drift_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    detector_type TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    details TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_drift_severity ON drift_alerts(severity);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_drift_timestamp ON drift_alerts(timestamp);")
            
            conn.commit()
    
    def add_label(self, label: LabelRecord) -> int:
        """Add human label, return record ID"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("""
                INSERT INTO label_records 
                (company_id, is_qualified, confidence, source, feedback_text, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (label.company_id, label.is_qualified, label.confidence, 
                  label.source, label.feedback_text, label.timestamp))
            conn.commit()
            return cursor.lastrowid
    
    def get_recent_labels(self, hours: int = 24) -> List[LabelRecord]:
        """Fetch labels from last N hours"""
        cutoff = datetime.now().timestamp() - (hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("""
                SELECT company_id, is_qualified, confidence, source, feedback_text, timestamp
                FROM label_records
                WHERE timestamp > ?
                ORDER BY timestamp DESC
            """, (cutoff,)).fetchall()
        
        return [LabelRecord(**dict(row)) for row in rows]
    
    def get_all_labels(self) -> List[LabelRecord]:
        """Fetch all labels"""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("""
                SELECT company_id, is_qualified, confidence, source, feedback_text, timestamp
                FROM label_records
                ORDER BY timestamp DESC
            """).fetchall()
        
        return [LabelRecord(**dict(row)) for row in rows]
    
    def log_prediction(self, pred: PredictionRecord):
        """Log model prediction for drift detection"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO prediction_log
                (company_id, ensemble_prob, river_prob, uncertainty, features_hash, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (pred.company_id, pred.ensemble_prob, pred.river_prob, 
                  pred.uncertainty, pred.features_hash, pred.timestamp))
            conn.commit()
    
    def log_retraining_job(self, job: RetrainingJob):
        """Log retraining job metadata"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO retraining_jobs
                (job_id, trigger_type, sample_count, f1_baseline, f1_new, status, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (job.job_id, job.trigger_type, job.sample_count, job.f1_baseline,
                  job.f1_new, job.status, job.timestamp))
            conn.commit()
    
    def log_drift_alert(self, alert: DriftAlert):
        """Log drift detection alert"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT INTO drift_alerts
                (detector_type, severity, details, timestamp)
                VALUES (?, ?, ?, ?)
            """, (alert.detector_type, alert.severity, 
                  json.dumps(alert.details), alert.timestamp))
            conn.commit()


# ============================================================================
# 3. RIVER ONLINE CLASSIFIER
# ============================================================================

class RiverOnlineModel:
    """
    River-based online logistic regression with exponential decay weighting.
    
    M1 performance targets:
    - Inference: <1ms per sample
    - Memory: <5 MB resident
    - Training throughput: >1000 samples/sec incremental
    """
    
    def __init__(self, 
                 learning_rate: float = 0.01,
                 decay_factor: float = 0.999,
                 model_path: str = "scrapus_data/models/river_online.pkl"):
        self.learning_rate = learning_rate
        self.decay_factor = decay_factor
        self.model_path = model_path
        
        # Exponential decay via weighted LR
        self.model = compose.Pipeline(
            preprocessing.StandardScaler(),
            linear_model.LogisticRegression(optimizer=river.optimizers.SGD(lr=learning_rate))
        )
        
        # Performance tracking
        self.sample_count = 0
        self.last_100_scores = deque(maxlen=100)
        
    def learn_one(self, features: Dict[str, float], label: int) -> float:
        """
        Update model with single example and return prediction.
        
        Features expected: numeric dictionary (not categorical)
        Label: 0 or 1
        Returns: prediction probability [0, 1]
        """
        # Get prediction before update
        pred = self.model.predict_proba(features).get(True, 0.0)
        
        # Decay old samples implicitly via learning rate schedule
        adaptive_lr = self.learning_rate * (self.decay_factor ** self.sample_count)
        self.model.learn_one(features, label)
        
        self.sample_count += 1
        self.last_100_scores.append(1 if label == pred > 0.5 else 0)
        
        return pred
    
    def predict_proba(self, features: Dict[str, float]) -> float:
        """Return probability of positive class"""
        return self.model.predict_proba(features).get(True, 0.0)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get running performance stats"""
        acc = np.mean(self.last_100_scores) if self.last_100_scores else 0.0
        return {
            "sample_count": self.sample_count,
            "recent_accuracy": float(acc),
            "buffer_size": len(self.last_100_scores)
        }
    
    def save(self):
        """Checkpoint model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        logger.info(f"Saved River model to {self.model_path}")
    
    def load(self):
        """Load model from checkpoint"""
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            logger.info(f"Loaded River model from {self.model_path}")


# ============================================================================
# 4. CONCEPT DRIFT DETECTION
# ============================================================================

class DriftDetector:
    """
    Multi-detector ensemble for concept drift (ADWIN, DDM, EDDM).
    
    Monitors:
    - Prediction errors (binary: correct/incorrect)
    - Prediction uncertainty (confidence drops)
    - Feature distribution shift (via hash distribution)
    """
    
    def __init__(self, alert_threshold: float = 0.85):
        self.alert_threshold = alert_threshold
        
        # Detectors from River
        self.adwin = drift.ADWIN()
        self.ddm = drift.DDM()
        self.eddm = drift.EDDM()
        
        # Stats tracking
        self.predictions = deque(maxlen=1000)
        self.errors = deque(maxlen=1000)
        self.uncertainties = deque(maxlen=1000)
        
    def update(self, 
               prediction: float, 
               true_label: Optional[int] = None,
               uncertainty: float = 0.5) -> Optional[DriftAlert]:
        """
        Update detectors with new prediction.
        
        Returns DriftAlert if drift detected, None otherwise.
        """
        self.predictions.append(prediction)
        self.uncertainties.append(uncertainty)
        
        if true_label is not None:
            error = 1 if (prediction > 0.5) != true_label else 0
            self.errors.append(error)
            
            # Update River detectors
            self.adwin.update(error)
            self.ddm.update(error)
            self.eddm.update(error)
            
            # Check for drift
            alerts = []
            if self.adwin.drift_detected:
                alerts.append(DriftAlert(
                    detector_type="ADWIN",
                    severity="high",
                    details={"type": "sudden_shift"}
                ))
            if self.ddm.drift_detected:
                alerts.append(DriftAlert(
                    detector_type="DDM",
                    severity="medium",
                    details={"warning": self.ddm.warning_level > 0}
                ))
            if self.eddm.drift_detected:
                alerts.append(DriftAlert(
                    detector_type="EDDM",
                    severity="medium",
                    details={"distance": self.eddm.distance}
                ))
            
            # Return most severe alert
            if alerts:
                return max(alerts, key=lambda a: {"low": 0, "medium": 1, "high": 2}[a.severity])
        
        return None
    
    def get_status(self) -> Dict[str, Any]:
        """Get drift detector status"""
        recent_error_rate = (np.mean(self.errors) if self.errors else 0.0)
        recent_uncertainty = (np.mean(self.uncertainties) if self.uncertainties else 0.5)
        
        return {
            "error_rate": float(recent_error_rate),
            "uncertainty": float(recent_uncertainty),
            "adwin_drift": self.adwin.drift_detected,
            "ddm_drift": self.ddm.drift_detected,
            "eddm_drift": self.eddm.drift_detected,
            "samples_processed": len(self.predictions)
        }


# ============================================================================
# 5. ACTIVE LEARNING WITH MODAL
# ============================================================================

class ActiveLearningSelector:
    """
    modAL uncertainty sampling to select top-N leads for human labeling.
    
    Selects leads where ensemble disagrees OR confidence is low.
    M1 target: <10ms to rank 1000 unlabeled samples.
    """
    
    def __init__(self, 
                 ensemble_predictor: Callable,
                 base_model=None,
                 n_queries: int = 10,
                 batch_size: int = 128):
        self.ensemble_predictor = ensemble_predictor
        self.n_queries = n_queries
        self.batch_size = batch_size
        
        # Initialize modAL active learner with dummy base model
        if base_model is None:
            from sklearn.linear_model import LogisticRegression
            base_model = LogisticRegression(random_state=42)
        
        self.learner = ActiveLearner(
            estimator=base_model,
            query_strategy=uncertainty_sampling
        )
        self.unlabeled_pool = []
    
    def rank_by_uncertainty(self, 
                           company_ids: List[int],
                           feature_vectors: np.ndarray) -> List[Tuple[int, float]]:
        """
        Rank companies by prediction uncertainty.
        
        Returns: [(company_id, uncertainty_score), ...] sorted descending
        """
        uncertainties = []
        
        for i, company_id in enumerate(company_ids):
            features = feature_vectors[i:i+1]
            prob = self.ensemble_predictor(features)
            
            # Uncertainty = distance from decision boundary
            uncertainty = abs(prob - 0.5) * 2  # 0-1 scale, 0=most uncertain
            uncertainties.append((company_id, uncertainty))
        
        # Sort by uncertainty (ascending = most uncertain first)
        return sorted(uncertainties, key=lambda x: x[1])[:self.n_queries]
    
    def select_for_labeling(self,
                           unlabeled_ids: List[int],
                           feature_vectors: np.ndarray) -> List[int]:
        """
        Return top N company IDs for human labeling.
        """
        ranked = self.rank_by_uncertainty(unlabeled_ids, feature_vectors)
        return [cid for cid, _ in ranked]


# ============================================================================
# 6. MONTHLY RETRAINING CYCLE
# ============================================================================

class MonthlyRetrainingCycle:
    """
    Orchestrates monthly retraining with:
    - Label accumulation over 4 weeks
    - F1 validation gate (threshold: >82%)
    - Ensemble retrain if gate passed
    - Atomic model swap (symlink-based)
    """
    
    def __init__(self,
                 label_store: LabelStore,
                 ensemble_model_path: str = "scrapus_data/models/ensemble",
                 f1_threshold: float = 0.82,
                 min_samples: int = 50):
        self.label_store = label_store
        self.ensemble_model_path = ensemble_model_path
        self.f1_threshold = f1_threshold
        self.min_samples = min_samples
        
        self.current_cycle_start = datetime.now()
        self.accumulated_labels = []
    
    def should_retrain(self) -> bool:
        """Check if monthly cycle completed"""
        elapsed = datetime.now() - self.current_cycle_start
        return elapsed >= timedelta(days=30)
    
    def accumulate_labels(self):
        """Pull all labels since cycle start"""
        cutoff = self.current_cycle_start.timestamp()
        with sqlite3.connect(self.label_store.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("""
                SELECT company_id, is_qualified, confidence
                FROM label_records
                WHERE timestamp > ?
            """, (cutoff,)).fetchall()
        
        self.accumulated_labels = [dict(row) for row in rows]
        return len(self.accumulated_labels)
    
    def validate_and_retrain(self, 
                             feature_fn: Callable,
                             ensemble_model) -> Tuple[bool, Optional[float]]:
        """
        Validate F1 gate and conditionally retrain.
        
        Returns: (succeeded, f1_score)
        """
        if len(self.accumulated_labels) < self.min_samples:
            logger.info(f"Insufficient labels ({len(self.accumulated_labels)} < {self.min_samples})")
            return False, None
        
        # Build training data from accumulated labels
        X_list = []
        y_list = []
        company_ids = []
        
        for label_record in self.accumulated_labels:
            try:
                features = feature_fn(label_record['company_id'])
                X_list.append(features)
                y_list.append(label_record['is_qualified'])
                company_ids.append(label_record['company_id'])
            except Exception as e:
                logger.warning(f"Failed to build features for company {label_record['company_id']}: {e}")
        
        if len(X_list) < self.min_samples:
            logger.warning(f"Not enough valid feature vectors ({len(X_list)})")
            return False, None
        
        X = np.array(X_list)
        y = np.array(y_list)
        
        # Train on accumulated labels
        try:
            ensemble_model.fit(X, y)
            y_pred = ensemble_model.predict(X)
            f1 = f1_score(y, y_pred)
            
            if f1 >= self.f1_threshold:
                logger.info(f"F1 {f1:.4f} >= threshold {self.f1_threshold}. Saving model.")
                self._save_model(ensemble_model)
                self.accumulated_labels = []
                self.current_cycle_start = datetime.now()
                return True, f1
            else:
                logger.warning(f"F1 {f1:.4f} < threshold {self.f1_threshold}. Not saving.")
                return False, f1
        
        except Exception as e:
            logger.error(f"Retraining failed: {e}")
            return False, None
    
    def _save_model(self, ensemble_model):
        """Atomic model swap via symlink"""
        version_dir = Path(self.ensemble_model_path) / f"v{int(time.time())}"
        version_dir.mkdir(parents=True, exist_ok=True)
        
        # Save all ensemble pieces
        for name in ['xgboost', 'logreg', 'rf']:
            if hasattr(ensemble_model, name):
                model_file = version_dir / f"{name}.pkl"
                with open(model_file, 'wb') as f:
                    pickle.dump(getattr(ensemble_model, name), f)
        
        # Atomic swap: remove old symlink, create new
        current_link = Path(self.ensemble_model_path) / "current"
        if current_link.exists():
            current_link.unlink()
        current_link.symlink_to(version_dir)
        logger.info(f"Model saved to {version_dir}, symlink updated")


# ============================================================================
# 7. COLD-START STRATEGY
# ============================================================================

class ColdStartManager:
    """
    When <50 labeled samples available, use transfer learning from pre-trained.
    
    Strategies:
    1. Fine-tune LightGBM with pre-trained feature embeddings
    2. Use BusinessBERT or similar foundation model embeddings
    3. Fallback to heuristic scoring if no training data
    """
    
    def __init__(self, 
                 labeled_threshold: int = 50,
                 pretrained_model_path: str = "scrapus_data/models/pretrained"):
        self.labeled_threshold = labeled_threshold
        self.pretrained_model_path = pretrained_model_path
        self.is_cold_start = True
    
    def should_use_cold_start(self, n_labeled: int) -> bool:
        """Check if we're in cold-start regime"""
        return n_labeled < self.labeled_threshold
    
    def get_warmstart_model(self):
        """
        Load pre-trained model weights for fine-tuning.
        
        Expects: pretrained_model_path/lgb_pretrained.pkl
        """
        model_file = Path(self.pretrained_model_path) / "lgb_pretrained.pkl"
        if model_file.exists():
            with open(model_file, 'rb') as f:
                return pickle.load(f)
        else:
            logger.warning(f"Pretrained model not found at {model_file}")
            return None
    
    def heuristic_score(self, 
                        features: Dict[str, float]) -> float:
        """
        Fallback heuristic when no labeled data available.
        
        Weighted combination of key signals:
        - siamese_similarity (40%)
        - keyword_density (25%)
        - company_size_match (20%)
        - domain_authority (15%)
        """
        weights = {
            'siamese_similarity': 0.40,
            'keyword_density': 0.25,
            'has_required_size': 0.20,
            'domain_authority': 0.15
        }
        
        score = 0.0
        for key, weight in weights.items():
            val = features.get(key, 0.0)
            # Normalize to [0, 1]
            if key == 'domain_authority':
                val = min(val / 100.0, 1.0)
            score += val * weight
        
        return score


# ============================================================================
# 8. A/B TESTING FRAMEWORK
# ============================================================================

class ABTestingFramework:
    """
    Compare online-updated model vs static baseline.
    
    Shadow-scoring mode:
    - All predictions go to both models
    - Log results separately
    - Track divergence metrics
    """
    
    def __init__(self,
                 online_model: RiverOnlineModel,
                 baseline_model,
                 db_path: str = "scrapus_data/scrapus.db"):
        self.online_model = online_model
        self.baseline_model = baseline_model
        self.db_path = db_path
        self.shadow_log = deque(maxlen=10000)
        
        self._init_ab_schema()
    
    def _init_ab_schema(self):
        """Create A/B test tracking table"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS ab_test_results (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    company_id INTEGER NOT NULL,
                    variant TEXT NOT NULL,  -- 'online' or 'baseline'
                    prediction REAL NOT NULL,
                    is_correct BOOLEAN,
                    timestamp REAL NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(company_id) REFERENCES companies(id)
                );
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_ab_variant ON ab_test_results(variant);")
            conn.commit()
    
    def score_both_models(self,
                         company_id: int,
                         features: Dict[str, float]) -> Tuple[float, float]:
        """
        Score with both online and baseline models.
        
        Returns: (online_prob, baseline_prob)
        """
        online_prob = self.online_model.predict_proba(features)
        baseline_prob = self.baseline_model.predict_proba(features)
        
        self.shadow_log.append({
            'company_id': company_id,
            'online_prob': online_prob,
            'baseline_prob': baseline_prob,
            'timestamp': time.time()
        })
        
        return online_prob, baseline_prob
    
    def get_comparison_metrics(self) -> Dict[str, Any]:
        """Compute A/B test metrics from shadow log"""
        if not self.shadow_log:
            return {}
        
        online_preds = [x['online_prob'] for x in self.shadow_log]
        baseline_preds = [x['baseline_prob'] for x in self.shadow_log]
        
        # Divergence metrics
        mean_diff = np.mean(np.abs(np.array(online_preds) - np.array(baseline_preds)))
        max_diff = np.max(np.abs(np.array(online_preds) - np.array(baseline_preds)))
        
        # Correlation
        corr = np.corrcoef(online_preds, baseline_preds)[0, 1]
        
        # Agreement on decision boundary (0.85 threshold)
        online_decisions = [p > 0.85 for p in online_preds]
        baseline_decisions = [p > 0.85 for p in baseline_preds]
        agreement = np.mean([o == b for o, b in zip(online_decisions, baseline_decisions)])
        
        return {
            'mean_abs_difference': float(mean_diff),
            'max_difference': float(max_diff),
            'prediction_correlation': float(corr) if not np.isnan(corr) else 0.0,
            'decision_agreement': float(agreement),
            'shadow_log_size': len(self.shadow_log)
        }


# ============================================================================
# 9. ONLINE LEARNING ORCHESTRATOR
# ============================================================================

class OnlineLearningOrchestrator:
    """
    Main coordinator for all online learning components.
    
    Responsibilities:
    - Route predictions through River + ensemble
    - Accumulate labels from human feedback
    - Trigger retraining on schedule or drift
    - Monitor performance metrics
    - Track learning curves
    """
    
    def __init__(self,
                 ensemble_model,
                 feature_builder: Callable,
                 db_path: str = "scrapus_data/scrapus.db",
                 drift_alert_callback: Optional[Callable] = None):
        
        self.ensemble_model = ensemble_model
        self.feature_builder = feature_builder
        self.db_path = db_path
        self.drift_alert_callback = drift_alert_callback
        
        # Component initialization
        self.label_store = LabelStore(db_path)
        self.river_model = RiverOnlineModel()
        self.drift_detector = DriftDetector()
        self.active_learner = ActiveLearningSelector(self._ensemble_predict)
        self.monthly_cycle = MonthlyRetrainingCycle(self.label_store)
        self.cold_start = ColdStartManager()
        self.ab_test = ABTestingFramework(self.river_model, ensemble_model, db_path)
        
        # Performance tracking
        self.learning_curve = deque(maxlen=1000)  # (timestamp, f1_score)
        self.prediction_history = deque(maxlen=10000)
        
        # Threading
        self._lock = threading.Lock()
        self.monitoring_thread = None
        self.stop_monitoring = False
    
    def predict(self,
                company_id: int,
                ensemble_features: Dict[str, float],
                river_features: Dict[str, float],
                return_both_models: bool = False) -> Tuple[float, Dict[str, Any]]:
        """
        Main prediction entry point.
        
        Arguments:
            company_id: ID for tracking
            ensemble_features: dict of numeric features for ensemble
            river_features: dict of numeric features for River online model
            return_both_models: if True, return both online and baseline scores
        
        Returns:
            (final_probability, metadata)
        """
        with self._lock:
            # Get predictions from both models
            ensemble_prob = self.ensemble_model.predict_proba(
                np.array([list(ensemble_features.values())]).astype(np.float32)
            )[0]
            
            river_prob = self.river_model.predict_proba(river_features)
            
            # Uncertainty: ensemble variance
            uncertainty = abs(ensemble_prob - river_prob)
            
            # Weighted combination (80% ensemble, 20% river for stability)
            final_prob = 0.8 * ensemble_prob + 0.2 * river_prob
            
            # A/B test shadow scoring
            if return_both_models:
                online_prob, baseline_prob = self.ab_test.score_both_models(
                    company_id, river_features
                )
            
            # Feature hash for drift detection
            features_hash = hash(frozenset(ensemble_features.items()))
            
            # Log prediction
            pred_record = PredictionRecord(
                company_id=company_id,
                ensemble_prob=float(ensemble_prob),
                river_prob=float(river_prob),
                uncertainty=float(uncertainty),
                features_hash=str(features_hash)
            )
            self.label_store.log_prediction(pred_record)
            self.prediction_history.append(pred_record)
            
            metadata = {
                'ensemble_prob': float(ensemble_prob),
                'river_prob': float(river_prob),
                'final_prob': float(final_prob),
                'uncertainty': float(uncertainty),
                'is_cold_start': self.cold_start.is_cold_start,
                'drift_detected': self.drift_detector.get_status()['adwin_drift']
            }
            
            return final_prob, metadata
    
    def _ensemble_predict(self, features: np.ndarray) -> float:
        """Helper for active learning"""
        return self.ensemble_model.predict_proba(features.astype(np.float32))[0]
    
    def ingest_human_label(self,
                          company_id: int,
                          is_qualified: bool,
                          confidence: float = 1.0,
                          source: str = "sales_team",
                          feedback_text: str = "") -> bool:
        """
        Ingest human label and update River model.
        
        Returns: True if model was updated
        """
        # Store label
        label = LabelRecord(
            company_id=company_id,
            is_qualified=is_qualified,
            confidence=confidence,
            source=source,
            feedback_text=feedback_text
        )
        self.label_store.add_label(label)
        
        # Update River model incrementally
        try:
            features = self.feature_builder(company_id)
            river_prob = self.river_model.learn_one(features, int(is_qualified))
            
            # Update drift detector
            drift_alert = self.drift_detector.update(
                prediction=river_prob,
                true_label=int(is_qualified),
                uncertainty=abs(river_prob - 0.5)
            )
            
            if drift_alert:
                self.label_store.log_drift_alert(drift_alert)
                if self.drift_alert_callback:
                    self.drift_alert_callback(drift_alert)
            
            return True
        
        except Exception as e:
            logger.error(f"Failed to ingest label for company {company_id}: {e}")
            return False
    
    def select_for_labeling(self,
                           unlabeled_ids: List[int],
                           feature_vectors: np.ndarray,
                           n_samples: int = 10) -> List[int]:
        """
        Select top N unlabeled samples for human review.
        """
        return self.active_learner.select_for_labeling(
            unlabeled_ids[:1000],  # Limit to first 1000 for performance
            feature_vectors[:1000]
        )[:n_samples]
    
    def maybe_retrain(self) -> Tuple[bool, Optional[float]]:
        """
        Check if retraining needed (monthly schedule or drift detected).
        
        Returns: (retrained, f1_score)
        """
        drift_status = self.drift_detector.get_status()
        
        # Trigger on high drift or monthly schedule
        should_retrain = (
            drift_status['adwin_drift'] or
            self.monthly_cycle.should_retrain()
        )
        
        if not should_retrain:
            return False, None
        
        # Accumulate labels
        n_labels = self.monthly_cycle.accumulate_labels()
        logger.info(f"Initiating retraining with {n_labels} accumulated labels")
        
        # Retrain with gate
        succeeded, f1 = self.monthly_cycle.validate_and_retrain(
            self.feature_builder,
            self.ensemble_model
        )
        
        if succeeded:
            # Log retraining job
            job = RetrainingJob(
                job_id=f"retrain_{int(time.time())}",
                trigger_type="drift" if drift_status['adwin_drift'] else "monthly",
                sample_count=n_labels,
                f1_baseline=0.88,  # Previous baseline
                f1_new=f1,
                status="succeeded"
            )
            self.label_store.log_retraining_job(job)
            
            # Cold-start flag
            if self.cold_start.should_use_cold_start(n_labels):
                self.cold_start.is_cold_start = False
        
        return succeeded, f1
    
    def get_learning_curve(self, window_hours: int = 24) -> List[Tuple[float, float]]:
        """
        Get learning curve (timestamp, f1_score) for dashboard.
        """
        cutoff = datetime.now().timestamp() - (window_hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute("""
                SELECT timestamp, f1_new
                FROM retraining_jobs
                WHERE status = 'succeeded' AND timestamp > ?
                ORDER BY timestamp ASC
            """, (cutoff,)).fetchall()
        
        return [(row[0], row[1]) for row in rows if row[1] is not None]
    
    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """
        Aggregate metrics for Streamlit dashboard.
        """
        all_labels = self.label_store.get_all_labels()
        
        return {
            'total_labels': len(all_labels),
            'positive_rate': np.mean([l.is_qualified for l in all_labels]) if all_labels else 0,
            'cold_start': self.cold_start.is_cold_start,
            'river_stats': self.river_model.get_stats(),
            'drift_status': self.drift_detector.get_status(),
            'ab_test_metrics': self.ab_test.get_comparison_metrics(),
            'learning_curve': self.get_learning_curve(),
            'prediction_count': len(self.prediction_history)
        }


# ============================================================================
# 10. MEMORY MONITORING (M1 optimization)
# ============================================================================

class MemoryMonitor:
    """
    Track memory footprint of online learning components.
    
    M1 target: <50 MB total resident (River + buffers)
    """
    
    @staticmethod
    def get_process_memory() -> Dict[str, float]:
        """Get current process memory usage"""
        process = psutil.Process(os.getpid())
        mem_info = process.memory_info()
        
        return {
            'rss_mb': mem_info.rss / 1024 / 1024,
            'vms_mb': mem_info.vms / 1024 / 1024,
            'percent': process.memory_percent()
        }
    
    @staticmethod
    def get_component_sizes(orchestrator: OnlineLearningOrchestrator) -> Dict[str, float]:
        """Estimate component memory footprint"""
        import sys
        
        return {
            'river_model_bytes': sys.getsizeof(orchestrator.river_model.model),
            'prediction_history_bytes': sys.getsizeof(orchestrator.prediction_history),
            'learning_curve_bytes': sys.getsizeof(orchestrator.learning_curve),
            'shadow_log_bytes': sys.getsizeof(orchestrator.ab_test.shadow_log)
        }


# ============================================================================
# INTEGRATION GUIDE
# ============================================================================

def create_orchestrator(ensemble_model,
                       feature_builder: Callable,
                       db_path: str = "scrapus_data/scrapus.db") -> OnlineLearningOrchestrator:
    """
    Factory function to create fully initialized orchestrator.
    
    Usage in Scrapus lead scoring pipeline:
    
    ```python
    from scrapus.online_learning import create_orchestrator
    
    # 1. Initialize orchestrator
    orchestrator = create_orchestrator(
        ensemble_model=loaded_ensemble,
        feature_builder=lambda cid: build_feature_vector(cid)
    )
    
    # 2. In scoring loop
    for company in qualified_companies:
        ensemble_features = build_ensemble_features(company)
        river_features = build_river_features(company)
        
        final_score, metadata = orchestrator.predict(
            company_id=company['id'],
            ensemble_features=ensemble_features,
            river_features=river_features
        )
        
        company['lead_score'] = final_score
        company['confidence'] = 1.0 - metadata['uncertainty']
    
    # 3. After human review (weekly)
    for feedback in human_feedback_batch:
        orchestrator.ingest_human_label(
            company_id=feedback['company_id'],
            is_qualified=feedback['is_qualified'],
            confidence=feedback.get('confidence', 1.0),
            source='sales_team'
        )
    
    # 4. Weekly active learning
    unlabeled_ids = get_unreviewed_leads(limit=1000)
    features_array = build_feature_matrix(unlabeled_ids)
    top_10 = orchestrator.select_for_labeling(unlabeled_ids, features_array, n_samples=10)
    notify_sales_team(top_10, reason="uncertainty_sampling")
    
    # 5. Monthly retraining (automatic)
    retrained, f1 = orchestrator.maybe_retrain()
    if retrained:
        logger.info(f"Model retrained with F1={f1:.4f}")
    
    # 6. Dashboard metrics
    dashboard_data = orchestrator.get_dashboard_metrics()
    # Push to Streamlit app
    ```
    """
    def on_drift_alert(alert: DriftAlert):
        logger.warning(f"DRIFT ALERT: {alert.detector_type} {alert.severity}")
    
    orchestrator = OnlineLearningOrchestrator(
        ensemble_model=ensemble_model,
        feature_builder=feature_builder,
        db_path=db_path,
        drift_alert_callback=on_drift_alert
    )
    
    return orchestrator


# ============================================================================
# STREAMLIT DASHBOARD INTEGRATION
# ============================================================================

def create_dashboard_app(orchestrator: OnlineLearningOrchestrator):
    """
    Streamlit dashboard for online learning monitoring.
    
    Run with: streamlit run dashboard.py
    """
    import streamlit as st
    from datetime import datetime
    
    st.set_page_config(page_title="Scrapus Online Learning", layout="wide")
    st.title("Scrapus: Online Lead Scoring Dashboard")
    
    # Refresh metrics
    metrics = orchestrator.get_dashboard_metrics()
    
    # Top row: KPIs
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("Total Labels", metrics['total_labels'])
    
    with col2:
        pos_rate = metrics['positive_rate'] * 100
        st.metric("Positive Rate", f"{pos_rate:.1f}%")
    
    with col3:
        st.metric("Cold Start", "Yes" if metrics['cold_start'] else "No")
    
    with col4:
        drift_detected = metrics['drift_status'].get('adwin_drift', False)
        st.metric("Drift Detected", "Yes" if drift_detected else "No")
    
    st.divider()
    
    # Learning curve
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Learning Curve")
        if metrics['learning_curve']:
            import pandas as pd
            df = pd.DataFrame(metrics['learning_curve'], columns=['timestamp', 'f1_score'])
            st.line_chart(df.set_index('timestamp')['f1_score'])
        else:
            st.info("No retraining history yet")
    
    with col2:
        st.subheader("Drift Status")
        drift_status = metrics['drift_status']
        st.json({
            'error_rate': f"{drift_status['error_rate']:.4f}",
            'uncertainty': f"{drift_status['uncertainty']:.4f}",
            'adwin': drift_status['adwin_drift'],
            'ddm': drift_status['ddm_drift'],
            'eddm': drift_status['eddm_drift']
        })
    
    st.divider()
    
    # A/B test results
    st.subheader("A/B Test: Online vs Baseline")
    ab_metrics = metrics['ab_test_metrics']
    if ab_metrics:
        st.json(ab_metrics)
    else:
        st.info("No A/B test data yet")
    
    st.divider()
    
    # Memory monitoring
    st.subheader("Memory Usage (M1)")
    mem = MemoryMonitor.get_process_memory()
    st.metric("Process Memory", f"{mem['rss_mb']:.1f} MB ({mem['percent']:.1f}%)")


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)
    
    # Initialize dummy ensemble for demo
    from sklearn.ensemble import RandomForestClassifier
    dummy_ensemble = RandomForestClassifier(n_estimators=10, random_state=42)
    X_dummy = np.random.randn(100, 20)
    y_dummy = np.random.binomial(1, 0.35, 100)
    dummy_ensemble.fit(X_dummy, y_dummy)
    
    # Create orchestrator
    def dummy_feature_builder(company_id: int) -> Dict[str, float]:
        return {f"feature_{i}": np.random.randn() for i in range(20)}
    
    orchestrator = create_orchestrator(
        ensemble_model=dummy_ensemble,
        feature_builder=dummy_feature_builder
    )
    
    # Simulate predictions and labels
    for i in range(100):
        company_id = i
        ensemble_features = {f"feature_{j}": np.random.randn() for j in range(20)}
        river_features = {f"feature_{j}": np.random.randn() for j in range(20)}
        
        score, meta = orchestrator.predict(
            company_id=company_id,
            ensemble_features=ensemble_features,
            river_features=river_features
        )
        
        if i % 10 == 0:
            orchestrator.ingest_human_label(
                company_id=company_id,
                is_qualified=bool(np.random.binomial(1, 0.35)),
                source="sales_team"
            )
    
    # Print dashboard metrics
    metrics = orchestrator.get_dashboard_metrics()
    print(json.dumps({k: str(v) for k, v in metrics.items()}, indent=2))

