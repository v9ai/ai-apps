"""
Bridge between Module 1 (RL crawler) and Module 2 (NER/entity extraction).

Provides async message queues and coordination so the crawler can submit
pages for entity extraction and receive reward signals back asynchronously.

Architecture:
- AsyncMessageQueue: in-process asyncio.Queue with backpressure
- FileBasedQueue: JSON Lines disk-backed queue for crash recovery
- EntityBridge: main orchestrator with background reward collection
- MockExtractor: simulates Module 2 for integration testing

Data flow:
  CrawlerPipeline -> EntityBridge.submit_page()
                      -> AsyncMessageQueue (CrawlPageMessage)
                          -> Module 2 extraction (batch)
                              -> ExtractionResult
                                  -> EntityBridge.collect_rewards()
                                      -> replay buffer reward patching

Memory budget: ~20 MB (queue buffers + batch accumulation).
Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import json
import logging
import os
import random
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Protocol

import numpy as np

from crawler_engine import PageContent

logger = logging.getLogger("crawler_entity_bridge")


# ======================= Configuration ======================================

@dataclass
class EntityBridgeConfig:
    """Configuration for the Module 1 <-> Module 2 bridge."""

    # Queue backend: "memory" (in-process), "file" (JSON Lines on disk)
    queue_type: str = "memory"

    # Maximum number of messages in the queue before backpressure blocks put()
    max_queue_size: int = 10_000

    # Send pages to extraction in batches of this size
    batch_size: int = 50

    # Timeout in seconds when waiting for extraction results
    extraction_timeout: float = 30.0

    # How often (seconds) to check for extraction results and patch rewards
    reward_resolve_interval: float = 60.0

    # Directory for file-based queue persistence
    queue_dir: str = "scrapus_data/bridge_queue"

    # Maximum age (seconds) for unresolved messages before pruning
    max_pending_age: float = 3600.0


# ======================= Data Classes =======================================

@dataclass
class CrawlPageMessage:
    """Message sent from Module 1 (crawler) to Module 2 (extraction).

    Carries the crawled page content plus the embedding vector for
    entity deduplication and the replay buffer index for reward patching.
    """

    url: str
    domain: str
    title: str
    body_text: str
    embedding: np.ndarray  # (768,) for entity dedup
    metadata: Dict[str, Any]
    crawled_at: float
    replay_buffer_idx: int  # for reward patching back into the replay buffer

    # Unique message ID (assigned on creation)
    message_id: str = field(default_factory=lambda: uuid.uuid4().hex[:16])

    def to_dict(self) -> Dict[str, Any]:
        """Serialise to dict (embedding stored as list for JSON compat)."""
        return {
            "message_id": self.message_id,
            "url": self.url,
            "domain": self.domain,
            "title": self.title,
            "body_text": self.body_text,
            "embedding": self.embedding.tolist(),
            "metadata": self.metadata,
            "crawled_at": self.crawled_at,
            "replay_buffer_idx": self.replay_buffer_idx,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CrawlPageMessage":
        """Deserialise from dict."""
        return cls(
            url=data["url"],
            domain=data["domain"],
            title=data["title"],
            body_text=data["body_text"],
            embedding=np.array(data["embedding"], dtype=np.float32),
            metadata=data.get("metadata", {}),
            crawled_at=data["crawled_at"],
            replay_buffer_idx=data["replay_buffer_idx"],
            message_id=data.get("message_id", uuid.uuid4().hex[:16]),
        )


@dataclass
class ExtractionResult:
    """Result returned from Module 2 (NER/extraction) back to Module 1.

    Carries extracted entities, lead classification, and the reward signal
    that will be patched into the replay buffer for RL credit assignment.
    """

    url: str
    entities: List[Dict[str, Any]]  # [{name, type, confidence}, ...]
    is_lead: bool
    reward: float
    extracted_at: float

    # Link back to the original message
    message_id: str = ""
    replay_buffer_idx: int = -1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "url": self.url,
            "entities": self.entities,
            "is_lead": self.is_lead,
            "reward": self.reward,
            "extracted_at": self.extracted_at,
            "message_id": self.message_id,
            "replay_buffer_idx": self.replay_buffer_idx,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ExtractionResult":
        return cls(
            url=data["url"],
            entities=data.get("entities", []),
            is_lead=data.get("is_lead", False),
            reward=data.get("reward", 0.0),
            extracted_at=data.get("extracted_at", 0.0),
            message_id=data.get("message_id", ""),
            replay_buffer_idx=data.get("replay_buffer_idx", -1),
        )


# ======================= Extractor Protocol =================================

class ExtractorProtocol(Protocol):
    """Protocol that Module 2 extractors must satisfy."""

    async def extract(
        self, pages: List[CrawlPageMessage]
    ) -> List[ExtractionResult]: ...


# ======================= Async Message Queue ================================

class AsyncMessageQueue:
    """In-process async queue for Module 1 -> Module 2 communication.

    Features:
    - Bounded: put() blocks when the queue is full (backpressure).
    - Batch retrieval: get_batch() collects up to N messages or times out.
    - Separate result channel for extraction results flowing back.

    Memory: ~10 MB at max_size=10_000 (body_text dominates).
    """

    def __init__(self, max_size: int = 10_000) -> None:
        self._page_queue: asyncio.Queue[CrawlPageMessage] = asyncio.Queue(
            maxsize=max_size
        )
        self._result_queue: asyncio.Queue[ExtractionResult] = asyncio.Queue()
        self._max_size = max_size

        # Stats
        self._pages_enqueued: int = 0
        self._pages_dequeued: int = 0
        self._results_enqueued: int = 0
        self._results_dequeued: int = 0

    async def put(self, message: CrawlPageMessage) -> None:
        """Enqueue a page for extraction. Blocks if queue is full."""
        await self._page_queue.put(message)
        self._pages_enqueued += 1

    async def get_batch(
        self, batch_size: int, timeout: float = 5.0
    ) -> List[CrawlPageMessage]:
        """Collect up to batch_size messages, waiting at most timeout seconds.

        Returns as soon as batch_size messages are collected or timeout
        expires, whichever comes first. Always returns at least one message
        if any are available within the timeout.
        """
        batch: List[CrawlPageMessage] = []
        deadline = time.monotonic() + timeout

        # Block for the first message (up to timeout)
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            return batch

        try:
            first = await asyncio.wait_for(
                self._page_queue.get(), timeout=remaining
            )
            batch.append(first)
            self._pages_dequeued += 1
        except asyncio.TimeoutError:
            return batch

        # Drain up to batch_size without blocking
        while len(batch) < batch_size:
            try:
                msg = self._page_queue.get_nowait()
                batch.append(msg)
                self._pages_dequeued += 1
            except asyncio.QueueEmpty:
                break

        return batch

    async def put_result(self, result: ExtractionResult) -> None:
        """Enqueue an extraction result for reward resolution."""
        await self._result_queue.put(result)
        self._results_enqueued += 1

    async def get_results(self) -> List[ExtractionResult]:
        """Drain all available extraction results without blocking."""
        results: List[ExtractionResult] = []
        while True:
            try:
                result = self._result_queue.get_nowait()
                results.append(result)
                self._results_dequeued += 1
            except asyncio.QueueEmpty:
                break
        return results

    @property
    def page_queue_depth(self) -> int:
        return self._page_queue.qsize()

    @property
    def result_queue_depth(self) -> int:
        return self._result_queue.qsize()

    def get_stats(self) -> Dict[str, int]:
        return {
            "pages_enqueued": self._pages_enqueued,
            "pages_dequeued": self._pages_dequeued,
            "results_enqueued": self._results_enqueued,
            "results_dequeued": self._results_dequeued,
            "page_queue_depth": self.page_queue_depth,
            "result_queue_depth": self.result_queue_depth,
        }


# ======================= File-Based Queue ===================================

class FileBasedQueue:
    """Disk-backed queue for crash recovery using JSON Lines files.

    Messages are written as JSON Lines to rotating files. Supports resume
    after crash by scanning unacknowledged entries on startup.

    File layout:
        queue_dir/
            pending_000001.jsonl   <- active write file
            pending_000002.jsonl   <- rotated file
            acked.jsonl            <- acknowledged message IDs

    Rotation: a new file is created every `rotate_every` messages.
    """

    def __init__(
        self, queue_dir: str, rotate_every: int = 1_000
    ) -> None:
        self._queue_dir = Path(queue_dir)
        self._queue_dir.mkdir(parents=True, exist_ok=True)
        self._rotate_every = rotate_every

        # Acked message IDs (loaded from disk on init)
        self._acked: set = set()
        self._ack_path = self._queue_dir / "acked.jsonl"

        # Current write state
        self._file_counter: int = 0
        self._messages_in_file: int = 0
        self._current_file: Optional[Path] = None
        self._current_handle = None

        # Load acked IDs from previous run
        self._load_acked()

        # Determine next file counter from existing files
        self._init_file_counter()

    def _load_acked(self) -> None:
        """Load acknowledged message IDs from disk."""
        if not self._ack_path.exists():
            return
        try:
            with open(self._ack_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        self._acked.add(line)
            logger.info("Loaded %d acked message IDs", len(self._acked))
        except Exception as exc:
            logger.warning("Failed to load acked IDs: %s", exc)

    def _init_file_counter(self) -> None:
        """Find the highest existing file counter to continue from."""
        existing = sorted(self._queue_dir.glob("pending_*.jsonl"))
        if existing:
            # Extract counter from filename: pending_000042.jsonl -> 42
            last_name = existing[-1].stem  # pending_000042
            try:
                self._file_counter = int(last_name.split("_")[1]) + 1
            except (IndexError, ValueError):
                self._file_counter = len(existing)
        else:
            self._file_counter = 0

    def _rotate_file(self) -> None:
        """Close current file and open a new one."""
        if self._current_handle:
            self._current_handle.close()
        self._current_file = self._queue_dir / f"pending_{self._file_counter:06d}.jsonl"
        self._current_handle = open(self._current_file, "a")
        self._file_counter += 1
        self._messages_in_file = 0

    def put(self, message: CrawlPageMessage) -> None:
        """Write a message to the current file."""
        if (
            self._current_handle is None
            or self._messages_in_file >= self._rotate_every
        ):
            self._rotate_file()

        line = json.dumps(message.to_dict()) + "\n"
        self._current_handle.write(line)
        self._current_handle.flush()
        self._messages_in_file += 1

    def get_batch(self, n: int) -> List[CrawlPageMessage]:
        """Read up to n unacknowledged messages from disk.

        Scans all pending files and returns messages whose IDs have not
        been acknowledged. Oldest messages first.
        """
        batch: List[CrawlPageMessage] = []
        pending_files = sorted(self._queue_dir.glob("pending_*.jsonl"))

        for fpath in pending_files:
            if len(batch) >= n:
                break
            try:
                with open(fpath, "r") as f:
                    for line in f:
                        if len(batch) >= n:
                            break
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            msg_id = data.get("message_id", "")
                            if msg_id not in self._acked:
                                batch.append(CrawlPageMessage.from_dict(data))
                        except (json.JSONDecodeError, KeyError) as exc:
                            logger.warning("Skipping malformed line in %s: %s", fpath, exc)
            except Exception as exc:
                logger.error("Failed to read %s: %s", fpath, exc)

        return batch

    def ack(self, message_ids: List[str]) -> None:
        """Acknowledge processed messages so they are not re-read."""
        if not message_ids:
            return

        self._acked.update(message_ids)

        # Append to ack file
        try:
            with open(self._ack_path, "a") as f:
                for mid in message_ids:
                    f.write(mid + "\n")
        except Exception as exc:
            logger.error("Failed to write ack file: %s", exc)

        # Garbage-collect fully acked pending files
        self._gc_pending_files()

    def _gc_pending_files(self) -> None:
        """Remove pending files where all messages have been acknowledged."""
        pending_files = sorted(self._queue_dir.glob("pending_*.jsonl"))
        for fpath in pending_files:
            # Skip the current write file
            if fpath == self._current_file:
                continue
            try:
                all_acked = True
                with open(fpath, "r") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            if data.get("message_id", "") not in self._acked:
                                all_acked = False
                                break
                        except json.JSONDecodeError:
                            continue
                if all_acked:
                    fpath.unlink()
                    logger.debug("GC'd fully acked file: %s", fpath.name)
            except Exception as exc:
                logger.warning("GC error for %s: %s", fpath, exc)

    def pending_count(self) -> int:
        """Count unacknowledged messages across all files."""
        count = 0
        for fpath in self._queue_dir.glob("pending_*.jsonl"):
            try:
                with open(fpath, "r") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            data = json.loads(line)
                            if data.get("message_id", "") not in self._acked:
                                count += 1
                        except json.JSONDecodeError:
                            continue
            except Exception:
                continue
        return count

    def close(self) -> None:
        """Flush and close the current write file."""
        if self._current_handle:
            self._current_handle.close()
            self._current_handle = None


# ======================= Entity Bridge ======================================

class EntityBridge:
    """Main coordination class bridging Module 1 (crawler) and Module 2 (extraction).

    Manages:
    - Submitting crawled pages to the extraction queue
    - Running a background task to batch-dispatch pages to the extractor
    - Collecting extraction results and resolving pending rewards
    - Statistics tracking for monitoring

    Lifecycle:
        bridge = EntityBridge(config, extractor)
        await bridge.start()
        ...
        await bridge.submit_page(page, embedding, replay_idx)
        ...
        resolved = await bridge.collect_rewards()
        ...
        await bridge.stop()
    """

    def __init__(
        self,
        config: Optional[EntityBridgeConfig] = None,
        extractor: Optional[ExtractorProtocol] = None,
        replay_buffer: Optional[Any] = None,  # MmapReplayBuffer
    ) -> None:
        self.config = config or EntityBridgeConfig()
        self._extractor = extractor
        self._replay_buffer = replay_buffer

        # Queue backend
        self._async_queue: Optional[AsyncMessageQueue] = None
        self._file_queue: Optional[FileBasedQueue] = None

        # Background tasks
        self._dispatch_task: Optional[asyncio.Task] = None
        self._reward_task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

        # Stats
        self._pages_submitted: int = 0
        self._rewards_resolved: int = 0
        self._batches_dispatched: int = 0
        self._extraction_errors: int = 0
        self._resolve_times: List[float] = []  # for avg resolve time

        # Pending reward tracking: url -> submit_time
        self._pending_submit_times: Dict[str, float] = {}

        self._started = False

    async def start(self) -> None:
        """Initialise queues and launch background tasks."""
        if self._started:
            logger.warning("EntityBridge already started")
            return

        # Create queue backend
        if self.config.queue_type == "file":
            os.makedirs(self.config.queue_dir, exist_ok=True)
            self._file_queue = FileBasedQueue(self.config.queue_dir)
            # File queue also needs an async queue for in-flight batches
            self._async_queue = AsyncMessageQueue(
                max_size=self.config.batch_size * 4
            )
        else:
            self._async_queue = AsyncMessageQueue(
                max_size=self.config.max_queue_size
            )

        # Launch background dispatch task (sends batches to extractor)
        if self._extractor:
            self._dispatch_task = asyncio.create_task(
                self._dispatch_loop(), name="bridge-dispatch"
            )

        # Launch background reward collection task
        self._reward_task = asyncio.create_task(
            self._reward_resolve_loop(), name="bridge-reward-resolve"
        )

        self._started = True
        logger.info(
            "EntityBridge started (queue_type=%s, batch_size=%d, max_queue=%d)",
            self.config.queue_type,
            self.config.batch_size,
            self.config.max_queue_size,
        )

    async def stop(self) -> None:
        """Signal background tasks to stop and wait for completion."""
        if not self._started:
            return

        self._stop_event.set()

        # Cancel dispatch task
        if self._dispatch_task and not self._dispatch_task.done():
            self._dispatch_task.cancel()
            try:
                await self._dispatch_task
            except asyncio.CancelledError:
                pass

        # Cancel reward task
        if self._reward_task and not self._reward_task.done():
            self._reward_task.cancel()
            try:
                await self._reward_task
            except asyncio.CancelledError:
                pass

        # Close file queue
        if self._file_queue:
            self._file_queue.close()

        self._started = False
        logger.info(
            "EntityBridge stopped (submitted=%d, resolved=%d)",
            self._pages_submitted,
            self._rewards_resolved,
        )

    async def submit_page(
        self,
        page: PageContent,
        embedding: np.ndarray,
        replay_idx: int,
    ) -> None:
        """Submit a crawled page for entity extraction.

        Constructs a CrawlPageMessage and enqueues it. If the queue is
        full, this call blocks until space is available (backpressure).

        For file-backed queues, also persists to disk for crash recovery.
        """
        message = CrawlPageMessage(
            url=page.url,
            domain=page.domain,
            title=page.title,
            body_text=page.body_text,
            embedding=embedding,
            metadata={
                "status_code": page.status_code,
                "content_type": page.content_type,
                "fetch_time_ms": page.fetch_time_ms,
                "body_length": page.body_length,
                "link_count": page.link_count,
                "meta_description": page.meta_description,
            },
            crawled_at=time.time(),
            replay_buffer_idx=replay_idx,
        )

        # Persist to disk if file-backed
        if self._file_queue:
            self._file_queue.put(message)

        # Enqueue for async dispatch
        if self._async_queue:
            await self._async_queue.put(message)

        # Track pending submit time
        self._pending_submit_times[page.url] = time.time()
        self._pages_submitted += 1

    async def collect_rewards(self) -> int:
        """Collect extraction results and resolve pending rewards.

        Drains the result queue, patches the replay buffer with resolved
        rewards, and updates statistics.

        Returns:
            Number of rewards resolved in this call.
        """
        if not self._async_queue:
            return 0

        results = await self._async_queue.get_results()
        if not results:
            return 0

        resolved = 0
        now = time.time()

        for result in results:
            # Patch replay buffer
            if self._replay_buffer and result.replay_buffer_idx >= 0:
                reward_data = [{"url": result.url, "reward": result.reward}]
                patched = self._replay_buffer.resolve_pending_rewards(reward_data)
                resolved += patched

            # Track resolve time
            submit_time = self._pending_submit_times.pop(result.url, None)
            if submit_time is not None:
                self._resolve_times.append(now - submit_time)

            # Ack in file queue
            if self._file_queue and result.message_id:
                self._file_queue.ack([result.message_id])

        self._rewards_resolved += resolved
        if resolved > 0:
            logger.info(
                "Resolved %d rewards (total=%d, pending=%d)",
                resolved,
                self._rewards_resolved,
                len(self._pending_submit_times),
            )

        return resolved

    def get_stats(self) -> Dict[str, Any]:
        """Return bridge statistics for monitoring."""
        avg_resolve = 0.0
        if self._resolve_times:
            # Keep only last 1000 for rolling average
            recent = self._resolve_times[-1000:]
            avg_resolve = sum(recent) / len(recent)

        queue_depth = 0
        if self._async_queue:
            queue_depth = self._async_queue.page_queue_depth

        return {
            "pages_submitted": self._pages_submitted,
            "rewards_resolved": self._rewards_resolved,
            "queue_depth": queue_depth,
            "avg_resolve_time": round(avg_resolve, 3),
            "batches_dispatched": self._batches_dispatched,
            "extraction_errors": self._extraction_errors,
            "pending_rewards": len(self._pending_submit_times),
        }

    # ---- Background Tasks --------------------------------------------------

    async def _dispatch_loop(self) -> None:
        """Background task: batch pages from the queue and send to extractor.

        Runs continuously, collecting batches from the async queue and
        dispatching them to the extractor. Handles extraction errors
        gracefully without crashing the loop.
        """
        logger.info("Dispatch loop started (batch_size=%d)", self.config.batch_size)

        while not self._stop_event.is_set():
            try:
                # Collect a batch (blocks up to 5s for at least one message)
                batch = await self._async_queue.get_batch(
                    batch_size=self.config.batch_size, timeout=5.0
                )
                if not batch:
                    continue

                # Dispatch to extractor with timeout
                try:
                    results = await asyncio.wait_for(
                        self._extractor.extract(batch),
                        timeout=self.config.extraction_timeout,
                    )
                    self._batches_dispatched += 1

                    # Enqueue results for reward resolution
                    for result in results:
                        await self._async_queue.put_result(result)

                except asyncio.TimeoutError:
                    logger.warning(
                        "Extraction timeout for batch of %d pages", len(batch)
                    )
                    self._extraction_errors += 1
                except Exception as exc:
                    logger.error(
                        "Extraction error for batch of %d pages: %s",
                        len(batch),
                        exc,
                    )
                    self._extraction_errors += 1

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Dispatch loop error: %s", exc, exc_info=True)
                await asyncio.sleep(1.0)

        logger.info("Dispatch loop stopped")

    async def _reward_resolve_loop(self) -> None:
        """Background task: periodically collect rewards and patch replay buffer.

        Runs at reward_resolve_interval, draining results and patching the
        replay buffer. Also prunes stale pending entries.
        """
        logger.info(
            "Reward resolve loop started (interval=%.1fs)",
            self.config.reward_resolve_interval,
        )

        while not self._stop_event.is_set():
            try:
                await asyncio.sleep(self.config.reward_resolve_interval)

                # Collect and resolve
                resolved = await self.collect_rewards()

                # Prune stale pending entries
                now = time.time()
                stale_urls = [
                    url
                    for url, t in self._pending_submit_times.items()
                    if now - t > self.config.max_pending_age
                ]
                for url in stale_urls:
                    self._pending_submit_times.pop(url, None)
                if stale_urls:
                    logger.info("Pruned %d stale pending entries", len(stale_urls))

            except asyncio.CancelledError:
                break
            except Exception as exc:
                logger.error("Reward resolve loop error: %s", exc, exc_info=True)

        logger.info("Reward resolve loop stopped")


# ======================= Mock Extractor =====================================

class MockExtractor:
    """Simulates Module 2 entity extraction for testing.

    Generates random extraction results with configurable lead probability
    and delay. Useful for integration testing the bridge without the full
    NER pipeline.

    Reward scheme:
    - Lead page:     +1.0  (probability = lead_probability)
    - Non-lead page: -0.01 (cost per page)
    """

    def __init__(
        self,
        lead_probability: float = 0.05,
        avg_delay: float = 2.0,
        delay_jitter: float = 0.5,
    ) -> None:
        self.lead_probability = lead_probability
        self.avg_delay = avg_delay
        self.delay_jitter = delay_jitter

        # Entity type distribution for mock data
        self._entity_types = [
            "PERSON", "ORGANIZATION", "LOCATION", "EMAIL",
            "PHONE", "JOB_TITLE", "COMPANY", "TECHNOLOGY",
        ]

    async def extract(
        self, pages: List[CrawlPageMessage]
    ) -> List[ExtractionResult]:
        """Simulate extraction with configurable delay and lead rate.

        Args:
            pages: batch of crawled page messages.

        Returns:
            List of extraction results, one per input page.
        """
        # Simulate processing time (batched, so delay is per-batch not per-page)
        delay = max(0.1, self.avg_delay + random.uniform(
            -self.delay_jitter, self.delay_jitter
        ))
        await asyncio.sleep(delay)

        results: List[ExtractionResult] = []
        now = time.time()

        for page in pages:
            is_lead = random.random() < self.lead_probability
            reward = 1.0 if is_lead else -0.01

            # Generate mock entities
            num_entities = random.randint(0, 5) if is_lead else random.randint(0, 2)
            entities = []
            for _ in range(num_entities):
                entity_type = random.choice(self._entity_types)
                entities.append({
                    "name": f"mock_{entity_type.lower()}_{random.randint(1, 999)}",
                    "type": entity_type,
                    "confidence": round(random.uniform(0.5, 0.99), 3),
                })

            results.append(ExtractionResult(
                url=page.url,
                entities=entities,
                is_lead=is_lead,
                reward=reward,
                extracted_at=now,
                message_id=page.message_id,
                replay_buffer_idx=page.replay_buffer_idx,
            ))

        logger.debug(
            "MockExtractor: processed %d pages, %d leads (delay=%.2fs)",
            len(pages),
            sum(1 for r in results if r.is_lead),
            delay,
        )

        return results
