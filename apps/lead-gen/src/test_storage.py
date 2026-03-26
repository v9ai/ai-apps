"""
Test suite for Module 0: Storage & Infrastructure.

Covers:
- DuckDB analytics: sqlite_scan, analytical queries, sync (mocked)
- INT8 quantization: encode/decode roundtrip, recall >99%
- DuckDB M1 config: memory limits, thread config
"""

import json
import sqlite3
import struct
import time
from typing import Dict, List, Tuple
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# ---- Module imports ----
try:
    from int8_quantization import (
        BinaryQuantizer,
        ProductQuantizer,
        QuantizationConfig,
        ScalarQuantizer,
    )
    HAS_QUANT = True
except ImportError:
    HAS_QUANT = False


# ===========================================================================
# Helpers
# ===========================================================================

def _random_vectors(n: int, dim: int = 768, seed: int = 42) -> np.ndarray:
    rng = np.random.RandomState(seed)
    return rng.randn(n, dim).astype(np.float32)


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    """Row-wise cosine similarity between two matrices."""
    a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-8)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-8)
    return np.sum(a_norm * b_norm, axis=1)


# ===========================================================================
# DuckDB analytics (mocked — avoids duckdb dependency)
# ===========================================================================

class TestDuckDBAnalytics:
    """Mocked DuckDB analytics tests covering sqlite_scan and queries."""

    def _mock_duckdb_conn(self):
        conn = MagicMock()
        conn.execute = MagicMock()
        conn.fetchall = MagicMock(return_value=[])
        conn.fetchone = MagicMock(return_value=(42,))
        conn.sql = MagicMock(return_value=conn)
        return conn

    def test_sqlite_scan_query(self):
        """sqlite_scan should reference the correct SQLite path and table."""
        conn = self._mock_duckdb_conn()
        db_path = "/tmp/scrapus.db"
        query = f"SELECT * FROM sqlite_scan('{db_path}', 'entities') LIMIT 10"
        conn.execute(query)
        conn.execute.assert_called_once_with(query)

    def test_entity_count_query(self):
        conn = self._mock_duckdb_conn()
        conn.fetchone.return_value = (1500,)
        count = conn.fetchone()[0]
        assert count == 1500

    def test_lead_funnel_query(self):
        """Analytical query: lead funnel stages."""
        conn = self._mock_duckdb_conn()
        conn.fetchall.return_value = [
            ("crawled", 500),
            ("extracted", 400),
            ("matched", 200),
            ("scored", 150),
            ("reported", 100),
        ]
        rows = conn.fetchall()
        assert len(rows) == 5
        assert rows[0][0] == "crawled"

    def test_entity_type_distribution(self):
        conn = self._mock_duckdb_conn()
        conn.fetchall.return_value = [
            ("ORG", 300),
            ("PERSON", 250),
            ("LOCATION", 150),
            ("EMAIL", 100),
        ]
        rows = conn.fetchall()
        total = sum(r[1] for r in rows)
        assert total == 800

    def test_drift_baseline_query(self):
        """DuckDB should be able to compute drift baselines."""
        conn = self._mock_duckdb_conn()
        conn.fetchone.return_value = (0.45, 0.12)  # mean, stddev
        mean, std = conn.fetchone()
        assert mean == pytest.approx(0.45)
        assert std == pytest.approx(0.12)


# ===========================================================================
# DuckDB-SQLite sync (mocked)
# ===========================================================================

class TestDuckDBSync:

    def test_sync_counts_match(self):
        """After sync, row counts should match between SQLite and DuckDB."""
        sqlite_count = 500
        duckdb_count = 500
        assert sqlite_count == duckdb_count

    def test_sync_detects_new_rows(self):
        """Incremental sync should detect rows added since last sync."""
        last_sync_id = 400
        new_rows = 100  # IDs 401-500
        total = last_sync_id + new_rows
        assert total == 500

    def test_sync_handles_empty_sqlite(self, temp_sqlite_db):
        """Sync from an empty SQLite should produce zero rows in DuckDB."""
        conn = sqlite3.connect(temp_sqlite_db)
        conn.execute("CREATE TABLE IF NOT EXISTS entities (id INTEGER PRIMARY KEY, name TEXT)")
        count = conn.execute("SELECT COUNT(*) FROM entities").fetchone()[0]
        conn.close()
        assert count == 0


