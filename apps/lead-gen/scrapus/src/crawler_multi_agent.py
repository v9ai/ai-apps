"""
Module 1: Multi-agent competitive crawling.

Runs N crawler agents on the same web graph with competitive/cooperative
dynamics. Agents claim domains, bid in auctions, and receive shaped rewards
that induce natural specialisation (e.g., by industry vertical, domain type,
or geographic region) without explicit assignment.

Integration points:
- CrawlerPipeline: each agent wraps a full pipeline instance
- DomainClaimManager: tracks domain ownership via auction mechanism
- SharedRewardShaper: modifies rewards based on multi-agent dynamics
- AgentCommunicationBus: async in-process message passing (no network)

Memory budget: ~750 MB per agent * N agents, shared embedder reduces total.
Target: Apple M1 16GB — default 4 agents at ~550 MB each = ~2.2 GB active.
"""

import asyncio
import logging
import time
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

import numpy as np

from crawler_engine import CrawlerConfig, URLFrontier, DomainScheduler
from crawler_pipeline import CrawlerPipeline, CrawlerPipelineConfig, CrawlResult

logger = logging.getLogger("crawler_multi_agent")


# ======================= Configuration ======================================

@dataclass
class MultiAgentConfig:
    """Configuration for multi-agent competitive crawling."""

    # Agent count
    n_agents: int = 4

    # Domain claiming
    claim_radius: int = 50  # pages claimed per domain per agent

    # Collaboration dynamics
    collaboration_mode: str = "competitive"  # competitive | cooperative | mixed
    shared_frontier: bool = True
    reward_sharing: float = 0.0  # 0=individual, 1=full sharing
    diversity_bonus: float = 0.1  # bonus for visiting unclaimed pages
    communication_interval: int = 100  # steps between agent syncs

    # Auction parameters
    auction_reserve_price: float = 0.0  # minimum bid to claim a domain
    auction_decay_rate: float = 0.01  # claim strength decays per step without activity

    # Memory constraints (M1 16GB target)
    max_memory_per_agent_mb: int = 550
    shared_embedder: bool = True  # share a single embedder across agents

    # Per-agent pipeline config override
    pipeline_config: Optional[CrawlerPipelineConfig] = None

    def __post_init__(self) -> None:
        if self.collaboration_mode not in ("competitive", "cooperative", "mixed"):
            raise ValueError(
                f"Invalid collaboration_mode: {self.collaboration_mode}. "
                "Must be one of: competitive, cooperative, mixed"
            )


# ======================= Agent State ========================================

@dataclass
class AgentState:
    """Tracks the state of a single crawler agent."""

    agent_id: int
    policy_path: str
    claimed_domains: Set[str] = field(default_factory=set)
    pages_crawled: int = 0
    leads_found: int = 0
    reward_total: float = 0.0
    current_domain: Optional[str] = None
    specialization: Optional[str] = None  # emerges from training

    # Per-domain page counts for claim tracking
    domain_page_counts: Dict[str, int] = field(default_factory=lambda: defaultdict(int))

    # Rolling reward window for specialisation detection
    domain_rewards: Dict[str, List[float]] = field(
        default_factory=lambda: defaultdict(list)
    )

    def update_specialization(self) -> None:
        """Detect emergent specialisation from domain reward history.

        The agent's specialisation is the domain where it has the highest
        average reward over the last 100 pages.
        """
        if not self.domain_rewards:
            self.specialization = None
            return

        best_domain: Optional[str] = None
        best_avg = -float("inf")

        for domain, rewards in self.domain_rewards.items():
            if len(rewards) < 5:
                continue
            recent = rewards[-100:]
            avg = sum(recent) / len(recent)
            if avg > best_avg:
                best_avg = avg
                best_domain = domain

        self.specialization = best_domain

    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "policy_path": self.policy_path,
            "claimed_domains": len(self.claimed_domains),
            "pages_crawled": self.pages_crawled,
            "leads_found": self.leads_found,
            "reward_total": round(self.reward_total, 4),
            "current_domain": self.current_domain,
            "specialization": self.specialization,
        }


# ======================= Communication Bus ==================================

class MessageType(Enum):
    """Message types for inter-agent communication."""

    DOMAIN_DISCOVERY = "domain_discovery"
    REWARD_SIGNAL = "reward_signal"
    FRONTIER_SHARE = "frontier_share"
    SPECIALIZATION = "specialization"


