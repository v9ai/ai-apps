"""
Advanced Prioritised Experience Replay improvements.

Builds on top of ``crawler_replay_buffer.py`` with:
- MinTree: O(log N) min-priority lookup for correct IS weights
- CombinedTree: unified SumTree + MinTree propagation
- WeightedReplayBuffer: mathematically correct IS weight computation
- CategorizedReplayBuffer: separate buffers per transition category
- HindsightReplayBuffer: trajectory-level storage with atomic relabeling
- LazyPriorityReplayBuffer: batched priority updates (~90% fewer SQLite writes)

Budget: 3-8 MB active RAM for 100K transitions.
Target: Apple M1 16GB, zero cloud dependency.
"""

import collections
import gc
import logging
import sqlite3
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

from crawler_replay_buffer import (
    MmapReplayBuffer,
    ReplayBufferConfig,
    SumTree,
)

logger = logging.getLogger("crawler_per_improvements")


# ======================= MinTree =============================================

class MinTree:
    """Binary min tree for O(log N) min-priority lookup.

    Same structure as SumTree but internal nodes hold the minimum of
    their children.  Used for exact IS weight computation:
        max_weight = (1 / (N * p_min))^beta
    avoids the O(N) scan of SumTree.max_priority().

    Memory: 2 * capacity * 8 bytes ~= 1.6 MB for 100K entries.
    """

    __slots__ = ("capacity", "tree", "write_idx", "size")

    _INF = float("inf")

    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.tree = np.full(2 * capacity, self._INF, dtype=np.float64)
        self.write_idx = 0
        self.size = 0

    def _propagate(self, idx: int) -> None:
        """Recompute min values up to the root."""
        parent = idx >> 1
        while parent >= 1:
            left = 2 * parent
            right = left + 1
            self.tree[parent] = min(self.tree[left], self.tree[right])
            parent >>= 1

    def update(self, leaf_idx: int, priority: float) -> None:
        """Update priority for a specific leaf."""
        tree_idx = self.capacity + leaf_idx
        self.tree[tree_idx] = priority
        self._propagate(tree_idx)

    def add(self, priority: float) -> int:
        """Add new entry; returns the leaf index used."""
        leaf_idx = self.write_idx
        self.update(leaf_idx, priority)
        self.write_idx = (self.write_idx + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)
        return leaf_idx

    def min_priority(self) -> float:
        """Return the minimum priority among all active leaves.

        O(1) — just read the root node.  Returns inf when empty.
        """
        if self.size == 0:
            return self._INF
        return float(self.tree[1])


# ======================= CombinedTree ========================================

class CombinedTree:
    """Wraps SumTree + MinTree for efficient PER operations.

    A single ``update`` propagates to both trees, keeping them in sync
    without the caller having to manage two separate structures.
    """

    __slots__ = ("capacity", "sum_tree", "min_tree", "write_idx", "size")

    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.sum_tree = SumTree(capacity)
        self.min_tree = MinTree(capacity)
        self.write_idx = 0
        self.size = 0

    def add(self, priority: float) -> int:
        """Add an entry to both trees.  Returns the leaf index."""
        leaf_idx = self.write_idx
        self.sum_tree.update(leaf_idx, priority)
        self.min_tree.update(leaf_idx, priority)
        self.write_idx = (self.write_idx + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)
        # Keep child trees in sync
        self.sum_tree.write_idx = self.write_idx
        self.sum_tree.size = self.size
        self.min_tree.write_idx = self.write_idx
        self.min_tree.size = self.size
        return leaf_idx

    def update(self, leaf_idx: int, priority: float) -> None:
        """Update both trees for a given leaf."""
        self.sum_tree.update(leaf_idx, priority)
        self.min_tree.update(leaf_idx, priority)

    def sample_proportional(self, batch_size: int) -> Tuple[np.ndarray, np.ndarray]:
        """Stratified proportional sampling from the sum tree.

        Divides the total priority range into ``batch_size`` equal segments
        and draws one uniform sample per segment.

        Returns:
            (indices, priorities) — both shape (batch_size,).
        """
        indices = np.empty(batch_size, dtype=np.int64)
        priorities = np.empty(batch_size, dtype=np.float64)
        total = self.sum_tree.total

        if total <= 0:
            raise ValueError("CombinedTree total priority is 0; cannot sample")

        segment = total / batch_size
        for i in range(batch_size):
            lo = segment * i
            hi = segment * (i + 1)
            cumsum = np.random.uniform(lo, hi)
            leaf_idx, prio = self.sum_tree.get(cumsum)
            indices[i] = leaf_idx
            priorities[i] = prio

        return indices, priorities

    @property
    def total(self) -> float:
        return self.sum_tree.total

    def min_priority(self) -> float:
        return self.min_tree.min_priority()

    def max_priority(self) -> float:
        return self.sum_tree.max_priority()


