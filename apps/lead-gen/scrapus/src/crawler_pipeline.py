"""
Module 1: Crawler pipeline entry point.

Orchestrates the full RL-based crawling loop:
  URL frontier -> fetch -> extract -> embed -> DQN score -> replay buffer -> train

Integration points:
- SQLite: frontier, domain stats, pending rewards
- Replay buffer: mmap NumPy + SQLite (crawler_replay_buffer.py)
- Embeddings: nomic-embed-text-v1.5 via MLX (crawler_embeddings.py)
- DQN agent: Double DQN with MPS training (crawler_dqn.py)
- Crawler engine: Playwright + politeness (crawler_engine.py)
- Memory management: memory_management.py patterns (MemoryManager, ModelLoader)

Memory budget: 550-750 MB total for Module 1.
Throughput: 8-12 pages/sec (network I/O bound).

Target: Apple M1 16GB, zero cloud dependency.
"""

import asyncio
import collections
import gc
import json
import logging
import os
import signal
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

import numpy as np

from crawler_dqn import (
    DQNConfig,
    DoubleDQNAgent,
    EpsilonScheduler,
    ONNXInferenceEngine,
    canonicalize_url,
    check_episode_done,
    compute_nstep_return,
    relabel_trajectory_hindsight,
)
from crawler_embeddings import (
    EmbeddingConfig,
    NomicEmbedder,
    ScalarFeatures,
    StateVectorBuilder,
)
from crawler_engine import (
    CrawlerConfig,
    CrawlerEngine,
    DomainScheduler,
    PageContent,
    PolitenessManager,
    PlaywrightFetcher,
    URLFrontier,
)
from crawler_replay_buffer import (
    MmapReplayBuffer,
    ReplayBufferConfig,
)

logger = logging.getLogger("crawler_pipeline")


# ======================= Pipeline Configuration =============================

@dataclass
class CrawlerPipelineConfig:
    """Top-level configuration combining all sub-module configs."""

    # Sub-configs
    dqn: DQNConfig = None  # type: ignore[assignment]
    embedding: EmbeddingConfig = None  # type: ignore[assignment]
    crawler: CrawlerConfig = None  # type: ignore[assignment]
    replay: ReplayBufferConfig = None  # type: ignore[assignment]

    # Pipeline control
    max_pages: int = 50_000
    train_after_n_pages: int = 1_000  # min replay size before training
    train_every_n_steps: int = 4
    policy_save_interval: int = 500
    onnx_export_interval: int = 5_000
    log_interval: int = 100
    prune_interval: int = 3_600  # frontier prune every hour (seconds)
    memory_budget_mb: int = 750

    # Inference mode: use ONNX instead of PyTorch for action selection
    use_onnx_inference: bool = False
    onnx_path: str = "scrapus_data/models/dqn/policy_int8.onnx"

    # Data directory
    data_dir: str = "scrapus_data"

    def __post_init__(self) -> None:
        if self.dqn is None:
            self.dqn = DQNConfig()
        if self.embedding is None:
            self.embedding = EmbeddingConfig()
        if self.crawler is None:
            self.crawler = CrawlerConfig()
        if self.replay is None:
            self.replay = ReplayBufferConfig()


# ======================= Crawl Result (per-page) ============================

@dataclass
class CrawlResult:
    """Result of crawling + embedding a single page."""

    page: PageContent
    state_vector: np.ndarray  # (state_dim,)
    embedding: np.ndarray  # (embed_dim,)
    scalar_features: ScalarFeatures
    action: int
    q_value: float
    epsilon: float


# ======================= Crawler Pipeline ===================================

