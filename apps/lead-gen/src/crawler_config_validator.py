"""
Config validation, loading, and memory estimation for the Module 1 crawler pipeline.

Provides:
1. ConfigValidator: per-config and cross-config validation rules
2. ConfigLoader: merge TOML defaults < env vars < CLI args into CrawlerPipelineConfig
3. M1MemoryBudgetValidator: estimate per-component memory on Apple M1 16GB
4. ConfigDiff: human-readable diff between two configs
5. print_config: pretty-print grouped config with non-default highlighting

Uses only stdlib + tomllib (Python 3.11+) or tomli fallback.

Target: Apple M1 16GB, zero cloud dependency.
"""

from __future__ import annotations

import argparse
import copy
import logging
import math
import os
import sys
from dataclasses import asdict, dataclass, fields
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

try:
    import tomllib  # Python 3.11+
except ModuleNotFoundError:
    try:
        import tomli as tomllib  # type: ignore[no-redef]
    except ModuleNotFoundError:
        import toml as _toml_compat  # type: ignore[import-untyped]

        class _TomllShim:
            """Minimal shim so we can use tomllib.loads() everywhere."""

            @staticmethod
            def loads(s: str) -> dict:
                return _toml_compat.loads(s)

        tomllib = _TomllShim()  # type: ignore[assignment]

from crawler_dqn import DQNConfig
from crawler_embeddings import EmbeddingConfig
from crawler_engine import CrawlerConfig
from crawler_pipeline import CrawlerPipelineConfig
from crawler_replay_buffer import ReplayBufferConfig

logger = logging.getLogger("crawler_config_validator")

# Path to the bundled default config shipped alongside this module.
_DEFAULT_TOML = Path(__file__).parent / "scrapus_default.toml"


# ============================================================================
# 1. ConfigValidator
# ============================================================================

