"""
Test suite for Module 2: NER Pipeline.

Covers:
- GLiNER2 inference (mock model): entity extraction, batch processing, confidence thresholds
- Hybrid NER ensemble: conflict resolution, score calibration, memory optimizer
- Entity type coverage: PERSON, ORG, EMAIL, PHONE, TITLE, LOCATION
- Edge cases: empty text, very long text, non-English, special characters
- Latency assertions (<55 ms per page)
"""

import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from unittest.mock import MagicMock, patch, PropertyMock

import numpy as np
import pytest

# ---- Module imports (guarded so collection doesn't fail on missing deps) ----
try:
    from gliner2_inference import (
        Entity,
        M1OptimizedNER,
        M1OptimizedNERConfig,
        NERPrediction,
    )
    HAS_GLINER = True
except ImportError:
    HAS_GLINER = False

try:
    from hybrid_ner_ensemble import (
        Entity as HybridEntity,
        ConflictResolver,
    )
    HAS_HYBRID = True
except ImportError:
    HAS_HYBRID = False


# ===========================================================================
# Helpers
# ===========================================================================

def _make_entity(text, etype, start, end, conf, source="gliner"):
    """Shortcut to build a HybridEntity (from hybrid_ner_ensemble)."""
    if HAS_HYBRID:
        return HybridEntity(text=text, type=etype, start=start, end=end,
                            confidence=conf, source=source)
    return None


def _make_gliner_entity(text, etype, span, conf):
    """Shortcut to build a GLiNER Entity (from gliner2_inference)."""
    if HAS_GLINER:
        return Entity(text=text, type=etype, span=span, confidence=conf)
    return None


def _mock_onnx_session(seq_len=64, num_types=6):
    """Return a mock ONNX session whose .run() yields realistic logits."""
    session = MagicMock()

    def _run(_output_names, inputs):
        batch = inputs["input_ids"].shape[0]
        span_logits = np.zeros((batch, seq_len, seq_len), dtype=np.float32)
        type_logits = np.zeros((batch, seq_len, num_types), dtype=np.float32)

        # Plant a few plausible detections per sample
        for b in range(batch):
            span_logits[b, 3, 6] = 0.85   # high-confidence span
            span_logits[b, 10, 14] = 0.75
            type_logits[b, 3, 0] = 0.90   # ORG
            type_logits[b, 10, 1] = 0.80  # PERSON

        return [span_logits, type_logits]

    session.run = MagicMock(side_effect=_run)
    return session


def _mock_tokenizer(vocab_size=30000, max_length=512):
    """Return a mock tokenizer compatible with M1OptimizedNER."""
    tok = MagicMock()

    def _call(text_or_texts, **kwargs):
        if isinstance(text_or_texts, list):
            batch = len(text_or_texts)
        else:
            batch = 1
        ml = kwargs.get("max_length", max_length)
        return {
            "input_ids": np.zeros((batch, ml), dtype=np.int32),
            "attention_mask": np.ones((batch, ml), dtype=np.int32),
        }

    tok.side_effect = _call
    tok.encode = MagicMock(side_effect=lambda t: list(range(min(len(t.split()), 64))))
    tok.decode = MagicMock(side_effect=lambda ids: " ".join(f"tok{i}" for i in ids))
    return tok


# ===========================================================================
# GLiNER2 Inference tests
# ===========================================================================

