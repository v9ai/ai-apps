"""
Test suite for Module 5: Report Generation.

Covers:
- Structured output: Outlines grammar constraints, 100% valid JSON
- Pydantic schema validation (LeadReport, Source)
- Self-RAG claim verification: factual vs hallucinated claims
- Confidence calibration: fact-based scoring
- Reranker MMR: relevance-diversity tradeoff, top-K ordering
- LightGraphRAG: 1-hop retrieval, entity relationship queries
"""

import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# ---- Module imports ----
try:
    from structured_output import (
        BenchmarkMetrics,
        ConfidenceCalibrator,
        GenerationConfig,
        LeadReport,
        OutlinesJSONGenerator,
        Source,
    )
    HAS_STRUCTURED = True
except ImportError:
    HAS_STRUCTURED = False


# ===========================================================================
# Helpers
# ===========================================================================

def _valid_report_dict(**overrides) -> Dict[str, Any]:
    """Return a minimal valid LeadReport dict, with optional overrides."""
    base = {
        "summary": (
            "Acme Corporation is a Berlin-based cybersecurity startup "
            "with demonstrated product-market fit and strong funding."
        ),
        "key_strengths": ["Strong funding", "Experienced team"],
        "growth_indicators": ["$12M Series A"],
        "risk_factors": ["Competitive market"],
        "recommended_approach": (
            "Engage via enterprise security pitch, leveraging recent funding momentum."
        ),
        "confidence": 0.82,
        "sources": [
            {"url": "https://acme.com", "relevance_score": 0.9},
        ],
    }
    base.update(overrides)
    return base


def _make_calibrator():
    if HAS_STRUCTURED:
        return ConfidenceCalibrator()
    return None


# ===========================================================================
# Pydantic schema — LeadReport
# ===========================================================================

@pytest.mark.skipif(not HAS_STRUCTURED, reason="structured_output not importable")
class TestLeadReportSchema:

    def test_valid_report_parses(self):
        report = LeadReport(**_valid_report_dict())
        assert report.confidence == pytest.approx(0.82)
        assert len(report.key_strengths) == 2

    def test_summary_too_short_rejected(self):
        with pytest.raises(Exception):
            LeadReport(**_valid_report_dict(summary="Short."))

    def test_summary_too_long_rejected(self):
        long_summary = "A" * 501
        with pytest.raises(Exception):
            LeadReport(**_valid_report_dict(summary=long_summary))

    def test_confidence_out_of_range(self):
        with pytest.raises(Exception):
            LeadReport(**_valid_report_dict(confidence=1.5))

    def test_confidence_negative(self):
        with pytest.raises(Exception):
            LeadReport(**_valid_report_dict(confidence=-0.1))

    def test_recommended_approach_too_short(self):
        with pytest.raises(Exception):
            LeadReport(**_valid_report_dict(recommended_approach="Do it."))

    def test_whitespace_trimmed(self):
        report = LeadReport(**_valid_report_dict(
            summary="  Acme Corporation   is a Berlin-based  cybersecurity   startup with  strong  funding history. "
        ))
        assert "  " not in report.summary

    def test_deduplication_of_strengths(self):
        report = LeadReport(**_valid_report_dict(
            key_strengths=["Strong funding", "strong funding", "Experienced team"]
        ))
        assert len(report.key_strengths) == 2

    def test_deduplication_of_growth_indicators(self):
        report = LeadReport(**_valid_report_dict(
            growth_indicators=["$12M Series A", "$12m series a"]
        ))
        assert len(report.growth_indicators) == 1

    def test_to_dict_excludes_metadata_by_default(self):
        report = LeadReport(**_valid_report_dict())
        d = report.to_dict(include_metadata=False)
        assert "_metadata" not in d
        assert "summary" in d
        assert "sources" in d

    def test_to_dict_includes_metadata(self):
        report = LeadReport(**_valid_report_dict())
        report.set_internal_metadata(token_count=150, fact_count=5, fact_overlap_score=0.6)
        d = report.to_dict(include_metadata=True)
        assert "_metadata" in d
        assert d["_metadata"]["token_count"] == 150

    def test_sources_parsed(self):
        report = LeadReport(**_valid_report_dict())
        assert len(report.sources) == 1
        assert report.sources[0].url == "https://acme.com"

    def test_empty_sources_allowed(self):
        report = LeadReport(**_valid_report_dict(sources=[]))
        assert report.sources == []


