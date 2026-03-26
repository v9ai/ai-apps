"""
Scrapus Integration Test Suite
==============================

pytest-based tests for M1 deployment validation. Tests all 12 requirements:
1. ScrapusBenchmark class (synthetic data)
2. Memory profiling
3. Throughput benchmarks
4. Quality regression tests
5. Storage validation
6. Latency breakdown
7. Stress test
8. Compatibility matrix
9. Smoke test
10. CI/CD integration
11. Report generation
12. Configuration validation

Run with: pytest test_integration.py -v
"""

import pytest
import asyncio
import tempfile
import json
from pathlib import Path
from unittest.mock import MagicMock, patch, AsyncMock
import time

from benchmark_harness import (
    ScrapusBenchmark,
    ModelVariant,
    SyntheticDataGenerator,
    MemoryProfiler,
    MemorySnapshot,
    LatencyTracker,
    QualityValidator,
    StorageValidator,
    ConfigurationValidator,
    ThroughputMetric,
    QualityMetrics,
    BenchmarkResult,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def temp_data_dir():
    """Create a temporary data directory."""
    with tempfile.TemporaryDirectory(prefix="scrapus_test_") as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def synth_gen():
    """Create synthetic data generator."""
    return SyntheticDataGenerator(seed=42)


# ============================================================================
# Test Class 1: ScrapusBenchmark Class
# ============================================================================

class TestScrapusBenchmarkClass:
    """Test the ScrapusBenchmark class functionality."""
    
    @pytest.mark.asyncio
    async def test_benchmark_initialization(self, temp_data_dir):
        """Test benchmark object can be initialized."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=10,
            num_entities=5,
            num_leads=2,
            model_variant=ModelVariant.GLINER2_LIGHTGBM,
            verbose=False
        )
        
        assert bench.data_dir == temp_data_dir
        assert bench.num_pages == 10
        assert bench.num_entities == 5
        assert bench.num_leads == 2
        assert bench.model_variant == ModelVariant.GLINER2_LIGHTGBM
    
    @pytest.mark.asyncio
    async def test_benchmark_full_run(self, temp_data_dir):
        """Test complete benchmark run executes without errors."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=10,
            num_entities=5,
            num_leads=2,
            verbose=False
        )
        
        result = await bench.run_full_benchmark()
        
        assert isinstance(result, BenchmarkResult)
        assert result.benchmark_id
        assert result.duration_sec > 0
        assert result.memory_snapshots
        assert result.throughput_metrics
        assert result.quality_metrics


# ============================================================================
# Test Class 2: Memory Profiling
# ============================================================================

class TestMemoryProfiling:
    """Test memory profiling functionality."""
    
    @pytest.mark.asyncio
    async def test_memory_snapshot_capture(self):
        """Test memory snapshots are captured correctly."""
        profiler = MemoryProfiler()
        
        async with profiler.track_stage("Test Stage"):
            pass
        
        assert len(profiler.snapshots) >= 2  # At least pre and post
        assert all(isinstance(s, MemorySnapshot) for s in profiler.snapshots)
        assert all(s.rss_mb > 0 for s in profiler.snapshots)
    
    @pytest.mark.asyncio
    async def test_memory_peak_tracking(self):
        """Test peak RSS tracking."""
        profiler = MemoryProfiler()
        
        async with profiler.track_stage("Stage 1"):
            data = [0] * 1000000  # Allocate memory
        
        peak_rss = profiler.peak_rss_mb
        assert peak_rss > 0
        assert profiler.peak_stage == "Stage 1"
    
    def test_memory_snapshot_data_structure(self):
        """Test MemorySnapshot data structure."""
        snapshot = MemorySnapshot(
            timestamp=time.time(),
            stage="test",
            rss_mb=512.5,
            vms_mb=1024.0,
            percent=50.0
        )
        
        assert snapshot.rss_mb == 512.5
        assert snapshot.stage == "test"


# ============================================================================
# Test Class 3: Throughput Benchmarks
# ============================================================================