class ConfigValidator:
    """Validates individual and cross-config consistency for the crawler pipeline.

    Each ``validate_*`` method returns a list of human-readable error strings.
    An empty list means the config passed validation.
    """

    @staticmethod
    def validate_dqn_config(config: DQNConfig) -> List[str]:
        """Validate DQN hyperparameters.

        Checks:
        - state_dim > 0, action_dim > 0
        - 0 < lr < 1
        - 0 < gamma <= 1
        - batch_size > 0
        - epsilon_start >= epsilon_end
        - grad_clip_max_norm > 0
        """
        errors: List[str] = []

        if config.state_dim <= 0:
            errors.append(f"dqn.state_dim must be > 0, got {config.state_dim}")
        if config.action_dim <= 0:
            errors.append(f"dqn.action_dim must be > 0, got {config.action_dim}")
        if not (0 < config.lr < 1):
            errors.append(f"dqn.lr must be in (0, 1), got {config.lr}")
        if not (0 < config.gamma <= 1):
            errors.append(f"dqn.gamma must be in (0, 1], got {config.gamma}")
        if config.batch_size <= 0:
            errors.append(f"dqn.batch_size must be > 0, got {config.batch_size}")
        if config.epsilon_start < config.epsilon_end:
            errors.append(
                f"dqn.epsilon_start ({config.epsilon_start}) must be >= "
                f"epsilon_end ({config.epsilon_end})"
            )
        if config.grad_clip_max_norm <= 0:
            errors.append(
                f"dqn.grad_clip_max_norm must be > 0, got {config.grad_clip_max_norm}"
            )

        return errors

    @staticmethod
    def validate_crawler_config(config: CrawlerConfig) -> List[str]:
        """Validate crawler engine configuration.

        Checks:
        - max_concurrent > 0 and <= 32
        - 0 < default_crawl_delay
        - bloom_capacity > 0
        """
        errors: List[str] = []

        if config.max_concurrent <= 0 or config.max_concurrent > 32:
            errors.append(
                f"crawler.max_concurrent must be in (0, 32], got {config.max_concurrent}"
            )
        if config.default_crawl_delay <= 0:
            errors.append(
                f"crawler.default_crawl_delay must be > 0, got {config.default_crawl_delay}"
            )
        if config.bloom_capacity <= 0:
            errors.append(
                f"crawler.bloom_capacity must be > 0, got {config.bloom_capacity}"
            )

        return errors

    @staticmethod
    def validate_replay_config(config: ReplayBufferConfig) -> List[str]:
        """Validate replay buffer configuration.

        Checks:
        - capacity > 0
        - 0 <= alpha <= 1
        - 0 < beta_start <= beta_end <= 1
        """
        errors: List[str] = []

        if config.capacity <= 0:
            errors.append(f"replay.capacity must be > 0, got {config.capacity}")
        if not (0 <= config.alpha <= 1):
            errors.append(f"replay.alpha must be in [0, 1], got {config.alpha}")
        if not (0 < config.beta_start <= 1):
            errors.append(
                f"replay.beta_start must be in (0, 1], got {config.beta_start}"
            )
        if not (0 < config.beta_end <= 1):
            errors.append(
                f"replay.beta_end must be in (0, 1], got {config.beta_end}"
            )
        if config.beta_start > config.beta_end:
            errors.append(
                f"replay.beta_start ({config.beta_start}) must be <= "
                f"beta_end ({config.beta_end})"
            )

        return errors

    @staticmethod
    def validate_embedding_config(config: EmbeddingConfig) -> List[str]:
        """Validate embedding configuration.

        Checks:
        - embedding_dim > 0
        - total_state_dim == embedding_dim + scalar_dim
        - batch_size > 0
        """
        errors: List[str] = []

        if config.embedding_dim <= 0:
            errors.append(
                f"embedding.embedding_dim must be > 0, got {config.embedding_dim}"
            )
        if config.batch_size <= 0:
            errors.append(
                f"embedding.batch_size must be > 0, got {config.batch_size}"
            )
        expected_total = config.embedding_dim + config.scalar_dim
        if config.total_state_dim != expected_total:
            errors.append(
                f"embedding.total_state_dim ({config.total_state_dim}) must equal "
                f"embedding_dim + scalar_dim ({expected_total})"
            )

        return errors

    @staticmethod
    def validate_pipeline_config(config: CrawlerPipelineConfig) -> List[str]:
        """Validate pipeline-level config with cross-config consistency checks.

        Checks:
        - replay.state_dim == dqn.state_dim
        - train_after_n_pages < replay.capacity
        - memory_budget_mb > 0
        - All sub-config validations pass
        """
        errors: List[str] = []

        # Cross-config: state_dim consistency
        if config.replay.state_dim != config.dqn.state_dim:
            errors.append(
                f"replay.state_dim ({config.replay.state_dim}) must equal "
                f"dqn.state_dim ({config.dqn.state_dim})"
            )

        # Cross-config: training threshold must fit within buffer capacity
        if config.train_after_n_pages >= config.replay.capacity:
            errors.append(
                f"train_after_n_pages ({config.train_after_n_pages}) must be < "
                f"replay.capacity ({config.replay.capacity})"
            )

        # Pipeline-level
        if config.memory_budget_mb <= 0:
            errors.append(
                f"memory_budget_mb must be > 0, got {config.memory_budget_mb}"
            )

        # Delegate to sub-config validators
        errors.extend(ConfigValidator.validate_dqn_config(config.dqn))
        errors.extend(ConfigValidator.validate_crawler_config(config.crawler))
        errors.extend(ConfigValidator.validate_replay_config(config.replay))
        errors.extend(ConfigValidator.validate_embedding_config(config.embedding))

        return errors


# ============================================================================
# 2. ConfigLoader
# ============================================================================

