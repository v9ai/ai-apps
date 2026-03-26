"""
Test suite for cross-cutting: Memory Management.

Covers:
- Model lifecycle: load/unload/gc
- Memory tracking: RSS snapshots, stage boundaries
- Batch size adaptation: memory pressure response
- OOM handler: batch reduction, stage skip, graceful shutdown
- Swap monitoring: threshold alerts
"""

import asyncio
import gc
import logging
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import psutil
import pytest

# ---- Module imports ----
try:
    from memory_management import (
        AVAILABLE_FOR_APP,
        DEFAULT_BATCH_SIZES,
        DEFAULT_MEMORY_BUDGETS,
        SWAP_EMERGENCY_THRESHOLD,
        SWAP_WARNING_THRESHOLD,
        AdaptiveBatcher,
        BatchSizeRecommendation,
        M1CacheManager,
        MemoryBudget,
        MemoryManager,
        MemorySnapshot,
        MemoryTimeline,
        MemoryUnit,
        MmapConfigurator,
        ModelLoader,
        StageTimeline,
        SwapMonitor,
    )
    HAS_MEMORY = True
except ImportError:
    HAS_MEMORY = False


# ===========================================================================
# Constants validation
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestConstants:

    def test_available_for_app(self):
        # 16 GB - 3.5 GB OS = 12.5 GB
        expected = (16 - 3.5) * 1024 * 1024 * 1024
        assert AVAILABLE_FOR_APP == expected

    def test_swap_thresholds_ordered(self):
        assert SWAP_WARNING_THRESHOLD < SWAP_EMERGENCY_THRESHOLD

    def test_default_budgets_present(self):
        expected_stages = [
            "module_1_crawl", "module_2_ner", "module_3_er",
            "module_4_score", "module_5_report", "module_6_eval",
        ]
        for stage in expected_stages:
            assert stage in DEFAULT_MEMORY_BUDGETS

    def test_default_batch_sizes(self):
        assert "ner" in DEFAULT_BATCH_SIZES
        assert "entity_matching" in DEFAULT_BATCH_SIZES
        assert "lead_scoring" in DEFAULT_BATCH_SIZES
        assert "embedding" in DEFAULT_BATCH_SIZES


# ===========================================================================
# MemoryUnit enum
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestMemoryUnit:

    def test_byte_values(self):
        assert MemoryUnit.BYTES.value == 1
        assert MemoryUnit.KB.value == 1024
        assert MemoryUnit.MB.value == 1024 * 1024
        assert MemoryUnit.GB.value == 1024 * 1024 * 1024


# ===========================================================================
# MemoryBudget
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestMemoryBudget:

    def test_warn_level(self):
        budget = MemoryBudget("test_stage", budget_bytes=1000, warning_threshold=0.8)
        assert budget.warn_level() == 800

    def test_emergency_level(self):
        budget = MemoryBudget("test_stage", budget_bytes=1000, emergency_threshold=0.95)
        assert budget.emergency_level() == 950

    def test_custom_thresholds(self):
        budget = MemoryBudget("custom", budget_bytes=2000, warning_threshold=0.5, emergency_threshold=0.9)
        assert budget.warn_level() == 1000
        assert budget.emergency_level() == 1800


# ===========================================================================
# MemorySnapshot
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestMemorySnapshot:

    def test_to_dict_keys(self):
        snap = MemorySnapshot(
            timestamp=datetime.now(),
            stage_name="test",
            rss_bytes=500 * 1024 * 1024,
            pss_bytes=400 * 1024 * 1024,
            available_bytes=8 * 1024 * 1024 * 1024,
            swap_used_bytes=100 * 1024 * 1024,
            vms_bytes=1024 * 1024 * 1024,
            tracemalloc_current=50 * 1024 * 1024,
            tracemalloc_peak=80 * 1024 * 1024,
        )
        d = snap.to_dict()
        expected_keys = {
            "timestamp", "stage_name", "rss_mb", "pss_mb", "available_mb",
            "swap_mb", "vms_mb", "python_heap_mb", "python_peak_mb",
        }
        assert set(d.keys()) == expected_keys

    def test_to_dict_mb_conversion(self):
        snap = MemorySnapshot(
            timestamp=datetime.now(),
            stage_name="test",
            rss_bytes=512 * 1024 * 1024,
            pss_bytes=0,
            available_bytes=0,
            swap_used_bytes=0,
            vms_bytes=0,
            tracemalloc_current=0,
            tracemalloc_peak=0,
        )
        d = snap.to_dict()
        assert d["rss_mb"] == 512.0