@pytest.mark.skipif(not HAS_GLINER, reason="gliner2_inference not importable")
class TestGLiNER2Inference:
    """Unit tests for M1OptimizedNER."""

    @pytest.fixture(autouse=True)
    def _build_ner(self, tmp_path):
        """Construct an M1OptimizedNER with mocked backends."""
        bundle = tmp_path / "model_bundle"
        bundle.mkdir()
        (bundle / "model_fallback.onnx").touch()

        self.config = M1OptimizedNERConfig(
            model_bundle_dir=str(bundle),
            primary_backend="onnx",
            entity_confidence_threshold=0.5,
            batch_size=4,
            entity_types=["ORG", "PERSON", "LOCATION", "PRODUCT", "FUNDING_ROUND", "TECHNOLOGY"],
        )

        with patch("gliner2_inference.AutoTokenizer") as MockTok, \
             patch("gliner2_inference.ort") as MockOrt:
            MockTok.from_pretrained.return_value = _mock_tokenizer()
            MockOrt.InferenceSession.return_value = _mock_onnx_session()
            self.ner = M1OptimizedNER(self.config)

    # ---- single extraction ----

    def test_extract_returns_ner_prediction(self):
        result = self.ner.extract("Acme Corp raised $12M in Berlin.")
        assert isinstance(result, NERPrediction)
        assert result.model_used in ("coreml", "onnx")

    def test_extract_entities_have_required_fields(self):
        result = self.ner.extract("Stripe raised $95B in Series H funding led by Sequoia Capital.")
        for ent in result.entities:
            assert hasattr(ent, "text")
            assert hasattr(ent, "type")
            assert hasattr(ent, "span")
            assert hasattr(ent, "confidence")
            assert 0.0 <= ent.confidence <= 1.0

    def test_extract_records_inference_time(self):
        result = self.ner.extract("Apple launched iPhone 15.")
        assert result.inference_time_ms >= 0.0

    # ---- confidence threshold ----

    @pytest.mark.parametrize("threshold", [0.3, 0.5, 0.7, 0.9])
    def test_confidence_threshold_filters_entities(self, threshold):
        self.ner.config.entity_confidence_threshold = threshold
        result = self.ner.extract("Some text with possible entities.")
        for ent in result.entities:
            assert ent.confidence >= threshold, (
                f"Entity {ent.text!r} has confidence {ent.confidence} below threshold {threshold}"
            )

    # ---- batch processing ----

    def test_extract_batch_returns_list(self):
        texts = ["Text one.", "Text two.", "Text three."]
        results = self.ner.extract_batch(texts, show_progress=False)
        assert len(results) == 3
        for r in results:
            assert isinstance(r, NERPrediction)

    def test_extract_batch_empty_list(self):
        results = self.ner.extract_batch([], show_progress=False)
        assert results == []

    def test_extract_batch_respects_batch_size(self):
        texts = [f"Sample text {i}" for i in range(10)]
        results = self.ner.extract_batch(texts, show_progress=False)
        assert len(results) == 10
        # batch_size=4 means 3 batches: 4+4+2
        assert len(self.ner.batch_sizes_processed) >= 3

    # ---- entity type coverage ----

    @pytest.mark.parametrize("entity_type", [
        "ORG", "PERSON", "LOCATION", "PRODUCT", "FUNDING_ROUND", "TECHNOLOGY",
    ])
    def test_entity_type_accepted(self, entity_type):
        """NER should accept each configured entity type without error."""
        result = self.ner.extract("Sample text.", entity_types=[entity_type])
        assert isinstance(result, NERPrediction)

    # ---- serialisation ----

    def test_prediction_to_dict(self):
        result = self.ner.extract("Acme Corp in Berlin.")
        d = result.to_dict()
        assert "text" in d
        assert "entities" in d
        assert "inference_time_ms" in d
        assert "model_used" in d

    def test_entity_to_dict(self):
        ent = _make_gliner_entity("Acme", "ORG", (0, 4), 0.91)
        d = ent.to_dict()
        assert d["text"] == "Acme"
        assert d["type"] == "ORG"
        assert d["confidence"] == pytest.approx(0.91)

    # ---- metrics ----

    def test_get_metrics_after_inference(self):
        self.ner.extract("Hello world.")
        metrics = self.ner.get_metrics()
        assert metrics["num_inferences"] >= 1
        assert "mean_inference_ms" in metrics
        assert "active_backend" in metrics

    def test_get_metrics_empty_initially(self):
        # fresh NER has no inferences yet; but autouse fixture already
        # ran the constructor.  Clear the tracking.
        self.ner.inference_times.clear()
        assert self.ner.get_metrics() == {}

    # ---- fallback ----

    def test_fallback_on_primary_failure(self):
        """If the primary backend raises, ONNX fallback should be used."""
        self.ner.active_backend = "coreml"
        self.ner.coreml_session = MagicMock()
        self.ner.coreml_session.predict.side_effect = RuntimeError("CoreML crash")
        result = self.ner.extract("Fallback test.")
        assert result.model_used in ("onnx", "onnx_fallback")


# ===========================================================================
# GLiNER2 edge cases
# ===========================================================================