# Mapping from TOML section/key to CrawlerPipelineConfig sub-config fields.
# Used for environment variable and CLI argument resolution.
_ENV_MAP: Dict[str, Tuple[str, str, type]] = {
    # DQN
    "DQN_STATE_DIM": ("dqn", "state_dim", int),
    "DQN_ACTION_DIM": ("dqn", "action_dim", int),
    "DQN_HIDDEN_1": ("dqn", "hidden_1", int),
    "DQN_HIDDEN_2": ("dqn", "hidden_2", int),
    "DQN_LR": ("dqn", "lr", float),
    "DQN_GRAD_CLIP_MAX_NORM": ("dqn", "grad_clip_max_norm", float),
    "DQN_GAMMA": ("dqn", "gamma", float),
    "DQN_BATCH_SIZE": ("dqn", "batch_size", int),
    "DQN_REPLAY_CAPACITY": ("dqn", "replay_capacity", int),
    "DQN_EPSILON_START": ("dqn", "epsilon_start", float),
    "DQN_EPSILON_END": ("dqn", "epsilon_end", float),
    "DQN_EPSILON_DECAY_STEPS": ("dqn", "epsilon_decay_steps", int),
    "DQN_TARGET_UPDATE_FREQ": ("dqn", "target_update_freq", int),
    "DQN_N_STEP": ("dqn", "n_step", int),
    # Crawler
    "CRAWLER_CONCURRENCY": ("crawler", "max_concurrent", int),
    "CRAWLER_PAGE_TIMEOUT_MS": ("crawler", "page_timeout_ms", int),
    "CRAWLER_CRAWL_DELAY": ("crawler", "default_crawl_delay", float),
    "CRAWLER_BLOOM_CAPACITY": ("crawler", "bloom_capacity", int),
    "CRAWLER_BLOOM_ERROR_RATE": ("crawler", "bloom_error_rate", float),
    "CRAWLER_MAX_LINKS_PER_PAGE": ("crawler", "max_links_per_page", int),
    "CRAWLER_HEADLESS": ("crawler", "headless", bool),
    # Replay buffer
    "REPLAY_CAPACITY": ("replay", "capacity", int),
    "REPLAY_STATE_DIM": ("replay", "state_dim", int),
    "REPLAY_ALPHA": ("replay", "alpha", float),
    "REPLAY_BETA_START": ("replay", "beta_start", float),
    "REPLAY_BETA_END": ("replay", "beta_end", float),
    "REPLAY_BETA_ANNEAL_STEPS": ("replay", "beta_anneal_steps", int),
    "REPLAY_N_STEP": ("replay", "n_step", int),
    # Embedding
    "EMBEDDING_MODEL_NAME": ("embedding", "model_name", str),
    "EMBEDDING_DIM": ("embedding", "embedding_dim", int),
    "EMBEDDING_BATCH_SIZE": ("embedding", "batch_size", int),
    "EMBEDDING_MAX_SEQ_LENGTH": ("embedding", "max_seq_length", int),
    # Pipeline
    "PIPELINE_MAX_PAGES": ("_pipeline", "max_pages", int),
    "PIPELINE_TRAIN_AFTER_N": ("_pipeline", "train_after_n_pages", int),
    "PIPELINE_TRAIN_EVERY_N": ("_pipeline", "train_every_n_steps", int),
    "PIPELINE_MEMORY_BUDGET_MB": ("_pipeline", "memory_budget_mb", int),
    "PIPELINE_USE_ONNX": ("_pipeline", "use_onnx_inference", bool),
    "PIPELINE_DATA_DIR": ("_pipeline", "data_dir", str),
}


def _coerce_env_value(raw: str, target_type: type) -> Any:
    """Best-effort coercion of an env-var string to the expected field type."""
    if target_type is bool:
        return raw.lower() in ("1", "true", "yes", "on")
    if target_type is int:
        return int(raw)
    if target_type is float:
        return float(raw)
    return raw


