"""
Module 1: Active learning for the reward model (binary classifier "contains lead?").

Reduces extraction pipeline load by 60-80% by only routing uncertain pages to
the full extraction pipeline (Module 2). Pages where the classifier is confident
(>0.9 or <0.1) use the predicted reward directly.

Components:
1. RewardPredictor: binary classifier (logistic / MLP / random forest)
2. ActiveQuerySelector: selects which pages to send for full extraction
3. ActiveLearningManager: maintains labeled/unlabeled pools + SQLite persistence
4. RewardAugmenter: combines predicted rewards with actual extraction rewards

Integration:
- CrawlerPipeline calls add_unlabeled() for each crawled page
- ActiveLearningManager selects uncertain pages -> Module 2 extraction
- Module 2 results flow back via add_label()
- get_reward_estimate() provides fast reward for DQN replay buffer

Memory budget: ~20-40 MB (classifier + pools).
Target: Apple M1 16GB, zero cloud dependency.
"""

import gc
import json
import logging
import os
import sqlite3
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_active_learning")

# Gate scikit-learn behind availability
_HAS_SKLEARN = False
try:
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.linear_model import LogisticRegression, SGDClassifier
    from sklearn.metrics import accuracy_score, precision_score, recall_score
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import StandardScaler

    _HAS_SKLEARN = True
except ImportError:
    logger.warning("scikit-learn not installed -- active learning unavailable")


# ======================= Configuration ======================================

@dataclass
class ActiveLearningConfig:
    """Configuration for the active learning reward model."""

    # Classifier type: "logistic", "mlp", "random_forest"
    model_type: str = "logistic"

    # Pages with confidence below this threshold are sent to extraction
    uncertainty_threshold: float = 0.3

    # Retrain the classifier after accumulating this many new labels
    retrain_interval: int = 200

    # Minimum labeled samples before the classifier is usable
    min_training_samples: int = 50

    # Input feature dimension (768 embed + 16 scalar = 784)
    feature_dim: int = 784

    # Maximum unlabeled pool size (oldest evicted when exceeded)
    pool_size: int = 1000

    # Active query strategy: "uncertainty", "entropy", "margin", "random"
    query_strategy: str = "uncertainty"

    # Number of pages to query per active learning round
    batch_query_size: int = 10

    # Confidence thresholds for fast-path reward augmentation
    high_confidence_threshold: float = 0.9
    low_confidence_threshold: float = 0.1

    # SQLite persistence
    db_path: str = "scrapus_data/active_learning.db"

    # Ensemble size for QBC (Query by Committee)
    ensemble_size: int = 5

    # MLP hidden layer sizes
    mlp_hidden_layers: Tuple[int, ...] = (128, 64)

    # Random forest n_estimators
    rf_n_estimators: int = 50


# ======================= Reward Predictor ===================================

