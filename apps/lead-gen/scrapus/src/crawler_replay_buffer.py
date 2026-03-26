"""
Module 1: Memory-mapped NumPy replay buffer with SQLite metadata.

Replaces the LanceDB-based replay buffer (~150 MB) with:
- NumPy mmap arrays for zero-copy state/next_state access (3-8 MB active RAM)
- SQLite for metadata, priorities, and pending reward tracking
- Prioritised Experience Replay (PER) with alpha/beta annealing

Budget: 3-8 MB active RAM for 100K transitions.
Disk: ~700 MB for 100K transitions with 784-dim states.

Target: Apple M1 16GB, zero cloud dependency.
"""

import gc
import logging
import os
import sqlite3
import struct
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_replay_buffer")


# ======================= Configuration ======================================

@dataclass
class ReplayBufferConfig:
    """Configuration for the mmap + SQLite replay buffer."""

    capacity: int = 100_000
    state_dim: int = 784  # 768 nomic embed + 16 scalar features

    # PER parameters (Schaul et al. 2015)
    alpha: float = 0.6  # Priority exponent (0=uniform, 1=full priority)
    beta_start: float = 0.4  # IS correction start
    beta_end: float = 1.0  # IS correction end
    beta_anneal_steps: int = 200_000  # Steps to anneal beta to 1.0
    priority_epsilon: float = 1e-6  # Small constant to prevent zero priority

    # Storage paths
    data_dir: str = "scrapus_data/replay_buffer"
    states_filename: str = "states.npy"
    next_states_filename: str = "next_states.npy"
    metadata_db: str = "replay_meta.db"

    # N-step returns
    n_step: int = 5
    gamma: float = 0.99

    # Maintenance
    prune_interval_steps: int = 10_000


# ======================= Segment Tree for PER ===============================

class SumTree:
    """Binary sum tree for O(log N) proportional sampling.

    Stores priorities at leaves; internal nodes hold partial sums.
    Memory: 2 * capacity * 8 bytes ~= 1.6 MB for 100K entries.
    """

    __slots__ = ("capacity", "tree", "write_idx", "size")

    def __init__(self, capacity: int) -> None:
        self.capacity = capacity
        self.tree = np.zeros(2 * capacity, dtype=np.float64)
        self.write_idx = 0
        self.size = 0

    def _propagate(self, idx: int, change: float) -> None:
        parent = idx >> 1
        while parent >= 1:
            self.tree[parent] += change
            parent >>= 1

    def update(self, leaf_idx: int, priority: float) -> None:
        """Update priority for a specific leaf."""
        tree_idx = self.capacity + leaf_idx
        change = priority - self.tree[tree_idx]
        self.tree[tree_idx] = priority
        self._propagate(tree_idx, change)

    def add(self, priority: float) -> int:
        """Add new entry; returns the leaf index used."""
        leaf_idx = self.write_idx
        self.update(leaf_idx, priority)
        self.write_idx = (self.write_idx + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)
        return leaf_idx

    def get(self, cumsum: float) -> Tuple[int, float]:
        """Find leaf index for a given cumulative sum (proportional sampling).

        Returns (leaf_index, priority).
        """
        idx = 1  # root
        while idx < self.capacity:
            left = 2 * idx
            right = left + 1
            if cumsum <= self.tree[left]:
                idx = left
            else:
                cumsum -= self.tree[left]
                idx = right
        leaf_idx = idx - self.capacity
        return leaf_idx, self.tree[idx]

    @property
    def total(self) -> float:
        return self.tree[1]

    def max_priority(self) -> float:
        """Return the maximum priority among all leaves."""
        leaves = self.tree[self.capacity : self.capacity + self.size]
        return float(np.max(leaves)) if self.size > 0 else 1.0