def _read_toml(path: Path) -> Dict[str, Any]:
    """Read and parse a TOML file, returning a plain dict."""
    text = path.read_text(encoding="utf-8")
    return tomllib.loads(text)


def _apply_toml_overrides(
    config: CrawlerPipelineConfig,
    data: Dict[str, Any],
) -> None:
    """Apply TOML data onto the config object, mapping known sections."""
    crawler_section = data.get("crawler", {})

    # DQN fields from the [crawler] section in scrapus_default.toml
    toml_dqn_map = {
        "dqn_lr": "lr",
        "dqn_gamma": "gamma",
        "dqn_batch_size": "batch_size",
        "replay_buffer_size": "replay_capacity",
        "epsilon_start": "epsilon_start",
        "epsilon_end": "epsilon_end",
        "target_update_freq": "target_update_freq",
    }
    for toml_key, dqn_field in toml_dqn_map.items():
        if toml_key in crawler_section:
            setattr(config.dqn, dqn_field, crawler_section[toml_key])

    # Crawler fields
    if "concurrency" in crawler_section:
        config.crawler.max_concurrent = crawler_section["concurrency"]
    if "rate_limit_per_domain" in crawler_section:
        config.crawler.default_crawl_delay = crawler_section["rate_limit_per_domain"]
    if "max_pages" in crawler_section:
        config.max_pages = crawler_section["max_pages"]
    if "playwright_headless" in crawler_section:
        config.crawler.headless = crawler_section["playwright_headless"]

    # Memory section
    memory_section = data.get("memory", {})
    stage_budgets = memory_section.get("per_stage_budgets", {})
    if "module_1_crawl" in stage_budgets:
        config.memory_budget_mb = stage_budgets["module_1_crawl"]

    # General section
    general_section = data.get("general", {})
    if "data_dir" in general_section:
        config.data_dir = general_section["data_dir"]

    # M1 section
    m1_section = data.get("m1", {})
    if "use_mps" in m1_section:
        config.dqn.use_mps = m1_section["use_mps"]


def _apply_env_overrides(
    config: CrawlerPipelineConfig,
    env_prefix: str,
) -> None:
    """Scan environment variables and apply overrides to the config."""
    prefix_upper = env_prefix.upper() + "_"

    for env_suffix, (section, field_name, field_type) in _ENV_MAP.items():
        env_key = prefix_upper + env_suffix
        env_val = os.environ.get(env_key)
        if env_val is None:
            continue

        try:
            coerced = _coerce_env_value(env_val, field_type)
        except (ValueError, TypeError):
            logger.warning(
                "Could not coerce env var %s=%r to %s; skipping",
                env_key, env_val, field_type.__name__,
            )
            continue

        if section == "_pipeline":
            setattr(config, field_name, coerced)
        else:
            sub_config = getattr(config, section)
            setattr(sub_config, field_name, coerced)

        logger.debug("Env override: %s = %r", env_key, coerced)


def _apply_cli_overrides(
    config: CrawlerPipelineConfig,
    cli_args: Optional[argparse.Namespace],
) -> None:
    """Apply CLI argument overrides onto the config.

    Expected CLI args (all optional):
    --max-pages, --concurrency, --lr, --gamma, --batch-size,
    --replay-capacity, --memory-budget-mb, --use-onnx, --data-dir
    """
    if cli_args is None:
        return

    cli_map = [
        ("max_pages", "_pipeline", "max_pages"),
        ("concurrency", "crawler", "max_concurrent"),
        ("lr", "dqn", "lr"),
        ("gamma", "dqn", "gamma"),
        ("batch_size", "dqn", "batch_size"),
        ("replay_capacity", "replay", "capacity"),
        ("memory_budget_mb", "_pipeline", "memory_budget_mb"),
        ("use_onnx", "_pipeline", "use_onnx_inference"),
        ("data_dir", "_pipeline", "data_dir"),
    ]

    for cli_attr, section, field_name in cli_map:
        value = getattr(cli_args, cli_attr, None)
        if value is None:
            continue

        if section == "_pipeline":
            setattr(config, field_name, value)
        else:
            sub_config = getattr(config, section)
            setattr(sub_config, field_name, value)

        logger.debug("CLI override: %s = %r", cli_attr, value)