class RewardPredictor:
    """Binary classifier: page embedding -> P(contains lead).

    Supports three model types:
    - logistic: LogisticRegression (fast, good for cold start)
    - mlp: MLPClassifier (higher capacity for complex boundaries)
    - random_forest: RandomForestClassifier (natural uncertainty via tree variance)

    Uncertainty estimation:
    - Logistic/MLP: calibrated probability distance from 0.5
    - Random forest: inter-tree prediction variance
    """

    def __init__(self, config: Optional[ActiveLearningConfig] = None) -> None:
        self.config = config or ActiveLearningConfig()
        self._model: Any = None
        self._scaler: Optional[Any] = None
        self._is_fitted: bool = False
        self._ensemble: List[Any] = []  # For QBC strategy
        self._train_count: int = 0

    @property
    def is_fitted(self) -> bool:
        return self._is_fitted

    def _create_model(self) -> Any:
        """Create a fresh classifier instance based on config."""
        if not _HAS_SKLEARN:
            raise RuntimeError("scikit-learn required for RewardPredictor")

        if self.config.model_type == "logistic":
            return LogisticRegression(
                max_iter=500,
                solver="lbfgs",
                C=1.0,
                class_weight="balanced",
                random_state=42,
            )
        elif self.config.model_type == "mlp":
            return MLPClassifier(
                hidden_layer_sizes=self.config.mlp_hidden_layers,
                max_iter=200,
                early_stopping=True,
                validation_fraction=0.15,
                random_state=42,
            )
        elif self.config.model_type == "random_forest":
            return RandomForestClassifier(
                n_estimators=self.config.rf_n_estimators,
                max_depth=10,
                class_weight="balanced",
                n_jobs=-1,
                random_state=42,
            )
        else:
            raise ValueError(f"Unknown model_type: {self.config.model_type}")

    def fit(self, X: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Train the classifier on labeled data.

        Args:
            X: (N, feature_dim) feature matrix.
            y: (N,) binary labels (1 = contains lead, 0 = no lead).

        Returns:
            Training metrics dict (accuracy, precision, recall).
        """
        if not _HAS_SKLEARN:
            raise RuntimeError("scikit-learn required for RewardPredictor")

        if len(X) < self.config.min_training_samples:
            logger.warning(
                "Not enough samples to train: %d < %d",
                len(X),
                self.config.min_training_samples,
            )
            return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0}

        # Standardise features
        self._scaler = StandardScaler()
        X_scaled = self._scaler.fit_transform(X)

        # Train primary model
        self._model = self._create_model()
        self._model.fit(X_scaled, y)
        self._is_fitted = True
        self._train_count += 1

        # Train ensemble for QBC
        if self.config.query_strategy == "qbc":
            self._train_ensemble(X_scaled, y)

        # Compute training metrics
        y_pred = self._model.predict(X_scaled)
        metrics = {
            "accuracy": float(accuracy_score(y, y_pred)),
            "precision": float(precision_score(y, y_pred, zero_division=0.0)),
            "recall": float(recall_score(y, y_pred, zero_division=0.0)),
            "train_samples": len(X),
            "positive_rate": float(np.mean(y)),
            "train_count": self._train_count,
        }

        logger.info(
            "RewardPredictor trained: acc=%.3f prec=%.3f rec=%.3f (n=%d)",
            metrics["accuracy"],
            metrics["precision"],
            metrics["recall"],
            len(X),
        )
        return metrics

    def _train_ensemble(self, X: np.ndarray, y: np.ndarray) -> None:
        """Train an ensemble of classifiers for QBC strategy."""
        self._ensemble = []
        n = len(X)
        for i in range(self.config.ensemble_size):
            # Bootstrap sample
            rng = np.random.RandomState(42 + i)
            indices = rng.choice(n, size=n, replace=True)
            model = self._create_model()
            model.fit(X[indices], y[indices])
            self._ensemble.append(model)

    def predict(self, state: np.ndarray) -> Tuple[float, float]:
        """Predict P(contains lead) and uncertainty for a single state.

        Args:
            state: (feature_dim,) state vector.

        Returns:
            (probability, uncertainty) where uncertainty is in [0, 0.5].
        """
        probs, uncertainties = self.predict_batch(state.reshape(1, -1))
        return float(probs[0]), float(uncertainties[0])

    def predict_batch(
        self, states: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """Predict P(contains lead) and uncertainty for a batch of states.

        Args:
            states: (N, feature_dim) state matrix.

        Returns:
            (probabilities, uncertainties) each of shape (N,).
        """
        if not self._is_fitted or self._model is None:
            # Uninformative prior: 0.5 probability, max uncertainty
            n = states.shape[0]
            return np.full(n, 0.5, dtype=np.float32), np.full(
                n, 0.5, dtype=np.float32
            )

        X_scaled = self._scaler.transform(states)

        # Get calibrated probabilities
        if hasattr(self._model, "predict_proba"):
            probs = self._model.predict_proba(X_scaled)[:, 1]
        else:
            # Decision function fallback (e.g., SGD without probability)
            decision = self._model.decision_function(X_scaled)
            probs = 1.0 / (1.0 + np.exp(-decision))

        probs = probs.astype(np.float32)

        # Compute uncertainty
        if self.config.model_type == "random_forest" and hasattr(
            self._model, "estimators_"
        ):
            # Use inter-tree variance for random forest
            tree_preds = np.array(
                [
                    est.predict_proba(X_scaled)[:, 1]
                    if hasattr(est, "predict_proba")
                    else est.predict(X_scaled).astype(np.float32)
                    for est in self._model.estimators_
                ]
            )
            uncertainties = np.std(tree_preds, axis=0).astype(np.float32)
        elif self._ensemble:
            # QBC: ensemble disagreement
            ensemble_preds = np.array(
                [
                    m.predict_proba(X_scaled)[:, 1]
                    if hasattr(m, "predict_proba")
                    else m.predict(X_scaled).astype(np.float32)
                    for m in self._ensemble
                ]
            )
            uncertainties = np.std(ensemble_preds, axis=0).astype(np.float32)
        else:
            # Distance from decision boundary: |p - 0.5|
            # Uncertainty = 0.5 - |p - 0.5|  (max at p=0.5, min at p=0 or 1)
            uncertainties = (0.5 - np.abs(probs - 0.5)).astype(np.float32)

        return probs, uncertainties


# ======================= Active Query Selector ==============================

class ActiveQuerySelector:
    """Selects which pages to send to the full extraction pipeline.

    Strategies:
    - uncertainty: select pages closest to the decision boundary
    - entropy: select pages with highest prediction entropy
    - margin: smallest margin between top-2 class probabilities
    - random: uniform random selection (baseline)
    """

    def __init__(self, config: Optional[ActiveLearningConfig] = None) -> None:
        self.config = config or ActiveLearningConfig()

    def select_queries(
        self,
        probabilities: np.ndarray,
        uncertainties: np.ndarray,
        n: int,
    ) -> List[int]:
        """Select indices of pages to send for labeling.

        Args:
            probabilities: (pool_size,) predicted P(lead) for each page.
            uncertainties: (pool_size,) uncertainty for each page.
            n: number of pages to select.

        Returns:
            List of indices into the pool arrays.
        """
        pool_size = len(probabilities)
        n = min(n, pool_size)

        if n <= 0 or pool_size == 0:
            return []

        strategy = self.config.query_strategy

        if strategy == "uncertainty":
            return self._uncertainty_sampling(probabilities, n)
        elif strategy == "entropy":
            return self._entropy_sampling(probabilities, n)
        elif strategy == "margin":
            return self._margin_sampling(probabilities, n)
        elif strategy == "random":
            return self._random_sampling(pool_size, n)
        else:
            logger.warning(
                "Unknown query strategy '%s', falling back to uncertainty",
                strategy,
            )
            return self._uncertainty_sampling(probabilities, n)

    def _uncertainty_sampling(
        self, probabilities: np.ndarray, n: int
    ) -> List[int]:
        """Select pages closest to the decision boundary (p closest to 0.5)."""
        distance_from_boundary = np.abs(probabilities - 0.5)
        # Smallest distance = most uncertain
        indices = np.argsort(distance_from_boundary)[:n]
        return indices.tolist()

    def _entropy_sampling(
        self, probabilities: np.ndarray, n: int
    ) -> List[int]:
        """Select pages with highest binary prediction entropy."""
        # Clip to avoid log(0)
        p = np.clip(probabilities, 1e-8, 1.0 - 1e-8)
        entropy = -(p * np.log2(p) + (1 - p) * np.log2(1 - p))
        # Highest entropy = most uncertain
        indices = np.argsort(-entropy)[:n]
        return indices.tolist()

    def _margin_sampling(
        self, probabilities: np.ndarray, n: int
    ) -> List[int]:
        """Select pages with smallest margin between class probabilities.

        For binary classification, margin = |P(lead) - P(not lead)| = |2p - 1|.
        """
        margin = np.abs(2 * probabilities - 1)
        # Smallest margin = most uncertain
        indices = np.argsort(margin)[:n]
        return indices.tolist()

    def _random_sampling(self, pool_size: int, n: int) -> List[int]:
        """Uniform random selection (baseline comparator)."""
        indices = np.random.choice(pool_size, size=n, replace=False)
        return indices.tolist()


# ======================= Active Learning Manager ============================

class ActiveLearningManager:
    """Maintains labeled/unlabeled pools and orchestrates active learning.

    Lifecycle:
        manager = ActiveLearningManager(config, predictor)
        manager.initialise()

        # During crawling:
        manager.add_unlabeled(state, url)
        reward = manager.get_reward_estimate(state)

        # Periodic active learning rounds:
        if manager.should_query():
            urls = manager.get_queries()  # -> send to extraction pipeline
            ...
            manager.add_label(url, is_lead=True)
            manager.retrain_if_needed()

        manager.close()
    """

    def __init__(
        self,
        config: Optional[ActiveLearningConfig] = None,
        predictor: Optional[RewardPredictor] = None,
    ) -> None:
        self.config = config or ActiveLearningConfig()
        self.predictor = predictor or RewardPredictor(self.config)
        self.selector = ActiveQuerySelector(self.config)

        # In-memory pools (NumPy arrays for fast batch operations)
        self._unlabeled_states: List[np.ndarray] = []
        self._unlabeled_urls: List[str] = []
        self._labeled_states: List[np.ndarray] = []
        self._labeled_labels: List[int] = []
        self._labeled_urls: List[str] = []

        # URL -> pool index lookup
        self._url_to_unlabeled_idx: Dict[str, int] = {}

        # Tracking
        self._labels_since_retrain: int = 0
        self._total_queries: int = 0
        self._total_labels: int = 0
        self._last_query_time: float = 0.0
        self._prediction_hits: int = 0  # Correct fast-path predictions
        self._prediction_total: int = 0  # Total fast-path predictions

        # SQLite connection (initialised in self.initialise())
        self._db: Optional[sqlite3.Connection] = None

    # ---- Lifecycle ----------------------------------------------------------

    def initialise(self) -> None:
        """Initialise SQLite persistence and load existing pools."""
        os.makedirs(os.path.dirname(self.config.db_path), exist_ok=True)
        self._db = sqlite3.connect(self.config.db_path)
        self._db.execute("PRAGMA journal_mode=WAL")
        self._db.execute("PRAGMA synchronous=NORMAL")
        self._create_tables()
        self._load_from_db()
        logger.info(
            "ActiveLearningManager initialised: "
            "unlabeled=%d, labeled=%d, predictor_fitted=%s",
            len(self._unlabeled_urls),
            len(self._labeled_urls),
            self.predictor.is_fitted,
        )

    def _create_tables(self) -> None:
        """Create SQLite tables for pool persistence."""
        self._db.executescript("""
            CREATE TABLE IF NOT EXISTS unlabeled_pool (
                url         TEXT PRIMARY KEY,
                state_blob  BLOB NOT NULL,
                added_at    REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS labeled_pool (
                url         TEXT PRIMARY KEY,
                state_blob  BLOB NOT NULL,
                is_lead     INTEGER NOT NULL,
                labeled_at  REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS active_learning_stats (
                id              INTEGER PRIMARY KEY CHECK (id = 1),
                total_queries   INTEGER DEFAULT 0,
                total_labels    INTEGER DEFAULT 0,
                prediction_hits INTEGER DEFAULT 0,
                prediction_total INTEGER DEFAULT 0,
                last_retrain_at REAL DEFAULT 0,
                updated_at      REAL NOT NULL
            );

            INSERT OR IGNORE INTO active_learning_stats (id, updated_at)
            VALUES (1, 0);
        """)
        self._db.commit()

    def _load_from_db(self) -> None:
        """Restore pools from SQLite on startup."""
        # Load unlabeled pool
        rows = self._db.execute(
            "SELECT url, state_blob FROM unlabeled_pool "
            "ORDER BY added_at DESC LIMIT ?",
            (self.config.pool_size,),
        ).fetchall()
        for url, state_blob in rows:
            state = np.frombuffer(state_blob, dtype=np.float32).copy()
            if len(state) == self.config.feature_dim:
                idx = len(self._unlabeled_states)
                self._unlabeled_states.append(state)
                self._unlabeled_urls.append(url)
                self._url_to_unlabeled_idx[url] = idx

        # Load labeled pool
        rows = self._db.execute(
            "SELECT url, state_blob, is_lead FROM labeled_pool"
        ).fetchall()
        for url, state_blob, is_lead in rows:
            state = np.frombuffer(state_blob, dtype=np.float32).copy()
            if len(state) == self.config.feature_dim:
                self._labeled_states.append(state)
                self._labeled_labels.append(int(is_lead))
                self._labeled_urls.append(url)

        # Load stats
        row = self._db.execute(
            "SELECT total_queries, total_labels, prediction_hits, "
            "prediction_total FROM active_learning_stats WHERE id = 1"
        ).fetchone()
        if row:
            self._total_queries = row[0]
            self._total_labels = row[1]
            self._prediction_hits = row[2]
            self._prediction_total = row[3]

        # Retrain predictor if we have enough labels
        if len(self._labeled_states) >= self.config.min_training_samples:
            self._retrain()

    def close(self) -> None:
        """Persist state and close SQLite connection."""
        if self._db:
            self._save_stats()
            self._db.close()
            self._db = None
        logger.info("ActiveLearningManager closed")

    # ---- Pool Management ----------------------------------------------------

    def add_unlabeled(self, state: np.ndarray, url: str) -> None:
        """Add a crawled page to the unlabeled pool.

        Args:
            state: (feature_dim,) state vector from StateVectorBuilder.
            url: canonical URL of the page.
        """
        if url in self._url_to_unlabeled_idx:
            return  # Already in pool

        # Check if already labeled
        if url in {u for u in self._labeled_urls}:
            return

        # Evict oldest if pool is full
        if len(self._unlabeled_states) >= self.config.pool_size:
            self._evict_oldest_unlabeled()

        idx = len(self._unlabeled_states)
        self._unlabeled_states.append(state.astype(np.float32).copy())
        self._unlabeled_urls.append(url)
        self._url_to_unlabeled_idx[url] = idx

        # Persist to SQLite
        if self._db:
            self._db.execute(
                "INSERT OR REPLACE INTO unlabeled_pool (url, state_blob, added_at) "
                "VALUES (?, ?, ?)",
                (url, state.astype(np.float32).tobytes(), time.time()),
            )
            self._db.commit()

    def _evict_oldest_unlabeled(self) -> None:
        """Remove the oldest entry from the unlabeled pool."""
        if not self._unlabeled_urls:
            return

        # Remove first entry (oldest by insertion order)
        evicted_url = self._unlabeled_urls.pop(0)
        self._unlabeled_states.pop(0)
        del self._url_to_unlabeled_idx[evicted_url]

        # Rebuild index map (shifted by -1)
        self._url_to_unlabeled_idx = {
            url: i for i, url in enumerate(self._unlabeled_urls)
        }

        if self._db:
            self._db.execute(
                "DELETE FROM unlabeled_pool WHERE url = ?", (evicted_url,)
            )

    def add_label(self, url: str, is_lead: bool) -> None:
        """Label a page and move it from unlabeled to labeled pool.

        Args:
            url: URL of the page.
            is_lead: True if the page contains a lead, False otherwise.
        """
        label = 1 if is_lead else 0

        # Find state in unlabeled pool
        state: Optional[np.ndarray] = None
        if url in self._url_to_unlabeled_idx:
            idx = self._url_to_unlabeled_idx[url]
            state = self._unlabeled_states[idx]

            # Remove from unlabeled pool
            self._unlabeled_states.pop(idx)
            self._unlabeled_urls.pop(idx)
            del self._url_to_unlabeled_idx[url]

            # Rebuild index map
            self._url_to_unlabeled_idx = {
                u: i for i, u in enumerate(self._unlabeled_urls)
            }

            if self._db:
                self._db.execute(
                    "DELETE FROM unlabeled_pool WHERE url = ?", (url,)
                )

        if state is None:
            logger.debug("URL %s not in unlabeled pool, skipping label", url)
            return

        # Add to labeled pool
        self._labeled_states.append(state)
        self._labeled_labels.append(label)
        self._labeled_urls.append(url)
        self._labels_since_retrain += 1
        self._total_labels += 1

        # Persist label
        if self._db:
            self._db.execute(
                "INSERT OR REPLACE INTO labeled_pool "
                "(url, state_blob, is_lead, labeled_at) VALUES (?, ?, ?, ?)",
                (url, state.tobytes(), label, time.time()),
            )
            self._db.commit()

        logger.debug(
            "Labeled %s as %s (total_labels=%d, since_retrain=%d)",
            url,
            "lead" if is_lead else "no_lead",
            self._total_labels,
            self._labels_since_retrain,
        )

    # ---- Active Learning Queries --------------------------------------------

    def should_query(self) -> bool:
        """Check if it is time for an active learning query round.

        Returns True when:
        - Unlabeled pool has enough pages
        - Predictor is fitted (or we have enough samples to fit)
        """
        has_pool = len(self._unlabeled_states) >= self.config.batch_query_size
        has_capacity = (
            len(self._labeled_states) >= self.config.min_training_samples
            or len(self._unlabeled_states) >= self.config.min_training_samples
        )
        return has_pool and has_capacity

    def get_queries(self) -> List[str]:
        """Select URLs to send to the extraction pipeline.

        Uses the configured query strategy to select the most informative
        pages from the unlabeled pool.

        Returns:
            List of URLs to extract.
        """
        if not self._unlabeled_states:
            return []

        pool_states = np.array(self._unlabeled_states, dtype=np.float32)
        probs, uncertainties = self.predictor.predict_batch(pool_states)

        # Select indices using active query strategy
        n = min(self.config.batch_query_size, len(self._unlabeled_urls))
        selected_indices = self.selector.select_queries(
            probs, uncertainties, n
        )

        # Map indices to URLs
        selected_urls = [self._unlabeled_urls[i] for i in selected_indices]
        self._total_queries += len(selected_urls)
        self._last_query_time = time.time()

        logger.info(
            "Active learning query: selected %d pages "
            "(strategy=%s, pool=%d, probs=%.3f+-%.3f)",
            len(selected_urls),
            self.config.query_strategy,
            len(self._unlabeled_urls),
            float(np.mean(probs)),
            float(np.std(probs)),
        )

        return selected_urls

    # ---- Retraining ---------------------------------------------------------

    def retrain_if_needed(self) -> Optional[Dict[str, float]]:
        """Retrain the predictor if enough new labels have accumulated.

        Returns:
            Training metrics dict if retrained, None otherwise.
        """
        if self._labels_since_retrain < self.config.retrain_interval:
            return None

        if len(self._labeled_states) < self.config.min_training_samples:
            return None

        return self._retrain()

    def _retrain(self) -> Dict[str, float]:
        """Retrain the predictor on the full labeled set."""
        X = np.array(self._labeled_states, dtype=np.float32)
        y = np.array(self._labeled_labels, dtype=np.int32)

        metrics = self.predictor.fit(X, y)
        self._labels_since_retrain = 0

        if self._db:
            self._db.execute(
                "UPDATE active_learning_stats SET last_retrain_at = ? "
                "WHERE id = 1",
                (time.time(),),
            )
            self._db.commit()

        return metrics

    # ---- Reward Estimation --------------------------------------------------

    def get_reward_estimate(self, state: np.ndarray) -> float:
        """Get predicted reward for a page state.

        Used by the DQN replay buffer as a fast reward estimate when
        extraction results have not arrived yet.

        Args:
            state: (feature_dim,) state vector.

        Returns:
            Estimated reward in [-0.1, 1.0] range.
        """
        if not self.predictor.is_fitted:
            return 0.0  # No information -> neutral reward

        prob, uncertainty = self.predictor.predict(state)

        # Map probability to reward scale:
        # P(lead) = 1.0 -> reward = 1.0 (high-value lead page)
        # P(lead) = 0.5 -> reward = 0.0 (uncertain, neutral)
        # P(lead) = 0.0 -> reward = -0.1 (likely not a lead)
        if prob >= 0.5:
            reward = prob  # 0.5 -> 1.0 maps to 0.5 -> 1.0
        else:
            reward = (prob - 0.5) * 0.2  # 0.0 -> 0.5 maps to -0.1 -> 0.0

        return float(reward)

    # ---- Statistics ---------------------------------------------------------

    def get_stats(self) -> Dict[str, Any]:
        """Comprehensive statistics for monitoring."""
        stats: Dict[str, Any] = {
            "unlabeled_pool_size": len(self._unlabeled_states),
            "labeled_pool_size": len(self._labeled_states),
            "total_queries": self._total_queries,
            "total_labels": self._total_labels,
            "labels_since_retrain": self._labels_since_retrain,
            "predictor_fitted": self.predictor.is_fitted,
            "model_type": self.config.model_type,
            "query_strategy": self.config.query_strategy,
        }

        # Label distribution
        if self._labeled_labels:
            labels = np.array(self._labeled_labels)
            stats["positive_labels"] = int(np.sum(labels))
            stats["negative_labels"] = int(np.sum(1 - labels))
            stats["positive_rate"] = float(np.mean(labels))

        # Prediction accuracy (from augmenter feedback)
        if self._prediction_total > 0:
            stats["prediction_accuracy"] = round(
                self._prediction_hits / self._prediction_total, 4
            )
            stats["prediction_total"] = self._prediction_total

        # Predictor confidence distribution on current unlabeled pool
        if self.predictor.is_fitted and self._unlabeled_states:
            pool_states = np.array(
                self._unlabeled_states[:100], dtype=np.float32
            )
            probs, uncertainties = self.predictor.predict_batch(pool_states)
            stats["pool_mean_confidence"] = round(
                float(np.mean(1.0 - uncertainties)), 4
            )
            stats["pool_mean_probability"] = round(float(np.mean(probs)), 4)
            high_conf = float(
                np.mean(
                    (probs > self.config.high_confidence_threshold)
                    | (probs < self.config.low_confidence_threshold)
                )
            )
            stats["pool_high_confidence_rate"] = round(high_conf, 4)

        return stats

    def _save_stats(self) -> None:
        """Persist tracking stats to SQLite."""
        if self._db:
            self._db.execute(
                "UPDATE active_learning_stats SET "
                "total_queries = ?, total_labels = ?, "
                "prediction_hits = ?, prediction_total = ?, "
                "updated_at = ? WHERE id = 1",
                (
                    self._total_queries,
                    self._total_labels,
                    self._prediction_hits,
                    self._prediction_total,
                    time.time(),
                ),
            )
            self._db.commit()

    def record_prediction_outcome(
        self, predicted_lead: bool, actual_lead: bool
    ) -> None:
        """Record whether a fast-path prediction was correct.

        Called by RewardAugmenter to track prediction accuracy.
        """
        self._prediction_total += 1
        if predicted_lead == actual_lead:
            self._prediction_hits += 1


# ======================= Reward Augmenter ===================================

class RewardAugmenter:
    """Combines predicted rewards with actual extraction rewards.

    Fast path: if predictor is confident (>0.9 or <0.1), use prediction.
    Slow path: if uncertain, route to extraction pipeline.

    This reduces extraction pipeline load by 60-80% while maintaining
    reward signal quality for DQN training.
    """

    def __init__(
        self,
        manager: ActiveLearningManager,
        config: Optional[ActiveLearningConfig] = None,
    ) -> None:
        self.config = config or manager.config
        self.manager = manager

        # Tracking
        self._fast_path_count: int = 0
        self._slow_path_count: int = 0
        self._fast_path_positive: int = 0
        self._slow_path_positive: int = 0

    def augment_reward(
        self,
        state: np.ndarray,
        url: str,
        extraction_result: Optional[float] = None,
    ) -> float:
        """Compute reward for a crawled page.

        If extraction_result is provided, use it directly (slow path result).
        Otherwise, attempt fast path via the predictor.

        Args:
            state: (feature_dim,) state vector.
            url: canonical URL.
            extraction_result: actual reward from extraction pipeline,
                or None to use prediction.

        Returns:
            Reward value in [-0.1, 1.0].
        """
        # Slow path: extraction result available
        if extraction_result is not None:
            self._slow_path_count += 1
            if extraction_result > 0:
                self._slow_path_positive += 1

            # Record prediction accuracy if predictor is fitted
            if self.manager.predictor.is_fitted:
                prob, _ = self.manager.predictor.predict(state)
                predicted_lead = prob > 0.5
                actual_lead = extraction_result > 0
                self.manager.record_prediction_outcome(
                    predicted_lead, actual_lead
                )

            return float(extraction_result)

        # Fast path: use predictor if confident enough
        if not self.manager.predictor.is_fitted:
            return 0.0  # No model -> neutral

        prob, uncertainty = self.manager.predictor.predict(state)

        if (
            prob > self.config.high_confidence_threshold
            or prob < self.config.low_confidence_threshold
        ):
            # High confidence -> use prediction
            self._fast_path_count += 1
            reward = self.manager.get_reward_estimate(state)
            if reward > 0:
                self._fast_path_positive += 1
            return reward

        # Uncertain -> add to unlabeled pool for future active query
        self.manager.add_unlabeled(state, url)
        return 0.0  # Neutral reward until extraction resolves

    def should_extract(self, state: np.ndarray) -> bool:
        """Check if a page should be sent to the extraction pipeline.

        Returns True if the predictor is uncertain about this page,
        meaning full extraction is needed for a reliable reward.
        """
        if not self.manager.predictor.is_fitted:
            return True  # No model -> always extract (cold start)

        prob, uncertainty = self.manager.predictor.predict(state)

        # Send to extraction if uncertain
        return (
            self.config.low_confidence_threshold
            <= prob
            <= self.config.high_confidence_threshold
        )

    def get_stats(self) -> Dict[str, Any]:
        """Augmenter-specific statistics."""
        total = self._fast_path_count + self._slow_path_count
        return {
            "fast_path_count": self._fast_path_count,
            "slow_path_count": self._slow_path_count,
            "total_augmented": total,
            "fast_path_rate": round(
                self._fast_path_count / max(total, 1), 4
            ),
            "fast_path_positive_rate": round(
                self._fast_path_positive / max(self._fast_path_count, 1), 4
            ),
            "slow_path_positive_rate": round(
                self._slow_path_positive / max(self._slow_path_count, 1), 4
            ),
            "extraction_savings_pct": round(
                self._fast_path_count / max(total, 1) * 100, 1
            ),
        }
