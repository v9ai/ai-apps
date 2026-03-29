"""
Comprehensive benchmark harness for the RL-based focused web crawler.

Benchmarks every performance-critical component:
- Bloom filter (add/lookup throughput, false positive rate, memory)
- SumTree (add/update/sample throughput, distribution correctness)
- Replay buffer (add/sample/priority-update throughput, mmap flush latency)
- DQN inference (PyTorch vs ONNX vs CoreML, MPS vs CPU, latencies)
- DQN training (step latency, gradient computation, target update overhead)
- Embeddings (MLX vs SBERT, single/batch throughput, memory)
- URL frontier (add/batch-add/get_next throughput, concurrent access)
- URL canonicalisation (throughput)

All timings via time.perf_counter for sub-microsecond precision.

Target: Apple M1 16GB, zero cloud dependency.
"""

import argparse
import asyncio
import gc
import json
import logging
import os
import shutil
import statistics
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger("crawler_benchmarks")

# ---------------------------------------------------------------------------
# Import crawler modules (gated behind availability)
# ---------------------------------------------------------------------------

from crawler_engine import BloomFilter, CrawlerConfig, DomainScheduler, URLFrontier
from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig, SumTree
from crawler_dqn import (
    DQNConfig,
    DoubleDQNAgent,
    DQNNetwork,
    ONNXInferenceEngine,
    canonicalize_url,
    _HAS_TORCH,
    _HAS_ONNX,
    _HAS_COREML,
)
from crawler_embeddings import EmbeddingConfig, NomicEmbedder, _HAS_MLX, _HAS_SBERT


# ======================= Configuration ======================================

@dataclass
class BenchmarkConfig:
    """Tunables for the benchmark harness."""

    warmup_iterations: int = 10
    benchmark_iterations: int = 1_000
    state_dim: int = 784
    batch_size: int = 64
    report_format: str = "table"  # table | json | markdown


# ======================= Result =============================================

@dataclass
class BenchmarkResult:
    """A single benchmark measurement."""

    name: str
    metric: str  # e.g. "ops/sec", "ms/op", "MB"
    value: float
    p50: Optional[float] = None
    p95: Optional[float] = None
    p99: Optional[float] = None
    comparison: Optional[str] = None  # e.g. "3.2x vs baseline"


# ======================= Timing helpers =====================================

def _timed_loop(
    fn: Callable[[], Any],
    warmup: int,
    iterations: int,
) -> List[float]:
    """Run fn for warmup + iterations, return per-call durations (seconds)."""
    for _ in range(warmup):
        fn()

    durations: List[float] = []
    for _ in range(iterations):
        t0 = time.perf_counter()
        fn()
        durations.append(time.perf_counter() - t0)
    return durations


def _percentiles(durations: List[float]) -> Tuple[float, float, float]:
    """Return (p50, p95, p99) in milliseconds."""
    if not durations:
        return (0.0, 0.0, 0.0)
    s = sorted(durations)
    n = len(s)
    p50 = s[int(n * 0.50)] * 1000.0
    p95 = s[int(n * 0.95)] * 1000.0
    p99 = s[int(n * 0.99)] * 1000.0
    return (p50, p95, p99)


def _ops_per_sec(durations: List[float]) -> float:
    """Total operations / total time."""
    total = sum(durations)
    if total == 0:
        return float("inf")
    return len(durations) / total


def _memory_bytes(obj: Any) -> int:
    """Rough memory estimate via sys.getsizeof (shallow)."""
    return sys.getsizeof(obj)


# ======================= Individual Benchmarks ==============================