class ConfigLoader:
    """Load CrawlerPipelineConfig from multiple sources with priority merging.

    Resolution order (last wins):
        1. Dataclass defaults
        2. TOML file (scrapus_default.toml or custom path)
        3. Environment variables (SCRAPUS_DQN_LR, SCRAPUS_CRAWLER_CONCURRENCY, etc.)
        4. CLI arguments
    """

    @staticmethod
    def load_config(
        toml_path: Optional[Union[str, Path]] = None,
        env_prefix: str = "SCRAPUS",
        cli_args: Optional[argparse.Namespace] = None,
    ) -> CrawlerPipelineConfig:
        """Load, merge, and validate a CrawlerPipelineConfig.

        Parameters
        ----------
        toml_path
            Path to a TOML config file. When None, uses the bundled default.
        env_prefix
            Prefix for environment variable overrides.
        cli_args
            Parsed CLI arguments (from argparse).

        Returns
        -------
        CrawlerPipelineConfig
            Fully resolved configuration.

        Raises
        ------
        ValueError
            If validation finds errors.
        """
        # 1. Dataclass defaults (via __post_init__)
        config = CrawlerPipelineConfig()

        # 2. TOML file
        resolved_path: Optional[Path] = None
        if toml_path is not None:
            resolved_path = Path(toml_path)
            if not resolved_path.exists():
                raise FileNotFoundError(f"Config file not found: {resolved_path}")
        else:
            # Auto-discover: bundled default
            if _DEFAULT_TOML.exists():
                resolved_path = _DEFAULT_TOML

        if resolved_path is not None:
            logger.info("Loading TOML config from %s", resolved_path)
            toml_data = _read_toml(resolved_path)
            _apply_toml_overrides(config, toml_data)

        # 3. Environment variables
        _apply_env_overrides(config, env_prefix)

        # 4. CLI arguments
        _apply_cli_overrides(config, cli_args)

        # Validate
        errors = ConfigValidator.validate_pipeline_config(config)
        if errors:
            error_msg = "Config validation failed:\n  " + "\n  ".join(errors)
            logger.error(error_msg)
            raise ValueError(error_msg)

        logger.info("Config loaded and validated successfully")
        return config

    @staticmethod
    def build_cli_parser(
        parser: Optional[argparse.ArgumentParser] = None,
    ) -> argparse.ArgumentParser:
        """Add crawler pipeline CLI arguments to an argparse parser.

        Returns the parser (creates one if not provided).
        """
        if parser is None:
            parser = argparse.ArgumentParser(
                description="Scrapus Module 1: RL Crawler Pipeline"
            )

        parser.add_argument(
            "--max-pages", type=int, default=None, dest="max_pages",
            help="Maximum pages to crawl",
        )
        parser.add_argument(
            "--concurrency", type=int, default=None,
            help="Concurrent crawler workers (1-32)",
        )
        parser.add_argument(
            "--lr", type=float, default=None,
            help="DQN learning rate",
        )
        parser.add_argument(
            "--gamma", type=float, default=None,
            help="DQN discount factor",
        )
        parser.add_argument(
            "--batch-size", type=int, default=None, dest="batch_size",
            help="DQN training batch size",
        )
        parser.add_argument(
            "--replay-capacity", type=int, default=None, dest="replay_capacity",
            help="Replay buffer capacity",
        )
        parser.add_argument(
            "--memory-budget-mb", type=int, default=None, dest="memory_budget_mb",
            help="Pipeline memory budget in MB",
        )
        parser.add_argument(
            "--use-onnx", action="store_true", default=None, dest="use_onnx",
            help="Use ONNX inference instead of PyTorch",
        )
        parser.add_argument(
            "--data-dir", type=str, default=None, dest="data_dir",
            help="Data directory for models and storage",
        )

        return parser