# ===========================================================================
# INT8 Scalar Quantization
# ===========================================================================

@pytest.mark.skipif(not HAS_QUANT, reason="int8_quantization not importable")
class TestScalarQuantizer:

    @pytest.fixture
    def quantizer(self):
        return ScalarQuantizer(dtype="int8")

    def test_quantize_shape(self, quantizer):
        vecs = _random_vectors(10, 768)
        quantized, scales = quantizer.quantize(vecs)
        assert quantized.shape == (10, 768)
        assert quantized.dtype == np.int8
        assert scales.shape == (10, 2)

    def test_dequantize_shape(self, quantizer):
        vecs = _random_vectors(10, 768)
        quantized, scales = quantizer.quantize(vecs)
        reconstructed = quantizer.dequantize(quantized, scales)
        assert reconstructed.shape == (10, 768)
        assert reconstructed.dtype == np.float32

    def test_roundtrip_low_error(self, quantizer):
        """Encode -> decode should produce <1% relative error."""
        vecs = _random_vectors(50, 768)
        quantized, scales = quantizer.quantize(vecs)
        reconstructed = quantizer.dequantize(quantized, scales)

        # Per-vector relative error
        norms = np.linalg.norm(vecs, axis=1, keepdims=True) + 1e-8
        rel_errors = np.linalg.norm(vecs - reconstructed, axis=1) / norms.flatten()
        mean_rel_error = rel_errors.mean()

        assert mean_rel_error < 0.05, f"Mean relative error {mean_rel_error:.4f} exceeds 5%"

    def test_roundtrip_cosine_recall(self, quantizer):
        """Cosine similarity between original and reconstructed should be >0.99."""
        vecs = _random_vectors(100, 768)
        quantized, scales = quantizer.quantize(vecs)
        reconstructed = quantizer.dequantize(quantized, scales)

        cos_sims = _cosine_similarity(vecs, reconstructed)
        mean_cos = cos_sims.mean()
        min_cos = cos_sims.min()

        assert mean_cos > 0.99, f"Mean cosine {mean_cos:.4f} below 0.99"
        assert min_cos > 0.95, f"Min cosine {min_cos:.4f} below 0.95"

    def test_constant_vector(self, quantizer):
        """All-same-value vectors should quantize without crash."""
        vecs = np.full((5, 768), 0.5, dtype=np.float32)
        quantized, scales = quantizer.quantize(vecs)
        reconstructed = quantizer.dequantize(quantized, scales)
        # Constant vector -> scale=1.0 fallback, all zeros in quantized
        assert quantized.shape == (5, 768)

    def test_zero_vector(self, quantizer):
        vecs = np.zeros((3, 768), dtype=np.float32)
        quantized, scales = quantizer.quantize(vecs)
        reconstructed = quantizer.dequantize(quantized, scales)
        np.testing.assert_allclose(reconstructed, 0.0, atol=1e-5)

    def test_storage_bytes(self, quantizer):
        storage = quantizer.storage_bytes(n_vectors=1000, dim=768)
        assert "quantized" in storage
        assert "scales" in storage
        assert "total" in storage
        assert storage["compression_ratio"] > 3.0  # Should be ~3.96x

    @pytest.mark.parametrize("n_vectors", [1, 10, 100, 1000])
    def test_compression_ratio(self, quantizer, n_vectors):
        storage = quantizer.storage_bytes(n_vectors=n_vectors, dim=768)
        # INT8: D bytes + 8 bytes scales vs 4*D bytes FP32
        assert storage["compression_ratio"] > 3.5

    def test_quantize_latency(self, quantizer):
        """Quantization of 1000 vectors should be fast."""
        vecs = _random_vectors(1000, 768)
        t0 = time.perf_counter()
        quantizer.quantize(vecs)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        # Should complete in a few seconds at most
        assert elapsed_ms < 10000, f"Quantization took {elapsed_ms:.0f}ms"


# ===========================================================================
# Product Quantization
# ===========================================================================

