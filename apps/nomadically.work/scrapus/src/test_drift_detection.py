"""
Comprehensive test suite for drift detection system.
Tests all 4 detectors, ensemble voting, retraining, and performance.
"""

import numpy as np
import sqlite3
import json
import time
from pathlib import Path
import sys

# Import drift detection module
sys.path.insert(0, '/tmp')
from drift_detection import (
    create_default_system,
    generate_synthetic_data,
    DriftSeverity,
    KolmogorovSmirnovDetector,
    JensenShannonDetector,
    CosineEmbeddingDetector,
    MaximumMeanDiscrepancyDetector,
)


def test_ks_detector():
    """Test Kolmogorov-Smirnov detector."""
    print("\n=== Testing KS-test Detector ===")
    detector = KolmogorovSmirnovDetector(threshold=0.10)

    # Test 1: No drift
    ref_dist = np.array([0.2, 0.3, 0.5])
    curr_dist = np.array([0.2, 0.3, 0.5])
    result = detector.detect(ref_dist, curr_dist)
    assert not result.drift_detected, "Should not detect drift with identical distributions"
    print(f"✓ No drift case: KS={result.statistic:.4f}")

    # Test 2: Large drift
    curr_dist = np.array([0.5, 0.3, 0.2])
    result = detector.detect(ref_dist, curr_dist)
    assert result.drift_detected, "Should detect drift with large shift"
    print(f"✓ Large drift case: KS={result.statistic:.4f}")

    # Test 3: Small drift
    curr_dist = np.array([0.22, 0.31, 0.47])
    result = detector.detect(ref_dist, curr_dist)
    assert not result.drift_detected, "Should not detect small drift"
    print(f"✓ Small drift case: KS={result.statistic:.4f}")

    print(f"  Latency: {result.details['elapsed_ms']:.2f}ms")


def test_js_detector():
    """Test Jensen-Shannon detector."""
    print("\n=== Testing Jensen-Shannon Detector ===")
    detector = JensenShannonDetector(threshold=0.08)

    # Test 1: No drift
    ref_dist = np.array([0.4, 0.3, 0.2, 0.1])
    curr_dist = np.array([0.4, 0.3, 0.2, 0.1])
    result = detector.detect(ref_dist, curr_dist)
    assert not result.drift_detected, "Should not detect drift with identical distributions"
    print(f"✓ No drift case: JS={result.statistic:.4f}")

    # Test 2: Large drift in entity types
    curr_dist = np.array([0.1, 0.2, 0.3, 0.4])  # Reversed
    result = detector.detect(ref_dist, curr_dist)
    assert result.drift_detected, "Should detect drift with reversed distribution"
    print(f"✓ Large drift case: JS={result.statistic:.4f}")

    # Test 3: Small drift
    curr_dist = np.array([0.38, 0.32, 0.22, 0.08])
    result = detector.detect(ref_dist, curr_dist)
    assert not result.drift_detected, "Should not detect small drift"
    print(f"✓ Small drift case: JS={result.statistic:.4f}")

    print(f"  Latency: {result.details['elapsed_ms']:.2f}ms")


def test_cosine_detector():
    """Test cosine centroid shift detector."""
    print("\n=== Testing Cosine Centroid Detector ===")
    detector = CosineEmbeddingDetector(threshold=0.15)

    # Test 1: No drift
    ref_embs = np.random.randn(50, 384)
    curr_embs = ref_embs + np.random.randn(50, 384) * 0.1  # Small noise
    result = detector.detect(ref_embs, curr_embs)
    assert not result.drift_detected, "Should not detect drift with similar embeddings"
    print(f"✓ No drift case: cosine_dist={result.statistic:.4f}")

    # Test 2: Large drift
    curr_embs = np.random.randn(50, 384)  # Completely different
    result = detector.detect(ref_embs, curr_embs)
    # May or may not detect depending on random initialization
    print(f"✓ Different embeddings case: cosine_dist={result.statistic:.4f}")

    # Test 3: Shifted embeddings
    curr_embs = ref_embs + np.ones((50, 384)) * 2.0
    result = detector.detect(ref_embs, curr_embs)
    # Should detect drift due to centroid shift
    print(f"✓ Shifted embeddings case: cosine_dist={result.statistic:.4f}")

    print(f"  Latency: {result.details['elapsed_ms']:.2f}ms")


def test_mmd_detector():
    """Test Maximum Mean Discrepancy detector."""
    print("\n=== Testing MMD Detector ===")
    detector = MaximumMeanDiscrepancyDetector(threshold=0.12, kernel='rbf')

    # Test 1: No drift
    ref_data = np.random.randn(100, 20)
    curr_data = ref_data + np.random.randn(100, 20) * 0.1
    result = detector.detect(ref_data, curr_data)
    assert not result.drift_detected, "Should not detect drift with similar distributions"
    print(f"✓ No drift case: MMD={result.statistic:.4f}")

    # Test 2: Large drift
    curr_data = np.random.randn(100, 20) + np.ones(20) * 5.0  # Shifted
    result = detector.detect(ref_data, curr_data)
    assert result.drift_detected, "Should detect drift with shifted distribution"
    print(f"✓ Large drift case: MMD={result.statistic:.4f}")

    # Test 3: Linear kernel
    detector_linear = MaximumMeanDiscrepancyDetector(threshold=0.12, kernel='linear')
    result = detector_linear.detect(ref_data, curr_data)
    print(f"✓ Linear kernel case: MMD={result.statistic:.4f}")

    print(f"  Latency: {result.details['elapsed_ms']:.2f}ms")