# ============================================================================
# 3. M1MemoryBudgetValidator
# ============================================================================

class M1MemoryBudgetValidator:
    """Estimate per-component memory usage and validate against M1 16GB budget.

    Component estimates (empirically measured on Apple M1):
    - DQN network: ~5 MB (3-layer MLP, online + target + optimizer)
    - Replay buffer: capacity * state_dim * 4 bytes * 2 (states + next_states)
      plus SumTree (capacity * 16 bytes) + SQLite overhead
    - Bloom filter: capacity * ~1.44 bytes (at 0.1% FP rate)
    - Embedder: ~300 MB (nomic-embed-text-v1.5 via MLX)
    - Browsers: ~500 MB each (Playwright Chromium)
    """

    # Empirical constants for M1 measurements
    DQN_BASE_MB = 5.0
    EMBEDDER_BASE_MB = 300.0
    BROWSER_BASE_MB = 500.0
    SQLITE_OVERHEAD_MB = 5.0
    PYTHON_OVERHEAD_MB = 50.0

    # M1 16GB thresholds
    WARNING_THRESHOLD_MB = 12_000
    ERROR_THRESHOLD_MB = 14_000

    @staticmethod
    def estimate_memory_mb(config: CrawlerPipelineConfig) -> Dict[str, float]:
        """Estimate per-component memory usage in MB.

        Returns a dict with component names as keys and MB estimates as values.
        """
        estimates: Dict[str, float] = {}

        # DQN: online + target networks + optimizer state
        # ~5 MB base; scales slightly with hidden layer sizes
        param_count = (
            config.dqn.state_dim * config.dqn.hidden_1
            + config.dqn.hidden_1 * config.dqn.hidden_2
            + config.dqn.hidden_2 * config.dqn.action_dim
        )
        # 2 networks * 4 bytes * params + optimizer momentum (2x)
        dqn_mb = (param_count * 4 * 4) / (1024 * 1024)
        estimates["dqn"] = max(dqn_mb, M1MemoryBudgetValidator.DQN_BASE_MB)

        # Replay buffer: mmap files are disk-backed but SumTree is in-memory
        # SumTree: 2 * capacity * 8 bytes
        sum_tree_mb = (2 * config.replay.capacity * 8) / (1024 * 1024)
        # SQLite page cache + metadata
        sqlite_mb = M1MemoryBudgetValidator.SQLITE_OVERHEAD_MB
        # mmap: OS pages in, ~3-8 MB active (not full mmap size)
        mmap_active_mb = 8.0
        estimates["replay_buffer"] = sum_tree_mb + sqlite_mb + mmap_active_mb

        # Bloom filter: ~1.44 bytes per item at 0.1% FP
        # Optimal bits: -n * ln(p) / (ln(2)^2)
        if config.crawler.bloom_error_rate > 0:
            optimal_bits = (
                -config.crawler.bloom_capacity
                * math.log(config.crawler.bloom_error_rate)
                / (math.log(2) ** 2)
            )
        else:
            optimal_bits = config.crawler.bloom_capacity * 10
        bloom_mb = optimal_bits / (8 * 1024 * 1024)
        estimates["bloom_filter"] = bloom_mb

        # Embedder: nomic-embed-text-v1.5 via MLX (~300 MB)
        estimates["embedder"] = M1MemoryBudgetValidator.EMBEDDER_BASE_MB

        # Browsers: Playwright Chromium instances
        # Typically 1 browser shared across workers via pages/contexts
        browser_count = 1
        estimates["browsers"] = browser_count * M1MemoryBudgetValidator.BROWSER_BASE_MB

        # Python runtime + asyncio + logging + misc
        estimates["python_overhead"] = M1MemoryBudgetValidator.PYTHON_OVERHEAD_MB

        return estimates

    @staticmethod
    def validate_fits_budget(
        config: CrawlerPipelineConfig,
        budget_mb: float = 16_000,
    ) -> Tuple[bool, str]:
        """Check whether the estimated memory fits within the budget.

        Parameters
        ----------
        config
            Pipeline configuration to estimate.
        budget_mb
            Total memory budget in MB. Defaults to 16 GB (M1 total).

        Returns
        -------
        (fits, message)
            ``fits`` is True if total estimate is below error threshold.
            ``message`` contains a human-readable summary with warnings.
        """
        estimates = M1MemoryBudgetValidator.estimate_memory_mb(config)
        total_mb = sum(estimates.values())

        lines: List[str] = ["Memory estimate breakdown:"]
        for component, mb in sorted(estimates.items(), key=lambda x: -x[1]):
            lines.append(f"  {component:20s} {mb:8.1f} MB")
        lines.append(f"  {'TOTAL':20s} {total_mb:8.1f} MB")
        lines.append(f"  {'budget':20s} {budget_mb:8.1f} MB")

        fits = True

        if total_mb > M1MemoryBudgetValidator.ERROR_THRESHOLD_MB:
            lines.append(
                f"\nERROR: Estimated {total_mb:.0f} MB exceeds error threshold "
                f"({M1MemoryBudgetValidator.ERROR_THRESHOLD_MB} MB). "
                "OOM or severe swap thrashing is likely."
            )
            fits = False
        elif total_mb > M1MemoryBudgetValidator.WARNING_THRESHOLD_MB:
            lines.append(
                f"\nWARNING: Estimated {total_mb:.0f} MB exceeds warning threshold "
                f"({M1MemoryBudgetValidator.WARNING_THRESHOLD_MB} MB). "
                "Monitor swap usage during pipeline runs."
            )

        if total_mb > budget_mb:
            lines.append(
                f"\nERROR: Estimated {total_mb:.0f} MB exceeds budget "
                f"({budget_mb:.0f} MB)."
            )
            fits = False

        return fits, "\n".join(lines)