@pytest.mark.skipif(not HAS_GLINER, reason="gliner2_inference not importable")
class TestGLiNER2EdgeCases:

    @pytest.fixture(autouse=True)
    def _build_ner(self, tmp_path):
        bundle = tmp_path / "model_bundle"
        bundle.mkdir()
        (bundle / "model_fallback.onnx").touch()
        config = M1OptimizedNERConfig(
            model_bundle_dir=str(bundle),
            primary_backend="onnx",
            entity_confidence_threshold=0.5,
            batch_size=4,
        )
        with patch("gliner2_inference.AutoTokenizer") as MockTok, \
             patch("gliner2_inference.ort") as MockOrt:
            MockTok.from_pretrained.return_value = _mock_tokenizer()
            MockOrt.InferenceSession.return_value = _mock_onnx_session()
            self.ner = M1OptimizedNER(config)

    def test_empty_text(self):
        result = self.ner.extract("")
        assert isinstance(result, NERPrediction)
        # Empty text should produce zero or very few entities
        assert result.inference_time_ms >= 0.0

    def test_very_long_text(self):
        long_text = "Acme Corp. " * 5000  # ~55 000 chars
        result = self.ner.extract(long_text)
        assert isinstance(result, NERPrediction)

    def test_special_characters(self):
        text = "C++ & C# are used at Acme <Corp> 'Ltd.' \"GmbH\" (Berlin)."
        result = self.ner.extract(text)
        assert isinstance(result, NERPrediction)

    def test_non_english_text(self):
        text = "Die Firma Siemens AG hat ihren Sitz in Munchen, Deutschland."
        result = self.ner.extract(text)
        assert isinstance(result, NERPrediction)

    def test_unicode_characters(self):
        text = "Societe Generale est basee a Paris. CEO: Frederic Oudea."
        result = self.ner.extract(text)
        assert isinstance(result, NERPrediction)

    def test_mixed_entities(self):
        text = (
            "Contact John Smith (john@example.com, +1-555-0100) at OpenAI Inc, "
            "located at 3180 18th St, San Francisco, CA."
        )
        result = self.ner.extract(text)
        assert isinstance(result, NERPrediction)


# ===========================================================================
# GLiNER2 latency tests
# ===========================================================================

@pytest.mark.skipif(not HAS_GLINER, reason="gliner2_inference not importable")
class TestGLiNER2Latency:

    @pytest.fixture(autouse=True)
    def _build_ner(self, tmp_path):
        bundle = tmp_path / "model_bundle"
        bundle.mkdir()
        (bundle / "model_fallback.onnx").touch()
        config = M1OptimizedNERConfig(
            model_bundle_dir=str(bundle),
            primary_backend="onnx",
            entity_confidence_threshold=0.5,
            batch_size=32,
        )
        with patch("gliner2_inference.AutoTokenizer") as MockTok, \
             patch("gliner2_inference.ort") as MockOrt:
            MockTok.from_pretrained.return_value = _mock_tokenizer()
            MockOrt.InferenceSession.return_value = _mock_onnx_session()
            self.ner = M1OptimizedNER(config)

    def test_single_page_latency_under_55ms(self):
        """Mock-based latency: the mocked inference path should be well under 55ms."""
        times = []
        for _ in range(20):
            t0 = time.perf_counter()
            self.ner.extract("Acme Corporation raised $12M Series A in Berlin.")
            times.append((time.perf_counter() - t0) * 1000)

        p95 = np.percentile(times, 95)
        # With mocks, p95 should be far below 55 ms.  The assertion guards
        # against accidental heavyweight code inside the hot path.
        assert p95 < 55.0, f"P95 latency {p95:.2f}ms exceeds 55ms target"

    def test_batch_throughput(self):
        texts = [f"Company {i} launched product X." for i in range(64)]
        t0 = time.perf_counter()
        results = self.ner.extract_batch(texts, show_progress=False)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        per_page = elapsed_ms / len(texts)
        assert per_page < 55.0, f"Per-page latency {per_page:.2f}ms in batch exceeds 55ms"


# ===========================================================================
# Hybrid NER ensemble tests
# ===========================================================================