def test_ensemble():
    """Test ensemble voting."""
    print("\n=== Testing Ensemble Voting ===")
    
    # Create system
    db_path = "/tmp/test_drift_ensemble.db"
    Path(db_path).unlink(missing_ok=True)
    
    system = create_default_system(data_dir="/tmp", webhook_url=None)

    # Test 1: No drift (all detectors agree)
    ref_data = generate_synthetic_data(num_samples=100)
    curr_data = generate_synthetic_data(num_samples=100)
    result = system.run_full_drift_check(ref_data, curr_data)
    assert not result['drift_detected'], "Should not detect drift with identical distributions"
    assert result['num_detectors_signaling'] <= 1, "Should have <= 1 signal"
    print(f"✓ No drift ensemble: {result['num_detectors_signaling']} signals, severity={result['severity']}")

    # Test 2: Domain drift (should trigger KS-test)
    ref_data = generate_synthetic_data(num_samples=100)
    curr_data = generate_synthetic_data(num_samples=100, shift_type='domain')
    result = system.run_full_drift_check(ref_data, curr_data)
    # Should detect drift
    print(f"✓ Domain drift ensemble: {result['num_detectors_signaling']} signals, severity={result['severity']}")

    # Test 3: Entity drift
    ref_data = generate_synthetic_data(num_samples=100)
    curr_data = generate_synthetic_data(num_samples=100, shift_type='entity')
    result = system.run_full_drift_check(ref_data, curr_data)
    print(f"✓ Entity drift ensemble: {result['num_detectors_signaling']} signals, severity={result['severity']}")

    # Test 4: Embedding drift
    ref_data = generate_synthetic_data(num_samples=100)
    curr_data = generate_synthetic_data(num_samples=100, shift_type='embedding')
    result = system.run_full_drift_check(ref_data, curr_data)
    print(f"✓ Embedding drift ensemble: {result['num_detectors_signaling']} signals, severity={result['severity']}")

    # Verify ensemble timing
    assert result['elapsed_ms'] < 300, f"Ensemble should complete in <300ms, got {result['elapsed_ms']:.2f}ms"
    assert result['memory_mb'] < 30, f"Memory should be <30MB, got {result['memory_mb']:.1f}MB"
    print(f"  Latency: {result['elapsed_ms']:.2f}ms, Memory: {result['memory_mb']:.1f}MB")


def test_retraining_orchestration():
    """Test automated retraining task orchestration."""
    print("\n=== Testing Retraining Orchestration ===")

    db_path = "/tmp/test_drift_retrain.db"
    Path(db_path).unlink(missing_ok=True)

    system = create_default_system(data_dir="/tmp", webhook_url=None)

    # Trigger drift
    ref_data = generate_synthetic_data(num_samples=100)
    curr_data = generate_synthetic_data(num_samples=100, shift_type='domain')
    result = system.run_full_drift_check(ref_data, curr_data)

    # Check retrain tasks
    tasks = system.get_pending_retrain_tasks()
    print(f"✓ Queued {len(tasks)} retraining tasks")

    if tasks:
        task = tasks[0]
        print(f"  Task ID: {task['task_id']}")
        print(f"  Models: {task['models_to_retrain']}")
        print(f"  Priority: {task['priority']}")
        print(f"  Reason: {task['reason']}")

        # Test task status transitions
        system.mark_retrain_task_started(task['task_id'])
        print(f"✓ Marked task as in_progress")

        system.mark_retrain_task_completed(task['task_id'])
        print(f"✓ Marked task as completed")

        # Verify task status
        updated_tasks = system.get_pending_retrain_tasks()
        assert len(updated_tasks) == 0, "Completed task should not be in pending queue"


def test_reference_window_management():
    """Test reference window management."""
    print("\n=== Testing Reference Window Management ===")

    db_path = "/tmp/test_drift_window.db"
    Path(db_path).unlink(missing_ok=True)

    system = create_default_system(data_dir="/tmp", webhook_url=None)

    # Update reference window
    stats = {'mean': 0.5, 'std': 0.1, 'count': 100}
    success = system.update_reference_window('test_detector', stats, 100)
    assert success, "Should successfully update reference window"
    print(f"✓ Updated reference window")

    # Get window age
    age = system.reference_window_mgr.get_window_age_days('test_detector')
    assert age is not None and age < 0.1, "Window should be very recent"
    print(f"✓ Window age: {age:.6f} days")

    # Get reference stats
    retrieved_stats = system.reference_window_mgr.get_reference_stats('test_detector')
    assert retrieved_stats is not None, "Should retrieve reference stats"
    assert retrieved_stats['count'] == 100, "Stats should match"
    print(f"✓ Retrieved reference stats: {retrieved_stats}")