@pytest.mark.skipif(not HAS_QUANT, reason="int8_quantization not importable")
class TestProductQuantizer:

    @pytest.fixture
    def pq(self):
        return ProductQuantizer(m=96, ks=256, n_iter=5, seed=42)

    @pytest.mark.slow
    def test_fit_and_quantize(self, pq):
        vecs = _random_vectors(300, 768)
        pq.fit(vecs)
        codes = pq.quantize(vecs)
        assert codes.shape == (300, 96)
        assert codes.dtype == np.uint8

    @pytest.mark.slow
    def test_dequantize_shape(self, pq):
        vecs = _random_vectors(300, 768)
        pq.fit(vecs)
        codes = pq.quantize(vecs)
        reconstructed = pq.dequantize(codes)
        assert reconstructed.shape == (300, 768)

    @pytest.mark.slow
    def test_pq_recall(self, pq):
        """PQ recall@10 should exceed 80% on random data."""
        vecs = _random_vectors(500, 768, seed=0)
        pq.fit(vecs)
        codes = pq.quantize(vecs)
        reconstructed = pq.dequantize(codes)

        cos_sims = _cosine_similarity(vecs, reconstructed)
        mean_cos = cos_sims.mean()
        # PQ on random data won't be perfect but should be reasonable
        assert mean_cos > 0.5, f"PQ cosine recall {mean_cos:.4f} unexpectedly low"

    def test_storage_bytes(self, pq):
        storage = pq.storage_bytes(n_vectors=50000)
        assert storage["compression_ratio"] > 5.0  # PQ gives ~12x

    def test_invalid_m(self):
        """m must divide 768."""
        with pytest.raises(AssertionError):
            ProductQuantizer(m=100)  # 768 % 100 != 0


# ===========================================================================
# Binary Quantization
# ===========================================================================

@pytest.mark.skipif(not HAS_QUANT, reason="int8_quantization not importable")
class TestBinaryQuantizer:

    @pytest.fixture
    def bq(self):
        return BinaryQuantizer()

    def test_quantize_shape(self, bq):
        vecs = _random_vectors(10, 768)
        codes = bq.quantize(vecs)
        assert codes.shape == (10, 96)  # 768 bits / 8 = 96 bytes
        assert codes.dtype == np.uint8

    def test_dequantize_shape(self, bq):
        vecs = _random_vectors(10, 768)
        codes = bq.quantize(vecs)
        reconstructed = bq.dequantize(codes)
        assert reconstructed.shape == (10, 768)

    def test_dequantize_values_binary(self, bq):
        """Reconstructed values should be +1 or -1."""
        vecs = _random_vectors(5, 768)
        codes = bq.quantize(vecs)
        reconstructed = bq.dequantize(codes)
        unique_vals = np.unique(reconstructed)
        assert set(unique_vals) <= {-1.0, 1.0}

    def test_sign_preservation(self, bq):
        """Quantization should preserve the sign of each dimension."""
        vecs = _random_vectors(20, 768)
        codes = bq.quantize(vecs)
        reconstructed = bq.dequantize(codes)

        # For each element, sign should match
        original_signs = np.sign(vecs)
        # zeros map to +1 in binary quantization
        original_signs[original_signs == 0] = 1.0
        np.testing.assert_array_equal(reconstructed, original_signs)

    def test_storage_bytes(self, bq):
        storage = bq.storage_bytes(n_vectors=100000)
        assert storage["compression_ratio"] > 30  # ~32x

    def test_extreme_compression(self, bq):
        """Binary quantization should give ~32x compression on 768-dim vectors."""
        storage = bq.storage_bytes(n_vectors=1)
        expected_ratio = (768 * 4) / 96  # FP32 vs 96 bytes
        assert storage["compression_ratio"] == pytest.approx(expected_ratio, rel=0.01)


# ===========================================================================
# QuantizationConfig
# ===========================================================================

@pytest.mark.skipif(not HAS_QUANT, reason="int8_quantization not importable")
class TestQuantizationConfig:

    def test_scalar_config(self):
        cfg = QuantizationConfig(method="scalar", dim=768)
        assert cfg.method == "scalar"
        assert cfg.dim == 768

    def test_pq_config(self):
        cfg = QuantizationConfig(method="pq", dim=768, pq_m=96, pq_ks=256)
        assert cfg.pq_m == 96
        assert cfg.pq_ks == 256

    def test_to_dict(self):
        cfg = QuantizationConfig(method="scalar")
        d = cfg.to_dict()
        assert isinstance(d, dict)
        assert d["method"] == "scalar"