class CrawlerPipeline:
    """Module 1 pipeline: URL frontier -> fetch -> embed -> DQN -> store.

    Lifecycle:
        pipeline = CrawlerPipeline(config)
        await pipeline.initialise()
        stats = await pipeline.run()
        await pipeline.shutdown()

    Memory management follows patterns from memory_management.py:
    - Embedder loaded at start, unloaded at shutdown
    - DQN agent in-memory during training, released at end
    - mmap replay buffer uses disk-backed arrays (3-8 MB active)
    """

    def __init__(self, config: Optional[CrawlerPipelineConfig] = None) -> None:
        self.config = config or CrawlerPipelineConfig()

        # Components (initialised in self.initialise())
        self.embedder: Optional[NomicEmbedder] = None
        self.state_builder: Optional[StateVectorBuilder] = None
        self.agent: Optional[DoubleDQNAgent] = None
        self.onnx_engine: Optional[ONNXInferenceEngine] = None
        self.replay: Optional[MmapReplayBuffer] = None
        self.engine: Optional[CrawlerEngine] = None

        # Tracking
        self._global_step: int = 0
        self._episode_pages: int = 0
        self._episode_depth: int = 0
        self._current_domain: Optional[str] = None
        self._trajectory: List[Dict[str, Any]] = []
        self._all_rewards: List[float] = []
        self._last_prune_time: float = 0.0

        # Rolling stats for pages/sec calculation
        self._page_timestamps: collections.deque = collections.deque(maxlen=100)

        # Background tasks
        self._reward_task: Optional[asyncio.Task] = None

        # Initialised flag
        self._initialised = False

    # ---- Lifecycle ----------------------------------------------------------

    async def initialise(self) -> None:
        """Initialise all components. Call before run()."""
        logger.info("Initialising crawler pipeline...")
        os.makedirs(self.config.data_dir, exist_ok=True)

        # 1. Embedder
        self.embedder = NomicEmbedder(self.config.embedding)
        self.embedder.load()
        self.state_builder = StateVectorBuilder(self.embedder)
        logger.info(
            "Embedder loaded (backend=%s, dim=%d, state_dim=%d)",
            self.embedder._backend,
            self.embedder.embedding_dim,
            self.state_builder.state_dim,
        )

        # Update DQN state_dim to match actual embedder output
        self.config.dqn.state_dim = self.state_builder.state_dim
        self.config.replay.state_dim = self.state_builder.state_dim

        # 2. DQN agent
        try:
            self.agent = DoubleDQNAgent(self.config.dqn)
            # Try loading existing checkpoint
            if os.path.exists(self.config.dqn.policy_path):
                self.agent.load_checkpoint()
                self._global_step = self.agent.train_step
                logger.info("Resumed from checkpoint at step %d", self._global_step)
        except RuntimeError as exc:
            logger.warning("DQN agent init failed (torch missing?): %s", exc)
            self.agent = None

        # 3. ONNX inference (optional, for inference-only mode)
        if self.config.use_onnx_inference and os.path.exists(self.config.onnx_path):
            try:
                self.onnx_engine = ONNXInferenceEngine(self.config.onnx_path)
                logger.info("ONNX inference engine loaded")
            except Exception as exc:
                logger.warning("ONNX engine init failed: %s", exc)

        # 4. Replay buffer
        self.replay = MmapReplayBuffer(self.config.replay)
        logger.info(
            "Replay buffer: size=%d, capacity=%d",
            self.replay.size,
            self.config.replay.capacity,
        )

        # 5. Crawler engine
        self.engine = CrawlerEngine(self.config.crawler)

        self._initialised = True
        logger.info("Crawler pipeline initialised")

    async def shutdown(self) -> None:
        """Release all resources in correct order."""
        logger.info("Shutting down crawler pipeline...")

        # Stop crawler engine
        if self.engine:
            try:
                await self.engine.stop()
            except Exception:
                pass

        # Save DQN checkpoint
        if self.agent:
            try:
                self.agent.save_checkpoint()
            except Exception as exc:
                logger.error("Failed to save checkpoint: %s", exc)

        # Close replay buffer
        if self.replay:
            self.replay.close()

        # Unload embedder (frees ~300 MB)
        if self.embedder:
            self.embedder.unload()

        # Release DQN agent (frees ~10 MB)
        if self.agent:
            self.agent.release()
            self.agent = None

        # ONNX session
        if self.onnx_engine:
            del self.onnx_engine
            self.onnx_engine = None

        gc.collect()
        self._initialised = False
        logger.info("Crawler pipeline shut down")

    # ---- Main Run Loop ------------------------------------------------------

    async def run(
        self,
        seed_urls: Optional[List[str]] = None,
        max_pages: Optional[int] = None,
        on_page_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """Run the complete crawl-train loop.

        Args:
            seed_urls: initial URLs to crawl.
            max_pages: override config max_pages.
            on_page_callback: async callable(CrawlResult) for downstream modules.

        Returns:
            Final statistics dict.
        """
        if not self._initialised:
            await self.initialise()

        max_pages = max_pages or self.config.max_pages

        # Add seeds
        if seed_urls:
            self.engine.add_seed_urls(seed_urls)

        # Start browser
        await self.engine.start()
        self._last_prune_time = time.time()

        # Signal handling for graceful shutdown
        loop = asyncio.get_running_loop()
        stop_event = asyncio.Event()

        def _signal_handler():
            logger.info("Shutdown signal received")
            stop_event.set()

        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _signal_handler)

        # Start background reward resolution task
        self._reward_task = asyncio.create_task(
            self._resolve_pending_rewards_periodic(stop_event)
        )

        logger.info("Starting crawl loop (max_pages=%d)", max_pages)

        try:
            while self._global_step < max_pages and not stop_event.is_set():
                # Check frontier
                if not self.engine.frontier.has_pending():
                    logger.info("Frontier exhausted at step %d", self._global_step)
                    break

                # Crawl a batch
                pages = await self.engine.crawl_batch(
                    batch_size=self.engine.config.max_concurrent
                )
                if not pages:
                    await asyncio.sleep(1.0)
                    continue

                # Process batch concurrently: embed -> score -> store
                results = await self._process_pages_batch(pages)
                for result in results:
                    if result and on_page_callback:
                        try:
                            await on_page_callback(result)
                        except Exception as exc:
                            logger.error("Callback error: %s", exc)

                    self._global_step += 1
                    self._page_timestamps.append(time.monotonic())

                    # Progress logging
                    self._log_progress()

                # Train DQN
                if (
                    self.agent
                    and self.replay
                    and self.replay.size >= self.config.train_after_n_pages
                    and self._global_step % self.config.train_every_n_steps == 0
                ):
                    self._train_step()

                # Periodic tasks
                self._periodic_maintenance()

        except KeyboardInterrupt:
            logger.info("Crawl interrupted by user at step %d", self._global_step)
        except Exception as exc:
            logger.error("Pipeline error: %s", exc, exc_info=True)
        finally:
            # Cancel background reward task
            stop_event.set()
            if self._reward_task and not self._reward_task.done():
                self._reward_task.cancel()
                try:
                    await self._reward_task
                except asyncio.CancelledError:
                    pass
            # Remove signal handlers
            for sig in (signal.SIGTERM, signal.SIGINT):
                loop.remove_signal_handler(sig)
            stats = self._collect_stats()
            logger.info("Crawl loop finished: %s", json.dumps(stats, indent=2))

        return stats

    # ---- Per-Page Processing ------------------------------------------------

    async def _process_page(self, page: PageContent) -> Optional[CrawlResult]:
        """Process a single crawled page: embed, score, store in replay."""
        # Build scalar features
        domain_stats = self._get_domain_stats(page.domain)
        scalar = ScalarFeatures(
            depth=0,  # Will be set from frontier depth
            domain_pages_crawled=domain_stats.get("pages_crawled", 0),
            domain_reward_sum=domain_stats.get("reward_sum", 0.0),
            link_count=page.link_count,
            body_length=page.body_length,
            response_time_ms=page.fetch_time_ms,
        )

        # Embed page text
        try:
            embedding = self.embedder.embed_text(
                page.body_text[:self.config.embedding.max_text_chars]
            )
        except Exception as exc:
            logger.error("Embedding failed for %s: %s", page.url, exc)
            return None

        # Build full state vector
        try:
            state = self.state_builder.build_state(
                page.body_text,
                scalar,
                precomputed_embedding=embedding,
            )
        except Exception as exc:
            logger.error("State vector build failed for %s: %s", page.url, exc)
            return None

        # Select action (link to follow) via DQN
        try:
            action, epsilon, q_value = self._select_action(
                state, len(page.outbound_links)
            )
        except Exception as exc:
            logger.error("DQN action selection failed for %s: %s", page.url, exc)
            # Fall back to random action so we don't lose the page
            action = int(np.random.randint(0, max(len(page.outbound_links), 1)))
            epsilon = 1.0
            q_value = 0.0

        # Initial reward: -0.01 cost per page crawled.
        # Real reward arrives asynchronously from extraction module.
        reward = -0.01
        self._all_rewards.append(reward)

        # Store in replay buffer
        zero_state = np.zeros_like(state)
        done = check_episode_done(
            domain_frontier_empty=not self.engine.frontier.has_pending(page.domain),
            depth=self._episode_depth,
            pages_crawled=self._episode_pages,
        )

        if self.replay:
            try:
                self.replay.add(
                    state=state,
                    action=action,
                    reward=reward,
                    next_state=zero_state if done else state,  # will be patched
                    done=done,
                    url=page.url,
                )
            except Exception as exc:
                logger.error(
                    "Replay buffer add failed for %s: %s", page.url, exc
                )
                # Continue processing -- losing one replay sample is acceptable

        # Update domain scheduler
        try:
            self.engine.scheduler.update_domain(page.domain, reward)
        except Exception as exc:
            logger.error("Domain scheduler update failed for %s: %s", page.domain, exc)

        # Update frontier Q-values for discovered links
        if self.agent or self.onnx_engine:
            try:
                self._score_discovered_links(page, embedding, scalar)
            except Exception as exc:
                logger.error("Link scoring failed for %s: %s", page.url, exc)

        # Track trajectory for hindsight relabeling
        self._trajectory.append({
            "url": page.url,
            "state": state,
            "action": action,
            "reward": reward,
            "step": self._global_step,
        })

        # Episode bookkeeping
        self._episode_pages += 1
        self._episode_depth += 1
        if done:
            self._handle_episode_end()

        return CrawlResult(
            page=page,
            state_vector=state,
            embedding=embedding,
            scalar_features=scalar,
            action=action,
            q_value=q_value,
            epsilon=epsilon,
        )

    async def _process_pages_batch(
        self, pages: List[PageContent]
    ) -> List[Optional[CrawlResult]]:
        """Process multiple pages concurrently with batched embeddings.

        Batches the embedding computation and state vector construction
        for better throughput compared to sequential per-page processing.
        """
        if not pages:
            return []

        # Step 1: Build scalar features for all pages (cheap, no I/O)
        scalars = []
        for page in pages:
            domain_stats = self._get_domain_stats(page.domain)
            scalar = ScalarFeatures(
                depth=0,
                domain_pages_crawled=domain_stats.get("pages_crawled", 0),
                domain_reward_sum=domain_stats.get("reward_sum", 0.0),
                link_count=page.link_count,
                body_length=page.body_length,
                response_time_ms=page.fetch_time_ms,
            )
            scalars.append(scalar)

        # Step 2: Batch embed all page texts at once
        texts = [
            p.body_text[:self.config.embedding.max_text_chars] for p in pages
        ]
        try:
            embeddings = self.embedder.embed_batch(texts)
        except (AttributeError, NotImplementedError):
            # Fallback: embedder doesn't support batch, embed individually
            embeddings = [self.embedder.embed_text(t) for t in texts]
        except Exception as exc:
            logger.error("Batch embedding failed, falling back to sequential: %s", exc)
            embeddings = []
            for t in texts:
                try:
                    embeddings.append(self.embedder.embed_text(t))
                except Exception:
                    embeddings.append(None)

        # Step 3: Batch build state vectors
        states = []
        for i, page in enumerate(pages):
            emb = embeddings[i] if i < len(embeddings) else None
            if emb is None:
                states.append(None)
                continue
            try:
                state = self.state_builder.build_state(
                    page.body_text,
                    scalars[i],
                    precomputed_embedding=emb,
                )
                states.append(state)
            except Exception as exc:
                logger.error("State build failed for %s: %s", page.url, exc)
                states.append(None)

        # Step 4: Process each page with pre-computed embedding/state
        results: List[Optional[CrawlResult]] = []
        for i, page in enumerate(pages):
            if states[i] is None or embeddings[i] is None:
                results.append(None)
                continue
            result = await self._process_page_with_precomputed(
                page, embeddings[i], scalars[i], states[i]
            )
            results.append(result)

        return results

    async def _process_page_with_precomputed(
        self,
        page: PageContent,
        embedding: np.ndarray,
        scalar: ScalarFeatures,
        state: np.ndarray,
    ) -> Optional[CrawlResult]:
        """Process a page with pre-computed embedding and state vector."""
        try:
            # Select action (link to follow) via DQN
            action, epsilon, q_value = self._select_action(
                state, len(page.outbound_links)
            )

            # Initial reward: -0.01 cost per page crawled.
            reward = -0.01
            self._all_rewards.append(reward)

            # Store in replay buffer
            zero_state = np.zeros_like(state)
            done = check_episode_done(
                domain_frontier_empty=not self.engine.frontier.has_pending(page.domain),
                depth=self._episode_depth,
                pages_crawled=self._episode_pages,
            )

            if self.replay:
                try:
                    self.replay.add(
                        state=state,
                        action=action,
                        reward=reward,
                        next_state=zero_state if done else state,
                        done=done,
                        url=page.url,
                    )
                except Exception as exc:
                    logger.error("Replay buffer add failed for %s: %s", page.url, exc)

            # Update domain scheduler
            self.engine.scheduler.update_domain(page.domain, reward)

            # Update frontier Q-values for discovered links
            if self.agent or self.onnx_engine:
                self._score_discovered_links(page, embedding, scalar)

            # Track trajectory for hindsight relabeling
            self._trajectory.append({
                "url": page.url,
                "state": state,
                "action": action,
                "reward": reward,
                "step": self._global_step,
            })

            # Episode bookkeeping
            self._episode_pages += 1
            self._episode_depth += 1
            if done:
                self._handle_episode_end()

            return CrawlResult(
                page=page,
                state_vector=state,
                embedding=embedding,
                scalar_features=scalar,
                action=action,
                q_value=q_value,
                epsilon=epsilon,
            )

        except Exception as exc:
            logger.error("Error in precomputed processing for %s: %s", page.url, exc)
            return None

    def _select_action(
        self, state: np.ndarray, num_links: int
    ) -> tuple:
        """Select action using DQN agent or ONNX engine.

        Returns (action, epsilon, q_value).
        """
        if num_links == 0:
            return 0, 1.0, 0.0

        # ONNX inference (production mode)
        if self.onnx_engine:
            action = self.onnx_engine.select_action(state, num_links)
            q_values = self.onnx_engine.predict_q_values(state)
            return action, 0.0, float(q_values[action])

        # PyTorch agent (training mode)
        if self.agent:
            action, epsilon = self.agent.select_action(
                state, num_links, self._global_step
            )
            return action, epsilon, 0.0

        # Random fallback
        action = int(np.random.randint(0, min(num_links, 10)))
        return action, 1.0, 0.0

    def _score_discovered_links(
        self,
        page: PageContent,
        page_embedding: np.ndarray,
        page_scalar: ScalarFeatures,
    ) -> None:
        """Score discovered links and update frontier Q-values.

        Uses the DQN to estimate Q-values for outbound links based on
        the current page's context.
        """
        if not page.outbound_links:
            return

        # For efficiency, batch-score a subset
        links = page.outbound_links[:self.config.dqn.action_dim]
        state = self.state_builder.build_state(
            page.body_text, page_scalar, precomputed_embedding=page_embedding
        )

        if self.onnx_engine:
            q_values = self.onnx_engine.predict_q_values(state)
        elif self.agent:
            import torch

            state_t = torch.as_tensor(
                state, dtype=torch.float32, device=self.agent.device
            ).unsqueeze(0)
            with torch.no_grad():
                q_values = self.agent.q_network(state_t).cpu().numpy().flatten()
        else:
            return

        for i, link in enumerate(links):
            if i < len(q_values):
                canonical = canonicalize_url(link)
                self.engine.frontier.update_q_value(canonical, float(q_values[i]))

    def _get_domain_stats(self, domain: str) -> Dict[str, Any]:
        """Retrieve domain stats from the scheduler."""
        all_stats = self.engine.scheduler.get_all_stats()
        for s in all_stats:
            if s["domain"] == domain:
                return s
        return {"pages_crawled": 0, "reward_sum": 0.0}

    # ---- Training -----------------------------------------------------------

    def _train_step(self) -> None:
        """One DQN training step on a batch from the replay buffer."""
        if self.agent is None or self.replay is None:
            return

        batch = self.replay.sample(self.config.dqn.batch_size)
        states, actions, rewards, next_states, dones, weights, indices = batch

        loss, td_errors = self.agent.train_step_on_batch(
            states, actions, rewards, next_states, dones, weights
        )

        # Update PER priorities
        self.replay.update_priorities(indices, td_errors)

        # Save policy snapshot for actor threads
        if self.agent.train_step % self.config.policy_save_interval == 0:
            self.agent.save_policy_snapshot()

        # Export ONNX periodically
        if (
            self.config.onnx_export_interval > 0
            and self.agent.train_step % self.config.onnx_export_interval == 0
        ):
            try:
                onnx_path = self.agent.export_onnx()
                logger.info("Exported ONNX at step %d -> %s", self.agent.train_step, onnx_path)
            except Exception as exc:
                logger.error("ONNX export failed: %s", exc)

        # Log convergence metrics
        if self.agent.train_step % self.config.log_interval == 0:
            metrics = self.agent.get_convergence_metrics(self._all_rewards)
            metrics["replay_size"] = self.replay.size
            metrics["unresolved_rewards"] = self.replay.count_unresolved()
            logger.info("Train metrics: %s", json.dumps(metrics))

    # ---- Episode Management -------------------------------------------------

    def _handle_episode_end(self) -> None:
        """Handle end of a crawling episode."""
        # Apply hindsight reward relabeling if there were positive rewards
        if self._trajectory:
            positive = [t for t in self._trajectory if t["reward"] > 0]
            if positive:
                self._trajectory = relabel_trajectory_hindsight(
                    self._trajectory,
                    final_reward=max(t["reward"] for t in positive),
                    gamma=self.config.dqn.gamma,
                )

        # Reset episode state
        self._trajectory = []
        self._episode_pages = 0
        self._episode_depth = 0
        self._current_domain = None

    # ---- Periodic Maintenance -----------------------------------------------

    def _periodic_maintenance(self) -> None:
        """Run periodic maintenance tasks."""
        now = time.time()

        # Prune failed frontier entries
        if now - self._last_prune_time > self.config.prune_interval:
            self.engine.frontier.prune_failed()
            if self.replay:
                self.replay.prune_old_pending()
            self._last_prune_time = now

    # ---- Background Tasks ---------------------------------------------------

    async def _resolve_pending_rewards_periodic(
        self, stop_event: asyncio.Event
    ) -> None:
        """Background task that periodically checks for resolved rewards.

        Runs every 60 seconds. Calls self.replay.resolve_pending_rewards()
        with results from the extraction module.
        """
        while not stop_event.is_set():
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=60.0)
                # If we get here, stop_event was set
                break
            except asyncio.TimeoutError:
                # 60 seconds elapsed, run the resolution
                pass

            if self.replay is None:
                continue

            try:
                pending = self.replay.get_pending_reward_urls()
                if pending:
                    # Extraction results are stored as pending rewards in
                    # the replay buffer's SQLite; resolve_pending_rewards
                    # patches them into the mmap arrays.
                    resolved = self.replay.resolve_pending_rewards(pending)
                    if resolved > 0:
                        logger.info(
                            "Background reward resolution: %d rewards resolved",
                            resolved,
                        )
            except Exception as exc:
                logger.error("Background reward resolution error: %s", exc)

    # ---- Progress Logging ---------------------------------------------------

    def _log_progress(self) -> None:
        """Log progress at regular intervals.

        Every 100 pages: log pages_crawled, pages/sec, harvest_rate, epsilon, replay_size.
        Every 1000 pages: log detailed stats including top 5 domains.
        """
        step = self._global_step

        if step == 0:
            return

        if step % 100 == 0:
            pages_per_sec = self._calculate_pages_per_sec()
            harvest_rate = (
                sum(1 for r in self._all_rewards if r >= 0.2)
                / max(len(self._all_rewards), 1)
            )
            epsilon = (
                self.agent.epsilon_scheduler.get_epsilon(step)
                if self.agent and hasattr(self.agent, "epsilon_scheduler")
                else 1.0
            )
            replay_size = self.replay.size if self.replay else 0

            logger.info(
                "Progress [%d pages]: %.1f pages/sec | harvest_rate=%.4f | "
                "epsilon=%.4f | replay_size=%d",
                step,
                pages_per_sec,
                harvest_rate,
                epsilon,
                replay_size,
            )

        if step % 1000 == 0:
            detailed = self._collect_stats()
            # Get top 5 domains by pages crawled
            top_domains = []
            if self.engine:
                all_domain_stats = self.engine.scheduler.get_all_stats()
                sorted_domains = sorted(
                    all_domain_stats,
                    key=lambda d: d.get("pages_crawled", 0),
                    reverse=True,
                )
                top_domains = [
                    {"domain": d["domain"], "pages": d.get("pages_crawled", 0)}
                    for d in sorted_domains[:5]
                ]

            logger.info(
                "Detailed stats [%d pages]: %s | top_domains=%s",
                step,
                json.dumps(detailed.get("rewards", {})),
                json.dumps(top_domains),
            )

    def _calculate_pages_per_sec(self) -> float:
        """Calculate rolling pages/sec from the last 100 page timestamps."""
        if len(self._page_timestamps) < 2:
            return 0.0
        elapsed = self._page_timestamps[-1] - self._page_timestamps[0]
        if elapsed <= 0:
            return 0.0
        return (len(self._page_timestamps) - 1) / elapsed

    # ---- Live Stats ---------------------------------------------------------

    def get_live_stats(self) -> Dict[str, Any]:
        """Real-time stats for the health endpoint.

        Returns:
            Dict with pages/sec (rolling 100 pages), current epsilon,
            frontier pending count, replay buffer size, current domain,
            and memory usage estimate.
        """
        pages_per_sec = self._calculate_pages_per_sec()

        epsilon = 1.0
        if self.agent and hasattr(self.agent, "epsilon_scheduler"):
            epsilon = self.agent.epsilon_scheduler.get_epsilon(self._global_step)

        frontier_pending = 0
        if self.engine and self.engine.frontier:
            try:
                frontier_pending = self.engine.frontier.pending_count()
            except Exception:
                pass

        replay_size = self.replay.size if self.replay else 0

        # Memory usage estimate (MB)
        memory_mb = 0.0
        if self.replay:
            # mmap replay buffer: state_dim * capacity * 4 bytes * 2 (state + next_state)
            replay_mem = (
                self.config.replay.state_dim
                * self.config.replay.capacity
                * 4
                * 2
                / (1024 * 1024)
            )
            memory_mb += replay_mem
        if self.embedder:
            memory_mb += 300.0  # approximate model size
        if self.agent:
            memory_mb += 10.0  # approximate DQN size

        return {
            "pages_per_sec": round(pages_per_sec, 2),
            "epsilon": round(epsilon, 4),
            "frontier_pending": frontier_pending,
            "replay_size": replay_size,
            "current_domain": self._current_domain,
            "global_step": self._global_step,
            "memory_estimate_mb": round(memory_mb, 1),
        }

    # ---- Run with Evaluation ------------------------------------------------

    async def run_with_eval(
        self,
        seed_urls: Optional[List[str]] = None,
        max_pages: Optional[int] = None,
        on_page_callback: Optional[Callable] = None,
        eval_interval: int = 500,
        eval_pages: int = 50,
    ) -> Dict[str, Any]:
        """Same as run() but periodically evaluates the agent.

        Every eval_interval pages, runs a mini-evaluation by crawling
        eval_pages in greedy mode (epsilon=0) and logging metrics.

        Args:
            seed_urls: initial URLs to crawl.
            max_pages: override config max_pages.
            on_page_callback: async callable(CrawlResult) for downstream modules.
            eval_interval: run evaluation every N pages.
            eval_pages: number of pages to evaluate on.

        Returns:
            Final statistics dict with evaluation history.
        """
        if not self._initialised:
            await self.initialise()

        max_pages = max_pages or self.config.max_pages
        eval_history: List[Dict[str, Any]] = []
        last_eval_step = 0

        # Add seeds
        if seed_urls:
            self.engine.add_seed_urls(seed_urls)

        # Start browser
        await self.engine.start()
        self._last_prune_time = time.time()

        # Signal handling for graceful shutdown
        loop = asyncio.get_running_loop()
        stop_event = asyncio.Event()

        def _signal_handler():
            logger.info("Shutdown signal received")
            stop_event.set()

        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _signal_handler)

        # Start background reward resolution task
        self._reward_task = asyncio.create_task(
            self._resolve_pending_rewards_periodic(stop_event)
        )

        logger.info(
            "Starting crawl loop with eval (max_pages=%d, eval_interval=%d)",
            max_pages,
            eval_interval,
        )

        try:
            while self._global_step < max_pages and not stop_event.is_set():
                # Check frontier
                if not self.engine.frontier.has_pending():
                    logger.info("Frontier exhausted at step %d", self._global_step)
                    break

                # Crawl a batch
                pages = await self.engine.crawl_batch(
                    batch_size=self.engine.config.max_concurrent
                )
                if not pages:
                    await asyncio.sleep(1.0)
                    continue

                # Process batch concurrently
                results = await self._process_pages_batch(pages)
                for result in results:
                    if result and on_page_callback:
                        try:
                            await on_page_callback(result)
                        except Exception as exc:
                            logger.error("Callback error: %s", exc)

                    self._global_step += 1
                    self._page_timestamps.append(time.monotonic())
                    self._log_progress()

                # Train DQN
                if (
                    self.agent
                    and self.replay
                    and self.replay.size >= self.config.train_after_n_pages
                    and self._global_step % self.config.train_every_n_steps == 0
                ):
                    self._train_step()

                # Periodic tasks
                self._periodic_maintenance()

                # Mini-evaluation
                if (
                    self._global_step - last_eval_step >= eval_interval
                    and self.agent
                ):
                    eval_result = await self._run_mini_eval(eval_pages)
                    eval_result["step"] = self._global_step
                    eval_history.append(eval_result)
                    last_eval_step = self._global_step
                    logger.info(
                        "Eval at step %d: %s",
                        self._global_step,
                        json.dumps(eval_result),
                    )

        except KeyboardInterrupt:
            logger.info("Crawl interrupted by user at step %d", self._global_step)
        except Exception as exc:
            logger.error("Pipeline error: %s", exc, exc_info=True)
        finally:
            # Cancel background reward task
            stop_event.set()
            if self._reward_task and not self._reward_task.done():
                self._reward_task.cancel()
                try:
                    await self._reward_task
                except asyncio.CancelledError:
                    pass
            for sig in (signal.SIGTERM, signal.SIGINT):
                loop.remove_signal_handler(sig)
            stats = self._collect_stats()
            stats["eval_history"] = eval_history
            logger.info("Crawl loop finished: %s", json.dumps(stats, indent=2))

        return stats

    async def _run_mini_eval(self, eval_pages: int) -> Dict[str, Any]:
        """Run a mini-evaluation: crawl eval_pages in greedy mode.

        Temporarily sets epsilon to 0 so the agent acts greedily,
        then restores the original schedule.

        Returns:
            Evaluation metrics dict.
        """
        eval_rewards: List[float] = []
        eval_q_values: List[float] = []
        pages_crawled = 0

        for _ in range(eval_pages):
            if not self.engine.frontier.has_pending():
                break

            pages = await self.engine.crawl_batch(batch_size=1)
            if not pages:
                break

            page = pages[0]
            try:
                domain_stats = self._get_domain_stats(page.domain)
                scalar = ScalarFeatures(
                    depth=0,
                    domain_pages_crawled=domain_stats.get("pages_crawled", 0),
                    domain_reward_sum=domain_stats.get("reward_sum", 0.0),
                    link_count=page.link_count,
                    body_length=page.body_length,
                    response_time_ms=page.fetch_time_ms,
                )
                embedding = self.embedder.embed_text(
                    page.body_text[:self.config.embedding.max_text_chars]
                )
                state = self.state_builder.build_state(
                    page.body_text, scalar, precomputed_embedding=embedding
                )

                # Greedy action (epsilon=0)
                if self.onnx_engine:
                    action = self.onnx_engine.select_action(
                        state, len(page.outbound_links)
                    )
                    q_values = self.onnx_engine.predict_q_values(state)
                    q_val = float(q_values[action])
                elif self.agent:
                    import torch

                    state_t = torch.as_tensor(
                        state, dtype=torch.float32, device=self.agent.device
                    ).unsqueeze(0)
                    with torch.no_grad():
                        q_out = self.agent.q_network(state_t).cpu().numpy().flatten()
                    num_links = max(len(page.outbound_links), 1)
                    action = int(np.argmax(q_out[:num_links]))
                    q_val = float(q_out[action])
                else:
                    continue

                eval_q_values.append(q_val)
                eval_rewards.append(-0.01)  # Actual reward pending
                pages_crawled += 1

            except Exception as exc:
                logger.error("Eval page processing error: %s", exc)
                continue

        return {
            "eval_pages": pages_crawled,
            "mean_q_value": round(float(np.mean(eval_q_values)), 4) if eval_q_values else 0.0,
            "std_q_value": round(float(np.std(eval_q_values)), 4) if eval_q_values else 0.0,
            "max_q_value": round(float(np.max(eval_q_values)), 4) if eval_q_values else 0.0,
            "min_q_value": round(float(np.min(eval_q_values)), 4) if eval_q_values else 0.0,
        }

    # ---- External Integration -----------------------------------------------

    def resolve_rewards(
        self, extraction_results: List[Dict[str, Any]]
    ) -> int:
        """Resolve pending rewards from the extraction module (Module 2).

        Called by the pipeline orchestrator when extraction results arrive.

        Args:
            extraction_results: list of {"url": str, "reward": float}.

        Returns:
            Number of rewards resolved.
        """
        if self.replay is None:
            return 0
        return self.replay.resolve_pending_rewards(extraction_results)

    # ---- Statistics ---------------------------------------------------------

    def _collect_stats(self) -> Dict[str, Any]:
        """Collect comprehensive pipeline statistics."""
        stats: Dict[str, Any] = {
            "global_step": self._global_step,
            "crawler": self.engine.get_stats() if self.engine else {},
            "replay": self.replay.get_buffer_stats() if self.replay else {},
        }

        if self.agent:
            stats["dqn"] = self.agent.get_convergence_metrics(self._all_rewards)

        if self._all_rewards:
            stats["rewards"] = {
                "total": len(self._all_rewards),
                "mean": round(float(np.mean(self._all_rewards)), 4),
                "positive_count": sum(1 for r in self._all_rewards if r > 0),
                "harvest_rate": round(
                    sum(1 for r in self._all_rewards if r >= 0.2)
                    / max(len(self._all_rewards), 1),
                    4,
                ),
            }

        return stats

    def get_stats(self) -> Dict[str, Any]:
        """Public accessor for current statistics."""
        return self._collect_stats()