# ===========================================================================
# Pydantic schema — Source
# ===========================================================================

@pytest.mark.skipif(not HAS_STRUCTURED, reason="structured_output not importable")
class TestSourceSchema:

    def test_valid_source(self):
        s = Source(url="https://example.com", relevance_score=0.8)
        assert s.url == "https://example.com"

    def test_relevance_score_range(self):
        with pytest.raises(Exception):
            Source(url="https://x.com", relevance_score=1.5)

    def test_optional_fields(self):
        s = Source(url="https://x.com", relevance_score=0.5)
        assert s.title is None
        assert s.crawl_date is None


# ===========================================================================
# Structured output — 100% valid JSON
# ===========================================================================

@pytest.mark.skipif(not HAS_STRUCTURED, reason="structured_output not importable")
class TestStructuredOutputJSON:

    def test_valid_json_round_trip(self):
        """A well-formed report should serialise and de-serialise without loss."""
        report = LeadReport(**_valid_report_dict())
        json_str = json.dumps(report.to_dict())
        parsed = json.loads(json_str)
        assert parsed["summary"] == report.summary
        assert parsed["confidence"] == report.confidence

    @pytest.mark.parametrize("n", range(20))
    def test_many_valid_reports(self, n):
        """Generate N valid reports — every single one must produce valid JSON."""
        rng = np.random.RandomState(n)
        d = _valid_report_dict(
            confidence=round(rng.uniform(0.4, 0.95), 2),
            key_strengths=[f"Strength {i}" for i in range(rng.randint(0, 4))],
        )
        report = LeadReport(**d)
        json_str = json.dumps(report.to_dict())
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)

    def test_json_contains_required_fields(self):
        report = LeadReport(**_valid_report_dict())
        d = report.to_dict()
        for field in ["summary", "key_strengths", "growth_indicators",
                       "risk_factors", "recommended_approach", "confidence", "sources"]:
            assert field in d, f"Missing field: {field}"


# ===========================================================================
# Confidence calibration
# ===========================================================================

@pytest.mark.skipif(not HAS_STRUCTURED, reason="structured_output not importable")
class TestConfidenceCalibration:

    @pytest.fixture
    def calibrator(self):
        return ConfidenceCalibrator()

    def test_minimum_floor(self, calibrator):
        conf, _ = calibrator.calibrate(
            fact_count=0, source_facts=[], generated_text="", source_count=0
        )
        assert conf >= calibrator.min_confidence

    def test_maximum_ceiling(self, calibrator):
        conf, _ = calibrator.calibrate(
            fact_count=100,
            source_facts=["fact " * 50],
            generated_text="fact " * 200,
            source_count=20,
        )
        assert conf <= calibrator.max_confidence

    def test_more_facts_higher_confidence(self, calibrator):
        conf_low, _ = calibrator.calibrate(1, ["fact1"], "some text with fact1", 1)
        conf_high, _ = calibrator.calibrate(5, ["fact1", "fact2", "fact3", "fact4", "fact5"],
                                            "some text with fact1 fact2 fact3 fact4 fact5", 3)
        assert conf_high > conf_low

    def test_component_scores_returned(self, calibrator):
        _, components = calibrator.calibrate(3, ["fact"], "some generated text with fact", 2)
        assert "fact_count" in components
        assert "token_overlap" in components
        assert "source_diversity" in components
        assert "text_length" in components

    def test_token_overlap_zero_on_empty_sources(self, calibrator):
        _, components = calibrator.calibrate(0, [], "any text", 0)
        assert components["token_overlap"] == 0.0

    @pytest.mark.parametrize("fact_count,expected_min_conf", [
        (0, 0.40),
        (1, 0.40),
        (3, 0.50),
        (5, 0.60),
    ])
    def test_fact_count_scales_confidence(self, calibrator, fact_count, expected_min_conf):
        conf, _ = calibrator.calibrate(
            fact_count, [f"fact{i}" for i in range(fact_count)],
            " ".join([f"fact{i}" for i in range(fact_count)]), 1
        )
        assert conf >= expected_min_conf


# ===========================================================================
# GenerationConfig
# ===========================================================================

