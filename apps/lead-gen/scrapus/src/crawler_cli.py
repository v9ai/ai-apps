#!/usr/bin/env python3
"""
scrapus/src/crawler_cli.py
Comprehensive CLI for Module 1: RL-based focused web crawler.

No external CLI dependencies -- uses only ``argparse`` from the stdlib.

Usage:
    scrapus-crawler crawl --seeds URL1 URL2 --max-pages 1000 --concurrency 8
    scrapus-crawler train --replay-dir scrapus_data/replay_buffer --epochs 10
    scrapus-crawler export --format onnx --quantize int8
    scrapus-crawler status
    scrapus-crawler benchmark [embedding|dqn|replay|bloom|all]
    scrapus-crawler frontier [stats|prune|add-seeds]
    scrapus-crawler domains [list|top|health|classify]
    scrapus-crawler config [show|validate|diff]
    scrapus-crawler replay [stats|prune|export]
"""

from __future__ import annotations

import argparse
import asyncio
import gc
import json
import logging
import os
import sqlite3
import sys
import time
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

# Resolve the package root so sibling imports work when run as ``python -m crawler_cli``.
_SRC_DIR = Path(__file__).resolve().parent
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

logger = logging.getLogger("crawler_cli")

# Version -- bump on release.
__version__ = "0.1.0"

# Default data directory for the crawler pipeline.
DEFAULT_DATA_DIR = "scrapus_data"


# ============================================================================
# ANSI colour helpers (graceful degradation if not a TTY)
# ============================================================================

_COLOURS_ENABLED: Optional[bool] = None


def _colours_enabled() -> bool:
    global _COLOURS_ENABLED
    if _COLOURS_ENABLED is None:
        _COLOURS_ENABLED = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
    return _COLOURS_ENABLED


def _green(text: str) -> str:
    return f"\033[32m{text}\033[0m" if _colours_enabled() else text


def _yellow(text: str) -> str:
    return f"\033[33m{text}\033[0m" if _colours_enabled() else text


def _red(text: str) -> str:
    return f"\033[31m{text}\033[0m" if _colours_enabled() else text


def _bold(text: str) -> str:
    return f"\033[1m{text}\033[0m" if _colours_enabled() else text


def _dim(text: str) -> str:
    return f"\033[2m{text}\033[0m" if _colours_enabled() else text


def _status_colour(status: str) -> str:
    """Colour-code a status string: green=healthy, yellow=warning, red=error."""
    lower = status.lower()
    if lower in ("healthy", "ok", "completed", "active", "good"):
        return _green(status)
    if lower in ("warning", "degraded", "partial", "stale"):
        return _yellow(status)
    if lower in ("error", "failed", "critical", "missing"):
        return _red(status)
    return status


# ============================================================================
# Shared helpers
# ============================================================================

def _die(message: str, code: int = 1) -> None:
    """Print an error message to stderr and exit."""
    print(f"error: {message}", file=sys.stderr)
    sys.exit(code)