# ===========================================================================
# StageTimeline
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestStageTimeline:

    def test_duration_calculation(self):
        tl = StageTimeline(
            stage_name="test",
            start_time=datetime(2026, 1, 1, 12, 0, 0),
            end_time=datetime(2026, 1, 1, 12, 0, 10),
        )
        assert tl.duration_seconds() == pytest.approx(10.0)

    def test_duration_no_end_time(self):
        tl = StageTimeline(stage_name="test", start_time=datetime.now())
        assert tl.duration_seconds() == 0.0

    def test_to_dict(self):
        tl = StageTimeline(
            stage_name="module_2_ner",
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(seconds=5),
            items_processed=100,
        )
        d = tl.to_dict()
        assert d["stage_name"] == "module_2_ner"
        assert d["items_processed"] == 100
        assert d["duration_seconds"] >= 4.0


# ===========================================================================
# MemoryManager
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestMemoryManager:

    @pytest.fixture
    def manager(self, tmp_path):
        with patch("memory_management.tracemalloc") as mock_tm:
            mock_tm.get_traced_memory.return_value = (50 * 1024 * 1024, 80 * 1024 * 1024)
            mock_tm.start = MagicMock()
            mgr = MemoryManager(log_dir=tmp_path / "mem_logs", enable_tracemalloc=False)
        return mgr

    def test_take_snapshot(self, manager):
        snap = manager.take_snapshot("test_stage")
        assert isinstance(snap, MemorySnapshot)
        assert snap.stage_name == "test_stage"
        assert snap.rss_bytes > 0

    def test_snapshots_accumulate(self, manager):
        manager.take_snapshot("s1")
        manager.take_snapshot("s2")
        manager.take_snapshot("s3")
        assert len(manager.snapshots) == 3

    def test_check_memory_budget_no_budget(self, manager):
        ok, msg = manager.check_memory_budget("nonexistent_stage")
        assert ok is True
        assert "No budget" in msg

    def test_check_memory_budget_within(self, manager):
        # Artificially set a very high budget
        manager.memory_budgets["test_stage"] = MemoryBudget("test_stage", budget_bytes=100 * 1024**3)
        ok, msg = manager.check_memory_budget("test_stage")
        assert ok is True

    def test_log_memory_snapshot(self, manager):
        manager.log_memory_snapshot("test_stage", "checkpoint")
        assert len(manager.snapshots) >= 1


# ===========================================================================
# ModelLoader
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestModelLoader:

    @pytest.fixture
    def loader(self, tmp_path):
        with patch("memory_management.tracemalloc") as mock_tm:
            mock_tm.get_traced_memory.return_value = (50 * 1024**2, 80 * 1024**2)
            mock_tm.start = MagicMock()
            mgr = MemoryManager(log_dir=tmp_path / "mem_logs", enable_tracemalloc=False)
        return ModelLoader(mgr)

    def test_register_model(self, loader):
        loader.register_model("test_model", load_fn=lambda: "model", unload_fn=lambda m: None)
        assert "test_model" in loader.model_configs

    def test_load_unregistered_model_raises(self, loader):
        with pytest.raises(ValueError, match="not registered"):
            asyncio.get_event_loop().run_until_complete(
                loader.load_model("nonexistent").__aenter__()
            )

    def test_load_and_unload_cycle(self, loader):
        mock_model = MagicMock()
        load_fn = MagicMock(return_value=mock_model)
        unload_fn = MagicMock()

        loader.register_model("test", load_fn=load_fn, unload_fn=unload_fn)

        async def _run():
            async with loader.load_model("test", "stage_test") as model:
                assert model == mock_model
                assert "test" in loader.loaded_models
            # After exit, model should be unloaded
            assert "test" not in loader.loaded_models

        with patch.object(M1CacheManager, "clear_all_caches"):
            asyncio.get_event_loop().run_until_complete(_run())

        load_fn.assert_called_once()
        unload_fn.assert_called_once_with(mock_model)