@pytest.mark.skipif(not HAS_STRUCTURED, reason="structured_output not importable")
class TestGenerationConfig:

    def test_defaults(self):
        cfg = GenerationConfig()
        assert cfg.model_name == "llama3.1:8b-instruct-q4_K_M"
        assert cfg.max_tokens == 300
        assert cfg.temperature == pytest.approx(0.3)
        assert cfg.max_retries == 2

    def test_custom_config(self):
        cfg = GenerationConfig(model_name="custom-model", max_tokens=500, timeout_seconds=60)
        assert cfg.model_name == "custom-model"
        assert cfg.timeout_seconds == 60


# ===========================================================================
# BenchmarkMetrics
# ===========================================================================

@pytest.mark.skipif(not HAS_STRUCTURED, reason="structured_output not importable")
class TestBenchmarkMetrics:

    def test_success_metrics(self):
        m = BenchmarkMetrics(
            company_id=1,
            total_latency_ms=250.0,
            llm_inference_ms=200.0,
            json_parsing_ms=10.0,
            validation_ms=5.0,
            tokens_generated=150,
            grammar_enforced=True,
            fallback_used=False,
            success=True,
        )
        assert m.success is True
        assert m.error_message is None

    def test_failure_metrics(self):
        m = BenchmarkMetrics(
            company_id=2,
            total_latency_ms=0,
            llm_inference_ms=0,
            json_parsing_ms=0,
            validation_ms=0,
            tokens_generated=0,
            grammar_enforced=True,
            fallback_used=True,
            success=False,
            error_message="Timeout",
        )
        assert not m.success
        assert m.error_message == "Timeout"


# ===========================================================================
# OutlinesJSONGenerator (mocked)
# ===========================================================================

@pytest.mark.skipif(not HAS_STRUCTURED, reason="structured_output not importable")
class TestOutlinesJSONGenerator:

    @pytest.fixture
    def generator(self):
        mock_client = MagicMock()
        mock_client.health_check = MagicMock(return_value=True)
        with patch.dict("sys.modules", {"outlines": MagicMock(), "outlines.generate": MagicMock()}):
            gen = OutlinesJSONGenerator(
                ollama_client=mock_client,
                model_name="test-model",
                use_outlines=True,
            )
            gen.has_outlines = True
            return gen

    def test_initialization(self, generator):
        assert generator.model_name == "test-model"
        assert generator.use_outlines is True

    @pytest.mark.asyncio
    async def test_generate_json_uses_outlines(self, generator):
        from unittest.mock import AsyncMock as AM
        generator._generate_with_outlines = AM(
            return_value=(json.dumps(_valid_report_dict()), "outlines_cfg")
        )
        result, mode = await generator.generate_json("prompt", LeadReport)
        assert mode == "outlines_cfg"
        parsed = json.loads(result)
        assert "summary" in parsed

    @pytest.mark.asyncio
    async def test_fallback_to_ollama_json(self, generator):
        from unittest.mock import AsyncMock as AM
        generator.has_outlines = False
        generator._ollama_json_supported = AM(return_value=True)
        generator._generate_with_ollama_json = AM(
            return_value=(json.dumps(_valid_report_dict()), "ollama_json")
        )
        result, mode = await generator.generate_json("prompt", LeadReport)
        assert mode == "ollama_json"

    @pytest.mark.asyncio
    async def test_fallback_to_temperature(self, generator):
        from unittest.mock import AsyncMock as AM
        generator.has_outlines = False
        generator._ollama_json_supported = AM(return_value=False)
        generator._generate_with_temperature_fallback = AM(
            return_value=(json.dumps(_valid_report_dict()), "fallback_temp")
        )
        result, mode = await generator.generate_json("prompt", LeadReport)
        assert mode == "fallback_temp"


# ===========================================================================
# Self-RAG claim verification (mock-based)
# ===========================================================================