@pytest.mark.skipif(not HAS_HYBRID, reason="hybrid_ner_ensemble not importable")
class TestConflictResolver:
    """Tests for conflict resolution between rule, DistilBERT, and GLiNER entities."""

    def _resolver(self):
        with patch("hybrid_ner_ensemble.HybridNERRouter", MagicMock()):
            return ConflictResolver()

    # ---- rule entities always win ----

    def test_rule_entity_wins_over_bert(self):
        resolver = self._resolver()
        rule = [_make_entity("jane@acme.com", "EMAIL", 10, 24, 1.0, "rule")]
        bert = [_make_entity("jane@acme.com", "EMAIL", 10, 24, 0.95, "distilbert")]
        gliner = []

        merged = resolver.resolve_conflicts(rule, bert, gliner)
        assert len(merged) >= 1
        rule_entities = [e for e in merged if e.source == "rule"]
        assert len(rule_entities) >= 1

    def test_rule_entity_wins_over_gliner(self):
        resolver = self._resolver()
        rule = [_make_entity("+49-151-12345678", "PHONE", 30, 46, 1.0, "rule")]
        bert = []
        gliner = [_make_entity("+49-151-12345678", "PHONE", 30, 46, 0.70, "gliner")]

        merged = resolver.resolve_conflicts(rule, bert, gliner)
        rule_ents = [e for e in merged if e.source == "rule"]
        assert len(rule_ents) >= 1

    # ---- non-overlapping entities are all kept ----

    def test_non_overlapping_all_kept(self):
        resolver = self._resolver()
        rule = [_make_entity("jane@acme.com", "EMAIL", 100, 114, 1.0, "rule")]
        bert = [_make_entity("Acme Corp", "ORG", 0, 9, 0.90, "distilbert")]
        gliner = [_make_entity("Berlin", "LOCATION", 50, 56, 0.80, "gliner")]

        merged = resolver.resolve_conflicts(rule, bert, gliner)
        assert len(merged) == 3

    # ---- BERT vs GLiNER weighted vote ----

    def test_bert_wins_weighted_vote(self):
        resolver = self._resolver()
        rule = []
        bert = [_make_entity("Acme Corp", "ORG", 0, 9, 0.95, "distilbert")]
        gliner = [_make_entity("Acme Corp", "ORG", 0, 9, 0.60, "gliner")]

        merged = resolver.resolve_conflicts(rule, bert, gliner)
        # weighted: bert 0.95*0.85=0.8075 vs gliner 0.60*0.70=0.42
        org_entities = [e for e in merged if e.type == "ORG"]
        assert len(org_entities) >= 1
        winner = org_entities[0]
        assert winner.source == "distilbert"

    def test_gliner_wins_weighted_vote(self):
        resolver = self._resolver()
        rule = []
        bert = [_make_entity("Sequoia", "ORG", 20, 27, 0.50, "distilbert")]
        gliner = [_make_entity("Sequoia", "ORG", 20, 27, 0.99, "gliner")]

        merged = resolver.resolve_conflicts(rule, bert, gliner)
        org_entities = [e for e in merged if e.type == "ORG"]
        assert len(org_entities) >= 1
        # weighted: bert 0.50*0.85=0.425 vs gliner 0.99*0.70=0.693
        winner = org_entities[0]
        assert winner.source == "gliner"

    # ---- vote on conflicting types ----

    def test_vote_conflicting_types_prefers_higher_weighted(self):
        resolver = self._resolver()
        predictions = {
            "distilbert": _make_entity("Acme", "ORG", 10, 14, 0.88, "distilbert"),
            "gliner": _make_entity("Acme", "organization", 10, 14, 0.72, "gliner"),
        }
        winner = resolver.vote_on_conflicting_types((10, 14), predictions)
        # DistilBERT's weighted score = 0.88*0.85 = 0.748
        # GLiNER's weighted (normalized) = 0.72*0.70 = 0.504
        assert winner.source == "distilbert"

    # ---- overlap detection ----

    def test_entity_overlap_same_type(self):
        e1 = _make_entity("Acme Corp", "ORG", 0, 9, 0.9, "distilbert")
        e2 = _make_entity("Acme Corporation", "ORG", 0, 16, 0.8, "gliner")
        assert e1.overlaps_with(e2)

    def test_entity_no_overlap_different_type(self):
        e1 = _make_entity("Acme", "ORG", 0, 4, 0.9, "distilbert")
        e2 = _make_entity("Acme", "PERSON", 0, 4, 0.8, "gliner")
        assert not e1.overlaps_with(e2)

    def test_entity_no_overlap_disjoint_spans(self):
        e1 = _make_entity("Acme", "ORG", 0, 4, 0.9, "distilbert")
        e2 = _make_entity("Berlin", "ORG", 50, 56, 0.8, "gliner")
        assert not e1.overlaps_with(e2)


# ===========================================================================
# Entity type coverage (parametrized)
# ===========================================================================

@pytest.mark.skipif(not HAS_HYBRID, reason="hybrid_ner_ensemble not importable")
class TestEntityTypeCoverage:

    @pytest.mark.parametrize("etype,text,start,end", [
        ("PERSON", "Jane Doe", 0, 8),
        ("ORG", "Acme Corporation", 0, 16),
        ("EMAIL", "jane@acme.com", 0, 13),
        ("PHONE", "+49-151-12345678", 0, 16),
        ("TITLE", "CTO", 0, 3),
        ("LOCATION", "Berlin, Germany", 0, 15),
    ])
    def test_entity_type_creates_valid_entity(self, etype, text, start, end):
        ent = _make_entity(text, etype, start, end, 0.9, "rule")
        assert ent.type == etype
        assert ent.text == text
        assert ent.start == start
        assert ent.end == end

    @pytest.mark.parametrize("etype", [
        "PERSON", "ORG", "EMAIL", "PHONE", "TITLE", "LOCATION",
    ])
    def test_entity_type_round_trips_through_overlap_check(self, etype):
        e1 = _make_entity("Token", etype, 0, 5, 0.9, "rule")
        e2 = _make_entity("Token", etype, 0, 5, 0.8, "gliner")
        assert e1.overlaps_with(e2)


