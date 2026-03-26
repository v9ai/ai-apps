"""
Trajectory storage for Decision Transformer training and episode analysis.

Stores complete episodes (sequences of transitions) with computed returns-to-go
for offline RL training. Uses the same mmap + SQLite architecture as the replay
buffer for consistency and memory efficiency.

Architecture:
- SQLite for episode/transition metadata and indexing
- NumPy mmap arrays for state vectors (zero-copy on read)
- Returns-to-go computed at episode end for Decision Transformer

Budget: 5-15 MB active RAM for 50K trajectories.
Disk: proportional to episodes * avg_length * state_dim * 4 bytes.

Target: Apple M1 16GB, zero cloud dependency.
"""

import gc
import logging
import os
import sqlite3
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_trajectory_store")


# ======================= Configuration ======================================

@dataclass
class TrajectoryConfig:
    """Configuration for the trajectory store."""

    db_path: str = "scrapus_data/trajectories.db"
    max_trajectories: int = 50_000
    states_dir: str = "scrapus_data/trajectory_states"
    max_episode_length: int = 500
    state_dim: int = 784  # 768 nomic embed + 16 scalar features
    prune_threshold: float = 0.0  # keep trajectories with return > threshold


# ======================= Data Classes =======================================

@dataclass
class Transition:
    """A single (s, a, r, s', done) transition within an episode."""

    state: np.ndarray  # (784,)
    action: int
    reward: float
    next_state: np.ndarray  # (784,)
    done: bool
    url: str
    domain: str
    depth: int
    timestamp: float


@dataclass
class Episode:
    """A complete episode: ordered sequence of transitions with metadata."""

    episode_id: int
    transitions: List[Transition]
    total_reward: float
    returns_to_go: np.ndarray  # (length,) computed from rewards for DT
    domain: str  # primary domain
    length: int
    start_time: float
    end_time: float


# ======================= SQLite Schema ======================================

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS episodes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    domain      TEXT NOT NULL,
    length      INTEGER NOT NULL DEFAULT 0,
    total_reward REAL NOT NULL DEFAULT 0.0,
    start_time  REAL NOT NULL,
    end_time    REAL DEFAULT NULL,
    status      TEXT NOT NULL DEFAULT 'active'  -- active, complete, pruned
);

CREATE TABLE IF NOT EXISTS transitions (
    episode_id   INTEGER NOT NULL,
    step         INTEGER NOT NULL,
    action       INTEGER NOT NULL,
    reward       REAL NOT NULL,
    done         INTEGER NOT NULL,  -- 0/1
    url          TEXT NOT NULL,
    domain       TEXT NOT NULL,
    depth        INTEGER NOT NULL,
    state_offset INTEGER NOT NULL,  -- byte offset into mmap file
    PRIMARY KEY (episode_id, step),
    FOREIGN KEY (episode_id) REFERENCES episodes(id)
);

CREATE INDEX IF NOT EXISTS idx_episodes_status
    ON episodes(status);

CREATE INDEX IF NOT EXISTS idx_episodes_total_reward
    ON episodes(total_reward);

CREATE INDEX IF NOT EXISTS idx_transitions_episode
    ON transitions(episode_id);