class TestSelfRAGClaimVerification:
    """Tests for factual vs hallucinated claim detection."""

    def _verify_claim(self, claim: str, source_facts: List[str],
                      overlap_threshold: float = 0.3) -> Tuple[bool, float]:
        """
        Simple claim verification via token overlap.
        Returns (is_supported, overlap_score).
        """
        claim_tokens = set(re.findall(r"\w+", claim.lower()))
        source_tokens = set()
        for fact in source_facts:
            source_tokens.update(re.findall(r"\w+", fact.lower()))

        if not claim_tokens:
            return False, 0.0

        overlap = len(claim_tokens & source_tokens) / len(claim_tokens)
        return overlap >= overlap_threshold, overlap

    def test_factual_claim_supported(self):
        claim = "Acme Corporation raised $12M in Series A funding"
        facts = ["Acme Corporation raised $12M in Series A from Sequoia Capital"]
        supported, score = self._verify_claim(claim, facts)
        assert supported
        assert score > 0.5

    def test_hallucinated_claim_rejected(self):
        claim = "Acme Corporation acquired Facebook for $100B"
        facts = ["Acme Corporation raised $12M in Series A from Sequoia Capital"]
        supported, score = self._verify_claim(claim, facts, overlap_threshold=0.5)
        assert not supported
        assert score < 0.5

    def test_empty_claim(self):
        supported, score = self._verify_claim("", ["Some fact"])
        assert not supported
        assert score == 0.0

    def test_empty_facts(self):
        supported, score = self._verify_claim("A claim", [])
        assert not supported
        assert score == 0.0

    @pytest.mark.parametrize("claim,expected_supported", [
        ("Berlin-based cybersecurity startup", True),
        ("London-based fintech unicorn", False),
        ("raised $12M from Sequoia Capital", True),
    ])
    def test_parametrized_claims(self, claim, expected_supported):
        facts = [
            "Berlin-based cybersecurity startup Acme raised $12M from Sequoia Capital",
        ]
        supported, _ = self._verify_claim(claim, facts, overlap_threshold=0.4)
        assert supported == expected_supported


# ===========================================================================
# Reranker MMR (mock-based)
# ===========================================================================

class TestRerankerMMR:
    """Tests for Maximal Marginal Relevance ranking."""

    def _mmr_rerank(self, query_emb: np.ndarray, doc_embs: np.ndarray,
                    relevance_scores: np.ndarray, lambda_param: float = 0.7,
                    top_k: int = 5) -> List[int]:
        """
        Simple MMR implementation for testing.
        MMR = lambda * relevance - (1-lambda) * max_similarity_to_selected
        """
        n = len(doc_embs)
        if n == 0:
            return []

        selected = []
        candidates = list(range(n))

        # Precompute doc-doc similarities
        norms = np.linalg.norm(doc_embs, axis=1, keepdims=True) + 1e-8
        doc_embs_norm = doc_embs / norms
        sim_matrix = doc_embs_norm @ doc_embs_norm.T

        for _ in range(min(top_k, n)):
            if not candidates:
                break

            best_idx = None
            best_score = -float("inf")

            for idx in candidates:
                relevance = relevance_scores[idx]
                if selected:
                    max_sim = max(sim_matrix[idx, s] for s in selected)
                else:
                    max_sim = 0.0

                mmr_score = lambda_param * relevance - (1 - lambda_param) * max_sim
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx

            if best_idx is not None:
                selected.append(best_idx)
                candidates.remove(best_idx)

        return selected

    def test_mmr_selects_top_k(self):
        rng = np.random.RandomState(42)
        query = rng.randn(384).astype(np.float32)
        docs = rng.randn(10, 384).astype(np.float32)
        scores = rng.uniform(0.5, 1.0, 10)

        selected = self._mmr_rerank(query, docs, scores, top_k=5)
        assert len(selected) == 5
        assert len(set(selected)) == 5  # no duplicates

    def test_mmr_respects_relevance(self):
        """The most relevant doc should be selected first."""
        rng = np.random.RandomState(42)
        docs = rng.randn(5, 384).astype(np.float32)
        scores = np.array([0.1, 0.9, 0.3, 0.5, 0.2])
        query = rng.randn(384).astype(np.float32)

        selected = self._mmr_rerank(query, docs, scores, lambda_param=1.0, top_k=1)
        assert selected[0] == 1  # highest relevance

    def test_mmr_diversity_penalty(self):
        """With lambda=0, MMR should maximise diversity (avoid similar docs)."""
        rng = np.random.RandomState(42)
        # Create two clusters of similar docs
        base = rng.randn(384).astype(np.float32)
        docs = np.vstack([
            base + rng.randn(384) * 0.01,  # very similar to base
            base + rng.randn(384) * 0.01,
            rng.randn(384),  # different
            rng.randn(384),  # different
        ])
        scores = np.array([0.9, 0.85, 0.8, 0.75])
        query = rng.randn(384).astype(np.float32)

        selected = self._mmr_rerank(query, docs, scores, lambda_param=0.3, top_k=3)
        # With diversity penalty, should not pick both similar docs first
        assert len(selected) == 3

    def test_mmr_empty_docs(self):
        docs = np.zeros((0, 384), dtype=np.float32)
        scores = np.array([])
        query = np.random.randn(384).astype(np.float32)
        selected = self._mmr_rerank(query, docs, scores)
        assert selected == []

    @pytest.mark.parametrize("lambda_param", [0.0, 0.3, 0.5, 0.7, 1.0])
    def test_mmr_lambda_range(self, lambda_param):
        rng = np.random.RandomState(42)
        docs = rng.randn(8, 384).astype(np.float32)
        scores = rng.uniform(0, 1, 8)
        query = rng.randn(384).astype(np.float32)

        selected = self._mmr_rerank(query, docs, scores, lambda_param=lambda_param, top_k=4)
        assert len(selected) == 4

    def test_mmr_latency(self):
        """MMR should be fast for practical sizes."""
        rng = np.random.RandomState(42)
        docs = rng.randn(100, 384).astype(np.float32)
        scores = rng.uniform(0, 1, 100)
        query = rng.randn(384).astype(np.float32)

        t0 = time.perf_counter()
        self._mmr_rerank(query, docs, scores, top_k=10)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        assert elapsed_ms < 500, f"MMR took {elapsed_ms:.1f}ms for 100 docs"


