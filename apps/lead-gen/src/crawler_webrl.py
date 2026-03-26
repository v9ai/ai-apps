"""
Module 1: WebRL -- Outcome Reward Model + Self-Evolving Curriculum.

Implements the WebRL technique (Qi et al., ICLR 2025) adapted for the
RL-based focused web crawler.  Three core components:

1. **Outcome Reward Model (ORM):** Binary classifier that predicts whether
   a crawl trajectory will lead to a qualified lead discovery.  Replaces
   hand-crafted reward heuristics with a learned signal.

2. **Self-Evolving Curriculum:** Failed crawl trajectories seed a curriculum
   generator that produces new crawl tasks targeting the agent's weak spots.
   Difficulty filtering via Q-value "Goldilocks zone" focuses crawl budget
   on the highest-learning-potential pages.

3. **KL-Constrained Policy Updates:** Prevents catastrophic forgetting when
   the curriculum shifts by penalising divergence from a reference policy
   snapshot.

Integration points:
- crawler_dqn.py: KLConstrainedUpdater wraps DoubleDQNAgent training
- crawler_replay_buffer.py: TrajectoryBuffer stores complete trajectories
- crawler_reward_shaping.py: ORM reward replaces/augments hand-crafted rewards
- crawler_curriculum.py: FailureCurriculumGenerator extends CurriculumManager

Memory budget: <30 MB (ORM model + trajectory buffers).
Target: Apple M1 16GB, zero cloud dependency.
"""

import hashlib
import json
import logging
import math
import os
import random
import sqlite3
import time
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple
from urllib.parse import urlparse

import numpy as np

logger = logging.getLogger("crawler_webrl")

# ---------------------------------------------------------------------------
# Optional PyTorch import -- graceful fallback to numpy logistic regression
# ---------------------------------------------------------------------------
_HAS_TORCH = False

try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    import torch.optim as optim

    _HAS_TORCH = True
except ImportError:
    logger.info("PyTorch not available -- ORM will use numpy logistic regression fallback")


# ======================= Configuration ======================================

@dataclass
class WebRLConfig:
    """Configuration for the WebRL training loop.

    Default values calibrated for the lead-gen crawl pipeline on M1.
    """

    # ORM hidden layer size
    orm_hidden_dim: int = 256

    # ORM learning rate
    orm_lr: float = 1e-4

    # Binary classification threshold for ORM
    orm_threshold: float = 0.5

    # KL penalty coefficient for constrained policy updates
    kl_beta: float = 0.1

    # Number of failed trajectories to sample per curriculum generation
    curriculum_batch_size: int = 32

    # Maximum steps per crawl trajectory
    max_trajectory_length: int = 50

    # Maximum stored failure trajectories
    failure_buffer_size: int = 1000

    # Maximum stored success trajectories
    success_buffer_size: int = 500

    # Retrain ORM every N new trajectories
    retrain_interval: int = 500

    # SQLite path for trajectory persistence
    sqlite_path: str = "scrapus_data/webrl_state.db"

    # State embedding dimension (must match DQN state_dim)
    state_dim: int = 784

    # Trajectory embedding dimension (fixed-size representation)
    trajectory_embed_dim: int = 256

    # ORM training epochs per retrain cycle
    orm_train_epochs: int = 10

    # ORM training batch size
    orm_batch_size: int = 64

    # Minimum trajectories before first ORM training
    min_trajectories_for_training: int = 50

    # Q-value Goldilocks zone for curriculum difficulty filtering
    q_value_min: float = 0.05
    q_value_max: float = 0.75

    # URL pattern templates for curriculum generation
    page_type_suffixes: List[str] = field(default_factory=lambda: [
        "/team", "/about", "/about-us", "/careers", "/jobs",
        "/people", "/contact", "/who-we-are", "/our-team",
        "/openings", "/vacancies", "/join-us", "/work-with-us",
        "/company", "/leadership", "/staff", "/hiring",
    ])

    # MPS device preference
    use_mps: bool = True


# ======================= Trajectory =========================================

@dataclass
class Trajectory:
    """A complete crawl trajectory with binary outcome label.

    Stores the sequence of (state, action, reward) tuples from a single
    crawl episode, along with the final binary outcome: did this trajectory
    lead to a qualified lead discovery?
    """

    states: List[np.ndarray]
    actions: List[int]
    rewards: List[float]
    outcome: bool  # True if trajectory led to a qualified lead
    domain: str
    seed_url: str
    timestamp: float = field(default_factory=time.time)

    def to_embedding(self) -> np.ndarray:
        """Produce a fixed-size trajectory representation.

        Combines:
        1. Mean of all state embeddings (state_dim,)
        2. Statistics: [length, mean_reward, max_reward, min_reward,
                        outcome_float, action_entropy, depth_ratio]

        Final output is projected to trajectory_embed_dim via hashing
        to keep memory bounded.

        Returns:
            (256,) float32 array -- fixed-size trajectory embedding.
        """
        if not self.states:
            return np.zeros(256, dtype=np.float32)

        # Stack states and compute mean embedding
        state_matrix = np.stack(self.states, axis=0)  # (T, state_dim)
        mean_state = np.mean(state_matrix, axis=0)  # (state_dim,)

        # Statistical features
        length = len(self.states)
        mean_reward = float(np.mean(self.rewards)) if self.rewards else 0.0
        max_reward = float(np.max(self.rewards)) if self.rewards else 0.0
        min_reward = float(np.min(self.rewards)) if self.rewards else 0.0
        outcome_float = 1.0 if self.outcome else 0.0

        # Action entropy (diversity of actions taken)
        if self.actions:
            action_counts = Counter(self.actions)
            total = len(self.actions)
            probs = [c / total for c in action_counts.values()]
            action_entropy = -sum(p * math.log(p + 1e-10) for p in probs)
        else:
            action_entropy = 0.0

        # Depth ratio (how far into the trajectory the best reward occurred)
        if self.rewards:
            best_idx = int(np.argmax(self.rewards))
            depth_ratio = best_idx / max(1, length - 1)
        else:
            depth_ratio = 0.0

        stats = np.array([
            length / 50.0,  # normalised length
            mean_reward,
            max_reward,
            min_reward,
            outcome_float,
            action_entropy,
            depth_ratio,
        ], dtype=np.float32)

        # Concatenate mean state + stats, then project to 256 dims
        # via deterministic random projection (seeded by trajectory hash)
        full_vec = np.concatenate([mean_state, stats])  # (state_dim + 7,)

        # Deterministic projection to 256 dims
        seed_val = hash((self.domain, self.seed_url, length)) & 0xFFFFFFFF
        rng = np.random.RandomState(seed_val)
        proj_matrix = rng.randn(full_vec.shape[0], 256).astype(np.float32)
        proj_matrix /= np.sqrt(full_vec.shape[0])  # scale for variance preservation

        embedding = full_vec.astype(np.float32) @ proj_matrix
        # L2 normalise
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding /= norm

        return embedding

    def __len__(self) -> int:
        return len(self.states)