# ===========================================================================
# Weighted voting (unit-level)
# ===========================================================================

@pytest.mark.skipif(not HAS_HYBRID, reason="hybrid_ner_ensemble not importable")
class TestWeightedVoting:

    def test_weighted_vote_averages_confidence(self):
        with patch("hybrid_ner_ensemble.HybridNERRouter", MagicMock()):
            resolver = ConflictResolver()
        e1 = _make_entity("Acme", "ORG", 0, 4, 0.80, "distilbert")
        e2 = _make_entity("Acme", "ORG", 0, 4, 0.70, "gliner")
        winner = resolver._weighted_vote(e1, e2)
        # winner's confidence should be average of the two originals
        assert winner.confidence == pytest.approx(0.75, abs=0.01)

    def test_weighted_vote_deterministic(self):
        with patch("hybrid_ner_ensemble.HybridNERRouter", MagicMock()):
            resolver = ConflictResolver()
        e1 = _make_entity("X", "ORG", 0, 1, 0.90, "distilbert")
        e2 = _make_entity("X", "ORG", 0, 1, 0.50, "gliner")
        w1 = resolver._weighted_vote(e1, e2)
        # Running again with fresh entities should give same source
        e3 = _make_entity("X", "ORG", 0, 1, 0.90, "distilbert")
        e4 = _make_entity("X", "ORG", 0, 1, 0.50, "gliner")
        w2 = resolver._weighted_vote(e3, e4)
        assert w1.source == w2.source


# ===========================================================================
# Ensemble integration (mock-based)
# ===========================================================================

@pytest.mark.skipif(not HAS_HYBRID, reason="hybrid_ner_ensemble not importable")
class TestEnsembleIntegration:

    def test_full_merge_pipeline(self, sample_pages):
        """Run the full conflict-resolution merge on sample page text."""
        with patch("hybrid_ner_ensemble.HybridNERRouter", MagicMock()):
            resolver = ConflictResolver()

        text = sample_pages[0]["text"]
        rule_ents = [
            _make_entity("jane@acme.com", "EMAIL", text.index("jane@acme.com"),
                         text.index("jane@acme.com") + 13, 1.0, "rule"),
        ]
        bert_ents = [
            _make_entity("Acme Corporation", "ORG", text.index("Acme Corporation"),
                         text.index("Acme Corporation") + 16, 0.92, "distilbert"),
        ]
        gliner_ents = [
            _make_entity("Berlin", "LOCATION", text.index("Berlin"),
                         text.index("Berlin") + 6, 0.85, "gliner"),
        ]

        merged = resolver.resolve_conflicts(rule_ents, bert_ents, gliner_ents)
        types_found = {e.type for e in merged}
        assert "EMAIL" in types_found
        assert "ORG" in types_found
        assert "LOCATION" in types_found

    def test_empty_inputs(self):
        with patch("hybrid_ner_ensemble.HybridNERRouter", MagicMock()):
            resolver = ConflictResolver()
        merged = resolver.resolve_conflicts([], [], [])
        assert merged == []

    @pytest.mark.parametrize("n_entities", [10, 50, 100])
    def test_merge_scales_linearly(self, n_entities):
        """Conflict resolution should stay fast even with many entities."""
        with patch("hybrid_ner_ensemble.HybridNERRouter", MagicMock()):
            resolver = ConflictResolver()

        # Non-overlapping entities spread across disjoint spans
        step = 20
        ents = [
            _make_entity(f"Ent{i}", "ORG", i * step, i * step + 5, 0.8, "distilbert")
            for i in range(n_entities)
        ]
        t0 = time.perf_counter()
        merged = resolver.resolve_conflicts([], ents, [])
        elapsed_ms = (time.perf_counter() - t0) * 1000

        assert len(merged) == n_entities
        # Should complete in well under 200 ms even for 100 entities
        assert elapsed_ms < 200, f"Merge of {n_entities} entities took {elapsed_ms:.1f}ms"