# ============================================================================
# 4. ConfigDiff
# ============================================================================

class ConfigDiff:
    """Compare two CrawlerPipelineConfig instances and show differences.

    Useful for logging what changed between runs or after applying overrides.
    """

    @staticmethod
    def diff(
        config_a: CrawlerPipelineConfig,
        config_b: CrawlerPipelineConfig,
        label_a: str = "before",
        label_b: str = "after",
    ) -> List[str]:
        """Compare two configs and return human-readable diff lines.

        Parameters
        ----------
        config_a
            First (reference) config.
        config_b
            Second (modified) config.
        label_a
            Label for config_a in output.
        label_b
            Label for config_b in output.

        Returns
        -------
        List of diff strings. Empty if configs are identical.
        """
        diffs: List[str] = []
        dict_a = _flatten_config(config_a)
        dict_b = _flatten_config(config_b)

        all_keys = sorted(set(dict_a.keys()) | set(dict_b.keys()))
        for key in all_keys:
            val_a = dict_a.get(key)
            val_b = dict_b.get(key)
            if val_a != val_b:
                diffs.append(
                    f"  {key}: {val_a!r} ({label_a}) -> {val_b!r} ({label_b})"
                )

        return diffs


def _flatten_config(config: CrawlerPipelineConfig) -> Dict[str, Any]:
    """Flatten a CrawlerPipelineConfig into dot-separated key-value pairs."""
    flat: Dict[str, Any] = {}

    # Sub-configs
    sub_configs = {
        "dqn": config.dqn,
        "embedding": config.embedding,
        "crawler": config.crawler,
        "replay": config.replay,
    }
    for section, sub in sub_configs.items():
        for f in fields(sub):
            flat[f"{section}.{f.name}"] = getattr(sub, f.name)

    # Pipeline-level fields
    pipeline_fields = [
        "max_pages", "train_after_n_pages", "train_every_n_steps",
        "policy_save_interval", "onnx_export_interval", "log_interval",
        "prune_interval", "memory_budget_mb", "use_onnx_inference",
        "onnx_path", "data_dir",
    ]
    for fname in pipeline_fields:
        flat[f"pipeline.{fname}"] = getattr(config, fname)

    return flat