CREATE TABLE IF NOT EXISTS store_stats (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""


# ======================= Trajectory Store ===================================

class TrajectoryStore:
    """Episode-level trajectory storage backed by mmap NumPy + SQLite.

    Architecture:
    - Two mmap files (states.npy, next_states.npy): zero-copy state access.
      States are written contiguously per-episode; the state_offset column in
      SQLite maps each transition to its row in the mmap array.
    - SQLite: episode metadata, transition scalars, indexing.

    Active RAM: 5-15 MB (SQLite page cache + Python objects).
    Disk: proportional to total transitions stored.
    """

    def __init__(self, config: Optional[TrajectoryConfig] = None) -> None:
        self.config = config or TrajectoryConfig()
        self.states_dir = Path(self.config.states_dir)
        self.states_dir.mkdir(parents=True, exist_ok=True)

        # mmap arrays
        self._states_mmap: Optional[np.ndarray] = None
        self._next_states_mmap: Optional[np.ndarray] = None
        self._mmap_capacity: int = self.config.max_trajectories * 20  # avg 20 steps
        self._init_mmap_arrays()

        # SQLite metadata
        self._conn: Optional[sqlite3.Connection] = None
        self._init_sqlite()

        # Write position for mmap (next row to write)
        self._state_write_idx: int = 0
        self._restore_state()

        logger.info(
            "TrajectoryStore initialised: max_trajectories=%d, state_dim=%d, "
            "states_dir=%s, mmap_capacity=%d",
            self.config.max_trajectories,
            self.config.state_dim,
            self.states_dir,
            self._mmap_capacity,
        )

    # ---- Initialisation -----------------------------------------------------

    def _init_mmap_arrays(self) -> None:
        """Create or open mmap files for states and next_states."""
        shape = (self._mmap_capacity, self.config.state_dim)
        dtype = np.float32

        for attr, fname in [
            ("_states_mmap", "traj_states.npy"),
            ("_next_states_mmap", "traj_next_states.npy"),
        ]:
            path = self.states_dir / fname
            if path.exists():
                arr = np.memmap(str(path), dtype=dtype, mode="r+", shape=shape)
            else:
                arr = np.memmap(str(path), dtype=dtype, mode="w+", shape=shape)
            setattr(self, attr, arr)

    def _init_sqlite(self) -> None:
        """Open SQLite connection and create tables if needed."""
        db_dir = Path(self.config.db_path).parent
        db_dir.mkdir(parents=True, exist_ok=True)

        self._conn = sqlite3.connect(self.config.db_path)
        self._conn.execute("PRAGMA journal_mode = WAL")
        self._conn.execute("PRAGMA synchronous = NORMAL")
        self._conn.execute("PRAGMA mmap_size = 67108864")  # 64 MB mmap
        self._conn.execute("PRAGMA cache_size = -32768")  # 32 MB
        self._conn.executescript(_SCHEMA_SQL)
        self._conn.commit()

    def _restore_state(self) -> None:
        """Restore write position from SQLite after restart."""
        cur = self._conn.execute(
            "SELECT value FROM store_stats WHERE key = 'state_write_idx'"
        )
        row = cur.fetchone()
        if row:
            self._state_write_idx = int(row[0])

    def _save_state(self) -> None:
        """Persist write pointer to SQLite."""
        self._conn.execute(
            "INSERT OR REPLACE INTO store_stats(key, value) VALUES('state_write_idx', ?)",
            (str(self._state_write_idx),),
        )
        self._conn.commit()

    # ---- Core API -----------------------------------------------------------

    def start_episode(self, domain: str) -> int:
        """Start a new episode for a given domain.

        Returns:
            The episode_id for use with add_transition/end_episode.
        """
        now = time.time()
        cur = self._conn.execute(
            "INSERT INTO episodes (domain, length, total_reward, start_time, status) "
            "VALUES (?, 0, 0.0, ?, 'active')",
            (domain, now),
        )
        self._conn.commit()
        episode_id = cur.lastrowid

        logger.debug("Started episode %d for domain %s", episode_id, domain)
        return episode_id

    def add_transition(self, episode_id: int, transition: Transition) -> None:
        """Add a transition to an active episode.

        Writes state vectors to mmap and scalar metadata to SQLite.
        """
        # Check episode exists and is active
        row = self._conn.execute(
            "SELECT length, status FROM episodes WHERE id = ?",
            (episode_id,),
        ).fetchone()
        if row is None:
            raise ValueError(f"Episode {episode_id} not found")
        if row[1] != "active":
            raise ValueError(f"Episode {episode_id} is not active (status={row[1]})")

        current_length = row[0]

        # Enforce max episode length
        if current_length >= self.config.max_episode_length:
            logger.warning(
                "Episode %d reached max length %d, ignoring transition",
                episode_id,
                self.config.max_episode_length,
            )
            return

        # Expand mmap if needed
        if self._state_write_idx >= self._mmap_capacity:
            self._expand_mmap()

        # Write state vectors to mmap
        state_offset = self._state_write_idx
        self._states_mmap[state_offset] = transition.state.astype(np.float32)
        self._next_states_mmap[state_offset] = transition.next_state.astype(np.float32)
        self._state_write_idx += 1

        # Write scalar metadata to SQLite
        self._conn.execute(
            """
            INSERT INTO transitions
                (episode_id, step, action, reward, done, url, domain, depth, state_offset)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                episode_id,
                current_length,
                transition.action,
                transition.reward,
                int(transition.done),
                transition.url,
                transition.domain,
                transition.depth,
                state_offset,
            ),
        )

        # Update episode length and total reward
        self._conn.execute(
            "UPDATE episodes SET length = length + 1, total_reward = total_reward + ? "
            "WHERE id = ?",
            (transition.reward, episode_id),
        )
        self._conn.commit()

        # Periodic mmap flush and state save
        if self._state_write_idx % 100 == 0:
            self._states_mmap.flush()
            self._next_states_mmap.flush()
            self._save_state()

    def end_episode(self, episode_id: int) -> None:
        """Finalise an episode: compute returns-to-go, store summary.

        Marks the episode as complete and computes returns-to-go for all
        transitions in the episode (used by Decision Transformer training).
        """
        row = self._conn.execute(
            "SELECT domain, length, total_reward, start_time, status FROM episodes WHERE id = ?",
            (episode_id,),
        ).fetchone()
        if row is None:
            raise ValueError(f"Episode {episode_id} not found")
        if row[4] != "active":
            logger.warning("Episode %d already finalised (status=%s)", episode_id, row[4])
            return

        now = time.time()
        self._conn.execute(
            "UPDATE episodes SET status = 'complete', end_time = ? WHERE id = ?",
            (now, episode_id),
        )
        self._conn.commit()

        # Flush mmap and save state
        self._states_mmap.flush()
        self._next_states_mmap.flush()
        self._save_state()

        # Enforce max trajectories: prune oldest if over limit
        total = self._conn.execute(
            "SELECT COUNT(*) FROM episodes WHERE status = 'complete'"
        ).fetchone()[0]
        if total > self.config.max_trajectories:
            excess = total - self.config.max_trajectories
            self._prune_oldest(excess)

        logger.debug(
            "Ended episode %d: length=%d, total_reward=%.4f",
            episode_id,
            row[1],
            row[2],
        )

    def get_episode(self, episode_id: int) -> Episode:
        """Load a complete episode with all transitions and returns-to-go.

        Returns:
            Episode with transitions loaded from mmap + SQLite.
        """
        row = self._conn.execute(
            "SELECT id, domain, length, total_reward, start_time, end_time "
            "FROM episodes WHERE id = ?",
            (episode_id,),
        ).fetchone()
        if row is None:
            raise ValueError(f"Episode {episode_id} not found")

        ep_id, domain, length, total_reward, start_time, end_time = row
        end_time = end_time or time.time()

        # Load transitions
        transitions = self._load_transitions(ep_id)

        # Compute returns-to-go
        rewards = np.array([t.reward for t in transitions], dtype=np.float32)
        returns_to_go = self.compute_returns_to_go(rewards)

        return Episode(
            episode_id=ep_id,
            transitions=transitions,
            total_reward=total_reward,
            returns_to_go=returns_to_go,
            domain=domain,
            length=length,
            start_time=start_time,
            end_time=end_time,
        )

    def get_episodes(
        self,
        min_return: float = 0.0,
        max_episodes: int = 1000,
    ) -> List[Episode]:
        """Load multiple episodes filtered by minimum return.

        Args:
            min_return: minimum total_reward to include.
            max_episodes: maximum number of episodes to return.

        Returns:
            List of Episode objects, ordered by total_reward descending.
        """
        rows = self._conn.execute(
            "SELECT id FROM episodes "
            "WHERE status = 'complete' AND total_reward >= ? "
            "ORDER BY total_reward DESC LIMIT ?",
            (min_return, max_episodes),
        ).fetchall()

        episodes = []
        for (ep_id,) in rows:
            try:
                episodes.append(self.get_episode(ep_id))
            except Exception as exc:
                logger.warning("Failed to load episode %d: %s", ep_id, exc)
        return episodes

    def sample_trajectories(
        self,
        n: int,
        min_return: float = 0.0,
    ) -> List[Episode]:
        """Sample n episodes with replacement, filtered by minimum return.

        Used by Decision Transformer training to sample training batches.

        Args:
            n: number of episodes to sample.
            min_return: minimum total_reward for eligible episodes.

        Returns:
            List of n Episode objects (may contain duplicates).
        """
        rows = self._conn.execute(
            "SELECT id FROM episodes "
            "WHERE status = 'complete' AND total_reward >= ?",
            (min_return,),
        ).fetchall()

        if not rows:
            return []

        episode_ids = [r[0] for r in rows]
        sampled_ids = np.random.choice(episode_ids, size=min(n, len(episode_ids)), replace=True)

        episodes = []
        for ep_id in sampled_ids:
            try:
                episodes.append(self.get_episode(int(ep_id)))
            except Exception as exc:
                logger.warning("Failed to load sampled episode %d: %s", ep_id, exc)
        return episodes

    @staticmethod
    def compute_returns_to_go(
        rewards: np.ndarray,
        gamma: float = 0.99,
    ) -> np.ndarray:
        """Compute discounted returns-to-go for a sequence of rewards.

        For each timestep t: R_t = sum_{k=t}^{T} gamma^{k-t} * r_k

        Args:
            rewards: (T,) reward array for the episode.
            gamma: discount factor.

        Returns:
            (T,) returns-to-go array.
        """
        length = len(rewards)
        if length == 0:
            return np.array([], dtype=np.float32)

        rtg = np.zeros(length, dtype=np.float32)
        rtg[-1] = rewards[-1]
        for t in range(length - 2, -1, -1):
            rtg[t] = rewards[t] + gamma * rtg[t + 1]
        return rtg

    def prune_low_reward_episodes(self, threshold: float = 0.0) -> int:
        """Delete episodes with total_reward <= threshold.

        Note: mmap space is not reclaimed (would require compaction); only
        SQLite rows are removed. State offsets become unreachable.

        Args:
            threshold: episodes at or below this return are pruned.

        Returns:
            Number of episodes deleted.
        """
        # Get episode IDs to prune
        rows = self._conn.execute(
            "SELECT id FROM episodes "
            "WHERE status = 'complete' AND total_reward <= ?",
            (threshold,),
        ).fetchall()

        if not rows:
            return 0

        ids_to_delete = [r[0] for r in rows]
        placeholders = ",".join("?" * len(ids_to_delete))

        # Delete transitions first (FK), then episodes
        self._conn.execute(
            f"DELETE FROM transitions WHERE episode_id IN ({placeholders})",
            ids_to_delete,
        )
        self._conn.execute(
            f"DELETE FROM episodes WHERE id IN ({placeholders})",
            ids_to_delete,
        )
        self._conn.commit()

        deleted = len(ids_to_delete)
        logger.info("Pruned %d low-reward episodes (threshold=%.4f)", deleted, threshold)
        return deleted

    def get_stats(self) -> Dict[str, Any]:
        """Return diagnostic statistics about the trajectory store."""
        total_episodes = self._conn.execute(
            "SELECT COUNT(*) FROM episodes WHERE status = 'complete'"
        ).fetchone()[0]

        active_episodes = self._conn.execute(
            "SELECT COUNT(*) FROM episodes WHERE status = 'active'"
        ).fetchone()[0]

        avg_row = self._conn.execute(
            "SELECT AVG(total_reward), AVG(length) FROM episodes WHERE status = 'complete'"
        ).fetchone()
        avg_return = avg_row[0] if avg_row[0] is not None else 0.0
        avg_length = avg_row[1] if avg_row[1] is not None else 0.0

        total_transitions = self._conn.execute(
            "SELECT COUNT(*) FROM transitions"
        ).fetchone()[0]

        return {
            "total_episodes": total_episodes,
            "active_episodes": active_episodes,
            "total_transitions": total_transitions,
            "avg_return": round(avg_return, 4),
            "avg_length": round(avg_length, 2),
            "state_write_idx": self._state_write_idx,
            "mmap_capacity": self._mmap_capacity,
            "disk_mb": round(self._disk_usage_mb(), 2),
        }

    # ---- Internal Helpers ---------------------------------------------------

    def _load_transitions(self, episode_id: int) -> List[Transition]:
        """Load all transitions for an episode from SQLite + mmap."""
        rows = self._conn.execute(
            "SELECT step, action, reward, done, url, domain, depth, state_offset "
            "FROM transitions WHERE episode_id = ? ORDER BY step",
            (episode_id,),
        ).fetchall()

        transitions = []
        for step, action, reward, done, url, domain, depth, state_offset in rows:
            state = np.array(self._states_mmap[state_offset], dtype=np.float32)
            next_state = np.array(self._next_states_mmap[state_offset], dtype=np.float32)
            transitions.append(
                Transition(
                    state=state,
                    action=action,
                    reward=reward,
                    next_state=next_state,
                    done=bool(done),
                    url=url,
                    domain=domain,
                    depth=depth,
                    timestamp=0.0,  # not stored per-transition in SQLite
                )
            )
        return transitions

    def _expand_mmap(self) -> None:
        """Double mmap capacity when full.

        Creates new mmap files with double the rows, copies existing data,
        then swaps references.
        """
        old_capacity = self._mmap_capacity
        new_capacity = old_capacity * 2
        dtype = np.float32
        shape_new = (new_capacity, self.config.state_dim)

        logger.info(
            "Expanding mmap: %d -> %d rows (%.1f MB -> %.1f MB per file)",
            old_capacity,
            new_capacity,
            old_capacity * self.config.state_dim * 4 / (1024 * 1024),
            new_capacity * self.config.state_dim * 4 / (1024 * 1024),
        )

        for attr, fname in [
            ("_states_mmap", "traj_states.npy"),
            ("_next_states_mmap", "traj_next_states.npy"),
        ]:
            old_path = self.states_dir / fname
            tmp_path = self.states_dir / f"{fname}.tmp"

            # Create new mmap with doubled capacity
            new_arr = np.memmap(str(tmp_path), dtype=dtype, mode="w+", shape=shape_new)
            old_arr = getattr(self, attr)

            # Copy existing data
            new_arr[:old_capacity] = old_arr[:old_capacity]
            new_arr.flush()

            # Swap files
            del old_arr
            setattr(self, attr, None)
            os.replace(str(tmp_path), str(old_path))

            # Reopen
            reopened = np.memmap(str(old_path), dtype=dtype, mode="r+", shape=shape_new)
            setattr(self, attr, reopened)

        self._mmap_capacity = new_capacity
        gc.collect()

    def _prune_oldest(self, count: int) -> None:
        """Remove the oldest completed episodes to stay within max_trajectories."""
        rows = self._conn.execute(
            "SELECT id FROM episodes WHERE status = 'complete' "
            "ORDER BY start_time ASC LIMIT ?",
            (count,),
        ).fetchall()

        if not rows:
            return

        ids_to_delete = [r[0] for r in rows]
        placeholders = ",".join("?" * len(ids_to_delete))
        self._conn.execute(
            f"DELETE FROM transitions WHERE episode_id IN ({placeholders})",
            ids_to_delete,
        )
        self._conn.execute(
            f"DELETE FROM episodes WHERE id IN ({placeholders})",
            ids_to_delete,
        )
        self._conn.commit()
        logger.info("Pruned %d oldest episodes to maintain max_trajectories", len(ids_to_delete))

    def _disk_usage_mb(self) -> float:
        """Estimate total disk usage of the trajectory store."""
        total = 0.0

        # mmap files
        for path in self.states_dir.iterdir():
            total += path.stat().st_size

        # SQLite database
        db_path = Path(self.config.db_path)
        if db_path.exists():
            total += db_path.stat().st_size
        # WAL file
        wal_path = db_path.with_suffix(".db-wal")
        if wal_path.exists():
            total += wal_path.stat().st_size

        return total / (1024 * 1024)

    # ---- Cleanup ------------------------------------------------------------

    def flush(self) -> None:
        """Flush all data to disk."""
        if self._states_mmap is not None:
            self._states_mmap.flush()
        if self._next_states_mmap is not None:
            self._next_states_mmap.flush()
        self._save_state()
        self._conn.commit()

    def close(self) -> None:
        """Release resources."""
        self.flush()
        if self._conn:
            self._conn.close()
            self._conn = None

        del self._states_mmap
        del self._next_states_mmap
        self._states_mmap = None
        self._next_states_mmap = None

        gc.collect()
        logger.info("TrajectoryStore closed")

    def __del__(self) -> None:
        try:
            self.close()
        except Exception:
            pass


# ======================= Trajectory DataLoader ==============================

class TrajectoryDataLoader:
    """Iterable dataset for Decision Transformer training.

    Yields batches of (states, actions, returns_to_go, timesteps, attention_mask)
    sampled from complete episodes. Handles padding/truncation to a fixed
    sequence length.

    Usage:
        loader = TrajectoryDataLoader(store, seq_len=20, batch_size=64)
        for batch in loader:
            states = batch["states"]          # (B, seq_len, state_dim)
            actions = batch["actions"]        # (B, seq_len)
            returns_to_go = batch["returns_to_go"]  # (B, seq_len)
            timesteps = batch["timesteps"]    # (B, seq_len)
            mask = batch["attention_mask"]    # (B, seq_len)
    """

    def __init__(
        self,
        store: TrajectoryStore,
        seq_len: int = 20,
        batch_size: int = 64,
        min_return: float = 0.0,
        gamma: float = 0.99,
        max_batches: Optional[int] = None,
    ) -> None:
        self.store = store
        self.seq_len = seq_len
        self.batch_size = batch_size
        self.min_return = min_return
        self.gamma = gamma
        self.max_batches = max_batches

        # Cache episode IDs for sampling
        self._episode_ids: List[int] = []
        self._refresh_episode_ids()

    def _refresh_episode_ids(self) -> None:
        """Refresh the cached list of eligible episode IDs."""
        rows = self.store._conn.execute(
            "SELECT id FROM episodes "
            "WHERE status = 'complete' AND total_reward >= ?",
            (self.min_return,),
        ).fetchall()
        self._episode_ids = [r[0] for r in rows]

    def __len__(self) -> int:
        """Total number of episodes available for sampling."""
        return len(self._episode_ids)

    def __getitem__(self, idx: int) -> Dict[str, np.ndarray]:
        """Load a single episode and format for DT training.

        Args:
            idx: index into the episode ID list.

        Returns:
            Dict with keys: states, actions, returns_to_go, timesteps,
            attention_mask. All arrays have shape (seq_len, ...).
        """
        if not self._episode_ids:
            raise IndexError("No episodes available")

        ep_id = self._episode_ids[idx % len(self._episode_ids)]
        episode = self.store.get_episode(ep_id)
        return self._format_episode(episode)

    def __iter__(self) -> Iterator[Dict[str, np.ndarray]]:
        """Yield batches of formatted episodes for DT training.

        Samples episodes with replacement. Each batch contains batch_size
        episodes, each padded/truncated to seq_len.
        """
        if not self._episode_ids:
            self._refresh_episode_ids()
            if not self._episode_ids:
                return

        batch_count = 0
        while True:
            if self.max_batches is not None and batch_count >= self.max_batches:
                return

            batch = self._sample_batch()
            if batch is None:
                return
            yield batch
            batch_count += 1

    def _sample_batch(self) -> Optional[Dict[str, np.ndarray]]:
        """Sample a batch of episodes and format for DT training."""
        if not self._episode_ids:
            return None

        state_dim = self.store.config.state_dim
        B = self.batch_size
        T = self.seq_len

        # Pre-allocate batch arrays
        states = np.zeros((B, T, state_dim), dtype=np.float32)
        actions = np.zeros((B, T), dtype=np.int64)
        returns_to_go = np.zeros((B, T), dtype=np.float32)
        timesteps = np.zeros((B, T), dtype=np.int64)
        attention_mask = np.zeros((B, T), dtype=np.float32)

        sampled_ids = np.random.choice(
            self._episode_ids, size=B, replace=True
        )

        for b, ep_id in enumerate(sampled_ids):
            try:
                episode = self.store.get_episode(int(ep_id))
                formatted = self._format_episode(episode)
                states[b] = formatted["states"]
                actions[b] = formatted["actions"]
                returns_to_go[b] = formatted["returns_to_go"]
                timesteps[b] = formatted["timesteps"]
                attention_mask[b] = formatted["attention_mask"]
            except Exception as exc:
                logger.warning("Failed to format episode %d: %s", ep_id, exc)
                # Leave as zeros (masked out by attention_mask=0)

        return {
            "states": states,
            "actions": actions,
            "returns_to_go": returns_to_go,
            "timesteps": timesteps,
            "attention_mask": attention_mask,
        }

    def _format_episode(self, episode: Episode) -> Dict[str, np.ndarray]:
        """Format a single episode into fixed-length arrays for DT.

        If episode length > seq_len: randomly sample a contiguous subsequence.
        If episode length < seq_len: right-pad with zeros and mask=0.
        """
        state_dim = self.store.config.state_dim
        T = self.seq_len
        ep_len = episode.length

        states = np.zeros((T, state_dim), dtype=np.float32)
        actions = np.zeros(T, dtype=np.int64)
        rtg = np.zeros(T, dtype=np.float32)
        timesteps = np.zeros(T, dtype=np.int64)
        mask = np.zeros(T, dtype=np.float32)

        if ep_len == 0:
            return {
                "states": states,
                "actions": actions,
                "returns_to_go": rtg,
                "timesteps": timesteps,
                "attention_mask": mask,
            }

        # Determine start index for subsequence
        if ep_len > T:
            start = int(np.random.randint(0, ep_len - T))
            end = start + T
            actual_len = T
        else:
            start = 0
            end = ep_len
            actual_len = ep_len

        # Fill arrays
        for i, t_idx in enumerate(range(start, end)):
            trans = episode.transitions[t_idx]
            states[i] = trans.state
            actions[i] = trans.action
            rtg[i] = episode.returns_to_go[t_idx]
            timesteps[i] = t_idx
            mask[i] = 1.0

        return {
            "states": states,
            "actions": actions,
            "returns_to_go": rtg,
            "timesteps": timesteps,
            "attention_mask": mask,
        }


# ======================= Episode Analyzer ===================================

class EpisodeAnalyzer:
    """Analyze trajectory patterns for debugging and evaluation.

    Provides episode-level statistics without loading all transitions
    into memory (uses SQLite aggregation where possible).
    """

    def __init__(self, store: TrajectoryStore) -> None:
        self.store = store

    def best_episodes(self, n: int = 10) -> List[Episode]:
        """Return the n episodes with highest total reward.

        Args:
            n: number of episodes to return.

        Returns:
            List of Episode objects, highest reward first.
        """
        rows = self.store._conn.execute(
            "SELECT id FROM episodes "
            "WHERE status = 'complete' "
            "ORDER BY total_reward DESC LIMIT ?",
            (n,),
        ).fetchall()

        episodes = []
        for (ep_id,) in rows:
            try:
                episodes.append(self.store.get_episode(ep_id))
            except Exception as exc:
                logger.warning("Failed to load best episode %d: %s", ep_id, exc)
        return episodes

    def worst_episodes(self, n: int = 10) -> List[Episode]:
        """Return the n episodes with lowest total reward.

        Args:
            n: number of episodes to return.

        Returns:
            List of Episode objects, lowest reward first.
        """
        rows = self.store._conn.execute(
            "SELECT id FROM episodes "
            "WHERE status = 'complete' "
            "ORDER BY total_reward ASC LIMIT ?",
            (n,),
        ).fetchall()

        episodes = []
        for (ep_id,) in rows:
            try:
                episodes.append(self.store.get_episode(ep_id))
            except Exception as exc:
                logger.warning("Failed to load worst episode %d: %s", ep_id, exc)
        return episodes

    def avg_episode_stats(self) -> Dict[str, Any]:
        """Compute aggregate statistics across all complete episodes.

        Returns:
            Dict with: avg_length, avg_reward, std_reward, avg_depth,
            total_episodes, unique_domains, top_domains.
        """
        ep_stats = self.store._conn.execute(
            "SELECT COUNT(*), AVG(length), AVG(total_reward), "
            "MIN(total_reward), MAX(total_reward) "
            "FROM episodes WHERE status = 'complete'"
        ).fetchone()

        total_episodes = ep_stats[0]
        if total_episodes == 0:
            return {
                "total_episodes": 0,
                "avg_length": 0.0,
                "avg_reward": 0.0,
                "std_reward": 0.0,
                "min_reward": 0.0,
                "max_reward": 0.0,
                "avg_depth": 0.0,
                "unique_domains": 0,
                "top_domains": [],
            }

        # Reward std dev
        std_row = self.store._conn.execute(
            "SELECT AVG((total_reward - ?) * (total_reward - ?)) "
            "FROM episodes WHERE status = 'complete'",
            (ep_stats[2], ep_stats[2]),
        ).fetchone()
        std_reward = float(std_row[0] ** 0.5) if std_row[0] is not None else 0.0

        # Average depth from transitions
        depth_row = self.store._conn.execute(
            "SELECT AVG(depth) FROM transitions t "
            "JOIN episodes e ON t.episode_id = e.id "
            "WHERE e.status = 'complete'"
        ).fetchone()
        avg_depth = depth_row[0] if depth_row[0] is not None else 0.0

        # Domain stats
        domain_rows = self.store._conn.execute(
            "SELECT domain, COUNT(*) as cnt FROM episodes "
            "WHERE status = 'complete' "
            "GROUP BY domain ORDER BY cnt DESC LIMIT 10"
        ).fetchall()

        return {
            "total_episodes": total_episodes,
            "avg_length": round(float(ep_stats[1]), 2),
            "avg_reward": round(float(ep_stats[2]), 4),
            "std_reward": round(std_reward, 4),
            "min_reward": round(float(ep_stats[3]), 4),
            "max_reward": round(float(ep_stats[4]), 4),
            "avg_depth": round(float(avg_depth), 2),
            "unique_domains": len(domain_rows),
            "top_domains": [
                {"domain": d, "episodes": c} for d, c in domain_rows
            ],
        }

    def domain_episode_performance(self, domain: str) -> Dict[str, Any]:
        """Compute per-domain episode statistics.

        Args:
            domain: the domain to analyse.

        Returns:
            Dict with: total_episodes, avg_length, avg_reward, std_reward,
            min_reward, max_reward, avg_depth, total_transitions.
        """
        ep_stats = self.store._conn.execute(
            "SELECT COUNT(*), AVG(length), AVG(total_reward), "
            "MIN(total_reward), MAX(total_reward) "
            "FROM episodes WHERE status = 'complete' AND domain = ?",
            (domain,),
        ).fetchone()

        total_episodes = ep_stats[0]
        if total_episodes == 0:
            return {
                "domain": domain,
                "total_episodes": 0,
                "avg_length": 0.0,
                "avg_reward": 0.0,
                "std_reward": 0.0,
                "min_reward": 0.0,
                "max_reward": 0.0,
                "avg_depth": 0.0,
                "total_transitions": 0,
            }

        # Std dev
        std_row = self.store._conn.execute(
            "SELECT AVG((total_reward - ?) * (total_reward - ?)) "
            "FROM episodes WHERE status = 'complete' AND domain = ?",
            (ep_stats[2], ep_stats[2], domain),
        ).fetchone()
        std_reward = float(std_row[0] ** 0.5) if std_row[0] is not None else 0.0

        # Depth + transition count
        trans_stats = self.store._conn.execute(
            "SELECT AVG(t.depth), COUNT(*) FROM transitions t "
            "JOIN episodes e ON t.episode_id = e.id "
            "WHERE e.status = 'complete' AND e.domain = ?",
            (domain,),
        ).fetchone()

        return {
            "domain": domain,
            "total_episodes": total_episodes,
            "avg_length": round(float(ep_stats[1]), 2),
            "avg_reward": round(float(ep_stats[2]), 4),
            "std_reward": round(std_reward, 4),
            "min_reward": round(float(ep_stats[3]), 4),
            "max_reward": round(float(ep_stats[4]), 4),
            "avg_depth": round(float(trans_stats[0]), 2) if trans_stats[0] is not None else 0.0,
            "total_transitions": trans_stats[1],
        }
