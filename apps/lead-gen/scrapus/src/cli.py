#!/usr/bin/env python3
"""
scrapus/src/cli.py
Command-line interface for the Scrapus lead-intelligence pipeline.

No external CLI dependencies — uses only ``argparse`` from the stdlib.

Usage:
    python -m cli run --config scrapus.toml --stages crawl,extract
    python -m cli crawl --seed-urls https://example.com --max-pages 500
    python -m cli init
    python -m cli status
    python -m cli dashboard
    python -m cli benchmark
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import shutil
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence

# Resolve the package root so sibling imports work when run as ``python -m cli``.
_SRC_DIR = Path(__file__).resolve().parent
if str(_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(_SRC_DIR))

from config import (
    ScrapusConfig,
    ConfigValidationError,
    config_summary,
    generate_default_config,
    load_config,
    setup_logging,
)

logger = logging.getLogger("scrapus.cli")

# Stage name -> module number mapping for ordered execution.
STAGE_ORDER: Dict[str, int] = {
    "crawl": 1,
    "extract": 2,
    "resolve": 3,
    "score": 4,
    "report": 5,
    "evaluate": 6,
}

ALL_STAGES = list(STAGE_ORDER.keys())

# Version — bump on release.
__version__ = "0.1.0"


# ============================================================================
# Shared helpers
# ============================================================================

def _resolve_config(args: argparse.Namespace) -> ScrapusConfig:
    """Load config from the --config flag or auto-discover, then apply
    any CLI overrides."""
    try:
        cfg = load_config(getattr(args, "config", None))
    except FileNotFoundError as exc:
        _die(str(exc))
    except ConfigValidationError as exc:
        _die(f"Configuration error: {exc}")
    return cfg


def _die(message: str, code: int = 1) -> None:
    """Print an error message to stderr and exit."""
    print(f"error: {message}", file=sys.stderr)
    sys.exit(code)


def _ensure_data_dirs(cfg: ScrapusConfig) -> None:
    """Create the standard data directory tree if it does not exist."""
    for d in (
        cfg.data_dir,
        cfg.data_dir / "lancedb",
        cfg.data_dir / "models",
        cfg.data_dir / "logs",
        cfg.data_dir / "memory_logs",
        cfg.data_dir / "exports",
        cfg.data_dir / "checkpoints",
    ):
        d.mkdir(parents=True, exist_ok=True)


def _elapsed(start: float) -> str:
    """Human-readable elapsed time."""
    delta = time.monotonic() - start
    if delta < 60:
        return f"{delta:.1f}s"
    minutes = int(delta // 60)
    seconds = delta % 60
    return f"{minutes}m {seconds:.1f}s"


def _parse_stages(raw: Optional[str]) -> List[str]:
    """Parse a comma-separated stage list and validate names."""
    if raw is None:
        return ALL_STAGES
    stages = [s.strip().lower() for s in raw.split(",") if s.strip()]
    for s in stages:
        if s not in STAGE_ORDER:
            _die(
                f"Unknown stage '{s}'. Valid stages: {', '.join(ALL_STAGES)}"
            )
    # Sort by pipeline order.
    return sorted(stages, key=lambda s: STAGE_ORDER[s])


# ============================================================================
# Stage runners — thin wrappers that import the heavy modules lazily
# ============================================================================

async def _run_crawl(cfg: ScrapusConfig, resume: bool = False) -> Dict[str, Any]:
    """Module 1: RL Crawler."""
    logger.info(
        "Starting crawler: %d seed URLs, max_pages=%d, depth=%d, concurrency=%d",
        len(cfg.crawler.seed_urls), cfg.crawler.max_pages,
        cfg.crawler.max_depth, cfg.crawler.concurrency,
    )
    _ensure_data_dirs(cfg)

    # Lazy import so startup stays fast when only running other stages.
    try:
        from memory_management import MemoryManagementSystem
    except ImportError:
        logger.warning("memory_management not available; running without memory tracking")
        MemoryManagementSystem = None  # type: ignore[assignment,misc]

    if not cfg.crawler.seed_urls:
        logger.warning("No seed URLs configured. Pass --seed-urls or set [crawler] seed_urls in TOML.")
        return {"status": "skipped", "reason": "no_seed_urls"}

    # TODO: replace with actual crawler invocation once wired.
    logger.info("Crawler stage placeholder — replace with RL crawler integration")
    return {"status": "completed", "pages_crawled": 0}


async def _run_extract(cfg: ScrapusConfig) -> Dict[str, Any]:
    """Module 2: NER Extraction."""
    logger.info(
        "Starting NER extraction: backend=%s, batch_size=%d, threshold=%.2f",
        cfg.ner.model_backend, cfg.ner.batch_size, cfg.ner.confidence_threshold,
    )
    _ensure_data_dirs(cfg)

    # TODO: wire gliner2_integration / hybrid_ner_pipeline
    logger.info("NER extraction stage placeholder — replace with hybrid NER pipeline")
    return {"status": "completed", "entities_extracted": 0}


async def _run_resolve(cfg: ScrapusConfig) -> Dict[str, Any]:
    """Module 3: Entity Resolution."""
    logger.info(
        "Starting entity resolution: blocking=%s, eps=%.3f, threshold=%.3f",
        cfg.entity_resolution.blocking_method,
        cfg.entity_resolution.dbscan_eps,
        cfg.entity_resolution.similarity_threshold,
    )
    _ensure_data_dirs(cfg)

    # TODO: wire sbert_blocker + deberta_inference + gnn_consistency
    logger.info("Entity resolution stage placeholder — replace with SBERT blocker pipeline")
    return {"status": "completed", "entities_resolved": 0}


async def _run_score(cfg: ScrapusConfig) -> Dict[str, Any]:
    """Module 4: Lead Scoring."""
    logger.info(
        "Starting lead scoring: model=%s, conformal=%.2f, calibration=%s",
        cfg.scoring.model_type, cfg.scoring.conformal_coverage,
        cfg.scoring.calibration_method,
    )
    _ensure_data_dirs(cfg)

    # TODO: wire lightgbm_onnx_migration + conformal_pipeline
    logger.info("Lead scoring stage placeholder — replace with LightGBM + MAPIE pipeline")
    return {"status": "completed", "leads_scored": 0}


async def _run_report(cfg: ScrapusConfig) -> Dict[str, Any]:
    """Module 5: Report Generation."""
    logger.info(
        "Starting report generation: llm=%s (%s), tokens=%d, reranker=%s, self_rag=%s",
        cfg.report.llm_model, cfg.report.llm_backend,
        cfg.report.max_tokens, cfg.report.reranker_enabled,
        cfg.report.self_rag_enabled,
    )
    _ensure_data_dirs(cfg)

    # TODO: wire structured_output + selfrag_lightgraphrag + reranker_mmr
    logger.info("Report generation stage placeholder — replace with Outlines + Self-RAG pipeline")
    return {"status": "completed", "reports_generated": 0}


async def _run_evaluate(cfg: ScrapusConfig) -> Dict[str, Any]:
    """Module 6: Evaluation & Monitoring."""
    logger.info(
        "Starting evaluation: windows=%s, judges=%d, audit=%s",
        cfg.monitoring.drift_window_sizes,
        len(cfg.monitoring.judge_models),
        cfg.monitoring.audit_enabled,
    )
    _ensure_data_dirs(cfg)

    # TODO: wire drift_detection + llm_judge_ensemble
    logger.info("Evaluation stage placeholder — replace with drift detection + LLM judge pipeline")
    return {"status": "completed", "metrics_computed": 0}


# Stage name -> runner function.
_STAGE_RUNNERS: Dict[str, Callable] = {
    "crawl": _run_crawl,
    "extract": _run_extract,
    "resolve": _run_resolve,
    "score": _run_score,
    "report": _run_report,
    "evaluate": _run_evaluate,
}


# ============================================================================
# Command handlers
# ============================================================================

def cmd_run(args: argparse.Namespace) -> None:
    """Run the full pipeline (or selected stages)."""
    cfg = _resolve_config(args)
    setup_logging(cfg)
    logger.info(config_summary(cfg))

    # Apply CLI overrides.
    if getattr(args, "seed_urls", None):
        cfg.crawler.seed_urls = args.seed_urls
    if getattr(args, "max_pages", None) is not None:
        cfg.crawler.max_pages = args.max_pages

    stages = _parse_stages(getattr(args, "stages", None))
    resume = getattr(args, "resume", False)

    logger.info("Pipeline stages: %s", ", ".join(stages))
    start = time.monotonic()
    results: Dict[str, Any] = {}

    async def _pipeline() -> None:
        for stage_name in stages:
            stage_start = time.monotonic()
            logger.info("--- Stage: %s ---", stage_name)
            runner = _STAGE_RUNNERS[stage_name]
            if stage_name == "crawl":
                result = await runner(cfg, resume=resume)
            else:
                result = await runner(cfg)
            results[stage_name] = result
            logger.info(
                "Stage %s finished in %s: %s",
                stage_name, _elapsed(stage_start), result.get("status", "unknown"),
            )

    try:
        asyncio.run(_pipeline())
    except KeyboardInterrupt:
        logger.warning("Pipeline interrupted by user")
        sys.exit(130)

    logger.info("Pipeline completed in %s", _elapsed(start))

    # Write run summary.
    summary_path = cfg.logs_dir / "last_run.json"
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary = {
        "timestamp": datetime.now().isoformat(),
        "stages": stages,
        "results": results,
        "elapsed": _elapsed(start),
        "config_file": str(getattr(args, "config", None) or "defaults"),
    }
    summary_path.write_text(json.dumps(summary, indent=2, default=str), encoding="utf-8")
    logger.info("Run summary written to %s", summary_path)


def cmd_crawl(args: argparse.Namespace) -> None:
    """Run the crawler stage only."""
    cfg = _resolve_config(args)
    setup_logging(cfg)
    if getattr(args, "seed_urls", None):
        cfg.crawler.seed_urls = args.seed_urls
    if getattr(args, "max_pages", None) is not None:
        cfg.crawler.max_pages = args.max_pages
    resume = getattr(args, "resume", False)
    asyncio.run(_run_crawl(cfg, resume=resume))


def cmd_extract(args: argparse.Namespace) -> None:
    """Run NER extraction only."""
    cfg = _resolve_config(args)
    setup_logging(cfg)
    asyncio.run(_run_extract(cfg))


def cmd_resolve(args: argparse.Namespace) -> None:
    """Run entity resolution only."""
    cfg = _resolve_config(args)
    setup_logging(cfg)
    asyncio.run(_run_resolve(cfg))


def cmd_score(args: argparse.Namespace) -> None:
    """Run lead scoring only."""
    cfg = _resolve_config(args)
    setup_logging(cfg)
    asyncio.run(_run_score(cfg))


def cmd_report(args: argparse.Namespace) -> None:
    """Run report generation only."""
    cfg = _resolve_config(args)
    setup_logging(cfg)
    asyncio.run(_run_report(cfg))


def cmd_evaluate(args: argparse.Namespace) -> None:
    """Run evaluation only."""
    cfg = _resolve_config(args)
    setup_logging(cfg)
    asyncio.run(_run_evaluate(cfg))


def cmd_dashboard(args: argparse.Namespace) -> None:
    """Launch the Streamlit monitoring dashboard."""
    cfg = _resolve_config(args)
    setup_logging(cfg)

    dashboard_script = _SRC_DIR / "monitoring_dashboard.py"
    if not dashboard_script.exists():
        _die(f"Dashboard script not found at {dashboard_script}")

    port = getattr(args, "port", None) or cfg.monitoring.dashboard_port
    logger.info("Launching Streamlit dashboard on port %d", port)

    try:
        import subprocess
        cmd = [
            sys.executable, "-m", "streamlit", "run",
            str(dashboard_script),
            "--server.port", str(port),
            "--server.headless", "true",
            "--",
            "--data-dir", str(cfg.data_dir),
        ]
        logger.info("Running: %s", " ".join(cmd))
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        _die(
            "Streamlit is not installed. Install it with: pip install streamlit>=1.30"
        )
    except subprocess.CalledProcessError as exc:
        _die(f"Dashboard exited with code {exc.returncode}")
    except KeyboardInterrupt:
        logger.info("Dashboard stopped by user")


def cmd_init(args: argparse.Namespace) -> None:
    """Initialize data directories and generate default config."""
    config_path = getattr(args, "config", None)
    if config_path:
        cfg = _resolve_config(args)
    else:
        cfg = ScrapusConfig()

    setup_logging(cfg)
    _ensure_data_dirs(cfg)

    # Write default config if it doesn't exist.
    target_toml = Path.cwd() / "scrapus.toml"
    if target_toml.exists() and not getattr(args, "force", False):
        logger.info("Config file already exists at %s (use --force to overwrite)", target_toml)
    else:
        generate_default_config(target_toml)
        logger.info("Generated default config at %s", target_toml)

    # Initialize SQLite database with WAL mode.
    db_path = cfg.sqlite_path
    if not db_path.exists():
        db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(db_path))
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        conn.execute("PRAGMA foreign_keys=ON;")
        conn.execute(f"PRAGMA mmap_size={cfg.m1.mmap_size};")
        conn.execute("PRAGMA page_size=4096;")
        conn.close()
        logger.info("Initialized SQLite database at %s", db_path)
    else:
        logger.info("SQLite database already exists at %s", db_path)

    print(f"Scrapus initialized in {cfg.data_dir.resolve()}")
    print(f"  Config:   {target_toml}")
    print(f"  Database: {db_path}")
    print(f"  Models:   {cfg.models_dir}")
    print(f"  Logs:     {cfg.logs_dir}")
    print()
    print("Next steps:")
    print("  1. Edit scrapus.toml to set seed_urls and tune parameters")
    print("  2. Run: python -m cli crawl --seed-urls https://example.com")
    print("  3. Run: python -m cli run  (full pipeline)")


def cmd_status(args: argparse.Namespace) -> None:
    """Show pipeline status, last run info, and database stats."""
    cfg = _resolve_config(args)
    setup_logging(cfg)

    print("Scrapus Pipeline Status")
    print("=" * 60)
    print()

    # Data directory.
    data_dir = cfg.data_dir
    if data_dir.exists():
        print(f"Data directory: {data_dir.resolve()}")
        # Compute total size.
        total_bytes = sum(
            f.stat().st_size for f in data_dir.rglob("*") if f.is_file()
        )
        print(f"  Total size: {total_bytes / (1024 * 1024):.1f} MB")
    else:
        print(f"Data directory: {data_dir.resolve()} (NOT FOUND)")
        print("  Run 'scrapus init' to initialize.")
        return

    print()

    # SQLite stats.
    db_path = cfg.sqlite_path
    if db_path.exists():
        print(f"SQLite database: {db_path}")
        print(f"  Size: {db_path.stat().st_size / (1024 * 1024):.1f} MB")
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            )
            tables = [row[0] for row in cursor.fetchall()]
            print(f"  Tables: {len(tables)}")
            for table in tables:
                count = conn.execute(f"SELECT COUNT(*) FROM [{table}]").fetchone()[0]
                print(f"    {table}: {count:,} rows")
            # WAL stats.
            wal_path = Path(str(db_path) + "-wal")
            if wal_path.exists():
                print(f"  WAL size: {wal_path.stat().st_size / (1024 * 1024):.1f} MB")
            conn.close()
        except sqlite3.Error as exc:
            print(f"  Error reading database: {exc}")
    else:
        print(f"SQLite database: not initialized")

    print()

    # LanceDB.
    lance_dir = cfg.lancedb_path
    if lance_dir.exists():
        lance_files = list(lance_dir.rglob("*"))
        lance_size = sum(f.stat().st_size for f in lance_files if f.is_file())
        print(f"LanceDB: {lance_dir}")
        print(f"  Size: {lance_size / (1024 * 1024):.1f} MB")
        print(f"  Files: {len(lance_files)}")
    else:
        print(f"LanceDB: not initialized")

    print()

    # Models.
    models_dir = cfg.models_dir
    if models_dir.exists():
        model_files = list(models_dir.rglob("*"))
        model_size = sum(f.stat().st_size for f in model_files if f.is_file())
        print(f"Models: {models_dir}")
        print(f"  Size: {model_size / (1024 * 1024):.1f} MB")
        print(f"  Files: {len([f for f in model_files if f.is_file()])}")
    else:
        print(f"Models: not downloaded yet")

    print()

    # Last run.
    last_run = cfg.logs_dir / "last_run.json"
    if last_run.exists():
        try:
            run_data = json.loads(last_run.read_text(encoding="utf-8"))
            print("Last run:")
            print(f"  Timestamp: {run_data.get('timestamp', 'unknown')}")
            print(f"  Stages:    {', '.join(run_data.get('stages', []))}")
            print(f"  Elapsed:   {run_data.get('elapsed', 'unknown')}")
            results = run_data.get("results", {})
            for stage, result in results.items():
                status = result.get("status", "unknown")
                print(f"  {stage}: {status}")
        except (json.JSONDecodeError, KeyError) as exc:
            print(f"  Error reading last_run.json: {exc}")
    else:
        print("Last run: no runs recorded yet")

    print()

    # Memory estimate.
    print("Memory configuration:")
    print(f"  Budget: {cfg.memory.budget_gb} GB")
    print(f"  Swap warning: {cfg.memory.swap_threshold_mb} MB")
    print(f"  Per-stage budgets:")
    for stage, mb in cfg.memory.per_stage_budgets.items():
        print(f"    {stage}: {mb} MB")

    print()

    # M1 hardware.
    print("M1 acceleration:")
    print(f"  MPS:    {'enabled' if cfg.m1.use_mps else 'disabled'}")
    print(f"  CoreML: {'enabled' if cfg.m1.use_coreml else 'disabled'}")
    print(f"  MLX:    {'enabled' if cfg.m1.use_mlx else 'disabled'}")


def cmd_benchmark(args: argparse.Namespace) -> None:
    """Run the benchmark suite."""
    cfg = _resolve_config(args)
    setup_logging(cfg)

    logger.info("Starting benchmark suite")
    _ensure_data_dirs(cfg)

    benchmark_module = _SRC_DIR / "benchmark_harness.py"
    e2e_module = _SRC_DIR / "e2e_benchmark.py"

    # Try the full e2e benchmark first, fall back to stage-level.
    target = e2e_module if e2e_module.exists() else benchmark_module
    if not target.exists():
        _die(f"Benchmark module not found at {target}")

    try:
        import subprocess
        cmd = [sys.executable, str(target)]
        logger.info("Running: %s", " ".join(cmd))
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as exc:
        _die(f"Benchmark exited with code {exc.returncode}")
    except KeyboardInterrupt:
        logger.info("Benchmark interrupted by user")


# ============================================================================
# Argument parser construction
# ============================================================================

def _add_common_args(parser: argparse.ArgumentParser) -> None:
    """Add --config and --verbose flags shared by all sub-commands."""
    parser.add_argument(
        "--config", "-c",
        metavar="PATH",
        help="Path to scrapus.toml config file (default: auto-discover)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Set log level to DEBUG regardless of config",
    )


def build_parser() -> argparse.ArgumentParser:
    """Construct the full CLI argument parser."""
    parser = argparse.ArgumentParser(
        prog="scrapus",
        description="Scrapus -- local lead-intelligence pipeline for M1 16GB",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  scrapus init                           Initialize project\n"
            "  scrapus run                            Run full pipeline\n"
            "  scrapus run --stages crawl,extract     Run specific stages\n"
            "  scrapus crawl --seed-urls https://a.com https://b.com\n"
            "  scrapus status                         Show pipeline status\n"
            "  scrapus dashboard                      Launch monitoring UI\n"
            "  scrapus benchmark                      Run benchmark suite\n"
        ),
    )
    parser.add_argument(
        "--version", action="version", version=f"scrapus {__version__}",
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # ---- run ----------------------------------------------------------------
    p_run = subparsers.add_parser("run", help="Run full pipeline (or selected stages)")
    _add_common_args(p_run)
    p_run.add_argument(
        "--stages", "-s",
        metavar="STAGES",
        help="Comma-separated list of stages: crawl,extract,resolve,score,report,evaluate",
    )
    p_run.add_argument(
        "--resume", action="store_true",
        help="Resume from last checkpoint (if available)",
    )
    p_run.add_argument(
        "--seed-urls", nargs="+", metavar="URL",
        help="Override seed URLs for the crawler",
    )
    p_run.add_argument(
        "--max-pages", type=int, metavar="N",
        help="Override max pages for the crawler",
    )
    p_run.set_defaults(func=cmd_run)

    # ---- crawl --------------------------------------------------------------
    p_crawl = subparsers.add_parser("crawl", help="Run crawler only")
    _add_common_args(p_crawl)
    p_crawl.add_argument("--seed-urls", nargs="+", metavar="URL")
    p_crawl.add_argument("--max-pages", type=int, metavar="N")
    p_crawl.add_argument("--resume", action="store_true")
    p_crawl.set_defaults(func=cmd_crawl)

    # ---- extract ------------------------------------------------------------
    p_extract = subparsers.add_parser("extract", help="Run NER extraction only")
    _add_common_args(p_extract)
    p_extract.set_defaults(func=cmd_extract)

    # ---- resolve ------------------------------------------------------------
    p_resolve = subparsers.add_parser("resolve", help="Run entity resolution only")
    _add_common_args(p_resolve)
    p_resolve.set_defaults(func=cmd_resolve)

    # ---- score --------------------------------------------------------------
    p_score = subparsers.add_parser("score", help="Run lead scoring only")
    _add_common_args(p_score)
    p_score.set_defaults(func=cmd_score)

    # ---- report -------------------------------------------------------------
    p_report = subparsers.add_parser("report", help="Generate reports only")
    _add_common_args(p_report)
    p_report.set_defaults(func=cmd_report)

    # ---- evaluate -----------------------------------------------------------
    p_eval = subparsers.add_parser("evaluate", help="Run evaluation only")
    _add_common_args(p_eval)
    p_eval.set_defaults(func=cmd_evaluate)

    # ---- dashboard ----------------------------------------------------------
    p_dash = subparsers.add_parser("dashboard", help="Launch Streamlit monitoring dashboard")
    _add_common_args(p_dash)
    p_dash.add_argument(
        "--port", "-p", type=int, metavar="PORT",
        help=f"Dashboard port (default: from config)",
    )
    p_dash.set_defaults(func=cmd_dashboard)

    # ---- init ---------------------------------------------------------------
    p_init = subparsers.add_parser("init", help="Initialize data directories and default config")
    _add_common_args(p_init)
    p_init.add_argument(
        "--force", "-f", action="store_true",
        help="Overwrite existing scrapus.toml",
    )
    p_init.set_defaults(func=cmd_init)

    # ---- status -------------------------------------------------------------
    p_status = subparsers.add_parser("status", help="Show pipeline status and database stats")
    _add_common_args(p_status)
    p_status.set_defaults(func=cmd_status)

    # ---- benchmark ----------------------------------------------------------
    p_bench = subparsers.add_parser("benchmark", help="Run benchmark suite")
    _add_common_args(p_bench)
    p_bench.set_defaults(func=cmd_benchmark)

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

    # Apply --verbose override before anything else.
    if getattr(args, "verbose", False):
        os.environ["SCRAPUS_GENERAL_LOG_LEVEL"] = "DEBUG"

    try:
        args.func(args)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        sys.exit(130)
    except ConfigValidationError as exc:
        _die(f"Configuration error: {exc}")
    except Exception as exc:
        logger.exception("Unhandled error")
        _die(f"Fatal: {exc}")


if __name__ == "__main__":
    main()