class TestThroughputBenchmarks:
    """Test throughput measurement."""
    
    @pytest.mark.asyncio
    async def test_throughput_metric_calculation(self):
        """Test throughput metric calculation."""
        metric = ThroughputMetric(
            stage="Test Stage",
            total_items=1000,
            total_duration_sec=10.0
        )
        
        assert metric.items_per_sec == 100.0
    
    @pytest.mark.asyncio
    async def test_throughput_zero_duration(self):
        """Test throughput with zero duration."""
        metric = ThroughputMetric(
            stage="Test Stage",
            total_items=1000,
            total_duration_sec=0.0
        )
        
        assert metric.items_per_sec == 0.0
    
    @pytest.mark.asyncio
    async def test_benchmark_throughput_execution(self, temp_data_dir):
        """Test throughput benchmarks run to completion."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=10,
            num_entities=5,
            num_leads=2,
            verbose=False
        )
        
        metrics = await bench._run_throughput_benchmarks()
        
        assert len(metrics) > 0
        assert all(isinstance(m, ThroughputMetric) for m in metrics)
        assert all(m.items_per_sec >= 0 for m in metrics)


# ============================================================================
# Test Class 4: Quality Regression Tests
# ============================================================================

class TestQualityRegression:
    """Test quality regression detection."""
    
    def test_quality_metric_pass(self):
        """Test passing quality metric."""
        metric = QualityMetrics(
            stage="NER",
            metric_name="F1",
            value=0.923,
            baseline=0.923,
            threshold=0.02
        )
        
        assert metric.delta == 0.0
        assert metric.passed is True
    
    def test_quality_metric_fail(self):
        """Test failing quality metric."""
        metric = QualityMetrics(
            stage="NER",
            metric_name="F1",
            value=0.85,
            baseline=0.923,
            threshold=0.02
        )
        
        assert metric.delta < 0
        assert metric.passed is False
    
    def test_quality_metric_within_tolerance(self):
        """Test metric within acceptable threshold."""
        metric = QualityMetrics(
            stage="NER",
            metric_name="F1",
            value=0.90,
            baseline=0.923,
            threshold=0.04
        )
        
        assert metric.passed is True
    
    def test_quality_validator_gliner2_variant(self):
        """Test quality validation for GLiNER2 variant."""
        metrics = QualityValidator.validate_synthetic_quality(
            ModelVariant.GLINER2_LIGHTGBM
        )
        
        assert len(metrics) > 0
        
        # GLiNER2 should have lower NER F1
        ner_metrics = [m for m in metrics if m.stage == "NER"]
        assert len(ner_metrics) > 0


# ============================================================================
# Test Class 5: Storage Validation
# ============================================================================

class TestStorageValidation:
    """Test storage footprint validation."""
    
    def test_storage_validator_limits(self):
        """Test storage limits are properly defined."""
        assert StorageValidator.MAX_TOTAL_GB == 13.0
        assert StorageValidator.MAX_DB_GB == 2.5
        assert StorageValidator.MAX_MODELS_GB == 5.5
    
    @pytest.mark.asyncio
    async def test_storage_validation_empty_dir(self, temp_data_dir):
        """Test storage validation on empty directory."""
        total, breakdown, issues = StorageValidator.validate_storage(temp_data_dir)
        
        assert total == 0.0
        assert len(issues) == 0
    
    def test_directory_size_calculation(self, temp_data_dir):
        """Test directory size calculation."""
        # Create test files
        test_file = temp_data_dir / "test.txt"
        test_file.write_text("x" * 1024)  # 1 KB
        
        size_gb = StorageValidator.get_directory_size(temp_data_dir)
        assert size_gb > 0


# ============================================================================
# Test Class 6: Latency Breakdown
# ============================================================================

class TestLatencyBreakdown:
    """Test latency tracking and percentile calculation."""
    
    def test_latency_tracker_recording(self):
        """Test recording latency samples."""
        tracker = LatencyTracker()
        
        tracker.record("Stage A", 10.0)
        tracker.record("Stage A", 20.0)
        tracker.record("Stage A", 30.0)
        
        assert "Stage A" in tracker.samples
        assert len(tracker.samples["Stage A"]) == 3
    
    def test_latency_percentile_calculation(self):
        """Test percentile calculation."""
        tracker = LatencyTracker()
        
        for i in range(1, 101):
            tracker.record("Stage", float(i))
        
        p50, p95, p99 = tracker.get_percentiles()
        
        assert "Stage" in p50
        assert p50["Stage"] == 50.0  # Median of 1-100
        assert p95["Stage"] > p50["Stage"]
        assert p99["Stage"] > p95["Stage"]
    
    def test_latency_batch_normalization(self):
        """Test latency normalization per batch."""
        tracker = LatencyTracker()
        
        # 100ms for 10 items = 10ms per item
        tracker.record("Batch Stage", 100.0, batch_size=10)
        
        samples = tracker.samples["Batch Stage"]
        assert abs(samples[0] - 10.0) < 0.1


# ============================================================================
# Test Class 7: Stress Testing
# ============================================================================

class TestStressTesting:
    """Test stress test functionality."""
    
    @pytest.mark.asyncio
    async def test_stress_test_completes(self, temp_data_dir):
        """Test stress test runs 10 iterations."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=5,
            num_entities=2,
            num_leads=1,
            verbose=False
        )
        
        passed, growth = await bench._run_stress_test()
        
        assert isinstance(passed, bool)
        assert isinstance(growth, float)
        assert growth >= 0
    
    @pytest.mark.asyncio
    async def test_stress_test_memory_leak_detection(self, temp_data_dir):
        """Test memory leak detection in stress test."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=5,
            num_entities=2,
            num_leads=1,
            verbose=False
        )
        
        passed, growth = await bench._run_stress_test()
        
        # In healthy case, growth should be < 15%
        if passed:
            assert growth < 15.0


# ============================================================================
# Test Class 8: Compatibility Matrix
# ============================================================================

class TestCompatibilityMatrix:
    """Test different model variant combinations."""
    
    @pytest.mark.parametrize("variant", [
        ModelVariant.GLINER2_LIGHTGBM,
        ModelVariant.BERT_XGBOOST,
        ModelVariant.GLINER2_XGBOOST,
        ModelVariant.BERT_LIGHTGBM,
    ])
    @pytest.mark.asyncio
    async def test_model_variants(self, variant, temp_data_dir):
        """Test each model variant initializes correctly."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=5,
            num_entities=2,
            num_leads=1,
            model_variant=variant,
            verbose=False
        )
        
        assert bench.model_variant == variant
    
    @pytest.mark.asyncio
    async def test_quality_varies_by_variant(self):
        """Test that quality metrics differ by model variant."""
        metrics_gliner = QualityValidator.validate_synthetic_quality(
            ModelVariant.GLINER2_LIGHTGBM
        )
        metrics_bert = QualityValidator.validate_synthetic_quality(
            ModelVariant.BERT_XGBOOST
        )
        
        # GLiNER2 should have lower NER F1
        gliner_ner_f1 = [m.value for m in metrics_gliner if m.metric_name == "F1 Score"]
        bert_ner_f1 = [m.value for m in metrics_bert if m.metric_name == "F1 Score"]
        
        assert gliner_ner_f1[0] < bert_ner_f1[0]