def bench_bloom_filter(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """Bloom filter: add throughput, lookup throughput, FP rate, memory."""
    results: List[BenchmarkResult] = []
    capacity = 100_000
    bf = BloomFilter(capacity=capacity, error_rate=0.001)

    # Pre-generate keys
    add_keys = [f"https://example.com/page/{i}" for i in range(config.benchmark_iterations)]
    lookup_keys = [f"https://example.com/page/{i}" for i in range(config.benchmark_iterations)]
    novel_keys = [f"https://novel-domain.com/page/{i}" for i in range(config.benchmark_iterations)]

    # --- Add throughput ---
    idx = [0]

    def _add():
        bf.add(add_keys[idx[0]])
        idx[0] += 1

    durations = _timed_loop(_add, 0, config.benchmark_iterations)
    results.append(BenchmarkResult(
        name="bloom_filter.add",
        metric="ops/sec",
        value=round(_ops_per_sec(durations), 0),
    ))

    # --- Lookup throughput (items that exist) ---
    idx[0] = 0

    def _lookup():
        _ = lookup_keys[idx[0]] in bf
        idx[0] += 1

    durations = _timed_loop(_lookup, config.warmup_iterations, config.benchmark_iterations)
    results.append(BenchmarkResult(
        name="bloom_filter.lookup",
        metric="ops/sec",
        value=round(_ops_per_sec(durations), 0),
    ))

    # --- False positive rate ---
    fp_count = 0
    test_count = config.benchmark_iterations
    for key in novel_keys:
        if key in bf:
            fp_count += 1
    fp_rate = fp_count / test_count if test_count > 0 else 0.0
    results.append(BenchmarkResult(
        name="bloom_filter.false_positive_rate",
        metric="ratio",
        value=round(fp_rate, 6),
        comparison=f"target <0.001, got {fp_rate:.6f}",
    ))

    # --- Memory ---
    mem_mb = (bf._bits.nbytes + sys.getsizeof(bf)) / (1024 * 1024)
    results.append(BenchmarkResult(
        name="bloom_filter.memory",
        metric="MB",
        value=round(mem_mb, 3),
    ))

    return results


def bench_sum_tree(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """SumTree: add, update, proportional sample throughput, distribution check."""
    results: List[BenchmarkResult] = []
    capacity = 100_000
    tree = SumTree(capacity)

    # --- Add throughput ---
    priorities = np.random.uniform(0.1, 10.0, config.benchmark_iterations).tolist()
    idx = [0]

    def _add():
        tree.add(priorities[idx[0]])
        idx[0] += 1

    durations = _timed_loop(_add, 0, config.benchmark_iterations)
    results.append(BenchmarkResult(
        name="sum_tree.add",
        metric="ops/sec",
        value=round(_ops_per_sec(durations), 0),
    ))

    # --- Update throughput ---
    update_indices = np.random.randint(0, min(tree.size, capacity), config.benchmark_iterations).tolist()
    update_prios = np.random.uniform(0.1, 10.0, config.benchmark_iterations).tolist()
    idx[0] = 0

    def _update():
        tree.update(update_indices[idx[0]], update_prios[idx[0]])
        idx[0] += 1

    durations = _timed_loop(_update, config.warmup_iterations, config.benchmark_iterations)
    results.append(BenchmarkResult(
        name="sum_tree.update",
        metric="ops/sec",
        value=round(_ops_per_sec(durations), 0),
    ))

    # --- Proportional sample throughput ---
    total = tree.total
    cumsums = np.random.uniform(0, total, config.benchmark_iterations).tolist()
    idx[0] = 0

    def _sample():
        tree.get(cumsums[idx[0]])
        idx[0] += 1

    durations = _timed_loop(_sample, config.warmup_iterations, config.benchmark_iterations)
    results.append(BenchmarkResult(
        name="sum_tree.sample",
        metric="ops/sec",
        value=round(_ops_per_sec(durations), 0),
    ))

    # --- Sampling distribution correctness ---
    # Set known priorities and verify sampling proportionality
    check_tree = SumTree(100)
    test_priorities = [1.0, 2.0, 3.0, 4.0]
    for p in test_priorities:
        check_tree.add(p)
    total_p = sum(test_priorities)
    counts = [0] * len(test_priorities)
    n_samples = 10_000
    for _ in range(n_samples):
        c = np.random.uniform(0, check_tree.total)
        leaf_idx, _ = check_tree.get(c)
        if leaf_idx < len(test_priorities):
            counts[leaf_idx] += 1
    expected_ratios = [p / total_p for p in test_priorities]
    actual_ratios = [c / n_samples for c in counts]
    max_deviation = max(abs(e - a) for e, a in zip(expected_ratios, actual_ratios))
    results.append(BenchmarkResult(
        name="sum_tree.distribution_correctness",
        metric="max_deviation",
        value=round(max_deviation, 4),
        comparison=f"expected <0.02, got {max_deviation:.4f}",
    ))

    return results


def bench_replay_buffer(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """Replay buffer: add, sample, priority update, memory, mmap flush."""
    results: List[BenchmarkResult] = []
    tmpdir = tempfile.mkdtemp(prefix="bench_replay_")
    try:
        buf_config = ReplayBufferConfig(
            capacity=10_000,
            state_dim=config.state_dim,
            data_dir=tmpdir,
            mmap_flush_interval=50,
            batch_commit_size=50,
        )
        buf = MmapReplayBuffer(buf_config)

        state = np.random.randn(config.state_dim).astype(np.float32)
        next_state = np.random.randn(config.state_dim).astype(np.float32)

        # --- Add transition throughput ---
        def _add():
            buf.add(state, 0, 0.5, next_state, False)

        durations = _timed_loop(_add, config.warmup_iterations, config.benchmark_iterations)
        results.append(BenchmarkResult(
            name="replay_buffer.add",
            metric="ops/sec",
            value=round(_ops_per_sec(durations), 0),
        ))

        # --- Sample batch throughput ---
        # Ensure buffer has enough entries
        while buf.size < config.batch_size + 10:
            buf.add(
                np.random.randn(config.state_dim).astype(np.float32),
                0, 0.5,
                np.random.randn(config.state_dim).astype(np.float32),
                False,
            )

        def _sample():
            buf.sample(config.batch_size)

        sample_iters = min(config.benchmark_iterations, 200)
        durations = _timed_loop(_sample, config.warmup_iterations, sample_iters)
        p50, p95, p99 = _percentiles(durations)
        results.append(BenchmarkResult(
            name="replay_buffer.sample_batch",
            metric="ops/sec",
            value=round(_ops_per_sec(durations), 0),
            p50=round(p50, 3),
            p95=round(p95, 3),
            p99=round(p99, 3),
        ))

        # --- Priority update throughput ---
        indices = np.arange(min(config.batch_size, buf.size), dtype=np.int64)
        td_errors = np.random.randn(len(indices)).astype(np.float32)

        def _update_prio():
            buf.update_priorities(indices, td_errors)

        durations = _timed_loop(_update_prio, config.warmup_iterations, min(config.benchmark_iterations, 200))
        results.append(BenchmarkResult(
            name="replay_buffer.priority_update",
            metric="ops/sec",
            value=round(_ops_per_sec(durations), 0),
        ))

        # --- Memory per transition ---
        disk_mb = buf._disk_usage_mb()
        mem_per_transition_kb = (disk_mb * 1024) / max(buf.size, 1)
        results.append(BenchmarkResult(
            name="replay_buffer.memory_per_transition",
            metric="KB",
            value=round(mem_per_transition_kb, 3),
        ))

        # --- mmap flush latency ---
        def _flush():
            buf._states_mmap.flush()
            buf._next_states_mmap.flush()

        durations = _timed_loop(_flush, 5, 50)
        p50, p95, p99 = _percentiles(durations)
        results.append(BenchmarkResult(
            name="replay_buffer.mmap_flush",
            metric="ms/op",
            value=round(p50, 3),
            p50=round(p50, 3),
            p95=round(p95, 3),
            p99=round(p99, 3),
        ))

        buf.close()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    return results


def bench_dqn_inference(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """DQN inference: single/batch latency, MPS vs CPU, ONNX vs PyTorch, CoreML."""
    results: List[BenchmarkResult] = []

    if not _HAS_TORCH:
        results.append(BenchmarkResult(
            name="dqn_inference",
            metric="skipped",
            value=0.0,
            comparison="PyTorch not installed",
        ))
        return results

    import torch

    dqn_config = DQNConfig(state_dim=config.state_dim, use_mps=False)
    agent = DoubleDQNAgent(dqn_config)

    single_state = np.random.randn(config.state_dim).astype(np.float32)
    batch_states = np.random.randn(config.batch_size, config.state_dim).astype(np.float32)

    # --- Single state inference (CPU) ---
    def _infer_single_cpu():
        s = torch.as_tensor(single_state, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            agent.q_network(s)

    durations = _timed_loop(_infer_single_cpu, config.warmup_iterations, config.benchmark_iterations)
    p50, p95, p99 = _percentiles(durations)
    results.append(BenchmarkResult(
        name="dqn_inference.single_cpu",
        metric="ms/op",
        value=round(p50, 4),
        p50=round(p50, 4),
        p95=round(p95, 4),
        p99=round(p99, 4),
    ))

    # --- Batch inference throughput (CPU) ---
    def _infer_batch_cpu():
        s = torch.as_tensor(batch_states, dtype=torch.float32)
        with torch.no_grad():
            agent.q_network(s)

    durations = _timed_loop(_infer_batch_cpu, config.warmup_iterations, config.benchmark_iterations)
    cpu_batch_ops = _ops_per_sec(durations)
    results.append(BenchmarkResult(
        name="dqn_inference.batch_cpu",
        metric="batches/sec",
        value=round(cpu_batch_ops, 0),
    ))

    # --- MPS comparison ---
    mps_batch_ops = 0.0
    if torch.backends.mps.is_available():
        mps_config = DQNConfig(state_dim=config.state_dim, use_mps=True)
        mps_agent = DoubleDQNAgent(mps_config)

        def _infer_single_mps():
            s = torch.as_tensor(
                single_state, dtype=torch.float32, device=mps_agent.device
            ).unsqueeze(0)
            with torch.no_grad():
                mps_agent.q_network(s)
            if mps_agent.device.type == "mps":
                torch.mps.synchronize()

        durations = _timed_loop(_infer_single_mps, config.warmup_iterations, config.benchmark_iterations)
        p50_mps, p95_mps, p99_mps = _percentiles(durations)
        results.append(BenchmarkResult(
            name="dqn_inference.single_mps",
            metric="ms/op",
            value=round(p50_mps, 4),
            p50=round(p50_mps, 4),
            p95=round(p95_mps, 4),
            p99=round(p99_mps, 4),
            comparison=f"{p50 / p50_mps:.1f}x vs CPU" if p50_mps > 0 else "N/A",
        ))

        def _infer_batch_mps():
            s = torch.as_tensor(
                batch_states, dtype=torch.float32, device=mps_agent.device
            )
            with torch.no_grad():
                mps_agent.q_network(s)
            if mps_agent.device.type == "mps":
                torch.mps.synchronize()

        durations = _timed_loop(_infer_batch_mps, config.warmup_iterations, config.benchmark_iterations)
        mps_batch_ops = _ops_per_sec(durations)
        results.append(BenchmarkResult(
            name="dqn_inference.batch_mps",
            metric="batches/sec",
            value=round(mps_batch_ops, 0),
            comparison=f"{mps_batch_ops / cpu_batch_ops:.1f}x vs CPU" if cpu_batch_ops > 0 else "N/A",
        ))

        mps_agent.release()
    else:
        results.append(BenchmarkResult(
            name="dqn_inference.mps",
            metric="skipped",
            value=0.0,
            comparison="MPS not available",
        ))

    # --- ONNX comparison ---
    if _HAS_ONNX:
        tmpdir = tempfile.mkdtemp(prefix="bench_onnx_")
        try:
            onnx_path = os.path.join(tmpdir, "policy.onnx")
            agent.export_onnx(onnx_path=onnx_path, quantize_int8=False)
            onnx_engine = ONNXInferenceEngine(onnx_path)

            def _infer_onnx_single():
                onnx_engine.predict_q_values(single_state)

            durations = _timed_loop(_infer_onnx_single, config.warmup_iterations, config.benchmark_iterations)
            p50_onnx, p95_onnx, p99_onnx = _percentiles(durations)
            results.append(BenchmarkResult(
                name="dqn_inference.single_onnx",
                metric="ms/op",
                value=round(p50_onnx, 4),
                p50=round(p50_onnx, 4),
                p95=round(p95_onnx, 4),
                p99=round(p99_onnx, 4),
                comparison=f"{p50 / p50_onnx:.1f}x vs PyTorch CPU" if p50_onnx > 0 else "N/A",
            ))

            def _infer_onnx_batch():
                onnx_engine.predict_q_values(batch_states)

            durations = _timed_loop(_infer_onnx_batch, config.warmup_iterations, config.benchmark_iterations)
            onnx_batch_ops = _ops_per_sec(durations)
            results.append(BenchmarkResult(
                name="dqn_inference.batch_onnx",
                metric="batches/sec",
                value=round(onnx_batch_ops, 0),
                comparison=f"{onnx_batch_ops / cpu_batch_ops:.1f}x vs PyTorch CPU" if cpu_batch_ops > 0 else "N/A",
            ))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)
    else:
        results.append(BenchmarkResult(
            name="dqn_inference.onnx",
            metric="skipped",
            value=0.0,
            comparison="ONNX Runtime not installed",
        ))

    # --- CoreML comparison ---
    if _HAS_COREML:
        tmpdir = tempfile.mkdtemp(prefix="bench_coreml_")
        try:
            onnx_path = os.path.join(tmpdir, "policy.onnx")
            coreml_path = os.path.join(tmpdir, "policy.mlpackage")
            agent.config.onnx_path = onnx_path
            agent.export_onnx(onnx_path=onnx_path, quantize_int8=False)
            coreml_result = agent.export_coreml(coreml_path=coreml_path)
            if coreml_result:
                results.append(BenchmarkResult(
                    name="dqn_inference.coreml",
                    metric="available",
                    value=1.0,
                    comparison="CoreML model exported; manual benchmark recommended",
                ))
            else:
                results.append(BenchmarkResult(
                    name="dqn_inference.coreml",
                    metric="skipped",
                    value=0.0,
                    comparison="CoreML export failed",
                ))
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)
    else:
        results.append(BenchmarkResult(
            name="dqn_inference.coreml",
            metric="skipped",
            value=0.0,
            comparison="coremltools not installed",
        ))

    agent.release()
    return results


def bench_dqn_training(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """DQN training: step latency, throughput, gradient time, target update."""
    results: List[BenchmarkResult] = []

    if not _HAS_TORCH:
        results.append(BenchmarkResult(
            name="dqn_training",
            metric="skipped",
            value=0.0,
            comparison="PyTorch not installed",
        ))
        return results

    import torch

    dqn_config = DQNConfig(
        state_dim=config.state_dim,
        batch_size=config.batch_size,
        use_mps=False,
        target_update_freq=10_000,  # avoid target updates during benchmark
    )
    agent = DoubleDQNAgent(dqn_config)

    # Pre-generate batch data
    states = np.random.randn(config.batch_size, config.state_dim).astype(np.float32)
    actions = np.random.randint(0, dqn_config.action_dim, config.batch_size).astype(np.int64)
    rewards = np.random.randn(config.batch_size).astype(np.float32)
    next_states = np.random.randn(config.batch_size, config.state_dim).astype(np.float32)
    dones = np.zeros(config.batch_size, dtype=np.float32)

    # --- Single training step latency ---
    train_iters = min(config.benchmark_iterations, 500)

    def _train_step():
        agent.train_step_on_batch(states, actions, rewards, next_states, dones)

    durations = _timed_loop(_train_step, config.warmup_iterations, train_iters)
    p50, p95, p99 = _percentiles(durations)
    results.append(BenchmarkResult(
        name="dqn_training.step_latency",
        metric="ms/step",
        value=round(p50, 3),
        p50=round(p50, 3),
        p95=round(p95, 3),
        p99=round(p99, 3),
    ))

    # --- Throughput ---
    steps_per_sec = _ops_per_sec(durations)
    results.append(BenchmarkResult(
        name="dqn_training.throughput",
        metric="steps/sec",
        value=round(steps_per_sec, 1),
    ))

    # --- Gradient computation time (forward + backward, no optimiser step) ---
    dev = agent.device

    def _grad_only():
        states_t = torch.as_tensor(states, dtype=torch.float32, device=dev)
        actions_t = torch.as_tensor(actions, dtype=torch.long, device=dev)
        rewards_t = torch.as_tensor(rewards, dtype=torch.float32, device=dev)
        next_t = torch.as_tensor(next_states, dtype=torch.float32, device=dev)
        dones_t = torch.as_tensor(dones, dtype=torch.float32, device=dev)
        loss, _ = agent.compute_td_loss(states_t, actions_t, rewards_t, next_t, dones_t)
        agent.optimizer.zero_grad()
        loss.backward()

    durations = _timed_loop(_grad_only, config.warmup_iterations, train_iters)
    p50_grad, _, _ = _percentiles(durations)
    results.append(BenchmarkResult(
        name="dqn_training.gradient_time",
        metric="ms/op",
        value=round(p50_grad, 3),
        comparison=f"{p50_grad / p50 * 100:.0f}% of full step" if p50 > 0 else "N/A",
    ))

    # --- Target update overhead ---
    def _target_update():
        agent.target_network.load_state_dict(agent.q_network.state_dict())

    durations = _timed_loop(_target_update, config.warmup_iterations, min(config.benchmark_iterations, 200))
    p50_tu, _, _ = _percentiles(durations)
    results.append(BenchmarkResult(
        name="dqn_training.target_update",
        metric="ms/op",
        value=round(p50_tu, 4),
    ))

    agent.release()
    return results


def bench_embedding(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """Embedding: single/batch latency, MLX vs SBERT, memory."""
    results: List[BenchmarkResult] = []

    sample_text = (
        "We are looking for a Senior Machine Learning Engineer to join our "
        "remote-first team building next-generation NLP pipelines for lead "
        "generation and entity resolution across global markets."
    )
    batch_texts = [sample_text] * config.batch_size

    embedder = NomicEmbedder()
    try:
        embedder.load()
    except RuntimeError as exc:
        results.append(BenchmarkResult(
            name="embedding",
            metric="skipped",
            value=0.0,
            comparison=str(exc),
        ))
        return results

    backend = embedder._backend

    # --- Single text embedding latency ---
    def _embed_single():
        embedder.embed_text(sample_text)

    embed_iters = min(config.benchmark_iterations, 200)
    durations = _timed_loop(_embed_single, config.warmup_iterations, embed_iters)
    p50, p95, p99 = _percentiles(durations)
    results.append(BenchmarkResult(
        name=f"embedding.single_{backend}",
        metric="ms/op",
        value=round(p50, 3),
        p50=round(p50, 3),
        p95=round(p95, 3),
        p99=round(p99, 3),
    ))

    # --- Batch embedding throughput ---
    def _embed_batch():
        embedder.embed_texts(batch_texts)

    batch_iters = min(config.benchmark_iterations, 50)
    durations = _timed_loop(_embed_batch, 3, batch_iters)
    p50_batch, p95_batch, p99_batch = _percentiles(durations)
    total_time = sum(durations)
    total_texts = batch_iters * config.batch_size
    throughput = total_texts / total_time if total_time > 0 else 0.0
    results.append(BenchmarkResult(
        name=f"embedding.batch_{backend}",
        metric="texts/sec",
        value=round(throughput, 0),
        p50=round(p50_batch, 3),
        p95=round(p95_batch, 3),
        p99=round(p99_batch, 3),
    ))

    # --- MLX vs SBERT comparison (if both available) ---
    if _HAS_MLX and _HAS_SBERT and backend == "mlx":
        mlx_throughput = throughput
        # Load SBERT fallback
        sbert_embedder = NomicEmbedder(EmbeddingConfig(
            model_name="sentence-transformers/all-MiniLM-L6-v2",
        ))
        sbert_embedder._load_sbert_fallback()

        def _embed_sbert_batch():
            sbert_embedder.embed_texts(batch_texts)

        durations = _timed_loop(_embed_sbert_batch, 3, batch_iters)
        sbert_total = sum(durations)
        sbert_throughput = (batch_iters * config.batch_size) / sbert_total if sbert_total > 0 else 0.0
        results.append(BenchmarkResult(
            name="embedding.batch_sbert",
            metric="texts/sec",
            value=round(sbert_throughput, 0),
            comparison=f"MLX {mlx_throughput / sbert_throughput:.1f}x faster" if sbert_throughput > 0 else "N/A",
        ))
        sbert_embedder.unload()
    elif _HAS_SBERT and backend == "sbert":
        results.append(BenchmarkResult(
            name="embedding.mlx_comparison",
            metric="skipped",
            value=0.0,
            comparison="MLX not available; running SBERT only",
        ))

    # --- Memory per batch ---
    batch_result = embedder.embed_texts(batch_texts)
    mem_per_batch_kb = batch_result.nbytes / 1024
    results.append(BenchmarkResult(
        name=f"embedding.memory_per_batch_{backend}",
        metric="KB",
        value=round(mem_per_batch_kb, 2),
    ))

    embedder.unload()
    return results


def bench_frontier(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """URL frontier: add, batch-add, get_next_urls, concurrent access."""
    results: List[BenchmarkResult] = []
    tmpdir = tempfile.mkdtemp(prefix="bench_frontier_")
    try:
        crawler_config = CrawlerConfig(
            frontier_db=os.path.join(tmpdir, "frontier.db"),
            domain_stats_db=os.path.join(tmpdir, "domain_stats.db"),
            bloom_capacity=200_000,
        )
        frontier = URLFrontier(crawler_config)
        scheduler = DomainScheduler(crawler_config)

        # Register test domains
        domains = [f"example{i}.com" for i in range(10)]
        for d in domains:
            scheduler.register_domain(d)

        # --- Single URL add throughput ---
        urls_single = [
            (f"https://example{i % 10}.com/page/{i}", domains[i % 10], float(i % 100) / 100, i % 5)
            for i in range(config.benchmark_iterations)
        ]
        idx = [0]

        def _add_url():
            url, domain, qv, depth = urls_single[idx[0]]
            frontier.add_url(url, domain, qv, depth)
            idx[0] += 1

        durations = _timed_loop(_add_url, 0, config.benchmark_iterations)
        results.append(BenchmarkResult(
            name="frontier.add_url",
            metric="ops/sec",
            value=round(_ops_per_sec(durations), 0),
        ))

        # --- Batch add throughput ---
        # Create a fresh frontier for batch test
        frontier2_db = os.path.join(tmpdir, "frontier2.db")
        crawler_config2 = CrawlerConfig(
            frontier_db=frontier2_db,
            domain_stats_db=os.path.join(tmpdir, "domain_stats2.db"),
            bloom_capacity=200_000,
        )
        frontier2 = URLFrontier(crawler_config2)
        batch_iters = min(config.benchmark_iterations, 100)
        batch_size = 50

        def _add_batch():
            batch = [
                (
                    f"https://batch{np.random.randint(0, 10)}.com/{np.random.randint(0, 1_000_000)}",
                    domains[np.random.randint(0, 10)],
                    np.random.random(),
                    np.random.randint(0, 5),
                )
                for _ in range(batch_size)
            ]
            frontier2.add_urls_batch(batch)

        durations = _timed_loop(_add_batch, 3, batch_iters)
        urls_per_sec = (batch_iters * batch_size) / sum(durations) if sum(durations) > 0 else 0.0
        results.append(BenchmarkResult(
            name="frontier.batch_add",
            metric="urls/sec",
            value=round(urls_per_sec, 0),
        ))

        # --- get_next_urls latency ---
        def _get_next():
            frontier.get_next_urls(scheduler, batch_size=5)

        get_iters = min(config.benchmark_iterations, 200)
        durations = _timed_loop(_get_next, config.warmup_iterations, get_iters)
        p50, p95, p99 = _percentiles(durations)
        results.append(BenchmarkResult(
            name="frontier.get_next_urls",
            metric="ms/op",
            value=round(p50, 3),
            p50=round(p50, 3),
            p95=round(p95, 3),
            p99=round(p99, 3),
        ))

        # --- Concurrent access throughput (async simulation) ---
        async def _concurrent_bench():
            sem = asyncio.Semaphore(8)
            counter = [0]

            async def _worker():
                async with sem:
                    url = f"https://concurrent.com/{counter[0]}"
                    counter[0] += 1
                    frontier.add_url(url, "concurrent.com", 0.5, 0)

            t0 = time.perf_counter()
            n_tasks = min(config.benchmark_iterations, 500)
            await asyncio.gather(*[_worker() for _ in range(n_tasks)])
            elapsed = time.perf_counter() - t0
            return n_tasks / elapsed if elapsed > 0 else 0.0

        concurrent_ops = asyncio.run(_concurrent_bench())
        results.append(BenchmarkResult(
            name="frontier.concurrent_access",
            metric="ops/sec",
            value=round(concurrent_ops, 0),
            comparison="8 concurrent workers",
        ))

        scheduler.close()
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    return results


def bench_url_canonicalize(config: BenchmarkConfig) -> List[BenchmarkResult]:
    """URL canonicalisation throughput."""
    results: List[BenchmarkResult] = []

    test_urls = [
        f"HTTPS://Example{i % 10}.COM/Path/{i}?b={i}&a={i}#fragment"
        for i in range(config.benchmark_iterations)
    ]
    idx = [0]

    def _canonicalize():
        canonicalize_url(test_urls[idx[0]])
        idx[0] += 1

    durations = _timed_loop(_canonicalize, config.warmup_iterations, config.benchmark_iterations)
    results.append(BenchmarkResult(
        name="url_canonicalize",
        metric="ops/sec",
        value=round(_ops_per_sec(durations), 0),
    ))

    return results


# ======================= Benchmark Runner ===================================

# Mapping from category name to benchmark function
_CATEGORY_MAP: Dict[str, Callable[[BenchmarkConfig], List[BenchmarkResult]]] = {
    "bloom": bench_bloom_filter,
    "sumtree": bench_sum_tree,
    "replay": bench_replay_buffer,
    "dqn_inference": bench_dqn_inference,
    "dqn_training": bench_dqn_training,
    "embedding": bench_embedding,
    "frontier": bench_frontier,
    "url_canonicalize": bench_url_canonicalize,
}


class BenchmarkRunner:
    """Orchestrates benchmark execution and reporting."""

    def __init__(self, config: Optional[BenchmarkConfig] = None) -> None:
        self.config = config or BenchmarkConfig()

    def run_all(self) -> List[BenchmarkResult]:
        """Run every benchmark category and return combined results."""
        all_results: List[BenchmarkResult] = []
        for name, fn in _CATEGORY_MAP.items():
            logger.info("Running benchmark category: %s", name)
            try:
                category_results = fn(self.config)
                all_results.extend(category_results)
            except Exception as exc:
                logger.error("Benchmark %s failed: %s", name, exc)
                all_results.append(BenchmarkResult(
                    name=name,
                    metric="error",
                    value=0.0,
                    comparison=str(exc),
                ))
            gc.collect()
        return all_results

    def run_category(self, category: str) -> List[BenchmarkResult]:
        """Run a single benchmark category.

        Args:
            category: one of bloom, sumtree, replay, dqn_inference,
                      dqn_training, embedding, frontier, url_canonicalize.

        Returns:
            List of BenchmarkResult for that category.

        Raises:
            ValueError: if category is not recognised.
        """
        fn = _CATEGORY_MAP.get(category)
        if fn is None:
            valid = ", ".join(sorted(_CATEGORY_MAP.keys()))
            raise ValueError(
                f"Unknown category '{category}'. Valid: {valid}"
            )
        logger.info("Running benchmark category: %s", category)
        return fn(self.config)

    # ---- Reporting ----------------------------------------------------------

    def print_report(self, results: List[BenchmarkResult]) -> None:
        """Pretty-print results as a table to stdout."""
        if self.config.report_format == "json":
            print(json.dumps(self._results_to_dicts(results), indent=2))
            return
        if self.config.report_format == "markdown":
            self._print_markdown(results)
            return
        self._print_table(results)

    def save_report(self, results: List[BenchmarkResult], path: str) -> None:
        """Persist results to disk as JSON or markdown.

        File format is inferred from report_format config or path extension.
        """
        os.makedirs(os.path.dirname(path) or ".", exist_ok=True)

        if path.endswith(".json") or self.config.report_format == "json":
            with open(path, "w") as f:
                json.dump(self._results_to_dicts(results), f, indent=2)
        elif path.endswith(".md") or self.config.report_format == "markdown":
            with open(path, "w") as f:
                f.write(self._format_markdown(results))
        else:
            # Default to JSON
            with open(path, "w") as f:
                json.dump(self._results_to_dicts(results), f, indent=2)

        logger.info("Saved benchmark report to %s", path)

    # ---- Internal formatting ------------------------------------------------

    @staticmethod
    def _results_to_dicts(results: List[BenchmarkResult]) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for r in results:
            d: Dict[str, Any] = {
                "name": r.name,
                "metric": r.metric,
                "value": r.value,
            }
            if r.p50 is not None:
                d["p50"] = r.p50
            if r.p95 is not None:
                d["p95"] = r.p95
            if r.p99 is not None:
                d["p99"] = r.p99
            if r.comparison is not None:
                d["comparison"] = r.comparison
            out.append(d)
        return out

    @staticmethod
    def _print_table(results: List[BenchmarkResult]) -> None:
        """Fixed-width columnar output."""
        header = f"{'Benchmark':<42} {'Metric':<14} {'Value':>12} {'p50':>10} {'p95':>10} {'p99':>10}  {'Comparison'}"
        sep = "-" * len(header)
        print()
        print(sep)
        print(header)
        print(sep)
        for r in results:
            p50_s = f"{r.p50:.3f}" if r.p50 is not None else ""
            p95_s = f"{r.p95:.3f}" if r.p95 is not None else ""
            p99_s = f"{r.p99:.3f}" if r.p99 is not None else ""
            cmp_s = r.comparison or ""
            val_s = f"{r.value:,.2f}" if isinstance(r.value, float) else str(r.value)
            print(f"{r.name:<42} {r.metric:<14} {val_s:>12} {p50_s:>10} {p95_s:>10} {p99_s:>10}  {cmp_s}")
        print(sep)
        print()

    @staticmethod
    def _format_markdown(results: List[BenchmarkResult]) -> str:
        lines = [
            "# Crawler Benchmark Results\n",
            "| Benchmark | Metric | Value | p50 | p95 | p99 | Comparison |",
            "|-----------|--------|------:|----:|----:|----:|------------|",
        ]
        for r in results:
            p50_s = f"{r.p50:.3f}" if r.p50 is not None else "-"
            p95_s = f"{r.p95:.3f}" if r.p95 is not None else "-"
            p99_s = f"{r.p99:.3f}" if r.p99 is not None else "-"
            cmp_s = r.comparison or "-"
            val_s = f"{r.value:,.2f}"
            lines.append(f"| {r.name} | {r.metric} | {val_s} | {p50_s} | {p95_s} | {p99_s} | {cmp_s} |")
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _print_markdown(results: List[BenchmarkResult]) -> None:
        print(BenchmarkRunner._format_markdown(results))


# ======================= CLI ================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Benchmark harness for the RL-based focused web crawler.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Categories:\n"
            "  bloom            Bloom filter ops\n"
            "  sumtree          SumTree priority sampling\n"
            "  replay           Mmap replay buffer\n"
            "  dqn_inference    DQN inference (PyTorch/ONNX/CoreML/MPS)\n"
            "  dqn_training     DQN training step\n"
            "  embedding        Text embeddings (MLX/SBERT)\n"
            "  frontier         URL frontier\n"
            "  url_canonicalize URL canonicalisation\n"
            "\n"
            "Examples:\n"
            "  python crawler_benchmarks.py                    # run all\n"
            "  python crawler_benchmarks.py -c bloom sumtree   # specific categories\n"
            "  python crawler_benchmarks.py -f markdown -o report.md\n"
        ),
    )
    parser.add_argument(
        "-c", "--categories",
        nargs="*",
        default=None,
        help="Benchmark categories to run (default: all)",
    )
    parser.add_argument(
        "-n", "--iterations",
        type=int,
        default=1_000,
        help="Number of benchmark iterations (default: 1000)",
    )
    parser.add_argument(
        "-w", "--warmup",
        type=int,
        default=10,
        help="Number of warmup iterations (default: 10)",
    )
    parser.add_argument(
        "-b", "--batch-size",
        type=int,
        default=64,
        help="Batch size for batched benchmarks (default: 64)",
    )
    parser.add_argument(
        "-d", "--state-dim",
        type=int,
        default=784,
        help="State vector dimension (default: 784)",
    )
    parser.add_argument(
        "-f", "--format",
        choices=["table", "json", "markdown"],
        default="table",
        help="Output format (default: table)",
    )
    parser.add_argument(
        "-o", "--output",
        type=str,
        default=None,
        help="Save report to file (format inferred from extension or --format)",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable debug logging",
    )

    args = parser.parse_args()

    # Configure logging
    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
        datefmt="%H:%M:%S",
    )

    config = BenchmarkConfig(
        warmup_iterations=args.warmup,
        benchmark_iterations=args.iterations,
        state_dim=args.state_dim,
        batch_size=args.batch_size,
        report_format=args.format,
    )
    runner = BenchmarkRunner(config)

    # Run benchmarks
    if args.categories:
        results: List[BenchmarkResult] = []
        for cat in args.categories:
            try:
                results.extend(runner.run_category(cat))
            except ValueError as exc:
                logger.error(str(exc))
                sys.exit(1)
    else:
        results = runner.run_all()

    # Output
    runner.print_report(results)

    if args.output:
        runner.save_report(results, args.output)


if __name__ == "__main__":
    main()
