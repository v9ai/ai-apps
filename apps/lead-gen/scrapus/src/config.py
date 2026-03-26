"""
scrapus/src/config.py
TOML-based configuration system for the Scrapus pipeline.

Loads configuration from a TOML file (default: scrapus.toml in project root),
with environment variable overrides (SCRAPUS_<SECTION>_<KEY>).

Provides a typed dataclass hierarchy that every pipeline module imports.

Usage:
    from config import ScrapusConfig, load_config

    cfg = load_config()                      # scrapus.toml or defaults
    cfg = load_config("custom.toml")         # explicit path
    cfg = load_config(env_prefix="SCRAPUS")  # with env overrides

    print(cfg.crawler.max_pages)
    print(cfg.memory.budget_gb)
"""

from __future__ import annotations

import copy
import logging
import os
import sys
import warnings
from dataclasses import dataclass, field, asdict
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

logger = logging.getLogger("scrapus.config")

# Path to the bundled default config shipped alongside this module.
_DEFAULT_TOML = Path(__file__).parent / "scrapus_default.toml"

# Maximum system memory the pipeline is allowed to consider (bytes).
_M1_TOTAL_MEMORY_GB = 16
_OS_RESERVED_GB = 3.5


# ============================================================================
# Dataclass hierarchy
# ============================================================================

@dataclass
class GeneralConfig:
    """Top-level pipeline settings."""
    data_dir: str = "./scrapus_data"
    log_level: str = "INFO"
    max_workers: int = 4


@dataclass
class CrawlerConfig:
    """Module 1 -- RL Crawler."""
    seed_urls: List[str] = field(default_factory=list)
    max_pages: int = 10_000
    max_depth: int = 5
    rate_limit_per_domain: float = 2.0
    concurrency: int = 8
    playwright_headless: bool = True

    # DQN hyperparameters
    dqn_lr: float = 3e-4
    dqn_gamma: float = 0.99
    dqn_batch_size: int = 64
    replay_buffer_size: int = 100_000
    epsilon_start: float = 1.0
    epsilon_end: float = 0.01
    target_update_freq: int = 1000


@dataclass
class NERConfig:
    """Module 2 -- NER Extraction."""
    model_backend: str = "hybrid"  # "gliner2" | "hybrid"
    batch_size: int = 32
    confidence_threshold: float = 0.55
    entity_types: List[str] = field(default_factory=lambda: [
        "ORG", "PERSON", "LOCATION", "PRODUCT", "TECHNOLOGY",
        "FUNDING_AMOUNT", "INDUSTRY", "COMPETITOR",
        "EMAIL", "PHONE", "URL",
    ])
    hybrid_weight_rule: float = 1.0
    hybrid_weight_distilbert: float = 0.85
    hybrid_weight_gliner: float = 0.70


@dataclass
class EntityResolutionConfig:
    """Module 3 -- Entity Resolution."""
    blocking_method: str = "sbert_dbscan"  # "sbert_dbscan" | "rule_based"
    similarity_threshold: float = 0.05
    dbscan_eps: float = 0.15
    min_cluster_size: int = 2
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dim: int = 384
    use_gnn_consistency: bool = True


@dataclass
class ScoringConfig:
    """Module 4 -- Lead Scoring."""
    model_type: str = "lightgbm"  # "lightgbm" | "xgboost"
    conformal_coverage: float = 0.95
    calibration_method: str = "isotonic"  # "isotonic" | "sigmoid"
    retrain_trigger: str = "drift"  # "drift" | "monthly" | "manual"
    qualification_threshold: float = 0.85
    onnx_ensemble: bool = True


@dataclass
class ReportConfig:
    """Module 5 -- Report Generation."""
    llm_model: str = "llama-3.1-8b-instruct"
    llm_backend: str = "ollama"  # "ollama" | "mlx"
    max_tokens: int = 2048
    temperature: float = 0.1
    reranker_enabled: bool = True
    reranker_model: str = "BAAI/bge-reranker-v2-m3"
    self_rag_enabled: bool = True
    outlines_enabled: bool = True
    mmr_lambda: float = 0.7
    retrieval_top_k: int = 50
    retrieval_final_k: int = 10
    fallback_llm_model: str = "qwen2.5-3b"
    fallback_llm_backend: str = "mlx"