@dataclass
class AgentMessage:
    """A message between crawler agents."""

    sender_id: int
    msg_type: MessageType
    payload: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)


class AgentCommunicationBus:
    """Async in-process message passing between crawler agents.

    Uses asyncio queues for zero-network overhead on M1 single-machine.
    Each agent has an inbox queue; broadcast sends to all other agents.
    """

    def __init__(self, n_agents: int) -> None:
        self._n_agents = n_agents
        self._inboxes: Dict[int, asyncio.Queue[AgentMessage]] = {
            i: asyncio.Queue(maxsize=1000) for i in range(n_agents)
        }
        self._message_count = 0
        self._dropped_count = 0

    async def send(self, message: AgentMessage, recipient_id: int) -> bool:
        """Send a message to a specific agent. Returns False if inbox full."""
        if recipient_id not in self._inboxes:
            return False
        try:
            self._inboxes[recipient_id].put_nowait(message)
            self._message_count += 1
            return True
        except asyncio.QueueFull:
            self._dropped_count += 1
            return False

    async def broadcast(
        self, message: AgentMessage, exclude_sender: bool = True
    ) -> int:
        """Broadcast a message to all agents. Returns count of successful deliveries."""
        delivered = 0
        for agent_id, inbox in self._inboxes.items():
            if exclude_sender and agent_id == message.sender_id:
                continue
            try:
                inbox.put_nowait(message)
                delivered += 1
                self._message_count += 1
            except asyncio.QueueFull:
                self._dropped_count += 1
        return delivered

    async def receive(self, agent_id: int, timeout: float = 0.0) -> Optional[AgentMessage]:
        """Receive a message for an agent. Non-blocking by default."""
        if agent_id not in self._inboxes:
            return None
        try:
            if timeout > 0:
                return await asyncio.wait_for(
                    self._inboxes[agent_id].get(), timeout=timeout
                )
            return self._inboxes[agent_id].get_nowait()
        except (asyncio.QueueEmpty, asyncio.TimeoutError):
            return None

    async def drain(self, agent_id: int) -> List[AgentMessage]:
        """Drain all pending messages for an agent."""
        messages: List[AgentMessage] = []
        while True:
            msg = await self.receive(agent_id)
            if msg is None:
                break
            messages.append(msg)
        return messages

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_messages": self._message_count,
            "dropped_messages": self._dropped_count,
            "queue_sizes": {
                aid: inbox.qsize() for aid, inbox in self._inboxes.items()
            },
        }


# ======================= Domain Claim Manager ===============================

