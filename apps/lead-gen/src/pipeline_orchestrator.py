"""
Main pipeline orchestrator for Scrapus B2B lead generation pipeline.

Central entry point that runs the entire 7-stage pipeline end-to-end with
sequential model loading to stay within 16 GB on Apple M1.

Architecture:
    Single Python process, asyncio event loop
    Sequential execution: Crawl -> NER -> ER -> Scoring -> Reports -> Eval
    Model lifecycle: load before stage, unload after, gc.collect()
    Checkpoint/resume via SQLite (pipeline_checkpoint.py)
    Memory monitoring at stage boundaries (memory_management.py)
    Graceful shutdown on SIGINT/SIGTERM
    Error recovery: skip failed items, continue pipeline

Memory timeline (M1 16 GB):
    Crawl:  750 MB  |  NER: 1.7 GB  |  ER: 730 MB  |  Score: 850 MB
    Reports: 6.7 GB (peak, LLM loaded)  |  Eval: 800 MB
    OS+headroom: 3-4 GB reserved
"""

from __future__ import annotations

import asyncio
import gc
import json
import logging
import os
import signal
import sys
import time
import traceback
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set

import psutil

from memory_management import (
    M1CacheManager,
    MemoryManagementSystem,
    MemorySnapshot,
)
from pipeline_checkpoint import (
    CheckpointManager,
    RunStatus,
    StageCheckpoint,
    StageStatus,
)
from pipeline_stages import (
    STAGE_ORDER,
    STAGE_SPECS,
    CrawlOutput,
    EntityResolutionOutput,
    EvaluationOutput,
    EvaluationStage,
    LeadScoringOutput,
    NEROutput,
    PipelineStage,
    ReportGenerationOutput,
    StageSpec,
    create_stage,
    get_stage_spec,
    load_stage_models,
    unload_stage_models,
    validate_stage_order,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration
# ============================================================================

@dataclass
class PipelineConfig:
    """Top-level configuration for the pipeline orchestrator."""

    # Paths
    data_dir: Path = field(default_factory=lambda: Path("./data"))
    model_dir: Path = field(default_factory=lambda: Path("./models"))
    output_dir: Path = field(default_factory=lambda: Path("./output"))
    checkpoint_db: str = "./data/pipeline_checkpoints.db"
    pipeline_db: str = "./data/scrapus.db"
    memory_log_dir: Path = field(default_factory=lambda: Path("./memory_logs"))
    memory_config_path: Optional[Path] = None

    # Pipeline control
    stages: List[str] = field(default_factory=lambda: list(STAGE_ORDER))
    resume_run_id: Optional[str] = None
    seed_urls: List[str] = field(default_factory=list)
    max_pages: int = 500
    max_reports: int = 100
    score_threshold: float = 0.5

    # Memory guardrails
    rss_abort_threshold_gb: float = 13.0  # abort stage if RSS > this
    enable_memory_monitoring: bool = True
    enable_swap_monitoring: bool = True

    # Model overrides
    llm_backend: str = "ollama"  # "ollama" or "mlx"
    ollama_model: str = "llama3.1:8b-instruct-q4_K_M"
    use_qwen_fallback: bool = False  # Qwen2.5-3B if LLM OOM

    # Batch sizes (M1-tuned defaults)
    ner_batch_size: int = 32
    er_batch_size: int = 256
    scoring_batch_size: int = 1024

    # Entity types for NER
    entity_types: List[str] = field(default_factory=lambda: [
        "ORG", "PERSON", "LOCATION", "PRODUCT", "FUNDING_ROUND", "TECHNOLOGY",
    ])

    def to_dict(self) -> Dict[str, Any]:
        d = {}
        for k, v in self.__dict__.items():
            if isinstance(v, Path):
                d[k] = str(v)
            elif isinstance(v, list):
                d[k] = list(v)
            else:
                d[k] = v
        return d

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "PipelineConfig":
        path_fields = {"data_dir", "model_dir", "output_dir", "memory_log_dir", "memory_config_path"}
        kwargs = {}
        for k, v in d.items():
            if k in path_fields and v is not None:
                kwargs[k] = Path(v)
            else:
                kwargs[k] = v
        return cls(**kwargs)

    @classmethod
    def from_json(cls, path: str) -> "PipelineConfig":
        with open(path) as f:
            return cls.from_dict(json.load(f))


# ============================================================================
# Error aggregation
# ============================================================================

@dataclass
class StageError:
    """Record of an error that occurred during a pipeline stage."""
    stage_name: str
    timestamp: str
    error_type: str
    error_message: str
    traceback_str: str
    item_id: Optional[str] = None
    recoverable: bool = True


@dataclass
class PipelineResult:
    """Final result of a pipeline run."""
    run_id: str
    status: str
    started_at: str
    finished_at: str
    duration_seconds: float
    stages_completed: List[str]
    stages_failed: List[str]
    stages_skipped: List[str]
    total_items_processed: int
    errors: List[StageError]
    outputs: Dict[str, Any]
    memory_peak_mb: float

    def to_dict(self) -> Dict[str, Any]:
        d = {
            "run_id": self.run_id,
            "status": self.status,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "duration_seconds": round(self.duration_seconds, 2),
            "stages_completed": self.stages_completed,
            "stages_failed": self.stages_failed,
            "stages_skipped": self.stages_skipped,
            "total_items_processed": self.total_items_processed,
            "error_count": len(self.errors),
            "memory_peak_mb": round(self.memory_peak_mb, 1),
        }
        return d

    def print_summary(self) -> None:
        print(f"\n{'=' * 72}")
        print(f"PIPELINE RUN COMPLETE: {self.run_id}")
        print(f"{'=' * 72}")
        print(f"  Status:           {self.status}")
        print(f"  Duration:         {self.duration_seconds:.1f}s")
        print(f"  Stages completed: {len(self.stages_completed)}/{len(self.stages_completed) + len(self.stages_failed) + len(self.stages_skipped)}")
        print(f"  Items processed:  {self.total_items_processed}")
        print(f"  Errors:           {len(self.errors)}")
        print(f"  Peak memory:      {self.memory_peak_mb:.1f} MB")
        if self.stages_failed:
            print(f"  Failed stages:    {', '.join(self.stages_failed)}")
        if self.stages_skipped:
            print(f"  Skipped stages:   {', '.join(self.stages_skipped)}")
        print(f"{'=' * 72}\n")


# ============================================================================
# Pipeline Orchestrator
# ============================================================================

class PipelineOrchestrator:
    """
    Central orchestrator for the Scrapus B2B lead generation pipeline.

    Manages:
    - Sequential stage execution with dependency ordering
    - Model loading/unloading between stages (M1 16 GB budget)
    - SQLite checkpoint/resume
    - Memory monitoring and guardrails
    - Graceful shutdown on signals
    - Error recovery and aggregation
    - Progress reporting

    Usage:
        config = PipelineConfig(seed_urls=["https://..."], ...)
        orchestrator = PipelineOrchestrator(config)
        result = await orchestrator.run()
        result.print_summary()
    """

    def __init__(self, config: PipelineConfig):
        self.config = config
        self._validate_config()

        # Ensure directories exist
        self.config.data_dir.mkdir(parents=True, exist_ok=True)
        self.config.output_dir.mkdir(parents=True, exist_ok=True)
        self.config.memory_log_dir.mkdir(parents=True, exist_ok=True)

        # Core subsystems
        self.checkpoint = CheckpointManager(config.checkpoint_db)
        self.mem_system = MemoryManagementSystem(
            config_path=config.memory_config_path,
            log_dir=config.memory_log_dir,
        )

        # Runtime state
        self._run_id: Optional[str] = None
        self._stage_outputs: Dict[str, Any] = {}
        self._errors: List[StageError] = []
        self._shutdown_requested = False
        self._current_stage: Optional[str] = None
        self._peak_rss_mb: float = 0.0
        self._started_at: Optional[str] = None

        # Signal handlers (registered in run())
        self._original_sigint = None
        self._original_sigterm = None

        self.logger = logging.getLogger("orchestrator")

    # ------------------------------------------------------------------
    # Validation
    # ------------------------------------------------------------------

    def _validate_config(self) -> None:
        """Validate configuration before running."""
        for stage in self.config.stages:
            if stage not in STAGE_SPECS:
                raise ValueError(f"Unknown stage '{stage}'. Valid: {list(STAGE_SPECS.keys())}")
        validate_stage_order(self.config.stages)

    # ------------------------------------------------------------------
    # Signal handling
    # ------------------------------------------------------------------

    def _install_signal_handlers(self) -> None:
        """Install SIGINT/SIGTERM handlers for graceful shutdown."""
        self._original_sigint = signal.getsignal(signal.SIGINT)
        self._original_sigterm = signal.getsignal(signal.SIGTERM)
        signal.signal(signal.SIGINT, self._handle_shutdown_signal)
        signal.signal(signal.SIGTERM, self._handle_shutdown_signal)

    def _restore_signal_handlers(self) -> None:
        if self._original_sigint is not None:
            signal.signal(signal.SIGINT, self._original_sigint)
        if self._original_sigterm is not None:
            signal.signal(signal.SIGTERM, self._original_sigterm)

    def _handle_shutdown_signal(self, signum: int, frame: Any) -> None:
        sig_name = signal.Signals(signum).name
        self.logger.warning(
            f"Received {sig_name} — requesting graceful shutdown "
            f"(current stage: {self._current_stage})"
        )
        self._shutdown_requested = True
        # If a second signal arrives, force exit
        signal.signal(signum, signal.SIG_DFL)

    # ------------------------------------------------------------------
    # Memory monitoring
    # ------------------------------------------------------------------

    def _get_rss_mb(self) -> float:
        rss = psutil.Process().memory_info().rss / (1024 ** 2)
        self._peak_rss_mb = max(self._peak_rss_mb, rss)
        return rss

    def _check_memory_guardrail(self, stage_name: str) -> bool:
        """
        Check if RSS is within the abort threshold.
        Returns True if safe, False if stage should be aborted.
        """
        if not self.config.enable_memory_monitoring:
            return True

        rss_mb = self._get_rss_mb()
        threshold_mb = self.config.rss_abort_threshold_gb * 1024

        if rss_mb > threshold_mb:
            self.logger.critical(
                f"MEMORY GUARDRAIL: RSS {rss_mb:.0f} MB exceeds threshold "
                f"{threshold_mb:.0f} MB during stage '{stage_name}'. Aborting stage."
            )
            return False

        # Warn at 80% of threshold
        if rss_mb > threshold_mb * 0.8:
            self.logger.warning(
                f"MEMORY WARNING: RSS {rss_mb:.0f} MB approaching threshold "
                f"{threshold_mb:.0f} MB during stage '{stage_name}'"
            )

        return True

    def _force_memory_cleanup(self, stage_name: str) -> None:
        """Force full memory cleanup between stages."""
        self.logger.info(f"[{stage_name}] Forcing memory cleanup...")
        before_mb = self._get_rss_mb()
        M1CacheManager.clear_all_caches()
        after_mb = self._get_rss_mb()
        freed = before_mb - after_mb
        self.logger.info(
            f"[{stage_name}] Memory cleanup: {before_mb:.0f} MB -> {after_mb:.0f} MB "
            f"(freed {freed:.0f} MB)"
        )

    # ------------------------------------------------------------------
    # Progress reporting
    # ------------------------------------------------------------------

    def _log_progress(
        self,
        stage_name: str,
        status: str,
        items: int = 0,
        elapsed: float = 0.0,
    ) -> None:
        rss = self._get_rss_mb()
        throughput = items / max(elapsed, 0.01)
        completed = len([s for s in self.config.stages if s in self._stage_outputs])
        total = len(self.config.stages)

        self.logger.info(
            f"[{completed}/{total}] {stage_name}: {status} | "
            f"items={items} | {throughput:.1f} items/s | "
            f"RSS={rss:.0f} MB | elapsed={elapsed:.1f}s"
        )

    # ------------------------------------------------------------------
    # Stage execution
    # ------------------------------------------------------------------

    async def _execute_stage(
        self,
        stage_name: str,
        input_data: Any,
    ) -> Any:
        """
        Execute a single pipeline stage with full lifecycle:
        1. Check shutdown flag
        2. Check checkpoint (skip if already completed)
        3. Load models
        4. Run stage within memory tracking
        5. Unload models + gc.collect
        6. Save checkpoint
        7. Check memory guardrails
        """
        spec = get_stage_spec(stage_name)
        self._current_stage = stage_name

        # --- Check shutdown ---
        if self._shutdown_requested:
            self.logger.warning(f"Shutdown requested, skipping stage '{stage_name}'")
            self.checkpoint.mark_stage_skipped(
                self._run_id, stage_name, "shutdown_requested"
            )
            return None

        # --- Check checkpoint (resume) ---
        if self.checkpoint.is_stage_completed(self._run_id, stage_name):
            cached_output = self.checkpoint.load_stage_output(self._run_id, stage_name)
            self.logger.info(f"Stage '{stage_name}' already completed (cached), skipping")
            return cached_output

        # --- Mark running ---
        self.checkpoint.mark_stage_running(self._run_id, stage_name)
        t0 = time.monotonic()
        rss_start = self._get_rss_mb()

        self.logger.info(
            f"{'=' * 60}\n"
            f"  STAGE: {spec.display_name}\n"
            f"  Budget: {spec.memory_budget_mb} MB | Models: {spec.models}\n"
            f"  RSS at start: {rss_start:.0f} MB\n"
            f"{'=' * 60}"
        )

        models: Dict[str, Any] = {}
        output = None
        items_processed = 0
        items_failed = 0

        try:
            # --- Load models ---
            if spec.models:
                self.logger.info(f"Loading models for '{stage_name}': {spec.models}")
                models = await load_stage_models(
                    stage_name,
                    self.config.model_dir,
                    self.config.to_dict(),
                )
                model_rss = self._get_rss_mb()
                self.logger.info(
                    f"Models loaded. RSS: {rss_start:.0f} -> {model_rss:.0f} MB "
                    f"(+{model_rss - rss_start:.0f} MB)"
                )

            # --- Memory guardrail check after model load ---
            if not self._check_memory_guardrail(stage_name):
                raise MemoryError(
                    f"RSS exceeds {self.config.rss_abort_threshold_gb} GB after loading models"
                )

            # --- Create and configure stage ---
            stage = create_stage(stage_name, self.config.data_dir, self.config.pipeline_db)
            stage.set_models(models)

            # Special case: evaluation stage needs all prior outputs
            if isinstance(stage, EvaluationStage):
                stage.set_all_outputs(self._stage_outputs)

            # --- Execute within memory tracking ---
            async with self.mem_system.memory_manager.track_stage(
                spec.display_name, spec.memory_budget_mb
            ):
                output = await stage.execute(input_data, self.config.to_dict())

            # --- Extract counts for checkpoint ---
            items_processed = self._count_items(output)

        except MemoryError as e:
            duration = time.monotonic() - t0
            error = StageError(
                stage_name=stage_name,
                timestamp=datetime.utcnow().isoformat(),
                error_type="MemoryError",
                error_message=str(e),
                traceback_str=traceback.format_exc(),
                recoverable=False,
            )
            self._errors.append(error)
            self.checkpoint.mark_stage_failed(
                self._run_id, stage_name, str(e), duration, self._get_rss_mb()
            )
            self.logger.critical(f"Stage '{stage_name}' aborted: {e}")
            # Force cleanup before returning
            await unload_stage_models(models, stage_name)
            self._force_memory_cleanup(stage_name)
            raise

        except Exception as e:
            duration = time.monotonic() - t0
            error = StageError(
                stage_name=stage_name,
                timestamp=datetime.utcnow().isoformat(),
                error_type=type(e).__name__,
                error_message=str(e),
                traceback_str=traceback.format_exc(),
                recoverable=spec.optional,
            )
            self._errors.append(error)
            self.checkpoint.mark_stage_failed(
                self._run_id, stage_name, str(e), duration, self._get_rss_mb()
            )
            self.logger.error(f"Stage '{stage_name}' failed: {e}", exc_info=True)

            if not spec.optional:
                # Non-optional stage: unload and re-raise
                await unload_stage_models(models, stage_name)
                self._force_memory_cleanup(stage_name)
                raise
            else:
                # Optional stage: log and continue
                self.logger.warning(f"Optional stage '{stage_name}' failed, continuing pipeline")

        finally:
            # --- Unload models ---
            if models:
                self.logger.info(f"Unloading models for '{stage_name}'")
                await unload_stage_models(models, stage_name)

            # --- Force memory cleanup ---
            self._force_memory_cleanup(stage_name)

            # --- Log progress ---
            duration = time.monotonic() - t0
            rss_end = self._get_rss_mb()
            self._log_progress(stage_name, "complete", items_processed, duration)
            self.logger.info(
                f"Stage '{stage_name}' finished: {duration:.1f}s, "
                f"RSS {rss_start:.0f} -> {rss_end:.0f} MB"
            )

        # --- Save checkpoint ---
        if output is not None:
            duration = time.monotonic() - t0
            checkpoint = StageCheckpoint(
                run_id=self._run_id,
                stage_name=stage_name,
                status=StageStatus.COMPLETED,
                started_at=datetime.utcnow().isoformat(),
                completed_at=datetime.utcnow().isoformat(),
                items_processed=items_processed,
                items_failed=items_failed,
                duration_seconds=duration,
                memory_rss_mb=rss_end,
                memory_peak_mb=self._peak_rss_mb,
                output_summary=self._serialize_output_summary(stage_name, output),
            )
            self.checkpoint.mark_stage_completed(self._run_id, stage_name, checkpoint)

        return output

    # ------------------------------------------------------------------
    # Main run loop
    # ------------------------------------------------------------------

    async def run(self) -> PipelineResult:
        """
        Execute the full pipeline.

        Returns PipelineResult with status, metrics, and error details.
        """
        self._install_signal_handlers()
        self._started_at = datetime.utcnow().isoformat()
        t0 = time.monotonic()

        stages_completed: List[str] = []
        stages_failed: List[str] = []
        stages_skipped: List[str] = []
        total_items = 0

        try:
            # --- Create or resume run ---
            if self.config.resume_run_id:
                self._run_id = self.config.resume_run_id
                run = self.checkpoint.get_run(self._run_id)
                if run is None:
                    raise ValueError(f"Cannot resume: run '{self._run_id}' not found")
                self.checkpoint.update_run_status(self._run_id, RunStatus.RESUMED)
                resume_point = self.checkpoint.get_resume_point(
                    self._run_id, self.config.stages
                )
                self.logger.info(
                    f"Resuming run {self._run_id} from stage '{resume_point}'"
                )
            else:
                self._run_id = self.checkpoint.create_run(
                    config=self.config.to_dict(),
                    stages=self.config.stages,
                )
                self.checkpoint.update_run_status(self._run_id, RunStatus.RUNNING)

            self.logger.info(
                f"Pipeline run {self._run_id}: "
                f"{len(self.config.stages)} stages, "
                f"stages={self.config.stages}"
            )

            # --- Execute stages sequentially ---
            previous_output: Any = None

            for stage_name in self.config.stages:
                spec = get_stage_spec(stage_name)

                # Determine input: either from previous stage or None (crawl)
                if spec.depends_on:
                    dep = spec.depends_on[-1]  # primary dependency
                    if dep in self._stage_outputs:
                        stage_input = self._stage_outputs[dep]
                    else:
                        # Dependency not available (skipped or failed)
                        self.logger.warning(
                            f"Stage '{stage_name}' dependency '{dep}' not available, skipping"
                        )
                        self.checkpoint.mark_stage_skipped(
                            self._run_id, stage_name,
                            f"dependency '{dep}' not available",
                        )
                        stages_skipped.append(stage_name)
                        continue
                else:
                    stage_input = None

                # Check shutdown
                if self._shutdown_requested:
                    self.checkpoint.mark_stage_skipped(
                        self._run_id, stage_name, "shutdown_requested"
                    )
                    stages_skipped.append(stage_name)
                    continue

                try:
                    output = await self._execute_stage(stage_name, stage_input)

                    if output is not None:
                        self._stage_outputs[stage_name] = output
                        stages_completed.append(stage_name)
                        total_items += self._count_items(output)
                    else:
                        # Stage returned None (shutdown or cache miss)
                        stages_skipped.append(stage_name)

                except MemoryError:
                    stages_failed.append(stage_name)
                    self.logger.critical(
                        f"Pipeline halted: MemoryError in non-optional stage '{stage_name}'"
                    )
                    break

                except Exception as e:
                    if spec.optional:
                        stages_skipped.append(stage_name)
                    else:
                        stages_failed.append(stage_name)
                        self.logger.error(
                            f"Pipeline halted: unrecoverable error in stage '{stage_name}': {e}"
                        )
                        break

            # --- Determine final status ---
            if stages_failed:
                final_status = "failed"
                self.checkpoint.update_run_status(self._run_id, RunStatus.FAILED)
            elif self._shutdown_requested:
                final_status = "interrupted"
                self.checkpoint.update_run_status(self._run_id, RunStatus.INTERRUPTED)
            else:
                final_status = "completed"
                self.checkpoint.update_run_status(self._run_id, RunStatus.COMPLETED)

        except Exception as e:
            self.logger.critical(f"Pipeline orchestrator error: {e}", exc_info=True)
            final_status = "failed"
            if self._run_id:
                self.checkpoint.update_run_status(self._run_id, RunStatus.FAILED)
            self._errors.append(StageError(
                stage_name="orchestrator",
                timestamp=datetime.utcnow().isoformat(),
                error_type=type(e).__name__,
                error_message=str(e),
                traceback_str=traceback.format_exc(),
                recoverable=False,
            ))

        finally:
            self._restore_signal_handlers()

        # --- Build result ---
        duration = time.monotonic() - t0
        finished_at = datetime.utcnow().isoformat()

        result = PipelineResult(
            run_id=self._run_id or "unknown",
            status=final_status,
            started_at=self._started_at or finished_at,
            finished_at=finished_at,
            duration_seconds=duration,
            stages_completed=stages_completed,
            stages_failed=stages_failed,
            stages_skipped=stages_skipped,
            total_items_processed=total_items,
            errors=self._errors,
            outputs={
                name: self._serialize_output_summary(name, out)
                for name, out in self._stage_outputs.items()
            },
            memory_peak_mb=self._peak_rss_mb,
        )

        # --- Save reports ---
        self._save_result(result)
        self.mem_system.save_memory_report(
            self.config.memory_log_dir / f"memory_{self._run_id}.json"
        )

        # --- Print checkpoint summary ---
        if self._run_id:
            self.checkpoint.print_run_summary(self._run_id)

        return result

    # ------------------------------------------------------------------
    # Run a single stage (for debugging/testing)
    # ------------------------------------------------------------------

    async def run_single_stage(
        self,
        stage_name: str,
        input_data: Any = None,
    ) -> Any:
        """
        Run a single stage independently.

        Useful for testing, debugging, or re-running a specific stage.
        Creates its own run context with a single-stage checkpoint.
        """
        self._install_signal_handlers()
        self._started_at = datetime.utcnow().isoformat()

        try:
            self._run_id = self.checkpoint.create_run(
                config=self.config.to_dict(),
                stages=[stage_name],
            )
            self.checkpoint.update_run_status(self._run_id, RunStatus.RUNNING)

            output = await self._execute_stage(stage_name, input_data)

            if output is not None:
                self._stage_outputs[stage_name] = output
                self.checkpoint.update_run_status(self._run_id, RunStatus.COMPLETED)
            else:
                self.checkpoint.update_run_status(self._run_id, RunStatus.FAILED)

            return output

        except Exception as e:
            self.logger.error(f"Single stage '{stage_name}' failed: {e}", exc_info=True)
            if self._run_id:
                self.checkpoint.update_run_status(self._run_id, RunStatus.FAILED)
            raise

        finally:
            self._restore_signal_handlers()

    # ------------------------------------------------------------------
    # Dry run (validate config + model availability)
    # ------------------------------------------------------------------

    async def dry_run(self) -> Dict[str, Any]:
        """
        Validate configuration and model availability without executing stages.

        Returns a dict with validation results for each stage.
        """
        results: Dict[str, Any] = {}

        for stage_name in self.config.stages:
            spec = get_stage_spec(stage_name)
            stage_result = {
                "name": stage_name,
                "display_name": spec.display_name,
                "memory_budget_mb": spec.memory_budget_mb,
                "models": spec.models,
                "models_available": {},
                "dependencies_met": True,
                "issues": [],
            }

            # Check dependencies
            for dep in spec.depends_on:
                if dep not in self.config.stages:
                    stage_result["dependencies_met"] = False
                    stage_result["issues"].append(f"Missing dependency: {dep}")

            # Check model files
            for model_name in spec.models:
                available = self._check_model_available(model_name)
                stage_result["models_available"][model_name] = available
                if not available:
                    stage_result["issues"].append(f"Model not found: {model_name}")

            results[stage_name] = stage_result

        # System memory check
        mem = psutil.virtual_memory()
        results["_system"] = {
            "total_memory_gb": round(mem.total / (1024 ** 3), 1),
            "available_memory_gb": round(mem.available / (1024 ** 3), 1),
            "current_rss_mb": round(self._get_rss_mb(), 1),
            "abort_threshold_gb": self.config.rss_abort_threshold_gb,
        }

        return results

    def _check_model_available(self, model_name: str) -> bool:
        """Check if a model's files exist on disk."""
        model_paths = {
            "dqn_onnx": self.config.model_dir / "dqn_policy.onnx",
            "gliner2_onnx": self.config.model_dir / "gliner2_int8.onnx",
            "lightgbm_onnx_bundle": self.config.model_dir / "lead_scoring_ensemble.onnx",
            "deberta_adapter": self.config.model_dir / "deberta_adapter",
        }
        path = model_paths.get(model_name)
        if path is not None:
            return path.exists()
        # Models loaded from HuggingFace/Ollama are assumed available
        return True

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _count_items(self, output: Any) -> int:
        """Extract item count from a stage output dataclass."""
        if output is None:
            return 0
        if isinstance(output, CrawlOutput):
            return output.total_crawled
        if isinstance(output, NEROutput):
            return len(output.entities)
        if isinstance(output, EntityResolutionOutput):
            return output.clusters_formed
        if isinstance(output, LeadScoringOutput):
            return output.total_scored
        if isinstance(output, ReportGenerationOutput):
            return output.total_generated
        if isinstance(output, EvaluationOutput):
            return 1  # single evaluation record
        if isinstance(output, dict):
            return output.get("items_processed", 0)
        return 0

    def _serialize_output_summary(self, stage_name: str, output: Any) -> Dict[str, Any]:
        """
        Create a JSON-serializable summary of stage output.
        Does NOT include full data (e.g. all entities), only counts and metrics.
        """
        if output is None:
            return {}
        if isinstance(output, dict):
            return output

        if isinstance(output, CrawlOutput):
            return {
                "total_crawled": output.total_crawled,
                "domains_visited": output.domains_visited,
                "crawl_duration_seconds": output.crawl_duration_seconds,
            }
        if isinstance(output, NEROutput):
            return {
                "pages_processed": output.pages_processed,
                "total_entities": len(output.entities),
                "entity_counts_by_type": output.entity_counts_by_type,
                "avg_confidence": output.avg_confidence,
            }
        if isinstance(output, EntityResolutionOutput):
            return {
                "entities_input": output.entities_input,
                "entities_resolved": output.entities_resolved,
                "clusters_formed": output.clusters_formed,
                "blocking_recall": output.blocking_recall,
                "matching_f1": output.matching_f1,
            }
        if isinstance(output, LeadScoringOutput):
            return {
                "total_scored": output.total_scored,
                "qualified_count": output.qualified_count,
                "avg_score": output.avg_score,
                "conformal_coverage": output.conformal_coverage,
            }
        if isinstance(output, ReportGenerationOutput):
            return {
                "total_generated": output.total_generated,
                "avg_factuality": output.avg_factuality,
                "avg_latency_seconds": output.avg_latency_seconds,
                "valid_json_rate": output.valid_json_rate,
            }
        if isinstance(output, EvaluationOutput):
            return {
                "drift_detected": output.drift_detected,
                "metrics": output.metrics,
            }
        return {}

    def _save_result(self, result: PipelineResult) -> None:
        """Save pipeline result to JSON file."""
        output_path = self.config.output_dir / f"result_{result.run_id}.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w") as f:
            json.dump(result.to_dict(), f, indent=2, default=str)
        self.logger.info(f"Saved pipeline result to {output_path}")

    # ------------------------------------------------------------------
    # Cleanup utilities
    # ------------------------------------------------------------------

    def cleanup_old_runs(self, max_age_days: int = 30) -> int:
        """Delete checkpoint records older than max_age_days."""
        deleted = self.checkpoint.cleanup_old_runs(max_age_days)
        if deleted > 0:
            self.checkpoint.vacuum()
        return deleted

    def list_runs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """List recent pipeline runs with summary info."""
        runs = []
        with self.checkpoint._connect() as conn:
            rows = conn.execute(
                """SELECT run_id, status, created_at, stages_completed, stages_total
                   FROM pipeline_runs ORDER BY created_at DESC LIMIT ?""",
                (limit,),
            ).fetchall()
        for row in rows:
            runs.append({
                "run_id": row["run_id"],
                "status": row["status"],
                "created_at": row["created_at"],
                "progress": f"{row['stages_completed']}/{row['stages_total']}",
            })
        return runs