# ======================= SQLite Metadata Schema =============================

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS transitions (
    idx        INTEGER PRIMARY KEY,
    action     INTEGER NOT NULL,
    reward     REAL NOT NULL,
    done       INTEGER NOT NULL,  -- 0/1
    priority   REAL NOT NULL,
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS pending_rewards (
    url         TEXT PRIMARY KEY,
    replay_idx  INTEGER NOT NULL,
    crawled_at  REAL NOT NULL,
    reward      REAL DEFAULT NULL,
    resolved_at REAL DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_pending_unresolved
    ON pending_rewards(reward) WHERE reward IS NULL;

CREATE TABLE IF NOT EXISTS buffer_stats (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


# ======================= Memory-Mapped Replay Buffer ========================

class MmapReplayBuffer:
    """Prioritised Experience Replay backed by mmap NumPy + SQLite.

    Architecture:
    - Two mmap files (states.npy, next_states.npy): zero-copy array access.
      Only the OS page cache determines what is resident; the process itself
      uses <1 MB of address-space overhead.
    - SumTree: O(log N) proportional sampling for PER.
    - SQLite: actions, rewards, done flags, priorities, pending rewards.
    - Beta annealing: importance-sampling correction grows from 0.4 to 1.0.

    Active RAM: 3-8 MB (sum tree + SQLite page cache + Python objects).
    Disk: ~700 MB for 100K transitions @ 784 dims.
    """

    def __init__(self, config: Optional[ReplayBufferConfig] = None) -> None:
        self.config = config or ReplayBufferConfig()
        self.data_dir = Path(self.config.data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # mmap arrays
        self._states_mmap: Optional[np.ndarray] = None
        self._next_states_mmap: Optional[np.ndarray] = None
        self._init_mmap_arrays()

        # Priority tree
        self.sum_tree = SumTree(self.config.capacity)

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

        # Restore state from SQLite if resuming
        self._restore_state()

        logger.info(
            "MmapReplayBuffer initialised: capacity=%d, state_dim=%d, "
            "data_dir=%s, size=%d",
            self.config.capacity,
            self.config.state_dim,
            self.data_dir,
            self._size,
        )

    # ---- Initialisation -----------------------------------------------------

    def _init_mmap_arrays(self) -> None:
        """Create or open mmap files for states and next_states."""
        shape = (self.config.capacity, self.config.state_dim)
        dtype = np.float32

        for attr, fname in [
            ("_states_mmap", self.config.states_filename),
            ("_next_states_mmap", self.config.next_states_filename),
        ]:
            path = self.data_dir / fname
            if path.exists():
                arr = np.memmap(str(path), dtype=dtype, mode="r+", shape=shape)
            else:
                arr = np.memmap(str(path), dtype=dtype, mode="w+", shape=shape)
            setattr(self, attr, arr)

    def _init_sqlite(self) -> None:
        """Open SQLite connection and create tables if needed."""
        self._conn = sqlite3.connect(self._db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.execute("PRAGMA mmap_size = 67108864")  # 64 MB mmap
        self._conn.execute("PRAGMA cache_size = -32768")  # 32 MB
        self._conn.executescript(_SCHEMA_SQL)
        self._conn.commit()

    def _restore_state(self) -> None:
        """Restore write index and size from SQLite after restart."""
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
            self.sum_tree.write_idx = self._write_idx
            self.sum_tree.size = self._size

            # Rebuild sum tree priorities from SQLite
            cur = self._conn.execute(
                "SELECT idx, priority FROM transitions ORDER BY idx"
            )
            for idx, priority in cur:
                self.sum_tree.update(idx, priority)

    def _save_state(self) -> None:
        """Persist write pointer to SQLite."""
        self._conn.execute(
            "INSERT OR REPLACE INTO buffer_stats(key, value) VALUES('write_idx', ?)",
            (str(self._write_idx),),
        )
        self._conn.execute(
            "INSERT OR REPLACE INTO buffer_stats(key, value) VALUES('size', ?)",
            (str(self._size),),
        )
        self._conn.commit()

    # ---- Core API -----------------------------------------------------------

    @property
    def size(self) -> int:
        return self._size

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
        """Add a transition to the buffer.

        Args:
            state: (state_dim,) float32.
            action: integer action index.
            reward: scalar reward.
            next_state: (state_dim,) float32.
            done: episode termination flag.
            td_error: initial TD error for priority; defaults to max priority.
            url: if set, registers a pending_reward entry for async reward patching.

        Returns:
            The buffer index where the transition was stored.
        """
        idx = self._write_idx

        # Write state vectors to mmap (zero-copy on read)
        self._states_mmap[idx] = state.astype(np.float32)
        self._next_states_mmap[idx] = next_state.astype(np.float32)

        # Priority
        if td_error is not None:
            priority = (abs(td_error) + self.config.priority_epsilon) ** self.config.alpha
        else:
            priority = self.sum_tree.max_priority()
            if priority == 0.0:
                priority = 1.0

        self.sum_tree.update(idx, priority)

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

        # Flush to mmap
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
        """Proportional PER sampling.

        Returns numpy arrays ready for torch conversion.
        """
        if self._size < batch_size:
            raise ValueError(
                f"Buffer has {self._size} entries, need {batch_size}"
            )

        indices = np.empty(batch_size, dtype=np.int64)
        priorities = np.empty(batch_size, dtype=np.float64)
        total = self.sum_tree.total

        segment = total / batch_size
        for i in range(batch_size):
            lo = segment * i
            hi = segment * (i + 1)
            cumsum = np.random.uniform(lo, hi)
            leaf_idx, prio = self.sum_tree.get(cumsum)
            indices[i] = leaf_idx
            priorities[i] = prio

        # Importance-sampling weights
        probs = priorities / total
        weights = (self._size * probs) ** (-self._beta)
        weights /= weights.max()

        # Anneal beta
        self._beta_step += 1
        self._beta = min(
            self.config.beta_end,
            self.config.beta_start
            + (self.config.beta_end - self.config.beta_start)
            * self._beta_step
            / self.config.beta_anneal_steps,
        )

        # Fetch states from mmap (zero-copy: OS handles paging)
        states = np.array(self._states_mmap[indices])
        next_states = np.array(self._next_states_mmap[indices])

        # Fetch scalar metadata from SQLite
        placeholders = ",".join("?" * batch_size)
        rows = self._conn.execute(
            f"SELECT idx, action, reward, done FROM transitions "
            f"WHERE idx IN ({placeholders}) ORDER BY idx",
            tuple(int(i) for i in indices),
        ).fetchall()

        # Build a lookup; handle potential ordering mismatch
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
                # Stale index; fill with neutral values
                actions[i] = 0
                rewards[i] = 0.0
                dones[i] = 1.0

        return states, actions, rewards, next_states, dones, weights.astype(np.float32), indices

    def update_priorities(
        self, indices: np.ndarray, td_errors: np.ndarray
    ) -> None:
        """Update priorities after a training step."""
        now = time.time()
        for idx, tde in zip(indices, td_errors):
            priority = (abs(tde) + self.config.priority_epsilon) ** self.config.alpha
            self.sum_tree.update(int(idx), float(priority))
            self._conn.execute(
                "UPDATE transitions SET priority = ?, updated_at = ? WHERE idx = ?",
                (float(priority), now, int(idx)),
            )
        self._conn.commit()

    # ---- Async reward patching (credit assignment) -------------------------

    def resolve_pending_rewards(
        self, extraction_results: List[Dict[str, Any]]
    ) -> int:
        """Patch rewards from the extraction module.

        When extraction finishes for a URL, update both pending_rewards and
        the corresponding replay buffer transition.  Until resolved, the
        transition uses reward=0.

        Returns the number of rewards resolved.
        """
        resolved = 0
        now = time.time()
        for result in extraction_results:
            url = result["url"]
            reward = float(result["reward"])

            row = self._conn.execute(
                "SELECT replay_idx FROM pending_rewards WHERE url = ? AND reward IS NULL",
                (url,),
            ).fetchone()
            if row is None:
                continue

            replay_idx = row[0]
            self._conn.execute(
                "UPDATE pending_rewards SET reward = ?, resolved_at = ? "
                "WHERE url = ? AND reward IS NULL",
                (reward, now, url),
            )
            self._conn.execute(
                "UPDATE transitions SET reward = ?, updated_at = ? WHERE idx = ?",
                (reward, now, replay_idx),
            )
            resolved += 1

        if resolved > 0:
            self._conn.commit()
            logger.info("Resolved %d pending rewards", resolved)

        return resolved

    def count_unresolved(self) -> int:
        """Count pending reward entries not yet resolved."""
        row = self._conn.execute(
            "SELECT COUNT(*) FROM pending_rewards WHERE reward IS NULL"
        ).fetchone()
        return row[0] if row else 0

    # ---- N-Step Return Buffer ==============================================

    def compute_nstep_targets(
        self,
        indices: np.ndarray,
        bootstrap_q_fn: Any,
    ) -> np.ndarray:
        """Compute n-step discounted returns for sampled transitions.

        For each sampled index i, look ahead n steps in the circular buffer
        and compute: sum_{k=0}^{n-1} gamma^k * r_{i+k} + gamma^n * Q(s_{i+n}).

        Args:
            indices: (B,) array of buffer indices.
            bootstrap_q_fn: callable(states) -> (B,) max Q-values.

        Returns:
            (B,) n-step return targets.
        """
        n = self.config.n_step
        gamma = self.config.gamma
        batch_size = len(indices)
        targets = np.zeros(batch_size, dtype=np.float32)

        for b, start_idx in enumerate(indices):
            discounted_sum = 0.0
            final_done = False
            lookahead_idx = int(start_idx)

            for step in range(n):
                next_idx = (lookahead_idx + step) % self.config.capacity
                if next_idx >= self._size:
                    break
                row = self._conn.execute(
                    "SELECT reward, done FROM transitions WHERE idx = ?",
                    (next_idx,),
                ).fetchone()
                if row is None:
                    break
                r, d = row
                discounted_sum += (gamma ** step) * r
                if d:
                    final_done = True
                    break

            if not final_done:
                # Bootstrap from Q-network at the n-th state
                bootstrap_idx = (int(start_idx) + n) % self.config.capacity
                if bootstrap_idx < self._size:
                    bootstrap_state = np.array(
                        self._next_states_mmap[bootstrap_idx]
                    )[np.newaxis, :]
                    bootstrap_val = bootstrap_q_fn(bootstrap_state)
                    discounted_sum += (gamma ** n) * float(bootstrap_val)

            targets[b] = discounted_sum

        return targets

    # ---- Maintenance --------------------------------------------------------

    def prune_old_pending(self, max_age_seconds: float = 7 * 86400) -> int:
        """Remove pending reward entries older than max_age."""
        cutoff = time.time() - max_age_seconds
        cur = self._conn.execute(
            "DELETE FROM pending_rewards WHERE crawled_at < ? AND reward IS NULL",
            (cutoff,),
        )
        self._conn.commit()
        deleted = cur.rowcount
        if deleted > 0:
            logger.info("Pruned %d stale pending reward entries", deleted)
        return deleted

    def get_buffer_stats(self) -> Dict[str, Any]:
        """Return diagnostic statistics."""
        unresolved = self.count_unresolved()
        return {
            "size": self._size,
            "capacity": self.config.capacity,
            "write_idx": self._write_idx,
            "beta": round(self._beta, 4),
            "sum_tree_total": round(self.sum_tree.total, 4),
            "max_priority": round(self.sum_tree.max_priority(), 6),
            "unresolved_rewards": unresolved,
            "disk_mb": round(self._disk_usage_mb(), 2),
        }

    def _disk_usage_mb(self) -> float:
        """Estimate total disk usage of the replay buffer."""
        total = 0.0
        for path in self.data_dir.iterdir():
            total += path.stat().st_size
        return total / (1024 * 1024)

    # ---- Cleanup ------------------------------------------------------------

    def flush(self) -> None:
        """Flush all data to disk."""
        self._states_mmap.flush()
        self._next_states_mmap.flush()
        self._save_state()
        self._conn.commit()

    def close(self) -> None:
        """Release resources."""
        self.flush()
        if self._conn:
            self._conn.close()
            self._conn = None

        # Delete mmap references so the OS can reclaim pages
        del self._states_mmap
        del self._next_states_mmap
        self._states_mmap = None
        self._next_states_mmap = None

        gc.collect()
        logger.info("MmapReplayBuffer closed")

    def __len__(self) -> int:
        return self._size

    def __del__(self) -> None:
        try:
            self.close()
        except Exception:
            pass