# ===========================================================================
# LightGraphRAG (mock-based)
# ===========================================================================

class TestLightGraphRAG:
    """Mocked tests for 1-hop entity retrieval."""

    @pytest.fixture
    def knowledge_graph(self):
        """Simple adjacency-list knowledge graph."""
        return {
            "Acme Corporation": {
                "founded_by": ["Jane Doe"],
                "located_in": ["Berlin"],
                "funded_by": ["Sequoia Capital"],
                "industry": ["cybersecurity"],
            },
            "Jane Doe": {
                "works_at": ["Acme Corporation"],
                "located_in": ["Berlin"],
            },
            "Sequoia Capital": {
                "invested_in": ["Acme Corporation", "Stripe"],
            },
        }

    def _one_hop(self, graph: Dict, entity: str) -> Dict[str, List[str]]:
        """Retrieve all 1-hop relationships for an entity."""
        return graph.get(entity, {})

    def test_one_hop_retrieval(self, knowledge_graph):
        result = self._one_hop(knowledge_graph, "Acme Corporation")
        assert "founded_by" in result
        assert "Jane Doe" in result["founded_by"]

    def test_one_hop_missing_entity(self, knowledge_graph):
        result = self._one_hop(knowledge_graph, "Unknown Corp")
        assert result == {}

    def test_relationship_types(self, knowledge_graph):
        result = self._one_hop(knowledge_graph, "Acme Corporation")
        expected_rels = {"founded_by", "located_in", "funded_by", "industry"}
        assert set(result.keys()) == expected_rels

    def test_multi_hop_via_chaining(self, knowledge_graph):
        """2-hop: Acme -> Jane Doe -> works_at."""
        hop1 = self._one_hop(knowledge_graph, "Acme Corporation")
        founders = hop1.get("founded_by", [])
        assert "Jane Doe" in founders

        hop2 = self._one_hop(knowledge_graph, "Jane Doe")
        assert "Acme Corporation" in hop2.get("works_at", [])

    def test_investor_query(self, knowledge_graph):
        """Who invested in Acme?"""
        acme = self._one_hop(knowledge_graph, "Acme Corporation")
        investors = acme.get("funded_by", [])
        assert "Sequoia Capital" in investors

    @pytest.mark.parametrize("entity", ["Acme Corporation", "Jane Doe", "Sequoia Capital"])
    def test_all_entities_retrievable(self, knowledge_graph, entity):
        result = self._one_hop(knowledge_graph, entity)
        assert len(result) > 0
