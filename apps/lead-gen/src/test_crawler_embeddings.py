"""Tests for crawler embeddings: EmbeddingConfig, NomicEmbedder, ScalarFeatures, StateVectorBuilder."""
from __future__ import annotations

from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from crawler_embeddings import EmbeddingConfig, NomicEmbedder, ScalarFeatures, StateVectorBuilder


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_stub_embedder(embed_dim: int = 768) -> NomicEmbedder:
    """Return a NomicEmbedder with a mocked backend that produces random embeddings."""
    embedder = NomicEmbedder(EmbeddingConfig(embedding_dim=embed_dim))
    # Simulate a loaded model so is_loaded returns True
    embedder._model = MagicMock()
    embedder._backend = "mlx"

    def _fake_embed_texts(texts, prefix=None, normalize=True):
        n = len(texts)
        vecs = np.random.randn(n, embed_dim).astype(np.float32)
        if normalize:
            norms = np.linalg.norm(vecs, axis=1, keepdims=True)
            norms = np.maximum(norms, 1e-12)
            vecs = vecs / norms
        return vecs

    embedder.embed_texts = _fake_embed_texts
    embedder.embed_text = lambda text, prefix=None, normalize=True: _fake_embed_texts(
        [text], prefix=prefix, normalize=normalize
    )[0]
    return embedder


# ---------------------------------------------------------------------------
# EmbeddingConfig
# ---------------------------------------------------------------------------

class TestEmbeddingConfig:

    def test_default_values(self):
        cfg = EmbeddingConfig()
        assert cfg.model_name == "nomic-ai/nomic-embed-text-v1.5"
        assert cfg.embedding_dim == 768
        assert cfg.scalar_dim == 16
        assert cfg.total_state_dim == 784
        assert cfg.batch_size == 128
        assert cfg.max_text_chars == 2048
        assert cfg.max_seq_length == 512
        assert cfg.fallback_dim == 384

    def test_total_state_dim_consistent(self):
        cfg = EmbeddingConfig()
        assert cfg.embedding_dim + cfg.scalar_dim == cfg.total_state_dim


# ---------------------------------------------------------------------------
# NomicEmbedder
# ---------------------------------------------------------------------------

class TestNomicEmbedder:

    def test_not_loaded_initially(self):
        embedder = NomicEmbedder()
        assert embedder.is_loaded is False
        assert embedder._backend == "none"

    def test_embed_without_load_raises(self):
        embedder = NomicEmbedder()
        with pytest.raises(RuntimeError, match="not loaded"):
            embedder.embed_texts(["hello"])

    def test_load_and_unload(self):
        embedder = NomicEmbedder()
        # Mock the internal load to avoid downloading a real model
        embedder._model = MagicMock()
        embedder._tokenizer = MagicMock()
        embedder._backend = "mlx"
        assert embedder.is_loaded is True

        embedder.unload()
        assert embedder.is_loaded is False
        assert embedder._model is None
        assert embedder._tokenizer is None
        assert embedder._backend == "none"

    def test_embedding_dim_property(self):
        # Default (not loaded) returns config embedding_dim
        embedder = NomicEmbedder()
        assert embedder.embedding_dim == 768

        # MLX backend
        embedder._backend = "mlx"
        embedder._model = MagicMock()
        assert embedder.embedding_dim == 768

        # SBERT backend returns fallback_dim
        embedder._backend = "sbert"
        assert embedder.embedding_dim == 384


# ---------------------------------------------------------------------------
# ScalarFeatures
# ---------------------------------------------------------------------------