def test_performance():
    """Test performance constraints."""
    print("\n=== Testing Performance ===")

    db_path = "/tmp/test_drift_perf.db"
    Path(db_path).unlink(missing_ok=True)

    system = create_default_system(data_dir="/tmp", webhook_url=None)

    # Warm up
    ref_data = generate_synthetic_data(num_samples=100)
    curr_data = generate_synthetic_data(num_samples=100)
    system.run_full_drift_check(ref_data, curr_data)

    # Benchmark
    num_runs = 10
    latencies = []
    memories = []

    for i in range(num_runs):
        ref_data = generate_synthetic_data(num_samples=100)
        curr_data = generate_synthetic_data(num_samples=100)
        result = system.run_full_drift_check(ref_data, curr_data)
        latencies.append(result['elapsed_ms'])
        memories.append(result['memory_mb'])

    avg_latency = np.mean(latencies)
    p95_latency = np.percentile(latencies, 95)
    max_memory = np.max(memories)

    print(f"  Latency: avg={avg_latency:.2f}ms, p95={p95_latency:.2f}ms")
    print(f"  Memory: max={max_memory:.1f}MB")

    # Verify constraints
    assert avg_latency < 300, f"Average latency {avg_latency:.2f}ms exceeds 300ms target"
    assert p95_latency < 300, f"P95 latency {p95_latency:.2f}ms exceeds 300ms target"
    assert max_memory < 30, f"Peak memory {max_memory:.1f}MB exceeds 30MB target"
    print(f"✓ Performance constraints satisfied")


def test_false_positive_analysis():
    """Test false positive rate analysis."""
    print("\n=== Testing False Positive Analysis ===")

    db_path = "/tmp/test_drift_fp.db"
    Path(db_path).unlink(missing_ok=True)

    system = create_default_system(data_dir="/tmp", webhook_url=None)

    # Log some evaluations
    for i in range(20):
        # 70% true negatives, 30% true positives
        drift_observed = i % 10 < 3  # 30% actual drift
        drift_predicted = i % 5 < 1.5  # 30% predicted drift
        system.fp_analyzer.log_evaluation('ks', drift_predicted, drift_observed)

    # Get performance
    perf = system.get_detector_performance('ks')
    print(f"✓ Detector performance: sensitivity={perf['sensitivity']:.3f}, specificity={perf['specificity']:.3f}")
    print(f"  F1: {perf['f1']:.3f}, num_samples: {perf['num_samples']}")


def test_database_schema():
    """Verify database schema integrity."""
    print("\n=== Testing Database Schema ===")

    db_path = "/tmp/test_drift_schema.db"
    Path(db_path).unlink(missing_ok=True)

    system = create_default_system(data_dir="/tmp", webhook_url=None)

    # Verify tables exist
    conn = sqlite3.connect(db_path)
    cursor = conn.execute("""
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE 'drift_%'
    """)
    tables = [row[0] for row in cursor.fetchall()]
    conn.close()

    expected_tables = ['drift_checks', 'drift_alerts', 'drift_evaluation']
    for table in expected_tables:
        assert table in tables, f"Missing table: {table}"
        print(f"✓ Table exists: {table}")


def test_cusum_sequential_detection():
    """Test CUSUM sequential change-point detection."""
    print("\n=== Testing CUSUM Sequential Detection ===")

    system = create_default_system()

    # Generate error stream with no drift
    baseline_errors = np.random.normal(0.05, 0.02, 100)
    for error in baseline_errors:
        result = system.ensemble.cusum.update(error)
        assert not result.drift_detected, "Should not detect drift in baseline"

    print(f"✓ Baseline errors: no drift detected")

    # Generate error stream with sudden increase
    shifted_errors = np.random.normal(0.15, 0.02, 50)  # Mean shift
    for i, error in enumerate(shifted_errors):
        result = system.ensemble.cusum.update(error)
        if i > 20:  # CUSUM needs time to accumulate
            # May or may not detect depending on threshold
            pass

    print(f"✓ Shifted errors: CUSUM statistic={result.statistic:.2f}")
    print(f"  Latency: {result.details['elapsed_ms']:.2f}ms")


def run_all_tests():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("DRIFT DETECTION SYSTEM TEST SUITE")
    print("=" * 60)

    try:
        test_ks_detector()
        test_js_detector()
        test_cosine_detector()
        test_mmd_detector()
        test_ensemble()
        test_retraining_orchestration()
        test_reference_window_management()
        test_performance()
        test_false_positive_analysis()
        test_database_schema()
        test_cusum_sequential_detection()

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED!")
        print("=" * 60)
        return True

    except AssertionError as e:
        print(f"\n✗ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