# ======================= Entry Point ========================================

async def run_crawler_pipeline(
    seed_urls: List[str],
    config: Optional[CrawlerPipelineConfig] = None,
    max_pages: Optional[int] = None,
    on_page_callback: Optional[Callable] = None,
) -> Dict[str, Any]:
    """Convenience entry point for the Module 1 crawler pipeline.

    Usage:
        import asyncio
        from crawler_pipeline import run_crawler_pipeline

        stats = asyncio.run(run_crawler_pipeline(
            seed_urls=["https://example.com/companies"],
            max_pages=1000,
        ))
    """
    pipeline = CrawlerPipeline(config)
    try:
        return await pipeline.run(
            seed_urls=seed_urls,
            max_pages=max_pages,
            on_page_callback=on_page_callback,
        )
    finally:
        await pipeline.shutdown()


# Allow running directly: python -m crawler_pipeline
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrapus Module 1: RL Crawler")
    parser.add_argument(
        "--seeds",
        nargs="+",
        required=True,
        help="Seed URLs to start crawling from",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=1000,
        help="Maximum number of pages to crawl",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=8,
        help="Number of concurrent crawler workers",
    )
    parser.add_argument(
        "--use-onnx",
        action="store_true",
        help="Use ONNX inference instead of PyTorch",
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        default="scrapus_data",
        help="Data directory for models and storage",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(name)s %(levelname)s: %(message)s",
    )

    config = CrawlerPipelineConfig()
    config.crawler.max_concurrent = args.concurrency
    config.use_onnx_inference = args.use_onnx
    config.data_dir = args.data_dir

    stats = asyncio.run(
        run_crawler_pipeline(
            seed_urls=args.seeds,
            config=config,
            max_pages=args.max_pages,
        )
    )

    print("\n=== Crawl Statistics ===")
    print(json.dumps(stats, indent=2))