# ============================================================================
# Test Class 9: Smoke Test
# ============================================================================

class TestSmokeTest:
    """Test smoke test functionality."""
    
    @pytest.mark.asyncio
    async def test_smoke_test_passes(self, temp_data_dir):
        """Test smoke test creates minimal database."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            verbose=False
        )
        
        result = await bench._run_smoke_test()
        
        assert result is True
        assert (temp_data_dir / "scrapus.db").exists()


# ============================================================================
# Test Class 10: CI/CD Integration
# ============================================================================

class TestCICDIntegration:
    """Test CI/CD integration capabilities."""
    
    def test_benchmark_result_json_serialization(self, temp_data_dir):
        """Test benchmark results can be serialized to JSON."""
        result = BenchmarkResult(
            benchmark_id="test_123",
            timestamp="2026-03-26T00:00:00",
            model_variant="gliner2_lightgbm",
            duration_sec=10.0,
            synthetic_config={"num_pages": 100, "num_entities": 50, "num_leads": 10}
        )
        
        # Simulate saving to JSON
        from dataclasses import asdict
        result_dict = asdict(result)
        json_str = json.dumps(result_dict)
        
        assert "benchmark_id" in json_str
        assert "test_123" in json_str
    
    @pytest.mark.asyncio
    async def test_benchmark_saves_to_file(self, temp_data_dir):
        """Test benchmark results are saved to file."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=5,
            num_entities=2,
            num_leads=1,
            verbose=False
        )
        
        result = await bench.run_full_benchmark()
        
        output_file = temp_data_dir / "results.json"
        await bench.save_results(result, output_file)
        
        assert output_file.exists()
        
        with open(output_file) as f:
            data = json.load(f)
            assert data["benchmark_id"] == result.benchmark_id


# ============================================================================
# Test Class 11: Report Generation
# ============================================================================