@dataclass
class MonitoringConfig:
    """Module 6 -- Evaluation & Monitoring."""
    drift_window_sizes: List[int] = field(default_factory=lambda: [100, 500, 2000])
    judge_models: List[str] = field(default_factory=lambda: [
        "llama-3.1-8b-instruct", "mistral-7b",
    ])
    dashboard_port: int = 8501
    audit_enabled: bool = True
    drift_ks_threshold: float = 0.1
    drift_js_threshold: float = 0.05
    drift_cosine_threshold: float = 0.15


@dataclass
class MemoryConfig:
    """Memory management -- M1 16GB unified memory."""
    budget_gb: float = 12.5
    swap_threshold_mb: int = 500
    emergency_cleanup_threshold_mb: int = 1500
    batch_size_multiplier: float = 1.0
    per_stage_budgets: Dict[str, int] = field(default_factory=lambda: {
        "module_1_crawl": 750,
        "module_2_ner": 1700,
        "module_3_er": 730,
        "module_4_score": 850,
        "module_5_report": 6700,
        "module_6_eval": 800,
    })


@dataclass
class M1Config:
    """Apple M1 hardware acceleration settings."""
    use_mps: bool = True
    use_coreml: bool = True
    use_mlx: bool = True
    metal_cache_clear: bool = True
    mmap_size: int = 268_435_456  # 256 MB
    coreml_compute_units: str = "ALL"  # "ALL" | "CPU_AND_NE" | "CPU_ONLY"


@dataclass
class ScrapusConfig:
    """Root configuration object — the single source of truth for the pipeline."""
    general: GeneralConfig = field(default_factory=GeneralConfig)
    crawler: CrawlerConfig = field(default_factory=CrawlerConfig)
    ner: NERConfig = field(default_factory=NERConfig)
    entity_resolution: EntityResolutionConfig = field(default_factory=EntityResolutionConfig)
    scoring: ScoringConfig = field(default_factory=ScoringConfig)
    report: ReportConfig = field(default_factory=ReportConfig)
    monitoring: MonitoringConfig = field(default_factory=MonitoringConfig)
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    m1: M1Config = field(default_factory=M1Config)

    # ---- convenience helpers -------------------------------------------------

    @property
    def data_dir(self) -> Path:
        return Path(self.general.data_dir)

    @property
    def sqlite_path(self) -> Path:
        return self.data_dir / "scrapus.db"

    @property
    def lancedb_path(self) -> Path:
        return self.data_dir / "lancedb"

    @property
    def models_dir(self) -> Path:
        return self.data_dir / "models"

    @property
    def logs_dir(self) -> Path:
        return self.data_dir / "logs"

    def to_dict(self) -> Dict[str, Any]:
        """Serialize the entire config tree to a plain dict."""
        return asdict(self)


# ============================================================================
# TOML parsing helpers
# ============================================================================

def _read_toml(path: Path) -> Dict[str, Any]:
    """Read and parse a TOML file, returning a plain dict."""
    text = path.read_text(encoding="utf-8")
    return tomllib.loads(text)