def _elapsed(start: float) -> str:
    """Human-readable elapsed time."""
    delta = time.monotonic() - start
    if delta < 60:
        return f"{delta:.1f}s"
    minutes = int(delta // 60)
    seconds = delta % 60
    return f"{minutes}m {seconds:.1f}s"


def _human_bytes(n: int) -> str:
    """Human-readable byte size."""
    for unit in ("B", "KB", "MB", "GB"):
        if abs(n) < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024  # type: ignore[assignment]
    return f"{n:.1f} TB"


def _load_seeds_from_file(path: str) -> List[str]:
    """Read seed URLs from a file (one per line, comments with #)."""
    seeds: List[str] = []
    filepath = Path(path)
    if not filepath.exists():
        _die(f"Seeds file not found: {path}")
    for line in filepath.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            seeds.append(line)
    if not seeds:
        _die(f"No valid URLs found in seeds file: {path}")
    return seeds


def _resolve_data_dir(args: argparse.Namespace) -> Path:
    """Resolve the data directory from CLI args."""
    return Path(getattr(args, "data_dir", None) or DEFAULT_DATA_DIR)


def _setup_logging(verbose: bool = False) -> None:
    """Configure logging for the crawler CLI."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="[%(asctime)s] %(name)s %(levelname)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )


def _load_pipeline_config(
    args: argparse.Namespace,
) -> "CrawlerPipelineConfig":
    """Build a CrawlerPipelineConfig from CLI args + optional TOML file."""
    from crawler_pipeline import CrawlerPipelineConfig

    config_path = getattr(args, "config", None)

    if config_path:
        try:
            from crawler_config_validator import ConfigLoader
            config = ConfigLoader.load_config(toml_path=config_path, cli_args=args)
            return config
        except ImportError:
            logger.warning(
                "Config validator not available; falling back to defaults with CLI overrides"
            )

    # Build from defaults + CLI overrides.
    config = CrawlerPipelineConfig()

    concurrency = getattr(args, "concurrency", None)
    if concurrency is not None:
        config.crawler.max_concurrent = concurrency

    use_onnx = getattr(args, "use_onnx", False)
    if use_onnx:
        config.use_onnx_inference = True

    data_dir = getattr(args, "data_dir", None)
    if data_dir:
        config.data_dir = data_dir

    max_pages = getattr(args, "max_pages", None)
    if max_pages is not None:
        config.max_pages = max_pages

    return config


# ============================================================================
# Progress bar (optional tqdm integration)
# ============================================================================

try:
    from tqdm import tqdm as _tqdm

    _HAS_TQDM = True
except ImportError:
    _HAS_TQDM = False


class _ProgressTracker:
    """Simple progress tracker with optional tqdm bar."""

    def __init__(self, total: int, desc: str = "Crawling") -> None:
        self.total = total
        self.count = 0
        self._bar = None
        if _HAS_TQDM:
            self._bar = _tqdm(total=total, desc=desc, unit="pages")

    def update(self, n: int = 1) -> None:
        self.count += n
        if self._bar:
            self._bar.update(n)
        elif self.count % 100 == 0 or self.count == self.total:
            pct = self.count / max(self.total, 1) * 100
            print(f"\r  {self.count}/{self.total} ({pct:.1f}%)", end="", flush=True)

    def close(self) -> None:
        if self._bar:
            self._bar.close()
        elif self.count > 0:
            print()  # newline after inline progress


# ============================================================================
# Subcommand: crawl
# ============================================================================

def cmd_crawl(args: argparse.Namespace) -> None:
    """Run the RL-based web crawler."""
    _setup_logging(getattr(args, "verbose", False))

    # Resolve seeds.
    seeds: List[str] = []
    if getattr(args, "seeds", None):
        seeds.extend(args.seeds)
    if getattr(args, "seeds_file", None):
        seeds.extend(_load_seeds_from_file(args.seeds_file))
    if not seeds:
        _die("No seed URLs provided. Use --seeds or --seeds-file.")

    max_pages = getattr(args, "max_pages", 1000)
    dry_run = getattr(args, "dry_run", False)

    logger.info(
        "Crawler CLI: seeds=%d, max_pages=%d, concurrency=%s, onnx=%s",
        len(seeds),
        max_pages,
        getattr(args, "concurrency", 8),
        getattr(args, "use_onnx", False),
    )

    # Dry-run: validate config and seeds, then exit.
    if dry_run:
        print(_bold("Dry-run mode: validating configuration..."))
        print()

        config = _load_pipeline_config(args)
        print(f"  Seeds:       {len(seeds)} URLs")
        for i, url in enumerate(seeds[:10]):
            print(f"    {i + 1}. {url}")
        if len(seeds) > 10:
            print(f"    ... and {len(seeds) - 10} more")
        print(f"  Max pages:   {max_pages}")
        print(f"  Concurrency: {config.crawler.max_concurrent}")
        print(f"  Data dir:    {config.data_dir}")
        print(f"  ONNX:        {config.use_onnx_inference}")
        print(f"  Memory:      {config.memory_budget_mb} MB budget")

        # Validate config.
        try:
            from crawler_config_validator import ConfigValidator
            errors = ConfigValidator.validate_pipeline_config(config)
            if errors:
                print()
                print(_red("Configuration errors:"))
                for err in errors:
                    print(f"  - {err}")
                sys.exit(1)
            else:
                print()
                print(_green("Configuration is valid."))
        except ImportError:
            print()
            print(_yellow("Config validator not available; skipping deep validation."))

        return

    # Resume from checkpoint.
    resume = getattr(args, "resume", False)
    if resume:
        logger.info("Resuming from last checkpoint")

    config = _load_pipeline_config(args)

    # Build progress callback.
    progress = _ProgressTracker(total=max_pages, desc="Crawling")

    async def _on_page(result: Any) -> None:
        progress.update()

    start = time.monotonic()
    try:
        from crawler_pipeline import run_crawler_pipeline

        stats = asyncio.run(
            run_crawler_pipeline(
                seed_urls=seeds,
                config=config,
                max_pages=max_pages,
                on_page_callback=_on_page,
            )
        )
    except ImportError as exc:
        _die(f"Crawler pipeline not available: {exc}")
    except KeyboardInterrupt:
        print()
        logger.info("Crawl interrupted by user")
        stats = {"status": "interrupted"}
    finally:
        progress.close()

    elapsed = _elapsed(start)
    print()
    print(_bold("=== Crawl Results ==="))
    print(f"  Elapsed: {elapsed}")
    print(json.dumps(stats, indent=2))


# ============================================================================
# Subcommand: train
# ============================================================================

def cmd_train(args: argparse.Namespace) -> None:
    """Train or continue training the DQN agent from the replay buffer."""
    _setup_logging(getattr(args, "verbose", False))

    replay_dir = getattr(args, "replay_dir", None) or os.path.join(
        DEFAULT_DATA_DIR, "replay_buffer"
    )
    epochs = getattr(args, "epochs", 10)
    batch_size_override = getattr(args, "batch_size", None)
    lr_override = getattr(args, "lr", None)
    export_onnx = getattr(args, "export_onnx", False)

    print(_bold("=== DQN Training ==="))
    print(f"  Replay dir: {replay_dir}")
    print(f"  Epochs:     {epochs}")
    if batch_size_override:
        print(f"  Batch size: {batch_size_override} (override)")
    if lr_override:
        print(f"  LR:         {lr_override} (override)")
    print()

    if not Path(replay_dir).exists():
        _die(f"Replay buffer directory not found: {replay_dir}")

    start = time.monotonic()

    try:
        from crawler_dqn import DQNConfig, DoubleDQNAgent
        from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig

        # Load replay buffer.
        replay_config = ReplayBufferConfig(data_dir=replay_dir)
        replay = MmapReplayBuffer(replay_config)
        print(f"  Replay buffer size: {replay.size:,} transitions")
        print(f"  Replay buffer capacity: {replay_config.capacity:,}")
        print()

        if replay.size == 0:
            _die("Replay buffer is empty. Run 'crawl' first to collect transitions.")

        # Build DQN config with optional overrides.
        dqn_config = DQNConfig()
        dqn_config.state_dim = replay_config.state_dim
        if batch_size_override:
            dqn_config.batch_size = batch_size_override
        if lr_override:
            dqn_config.lr = lr_override

        # Load or create agent.
        agent = DoubleDQNAgent(dqn_config)
        if os.path.exists(dqn_config.policy_path):
            agent.load_checkpoint()
            print(f"  Resumed from checkpoint at step {agent.train_step}")
        else:
            print("  Starting fresh training")

        # Training loop.
        steps_per_epoch = max(1, replay.size // dqn_config.batch_size)
        total_steps = epochs * steps_per_epoch
        print(f"  Steps per epoch: {steps_per_epoch:,}")
        print(f"  Total steps:     {total_steps:,}")
        print()

        progress = _ProgressTracker(total=total_steps, desc="Training")

        for epoch in range(epochs):
            epoch_losses: List[float] = []

            for step in range(steps_per_epoch):
                batch = replay.sample(dqn_config.batch_size)
                states, actions, rewards, next_states, dones, weights, indices = batch

                loss, td_errors = agent.train_step_on_batch(
                    states, actions, rewards, next_states, dones, weights
                )
                replay.update_priorities(indices, td_errors)
                epoch_losses.append(loss)
                progress.update()

            avg_loss = sum(epoch_losses) / max(len(epoch_losses), 1)
            print(
                f"  Epoch {epoch + 1}/{epochs}: "
                f"avg_loss={avg_loss:.6f}, "
                f"train_step={agent.train_step}"
            )

        progress.close()

        # Save checkpoint.
        agent.save_checkpoint()
        print()
        print(_green(f"Checkpoint saved at step {agent.train_step}"))

        # Export ONNX if requested.
        if export_onnx:
            try:
                onnx_path = agent.export_onnx()
                print(_green(f"ONNX exported to {onnx_path}"))
            except Exception as exc:
                print(_red(f"ONNX export failed: {exc}"))

        # Cleanup.
        replay.close()
        agent.release()
        gc.collect()

    except ImportError as exc:
        _die(f"Training dependencies not available: {exc}")

    print()
    print(f"Training completed in {_elapsed(start)}")


# ============================================================================
# Subcommand: export
# ============================================================================

def cmd_export(args: argparse.Namespace) -> None:
    """Export the DQN model to ONNX, CoreML, or both."""
    _setup_logging(getattr(args, "verbose", False))

    fmt = getattr(args, "format", "onnx")
    quantize = getattr(args, "quantize", "none")
    checkpoint = getattr(args, "checkpoint", None)

    print(_bold("=== Model Export ==="))
    print(f"  Format:    {fmt}")
    print(f"  Quantize:  {quantize}")
    if checkpoint:
        print(f"  Checkpoint: {checkpoint}")
    print()

    try:
        from crawler_dqn import DQNConfig, DoubleDQNAgent

        dqn_config = DQNConfig()
        if checkpoint:
            dqn_config.policy_path = checkpoint

        agent = DoubleDQNAgent(dqn_config)
        if not os.path.exists(dqn_config.policy_path):
            _die(
                f"No checkpoint found at {dqn_config.policy_path}. "
                "Train the agent first with 'scrapus-crawler train'."
            )

        agent.load_checkpoint()
        print(f"  Loaded checkpoint at step {agent.train_step}")

        # Export ONNX.
        if fmt in ("onnx", "both"):
            try:
                onnx_path = agent.export_onnx()
                print(_green(f"  ONNX exported to {onnx_path}"))

                # Quantize if requested.
                if quantize == "int8":
                    try:
                        from int8_quantization import quantize_onnx_int8

                        quantized_path = onnx_path.replace(".onnx", "_int8.onnx")
                        quantize_onnx_int8(onnx_path, quantized_path)
                        print(_green(f"  INT8 quantized to {quantized_path}"))
                    except ImportError:
                        print(
                            _yellow(
                                "  INT8 quantization module not available; skipping"
                            )
                        )
                elif quantize == "fp16":
                    print(
                        _yellow(
                            "  FP16 quantization for ONNX not implemented; "
                            "use CoreML for FP16 inference"
                        )
                    )
            except Exception as exc:
                print(_red(f"  ONNX export failed: {exc}"))

        # Export CoreML.
        if fmt in ("coreml", "both"):
            try:
                from crawler_dqn import _HAS_COREML

                if not _HAS_COREML:
                    print(
                        _yellow(
                            "  CoreML not available "
                            "(install coremltools: pip install coremltools)"
                        )
                    )
                else:
                    # Export ONNX first, then convert to CoreML.
                    onnx_path = agent.export_onnx()
                    import coremltools as ct

                    model = ct.converters.onnx.convert(model=onnx_path)
                    coreml_path = onnx_path.replace(".onnx", ".mlmodel")
                    model.save(coreml_path)
                    print(_green(f"  CoreML exported to {coreml_path}"))
            except Exception as exc:
                print(_red(f"  CoreML export failed: {exc}"))

        agent.release()
        gc.collect()

    except ImportError as exc:
        _die(f"Export dependencies not available: {exc}")

    print()
    print("Export complete.")


# ============================================================================
# Subcommand: status
# ============================================================================

def cmd_status(args: argparse.Namespace) -> None:
    """Show crawler pipeline status: checkpoint, replay, frontier, domains."""
    _setup_logging(getattr(args, "verbose", False))

    data_dir = _resolve_data_dir(args)
    as_json = getattr(args, "json", False)

    status_data: Dict[str, Any] = {
        "data_dir": str(data_dir),
        "exists": data_dir.exists(),
    }

    if not data_dir.exists():
        if as_json:
            print(json.dumps(status_data, indent=2))
        else:
            print(_red(f"Data directory not found: {data_dir}"))
            print("  Run 'scrapus-crawler crawl --seeds ...' to start.")
        return

    if not as_json:
        print(_bold("=== Crawler Pipeline Status ==="))
        print()

    # 1. Data directory size.
    total_bytes = sum(f.stat().st_size for f in data_dir.rglob("*") if f.is_file())
    status_data["total_size_bytes"] = total_bytes
    if not as_json:
        print(f"  Data directory: {data_dir.resolve()}")
        print(f"  Total size:     {_human_bytes(total_bytes)}")
        print()

    # 2. Checkpoint info.
    checkpoint_info = _get_checkpoint_info(data_dir)
    status_data["checkpoint"] = checkpoint_info
    if not as_json:
        print(_bold("  Checkpoint"))
        if checkpoint_info.get("found"):
            print(
                f"    Status:     {_status_colour('active')}"
            )
            print(f"    Path:       {checkpoint_info['path']}")
            print(f"    Train step: {checkpoint_info.get('train_step', 'unknown')}")
            print(f"    Size:       {_human_bytes(checkpoint_info.get('size_bytes', 0))}")
            if checkpoint_info.get("modified"):
                print(f"    Modified:   {checkpoint_info['modified']}")
        else:
            print(f"    Status: {_status_colour('missing')}")
        print()

    # 3. Replay buffer stats.
    replay_info = _get_replay_info(data_dir)
    status_data["replay_buffer"] = replay_info
    if not as_json:
        print(_bold("  Replay Buffer"))
        if replay_info.get("found"):
            health = "healthy" if replay_info["size"] > 0 else "warning"
            print(f"    Status:   {_status_colour(health)}")
            print(f"    Size:     {replay_info['size']:,} transitions")
            print(f"    Capacity: {replay_info.get('capacity', 'unknown')}")
            print(f"    Disk:     {_human_bytes(replay_info.get('disk_bytes', 0))}")
            if replay_info.get("unresolved"):
                print(
                    f"    Unresolved rewards: "
                    f"{_yellow(str(replay_info['unresolved']))}"
                )
        else:
            print(f"    Status: {_status_colour('missing')}")
        print()

    # 4. Frontier stats.
    frontier_info = _get_frontier_info(data_dir)
    status_data["frontier"] = frontier_info
    if not as_json:
        print(_bold("  URL Frontier"))
        if frontier_info.get("found"):
            health = (
                "healthy"
                if frontier_info.get("pending", 0) > 0
                else "warning"
            )
            print(f"    Status:   {_status_colour(health)}")
            print(f"    Pending:  {frontier_info.get('pending', 0):,}")
            print(f"    Visited:  {frontier_info.get('visited', 0):,}")
            print(f"    Failed:   {frontier_info.get('failed', 0):,}")
            print(f"    Domains:  {frontier_info.get('domains', 0):,}")
        else:
            print(f"    Status: {_status_colour('missing')}")
        print()

    # 5. Domain stats.
    domain_info = _get_domain_summary(data_dir)
    status_data["domains"] = domain_info
    if not as_json:
        print(_bold("  Domain Summary"))
        if domain_info.get("found"):
            print(f"    Total domains:     {domain_info.get('total', 0):,}")
            print(f"    Active domains:    {domain_info.get('active', 0):,}")
            print(
                f"    Avg reward/domain: "
                f"{domain_info.get('avg_reward', 0):.4f}"
            )
            top = domain_info.get("top_domains", [])
            if top:
                print("    Top domains by reward:")
                for d in top[:5]:
                    print(
                        f"      {d['domain']}: "
                        f"reward={d['reward_sum']:.3f}, "
                        f"pages={d['pages_crawled']}"
                    )
        else:
            print(f"    Status: {_status_colour('missing')}")
        print()

    # 6. ONNX model.
    onnx_info = _get_onnx_info(data_dir)
    status_data["onnx_model"] = onnx_info
    if not as_json:
        print(_bold("  ONNX Model"))
        if onnx_info.get("found"):
            print(f"    Status:   {_status_colour('ok')}")
            print(f"    Path:     {onnx_info['path']}")
            print(f"    Size:     {_human_bytes(onnx_info.get('size_bytes', 0))}")
            if onnx_info.get("modified"):
                print(f"    Modified: {onnx_info['modified']}")
        else:
            print(f"    Status: {_status_colour('missing')}")
        print()

    if as_json:
        print(json.dumps(status_data, indent=2, default=str))


def _get_checkpoint_info(data_dir: Path) -> Dict[str, Any]:
    """Gather checkpoint information."""
    info: Dict[str, Any] = {"found": False}

    # Look for common checkpoint paths.
    for candidate in [
        data_dir / "models" / "dqn" / "policy.pt",
        data_dir / "checkpoints" / "policy.pt",
        data_dir / "policy.pt",
    ]:
        if candidate.exists():
            stat = candidate.stat()
            info["found"] = True
            info["path"] = str(candidate)
            info["size_bytes"] = stat.st_size
            info["modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()

            # Try to load train_step from checkpoint metadata.
            try:
                import torch

                ckpt = torch.load(candidate, map_location="cpu", weights_only=False)
                info["train_step"] = ckpt.get("train_step", "unknown")
            except Exception:
                pass
            break

    return info


def _get_replay_info(data_dir: Path) -> Dict[str, Any]:
    """Gather replay buffer information."""
    info: Dict[str, Any] = {"found": False}

    replay_dir = data_dir / "replay_buffer"
    if not replay_dir.exists():
        return info

    info["found"] = True

    # Check mmap arrays.
    states_path = replay_dir / "states.npy"
    next_states_path = replay_dir / "next_states.npy"

    disk_bytes = 0
    for f in replay_dir.rglob("*"):
        if f.is_file():
            disk_bytes += f.stat().st_size
    info["disk_bytes"] = disk_bytes

    # Check SQLite metadata.
    meta_db = replay_dir / "replay_meta.db"
    if meta_db.exists():
        try:
            conn = sqlite3.connect(f"file:{meta_db}?mode=ro", uri=True)
            cursor = conn.execute(
                "SELECT COUNT(*) FROM transitions WHERE state_idx IS NOT NULL"
            )
            info["size"] = cursor.fetchone()[0]

            cursor = conn.execute("SELECT COUNT(*) FROM transitions")
            info["capacity"] = cursor.fetchone()[0]

            # Count unresolved pending rewards.
            try:
                cursor = conn.execute(
                    "SELECT COUNT(*) FROM pending_rewards WHERE resolved = 0"
                )
                info["unresolved"] = cursor.fetchone()[0]
            except sqlite3.OperationalError:
                info["unresolved"] = 0

            conn.close()
        except (sqlite3.Error, Exception):
            info["size"] = 0
    else:
        # Estimate from file sizes if metadata DB is missing.
        if states_path.exists():
            import numpy as np

            try:
                states = np.load(str(states_path), mmap_mode="r")
                info["size"] = states.shape[0]
            except Exception:
                info["size"] = 0
        else:
            info["size"] = 0

    return info


def _get_frontier_info(data_dir: Path) -> Dict[str, Any]:
    """Gather frontier statistics from SQLite."""
    info: Dict[str, Any] = {"found": False}

    frontier_db = data_dir / "frontier.db"
    if not frontier_db.exists():
        return info

    info["found"] = True
    try:
        conn = sqlite3.connect(f"file:{frontier_db}?mode=ro", uri=True)

        try:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM urls WHERE status = 'pending'"
            )
            info["pending"] = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            info["pending"] = 0

        try:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM urls WHERE status = 'visited'"
            )
            info["visited"] = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            info["visited"] = 0

        try:
            cursor = conn.execute(
                "SELECT COUNT(*) FROM urls WHERE status = 'failed'"
            )
            info["failed"] = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            info["failed"] = 0

        try:
            cursor = conn.execute("SELECT COUNT(DISTINCT domain) FROM urls")
            info["domains"] = cursor.fetchone()[0]
        except sqlite3.OperationalError:
            info["domains"] = 0

        conn.close()
    except sqlite3.Error as exc:
        logger.debug("Failed to read frontier DB: %s", exc)

    return info


def _get_domain_summary(data_dir: Path) -> Dict[str, Any]:
    """Gather domain statistics from the scheduler DB."""
    info: Dict[str, Any] = {"found": False}

    # Domain stats might be in frontier.db or a separate domain_stats.db.
    for db_name in ("frontier.db", "domain_stats.db", "crawler.db"):
        db_path = data_dir / db_name
        if not db_path.exists():
            continue

        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)

            # Check for domain_stats table.
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='domain_stats'"
            )
            if not cursor.fetchone():
                conn.close()
                continue

            info["found"] = True

            cursor = conn.execute("SELECT COUNT(*) FROM domain_stats")
            info["total"] = cursor.fetchone()[0]

            try:
                cursor = conn.execute(
                    "SELECT COUNT(*) FROM domain_stats WHERE pages_crawled > 0"
                )
                info["active"] = cursor.fetchone()[0]
            except sqlite3.OperationalError:
                info["active"] = info["total"]

            try:
                cursor = conn.execute(
                    "SELECT AVG(reward_sum) FROM domain_stats"
                )
                row = cursor.fetchone()
                info["avg_reward"] = float(row[0]) if row[0] is not None else 0.0
            except sqlite3.OperationalError:
                info["avg_reward"] = 0.0

            # Top domains.
            try:
                cursor = conn.execute(
                    "SELECT domain, reward_sum, pages_crawled "
                    "FROM domain_stats ORDER BY reward_sum DESC LIMIT 10"
                )
                info["top_domains"] = [
                    {
                        "domain": row[0],
                        "reward_sum": float(row[1]),
                        "pages_crawled": int(row[2]),
                    }
                    for row in cursor.fetchall()
                ]
            except sqlite3.OperationalError:
                info["top_domains"] = []

            conn.close()
            break

        except sqlite3.Error as exc:
            logger.debug("Failed to read domain stats from %s: %s", db_path, exc)

    return info


def _get_onnx_info(data_dir: Path) -> Dict[str, Any]:
    """Gather ONNX model information."""
    info: Dict[str, Any] = {"found": False}

    for candidate in [
        data_dir / "models" / "dqn" / "policy.onnx",
        data_dir / "models" / "dqn" / "policy_int8.onnx",
        data_dir / "policy.onnx",
    ]:
        if candidate.exists():
            stat = candidate.stat()
            info["found"] = True
            info["path"] = str(candidate)
            info["size_bytes"] = stat.st_size
            info["modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
            break

    return info


# ============================================================================
# Subcommand: benchmark
# ============================================================================

def cmd_benchmark(args: argparse.Namespace) -> None:
    """Run performance benchmarks for crawler components."""
    _setup_logging(getattr(args, "verbose", False))

    target = getattr(args, "target", "all")

    print(_bold("=== Crawler Benchmarks ==="))
    print()

    targets = (
        ["embedding", "dqn", "replay", "bloom"]
        if target == "all"
        else [target]
    )

    results: Dict[str, Any] = {}

    for t in targets:
        if t == "embedding":
            results["embedding"] = _bench_embedding()
        elif t == "dqn":
            results["dqn"] = _bench_dqn()
        elif t == "replay":
            results["replay"] = _bench_replay()
        elif t == "bloom":
            results["bloom"] = _bench_bloom()
        else:
            print(_yellow(f"  Unknown benchmark target: {t}"))

    print()
    print(_bold("=== Summary ==="))
    print(json.dumps(results, indent=2, default=str))


def _percentiles(latencies: List[float]) -> Dict[str, float]:
    """Compute p50, p95, p99 from a list of latency values."""
    import numpy as np

    arr = np.array(latencies)
    return {
        "p50_ms": round(float(np.percentile(arr, 50)) * 1000, 3),
        "p95_ms": round(float(np.percentile(arr, 95)) * 1000, 3),
        "p99_ms": round(float(np.percentile(arr, 99)) * 1000, 3),
        "mean_ms": round(float(np.mean(arr)) * 1000, 3),
    }


def _bench_embedding() -> Dict[str, Any]:
    """Benchmark the embedding module."""
    print(_bold("  [embedding] NomicEmbedder benchmark"))
    try:
        from crawler_embeddings import EmbeddingConfig, NomicEmbedder

        config = EmbeddingConfig()
        embedder = NomicEmbedder(config)
        embedder.load()

        test_texts = [
            "Senior ML Engineer remote position in Berlin",
            "Full stack developer needed for fintech startup",
            "Data scientist with PyTorch experience required",
        ] * 50

        # Warmup.
        _ = embedder.embed_text(test_texts[0])

        latencies: List[float] = []
        for text in test_texts:
            t0 = time.perf_counter()
            _ = embedder.embed_text(text)
            latencies.append(time.perf_counter() - t0)

        embedder.unload()
        gc.collect()

        result = _percentiles(latencies)
        result["throughput_per_sec"] = round(len(latencies) / sum(latencies), 1)
        result["samples"] = len(latencies)

        print(
            f"    p50={result['p50_ms']:.2f}ms "
            f"p95={result['p95_ms']:.2f}ms "
            f"p99={result['p99_ms']:.2f}ms "
            f"throughput={result['throughput_per_sec']}/s"
        )
        return result

    except ImportError as exc:
        print(_yellow(f"    Skipped: {exc}"))
        return {"status": "skipped", "reason": str(exc)}
    except Exception as exc:
        print(_red(f"    Error: {exc}"))
        return {"status": "error", "reason": str(exc)}


def _bench_dqn() -> Dict[str, Any]:
    """Benchmark DQN inference and training step."""
    print(_bold("  [dqn] DoubleDQN benchmark"))
    try:
        from crawler_dqn import DQNConfig, DoubleDQNAgent
        import numpy as np

        config = DQNConfig()
        agent = DoubleDQNAgent(config)

        state_dim = config.state_dim
        batch_size = config.batch_size

        # Inference benchmark.
        inference_latencies: List[float] = []
        for _ in range(500):
            state = np.random.randn(state_dim).astype(np.float32)
            t0 = time.perf_counter()
            agent.select_action(state, num_links=10, global_step=0)
            inference_latencies.append(time.perf_counter() - t0)

        inf_result = _percentiles(inference_latencies)

        # Training step benchmark.
        train_latencies: List[float] = []
        for _ in range(50):
            states = np.random.randn(batch_size, state_dim).astype(np.float32)
            actions = np.random.randint(0, 10, size=batch_size)
            rewards = np.random.randn(batch_size).astype(np.float32)
            next_states = np.random.randn(batch_size, state_dim).astype(np.float32)
            dones = np.zeros(batch_size, dtype=np.float32)
            weights = np.ones(batch_size, dtype=np.float32)

            t0 = time.perf_counter()
            agent.train_step_on_batch(
                states, actions, rewards, next_states, dones, weights
            )
            train_latencies.append(time.perf_counter() - t0)

        train_result = _percentiles(train_latencies)

        agent.release()
        gc.collect()

        result = {
            "inference": inf_result,
            "training": train_result,
        }

        print(
            f"    Inference: p50={inf_result['p50_ms']:.2f}ms "
            f"p95={inf_result['p95_ms']:.2f}ms"
        )
        print(
            f"    Training:  p50={train_result['p50_ms']:.2f}ms "
            f"p95={train_result['p95_ms']:.2f}ms"
        )
        return result

    except ImportError as exc:
        print(_yellow(f"    Skipped: {exc}"))
        return {"status": "skipped", "reason": str(exc)}
    except Exception as exc:
        print(_red(f"    Error: {exc}"))
        return {"status": "error", "reason": str(exc)}


def _bench_replay() -> Dict[str, Any]:
    """Benchmark replay buffer add/sample operations."""
    print(_bold("  [replay] MmapReplayBuffer benchmark"))
    try:
        from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig
        import numpy as np
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            config = ReplayBufferConfig(
                capacity=10_000,
                data_dir=tmpdir,
            )
            replay = MmapReplayBuffer(config)

            state_dim = config.state_dim

            # Add benchmark.
            add_latencies: List[float] = []
            for i in range(2000):
                state = np.random.randn(state_dim).astype(np.float32)
                next_state = np.random.randn(state_dim).astype(np.float32)

                t0 = time.perf_counter()
                replay.add(
                    state=state,
                    action=i % 10,
                    reward=-0.01,
                    next_state=next_state,
                    done=False,
                    url=f"https://example.com/page/{i}",
                )
                add_latencies.append(time.perf_counter() - t0)

            add_result = _percentiles(add_latencies)

            # Sample benchmark.
            sample_latencies: List[float] = []
            for _ in range(200):
                t0 = time.perf_counter()
                replay.sample(64)
                sample_latencies.append(time.perf_counter() - t0)

            sample_result = _percentiles(sample_latencies)

            replay.close()

        result = {"add": add_result, "sample": sample_result}

        print(
            f"    Add:    p50={add_result['p50_ms']:.3f}ms "
            f"p95={add_result['p95_ms']:.3f}ms"
        )
        print(
            f"    Sample: p50={sample_result['p50_ms']:.3f}ms "
            f"p95={sample_result['p95_ms']:.3f}ms"
        )
        return result

    except ImportError as exc:
        print(_yellow(f"    Skipped: {exc}"))
        return {"status": "skipped", "reason": str(exc)}
    except Exception as exc:
        print(_red(f"    Error: {exc}"))
        return {"status": "error", "reason": str(exc)}


def _bench_bloom() -> Dict[str, Any]:
    """Benchmark Bloom filter operations."""
    print(_bold("  [bloom] Bloom filter benchmark"))
    try:
        from crawler_engine import BloomFilter

        bf = BloomFilter(capacity=100_000, error_rate=0.001)

        # Add benchmark.
        add_latencies: List[float] = []
        urls = [f"https://example.com/page/{i}" for i in range(5000)]
        for url in urls:
            t0 = time.perf_counter()
            bf.add(url)
            add_latencies.append(time.perf_counter() - t0)

        add_result = _percentiles(add_latencies)

        # Check benchmark.
        check_latencies: List[float] = []
        check_urls = urls[:2500] + [f"https://new.com/{i}" for i in range(2500)]
        for url in check_urls:
            t0 = time.perf_counter()
            _ = url in bf
            check_latencies.append(time.perf_counter() - t0)

        check_result = _percentiles(check_latencies)

        result = {
            "add": add_result,
            "check": check_result,
            "memory_bytes": bf.memory_usage() if hasattr(bf, "memory_usage") else 0,
        }

        print(
            f"    Add:   p50={add_result['p50_ms']:.4f}ms "
            f"p95={add_result['p95_ms']:.4f}ms"
        )
        print(
            f"    Check: p50={check_result['p50_ms']:.4f}ms "
            f"p95={check_result['p95_ms']:.4f}ms"
        )
        return result

    except ImportError as exc:
        print(_yellow(f"    Skipped: {exc}"))
        return {"status": "skipped", "reason": str(exc)}
    except Exception as exc:
        print(_red(f"    Error: {exc}"))
        return {"status": "error", "reason": str(exc)}


# ============================================================================
# Subcommand: frontier
# ============================================================================

def cmd_frontier(args: argparse.Namespace) -> None:
    """Manage the URL frontier."""
    _setup_logging(getattr(args, "verbose", False))

    action = getattr(args, "action", "stats")
    data_dir = _resolve_data_dir(args)

    if action == "stats":
        _frontier_stats(data_dir)
    elif action == "prune":
        _frontier_prune(data_dir)
    elif action == "add-seeds":
        seeds = getattr(args, "urls", None) or []
        seeds_file = getattr(args, "seeds_file", None)
        if seeds_file:
            seeds.extend(_load_seeds_from_file(seeds_file))
        if not seeds:
            _die("No URLs provided. Use --urls or --seeds-file.")
        _frontier_add_seeds(data_dir, seeds)
    else:
        _die(f"Unknown frontier action: {action}")


def _frontier_stats(data_dir: Path) -> None:
    """Display frontier statistics."""
    info = _get_frontier_info(data_dir)
    print(_bold("=== URL Frontier Statistics ==="))
    print()

    if not info.get("found"):
        print(_yellow("  Frontier database not found."))
        return

    print(f"  Pending URLs:  {info.get('pending', 0):,}")
    print(f"  Visited URLs:  {info.get('visited', 0):,}")
    print(f"  Failed URLs:   {info.get('failed', 0):,}")
    print(f"  Total domains: {info.get('domains', 0):,}")
    total = info.get("pending", 0) + info.get("visited", 0) + info.get("failed", 0)
    if total > 0:
        print()
        print("  Distribution:")
        for label, count in [
            ("Pending", info.get("pending", 0)),
            ("Visited", info.get("visited", 0)),
            ("Failed", info.get("failed", 0)),
        ]:
            pct = count / total * 100
            bar_len = int(pct / 2)
            bar = "#" * bar_len
            print(f"    {label:>8}: {count:>8,} ({pct:5.1f}%) {bar}")


def _frontier_prune(data_dir: Path) -> None:
    """Prune failed URLs from the frontier."""
    frontier_db = data_dir / "frontier.db"
    if not frontier_db.exists():
        _die("Frontier database not found.")

    try:
        conn = sqlite3.connect(str(frontier_db))

        # Count before.
        cursor = conn.execute(
            "SELECT COUNT(*) FROM urls WHERE status = 'failed'"
        )
        before = cursor.fetchone()[0]

        if before == 0:
            print("No failed URLs to prune.")
            conn.close()
            return

        # Delete failed URLs.
        conn.execute("DELETE FROM urls WHERE status = 'failed'")
        conn.commit()
        conn.execute("VACUUM")
        conn.close()

        print(_green(f"Pruned {before:,} failed URLs from the frontier."))

    except sqlite3.Error as exc:
        _die(f"Failed to prune frontier: {exc}")


def _frontier_add_seeds(data_dir: Path, seeds: List[str]) -> None:
    """Add new seed URLs to the frontier."""
    print(f"Adding {len(seeds)} seed URLs to the frontier...")

    try:
        from crawler_engine import CrawlerConfig, URLFrontier

        frontier_db = data_dir / "frontier.db"
        config = CrawlerConfig()

        # Initialise or open the frontier.
        frontier = URLFrontier(str(frontier_db), config)

        added = 0
        for url in seeds:
            try:
                frontier.add_url(url, priority=1.0, depth=0)
                added += 1
            except Exception:
                logger.debug("Skipping URL (duplicate or invalid): %s", url)

        print(_green(f"Added {added}/{len(seeds)} seed URLs to the frontier."))

    except ImportError:
        # Fallback: insert directly into SQLite.
        frontier_db = data_dir / "frontier.db"
        if not frontier_db.exists():
            _die("Frontier database not found and crawler engine not available.")

        try:
            conn = sqlite3.connect(str(frontier_db))
            added = 0
            for url in seeds:
                try:
                    conn.execute(
                        "INSERT OR IGNORE INTO urls (url, status, priority, depth) "
                        "VALUES (?, 'pending', 1.0, 0)",
                        (url,),
                    )
                    added += 1
                except sqlite3.Error:
                    pass
            conn.commit()
            conn.close()
            print(_green(f"Added {added}/{len(seeds)} seed URLs to the frontier."))
        except sqlite3.Error as exc:
            _die(f"Failed to add seeds: {exc}")


# ============================================================================
# Subcommand: domains
# ============================================================================

def cmd_domains(args: argparse.Namespace) -> None:
    """Manage and inspect domain statistics."""
    _setup_logging(getattr(args, "verbose", False))

    action = getattr(args, "action", "list")
    data_dir = _resolve_data_dir(args)

    if action == "list":
        _domains_list(data_dir)
    elif action == "top":
        n = getattr(args, "n", 20)
        _domains_top(data_dir, n)
    elif action == "health":
        _domains_health(data_dir)
    elif action == "classify":
        _domains_classify(data_dir)
    else:
        _die(f"Unknown domains action: {action}")


def _find_domain_db(data_dir: Path) -> Optional[Path]:
    """Find the database containing domain_stats table."""
    for db_name in ("frontier.db", "domain_stats.db", "crawler.db"):
        db_path = data_dir / db_name
        if not db_path.exists():
            continue
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            cursor = conn.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name='domain_stats'"
            )
            if cursor.fetchone():
                conn.close()
                return db_path
            conn.close()
        except sqlite3.Error:
            continue
    return None


def _domains_list(data_dir: Path) -> None:
    """List all domains with stats."""
    db_path = _find_domain_db(data_dir)
    if not db_path:
        print(_yellow("No domain statistics database found."))
        return

    print(_bold("=== Domain List ==="))
    print()

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute(
            "SELECT domain, pages_crawled, reward_sum "
            "FROM domain_stats ORDER BY domain"
        )
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print("  No domains recorded yet.")
            return

        # Table header.
        print(f"  {'Domain':<50} {'Pages':>8} {'Reward':>10}")
        print(f"  {'-' * 50} {'-' * 8} {'-' * 10}")
        for domain, pages, reward in rows:
            print(f"  {domain:<50} {pages:>8,} {reward:>10.4f}")

        print()
        print(f"  Total: {len(rows)} domains")

    except sqlite3.Error as exc:
        _die(f"Failed to read domain stats: {exc}")


def _domains_top(data_dir: Path, n: int = 20) -> None:
    """Show top N domains by reward."""
    db_path = _find_domain_db(data_dir)
    if not db_path:
        print(_yellow("No domain statistics database found."))
        return

    print(_bold(f"=== Top {n} Domains by Reward ==="))
    print()

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute(
            "SELECT domain, pages_crawled, reward_sum "
            "FROM domain_stats ORDER BY reward_sum DESC LIMIT ?",
            (n,),
        )
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print("  No domains recorded yet.")
            return

        for i, (domain, pages, reward) in enumerate(rows, 1):
            reward_str = f"{reward:.4f}"
            if reward > 0:
                reward_str = _green(reward_str)
            elif reward < -0.5:
                reward_str = _red(reward_str)
            print(
                f"  {i:>3}. {domain:<45} "
                f"pages={pages:>6,}  reward={reward_str}"
            )

    except sqlite3.Error as exc:
        _die(f"Failed to read domain stats: {exc}")


def _domains_health(data_dir: Path) -> None:
    """Show a domain health report."""
    db_path = _find_domain_db(data_dir)
    if not db_path:
        print(_yellow("No domain statistics database found."))
        return

    print(_bold("=== Domain Health Report ==="))
    print()

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute(
            "SELECT domain, pages_crawled, reward_sum FROM domain_stats"
        )
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print("  No domains recorded yet.")
            return

        healthy = []
        warning = []
        unhealthy = []

        for domain, pages, reward in rows:
            if pages == 0:
                continue
            avg_reward = reward / pages
            if avg_reward >= 0.1:
                healthy.append((domain, pages, reward, avg_reward))
            elif avg_reward >= 0.0:
                warning.append((domain, pages, reward, avg_reward))
            else:
                unhealthy.append((domain, pages, reward, avg_reward))

        # Sort each group by avg_reward descending.
        healthy.sort(key=lambda x: x[3], reverse=True)
        warning.sort(key=lambda x: x[3], reverse=True)
        unhealthy.sort(key=lambda x: x[3])

        if healthy:
            print(f"  {_green('HEALTHY')} ({len(healthy)} domains, avg_reward >= 0.1):")
            for domain, pages, reward, avg in healthy[:10]:
                print(
                    f"    {domain:<45} pages={pages:>5,} "
                    f"avg_reward={_green(f'{avg:.4f}')}"
                )
            if len(healthy) > 10:
                print(f"    ... and {len(healthy) - 10} more")
            print()

        if warning:
            print(
                f"  {_yellow('WARNING')} ({len(warning)} domains, "
                f"0 <= avg_reward < 0.1):"
            )
            for domain, pages, reward, avg in warning[:10]:
                print(
                    f"    {domain:<45} pages={pages:>5,} "
                    f"avg_reward={_yellow(f'{avg:.4f}')}"
                )
            if len(warning) > 10:
                print(f"    ... and {len(warning) - 10} more")
            print()

        if unhealthy:
            print(
                f"  {_red('UNHEALTHY')} ({len(unhealthy)} domains, "
                f"avg_reward < 0):"
            )
            for domain, pages, reward, avg in unhealthy[:10]:
                print(
                    f"    {domain:<45} pages={pages:>5,} "
                    f"avg_reward={_red(f'{avg:.4f}')}"
                )
            if len(unhealthy) > 10:
                print(f"    ... and {len(unhealthy) - 10} more")
            print()

        # Summary.
        total = len(healthy) + len(warning) + len(unhealthy)
        print(
            f"  Summary: {_green(str(len(healthy)))} healthy, "
            f"{_yellow(str(len(warning)))} warning, "
            f"{_red(str(len(unhealthy)))} unhealthy "
            f"/ {total} total active domains"
        )

    except sqlite3.Error as exc:
        _die(f"Failed to read domain stats: {exc}")


def _domains_classify(data_dir: Path) -> None:
    """Classify domains by crawl pattern (broad/deep/stale)."""
    db_path = _find_domain_db(data_dir)
    if not db_path:
        print(_yellow("No domain statistics database found."))
        return

    print(_bold("=== Domain Classification ==="))
    print()

    try:
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        cursor = conn.execute(
            "SELECT domain, pages_crawled, reward_sum FROM domain_stats"
        )
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print("  No domains recorded yet.")
            return

        # Classify: high-yield (>0.1 avg), broad-crawl (many pages, low reward),
        # deep-crawl (few pages, high reward), stale (0 pages).
        high_yield: List[tuple] = []
        broad: List[tuple] = []
        deep: List[tuple] = []
        stale: List[tuple] = []

        median_pages = sorted(r[1] for r in rows)[len(rows) // 2] if rows else 1

        for domain, pages, reward in rows:
            if pages == 0:
                stale.append((domain, pages, reward))
            elif pages > median_pages and (reward / max(pages, 1)) < 0.05:
                broad.append((domain, pages, reward))
            elif pages <= median_pages and (reward / max(pages, 1)) >= 0.1:
                deep.append((domain, pages, reward))
            elif (reward / max(pages, 1)) >= 0.1:
                high_yield.append((domain, pages, reward))
            else:
                broad.append((domain, pages, reward))

        for label, group, colour_fn in [
            ("HIGH-YIELD", high_yield, _green),
            ("DEEP-CRAWL", deep, _bold),
            ("BROAD-CRAWL", broad, _dim),
            ("STALE", stale, _yellow),
        ]:
            if group:
                print(f"  {colour_fn(label)} ({len(group)} domains):")
                for domain, pages, reward in sorted(
                    group, key=lambda x: x[2], reverse=True
                )[:5]:
                    print(
                        f"    {domain:<45} pages={pages:>5,} reward={reward:.4f}"
                    )
                if len(group) > 5:
                    print(f"    ... and {len(group) - 5} more")
                print()

    except sqlite3.Error as exc:
        _die(f"Failed to read domain stats: {exc}")


# ============================================================================
# Subcommand: config
# ============================================================================

def cmd_config(args: argparse.Namespace) -> None:
    """Manage crawler pipeline configuration."""
    _setup_logging(getattr(args, "verbose", False))

    action = getattr(args, "action", "show")

    if action == "show":
        _config_show(args)
    elif action == "validate":
        _config_validate(args)
    elif action == "diff":
        _config_diff(args)
    else:
        _die(f"Unknown config action: {action}")


def _config_show(args: argparse.Namespace) -> None:
    """Pretty-print current configuration."""
    config = _load_pipeline_config(args)

    print(_bold("=== Crawler Pipeline Configuration ==="))
    print()

    # Pipeline-level settings.
    print(_bold("  Pipeline"))
    print(f"    max_pages:            {config.max_pages:,}")
    print(f"    train_after_n_pages:  {config.train_after_n_pages:,}")
    print(f"    train_every_n_steps:  {config.train_every_n_steps}")
    print(f"    policy_save_interval: {config.policy_save_interval}")
    print(f"    onnx_export_interval: {config.onnx_export_interval:,}")
    print(f"    memory_budget_mb:     {config.memory_budget_mb} MB")
    print(f"    use_onnx_inference:   {config.use_onnx_inference}")
    print(f"    data_dir:             {config.data_dir}")
    print()

    # DQN settings.
    dqn = config.dqn
    print(_bold("  DQN"))
    print(f"    state_dim:            {dqn.state_dim}")
    print(f"    action_dim:           {dqn.action_dim}")
    print(f"    hidden layers:        {dqn.hidden_1} -> {dqn.hidden_2}")
    print(f"    lr:                   {dqn.lr}")
    print(f"    gamma:                {dqn.gamma}")
    print(f"    batch_size:           {dqn.batch_size}")
    print(f"    epsilon:              {dqn.epsilon_start} -> {dqn.epsilon_end}")
    print(f"    epsilon_decay_steps:  {dqn.epsilon_decay_steps:,}")
    print(f"    target_update_freq:   {dqn.target_update_freq:,}")
    print(f"    n_step:               {dqn.n_step}")
    print(f"    grad_clip_max_norm:   {dqn.grad_clip_max_norm}")
    print()

    # Crawler settings.
    crawler = config.crawler
    print(_bold("  Crawler Engine"))
    print(f"    max_concurrent:       {crawler.max_concurrent}")
    print(f"    default_crawl_delay:  {crawler.default_crawl_delay}s")
    print(f"    bloom_capacity:       {crawler.bloom_capacity:,}")
    if hasattr(crawler, "bloom_error_rate"):
        print(f"    bloom_error_rate:     {crawler.bloom_error_rate}")
    if hasattr(crawler, "page_timeout_ms"):
        print(f"    page_timeout_ms:      {crawler.page_timeout_ms}")
    if hasattr(crawler, "max_links_per_page"):
        print(f"    max_links_per_page:   {crawler.max_links_per_page}")
    print()

    # Replay buffer settings.
    replay = config.replay
    print(_bold("  Replay Buffer"))
    print(f"    capacity:             {replay.capacity:,}")
    print(f"    state_dim:            {replay.state_dim}")
    print(f"    alpha:                {replay.alpha}")
    print(f"    beta:                 {replay.beta_start} -> {replay.beta_end}")
    print(f"    beta_anneal_steps:    {replay.beta_anneal_steps:,}")
    print(f"    data_dir:             {replay.data_dir}")
    print()

    # Embedding settings.
    embedding = config.embedding
    print(_bold("  Embedding"))
    print(f"    embedding_dim:        {embedding.embedding_dim}")
    if hasattr(embedding, "model_name"):
        print(f"    model_name:           {embedding.model_name}")
    if hasattr(embedding, "batch_size"):
        print(f"    batch_size:           {embedding.batch_size}")
    if hasattr(embedding, "max_seq_length"):
        print(f"    max_seq_length:       {embedding.max_seq_length}")


def _config_validate(args: argparse.Namespace) -> None:
    """Validate the configuration for errors."""
    print(_bold("=== Configuration Validation ==="))
    print()

    try:
        config = _load_pipeline_config(args)
    except Exception as exc:
        print(_red(f"Failed to load configuration: {exc}"))
        sys.exit(1)

    try:
        from crawler_config_validator import ConfigValidator, M1MemoryBudgetValidator

        errors = ConfigValidator.validate_pipeline_config(config)

        if errors:
            print(_red(f"Found {len(errors)} error(s):"))
            for err in errors:
                print(f"  {_red('X')} {err}")
            print()
            sys.exit(1)
        else:
            print(_green("  All configuration checks passed."))

        # Memory budget validation.
        print()
        print(_bold("  Memory Budget Estimation"))
        try:
            budget = M1MemoryBudgetValidator()
            estimate = budget.estimate(config)
            total_mb = estimate.get("total_mb", 0)
            budget_mb = config.memory_budget_mb

            print(f"    Estimated usage: {total_mb:.0f} MB")
            print(f"    Budget:          {budget_mb} MB")

            if total_mb > budget_mb:
                print(
                    f"    {_red('WARNING')}: Estimated memory exceeds budget "
                    f"by {total_mb - budget_mb:.0f} MB"
                )
            else:
                headroom = budget_mb - total_mb
                print(
                    f"    {_green('OK')}: {headroom:.0f} MB headroom"
                )

            # Component breakdown.
            for component, mb in estimate.items():
                if component != "total_mb":
                    print(f"      {component:<25} {mb:>8.1f} MB")
        except Exception as exc:
            print(_yellow(f"    Memory estimation not available: {exc}"))

    except ImportError:
        print(
            _yellow(
                "  Config validator not available; "
                "basic config loaded without deep validation."
            )
        )
        print(_green("  Configuration loaded successfully."))


def _config_diff(args: argparse.Namespace) -> None:
    """Compare two configuration files."""
    file_a = getattr(args, "file_a", None)
    file_b = getattr(args, "file_b", None)

    if not file_a or not file_b:
        _die("Two config files required: --file-a and --file-b")

    print(_bold("=== Configuration Diff ==="))
    print(f"  A: {file_a}")
    print(f"  B: {file_b}")
    print()

    try:
        from crawler_config_validator import ConfigLoader, ConfigDiff

        config_a = ConfigLoader.load_config(toml_path=file_a)
        config_b = ConfigLoader.load_config(toml_path=file_b)

        diff = ConfigDiff.diff(config_a, config_b)

        if not diff:
            print(_green("  Configurations are identical."))
            return

        print(f"  Found {len(diff)} difference(s):")
        for entry in diff:
            field = entry.get("field", "unknown")
            val_a = entry.get("a", "")
            val_b = entry.get("b", "")
            print(f"    {field}:")
            print(f"      A: {_red(str(val_a))}")
            print(f"      B: {_green(str(val_b))}")

    except ImportError:
        # Fallback: raw TOML comparison.
        try:
            try:
                import tomllib
            except ModuleNotFoundError:
                try:
                    import tomli as tomllib  # type: ignore[no-redef]
                except ModuleNotFoundError:
                    _die(
                        "Neither tomllib (Python 3.11+) nor tomli is available "
                        "for TOML parsing."
                    )

            data_a = tomllib.loads(Path(file_a).read_text(encoding="utf-8"))
            data_b = tomllib.loads(Path(file_b).read_text(encoding="utf-8"))

            _print_dict_diff(data_a, data_b, prefix="")

        except FileNotFoundError as exc:
            _die(str(exc))

    except FileNotFoundError as exc:
        _die(str(exc))


def _print_dict_diff(
    a: Dict[str, Any],
    b: Dict[str, Any],
    prefix: str = "",
) -> None:
    """Recursively print differences between two dicts."""
    all_keys = sorted(set(list(a.keys()) + list(b.keys())))
    found_diff = False

    for key in all_keys:
        full_key = f"{prefix}{key}" if not prefix else f"{prefix}.{key}"
        val_a = a.get(key)
        val_b = b.get(key)

        if isinstance(val_a, dict) and isinstance(val_b, dict):
            _print_dict_diff(val_a, val_b, full_key)
        elif val_a != val_b:
            found_diff = True
            if val_a is None:
                print(f"    {_green('+')} {full_key}: {val_b}")
            elif val_b is None:
                print(f"    {_red('-')} {full_key}: {val_a}")
            else:
                print(f"    {_yellow('~')} {full_key}: {_red(str(val_a))} -> {_green(str(val_b))}")

    if not found_diff and not prefix:
        print(_green("  Configurations are identical."))


# ============================================================================
# Subcommand: replay
# ============================================================================

def cmd_replay(args: argparse.Namespace) -> None:
    """Manage the replay buffer."""
    _setup_logging(getattr(args, "verbose", False))

    action = getattr(args, "action", "stats")
    data_dir = _resolve_data_dir(args)

    if action == "stats":
        _replay_stats(data_dir)
    elif action == "prune":
        _replay_prune(data_dir)
    elif action == "export":
        output = getattr(args, "output", None) or str(data_dir / "replay_export.json")
        _replay_export(data_dir, output)
    else:
        _die(f"Unknown replay action: {action}")


def _replay_stats(data_dir: Path) -> None:
    """Display detailed replay buffer statistics."""
    info = _get_replay_info(data_dir)

    print(_bold("=== Replay Buffer Statistics ==="))
    print()

    if not info.get("found"):
        print(_yellow("  Replay buffer not found."))
        return

    print(f"  Size:       {info.get('size', 0):,} transitions")
    print(f"  Capacity:   {info.get('capacity', 'unknown')}")
    print(f"  Disk usage: {_human_bytes(info.get('disk_bytes', 0))}")

    size = info.get("size", 0)
    capacity = info.get("capacity", 0)
    if isinstance(capacity, int) and capacity > 0:
        fill_pct = size / capacity * 100
        fill_colour = _green if fill_pct < 80 else (_yellow if fill_pct < 95 else _red)
        print(f"  Fill:       {fill_colour(f'{fill_pct:.1f}%')}")

    if info.get("unresolved", 0) > 0:
        unresolved_str = f"{info['unresolved']:,}"
        print(f"  Unresolved: {_yellow(unresolved_str)} pending rewards")

    # Try to get more detailed stats from the buffer itself.
    try:
        from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig

        replay_dir = data_dir / "replay_buffer"
        config = ReplayBufferConfig(data_dir=str(replay_dir))
        replay = MmapReplayBuffer(config)

        stats = replay.get_buffer_stats()
        replay.close()

        if stats:
            print()
            print("  Detailed stats:")
            for key, val in stats.items():
                if isinstance(val, float):
                    print(f"    {key}: {val:.4f}")
                else:
                    print(f"    {key}: {val}")

    except (ImportError, Exception) as exc:
        logger.debug("Could not load replay buffer for detailed stats: %s", exc)


def _replay_prune(data_dir: Path) -> None:
    """Prune old pending rewards from the replay buffer."""
    try:
        from crawler_replay_buffer import MmapReplayBuffer, ReplayBufferConfig

        replay_dir = data_dir / "replay_buffer"
        if not replay_dir.exists():
            _die("Replay buffer directory not found.")

        config = ReplayBufferConfig(data_dir=str(replay_dir))
        replay = MmapReplayBuffer(config)

        before = replay.count_unresolved() if hasattr(replay, "count_unresolved") else 0
        if hasattr(replay, "prune_old_pending"):
            replay.prune_old_pending()

        after = replay.count_unresolved() if hasattr(replay, "count_unresolved") else 0
        replay.close()

        pruned = before - after
        if pruned > 0:
            print(_green(f"Pruned {pruned:,} stale pending rewards."))
        else:
            print("No stale pending rewards to prune.")

    except ImportError as exc:
        _die(f"Replay buffer module not available: {exc}")


def _replay_export(data_dir: Path, output: str) -> None:
    """Export replay buffer metadata to JSON."""
    info = _get_replay_info(data_dir)

    if not info.get("found"):
        _die("Replay buffer not found.")

    # Export metadata (not the full state arrays, which are huge).
    replay_dir = data_dir / "replay_buffer"
    meta_db = replay_dir / "replay_meta.db"

    export_data: Dict[str, Any] = {
        "exported_at": datetime.now().isoformat(),
        "buffer_stats": info,
        "transitions": [],
    }

    if meta_db.exists():
        try:
            conn = sqlite3.connect(f"file:{meta_db}?mode=ro", uri=True)
            cursor = conn.execute(
                "SELECT url, action, reward, done, timestamp "
                "FROM transitions ORDER BY timestamp DESC LIMIT 10000"
            )
            columns = [desc[0] for desc in cursor.description]
            for row in cursor.fetchall():
                export_data["transitions"].append(dict(zip(columns, row)))
            conn.close()
        except (sqlite3.Error, Exception) as exc:
            logger.warning("Could not export transition metadata: %s", exc)

    Path(output).write_text(
        json.dumps(export_data, indent=2, default=str), encoding="utf-8"
    )
    print(_green(f"Exported {len(export_data['transitions'])} transitions to {output}"))


# ============================================================================
# Argument parser construction
# ============================================================================

def _add_common_args(parser: argparse.ArgumentParser) -> None:
    """Add flags shared by all subcommands."""
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Set log level to DEBUG",
    )
    parser.add_argument(
        "--data-dir",
        metavar="DIR",
        default=DEFAULT_DATA_DIR,
        dest="data_dir",
        help=f"Data directory (default: {DEFAULT_DATA_DIR})",
    )


def build_parser() -> argparse.ArgumentParser:
    """Construct the full CLI argument parser."""
    parser = argparse.ArgumentParser(
        prog="scrapus-crawler",
        description="Module 1: RL-based focused web crawler for Scrapus",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  scrapus-crawler crawl --seeds https://a.com https://b.com --max-pages 1000\n"
            "  scrapus-crawler crawl --seeds-file seeds.txt --concurrency 4 --use-onnx\n"
            "  scrapus-crawler train --replay-dir scrapus_data/replay_buffer --epochs 10\n"
            "  scrapus-crawler export --format onnx --quantize int8\n"
            "  scrapus-crawler status\n"
            "  scrapus-crawler status --json\n"
            "  scrapus-crawler benchmark dqn\n"
            "  scrapus-crawler frontier stats\n"
            "  scrapus-crawler frontier add-seeds --urls https://new.com\n"
            "  scrapus-crawler domains top --n 10\n"
            "  scrapus-crawler domains health\n"
            "  scrapus-crawler config show\n"
            "  scrapus-crawler config validate\n"
            "  scrapus-crawler config diff --file-a base.toml --file-b custom.toml\n"
            "  scrapus-crawler replay stats\n"
            "  scrapus-crawler replay export --output replay.json\n"
        ),
    )
    parser.add_argument(
        "--version", action="version", version=f"scrapus-crawler {__version__}",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # ---- crawl --------------------------------------------------------------
    p_crawl = subparsers.add_parser(
        "crawl", help="Run the RL-based web crawler",
    )
    _add_common_args(p_crawl)
    p_crawl.add_argument(
        "--seeds", nargs="+", metavar="URL",
        help="Seed URLs to start crawling from",
    )
    p_crawl.add_argument(
        "--seeds-file", metavar="PATH", dest="seeds_file",
        help="Load seed URLs from a file (one per line)",
    )
    p_crawl.add_argument(
        "--max-pages", type=int, default=1000, metavar="N", dest="max_pages",
        help="Maximum number of pages to crawl (default: 1000)",
    )
    p_crawl.add_argument(
        "--concurrency", type=int, default=8, metavar="N",
        help="Number of concurrent crawler workers (default: 8)",
    )
    p_crawl.add_argument(
        "--use-onnx", action="store_true", default=False, dest="use_onnx",
        help="Use ONNX inference instead of PyTorch",
    )
    p_crawl.add_argument(
        "--config", "-c", metavar="PATH",
        help="Path to TOML config file",
    )
    p_crawl.add_argument(
        "--resume", action="store_true", default=False,
        help="Resume from last checkpoint",
    )
    p_crawl.add_argument(
        "--dry-run", action="store_true", default=False, dest="dry_run",
        help="Validate config and seeds without crawling",
    )
    p_crawl.set_defaults(func=cmd_crawl)

    # ---- train --------------------------------------------------------------
    p_train = subparsers.add_parser(
        "train", help="Train or continue training the DQN agent",
    )
    _add_common_args(p_train)
    p_train.add_argument(
        "--replay-dir", metavar="DIR", dest="replay_dir",
        help="Replay buffer directory (default: scrapus_data/replay_buffer)",
    )
    p_train.add_argument(
        "--epochs", type=int, default=10, metavar="N",
        help="Number of training epochs (default: 10)",
    )
    p_train.add_argument(
        "--batch-size", type=int, metavar="N", dest="batch_size",
        help="Override training batch size",
    )
    p_train.add_argument(
        "--lr", type=float, metavar="RATE",
        help="Override learning rate",
    )
    p_train.add_argument(
        "--export-onnx", action="store_true", default=False, dest="export_onnx",
        help="Export ONNX model after training",
    )
    p_train.set_defaults(func=cmd_train)

    # ---- export -------------------------------------------------------------
    p_export = subparsers.add_parser(
        "export", help="Export DQN model to ONNX/CoreML",
    )
    _add_common_args(p_export)
    p_export.add_argument(
        "--format", choices=["onnx", "coreml", "both"], default="onnx",
        help="Export format (default: onnx)",
    )
    p_export.add_argument(
        "--quantize", choices=["none", "int8", "fp16"], default="none",
        help="Quantization mode (default: none)",
    )
    p_export.add_argument(
        "--checkpoint", metavar="PATH",
        help="Path to checkpoint file",
    )
    p_export.set_defaults(func=cmd_export)

    # ---- status -------------------------------------------------------------
    p_status = subparsers.add_parser(
        "status", help="Show crawler pipeline status",
    )
    _add_common_args(p_status)
    p_status.add_argument(
        "--json", action="store_true", default=False,
        help="Output status as JSON",
    )
    p_status.set_defaults(func=cmd_status)

    # ---- benchmark ----------------------------------------------------------
    p_bench = subparsers.add_parser(
        "benchmark", help="Run performance benchmarks",
    )
    _add_common_args(p_bench)
    p_bench.add_argument(
        "target",
        nargs="?",
        choices=["embedding", "dqn", "replay", "bloom", "all"],
        default="all",
        help="Benchmark target (default: all)",
    )
    p_bench.set_defaults(func=cmd_benchmark)

    # ---- frontier -----------------------------------------------------------
    p_frontier = subparsers.add_parser(
        "frontier", help="Manage the URL frontier",
    )
    _add_common_args(p_frontier)
    p_frontier.add_argument(
        "action",
        nargs="?",
        choices=["stats", "prune", "add-seeds"],
        default="stats",
        help="Frontier action (default: stats)",
    )
    p_frontier.add_argument(
        "--urls", nargs="+", metavar="URL",
        help="URLs to add (for add-seeds action)",
    )
    p_frontier.add_argument(
        "--seeds-file", metavar="PATH", dest="seeds_file",
        help="File with seed URLs (for add-seeds action)",
    )
    p_frontier.set_defaults(func=cmd_frontier)

    # ---- domains ------------------------------------------------------------
    p_domains = subparsers.add_parser(
        "domains", help="Inspect domain statistics",
    )
    _add_common_args(p_domains)
    p_domains.add_argument(
        "action",
        nargs="?",
        choices=["list", "top", "health", "classify"],
        default="list",
        help="Domains action (default: list)",
    )
    p_domains.add_argument(
        "--n", type=int, default=20, metavar="N",
        help="Number of top domains to show (default: 20)",
    )
    p_domains.set_defaults(func=cmd_domains)

    # ---- config -------------------------------------------------------------
    p_config = subparsers.add_parser(
        "config", help="Manage crawler configuration",
    )
    _add_common_args(p_config)
    p_config.add_argument(
        "action",
        nargs="?",
        choices=["show", "validate", "diff"],
        default="show",
        help="Config action (default: show)",
    )
    p_config.add_argument(
        "--config", "-c", metavar="PATH",
        help="Path to TOML config file",
    )
    p_config.add_argument(
        "--file-a", metavar="PATH", dest="file_a",
        help="First config file for diff",
    )
    p_config.add_argument(
        "--file-b", metavar="PATH", dest="file_b",
        help="Second config file for diff",
    )
    p_config.set_defaults(func=cmd_config)

    # ---- replay -------------------------------------------------------------
    p_replay = subparsers.add_parser(
        "replay", help="Manage the replay buffer",
    )
    _add_common_args(p_replay)
    p_replay.add_argument(
        "action",
        nargs="?",
        choices=["stats", "prune", "export"],
        default="stats",
        help="Replay action (default: stats)",
    )
    p_replay.add_argument(
        "--output", "-o", metavar="PATH",
        help="Output path for export (default: scrapus_data/replay_export.json)",
    )
    p_replay.set_defaults(func=cmd_replay)

    return parser


# ============================================================================
# Entry point
# ============================================================================

def main(argv: Optional[Sequence[str]] = None) -> None:
    """CLI entry point."""
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command is None:
        parser.print_help()
        sys.exit(0)

    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        sys.exit(130)
    except Exception as exc:
        logger.exception("Unhandled error")
        _die(f"Fatal: {exc}")


if __name__ == "__main__":
    main()