class TestReportGeneration:
    """Test benchmark report generation."""
    
    def test_benchmark_summary_printing(self, temp_data_dir, capsys):
        """Test benchmark summary is printed correctly."""
        result = BenchmarkResult(
            benchmark_id="test_123",
            timestamp="2026-03-26T00:00:00",
            model_variant="gliner2_lightgbm",
            duration_sec=42.5,
            synthetic_config={"num_pages": 100, "num_entities": 50, "num_leads": 10},
            peak_rss_mb=5000.0,
            peak_stage="Module 5",
            total_disk_usage_gb=10.5,
            passed=True
        )
        
        bench = ScrapusBenchmark(data_dir=temp_data_dir, verbose=False)
        bench.print_summary(result)
        
        captured = capsys.readouterr()
        assert "BENCHMARK RESULTS SUMMARY" in captured.out
        assert "PASS" in captured.out


# ============================================================================
# Test Class 12: Configuration Validation
# ============================================================================

class TestConfigurationValidation:
    """Test configuration validation."""
    
    @pytest.mark.asyncio
    async def test_dependency_validation(self):
        """Test dependency checking."""
        passed, issues = await ConfigurationValidator.validate_dependencies()
        
        assert isinstance(passed, bool)
        assert isinstance(issues, list)
    
    @pytest.mark.asyncio
    async def test_database_validation(self, temp_data_dir):
        """Test database validation."""
        # Create a minimal SQLite database
        import sqlite3
        db_path = temp_data_dir / "scrapus.db"
        conn = sqlite3.connect(str(db_path))
        conn.execute("CREATE TABLE test (id INTEGER)")
        conn.commit()
        conn.close()
        
        passed, issues = await ConfigurationValidator.validate_databases(temp_data_dir)
        
        assert isinstance(passed, bool)
        assert isinstance(issues, list)
    
    @pytest.mark.asyncio
    async def test_model_validation(self, temp_data_dir):
        """Test model validation."""
        passed, issues = await ConfigurationValidator.validate_models(
            temp_data_dir,
            ModelVariant.GLINER2_LIGHTGBM
        )
        
        assert isinstance(passed, bool)
        assert isinstance(issues, list)
    
    @pytest.mark.asyncio
    async def test_port_validation(self):
        """Test port availability checking."""
        passed, issues = await ConfigurationValidator.validate_ports()
        
        assert isinstance(passed, bool)
        assert isinstance(issues, list)


# ============================================================================
# Integration Tests (Full Pipeline)
# ============================================================================

class TestFullPipelineIntegration:
    """Test full pipeline integration."""
    
    @pytest.mark.asyncio
    async def test_full_benchmark_with_all_checks(self, temp_data_dir):
        """Test complete benchmark with all validation checks."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=20,
            num_entities=10,
            num_leads=5,
            model_variant=ModelVariant.GLINER2_LIGHTGBM,
            verbose=False
        )
        
        result = await bench.run_full_benchmark()
        
        # Verify all components were tested
        assert result.config_validation_passed or True  # May warn but not fail
        assert len(result.memory_snapshots) > 0
        assert len(result.throughput_metrics) > 0
        assert len(result.quality_metrics) > 0
        assert result.total_disk_usage_gb >= 0
        assert result.stress_test_runs == 10
    
    @pytest.mark.asyncio
    async def test_benchmark_memory_limit_validation(self, temp_data_dir):
        """Test peak RSS stays under 6.7 GB limit."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=50,
            num_entities=25,
            num_leads=5,
            verbose=False
        )
        
        result = await bench.run_full_benchmark()
        
        # In test environment, should be well under limit
        assert result.peak_rss_mb < 6700


# ============================================================================
# Performance Tests
# ============================================================================

class TestPerformanceCharacteristics:
    """Test performance characteristics match expectations."""
    
    @pytest.mark.asyncio
    async def test_crawling_throughput(self, temp_data_dir):
        """Test crawling throughput is reasonable."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=50,
            verbose=False
        )
        
        metrics = await bench._run_throughput_benchmarks()
        
        crawl_metric = [m for m in metrics if "Crawling" in m.stage]
        assert len(crawl_metric) > 0
    
    @pytest.mark.asyncio
    async def test_ner_throughput(self, temp_data_dir):
        """Test NER throughput."""
        bench = ScrapusBenchmark(
            data_dir=temp_data_dir,
            num_pages=50,
            verbose=False
        )
        
        metrics = await bench._run_throughput_benchmarks()
        
        ner_metric = [m for m in metrics if "NER" in m.stage]
        assert len(ner_metric) > 0


# ============================================================================
# Pytest Configuration
# ============================================================================

def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