def _deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively merge *override* into a copy of *base*."""
    result = copy.deepcopy(base)
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = copy.deepcopy(value)
    return result


def _coerce_value(raw: str, target_type: type) -> Any:
    """Best-effort coercion of an env-var string to the dataclass field type."""
    if target_type is bool:
        return raw.lower() in ("1", "true", "yes", "on")
    if target_type is int:
        return int(raw)
    if target_type is float:
        return float(raw)
    if target_type is str:
        return raw
    # List[str] / List[int] — comma-separated
    origin = getattr(target_type, "__origin__", None)
    if origin is list:
        args = getattr(target_type, "__args__", (str,))
        inner = args[0] if args else str
        items = [s.strip() for s in raw.split(",") if s.strip()]
        return [_coerce_value(item, inner) for item in items]
    return raw


def _env_overrides(
    prefix: str,
    section_map: Dict[str, type],
) -> Dict[str, Dict[str, Any]]:
    """
    Scan ``os.environ`` for keys matching ``{PREFIX}_{SECTION}_{KEY}`` and
    return nested dicts suitable for merging.

    Example: SCRAPUS_CRAWLER_MAX_PAGES=5000 -> {"crawler": {"max_pages": 5000}}
    """
    overrides: Dict[str, Dict[str, Any]] = {}
    prefix_upper = prefix.upper() + "_"

    for env_key, env_val in os.environ.items():
        if not env_key.startswith(prefix_upper):
            continue
        remainder = env_key[len(prefix_upper):].lower()

        # Try to split into section + field.
        matched = False
        for section_name, dc_type in section_map.items():
            section_prefix = section_name + "_"
            if remainder.startswith(section_prefix):
                field_name = remainder[len(section_prefix):]
                # Validate field exists on the dataclass.
                dc_fields = {f.name: f for f in dc_type.__dataclass_fields__.values()}
                if field_name in dc_fields:
                    target_type = dc_fields[field_name].type
                    # Resolve string annotations to actual types.
                    if isinstance(target_type, str):
                        target_type = eval(target_type, {"List": List, "Dict": Dict})
                    try:
                        coerced = _coerce_value(env_val, target_type)
                    except (ValueError, TypeError):
                        logger.warning(
                            "Could not coerce env var %s=%r to %s; skipping",
                            env_key, env_val, target_type,
                        )
                        continue
                    overrides.setdefault(section_name, {})[field_name] = coerced
                    matched = True
                    break
        if not matched:
            logger.debug("Ignoring unrecognised env var %s", env_key)

    return overrides


def _populate_dataclass(dc_type: type, data: Dict[str, Any]) -> Any:
    """
    Create a dataclass instance from a dict, silently ignoring unknown keys
    and using defaults for missing keys.
    """
    known_fields = {f.name for f in dc_type.__dataclass_fields__.values()}
    filtered = {}
    for key, value in data.items():
        if key in known_fields:
            filtered[key] = value
        else:
            logger.debug(
                "Ignoring unknown config key '%s' for %s", key, dc_type.__name__,
            )
    return dc_type(**filtered)


# ============================================================================
# Validation
# ============================================================================

class ConfigValidationError(Exception):
    """Raised when the configuration fails validation."""


def _validate(cfg: ScrapusConfig) -> List[str]:
    """
    Validate the fully-assembled config. Returns a list of warning strings.
    Raises ``ConfigValidationError`` for hard failures.
    """
    warns: List[str] = []

    # -- log_level must be valid -----------------------------------------------
    valid_levels = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
    if cfg.general.log_level.upper() not in valid_levels:
        raise ConfigValidationError(
            f"general.log_level must be one of {valid_levels}, "
            f"got '{cfg.general.log_level}'"
        )

    # -- NER backend -----------------------------------------------------------
    if cfg.ner.model_backend not in ("gliner2", "hybrid"):
        raise ConfigValidationError(
            f"ner.model_backend must be 'gliner2' or 'hybrid', "
            f"got '{cfg.ner.model_backend}'"
        )

    # -- Entity resolution blocking method ------------------------------------
    if cfg.entity_resolution.blocking_method not in ("sbert_dbscan", "rule_based"):
        raise ConfigValidationError(
            f"entity_resolution.blocking_method must be 'sbert_dbscan' or "
            f"'rule_based', got '{cfg.entity_resolution.blocking_method}'"
        )

    # -- Scoring model type ---------------------------------------------------
    if cfg.scoring.model_type not in ("lightgbm", "xgboost"):
        raise ConfigValidationError(
            f"scoring.model_type must be 'lightgbm' or 'xgboost', "
            f"got '{cfg.scoring.model_type}'"
        )

    # -- LLM backend ----------------------------------------------------------
    if cfg.report.llm_backend not in ("ollama", "mlx"):
        raise ConfigValidationError(
            f"report.llm_backend must be 'ollama' or 'mlx', "
            f"got '{cfg.report.llm_backend}'"
        )

    # -- Calibration method ---------------------------------------------------
    if cfg.scoring.calibration_method not in ("isotonic", "sigmoid"):
        raise ConfigValidationError(
            f"scoring.calibration_method must be 'isotonic' or 'sigmoid', "
            f"got '{cfg.scoring.calibration_method}'"
        )

    # -- Conformal coverage range ---------------------------------------------
    if not 0.0 < cfg.scoring.conformal_coverage < 1.0:
        raise ConfigValidationError(
            f"scoring.conformal_coverage must be in (0, 1), "
            f"got {cfg.scoring.conformal_coverage}"
        )

    # -- max_workers > 0 ------------------------------------------------------
    if cfg.general.max_workers < 1:
        raise ConfigValidationError(
            f"general.max_workers must be >= 1, got {cfg.general.max_workers}"
        )

    # -- Memory: total budget vs system ----------------------------------------
    max_app_gb = _M1_TOTAL_MEMORY_GB - _OS_RESERVED_GB
    if cfg.memory.budget_gb > max_app_gb:
        warns.append(
            f"memory.budget_gb ({cfg.memory.budget_gb} GB) exceeds safe limit "
            f"({max_app_gb} GB) for a {_M1_TOTAL_MEMORY_GB} GB M1. "
            "Swap thrashing is likely."
        )

    # -- Memory: per-stage budgets vs total -----------------------------------
    total_stage_mb = sum(cfg.memory.per_stage_budgets.values())
    budget_mb = cfg.memory.budget_gb * 1024
    if total_stage_mb > budget_mb:
        warns.append(
            f"Sum of per_stage_budgets ({total_stage_mb} MB) exceeds "
            f"memory.budget_gb ({budget_mb:.0f} MB). "
            "Stages run sequentially so peak < sum, but budgets should be "
            "individually respected."
        )

    # -- Memory: 16 GB hard guard ---------------------------------------------
    if cfg.memory.budget_gb > _M1_TOTAL_MEMORY_GB:
        raise ConfigValidationError(
            f"memory.budget_gb ({cfg.memory.budget_gb} GB) exceeds physical "
            f"memory ({_M1_TOTAL_MEMORY_GB} GB). This will cause OOM."
        )

    # -- Crawler sanity -------------------------------------------------------
    if cfg.crawler.max_pages < 1:
        raise ConfigValidationError(
            f"crawler.max_pages must be >= 1, got {cfg.crawler.max_pages}"
        )
    if cfg.crawler.max_depth < 1:
        raise ConfigValidationError(
            f"crawler.max_depth must be >= 1, got {cfg.crawler.max_depth}"
        )
    if cfg.crawler.rate_limit_per_domain < 0:
        raise ConfigValidationError(
            "crawler.rate_limit_per_domain must be >= 0"
        )

    # -- Report tokens --------------------------------------------------------
    if cfg.report.max_tokens < 1:
        raise ConfigValidationError(
            f"report.max_tokens must be >= 1, got {cfg.report.max_tokens}"
        )

    # -- Dashboard port -------------------------------------------------------
    if not (1024 <= cfg.monitoring.dashboard_port <= 65535):
        raise ConfigValidationError(
            f"monitoring.dashboard_port must be in [1024, 65535], "
            f"got {cfg.monitoring.dashboard_port}"
        )

    # -- batch_size_multiplier ------------------------------------------------
    if cfg.memory.batch_size_multiplier <= 0:
        raise ConfigValidationError(
            "memory.batch_size_multiplier must be > 0"
        )

    # -- M1 coreml_compute_units valid ----------------------------------------
    if cfg.m1.coreml_compute_units not in ("ALL", "CPU_AND_NE", "CPU_ONLY"):
        raise ConfigValidationError(
            f"m1.coreml_compute_units must be ALL, CPU_AND_NE, or CPU_ONLY, "
            f"got '{cfg.m1.coreml_compute_units}'"
        )

    return warns


# ============================================================================
# Public API
# ============================================================================

# Section name -> dataclass type mapping (used for env-var resolution).
_SECTION_MAP: Dict[str, type] = {
    "general": GeneralConfig,
    "crawler": CrawlerConfig,
    "ner": NERConfig,
    "entity_resolution": EntityResolutionConfig,
    "scoring": ScoringConfig,
    "report": ReportConfig,
    "monitoring": MonitoringConfig,
    "memory": MemoryConfig,
    "m1": M1Config,
}


def load_config(
    path: Optional[Union[str, Path]] = None,
    *,
    env_prefix: str = "SCRAPUS",
    strict: bool = False,
) -> ScrapusConfig:
    """
    Load and validate Scrapus configuration.

    Resolution order (last wins):
        1. Built-in defaults (``scrapus_default.toml`` shipped with the package)
        2. User TOML file at *path* (if provided and exists)
        3. Environment variables matching ``{env_prefix}_{SECTION}_{KEY}``

    Parameters
    ----------
    path
        Path to a user TOML config file.  When ``None``, looks for
        ``scrapus.toml`` in the current working directory, then falls back
        to the bundled defaults.
    env_prefix
        Prefix for environment variable overrides.
    strict
        If ``True``, treat validation warnings as errors.

    Returns
    -------
    ScrapusConfig
        Fully resolved and validated configuration.
    """
    # 1. Built-in defaults.
    if _DEFAULT_TOML.exists():
        base_data = _read_toml(_DEFAULT_TOML)
    else:
        # Fallback: construct from dataclass defaults (should never happen in
        # a properly installed package).
        base_data = ScrapusConfig().to_dict()

    # 2. User TOML (explicit path or auto-discover).
    user_data: Dict[str, Any] = {}
    resolved_path: Optional[Path] = None

    if path is not None:
        resolved_path = Path(path)
        if not resolved_path.exists():
            raise FileNotFoundError(f"Config file not found: {resolved_path}")
    else:
        # Auto-discover: CWD, then project root (parent of src/).
        candidates = [
            Path.cwd() / "scrapus.toml",
            Path(__file__).parent.parent / "scrapus.toml",
        ]
        for candidate in candidates:
            if candidate.exists():
                resolved_path = candidate
                break

    if resolved_path is not None:
        logger.info("Loading user config from %s", resolved_path)
        user_data = _read_toml(resolved_path)

    # Merge user on top of defaults.
    merged = _deep_merge(base_data, user_data)

    # 3. Environment variable overrides.
    env_data = _env_overrides(env_prefix, _SECTION_MAP)
    if env_data:
        logger.info("Applying env-var overrides: %s", list(env_data.keys()))
        merged = _deep_merge(merged, env_data)

    # 4. Construct typed dataclass hierarchy.
    cfg = ScrapusConfig(
        general=_populate_dataclass(GeneralConfig, merged.get("general", {})),
        crawler=_populate_dataclass(CrawlerConfig, merged.get("crawler", {})),
        ner=_populate_dataclass(NERConfig, merged.get("ner", {})),
        entity_resolution=_populate_dataclass(
            EntityResolutionConfig, merged.get("entity_resolution", {}),
        ),
        scoring=_populate_dataclass(ScoringConfig, merged.get("scoring", {})),
        report=_populate_dataclass(ReportConfig, merged.get("report", {})),
        monitoring=_populate_dataclass(MonitoringConfig, merged.get("monitoring", {})),
        memory=_populate_dataclass(MemoryConfig, merged.get("memory", {})),
        m1=_populate_dataclass(M1Config, merged.get("m1", {})),
    )

    # 5. Validate.
    warnings_list = _validate(cfg)
    for w in warnings_list:
        if strict:
            raise ConfigValidationError(w)
        logger.warning("Config warning: %s", w)
        warnings.warn(w, UserWarning, stacklevel=2)

    return cfg


def generate_default_config(output_path: Optional[Union[str, Path]] = None) -> str:
    """
    Return the default TOML config as a string. Optionally write to *output_path*.
    """
    if not _DEFAULT_TOML.exists():
        raise FileNotFoundError(
            f"Default config template not found at {_DEFAULT_TOML}"
        )
    content = _DEFAULT_TOML.read_text(encoding="utf-8")
    if output_path is not None:
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(content, encoding="utf-8")
        logger.info("Wrote default config to %s", out)
    return content


def config_summary(cfg: ScrapusConfig) -> str:
    """One-line-per-section summary suitable for logging at startup."""
    lines = [
        "Scrapus configuration summary:",
        f"  general     : data_dir={cfg.general.data_dir}  log_level={cfg.general.log_level}  workers={cfg.general.max_workers}",
        f"  crawler     : max_pages={cfg.crawler.max_pages}  depth={cfg.crawler.max_depth}  concurrency={cfg.crawler.concurrency}  seeds={len(cfg.crawler.seed_urls)}",
        f"  ner         : backend={cfg.ner.model_backend}  batch={cfg.ner.batch_size}  threshold={cfg.ner.confidence_threshold}  types={len(cfg.ner.entity_types)}",
        f"  entity_res  : blocking={cfg.entity_resolution.blocking_method}  eps={cfg.entity_resolution.dbscan_eps}  sim_thresh={cfg.entity_resolution.similarity_threshold}",
        f"  scoring     : model={cfg.scoring.model_type}  conformal={cfg.scoring.conformal_coverage}  cal={cfg.scoring.calibration_method}  qual_thresh={cfg.scoring.qualification_threshold}",
        f"  report      : llm={cfg.report.llm_model}  backend={cfg.report.llm_backend}  tokens={cfg.report.max_tokens}  reranker={cfg.report.reranker_enabled}  self_rag={cfg.report.self_rag_enabled}",
        f"  monitoring  : windows={cfg.monitoring.drift_window_sizes}  judges={len(cfg.monitoring.judge_models)}  port={cfg.monitoring.dashboard_port}  audit={cfg.monitoring.audit_enabled}",
        f"  memory      : budget={cfg.memory.budget_gb}GB  swap_warn={cfg.memory.swap_threshold_mb}MB  batch_mult={cfg.memory.batch_size_multiplier}",
        f"  m1          : mps={cfg.m1.use_mps}  coreml={cfg.m1.use_coreml}  mlx={cfg.m1.use_mlx}  mmap={cfg.m1.mmap_size // (1024*1024)}MB",
    ]
    return "\n".join(lines)


def setup_logging(cfg: ScrapusConfig) -> None:
    """Configure the root logger based on config."""
    level = getattr(logging, cfg.general.log_level.upper(), logging.INFO)
    log_dir = cfg.logs_dir
    log_dir.mkdir(parents=True, exist_ok=True)

    # Console handler.
    console = logging.StreamHandler(sys.stderr)
    console.setLevel(level)
    console_fmt = logging.Formatter(
        "%(asctime)s [%(levelname)-7s] %(name)s: %(message)s",
        datefmt="%H:%M:%S",
    )
    console.setFormatter(console_fmt)

    # File handler — rotating is better but we avoid extra deps.
    file_handler = logging.FileHandler(log_dir / "scrapus.log", encoding="utf-8")
    file_handler.setLevel(logging.DEBUG)  # Always capture DEBUG to file.
    file_fmt = logging.Formatter(
        "%(asctime)s [%(levelname)-7s] %(name)s (%(filename)s:%(lineno)d): %(message)s",
    )
    file_handler.setFormatter(file_fmt)

    root = logging.getLogger()
    # Avoid duplicate handlers on repeated calls.
    if not root.handlers:
        root.setLevel(logging.DEBUG)
        root.addHandler(console)
        root.addHandler(file_handler)
    else:
        # Update level on existing console handler.
        for h in root.handlers:
            if isinstance(h, logging.StreamHandler) and not isinstance(h, logging.FileHandler):
                h.setLevel(level)


# ============================================================================
# CLI entry-point for quick inspection
# ============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Scrapus config inspector")
    parser.add_argument("--config", "-c", help="Path to scrapus.toml")
    parser.add_argument(
        "--generate", "-g", metavar="PATH",
        help="Write default config to PATH",
    )
    parser.add_argument(
        "--validate", action="store_true",
        help="Validate config and exit",
    )
    args = parser.parse_args()

    if args.generate:
        content = generate_default_config(args.generate)
        print(f"Default config written to {args.generate}")
        sys.exit(0)

    cfg = load_config(args.config)
    print(config_summary(cfg))

    if args.validate:
        try:
            _validate(cfg)
            print("\nConfig is valid.")
        except ConfigValidationError as exc:
            print(f"\nValidation error: {exc}", file=sys.stderr)
            sys.exit(1)