class TestScalarFeatures:

    def test_default_values(self):
        sf = ScalarFeatures()
        assert sf.depth == 0
        assert sf.seed_distance == 0.0
        assert sf.domain_pages_crawled == 0
        assert sf.domain_reward_sum == 0.0
        assert sf.link_count == 0
        assert sf.body_length == 0
        assert sf.has_contact_page is False
        assert sf.has_about_page is False
        assert sf.response_time_ms == 0.0
        assert sf.max_depth == 5
        assert sf.domain_category_idx == 0

    def test_to_array_shape(self):
        sf = ScalarFeatures()
        arr = sf.to_array()
        assert arr.shape == (16,)

    def test_to_array_dtype(self):
        sf = ScalarFeatures()
        arr = sf.to_array()
        assert arr.dtype == np.float32

    def test_depth_normalization(self):
        sf = ScalarFeatures(depth=3, max_depth=6)
        arr = sf.to_array()
        assert arr[0] == pytest.approx(3.0 / 6.0)
        # depth_ratio at index 9 should be the same
        assert arr[9] == pytest.approx(3.0 / 6.0)

    def test_domain_category_one_hot(self):
        for idx in range(6):
            sf = ScalarFeatures(domain_category_idx=idx)
            arr = sf.to_array()
            one_hot = arr[10:16]
            # Exactly one 1.0 in the one-hot section
            assert np.sum(one_hot) == pytest.approx(1.0)
            assert one_hot[idx] == pytest.approx(1.0)
            # All others are 0.0
            for j in range(6):
                if j != idx:
                    assert one_hot[j] == pytest.approx(0.0)

    def test_has_contact_page_flag(self):
        sf_false = ScalarFeatures(has_contact_page=False)
        sf_true = ScalarFeatures(has_contact_page=True)
        assert sf_false.to_array()[6] == pytest.approx(0.0)
        assert sf_true.to_array()[6] == pytest.approx(1.0)

    def test_has_about_page_flag(self):
        sf_false = ScalarFeatures(has_about_page=False)
        sf_true = ScalarFeatures(has_about_page=True)
        assert sf_false.to_array()[7] == pytest.approx(0.0)
        assert sf_true.to_array()[7] == pytest.approx(1.0)

    def test_log_features_positive(self):
        sf = ScalarFeatures(
            domain_pages_crawled=50,
            link_count=100,
            body_length=5000,
        )
        arr = sf.to_array()
        # log1p features at indices 2, 4, 5
        assert arr[2] >= 0.0  # domain_pages_log
        assert arr[4] >= 0.0  # link_count_log
        assert arr[5] >= 0.0  # body_length_log

    def test_response_time_clamped(self):
        # At exactly 10000ms, should normalize to 1.0
        sf_max = ScalarFeatures(response_time_ms=10000.0)
        assert sf_max.to_array()[8] == pytest.approx(1.0)

        # Above 10000ms, should still be clamped to 1.0
        sf_over = ScalarFeatures(response_time_ms=50000.0)
        assert sf_over.to_array()[8] == pytest.approx(1.0)

        # At 5000ms, should be 0.5
        sf_half = ScalarFeatures(response_time_ms=5000.0)
        assert sf_half.to_array()[8] == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# StateVectorBuilder
# ---------------------------------------------------------------------------

class TestStateVectorBuilder:

    @pytest.fixture
    def embedder_768(self):
        return _make_stub_embedder(embed_dim=768)

    @pytest.fixture
    def embedder_384(self):
        return _make_stub_embedder(embed_dim=384)

    @pytest.fixture
    def builder_768(self, embedder_768):
        return StateVectorBuilder(embedder_768, target_embed_dim=768, scalar_dim=16)

    @pytest.fixture
    def builder_384(self, embedder_384):
        return StateVectorBuilder(embedder_384, target_embed_dim=768, scalar_dim=16)

    def test_build_state_shape(self, builder_768):
        sf = ScalarFeatures(depth=1, max_depth=5)
        state = builder_768.build_state("some page text", sf)
        assert state.shape == (builder_768.state_dim,)
        assert state.shape == (784,)

    def test_build_state_dtype(self, builder_768):
        sf = ScalarFeatures()
        state = builder_768.build_state("hello world", sf)
        assert state.dtype == np.float32

    def test_build_state_with_precomputed_embedding(self, builder_768):
        sf = ScalarFeatures(has_contact_page=True)
        precomputed = np.random.randn(768).astype(np.float32)
        state = builder_768.build_state("ignored text", sf, precomputed_embedding=precomputed)
        # The embedding portion should match the precomputed vector
        np.testing.assert_array_almost_equal(state[:768], precomputed)
        # The scalar portion should have has_contact_page set
        assert state[768 + 6] == pytest.approx(1.0)

    def test_build_state_padding(self, builder_384):
        """384-dim embedding should be padded to 768 with zeros."""
        sf = ScalarFeatures()
        precomputed = np.random.randn(384).astype(np.float32)
        state = builder_384.build_state("text", sf, precomputed_embedding=precomputed)
        assert state.shape == (784,)
        # First 384 dims match the precomputed embedding
        np.testing.assert_array_almost_equal(state[:384], precomputed)
        # Dims 384-767 are zero padding
        np.testing.assert_array_equal(state[384:768], np.zeros(384, dtype=np.float32))

    def test_build_states_batch_shape(self, builder_768):
        texts = ["page one", "page two", "page three"]
        scalars = [ScalarFeatures(depth=i) for i in range(3)]
        states = builder_768.build_states_batch(texts, scalars)
        assert states.shape == (3, 784)
        assert states.dtype == np.float32

    def test_build_states_batch_with_precomputed(self, builder_768):
        texts = ["a", "b"]
        scalars = [ScalarFeatures(), ScalarFeatures(has_about_page=True)]
        precomputed = np.random.randn(2, 768).astype(np.float32)
        states = builder_768.build_states_batch(texts, scalars, precomputed_embeddings=precomputed)
        assert states.shape == (2, 784)
        # Embedding portion matches precomputed
        np.testing.assert_array_almost_equal(states[:, :768], precomputed)
        # Second row should have has_about_page flag set
        assert states[1, 768 + 7] == pytest.approx(1.0)