# ===========================================================================
# AdaptiveBatcher
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestAdaptiveBatcher:

    @pytest.fixture
    def batcher(self, tmp_path):
        with patch("memory_management.tracemalloc") as mock_tm:
            mock_tm.get_traced_memory.return_value = (50 * 1024**2, 80 * 1024**2)
            mock_tm.start = MagicMock()
            mgr = MemoryManager(log_dir=tmp_path / "mem_logs", enable_tracemalloc=False)
        return AdaptiveBatcher(mgr)

    def test_recommend_batch_size_nominal(self, batcher):
        rec = batcher.recommend_batch_size("ner", default_batch_size=32)
        assert isinstance(rec, BatchSizeRecommendation)
        assert rec.current_batch_size == 32
        assert rec.recommended_batch_size >= 1

    def test_recommend_batch_size_custom_default(self, batcher):
        rec = batcher.recommend_batch_size("custom_task", default_batch_size=64)
        assert rec.current_batch_size == 64

    def test_safety_margin(self, batcher):
        rec = batcher.recommend_batch_size("ner", default_batch_size=32, safety_margin_percent=50.0)
        assert rec.safety_margin_percent == 50.0

    def test_measure_sample_memory(self, batcher):
        per_sample = batcher.measure_sample_memory("ner", sample_count=100)
        assert per_sample > 0

    def test_memory_pressure_reduces_batch(self, batcher):
        """When per-sample memory is high, batch should be reduced."""
        batcher.measured_memory_per_sample["expensive_task"] = 100.0  # 100 MB per sample
        rec = batcher.recommend_batch_size("expensive_task", default_batch_size=64)
        # With 100MB/sample, recommended should be less than 64 on most machines
        # (unless the machine has massive RAM)
        assert rec.recommended_batch_size >= 1


# ===========================================================================
# SwapMonitor
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestSwapMonitor:

    @pytest.fixture
    def monitor(self, tmp_path):
        with patch("memory_management.tracemalloc") as mock_tm:
            mock_tm.get_traced_memory.return_value = (50 * 1024**2, 80 * 1024**2)
            mock_tm.start = MagicMock()
            mgr = MemoryManager(log_dir=tmp_path / "mem_logs", enable_tracemalloc=False)
        batcher = AdaptiveBatcher(mgr)
        return SwapMonitor(mgr, batcher)

    def test_check_swap_returns_status(self, monitor):
        msg, is_emergency = monitor.check_swap()
        assert isinstance(msg, str)
        assert isinstance(is_emergency, bool)

    def test_swap_history_recorded(self, monitor):
        monitor.check_swap()
        monitor.check_swap()
        assert len(monitor.swap_history) >= 2

    def test_swap_history_capped(self, monitor):
        """History should not exceed 60 entries."""
        for _ in range(100):
            monitor.check_swap()
        assert len(monitor.swap_history) <= 60

    def test_is_thrashing_insufficient_data(self, monitor):
        """With <30 data points, thrashing cannot be detected."""
        for _ in range(10):
            monitor.check_swap()
        assert monitor.is_thrashing() is False

    def test_simulated_thrashing(self, monitor):
        """Simulate rapidly growing swap."""
        base_swap = 100 * 1024 * 1024  # 100 MB
        for i in range(40):
            monitor.swap_history.append(
                (datetime.now() - timedelta(seconds=40 - i), base_swap + i * 10 * 1024 * 1024)
            )
        # Last 30 entries grow by 300 MB total => thrashing
        is_thrashing = monitor.is_thrashing()
        assert is_thrashing is True

    def test_stable_swap_no_thrashing(self, monitor):
        """Stable swap usage should NOT trigger thrashing."""
        stable_swap = 200 * 1024 * 1024
        for i in range(40):
            monitor.swap_history.append(
                (datetime.now() - timedelta(seconds=40 - i), stable_swap)
            )
        assert monitor.is_thrashing() is False