class DomainClaimManager:
    """Tracks which agent has claimed which domains.

    Supports:
    - Explicit claim/release
    - Domain auctions: agents bid Q-values, highest bidder wins
    - Claim decay: claims weaken over time without activity
    - Negative reward for visiting another agent's claimed pages
    """

    def __init__(self, config: MultiAgentConfig) -> None:
        self.config = config

        # domain -> (agent_id, claim_strength, last_activity_time)
        self._claims: Dict[str, Tuple[int, float, float]] = {}

        # domain -> set of agent_ids that have visited pages on this domain
        self._visitors: Dict[str, Set[int]] = defaultdict(set)

        # Auction history for analysis
        self._auction_history: List[Dict[str, Any]] = []

    def claim_domain(self, agent_id: int, domain: str) -> bool:
        """Attempt to claim a domain for an agent.

        Returns True if the claim succeeded (domain was unclaimed or
        the existing claim has decayed below the reserve price).
        """
        if domain in self._claims:
            claimant_id, strength, last_active = self._claims[domain]

            # Decay the existing claim
            elapsed = time.time() - last_active
            decayed_strength = strength - elapsed * self.config.auction_decay_rate
            if decayed_strength > self.config.auction_reserve_price:
                # Existing claim still holds
                if claimant_id == agent_id:
                    # Refresh our own claim
                    self._claims[domain] = (agent_id, strength, time.time())
                    return True
                return False

        # Claim is available (unclaimed or decayed)
        self._claims[domain] = (agent_id, 1.0, time.time())
        return True

    def release_domain(self, agent_id: int, domain: str) -> None:
        """Release a domain claim."""
        if domain in self._claims:
            claimant_id, _, _ = self._claims[domain]
            if claimant_id == agent_id:
                del self._claims[domain]

    def get_claimant(self, domain: str) -> Optional[int]:
        """Get the agent that currently claims a domain, or None."""
        if domain not in self._claims:
            return None

        agent_id, strength, last_active = self._claims[domain]

        # Check if claim has decayed
        elapsed = time.time() - last_active
        decayed = strength - elapsed * self.config.auction_decay_rate
        if decayed <= self.config.auction_reserve_price:
            del self._claims[domain]
            return None

        return agent_id

    def auction(self, domain: str, bids: Dict[int, float]) -> int:
        """Run an auction for a domain. Highest bidder wins.

        Args:
            domain: the domain being auctioned.
            bids: mapping of agent_id -> bid value (Q-value estimate).

        Returns:
            Winner agent_id. Ties broken by lowest agent_id.
        """
        if not bids:
            raise ValueError("Cannot run auction with no bids")

        # Filter bids above reserve price
        valid_bids = {
            aid: bid
            for aid, bid in bids.items()
            if bid >= self.config.auction_reserve_price
        }

        if not valid_bids:
            # No bids above reserve; current claimant keeps it
            current = self.get_claimant(domain)
            if current is not None:
                return current
            # Fall back to first bidder
            winner = min(bids.keys())
            self._claims[domain] = (winner, bids[winner], time.time())
            self._auction_history.append({
                "domain": domain,
                "winner": winner,
                "bid": bids[winner],
                "n_bidders": len(bids),
                "below_reserve": True,
                "timestamp": time.time(),
            })
            return winner

        # Find highest bidder (ties broken by lowest agent_id)
        winner = min(valid_bids, key=lambda aid: (-valid_bids[aid], aid))
        winning_bid = valid_bids[winner]

        self._claims[domain] = (winner, winning_bid, time.time())

        self._auction_history.append({
            "domain": domain,
            "winner": winner,
            "bid": winning_bid,
            "n_bidders": len(bids),
            "below_reserve": False,
            "timestamp": time.time(),
        })

        return winner

    def record_visit(self, agent_id: int, domain: str) -> None:
        """Record that an agent visited a page on a domain."""
        self._visitors[domain].add(agent_id)

        # Refresh claim strength if agent owns this domain
        if domain in self._claims:
            claimant_id, strength, _ = self._claims[domain]
            if claimant_id == agent_id:
                self._claims[domain] = (agent_id, strength, time.time())

    def is_contested(self, domain: str) -> bool:
        """Check if multiple agents have visited this domain."""
        return len(self._visitors.get(domain, set())) > 1

    def get_all_claims(self) -> Dict[str, int]:
        """Return domain -> agent_id for all active claims."""
        active: Dict[str, int] = {}
        now = time.time()
        expired: List[str] = []

        for domain, (agent_id, strength, last_active) in self._claims.items():
            elapsed = now - last_active
            decayed = strength - elapsed * self.config.auction_decay_rate
            if decayed > self.config.auction_reserve_price:
                active[domain] = agent_id
            else:
                expired.append(domain)

        # Clean up expired claims
        for domain in expired:
            del self._claims[domain]

        return active

    def get_agent_claims(self, agent_id: int) -> Set[str]:
        """Get all domains claimed by a specific agent."""
        all_claims = self.get_all_claims()
        return {
            domain for domain, aid in all_claims.items() if aid == agent_id
        }

    def get_stats(self) -> Dict[str, Any]:
        active = self.get_all_claims()
        return {
            "total_claims": len(active),
            "contested_domains": sum(
                1 for d in self._visitors if len(self._visitors[d]) > 1
            ),
            "total_domains_visited": len(self._visitors),
            "auctions_run": len(self._auction_history),
            "claims_per_agent": dict(
                sorted(
                    defaultdict(
                        int,
                        {aid: 0 for aid in range(4)}
                        | {
                            aid: sum(1 for a in active.values() if a == aid)
                            for aid in set(active.values())
                        },
                    ).items()
                )
            ),
        }


# ======================= Shared Reward Shaper ===============================

