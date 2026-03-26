#!/usr/bin/env python3
"""
Entry point for the Scrapus B2B lead generation pipeline.

Usage:
    # Full pipeline with seed URLs
    python pipeline_runner.py --seeds https://example.com https://other.com

    # Resume an interrupted run
    python pipeline_runner.py --resume run_20260326_143000_abc12345

    # Run specific stages only
    python pipeline_runner.py --stages crawl ner entity_resolution

    # Single stage with custom config
    python pipeline_runner.py --stage ner --config ./config.json

    # Dry run (validate config + model availability)
    python pipeline_runner.py --dry-run

    # List recent runs
    python pipeline_runner.py --list-runs

    # Cleanup old checkpoints
    python pipeline_runner.py --cleanup --max-age-days 14

Examples:
    # Minimal: crawl 3 URLs and run full pipeline
    python pipeline_runner.py \\
        --seeds https://techcrunch.com https://crunchbase.com https://ycombinator.com \\
        --max-pages 100 --max-reports 20

    # Resume after Ctrl-C
    python pipeline_runner.py --resume run_20260326_143000_abc12345

    # Re-run evaluation on existing data
    python pipeline_runner.py --stage evaluation --resume run_20260326_143000_abc12345
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import List, Optional

from pipeline_orchestrator import PipelineConfig, PipelineOrchestrator
from pipeline_stages import STAGE_ORDER, STAGE_SPECS


# ============================================================================
# Logging setup
# ============================================================================

def setup_logging(verbose: bool = False, log_file: Optional[str] = None) -> None:
    """Configure structured logging for the pipeline."""
    level = logging.DEBUG if verbose else logging.INFO
    fmt = "%(asctime)s [%(levelname)-5s] %(name)-20s %(message)s"
    datefmt = "%Y-%m-%d %H:%M:%S"

    handlers: list = [logging.StreamHandler(sys.stdout)]
    if log_file:
        handlers.append(logging.FileHandler(log_file, mode="a"))

    logging.basicConfig(
        level=level,
        format=fmt,
        datefmt=datefmt,
        handlers=handlers,
        force=True,
    )

    # Suppress noisy third-party loggers
    for noisy in ["urllib3", "httpcore", "httpx", "filelock", "huggingface_hub"]:
        logging.getLogger(noisy).setLevel(logging.WARNING)


# ============================================================================
# Argument parsing
# ============================================================================

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="scrapus-pipeline",
        description="Scrapus B2B Lead Generation Pipeline — M1 16GB Local Deployment",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # --- Mode selectors (mutually exclusive) ---
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate config and model availability without executing",
    )
    mode.add_argument(
        "--list-runs",
        action="store_true",
        help="List recent pipeline runs and exit",
    )
    mode.add_argument(
        "--cleanup",
        action="store_true",
        help="Delete old checkpoint records and exit",
    )

    # --- Input ---
    parser.add_argument(
        "--seeds", "--seed-urls",
        nargs="+",
        default=[],
        metavar="URL",
        help="Seed URLs for the crawler (space-separated)",
    )
    parser.add_argument(
        "--seed-file",
        type=str,
        default=None,
        metavar="PATH",
        help="Path to a file with one seed URL per line",
    )

    # --- Pipeline control ---
    parser.add_argument(
        "--stages",
        nargs="+",
        default=None,
        choices=list(STAGE_SPECS.keys()),
        metavar="STAGE",
        help=f"Run only these stages (default: all). Choices: {', '.join(STAGE_ORDER)}",
    )
    parser.add_argument(
        "--stage",
        type=str,
        default=None,
        choices=list(STAGE_SPECS.keys()),
        metavar="STAGE",
        help="Run a single stage independently (for testing/debugging)",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        metavar="RUN_ID",
        help="Resume a previously interrupted pipeline run",
    )

    # --- Config ---
    parser.add_argument(
        "--config",
        type=str,
        default=None,
        metavar="PATH",
        help="Path to JSON config file (overrides all defaults)",
    )

    # --- Paths ---
    parser.add_argument(
        "--data-dir",
        type=str,
        default="./data",
        help="Directory for pipeline data (SQLite, checkpoints)",
    )
    parser.add_argument(
        "--model-dir",
        type=str,
        default="./models",
        help="Directory containing model files",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./output",
        help="Directory for pipeline output (results, reports)",
    )

    # --- Tuning ---
    parser.add_argument(
        "--max-pages",
        type=int,
        default=500,
        help="Maximum pages to crawl (default: 500)",
    )
    parser.add_argument(
        "--max-reports",
        type=int,
        default=100,
        help="Maximum reports to generate (default: 100)",
    )
    parser.add_argument(
        "--score-threshold",
        type=float,
        default=0.5,
        help="Lead score threshold for qualification (default: 0.5)",
    )
    parser.add_argument(
        "--llm-backend",
        type=str,
        default="ollama",
        choices=["ollama", "mlx"],
        help="LLM backend for report generation (default: ollama)",
    )
    parser.add_argument(
        "--rss-limit-gb",
        type=float,
        default=13.0,
        help="Abort stage if RSS exceeds this threshold in GB (default: 13.0)",
    )

    # --- Cleanup options ---
    parser.add_argument(
        "--max-age-days",
        type=int,
        default=30,
        help="Delete checkpoint records older than N days (with --cleanup)",
    )

    # --- Output ---
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable DEBUG-level logging",
    )
    parser.add_argument(
        "--log-file",
        type=str,
        default=None,
        help="Write logs to this file in addition to stdout",
    )
    parser.add_argument(
        "--json-output",
        action="store_true",
        help="Print final result as JSON to stdout",
    )

    return parser


# ============================================================================
# Config builder
# ============================================================================

def build_config(args: argparse.Namespace) -> PipelineConfig:
    """Build PipelineConfig from parsed arguments."""

    # Start from file config if provided
    if args.config:
        config = PipelineConfig.from_json(args.config)
    else:
        config = PipelineConfig()

    # Override with CLI arguments
    config.data_dir = Path(args.data_dir)
    config.model_dir = Path(args.model_dir)
    config.output_dir = Path(args.output_dir)
    config.checkpoint_db = str(Path(args.data_dir) / "pipeline_checkpoints.db")
    config.pipeline_db = str(Path(args.data_dir) / "scrapus.db")
    config.memory_log_dir = Path(args.output_dir) / "memory_logs"

    # Seed URLs: combine --seeds and --seed-file
    all_seeds = list(args.seeds)
    if args.seed_file:
        seed_path = Path(args.seed_file)
        if seed_path.exists():
            with open(seed_path) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        all_seeds.append(line)
    config.seed_urls = all_seeds

    # Stages
    if args.stages:
        config.stages = args.stages
    elif args.stage:
        config.stages = [args.stage]

    # Resume
    if args.resume:
        config.resume_run_id = args.resume

    # Tuning
    config.max_pages = args.max_pages
    config.max_reports = args.max_reports
    config.score_threshold = args.score_threshold
    config.llm_backend = args.llm_backend
    config.rss_abort_threshold_gb = args.rss_limit_gb

    return config


# ============================================================================
# Command handlers
# ============================================================================

async def cmd_run_pipeline(config: PipelineConfig, json_output: bool) -> int:
    """Run the full pipeline or specified stages."""
    orchestrator = PipelineOrchestrator(config)
    result = await orchestrator.run()
    result.print_summary()

    if json_output:
        print(json.dumps(result.to_dict(), indent=2))

    return 0 if result.status == "completed" else 1


async def cmd_run_single_stage(config: PipelineConfig, stage: str, json_output: bool) -> int:
    """Run a single stage independently."""
    orchestrator = PipelineOrchestrator(config)
    try:
        output = await orchestrator.run_single_stage(stage)
        print(f"\nStage '{stage}' completed successfully.")
        if json_output and output is not None:
            summary = orchestrator._serialize_output_summary(stage, output)
            print(json.dumps(summary, indent=2))
        return 0
    except Exception as e:
        print(f"\nStage '{stage}' failed: {e}", file=sys.stderr)
        return 1


async def cmd_dry_run(config: PipelineConfig) -> int:
    """Validate configuration and model availability."""
    orchestrator = PipelineOrchestrator(config)
    results = await orchestrator.dry_run()

    print(f"\n{'=' * 60}")
    print("DRY RUN: Configuration Validation")
    print(f"{'=' * 60}")

    all_ok = True
    for stage_name in config.stages:
        if stage_name.startswith("_"):
            continue
        info = results.get(stage_name, {})
        issues = info.get("issues", [])
        status = "OK" if not issues else "ISSUES"
        if issues:
            all_ok = False

        print(f"\n  {info.get('display_name', stage_name)}:")
        print(f"    Budget: {info.get('memory_budget_mb', '?')} MB")
        print(f"    Models: {info.get('models', [])}")
        for model, avail in info.get("models_available", {}).items():
            icon = "[OK]" if avail else "[MISSING]"
            print(f"      {icon} {model}")
        deps_met = info.get("dependencies_met", True)
        print(f"    Dependencies: {'OK' if deps_met else 'MISSING'}")
        for issue in issues:
            print(f"    WARNING: {issue}")

    sys_info = results.get("_system", {})
    print(f"\n  System:")
    print(f"    Total memory: {sys_info.get('total_memory_gb', '?')} GB")
    print(f"    Available: {sys_info.get('available_memory_gb', '?')} GB")
    print(f"    Current RSS: {sys_info.get('current_rss_mb', '?')} MB")
    print(f"    Abort threshold: {sys_info.get('abort_threshold_gb', '?')} GB")

    print(f"\n{'=' * 60}")
    print(f"  Result: {'ALL OK' if all_ok else 'ISSUES FOUND'}")
    print(f"{'=' * 60}\n")

    return 0 if all_ok else 1


def cmd_list_runs(config: PipelineConfig) -> int:
    """List recent pipeline runs."""
    orchestrator = PipelineOrchestrator(config)
    runs = orchestrator.list_runs(limit=20)

    if not runs:
        print("No pipeline runs found.")
        return 0

    print(f"\n{'=' * 60}")
    print("Recent Pipeline Runs")
    print(f"{'=' * 60}")
    for run in runs:
        print(
            f"  {run['run_id']:<45} {run['status']:<12} "
            f"{run['progress']:<8} {run['created_at']}"
        )
    print(f"{'=' * 60}\n")
    return 0


def cmd_cleanup(config: PipelineConfig, max_age_days: int) -> int:
    """Clean up old checkpoint records."""
    orchestrator = PipelineOrchestrator(config)
    deleted = orchestrator.cleanup_old_runs(max_age_days)
    print(f"Cleaned up {deleted} runs older than {max_age_days} days.")
    return 0


# ============================================================================
# Main
# ============================================================================

def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    setup_logging(verbose=args.verbose, log_file=args.log_file)
    logger = logging.getLogger("runner")

    config = build_config(args)

    # --- Dispatch to command ---

    if args.list_runs:
        return cmd_list_runs(config)

    if args.cleanup:
        return cmd_cleanup(config, args.max_age_days)

    if args.dry_run:
        return asyncio.run(cmd_dry_run(config))

    if args.stage:
        return asyncio.run(cmd_run_single_stage(config, args.stage, args.json_output))

    # Validate: full pipeline needs seed URLs (unless resuming)
    if not config.seed_urls and not config.resume_run_id:
        # Allow running with no seeds if stages don't include crawl
        if "crawl" in config.stages:
            parser.error(
                "Seed URLs required for crawl stage. "
                "Use --seeds URL [URL...] or --seed-file PATH or --resume RUN_ID"
            )

    return asyncio.run(cmd_run_pipeline(config, args.json_output))


if __name__ == "__main__":
    sys.exit(main())