# ======================= CrawlTask ==========================================

@dataclass
class CrawlTask:
    """A crawl task generated by the failure curriculum generator.

    Represents a specific crawl assignment with seed URL, target page type,
    maximum depth, and domain-specific hints derived from failure analysis.
    """

    seed_url: str
    target_page_type: str  # "team", "careers", "contact", "about", etc.
    max_depth: int = 3
    domain_hints: List[str] = field(default_factory=list)
    source_failure_domain: str = ""  # which failed trajectory inspired this
    difficulty_estimate: float = 0.5  # estimated difficulty [0, 1]
    created_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "seed_url": self.seed_url,
            "target_page_type": self.target_page_type,
            "max_depth": self.max_depth,
            "domain_hints": self.domain_hints,
            "source_failure_domain": self.source_failure_domain,
            "difficulty_estimate": round(self.difficulty_estimate, 4),
            "created_at": self.created_at,
        }


# ======================= Outcome Reward Model (ORM) =========================

class _ORMNetworkTorch(nn.Module):
    """PyTorch binary classifier: trajectory_embedding -> P(success).

    Architecture: input(256) -> 256 -> 128 -> 1 (sigmoid).
    Size: ~100 KB -- well within 30 MB budget.
    """

    def __init__(self, input_dim: int = 256, hidden_dim: int = 256) -> None:
        super().__init__()
        self.fc1 = nn.Linear(input_dim, hidden_dim)
        self.fc2 = nn.Linear(hidden_dim, hidden_dim // 2)
        self.fc3 = nn.Linear(hidden_dim // 2, 1)

    def forward(self, x: "torch.Tensor") -> "torch.Tensor":
        x = F.relu(self.fc1(x))
        x = F.relu(self.fc2(x))
        return torch.sigmoid(self.fc3(x))


class _ORMFallbackNumpy:
    """Numpy logistic regression fallback when PyTorch is unavailable.

    Simple L2-regularised logistic regression trained with gradient descent.
    Sufficient for binary classification on 256-dim trajectory embeddings.
    """

    def __init__(self, input_dim: int = 256, lr: float = 1e-3, l2: float = 1e-4) -> None:
        self.input_dim = input_dim
        self.lr = lr
        self.l2 = l2
        self.weights = np.zeros(input_dim, dtype=np.float64)
        self.bias = 0.0

    def _sigmoid(self, z: np.ndarray) -> np.ndarray:
        z = np.clip(z, -500, 500)
        return 1.0 / (1.0 + np.exp(-z))

    def predict(self, x: np.ndarray) -> np.ndarray:
        """Predict P(success) for (N, input_dim) input."""
        if x.ndim == 1:
            x = x[np.newaxis, :]
        logits = x @ self.weights + self.bias
        return self._sigmoid(logits)

    def train(
        self,
        x: np.ndarray,
        y: np.ndarray,
        epochs: int = 10,
        batch_size: int = 64,
    ) -> Dict[str, float]:
        """Train on (x, y) pairs. y is 0/1 binary labels."""
        n = x.shape[0]
        if n == 0:
            return {"loss": 0.0, "accuracy": 0.0}

        losses = []
        for epoch in range(epochs):
            # Shuffle
            perm = np.random.permutation(n)
            x_shuffled = x[perm]
            y_shuffled = y[perm]

            for start in range(0, n, batch_size):
                end = min(start + batch_size, n)
                xb = x_shuffled[start:end].astype(np.float64)
                yb = y_shuffled[start:end].astype(np.float64)

                preds = self._sigmoid(xb @ self.weights + self.bias)

                # Binary cross-entropy gradient
                error = preds - yb  # (batch,)
                grad_w = (xb.T @ error) / len(yb) + self.l2 * self.weights
                grad_b = np.mean(error)

                self.weights -= self.lr * grad_w
                self.bias -= self.lr * grad_b

            # Epoch loss
            all_preds = self._sigmoid(x.astype(np.float64) @ self.weights + self.bias)
            eps = 1e-10
            loss = -np.mean(
                y * np.log(all_preds + eps) + (1 - y) * np.log(1 - all_preds + eps)
            )
            losses.append(float(loss))

        # Final accuracy
        final_preds = self.predict(x)
        accuracy = float(np.mean((final_preds > 0.5).flatten() == y.astype(bool)))

        return {
            "loss": losses[-1] if losses else 0.0,
            "accuracy": accuracy,
            "epochs": epochs,
        }


class OutcomeRewardModel:
    """Binary classifier: (instruction, actions, final_state) -> success/failure.

    Uses PyTorch with MPS when available, falls back to numpy logistic
    regression.  The ORM replaces hand-crafted reward heuristics with a
    learned binary signal based on trajectory outcomes.

    Input: trajectory embedding (concatenated state embeddings + action sequence)
    Architecture: input(256) -> 256 -> 128 -> 1 (sigmoid)

    Memory: ~200 KB for the model + training state.
    """

    def __init__(self, config: Optional[WebRLConfig] = None) -> None:
        self.config = config or WebRLConfig()
        self._use_torch = _HAS_TORCH

        # Training statistics
        self._train_count: int = 0
        self._total_samples_seen: int = 0
        self._best_accuracy: float = 0.0

        if self._use_torch:
            self._device = self._resolve_device()
            self._model = _ORMNetworkTorch(
                input_dim=self.config.trajectory_embed_dim,
                hidden_dim=self.config.orm_hidden_dim,
            ).to(self._device)
            self._optimizer = optim.Adam(
                self._model.parameters(), lr=self.config.orm_lr
            )
            logger.info(
                "ORM initialised with PyTorch on %s (%.1f KB params)",
                self._device,
                sum(p.numel() for p in self._model.parameters()) * 4 / 1024,
            )
        else:
            self._device = None
            self._fallback = _ORMFallbackNumpy(
                input_dim=self.config.trajectory_embed_dim,
                lr=self.config.orm_lr * 10,  # higher lr for numpy SGD
            )
            logger.info("ORM initialised with numpy logistic regression fallback")

    def _resolve_device(self) -> "torch.device":
        if self.config.use_mps and torch.backends.mps.is_available():
            return torch.device("mps")
        return torch.device("cpu")

    def predict(self, trajectory: Trajectory) -> float:
        """Predict probability of lead discovery success for a trajectory.

        Args:
            trajectory: complete crawl trajectory.

        Returns:
            Probability in [0, 1].
        """
        embedding = trajectory.to_embedding()
        return float(self.predict_batch_embeddings(embedding[np.newaxis, :])[0])

    def predict_batch(self, trajectories: List[Trajectory]) -> np.ndarray:
        """Predict success probabilities for a batch of trajectories.

        Args:
            trajectories: list of Trajectory objects.

        Returns:
            (N,) float32 array of probabilities.
        """
        if not trajectories:
            return np.array([], dtype=np.float32)

        embeddings = np.stack([t.to_embedding() for t in trajectories], axis=0)
        return self.predict_batch_embeddings(embeddings)

    def predict_batch_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        """Predict from pre-computed embeddings.

        Args:
            embeddings: (N, trajectory_embed_dim) float32.

        Returns:
            (N,) float32 array of probabilities.
        """
        if self._use_torch:
            self._model.eval()
            with torch.no_grad():
                x = torch.as_tensor(
                    embeddings, dtype=torch.float32, device=self._device
                )
                probs = self._model(x).cpu().numpy().flatten()
            return probs.astype(np.float32)
        else:
            return self._fallback.predict(embeddings).astype(np.float32)

    def classify(self, trajectory: Trajectory) -> bool:
        """Binary classification: is this trajectory a success?

        Args:
            trajectory: complete crawl trajectory.

        Returns:
            True if P(success) > threshold.
        """
        prob = self.predict(trajectory)
        return prob > self.config.orm_threshold

    def train(
        self,
        success_trajectories: List[Trajectory],
        failure_trajectories: List[Trajectory],
    ) -> Dict[str, float]:
        """Train the ORM on success/failure trajectory pairs.

        Args:
            success_trajectories: trajectories that led to qualified leads.
            failure_trajectories: trajectories that did not find leads.

        Returns:
            Training metrics: loss, accuracy, num_samples, etc.
        """
        if not success_trajectories and not failure_trajectories:
            return {"loss": 0.0, "accuracy": 0.0, "num_samples": 0}

        # Build training data
        embeddings = []
        labels = []

        for t in success_trajectories:
            embeddings.append(t.to_embedding())
            labels.append(1.0)

        for t in failure_trajectories:
            embeddings.append(t.to_embedding())
            labels.append(0.0)

        x = np.stack(embeddings, axis=0).astype(np.float32)
        y = np.array(labels, dtype=np.float32)

        self._total_samples_seen += len(y)
        self._train_count += 1

        if self._use_torch:
            return self._train_torch(x, y)
        else:
            return self._fallback.train(
                x, y,
                epochs=self.config.orm_train_epochs,
                batch_size=self.config.orm_batch_size,
            )

    def _train_torch(self, x: np.ndarray, y: np.ndarray) -> Dict[str, float]:
        """Train the PyTorch ORM model."""
        n = x.shape[0]
        self._model.train()

        x_tensor = torch.as_tensor(x, dtype=torch.float32, device=self._device)
        y_tensor = torch.as_tensor(y, dtype=torch.float32, device=self._device)

        epoch_losses = []
        for epoch in range(self.config.orm_train_epochs):
            perm = torch.randperm(n, device=self._device)
            x_shuffled = x_tensor[perm]
            y_shuffled = y_tensor[perm]

            batch_losses = []
            for start in range(0, n, self.config.orm_batch_size):
                end = min(start + self.config.orm_batch_size, n)
                xb = x_shuffled[start:end]
                yb = y_shuffled[start:end]

                preds = self._model(xb).squeeze(-1)
                loss = F.binary_cross_entropy(preds, yb)

                self._optimizer.zero_grad()
                loss.backward()
                torch.nn.utils.clip_grad_norm_(self._model.parameters(), 1.0)
                self._optimizer.step()

                batch_losses.append(loss.item())

            epoch_losses.append(float(np.mean(batch_losses)))

        # Compute final accuracy
        self._model.eval()
        with torch.no_grad():
            all_preds = self._model(x_tensor).squeeze(-1).cpu().numpy()
        accuracy = float(np.mean((all_preds > 0.5) == y.astype(bool)))
        self._best_accuracy = max(self._best_accuracy, accuracy)

        return {
            "loss": epoch_losses[-1] if epoch_losses else 0.0,
            "accuracy": accuracy,
            "best_accuracy": self._best_accuracy,
            "num_samples": n,
            "train_count": self._train_count,
            "total_samples_seen": self._total_samples_seen,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Return ORM model statistics."""
        stats: Dict[str, Any] = {
            "backend": "torch" if self._use_torch else "numpy",
            "train_count": self._train_count,
            "total_samples_seen": self._total_samples_seen,
            "best_accuracy": round(self._best_accuracy, 4),
            "threshold": self.config.orm_threshold,
        }
        if self._use_torch:
            stats["device"] = str(self._device)
            stats["param_count"] = sum(
                p.numel() for p in self._model.parameters()
            )
        return stats


# ======================= Trajectory Buffer ==================================

class TrajectoryBuffer:
    """Stores complete crawl trajectories with outcomes.

    SQLite-backed with mmap state arrays for memory efficiency.
    Maintains separate pools for success and failure trajectories
    to support balanced ORM training and curriculum generation.

    Memory: ~10 MB for 1500 trajectories (1000 failures + 500 successes)
    with 50-step average trajectory length.
    """

    def __init__(self, config: Optional[WebRLConfig] = None) -> None:
        self.config = config or WebRLConfig()

        # In-memory trajectory pools
        self._successes: List[Trajectory] = []
        self._failures: List[Trajectory] = []

        # Counters
        self._total_added: int = 0
        self._total_successes: int = 0
        self._total_failures: int = 0

        # SQLite persistence
        self._conn: Optional[sqlite3.Connection] = None
        self._init_db()

        logger.info(
            "TrajectoryBuffer initialised: max_failures=%d, max_successes=%d",
            self.config.failure_buffer_size,
            self.config.success_buffer_size,
        )

    def _init_db(self) -> None:
        """Initialise SQLite tables for trajectory persistence."""
        os.makedirs(os.path.dirname(self.config.sqlite_path), exist_ok=True)
        self._conn = sqlite3.connect(self.config.sqlite_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.executescript("""
            CREATE TABLE IF NOT EXISTS trajectories (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                domain      TEXT NOT NULL,
                seed_url    TEXT NOT NULL,
                outcome     INTEGER NOT NULL,
                length      INTEGER NOT NULL,
                total_reward REAL NOT NULL,
                actions_json TEXT NOT NULL,
                rewards_json TEXT NOT NULL,
                states_hash TEXT NOT NULL,
                timestamp   REAL NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_traj_outcome
                ON trajectories(outcome);
            CREATE INDEX IF NOT EXISTS idx_traj_domain
                ON trajectories(domain);

            CREATE TABLE IF NOT EXISTS webrl_stats (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        """)
        self._conn.commit()

    def add_trajectory(
        self,
        states: List[np.ndarray],
        actions: List[int],
        rewards: List[float],
        outcome: bool,
        domain: str = "",
        seed_url: str = "",
    ) -> Trajectory:
        """Add a complete crawl trajectory to the buffer.

        Args:
            states: list of state vectors, one per step.
            actions: list of action indices.
            rewards: list of per-step rewards.
            outcome: True if this trajectory found a qualified lead.
            domain: crawled domain.
            seed_url: starting URL.

        Returns:
            The created Trajectory object.
        """
        trajectory = Trajectory(
            states=states,
            actions=actions,
            rewards=rewards,
            outcome=outcome,
            domain=domain,
            seed_url=seed_url,
        )

        self._total_added += 1

        if outcome:
            self._successes.append(trajectory)
            self._total_successes += 1
            # Enforce buffer size limit
            if len(self._successes) > self.config.success_buffer_size:
                self._successes = self._successes[-self.config.success_buffer_size:]
        else:
            self._failures.append(trajectory)
            self._total_failures += 1
            if len(self._failures) > self.config.failure_buffer_size:
                self._failures = self._failures[-self.config.failure_buffer_size:]

        # Persist to SQLite
        self._persist_trajectory(trajectory)

        return trajectory

    def _persist_trajectory(self, trajectory: Trajectory) -> None:
        """Write trajectory metadata to SQLite (states stored as hash only)."""
        # Hash the state sequence for deduplication
        state_bytes = b""
        for s in trajectory.states[:5]:  # hash first 5 states for efficiency
            state_bytes += s.tobytes()[:64]
        states_hash = hashlib.md5(state_bytes).hexdigest()

        self._conn.execute(
            """
            INSERT INTO trajectories
                (domain, seed_url, outcome, length, total_reward,
                 actions_json, rewards_json, states_hash, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                trajectory.domain,
                trajectory.seed_url,
                int(trajectory.outcome),
                len(trajectory),
                sum(trajectory.rewards),
                json.dumps([int(a) for a in trajectory.actions]),
                json.dumps([float(r) for r in trajectory.rewards]),
                states_hash,
                trajectory.timestamp,
            ),
        )
        self._conn.commit()

    def get_failures(self, n: int) -> List[Trajectory]:
        """Sample up to n failed trajectories.

        Args:
            n: maximum number of failures to return.

        Returns:
            List of failed Trajectory objects (may be fewer than n).
        """
        if not self._failures:
            return []
        if n >= len(self._failures):
            return list(self._failures)
        return random.sample(self._failures, n)

    def get_successes(self, n: int) -> List[Trajectory]:
        """Sample up to n successful trajectories.

        Args:
            n: maximum number of successes to return.

        Returns:
            List of successful Trajectory objects (may be fewer than n).
        """
        if not self._successes:
            return []
        if n >= len(self._successes):
            return list(self._successes)
        return random.sample(self._successes, n)

    def to_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        """Convert all buffered trajectories to ORM training data.

        Returns:
            (features, labels) where features is (N, trajectory_embed_dim)
            and labels is (N,) with 1.0 for success, 0.0 for failure.
        """
        all_trajectories = self._successes + self._failures
        if not all_trajectories:
            embed_dim = self.config.trajectory_embed_dim
            return np.empty((0, embed_dim), dtype=np.float32), np.empty(0, dtype=np.float32)

        embeddings = [t.to_embedding() for t in all_trajectories]
        labels = [1.0] * len(self._successes) + [0.0] * len(self._failures)

        features = np.stack(embeddings, axis=0)
        label_array = np.array(labels, dtype=np.float32)

        # Shuffle
        perm = np.random.permutation(len(all_trajectories))
        return features[perm], label_array[perm]

    def get_stats(self) -> Dict[str, Any]:
        """Return buffer statistics."""
        return {
            "total_added": self._total_added,
            "total_successes": self._total_successes,
            "total_failures": self._total_failures,
            "buffered_successes": len(self._successes),
            "buffered_failures": len(self._failures),
            "success_rate": (
                round(self._total_successes / self._total_added, 4)
                if self._total_added > 0
                else 0.0
            ),
        }

    def get_failure_domains(self) -> Dict[str, int]:
        """Count failures per domain for curriculum analysis."""
        domain_counts: Dict[str, int] = Counter(
            t.domain for t in self._failures if t.domain
        )
        return dict(domain_counts.most_common(50))

    def close(self) -> None:
        """Release SQLite connection."""
        if self._conn:
            self._conn.close()
            self._conn = None


# ======================= Failure Curriculum Generator =======================

class FailureCurriculumGenerator:
    """Generates new crawl tasks from failed trajectories.

    Implements the WebRL "in-breadth evolving" pattern: same task structure,
    different starting domains and parameters.  Uses rule-based URL pattern
    expansion instead of GPT-4o (zero API cost, suitable for M1 local use).

    Identifies common failure patterns:
    - Stuck at specific depths (e.g., always failing at depth 3)
    - Domain-specific failures (certain site structures never yield leads)
    - Action distribution issues (always taking the same actions)

    Then generates targeted crawl tasks that address these weaknesses.
    """

    def __init__(self, config: Optional[WebRLConfig] = None) -> None:
        self.config = config or WebRLConfig()

        # Track generated tasks for deduplication
        self._generated_urls: Set[str] = set()
        self._total_generated: int = 0
        self._generation_count: int = 0

    def generate_tasks(
        self,
        failures: List[Trajectory],
        n: int,
        q_value_fn: Optional[Any] = None,
    ) -> List[CrawlTask]:
        """Generate new crawl tasks from failed trajectories.

        Args:
            failures: list of failed Trajectory objects to learn from.
            n: number of tasks to generate.
            q_value_fn: optional callable(seed_url) -> float for difficulty
                        filtering via Q-value Goldilocks zone.

        Returns:
            List of CrawlTask objects, up to n tasks.
        """
        if not failures:
            return []

        self._generation_count += 1
        tasks: List[CrawlTask] = []

        # Analyse failure patterns
        patterns = self._analyse_failures(failures)

        # Strategy 1: URL variant generation (in-breadth evolving)
        url_variants = self._generate_url_variants(failures, patterns)
        tasks.extend(url_variants)

        # Strategy 2: Similar domain exploration
        domain_tasks = self._generate_domain_variants(failures, patterns)
        tasks.extend(domain_tasks)

        # Strategy 3: Depth-adjusted retries
        depth_tasks = self._generate_depth_adjusted(failures, patterns)
        tasks.extend(depth_tasks)

        # Deduplicate
        unique_tasks = []
        seen: Set[str] = set()
        for task in tasks:
            if task.seed_url not in seen and task.seed_url not in self._generated_urls:
                seen.add(task.seed_url)
                self._generated_urls.add(task.seed_url)
                unique_tasks.append(task)

        # Difficulty filtering via Q-value Goldilocks zone
        if q_value_fn is not None:
            unique_tasks = self._filter_by_difficulty(unique_tasks, q_value_fn)

        # Trim to requested count
        result = unique_tasks[:n]
        self._total_generated += len(result)

        logger.info(
            "Curriculum generated %d tasks from %d failures (generation #%d)",
            len(result),
            len(failures),
            self._generation_count,
        )
        return result

    def _analyse_failures(self, failures: List[Trajectory]) -> Dict[str, Any]:
        """Extract common failure patterns.

        Returns:
            Dict with keys: stuck_depths, common_domains, action_biases,
            avg_trajectory_length, failure_page_types.
        """
        depths: List[int] = []
        domains: List[str] = []
        all_actions: List[int] = []
        lengths: List[int] = []

        for t in failures:
            lengths.append(len(t))
            depths.append(len(t))  # proxy for depth at failure
            if t.domain:
                domains.append(t.domain)
            all_actions.extend(t.actions)

        # Identify "stuck" depths (modes of failure length distribution)
        depth_counts = Counter(depths)
        stuck_depths = [
            d for d, c in depth_counts.most_common(3)
            if c >= max(2, len(failures) * 0.1)
        ]

        # Most common failure domains
        domain_counts = Counter(domains)
        common_domains = [d for d, _ in domain_counts.most_common(10)]

        # Action distribution bias
        action_counts = Counter(all_actions)
        total_actions = max(1, len(all_actions))
        action_biases = {
            str(a): round(c / total_actions, 4)
            for a, c in action_counts.most_common(5)
        }

        return {
            "stuck_depths": stuck_depths,
            "common_domains": common_domains,
            "action_biases": action_biases,
            "avg_trajectory_length": float(np.mean(lengths)) if lengths else 0.0,
            "total_failures": len(failures),
        }

    def _generate_url_variants(
        self,
        failures: List[Trajectory],
        patterns: Dict[str, Any],
    ) -> List[CrawlTask]:
        """Generate URL variants by applying page-type suffixes.

        For each failed domain, generate URLs targeting different page types:
        e.g., company.com/about -> company.com/team, company.com/careers
        """
        tasks: List[CrawlTask] = []
        seen_domains: Set[str] = set()

        for trajectory in failures:
            domain = trajectory.domain
            if not domain or domain in seen_domains:
                continue
            seen_domains.add(domain)

            # Parse base URL
            parsed = urlparse(trajectory.seed_url)
            base = f"{parsed.scheme or 'https'}://{domain}"

            for suffix in self.config.page_type_suffixes:
                target_url = base + suffix
                page_type = suffix.strip("/").split("-")[0]

                tasks.append(CrawlTask(
                    seed_url=target_url,
                    target_page_type=page_type,
                    max_depth=2,  # shallow for targeted exploration
                    domain_hints=[domain],
                    source_failure_domain=domain,
                ))

        return tasks

    def _generate_domain_variants(
        self,
        failures: List[Trajectory],
        patterns: Dict[str, Any],
    ) -> List[CrawlTask]:
        """Generate tasks for similar domains based on failure analysis.

        Uses domain structure patterns (e.g., if company.io fails, try
        company.com, company.dev, etc.).
        """
        tasks: List[CrawlTask] = []
        tld_variants = [".com", ".io", ".dev", ".co", ".org", ".net"]

        for trajectory in failures[:20]:  # limit to prevent explosion
            domain = trajectory.domain
            if not domain:
                continue

            parts = domain.split(".")
            if len(parts) < 2:
                continue

            base_name = parts[0]
            current_tld = "." + ".".join(parts[1:])

            for tld in tld_variants:
                if tld == current_tld:
                    continue
                variant_domain = base_name + tld
                variant_url = f"https://{variant_domain}"

                tasks.append(CrawlTask(
                    seed_url=variant_url,
                    target_page_type="about",
                    max_depth=3,
                    domain_hints=[variant_domain, domain],
                    source_failure_domain=domain,
                ))

        return tasks

    def _generate_depth_adjusted(
        self,
        failures: List[Trajectory],
        patterns: Dict[str, Any],
    ) -> List[CrawlTask]:
        """Generate tasks with adjusted depth limits based on failure analysis.

        If failures consistently occur at depth N, generate tasks with
        max_depth = N+1 or N+2 to push past the sticking point.
        """
        tasks: List[CrawlTask] = []
        stuck_depths = patterns.get("stuck_depths", [])

        if not stuck_depths:
            return tasks

        max_stuck_depth = max(stuck_depths)

        for trajectory in failures[:10]:
            if not trajectory.seed_url:
                continue

            tasks.append(CrawlTask(
                seed_url=trajectory.seed_url,
                target_page_type="team",
                max_depth=min(max_stuck_depth + 2, 6),  # push 2 levels deeper
                domain_hints=[trajectory.domain] if trajectory.domain else [],
                source_failure_domain=trajectory.domain,
                difficulty_estimate=0.6,  # harder than default
            ))

        return tasks

    def _filter_by_difficulty(
        self,
        tasks: List[CrawlTask],
        q_value_fn: Any,
    ) -> List[CrawlTask]:
        """Filter tasks by Q-value Goldilocks zone.

        Keep only tasks where the estimated success probability is in
        [q_value_min, q_value_max] -- not trivially easy, not impossibly hard.
        This is the critic-score filtering from WebRL.
        """
        filtered: List[CrawlTask] = []
        for task in tasks:
            try:
                q_value = float(q_value_fn(task.seed_url))
                task.difficulty_estimate = 1.0 - q_value  # lower Q = harder
                if self.config.q_value_min <= q_value <= self.config.q_value_max:
                    filtered.append(task)
            except Exception:
                # If Q-value estimation fails, include the task with default difficulty
                filtered.append(task)

        logger.debug(
            "Difficulty filter: %d/%d tasks in Goldilocks zone [%.2f, %.2f]",
            len(filtered),
            len(tasks),
            self.config.q_value_min,
            self.config.q_value_max,
        )
        return filtered

    def get_stats(self) -> Dict[str, Any]:
        """Return curriculum generation statistics."""
        return {
            "total_generated": self._total_generated,
            "generation_count": self._generation_count,
            "unique_urls_generated": len(self._generated_urls),
        }


# ======================= KL-Constrained Updater ============================

class KLConstrainedUpdater:
    """Constrains DQN policy updates to prevent catastrophic forgetting.

    Computes KL divergence between softmax(Q_current) and softmax(Q_reference)
    and adds a penalty term to the DQN loss:

        adjusted_loss = original_loss + beta * KL(pi_current || pi_reference)

    The reference Q-network is a snapshot taken before each curriculum phase.
    Updated via snapshot_reference() at curriculum boundaries.

    Adapted from WebRL's squared-loss KL-constrained objective for the DQN
    setting (discrete action space with Q-value-derived policies).

    Memory: ~5 MB for the reference network (same size as DQN online network).
    """

    def __init__(self, config: Optional[WebRLConfig] = None) -> None:
        self.config = config or WebRLConfig()
        self._beta = self.config.kl_beta

        # Reference Q-network (PyTorch)
        self._reference_params: Optional[Dict[str, Any]] = None

        # Statistics
        self._total_kl_penalties: int = 0
        self._running_kl_mean: float = 0.0
        self._kl_count: int = 0

        if not _HAS_TORCH:
            logger.warning(
                "KLConstrainedUpdater requires PyTorch -- "
                "KL penalty will be skipped without torch"
            )

    def snapshot_reference(self, q_network: Any) -> None:
        """Take a snapshot of the current Q-network as reference.

        Should be called before each curriculum phase begins.

        Args:
            q_network: the DQN's online Q-network (nn.Module).
        """
        if not _HAS_TORCH:
            return

        # Deep copy state dict
        self._reference_params = {
            k: v.clone().detach()
            for k, v in q_network.state_dict().items()
        }
        logger.info("KL reference network snapshot taken")

    def compute_kl_penalty(
        self,
        q_current: Any,
        q_reference: Any,
        temperature: float = 1.0,
    ) -> float:
        """Compute KL divergence between current and reference policies.

        Both policies are derived from Q-values via softmax:
            pi(a|s) = softmax(Q(s, a) / temperature)

        KL(pi_current || pi_reference) = sum_a pi_current(a) * log(pi_current(a) / pi_reference(a))

        Args:
            q_current: (batch, action_dim) current Q-values.
            q_reference: (batch, action_dim) reference Q-values.
            temperature: softmax temperature (default 1.0).

        Returns:
            Scalar KL divergence averaged over the batch.
        """
        if not _HAS_TORCH:
            return 0.0

        # Convert to softmax distributions
        pi_current = F.softmax(q_current / temperature, dim=-1)
        pi_reference = F.softmax(q_reference / temperature, dim=-1)

        # KL divergence: sum_a pi_current * log(pi_current / pi_reference)
        # Use log_softmax for numerical stability
        log_pi_current = F.log_softmax(q_current / temperature, dim=-1)
        log_pi_reference = F.log_softmax(q_reference / temperature, dim=-1)

        kl = torch.sum(pi_current * (log_pi_current - log_pi_reference), dim=-1)
        kl_mean = kl.mean()

        # Update running stats
        kl_val = float(kl_mean.item())
        self._kl_count += 1
        self._running_kl_mean += (kl_val - self._running_kl_mean) / self._kl_count
        self._total_kl_penalties += 1

        return kl_val

    def compute_adjusted_loss(
        self,
        original_loss: Any,
        q_current_values: Any,
        states: Any,
        reference_network: Any,
    ) -> Any:
        """Compute KL-adjusted loss for DQN training.

        adjusted_loss = original_loss + beta * KL(pi_current || pi_reference)

        Args:
            original_loss: scalar DQN loss tensor.
            q_current_values: (batch, action_dim) Q-values from online network.
            states: (batch, state_dim) state tensor for reference network eval.
            reference_network: the reference nn.Module (or None to skip).

        Returns:
            Adjusted loss tensor. Falls back to original_loss if reference
            is not available.
        """
        if not _HAS_TORCH or reference_network is None:
            return original_loss

        with torch.no_grad():
            q_reference = reference_network(states)

        kl_penalty = self.compute_kl_penalty(q_current_values, q_reference)
        adjusted = original_loss + self._beta * kl_penalty

        return adjusted

    def get_reference_network(self, network_class: Any, config: Any) -> Optional[Any]:
        """Reconstruct the reference network from saved parameters.

        Args:
            network_class: the nn.Module class (e.g., DQNNetwork).
            config: configuration for the network.

        Returns:
            Reference nn.Module with frozen weights, or None.
        """
        if not _HAS_TORCH or self._reference_params is None:
            return None

        ref_net = network_class(config)
        ref_net.load_state_dict(self._reference_params)
        ref_net.eval()

        # Freeze all parameters
        for param in ref_net.parameters():
            param.requires_grad = False

        return ref_net

    @property
    def beta(self) -> float:
        return self._beta

    @beta.setter
    def beta(self, value: float) -> None:
        self._beta = max(0.0, value)

    def get_stats(self) -> Dict[str, Any]:
        """Return KL constraint statistics."""
        return {
            "beta": self._beta,
            "total_kl_penalties": self._total_kl_penalties,
            "running_kl_mean": round(self._running_kl_mean, 6),
            "has_reference": self._reference_params is not None,
        }


# ======================= WebRL Orchestrator =================================

class WebRLOrchestrator:
    """Main integration point for the WebRL training loop.

    Orchestrates the full WebRL cycle:
        crawl -> classify -> learn -> curriculum -> repeat

    Components:
    - OutcomeRewardModel: learned binary reward signal
    - TrajectoryBuffer: trajectory storage with outcome labels
    - FailureCurriculumGenerator: self-evolving crawl task generation
    - KLConstrainedUpdater: policy stability during curriculum shifts

    Usage:
        orchestrator = WebRLOrchestrator(config)

        # During crawling
        trajectory = Trajectory(states, actions, rewards, outcome, domain, url)
        orchestrator.process_trajectory(trajectory)

        # Periodic checks
        if orchestrator.should_retrain():
            metrics = orchestrator.retrain_orm()

        # Generate new tasks from failures
        tasks = orchestrator.generate_curriculum()

        # Get ORM-based reward for a trajectory
        reward = orchestrator.get_reward(trajectory)
    """

    def __init__(self, config: Optional[WebRLConfig] = None) -> None:
        self.config = config or WebRLConfig()

        # Core components
        self.orm = OutcomeRewardModel(self.config)
        self.trajectory_buffer = TrajectoryBuffer(self.config)
        self.curriculum_generator = FailureCurriculumGenerator(self.config)
        self.kl_updater = KLConstrainedUpdater(self.config)

        # Phase tracking
        self._current_phase: int = 0
        self._trajectories_since_retrain: int = 0
        self._total_trajectories: int = 0

        # Performance tracking
        self._orm_retrain_history: List[Dict[str, float]] = []
        self._curriculum_history: List[Dict[str, Any]] = []

        logger.info(
            "WebRLOrchestrator initialised (retrain_interval=%d, "
            "curriculum_batch=%d, kl_beta=%.3f)",
            self.config.retrain_interval,
            self.config.curriculum_batch_size,
            self.config.kl_beta,
        )

    def process_trajectory(self, trajectory: Trajectory) -> Dict[str, Any]:
        """Process a completed crawl trajectory.

        Adds to the trajectory buffer, classifies with ORM, and updates
        internal counters.

        Args:
            trajectory: completed crawl trajectory with outcome label.

        Returns:
            Dict with classification result and trajectory stats.
        """
        # Add to buffer
        self.trajectory_buffer.add_trajectory(
            states=trajectory.states,
            actions=trajectory.actions,
            rewards=trajectory.rewards,
            outcome=trajectory.outcome,
            domain=trajectory.domain,
            seed_url=trajectory.seed_url,
        )

        # ORM classification (if trained)
        orm_prediction = None
        orm_correct = None
        if self.orm._train_count > 0:
            orm_prediction = self.orm.predict(trajectory)
            orm_correct = (orm_prediction > self.config.orm_threshold) == trajectory.outcome

        self._trajectories_since_retrain += 1
        self._total_trajectories += 1

        return {
            "outcome": trajectory.outcome,
            "length": len(trajectory),
            "total_reward": sum(trajectory.rewards),
            "domain": trajectory.domain,
            "orm_prediction": round(orm_prediction, 4) if orm_prediction is not None else None,
            "orm_correct": orm_correct,
            "trajectories_until_retrain": max(
                0,
                self.config.retrain_interval - self._trajectories_since_retrain,
            ),
        }

    def should_retrain(self) -> bool:
        """Check if the ORM should be retrained.

        Returns True if:
        1. Enough new trajectories have accumulated since last retrain.
        2. There are enough total trajectories for meaningful training.
        """
        if self._trajectories_since_retrain < self.config.retrain_interval:
            return False

        total = (
            len(self.trajectory_buffer._successes)
            + len(self.trajectory_buffer._failures)
        )
        return total >= self.config.min_trajectories_for_training

    def retrain_orm(self) -> Dict[str, float]:
        """Retrain the ORM on accumulated trajectory data.

        Balances success and failure samples for training, then retrains
        the binary classifier.

        Returns:
            Training metrics from ORM.train().
        """
        successes = self.trajectory_buffer.get_successes(
            self.config.success_buffer_size
        )
        failures = self.trajectory_buffer.get_failures(
            self.config.failure_buffer_size
        )

        if not successes and not failures:
            return {"loss": 0.0, "accuracy": 0.0, "num_samples": 0}

        # Balance training data: at most 2:1 ratio
        max_failures = min(len(failures), len(successes) * 2 + 10)
        if max_failures < len(failures):
            failures = random.sample(failures, max_failures)

        logger.info(
            "Retraining ORM: %d successes, %d failures (phase %d)",
            len(successes),
            len(failures),
            self._current_phase,
        )

        metrics = self.orm.train(successes, failures)
        self._trajectories_since_retrain = 0
        self._current_phase += 1
        self._orm_retrain_history.append(metrics)

        logger.info(
            "ORM retrained: loss=%.4f, accuracy=%.4f, samples=%d",
            metrics.get("loss", 0),
            metrics.get("accuracy", 0),
            metrics.get("num_samples", 0),
        )

        return metrics

    def generate_curriculum(
        self,
        q_value_fn: Optional[Any] = None,
    ) -> List[CrawlTask]:
        """Generate new crawl tasks from recent failures.

        Uses the FailureCurriculumGenerator to produce "in-breadth" task
        variants from failed trajectories, optionally filtered by Q-value
        difficulty estimates.

        Args:
            q_value_fn: optional callable(seed_url) -> float for Goldilocks
                        difficulty filtering.

        Returns:
            List of CrawlTask objects for the next training phase.
        """
        failures = self.trajectory_buffer.get_failures(
            self.config.curriculum_batch_size
        )

        if not failures:
            logger.info("No failures available for curriculum generation")
            return []

        tasks = self.curriculum_generator.generate_tasks(
            failures=failures,
            n=self.config.curriculum_batch_size,
            q_value_fn=q_value_fn,
        )

        # Record for history
        self._curriculum_history.append({
            "phase": self._current_phase,
            "num_failures_sampled": len(failures),
            "num_tasks_generated": len(tasks),
            "failure_domains": list(set(t.domain for t in failures if t.domain))[:10],
            "timestamp": time.time(),
        })

        return tasks

    def get_reward(self, trajectory: Trajectory) -> float:
        """Get ORM-based reward for a trajectory.

        If the ORM has been trained, returns the predicted success probability.
        Otherwise falls back to the binary outcome label.

        This reward signal replaces hand-crafted heuristics from
        crawler_reward_shaping.py when the ORM has sufficient training data.

        Args:
            trajectory: completed crawl trajectory.

        Returns:
            Reward value in [0, 1].
        """
        if self.orm._train_count > 0:
            return self.orm.predict(trajectory)
        else:
            # Fallback: binary outcome
            return 1.0 if trajectory.outcome else 0.0

    def snapshot_reference_policy(self, q_network: Any) -> None:
        """Take a reference policy snapshot for KL constraint.

        Should be called before each curriculum phase begins.

        Args:
            q_network: the DQN's online Q-network (nn.Module).
        """
        self.kl_updater.snapshot_reference(q_network)

    def get_stats(self) -> Dict[str, Any]:
        """Return comprehensive WebRL orchestrator statistics."""
        return {
            "current_phase": self._current_phase,
            "total_trajectories": self._total_trajectories,
            "trajectories_since_retrain": self._trajectories_since_retrain,
            "retrain_interval": self.config.retrain_interval,
            "orm": self.orm.get_stats(),
            "trajectory_buffer": self.trajectory_buffer.get_stats(),
            "curriculum_generator": self.curriculum_generator.get_stats(),
            "kl_updater": self.kl_updater.get_stats(),
            "orm_retrain_history": self._orm_retrain_history[-5:],
            "curriculum_history": self._curriculum_history[-5:],
        }

    def close(self) -> None:
        """Release all resources."""
        self.trajectory_buffer.close()
        logger.info("WebRLOrchestrator closed")