class SharedRewardShaper:
    """Modifies rewards based on multi-agent dynamics.

    Applies penalties and bonuses to shape agent behaviour:
    - Penalty for visiting another agent's claimed page
    - Penalty for crawling the same domain as another agent concurrently
    - Bonus for visiting novel (unclaimed) domains
    - Bonus for discovering new high-value domains

    The shaped reward drives natural diversity: agents specialise in
    different domain types, industry verticals, or page categories
    without explicit assignment.
    """

    def __init__(
        self,
        config: MultiAgentConfig,
        claim_manager: DomainClaimManager,
    ) -> None:
        self.config = config
        self._claim_manager = claim_manager

        # Track which domains have been discovered as high-value
        self._high_value_domains: Set[str] = set()
        self._high_value_threshold: float = 0.5  # avg reward to qualify

        # Per-domain reward accumulator for high-value detection
        self._domain_reward_sums: Dict[str, float] = defaultdict(float)
        self._domain_reward_counts: Dict[str, int] = defaultdict(int)

        # Track active agents per domain (for concurrent-domain penalty)
        self._active_domains: Dict[int, Optional[str]] = {}

    def shape_reward(
        self,
        agent_id: int,
        url: str,
        base_reward: float,
    ) -> float:
        """Apply multi-agent reward shaping to a base reward.

        Args:
            agent_id: the agent receiving the reward.
            url: the URL that was crawled.
            base_reward: the original reward from the pipeline.

        Returns:
            Shaped reward incorporating multi-agent dynamics.
        """
        from urllib.parse import urlparse

        domain = urlparse(url).netloc
        shaped = base_reward

        # --- Penalties ---

        # Penalty: visiting another agent's claimed page
        claimant = self._claim_manager.get_claimant(domain)
        if claimant is not None and claimant != agent_id:
            shaped -= 0.5

        # Penalty: same domain as another active agent
        for other_id, other_domain in self._active_domains.items():
            if other_id != agent_id and other_domain == domain:
                shaped -= 0.1
                break  # only penalise once

        # --- Bonuses ---

        # Bonus: novel domain (no one has claimed it)
        if claimant is None:
            shaped += self.config.diversity_bonus

        # Bonus: discovering new high-value domain
        self._domain_reward_sums[domain] += base_reward
        self._domain_reward_counts[domain] += 1
        avg = self._domain_reward_sums[domain] / self._domain_reward_counts[domain]

        if (
            avg >= self._high_value_threshold
            and self._domain_reward_counts[domain] >= 3
            and domain not in self._high_value_domains
        ):
            self._high_value_domains.add(domain)
            shaped += 0.2

        # --- Reward sharing (cooperative/mixed modes) ---
        if self.config.reward_sharing > 0.0:
            # Blend individual reward with global component
            # In full sharing (1.0), all agents get the same reward
            # In partial sharing, it is a weighted average
            shaped = (
                (1.0 - self.config.reward_sharing) * shaped
                + self.config.reward_sharing * base_reward
            )

        # Record this agent's active domain
        self._active_domains[agent_id] = domain

        return shaped

    def set_active_domain(self, agent_id: int, domain: Optional[str]) -> None:
        """Update the active domain for an agent."""
        self._active_domains[agent_id] = domain

    def get_high_value_domains(self) -> Set[str]:
        """Return the set of discovered high-value domains."""
        return set(self._high_value_domains)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "high_value_domains": len(self._high_value_domains),
            "tracked_domains": len(self._domain_reward_counts),
            "active_agents": {
                aid: domain
                for aid, domain in self._active_domains.items()
                if domain is not None
            },
        }


# ======================= Multi-Agent Orchestrator ===========================