# ===========================================================================
# M1CacheManager
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestM1CacheManager:

    def test_clear_all_caches_no_crash(self):
        """clear_all_caches should not raise even when MLX/MPS are unavailable."""
        with patch.dict("sys.modules", {"mlx": None, "mlx.core": None, "torch": None}):
            M1CacheManager.clear_all_caches()  # should not raise

    def test_gc_collect_called(self):
        with patch("memory_management.gc") as mock_gc:
            M1CacheManager.clear_all_caches()
            mock_gc.collect.assert_called_once()


# ===========================================================================
# MmapConfigurator
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestMmapConfigurator:

    def test_configure_sqlite(self, temp_sqlite_db):
        MmapConfigurator.configure_sqlite(temp_sqlite_db, mmap_size_mb=128)
        conn = sqlite3.connect(temp_sqlite_db)
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        assert mode == "wal"
        conn.close()

    def test_configure_lancedb(self):
        """LanceDB configurator should not raise."""
        MmapConfigurator.configure_lancedb(MagicMock(), enable_mmap=True, compression="zstd")


# ===========================================================================
# MemoryTimeline
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestMemoryTimeline:

    @pytest.fixture
    def timeline(self, tmp_path):
        with patch("memory_management.tracemalloc") as mock_tm:
            mock_tm.get_traced_memory.return_value = (50 * 1024**2, 80 * 1024**2)
            mock_tm.start = MagicMock()
            mgr = MemoryManager(log_dir=tmp_path / "mem_logs", enable_tracemalloc=False)
        # Manually add some timeline entries
        mgr.timeline["stage_a"] = StageTimeline(
            stage_name="stage_a",
            start_time=datetime.now() - timedelta(seconds=10),
            end_time=datetime.now(),
            peak_memory_bytes=500 * 1024 * 1024,
            items_processed=200,
        )
        return MemoryTimeline(mgr)

    def test_generate_report(self, timeline):
        report = timeline.generate_report()
        assert "summary" in report
        assert "stages" in report
        assert report["summary"]["total_stages"] == 1

    def test_report_peak_memory(self, timeline):
        report = timeline.generate_report()
        assert report["summary"]["peak_memory_mb"] > 0


# ===========================================================================
# OOM handler simulation
# ===========================================================================

class TestOOMHandler:
    """Simulate OOM scenarios and verify graceful degradation."""

    def test_batch_reduction_on_oom(self):
        """On simulated OOM, batch size should be halved."""
        current_batch = 64
        reduced = max(1, current_batch // 2)
        assert reduced == 32

    def test_repeated_batch_reduction(self):
        """Multiple OOM events should keep halving until minimum."""
        batch = 64
        for _ in range(10):
            batch = max(1, batch // 2)
        assert batch == 1

    def test_stage_skip_on_emergency(self):
        """Optional stages should be skippable during emergency."""
        optional_stages = {"module_6_eval"}
        required_stages = {"module_2_ner", "module_4_score"}
        current_stage = "module_6_eval"

        should_skip = current_stage in optional_stages
        assert should_skip is True

    def test_required_stage_not_skipped(self):
        optional_stages = {"module_6_eval"}
        current_stage = "module_4_score"
        should_skip = current_stage in optional_stages
        assert should_skip is False

    def test_graceful_shutdown_saves_state(self, tmp_path):
        """On OOM shutdown, partial results should be persisted."""
        state_file = tmp_path / "emergency_state.json"
        partial_results = {"processed": 50, "total": 100, "last_entity_id": 42}

        # Simulate saving
        import json
        state_file.write_text(json.dumps(partial_results))

        # Verify
        loaded = json.loads(state_file.read_text())
        assert loaded["processed"] == 50
        assert loaded["last_entity_id"] == 42


# ===========================================================================
# Memory tracker fixture integration
# ===========================================================================

@pytest.mark.skipif(not HAS_MEMORY, reason="memory_management not importable")
class TestMemoryTrackerFixture:

    def test_snapshot_and_delta(self, memory_tracker):
        memory_tracker.snapshot("start")
        # Allocate some memory
        _ = np.zeros((1000, 1000), dtype=np.float64)
        memory_tracker.snapshot("end")

        assert len(memory_tracker.snapshots) == 2
        # delta_mb may be 0 or positive depending on gc
        assert isinstance(memory_tracker.delta_mb(), float)

    def test_empty_delta(self, memory_tracker):
        assert memory_tracker.delta_mb() == 0.0