# ======================= WeightedReplayBuffer ================================

class WeightedReplayBuffer(MmapReplayBuffer):
    """Enhanced PER with mathematically correct IS weights via MinTree.

    The standard formulation (Schaul et al. 2015) defines:

        w_i = (1 / (N * P(i)))^beta / max_j w_j

    where max_j w_j = (1 / (N * p_min))^beta.

    The base ``MmapReplayBuffer`` approximates max_weight by normalising
    with ``weights /= weights.max()`` over the sampled batch.  This is
    biased because the batch maximum is not the population maximum.

    This class replaces the sum tree with a ``CombinedTree`` so that
    ``p_min`` is available in O(1), giving the exact IS weights.
    """

    def __init__(self, config: Optional[ReplayBufferConfig] = None) -> None:
        # Bypass parent __init__; we set up our own tree
        self.config = config or ReplayBufferConfig()
        self.data_dir = Path(self.config.data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # mmap arrays
        self._states_mmap: Optional[np.ndarray] = None
        self._next_states_mmap: Optional[np.ndarray] = None
        self._init_mmap_arrays()

        # Combined tree instead of plain SumTree
        self.combined_tree = CombinedTree(self.config.capacity)
        # Keep a sum_tree reference for parent class compatibility
        self.sum_tree = self.combined_tree.sum_tree

        # SQLite metadata
        self._db_path = str(self.data_dir / self.config.metadata_db)
        self._conn: Optional[sqlite3.Connection] = None
        self._init_sqlite()

        # Beta annealing
        self._beta = self.config.beta_start
        self._beta_step = 0

        # Write position
        self._write_idx = 0
        self._size = 0

        # Deferred batch commit state
        self._pending_transitions: List[Tuple] = []
        self._pending_urls: List[Tuple] = []
        self._adds_since_mmap_flush = 0

        # Performance tracking
        self._perf_add_times: collections.deque = collections.deque(maxlen=1000)
        self._perf_sample_times: collections.deque = collections.deque(maxlen=1000)
        self._perf_flush_count = 0
        self._perf_total_committed = 0
        self._perf_commit_count = 0
        self._perf_mmap_flush_count = 0

        # Restore state from SQLite if resuming
        self._restore_state()

        logger.info(
            "WeightedReplayBuffer initialised: capacity=%d, state_dim=%d, "
            "data_dir=%s, size=%d",
            self.config.capacity,
            self.config.state_dim,
            self.data_dir,
            self._size,
        )

    def _restore_state(self) -> None:
        """Restore write index and size, rebuilding both trees."""
        cur = self._conn.execute(
            "SELECT value FROM buffer_stats WHERE key = 'write_idx'"
        )
        row = cur.fetchone()
        if row:
            self._write_idx = int(row[0])
            row2 = self._conn.execute(
                "SELECT value FROM buffer_stats WHERE key = 'size'"
            ).fetchone()
            self._size = int(row2[0]) if row2 else 0
            self.combined_tree.write_idx = self._write_idx
            self.combined_tree.size = self._size
            self.combined_tree.sum_tree.write_idx = self._write_idx
            self.combined_tree.sum_tree.size = self._size
            self.combined_tree.min_tree.write_idx = self._write_idx
            self.combined_tree.min_tree.size = self._size

            cur = self._conn.execute(
                "SELECT idx, priority FROM transitions ORDER BY idx"
            )
            for idx, priority in cur:
                self.combined_tree.update(idx, priority)

    def add(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
        td_error: Optional[float] = None,
        url: Optional[str] = None,
    ) -> int:
        """Add a transition, updating both sum and min trees."""
        idx = self._write_idx

        # Write state vectors to mmap
        self._states_mmap[idx] = state.astype(np.float32)
        self._next_states_mmap[idx] = next_state.astype(np.float32)

        # Priority
        if td_error is not None:
            priority = (abs(td_error) + self.config.priority_epsilon) ** self.config.alpha
        else:
            priority = self.combined_tree.max_priority()
            if priority == 0.0:
                priority = 1.0

        self.combined_tree.update(idx, priority)

        now = time.time()
        self._conn.execute(
            """
            INSERT OR REPLACE INTO transitions
                (idx, action, reward, done, priority, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (idx, action, reward, int(done), priority, now, now),
        )

        if url is not None:
            self._conn.execute(
                """
                INSERT OR IGNORE INTO pending_rewards
                    (url, replay_idx, crawled_at)
                VALUES (?, ?, ?)
                """,
                (url, idx, now),
            )

        # Advance write pointer
        self._write_idx = (self._write_idx + 1) % self.config.capacity
        self._size = min(self._size + 1, self.config.capacity)
        self.combined_tree.write_idx = self._write_idx
        self.combined_tree.size = self._size

        # Flush mmap
        self._states_mmap.flush()
        self._next_states_mmap.flush()

        # Periodically persist state
        if self._size % 500 == 0:
            self._save_state()

        return idx

    def sample(self, batch_size: int = 64) -> Tuple[
        np.ndarray,  # states  (B, state_dim)
        np.ndarray,  # actions (B,)
        np.ndarray,  # rewards (B,)
        np.ndarray,  # next_states (B, state_dim)
        np.ndarray,  # dones  (B,)
        np.ndarray,  # is_weights (B,)
        np.ndarray,  # indices (B,)
    ]:
        """PER sampling with exact IS weights using min-tree.

        IS weight formula:
            w_i = (1 / (N * P(i)))^beta / max_weight
            max_weight = (1 / (N * p_min))^beta
        """
        if self._size < batch_size:
            raise ValueError(
                f"Buffer has {self._size} entries, need {batch_size}"
            )

        indices, priorities = self.combined_tree.sample_proportional(batch_size)

        total = self.combined_tree.total
        p_min = self.combined_tree.min_priority()

        # Exact IS weights via min-tree
        probs = priorities / total
        # max_weight = (1 / (N * p_min / total))^beta
        min_prob = p_min / total
        max_weight = (self._size * min_prob) ** (-self._beta)
        weights = (self._size * probs) ** (-self._beta) / max_weight

        # Anneal beta
        self._beta_step += 1
        self._beta = min(
            self.config.beta_end,
            self.config.beta_start
            + (self.config.beta_end - self.config.beta_start)
            * self._beta_step
            / self.config.beta_anneal_steps,
        )

        # Fetch states from mmap
        states = np.array(self._states_mmap[indices])
        next_states = np.array(self._next_states_mmap[indices])

        # Fetch scalar metadata from SQLite
        placeholders = ",".join("?" * batch_size)
        rows = self._conn.execute(
            f"SELECT idx, action, reward, done FROM transitions "
            f"WHERE idx IN ({placeholders}) ORDER BY idx",
            tuple(int(i) for i in indices),
        ).fetchall()

        row_map = {r[0]: r for r in rows}
        actions = np.empty(batch_size, dtype=np.int64)
        rewards = np.empty(batch_size, dtype=np.float32)
        dones = np.empty(batch_size, dtype=np.float32)
        for i, idx_val in enumerate(indices):
            row = row_map.get(int(idx_val))
            if row is not None:
                actions[i] = row[1]
                rewards[i] = row[2]
                dones[i] = float(row[3])
            else:
                actions[i] = 0
                rewards[i] = 0.0
                dones[i] = 1.0

        return states, actions, rewards, next_states, dones, weights.astype(np.float32), indices

    def update_priorities(
        self, indices: np.ndarray, td_errors: np.ndarray
    ) -> None:
        """Update priorities in both sum and min trees."""
        now = time.time()
        for idx, tde in zip(indices, td_errors):
            priority = (abs(tde) + self.config.priority_epsilon) ** self.config.alpha
            self.combined_tree.update(int(idx), float(priority))
            self._conn.execute(
                "UPDATE transitions SET priority = ?, updated_at = ? WHERE idx = ?",
                (float(priority), now, int(idx)),
            )
        self._conn.commit()


# ======================= CategorizedReplayBuffer =============================

@dataclass
class CategoryRatios:
    """Sampling ratios for each transition category.

    Must sum to 1.0.  Ensures rare positive transitions are
    well-represented during training.
    """

    positive: float = 0.40   # reward > 0: leads found
    negative: float = 0.30   # reward < -0.01: irrelevant pages
    neutral: float = 0.20    # reward ~ -0.01: crawl cost only
    pending: float = 0.10    # reward unresolved

    def __post_init__(self) -> None:
        total = self.positive + self.negative + self.neutral + self.pending
        if abs(total - 1.0) > 1e-6:
            raise ValueError(
                f"CategoryRatios must sum to 1.0, got {total:.6f}"
            )


class _CategoryBuffer:
    """Lightweight single-category buffer backed by SumTree + SQLite.

    Stores only indices and priorities; actual state data lives in
    the parent buffer's mmap arrays.  This avoids duplicating the
    large state vectors across categories.
    """

    __slots__ = (
        "name", "capacity", "sum_tree", "write_idx", "size",
        "_idx_to_parent", "_parent_to_local",
    )

    def __init__(self, name: str, capacity: int) -> None:
        self.name = name
        self.capacity = capacity
        self.sum_tree = SumTree(capacity)
        self.write_idx = 0
        self.size = 0
        # Map local idx -> parent buffer idx (for state retrieval)
        self._idx_to_parent = np.full(capacity, -1, dtype=np.int64)
        # Reverse map parent idx -> local idx (for priority updates)
        self._parent_to_local: Dict[int, int] = {}

    def add(self, parent_idx: int, priority: float) -> int:
        """Add entry, mapping to a parent buffer index."""
        local_idx = self.write_idx
        # Evict old mapping if overwriting
        old_parent = self._idx_to_parent[local_idx]
        if old_parent >= 0 and old_parent in self._parent_to_local:
            del self._parent_to_local[old_parent]

        self._idx_to_parent[local_idx] = parent_idx
        self._parent_to_local[parent_idx] = local_idx
        self.sum_tree.update(local_idx, priority)
        self.write_idx = (self.write_idx + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)
        self.sum_tree.write_idx = self.write_idx
        self.sum_tree.size = self.size
        return local_idx

    def update_priority(self, parent_idx: int, priority: float) -> bool:
        """Update priority by parent index.  Returns False if not found."""
        local_idx = self._parent_to_local.get(parent_idx)
        if local_idx is None:
            return False
        self.sum_tree.update(local_idx, priority)
        return True

    def sample(self, count: int) -> List[int]:
        """Sample ``count`` parent indices proportionally.

        Returns empty list if buffer has fewer entries than requested.
        """
        if self.size < count:
            return []
        total = self.sum_tree.total
        if total <= 0:
            return []

        parent_indices = []
        segment = total / count
        for i in range(count):
            lo = segment * i
            hi = segment * (i + 1)
            cumsum = np.random.uniform(lo, hi)
            local_idx, _ = self.sum_tree.get(cumsum)
            parent_idx = self._idx_to_parent[local_idx]
            if parent_idx >= 0:
                parent_indices.append(int(parent_idx))
        return parent_indices


class CategorizedReplayBuffer:
    """Separate PER buffers for different transition categories.

    Categories:
    - **Positive** (reward > 0): pages where leads were found.
    - **Negative** (reward < -0.01): irrelevant pages.
    - **Neutral** (reward ~ -0.01): crawl cost only.
    - **Pending** (reward unresolved): awaiting extraction results.

    Sampling draws from each category according to ``CategoryRatios``,
    then falls back to proportional sampling from the full buffer for
    any shortfall.  This guarantees that rare positive transitions
    appear in training batches even when they represent <1% of data.

    Each category has its own SumTree; state data is shared via the
    parent ``MmapReplayBuffer``'s mmap arrays.
    """

    # Category thresholds
    _POSITIVE_THRESHOLD = 0.0
    _NEGATIVE_THRESHOLD = -0.01

    def __init__(
        self,
        config: Optional[ReplayBufferConfig] = None,
        ratios: Optional[CategoryRatios] = None,
        category_capacity: int = 25_000,
    ) -> None:
        self.config = config or ReplayBufferConfig()
        self.ratios = ratios or CategoryRatios()
        self._parent = MmapReplayBuffer(self.config)

        self._categories: Dict[str, _CategoryBuffer] = {
            "positive": _CategoryBuffer("positive", category_capacity),
            "negative": _CategoryBuffer("negative", category_capacity),
            "neutral": _CategoryBuffer("neutral", category_capacity),
            "pending": _CategoryBuffer("pending", category_capacity),
        }

        logger.info(
            "CategorizedReplayBuffer initialised: ratios=%.0f/%.0f/%.0f/%.0f%%",
            self.ratios.positive * 100,
            self.ratios.negative * 100,
            self.ratios.neutral * 100,
            self.ratios.pending * 100,
        )

    def _classify(self, reward: float, pending: bool) -> str:
        """Determine the category for a transition."""
        if pending:
            return "pending"
        if reward > self._POSITIVE_THRESHOLD:
            return "positive"
        if reward < self._NEGATIVE_THRESHOLD:
            return "negative"
        return "neutral"

    @property
    def size(self) -> int:
        return self._parent.size

    def add(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
        td_error: Optional[float] = None,
        url: Optional[str] = None,
    ) -> int:
        """Add transition to parent buffer and the appropriate category."""
        parent_idx = self._parent.add(
            state, action, reward, next_state, done,
            td_error=td_error, url=url,
        )

        pending = url is not None and reward == 0.0
        category = self._classify(reward, pending)
        priority = self._parent.sum_tree.tree[
            self._parent.sum_tree.capacity + parent_idx
        ]
        self._categories[category].add(parent_idx, priority)

        return parent_idx

    def sample(self, batch_size: int = 64) -> Tuple[
        np.ndarray,  # states  (B, state_dim)
        np.ndarray,  # actions (B,)
        np.ndarray,  # rewards (B,)
        np.ndarray,  # next_states (B, state_dim)
        np.ndarray,  # dones  (B,)
        np.ndarray,  # is_weights (B,)
        np.ndarray,  # indices (B,)
    ]:
        """Sample with category-aware ratios.

        Allocates slots per category, samples from each category's SumTree,
        then fills any shortfall from the parent buffer's proportional
        sampling.
        """
        if self._parent.size < batch_size:
            raise ValueError(
                f"Buffer has {self._parent.size} entries, need {batch_size}"
            )

        # Allocate slots per category
        allocations = {
            "positive": max(1, int(batch_size * self.ratios.positive)),
            "negative": max(1, int(batch_size * self.ratios.negative)),
            "neutral": max(1, int(batch_size * self.ratios.neutral)),
            "pending": max(1, int(batch_size * self.ratios.pending)),
        }

        # Adjust so total matches batch_size
        total_alloc = sum(allocations.values())
        if total_alloc < batch_size:
            allocations["positive"] += batch_size - total_alloc
        elif total_alloc > batch_size:
            # Trim from the largest category
            excess = total_alloc - batch_size
            for cat in ("negative", "neutral", "pending", "positive"):
                trim = min(excess, allocations[cat] - 1)
                allocations[cat] -= trim
                excess -= trim
                if excess == 0:
                    break

        # Sample from each category
        sampled_indices: List[int] = []
        shortfall = 0
        for cat_name, count in allocations.items():
            cat_buf = self._categories[cat_name]
            indices = cat_buf.sample(count)
            sampled_indices.extend(indices)
            shortfall += count - len(indices)

        # Fill shortfall from parent proportional sampling
        if shortfall > 0 and self._parent.sum_tree.total > 0:
            segment = self._parent.sum_tree.total / shortfall
            for i in range(shortfall):
                lo = segment * i
                hi = segment * (i + 1)
                cumsum = np.random.uniform(lo, hi)
                leaf_idx, _ = self._parent.sum_tree.get(cumsum)
                sampled_indices.append(leaf_idx)

        # Trim or pad to exact batch_size
        sampled_indices = sampled_indices[:batch_size]
        while len(sampled_indices) < batch_size:
            cumsum = np.random.uniform(0, self._parent.sum_tree.total)
            leaf_idx, _ = self._parent.sum_tree.get(cumsum)
            sampled_indices.append(leaf_idx)

        indices = np.array(sampled_indices, dtype=np.int64)

        # Compute IS weights from parent sum tree
        priorities = np.array([
            self._parent.sum_tree.tree[self._parent.sum_tree.capacity + idx]
            for idx in indices
        ], dtype=np.float64)
        total = self._parent.sum_tree.total
        probs = priorities / total
        probs = np.clip(probs, 1e-10, None)  # numerical safety
        weights = (self._parent._size * probs) ** (-self._parent._beta)
        weights /= weights.max()

        # Fetch state data from mmap
        states = np.array(self._parent._states_mmap[indices])
        next_states = np.array(self._parent._next_states_mmap[indices])

        # Fetch scalar metadata from SQLite
        placeholders = ",".join("?" * batch_size)
        rows = self._parent._conn.execute(
            f"SELECT idx, action, reward, done FROM transitions "
            f"WHERE idx IN ({placeholders}) ORDER BY idx",
            tuple(int(i) for i in indices),
        ).fetchall()

        row_map = {r[0]: r for r in rows}
        actions = np.empty(batch_size, dtype=np.int64)
        rewards = np.empty(batch_size, dtype=np.float32)
        dones = np.empty(batch_size, dtype=np.float32)
        for i, idx_val in enumerate(indices):
            row = row_map.get(int(idx_val))
            if row is not None:
                actions[i] = row[1]
                rewards[i] = row[2]
                dones[i] = float(row[3])
            else:
                actions[i] = 0
                rewards[i] = 0.0
                dones[i] = 1.0

        return states, actions, rewards, next_states, dones, weights.astype(np.float32), indices

    def update_priorities(
        self, indices: np.ndarray, td_errors: np.ndarray
    ) -> None:
        """Update priorities in both parent buffer and category buffers."""
        self._parent.update_priorities(indices, td_errors)
        for idx, tde in zip(indices, td_errors):
            priority = (
                abs(tde) + self.config.priority_epsilon
            ) ** self.config.alpha
            parent_idx = int(idx)
            for cat_buf in self._categories.values():
                if cat_buf.update_priority(parent_idx, priority):
                    break  # Each transition lives in exactly one category

    def resolve_pending_rewards(
        self, extraction_results: List[Dict[str, Any]]
    ) -> int:
        """Resolve rewards and migrate transitions to the correct category."""
        resolved = self._parent.resolve_pending_rewards(extraction_results)

        # Re-categorize resolved transitions
        for result in extraction_results:
            url = result["url"]
            reward = float(result["reward"])
            row = self._parent._conn.execute(
                "SELECT replay_idx FROM pending_rewards WHERE url = ?",
                (url,),
            ).fetchone()
            if row is None:
                continue
            parent_idx = row[0]

            # Remove from pending category
            pending_buf = self._categories["pending"]
            local_idx = pending_buf._parent_to_local.get(parent_idx)
            if local_idx is not None:
                pending_buf.sum_tree.update(local_idx, 0.0)
                del pending_buf._parent_to_local[parent_idx]
                pending_buf._idx_to_parent[local_idx] = -1

            # Add to correct category
            new_cat = self._classify(reward, pending=False)
            priority = self._parent.sum_tree.tree[
                self._parent.sum_tree.capacity + parent_idx
            ]
            self._categories[new_cat].add(parent_idx, priority)

        return resolved

    def get_category_stats(self) -> Dict[str, int]:
        """Return the number of entries in each category."""
        return {name: buf.size for name, buf in self._categories.items()}

    def flush(self) -> None:
        self._parent.flush()

    def close(self) -> None:
        self._parent.close()

    def __len__(self) -> int:
        return self._parent.size


# ======================= HindsightReplayBuffer ===============================

_HINDSIGHT_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS trajectories (
    trajectory_id TEXT PRIMARY KEY,
    length        INTEGER NOT NULL,
    final_reward  REAL DEFAULT NULL,
    created_at    REAL NOT NULL,
    updated_at    REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS trajectory_transitions (
    trajectory_id TEXT NOT NULL,
    step_idx      INTEGER NOT NULL,
    replay_idx    INTEGER NOT NULL,
    PRIMARY KEY (trajectory_id, step_idx),
    FOREIGN KEY (trajectory_id) REFERENCES trajectories(trajectory_id)
);

CREATE INDEX IF NOT EXISTS idx_traj_replay
    ON trajectory_transitions(replay_idx);
"""


class HindsightReplayBuffer:
    """Replay buffer with trajectory-level storage for hindsight relabeling.

    In web crawling, the true value of a page visit often becomes clear
    only after the full trajectory completes (e.g., a page that seemed
    irrelevant turns out to be one hop from a valuable lead).

    This buffer groups transitions into trajectories and supports atomic
    relabeling: when the final outcome is known, all transitions in the
    trajectory are updated with redistributed rewards and recomputed
    priorities in a single SQLite transaction.
    """

    def __init__(self, config: Optional[ReplayBufferConfig] = None) -> None:
        self.config = config or ReplayBufferConfig()
        self._parent = MmapReplayBuffer(self.config)
        self._init_hindsight_tables()

        logger.info("HindsightReplayBuffer initialised")

    def _init_hindsight_tables(self) -> None:
        """Create trajectory tracking tables."""
        self._parent._conn.executescript(_HINDSIGHT_SCHEMA_SQL)
        self._parent._conn.commit()

    @property
    def size(self) -> int:
        return self._parent.size

    def add_trajectory(self, transitions: List[Dict]) -> str:
        """Store a linked sequence of transitions as a trajectory.

        Each element in ``transitions`` must have keys:
            state, action, reward, next_state, done

        Optional keys:
            td_error, url

        Returns:
            trajectory_id (UUID string) for later relabeling.
        """
        trajectory_id = str(uuid.uuid4())
        now = time.time()

        self._parent._conn.execute(
            """
            INSERT INTO trajectories
                (trajectory_id, length, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (trajectory_id, len(transitions), now, now),
        )

        for step_idx, t in enumerate(transitions):
            replay_idx = self._parent.add(
                state=t["state"],
                action=t["action"],
                reward=t["reward"],
                next_state=t["next_state"],
                done=t["done"],
                td_error=t.get("td_error"),
                url=t.get("url"),
            )
            self._parent._conn.execute(
                """
                INSERT INTO trajectory_transitions
                    (trajectory_id, step_idx, replay_idx)
                VALUES (?, ?, ?)
                """,
                (trajectory_id, step_idx, replay_idx),
            )

        self._parent._conn.commit()
        logger.debug(
            "Stored trajectory %s with %d transitions",
            trajectory_id,
            len(transitions),
        )
        return trajectory_id

    def relabel_trajectory(
        self,
        trajectory_id: str,
        final_reward: float,
        decay: float = 0.95,
    ) -> int:
        """Update all transitions in a trajectory atomically.

        Distributes ``final_reward`` backwards through the trajectory
        using exponential decay:
            reward[step] = final_reward * decay^(length - 1 - step)

        This implements hindsight credit assignment: a successful
        trajectory ending rewards earlier exploratory steps.

        Args:
            trajectory_id: UUID from ``add_trajectory``.
            final_reward: the outcome to distribute backwards.
            decay: per-step decay factor (0 < decay <= 1.0).

        Returns:
            Number of transitions updated.
        """
        # Fetch trajectory info
        traj_row = self._parent._conn.execute(
            "SELECT length FROM trajectories WHERE trajectory_id = ?",
            (trajectory_id,),
        ).fetchone()
        if traj_row is None:
            logger.warning("Trajectory %s not found", trajectory_id)
            return 0

        length = traj_row[0]

        # Fetch all replay indices in order
        rows = self._parent._conn.execute(
            """
            SELECT step_idx, replay_idx FROM trajectory_transitions
            WHERE trajectory_id = ?
            ORDER BY step_idx
            """,
            (trajectory_id,),
        ).fetchall()

        if not rows:
            return 0

        now = time.time()
        updated = 0

        # Atomic update in a single transaction
        for step_idx, replay_idx in rows:
            # Exponential decay from the end
            relabeled_reward = final_reward * (decay ** (length - 1 - step_idx))

            # Update transition reward
            self._parent._conn.execute(
                "UPDATE transitions SET reward = ?, updated_at = ? WHERE idx = ?",
                (relabeled_reward, now, replay_idx),
            )

            # Recompute priority from relabeled reward
            priority = (
                abs(relabeled_reward) + self.config.priority_epsilon
            ) ** self.config.alpha
            self._parent.sum_tree.update(replay_idx, float(priority))
            self._parent._conn.execute(
                "UPDATE transitions SET priority = ? WHERE idx = ?",
                (float(priority), replay_idx),
            )
            updated += 1

        # Record final reward on trajectory
        self._parent._conn.execute(
            """
            UPDATE trajectories
            SET final_reward = ?, updated_at = ?
            WHERE trajectory_id = ?
            """,
            (final_reward, now, trajectory_id),
        )

        self._parent._conn.commit()
        logger.info(
            "Relabeled trajectory %s: %d transitions, final_reward=%.4f",
            trajectory_id,
            updated,
            final_reward,
        )
        return updated

    def get_trajectory_ids(
        self, unlabeled_only: bool = False, limit: int = 100
    ) -> List[str]:
        """List trajectory IDs, optionally filtering to unlabeled ones."""
        if unlabeled_only:
            rows = self._parent._conn.execute(
                """
                SELECT trajectory_id FROM trajectories
                WHERE final_reward IS NULL
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        else:
            rows = self._parent._conn.execute(
                """
                SELECT trajectory_id FROM trajectories
                ORDER BY created_at DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [r[0] for r in rows]

    def get_trajectory_transitions(
        self, trajectory_id: str
    ) -> List[Dict[str, Any]]:
        """Fetch all transitions for a trajectory in step order."""
        rows = self._parent._conn.execute(
            """
            SELECT tt.step_idx, tt.replay_idx, t.action, t.reward, t.done, t.priority
            FROM trajectory_transitions tt
            JOIN transitions t ON t.idx = tt.replay_idx
            WHERE tt.trajectory_id = ?
            ORDER BY tt.step_idx
            """,
            (trajectory_id,),
        ).fetchall()

        return [
            {
                "step_idx": r[0],
                "replay_idx": r[1],
                "action": r[2],
                "reward": r[3],
                "done": bool(r[4]),
                "priority": r[5],
            }
            for r in rows
        ]

    def sample(self, batch_size: int = 64) -> Tuple[
        np.ndarray, np.ndarray, np.ndarray, np.ndarray,
        np.ndarray, np.ndarray, np.ndarray,
    ]:
        """Delegate to parent buffer's PER sampling."""
        return self._parent.sample(batch_size)

    def update_priorities(
        self, indices: np.ndarray, td_errors: np.ndarray
    ) -> None:
        self._parent.update_priorities(indices, td_errors)

    def flush(self) -> None:
        self._parent.flush()

    def close(self) -> None:
        self._parent.close()

    def __len__(self) -> int:
        return self._parent.size


# ======================= LazyPriorityReplayBuffer ============================

@dataclass
class LazyConfig:
    """Configuration for lazy priority update batching."""

    flush_every_n_samples: int = 64  # Flush after this many sample() calls
    max_pending_updates: int = 4096  # Force flush above this count


class LazyPriorityReplayBuffer:
    """Replay buffer with lazy (batched) priority updates.

    Instead of writing each priority update to SQLite immediately,
    accumulates TD errors in memory and flushes in bulk.  This reduces
    SQLite writes by ~90% during tight training loops where
    ``update_priorities`` is called after every sample().

    The SumTree is updated eagerly (it is in-memory and fast).  Only
    the SQLite ``transitions.priority`` column is deferred.

    Lifecycle:
        buffer.sample(64)
        # ... compute TD errors ...
        buffer.schedule_priority_update(indices, td_errors)
        # ... repeat many times ...
        buffer.flush_priority_updates()  # bulk SQLite write
    """

    def __init__(
        self,
        config: Optional[ReplayBufferConfig] = None,
        lazy_config: Optional[LazyConfig] = None,
    ) -> None:
        self.config = config or ReplayBufferConfig()
        self.lazy_config = lazy_config or LazyConfig()
        self._parent = MmapReplayBuffer(self.config)

        # Pending priority updates: idx -> (priority, timestamp)
        self._pending_updates: Dict[int, Tuple[float, float]] = {}
        self._samples_since_flush = 0

        # Stats
        self._total_scheduled = 0
        self._total_flushed = 0
        self._flush_count = 0

        logger.info(
            "LazyPriorityReplayBuffer initialised: flush_every=%d, max_pending=%d",
            self.lazy_config.flush_every_n_samples,
            self.lazy_config.max_pending_updates,
        )

    @property
    def size(self) -> int:
        return self._parent.size

    def add(
        self,
        state: np.ndarray,
        action: int,
        reward: float,
        next_state: np.ndarray,
        done: bool,
        td_error: Optional[float] = None,
        url: Optional[str] = None,
    ) -> int:
        """Add transition (delegates to parent)."""
        return self._parent.add(
            state, action, reward, next_state, done,
            td_error=td_error, url=url,
        )

    def sample(self, batch_size: int = 64) -> Tuple[
        np.ndarray, np.ndarray, np.ndarray, np.ndarray,
        np.ndarray, np.ndarray, np.ndarray,
    ]:
        """PER sampling; may trigger a lazy flush."""
        self._samples_since_flush += 1
        if self._samples_since_flush >= self.lazy_config.flush_every_n_samples:
            self.flush_priority_updates()
        return self._parent.sample(batch_size)

    def schedule_priority_update(
        self, indices: np.ndarray, td_errors: np.ndarray
    ) -> None:
        """Accumulate priority updates without writing to SQLite.

        The SumTree is updated immediately (in-memory, fast).
        SQLite writes are deferred until ``flush_priority_updates()``.

        If the same index is scheduled multiple times before a flush,
        only the latest TD error is kept.
        """
        now = time.time()
        for idx, tde in zip(indices, td_errors):
            idx_int = int(idx)
            priority = (
                abs(tde) + self.config.priority_epsilon
            ) ** self.config.alpha

            # Eagerly update SumTree (cheap, in-memory)
            self._parent.sum_tree.update(idx_int, float(priority))

            # Defer SQLite write
            self._pending_updates[idx_int] = (float(priority), now)
            self._total_scheduled += 1

        # Force flush if too many pending
        if len(self._pending_updates) >= self.lazy_config.max_pending_updates:
            self.flush_priority_updates()

    def flush_priority_updates(self) -> int:
        """Bulk-write all pending priority updates to SQLite.

        Returns the number of rows updated.
        """
        if not self._pending_updates:
            self._samples_since_flush = 0
            return 0

        count = len(self._pending_updates)
        conn = self._parent._conn

        # Batch update using executemany for efficiency
        conn.executemany(
            "UPDATE transitions SET priority = ?, updated_at = ? WHERE idx = ?",
            [
                (priority, ts, idx)
                for idx, (priority, ts) in self._pending_updates.items()
            ],
        )
        conn.commit()

        self._total_flushed += count
        self._flush_count += 1
        self._pending_updates.clear()
        self._samples_since_flush = 0

        logger.debug("Flushed %d priority updates to SQLite", count)
        return count

    def update_priorities(
        self, indices: np.ndarray, td_errors: np.ndarray
    ) -> None:
        """Alias for schedule_priority_update (drop-in API compatibility)."""
        self.schedule_priority_update(indices, td_errors)

    def get_lazy_stats(self) -> Dict[str, Any]:
        """Return lazy update diagnostics."""
        return {
            "pending_updates": len(self._pending_updates),
            "total_scheduled": self._total_scheduled,
            "total_flushed": self._total_flushed,
            "flush_count": self._flush_count,
            "samples_since_flush": self._samples_since_flush,
            "write_reduction_pct": round(
                (1.0 - self._flush_count / max(1, self._total_scheduled)) * 100,
                1,
            ),
        }

    def resolve_pending_rewards(
        self, extraction_results: List[Dict[str, Any]]
    ) -> int:
        return self._parent.resolve_pending_rewards(extraction_results)

    def flush(self) -> None:
        """Flush everything: lazy updates + parent data."""
        self.flush_priority_updates()
        self._parent.flush()

    def close(self) -> None:
        self.flush()
        self._parent.close()

    def __len__(self) -> int:
        return self._parent.size