# ============================================================================
# 5. print_config
# ============================================================================

def print_config(
    config: CrawlerPipelineConfig,
    file: Any = None,
) -> None:
    """Pretty-print all config values grouped by component.

    Highlights non-default values with a marker and includes
    estimated memory budget at the bottom.

    Parameters
    ----------
    config
        The pipeline configuration to display.
    file
        Output stream (defaults to sys.stdout).
    """
    if file is None:
        file = sys.stdout

    defaults = CrawlerPipelineConfig()
    current = _flatten_config(config)
    default_flat = _flatten_config(defaults)

    sections = {
        "DQN Agent": "dqn.",
        "Crawler Engine": "crawler.",
        "Replay Buffer": "replay.",
        "Embeddings": "embedding.",
        "Pipeline": "pipeline.",
    }

    print("=" * 72, file=file)
    print("  Scrapus Module 1 -- Crawler Pipeline Configuration", file=file)
    print("=" * 72, file=file)

    for section_name, prefix in sections.items():
        print(f"\n  [{section_name}]", file=file)
        print(f"  {'-' * 60}", file=file)

        section_keys = sorted(k for k in current if k.startswith(prefix))
        for key in section_keys:
            val = current[key]
            default_val = default_flat.get(key)
            short_key = key[len(prefix):]

            marker = " *" if val != default_val else "  "
            print(f"  {marker} {short_key:30s} = {val!r}", file=file)

    # Memory estimate
    print(f"\n  [Memory Estimate]", file=file)
    print(f"  {'-' * 60}", file=file)
    estimates = M1MemoryBudgetValidator.estimate_memory_mb(config)
    total_mb = sum(estimates.values())
    for component, mb in sorted(estimates.items(), key=lambda x: -x[1]):
        print(f"     {component:24s} {mb:8.1f} MB", file=file)
    print(f"     {'TOTAL':24s} {total_mb:8.1f} MB", file=file)
    print(f"     {'budget':24s} {config.memory_budget_mb:8.1f} MB", file=file)

    if total_mb > M1MemoryBudgetValidator.WARNING_THRESHOLD_MB:
        print(
            f"\n  WARNING: Estimated memory ({total_mb:.0f} MB) exceeds "
            f"warning threshold ({M1MemoryBudgetValidator.WARNING_THRESHOLD_MB} MB)",
            file=file,
        )

    print("\n" + "=" * 72, file=file)
    print("  * = non-default value", file=file)
    print("=" * 72, file=file)


# ============================================================================
# CLI entry point
# ============================================================================

if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="[%(asctime)s] %(name)s %(levelname)s: %(message)s",
    )

    parser = ConfigLoader.build_cli_parser()
    parser.add_argument(
        "--config", "-c", type=str, default=None,
        help="Path to TOML config file",
    )
    parser.add_argument(
        "--validate-only", action="store_true",
        help="Validate config and exit",
    )
    parser.add_argument(
        "--estimate-memory", action="store_true",
        help="Show memory estimate and exit",
    )
    args = parser.parse_args()

    try:
        config = ConfigLoader.load_config(
            toml_path=args.config,
            cli_args=args,
        )
    except (ValueError, FileNotFoundError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)

    if args.validate_only:
        print("Config is valid.")
        sys.exit(0)

    if args.estimate_memory:
        fits, message = M1MemoryBudgetValidator.validate_fits_budget(config)
        print(message)
        sys.exit(0 if fits else 1)

    print_config(config)