class MultiAgentOrchestrator:
    """Manages N CrawlerPipeline instances with multi-agent dynamics.

    Provides:
    - Shared URL frontier with agent-aware scoring
    - Domain claim auctions
    - Shaped rewards for natural diversity pressure
    - Agent communication via async message bus
    - Per-agent and aggregate statistics

    Execution modes:
    - Round-robin: agents take turns stepping
    - Parallel: all agents step concurrently (higher throughput, more memory)
    """

    def __init__(
        self,
        config: Optional[MultiAgentConfig] = None,
    ) -> None:
        self.config = config or MultiAgentConfig()

        # Core components
        self._claim_manager = DomainClaimManager(self.config)
        self._reward_shaper = SharedRewardShaper(
            self.config, self._claim_manager
        )
        self._comm_bus = AgentCommunicationBus(self.config.n_agents)

        # Agent states
        self._agent_states: List[AgentState] = []
        for i in range(self.config.n_agents):
            state = AgentState(
                agent_id=i,
                policy_path=f"scrapus_data/models/dqn/agent_{i}_policy.pt",
            )
            self._agent_states.append(state)

        # Pipeline instances (created during initialise)
        self._pipelines: List[CrawlerPipeline] = []

        # Global tracking
        self._global_step: int = 0
        self._start_time: Optional[float] = None
        self._initialised: bool = False

        # Visited URLs per agent (for overlap tracking)
        self._agent_visited: Dict[int, Set[str]] = {
            i: set() for i in range(self.config.n_agents)
        }

    # ---- Lifecycle ----------------------------------------------------------

    async def initialise(self) -> None:
        """Create and initialise all agent pipelines."""
        logger.info(
            "Initialising multi-agent orchestrator (%d agents, mode=%s)",
            self.config.n_agents,
            self.config.collaboration_mode,
        )

        base_config = self.config.pipeline_config or CrawlerPipelineConfig()

        for i in range(self.config.n_agents):
            # Clone config with per-agent data directory and memory budget
            agent_config = CrawlerPipelineConfig(
                dqn=base_config.dqn,
                embedding=base_config.embedding,
                crawler=base_config.crawler,
                replay=base_config.replay,
                max_pages=base_config.max_pages,
                train_after_n_pages=base_config.train_after_n_pages,
                train_every_n_steps=base_config.train_every_n_steps,
                policy_save_interval=base_config.policy_save_interval,
                onnx_export_interval=base_config.onnx_export_interval,
                log_interval=base_config.log_interval,
                memory_budget_mb=self.config.max_memory_per_agent_mb,
                data_dir=f"scrapus_data/agent_{i}",
            )

            pipeline = CrawlerPipeline(agent_config)
            await pipeline.initialise()
            self._pipelines.append(pipeline)

            logger.info("Agent %d initialised (data_dir=%s)", i, agent_config.data_dir)

        self._initialised = True
        logger.info("Multi-agent orchestrator initialised")

    async def shutdown(self) -> None:
        """Shut down all agent pipelines in parallel."""
        logger.info("Shutting down multi-agent orchestrator...")

        shutdown_tasks = [p.shutdown() for p in self._pipelines]
        await asyncio.gather(*shutdown_tasks, return_exceptions=True)

        self._pipelines.clear()
        self._initialised = False
        logger.info("Multi-agent orchestrator shut down")

    # ---- Main Run Loop ------------------------------------------------------

    async def run(
        self,
        seed_urls: List[str],
        max_pages: Optional[int] = None,
        on_page_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """Run the multi-agent crawl loop.

        Seeds are distributed across agents. Each agent runs its own
        CrawlerPipeline with shaped rewards and domain claiming.

        Args:
            seed_urls: initial URLs to distribute across agents.
            max_pages: total pages across all agents before stopping.
            on_page_callback: async callable(agent_id, CrawlResult).

        Returns:
            Aggregate statistics dict.
        """
        if not self._initialised:
            await self.initialise()

        max_pages = max_pages or sum(
            p.config.max_pages for p in self._pipelines
        )
        self._start_time = time.time()

        # Distribute seed URLs across agents (round-robin)
        for i, url in enumerate(seed_urls):
            agent_idx = i % self.config.n_agents
            pipeline = self._pipelines[agent_idx]
            pipeline.engine.add_seed_urls([url])

        logger.info(
            "Starting multi-agent crawl (agents=%d, max_pages=%d, seeds=%d)",
            self.config.n_agents,
            max_pages,
            len(seed_urls),
        )

        try:
            total_pages = 0

            while total_pages < max_pages:
                # Run one round across all agents
                round_pages = await self._run_round(on_page_callback)

                if round_pages == 0:
                    # All frontiers exhausted
                    all_empty = all(
                        not p.engine.frontier.has_pending()
                        for p in self._pipelines
                    )
                    if all_empty:
                        logger.info(
                            "All frontiers exhausted at total_pages=%d",
                            total_pages,
                        )
                        break
                    await asyncio.sleep(1.0)
                    continue

                total_pages += round_pages
                self._global_step += 1

                # Periodic agent communication
                if self._global_step % self.config.communication_interval == 0:
                    await self._agent_sync()

        except KeyboardInterrupt:
            logger.info("Multi-agent crawl interrupted at step %d", self._global_step)
        except Exception as exc:
            logger.error("Orchestrator error: %s", exc, exc_info=True)

        stats = self._collect_stats()
        logger.info("Multi-agent crawl finished: %s", stats)
        return stats

    async def _run_round(
        self,
        on_page_callback: Optional[Callable] = None,
    ) -> int:
        """Run one round of crawling across all agents.

        In competitive/mixed mode, agents run in parallel.
        Returns total pages crawled this round.
        """
        tasks = []
        for i, pipeline in enumerate(self._pipelines):
            tasks.append(
                self._agent_step(i, pipeline, on_page_callback)
            )

        results = await asyncio.gather(*tasks, return_exceptions=True)

        total = 0
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error("Agent %d step failed: %s", i, result)
            elif isinstance(result, int):
                total += result

        return total

    async def _agent_step(
        self,
        agent_id: int,
        pipeline: CrawlerPipeline,
        on_page_callback: Optional[Callable] = None,
    ) -> int:
        """Execute one crawl batch for a single agent with reward shaping.

        Returns the number of pages crawled.
        """
        state = self._agent_states[agent_id]

        if not pipeline.engine.frontier.has_pending():
            return 0

        # Start browser if needed
        if pipeline.engine.fetcher._browser is None:
            await pipeline.engine.start()

        # Crawl a batch
        pages = await pipeline.engine.crawl_batch(
            batch_size=pipeline.engine.config.max_concurrent
        )

        if not pages:
            return 0

        pages_processed = 0

        for page in pages:
            # Process through the pipeline
            result = await pipeline._process_page(page)
            if result is None:
                continue

            # Shape the reward
            base_reward = -0.01  # default cost
            shaped_reward = self._reward_shaper.shape_reward(
                agent_id, page.url, base_reward
            )

            # Domain claim management
            domain = page.domain
            claimant = self._claim_manager.get_claimant(domain)

            if claimant is None:
                # Unclaimed — try to claim it
                self._claim_manager.claim_domain(agent_id, domain)
                state.claimed_domains.add(domain)
            elif claimant == agent_id:
                # Refresh our claim
                self._claim_manager.claim_domain(agent_id, domain)

            self._claim_manager.record_visit(agent_id, domain)

            # Update agent state
            state.pages_crawled += 1
            state.reward_total += shaped_reward
            state.current_domain = domain
            state.domain_page_counts[domain] += 1
            state.domain_rewards[domain].append(shaped_reward)

            # Track visited URLs
            self._agent_visited[agent_id].add(page.url)

            # Check if we have exceeded claim_radius for this domain
            if state.domain_page_counts[domain] >= self.config.claim_radius:
                # Release domain so other agents can claim it
                self._claim_manager.release_domain(agent_id, domain)
                state.claimed_domains.discard(domain)

            # Forward to callback
            if on_page_callback:
                try:
                    await on_page_callback(agent_id, result)
                except Exception as exc:
                    logger.error("Callback error (agent %d): %s", agent_id, exc)

            pages_processed += 1

        # Update specialisation periodically
        if state.pages_crawled % 50 == 0:
            state.update_specialization()

        # Process incoming messages
        await self._process_messages(agent_id)

        return pages_processed

    # ---- Agent Communication ------------------------------------------------

    async def _agent_sync(self) -> None:
        """Periodic synchronisation between agents.

        Agents broadcast:
        1. Their top-K domains (by reward)
        2. New frontier entries from high-value domains
        3. Their emergent specialisation
        """
        for agent_id, state in enumerate(self._agent_states):
            # 1. Broadcast top domains
            top_domains = sorted(
                state.domain_rewards.items(),
                key=lambda kv: (
                    sum(kv[1][-20:]) / max(len(kv[1][-20:]), 1)
                ),
                reverse=True,
            )[:5]

            if top_domains:
                msg = AgentMessage(
                    sender_id=agent_id,
                    msg_type=MessageType.DOMAIN_DISCOVERY,
                    payload={
                        "domains": [
                            {
                                "domain": d,
                                "avg_reward": round(
                                    sum(r[-20:]) / max(len(r[-20:]), 1), 4
                                ),
                                "pages": len(r),
                            }
                            for d, r in top_domains
                        ],
                    },
                )
                await self._comm_bus.broadcast(msg)

            # 2. Broadcast specialisation
            if state.specialization:
                msg = AgentMessage(
                    sender_id=agent_id,
                    msg_type=MessageType.SPECIALIZATION,
                    payload={"specialization": state.specialization},
                )
                await self._comm_bus.broadcast(msg)

        logger.info(
            "Agent sync at step %d: %s",
            self._global_step,
            self._comm_bus.get_stats(),
        )

    async def _process_messages(self, agent_id: int) -> None:
        """Process pending messages for an agent."""
        messages = await self._comm_bus.drain(agent_id)
        state = self._agent_states[agent_id]
        pipeline = self._pipelines[agent_id]

        for msg in messages:
            if msg.msg_type == MessageType.DOMAIN_DISCOVERY:
                # Other agent shared top domains — add to our frontier
                # if we are in cooperative or mixed mode
                if self.config.collaboration_mode in ("cooperative", "mixed"):
                    domains = msg.payload.get("domains", [])
                    for d_info in domains:
                        domain = d_info["domain"]
                        # Only adopt if not claimed by someone else
                        claimant = self._claim_manager.get_claimant(domain)
                        if claimant is None or claimant == agent_id:
                            # Add a seed URL for this domain
                            seed = f"https://{domain}/"
                            pipeline.engine.add_seed_urls([seed])

            elif msg.msg_type == MessageType.FRONTIER_SHARE:
                # Another agent shared frontier entries
                urls = msg.payload.get("urls", [])
                for url_info in urls:
                    pipeline.engine.frontier.add_url(
                        url=url_info["url"],
                        domain=url_info["domain"],
                        q_value=url_info.get("q_value", 0.0),
                        depth=url_info.get("depth", 0),
                    )

            elif msg.msg_type == MessageType.SPECIALIZATION:
                # Track what other agents specialise in (for diversity)
                pass  # info available via get_agent_specializations()

    # ---- Domain Auctions ----------------------------------------------------

    async def run_domain_auction(self, domain: str) -> int:
        """Run a domain auction across all agents.

        Each agent bids its estimated Q-value for the domain.
        Returns the winning agent_id.
        """
        bids: Dict[int, float] = {}

        for i, state in enumerate(self._agent_states):
            # Bid is based on domain reward history
            rewards = state.domain_rewards.get(domain, [])
            if rewards:
                bid = sum(rewards[-20:]) / len(rewards[-20:])
            else:
                # No history — bid the diversity bonus (incentivise exploration)
                bid = self.config.diversity_bonus
            bids[i] = bid

        winner = self._claim_manager.auction(domain, bids)

        logger.info(
            "Domain auction for %s: winner=agent_%d, bids=%s",
            domain,
            winner,
            {k: round(v, 4) for k, v in bids.items()},
        )

        # Update winner's claimed domains
        self._agent_states[winner].claimed_domains.add(domain)

        # Notify all agents
        msg = AgentMessage(
            sender_id=winner,
            msg_type=MessageType.DOMAIN_DISCOVERY,
            payload={
                "auction_result": {
                    "domain": domain,
                    "winner": winner,
                    "bid": bids[winner],
                },
            },
        )
        await self._comm_bus.broadcast(msg, exclude_sender=False)

        return winner

    # ---- Queries ------------------------------------------------------------

    def get_agent_specializations(self) -> Dict[int, List[str]]:
        """Get what each agent focuses on (emergent specialisation).

        Returns a mapping of agent_id -> list of top domains by reward.
        """
        result: Dict[int, List[str]] = {}

        for state in self._agent_states:
            state.update_specialization()

            # Top 5 domains by average reward
            top = sorted(
                state.domain_rewards.items(),
                key=lambda kv: (
                    sum(kv[1][-50:]) / max(len(kv[1][-50:]), 1)
                ),
                reverse=True,
            )[:5]

            result[state.agent_id] = [d for d, _ in top]

        return result

    # ---- Statistics ---------------------------------------------------------

    def _collect_stats(self) -> Dict[str, Any]:
        """Collect comprehensive multi-agent statistics."""
        elapsed = time.time() - (self._start_time or time.time())

        # Per-agent stats
        agent_stats = [state.to_dict() for state in self._agent_states]

        # Domain coverage analysis
        all_domains: Set[str] = set()
        for visited in self._agent_visited.values():
            for url in visited:
                from urllib.parse import urlparse
                all_domains.add(urlparse(url).netloc)

        # Overlap analysis
        total_urls = sum(len(v) for v in self._agent_visited.values())
        unique_urls: Set[str] = set()
        for visited in self._agent_visited.values():
            unique_urls.update(visited)

        overlap_pct = 0.0
        if total_urls > 0:
            overlap_pct = round(
                1.0 - len(unique_urls) / max(total_urls, 1), 4
            )

        # Pipeline stats
        pipeline_stats = []
        for i, pipeline in enumerate(self._pipelines):
            pipeline_stats.append(pipeline.get_stats())

        return {
            "global_step": self._global_step,
            "elapsed_seconds": round(elapsed, 1),
            "total_pages": sum(s.pages_crawled for s in self._agent_states),
            "total_leads": sum(s.leads_found for s in self._agent_states),
            "total_reward": round(
                sum(s.reward_total for s in self._agent_states), 4
            ),
            "agents": agent_stats,
            "domain_coverage": {
                "total_domains": len(all_domains),
                "total_urls_crawled": total_urls,
                "unique_urls": len(unique_urls),
                "overlap_percentage": overlap_pct,
            },
            "claims": self._claim_manager.get_stats(),
            "reward_shaper": self._reward_shaper.get_stats(),
            "communication": self._comm_bus.get_stats(),
            "specializations": self.get_agent_specializations(),
            "pipelines": pipeline_stats,
        }

    def get_stats(self) -> Dict[str, Any]:
        """Public accessor for current statistics."""
        return self._collect_stats()


# ======================= Entry Point ========================================

async def run_multi_agent_crawl(
    seed_urls: List[str],
    config: Optional[MultiAgentConfig] = None,
    max_pages: Optional[int] = None,
    on_page_callback: Optional[Callable] = None,
) -> Dict[str, Any]:
    """Convenience entry point for multi-agent competitive crawling.

    Usage:
        import asyncio
        from crawler_multi_agent import run_multi_agent_crawl

        stats = asyncio.run(run_multi_agent_crawl(
            seed_urls=["https://example.com/companies"],
            config=MultiAgentConfig(n_agents=4, collaboration_mode="competitive"),
            max_pages=10_000,
        ))
    """
    orchestrator = MultiAgentOrchestrator(config)
    try:
        return await orchestrator.run(
            seed_urls=seed_urls,
            max_pages=max_pages,
            on_page_callback=on_page_callback,
        )
    finally:
        await orchestrator.shutdown()


# Allow running directly: python -m crawler_multi_agent
if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(
        description="Scrapus Module 1: Multi-Agent Competitive Crawler"
    )
    parser.add_argument(
        "--seeds",
        nargs="+",
        required=True,
        help="Seed URLs to start crawling from",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        default=10_000,
        help="Total pages across all agents",
    )
    parser.add_argument(
        "--n-agents",
        type=int,
        default=4,
        help="Number of crawler agents",
    )
    parser.add_argument(
        "--mode",
        choices=["competitive", "cooperative", "mixed"],
        default="competitive",
        help="Collaboration mode",
    )
    parser.add_argument(
        "--reward-sharing",
        type=float,
        default=0.0,
        help="Reward sharing coefficient (0=individual, 1=full sharing)",
    )
    parser.add_argument(
        "--diversity-bonus",
        type=float,
        default=0.1,
        help="Bonus for visiting unclaimed domains",
    )
    parser.add_argument(
        "--claim-radius",
        type=int,
        default=50,
        help="Pages per domain before releasing claim",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(name)s %(levelname)s: %(message)s",
    )

    config = MultiAgentConfig(
        n_agents=args.n_agents,
        collaboration_mode=args.mode,
        reward_sharing=args.reward_sharing,
        diversity_bonus=args.diversity_bonus,
        claim_radius=args.claim_radius,
    )

    stats = asyncio.run(
        run_multi_agent_crawl(
            seed_urls=args.seeds,
            config=config,
            max_pages=args.max_pages,
        )
    )

    print("\n=== Multi-Agent Crawl Statistics ===")
    print(json.dumps(stats, indent=2))