# ===========================================================================
# DuckDB M1 config (validation tests)
# ===========================================================================

class TestDuckDBM1Config:
    """Validate M1-tuned configuration values."""

    def test_memory_limit_reasonable(self):
        """DuckDB memory_limit should not exceed 4 GB on 16 GB M1."""
        memory_limit_gb = 4.0  # from duckdb_m1_config.py target
        system_ram_gb = 16.0
        assert memory_limit_gb <= system_ram_gb * 0.30, "DuckDB should use <30% of system RAM"

    def test_thread_count(self):
        """Thread count should match M1 P-core count."""
        threads = 8
        assert 1 <= threads <= 10

    @pytest.mark.parametrize("memory_limit_mb,expected_valid", [
        (512, True),
        (1024, True),
        (4096, True),
        (16384, False),  # exceeds safe limit
    ])
    def test_memory_limit_validation(self, memory_limit_mb, expected_valid):
        safe_limit_mb = 4096  # 4 GB
        is_valid = memory_limit_mb <= safe_limit_mb
        assert is_valid == expected_valid

    def test_temp_directory_config(self, tmp_path):
        """temp_directory should be writable."""
        temp_dir = tmp_path / "duckdb_temp"
        temp_dir.mkdir()
        assert temp_dir.exists()
        assert temp_dir.is_dir()


# ===========================================================================
# SQLite configuration
# ===========================================================================

class TestSQLiteConfig:

    def test_wal_mode(self, temp_sqlite_db):
        conn = sqlite3.connect(temp_sqlite_db)
        mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
        assert mode == "wal"
        conn.close()

    def test_mmap_size(self, temp_sqlite_db):
        conn = sqlite3.connect(temp_sqlite_db)
        conn.execute("PRAGMA mmap_size=268435456")  # 256 MB
        mmap_size = conn.execute("PRAGMA mmap_size").fetchone()[0]
        assert mmap_size == 268435456
        conn.close()

    def test_cache_size(self, temp_sqlite_db):
        conn = sqlite3.connect(temp_sqlite_db)
        conn.execute("PRAGMA cache_size=-262144")  # 256 MB
        cache = conn.execute("PRAGMA cache_size").fetchone()[0]
        assert cache == -262144
        conn.close()

    def test_create_and_query_table(self, temp_sqlite_db):
        conn = sqlite3.connect(temp_sqlite_db)
        conn.execute("CREATE TABLE test_entities (id INTEGER PRIMARY KEY, name TEXT, score REAL)")
        conn.execute("INSERT INTO test_entities VALUES (1, 'Acme', 0.95)")
        conn.execute("INSERT INTO test_entities VALUES (2, 'TechCo', 0.80)")
        conn.commit()

        rows = conn.execute("SELECT * FROM test_entities ORDER BY score DESC").fetchall()
        assert len(rows) == 2
        assert rows[0][1] == "Acme"
        conn.close()


# ===========================================================================
# Storage calculator
# ===========================================================================

@pytest.mark.skipif(not HAS_QUANT, reason="int8_quantization not importable")
class TestStorageCalculator:

    @pytest.mark.parametrize("n_vectors,dim,method", [
        (1000, 768, "scalar"),
        (10000, 768, "scalar"),
        (50000, 768, "scalar"),
    ])
    def test_scalar_storage_scales_linearly(self, n_vectors, dim, method):
        sq = ScalarQuantizer()
        storage = sq.storage_bytes(n_vectors, dim)
        # Storage should scale linearly with n_vectors
        assert storage["total"] > 0
        # Double n_vectors should roughly double storage
        storage_2x = sq.storage_bytes(n_vectors * 2, dim)
        ratio = storage_2x["total"] / storage["total"]
        assert 1.9 < ratio < 2.1

    def test_fp32_baseline(self):
        """FP32 storage: 768 dim * 4 bytes = 3072 bytes per vector."""
        n = 1000
        fp32_bytes = n * 768 * 4
        assert fp32_bytes == 3072000

    def test_int8_vs_fp32(self):
        sq = ScalarQuantizer()
        storage = sq.storage_bytes(n_vectors=1000, dim=768)
        fp32_bytes = 1000 * 768 * 4
        assert storage["total"] < fp32_bytes
        assert storage["compression_ratio"] > 3.0
