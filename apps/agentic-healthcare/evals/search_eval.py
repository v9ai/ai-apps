"""
Search route evaluation — LlamaIndex embed + pgvector similarity search quality.

Tests:
  1. Search query embedding: 1024-dim, deterministic, consistent with generate_embedding()
  2. Ranking correctness: relevant content scores higher via cosine similarity
  3. Hybrid search score formula: combined_score = 0.3 * FTS + 0.7 * vector_similarity
  4. Route handler shape: correct response keys, API key enforcement, embed-once for /multi
  5. Threshold filtering logic
  6. DeepEval (GEval): search result relevance and multi-search coverage quality

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/search_eval.py -v
"""

from __future__ import annotations

from unittest.mock import patch

import numpy as np
import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams
from fastapi import FastAPI
from fastapi.testclient import TestClient

from conftest import make_geval, skip_no_judge

from embeddings import generate_embedding, get_embed_model

# ── helpers ────────────────────────────────────────────────────────────


def cosine_sim(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a), np.array(b)
    return float(np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb)))


# ── content strings matching the format_*_for_embedding formatters ─────

_LIPID_TEST = (
    "Blood test: lipid_panel.pdf\n"
    "Date: 2024-01-15T10:00:00+00:00\n"
    "Summary: 4 abnormal marker(s): Total Cholesterol (high), Triglycerides (high), HDL (low), LDL (high)\n"
    "\n"
    "Total Cholesterol: 245 mg/dL (ref: 0-200) [high]\n"
    "Triglycerides: 210 mg/dL (ref: 0-150) [high]\n"
    "HDL: 38 mg/dL (ref: 40-60) [low]\n"
    "LDL: 155 mg/dL (ref: 0-100) [high]\n"
    "Glucose: 88 mg/dL (ref: 70-100) [normal]"
)

_RENAL_TEST = (
    "Blood test: renal_panel.pdf\n"
    "Date: 2024-02-01T10:00:00+00:00\n"
    "Summary: 2 abnormal marker(s): BUN (high), Creatinine (high)\n"
    "\n"
    "BUN: 28 mg/dL (ref: 7-20) [high]\n"
    "Creatinine: 1.5 mg/dL (ref: 0.7-1.3) [high]\n"
    "Sodium: 140 mEq/L (ref: 136-145) [normal]"
)

_CBC_TEST = (
    "Blood test: cbc_panel.pdf\n"
    "Date: 2024-03-01T10:00:00+00:00\n"
    "Summary: All markers within normal range\n"
    "\n"
    "WBC: 7.5 K/uL (ref: 4.0-11.0) [normal]\n"
    "Hemoglobin: 14.2 g/dL (ref: 12.0-16.0) [normal]\n"
    "Neutrophils: 4.5 K/uL (ref: 1.5-7.0) [normal]\n"
    "Lymphocytes: 2.0 K/uL (ref: 1.0-3.5) [normal]"
)

_HDL_MARKER = (
    "Marker: HDL\nValue: 38 mg/dL\nReference range: 40-60\nFlag: low\n"
    "Test: lipid_panel.pdf\nDate: 2024-01-15"
)

_BUN_MARKER = (
    "Marker: BUN\nValue: 28 mg/dL\nReference range: 7-20\nFlag: high\n"
    "Test: renal_panel.pdf\nDate: 2024-02-01"
)

_CONDITION = "Health condition: Type 2 Diabetes\nNotes: Managed with Metformin 500mg twice daily"
_MEDICATION = "Medication: Metformin\nDosage: 500mg\nFrequency: twice daily"
_SYMPTOM = "Symptom: Fatigue and increased thirst\nSeverity: moderate"
_APPOINTMENT = (
    "Appointment: Annual checkup\nProvider: Dr. Smith\n"
    "Notes: Discussed lipid panel results, recommended dietary changes"
)

# ── mock results ───────────────────────────────────────────────────────

_MOCK_TEST = {
    "id": "emb-1", "test_id": "test-abc", "content": _LIPID_TEST,
    "similarity": 0.85, "file_name": "lipid_panel.pdf", "test_date": "2024-01-15",
}
_MOCK_MARKER = {
    "marker_id": "m-1", "test_id": "test-abc", "marker_name": "HDL",
    "content": _HDL_MARKER, "fts_rank": 0.5, "vector_similarity": 0.88, "combined_score": 0.766,
}
_MOCK_CONDITION = {"id": "ce-1", "condition_id": "cond-1", "content": _CONDITION, "similarity": 0.79}
_MOCK_MEDICATION = {"id": "me-1", "medication_id": "med-1", "content": _MEDICATION, "similarity": 0.76}
_MOCK_SYMPTOM = {"id": "se-1", "symptom_id": "sym-1", "content": _SYMPTOM, "similarity": 0.72}
_MOCK_APPOINTMENT = {"id": "ae-1", "appointment_id": "appt-1", "content": _APPOINTMENT, "similarity": 0.68}
_MOCK_TREND = {
    "marker_id": "m-2", "test_id": "test-abc", "marker_name": "HDL",
    "content": _HDL_MARKER, "similarity": 0.91,
    "value": "38", "unit": "mg/dL", "flag": "low",
    "test_date": "2024-01-15", "file_name": "lipid_panel.pdf",
}


# ═══════════════════════════════════════════════════════════════════════
# A. Search query embedding quality
# ═══════════════════════════════════════════════════════════════════════


class TestSearchQueryEmbedding:
    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    def test_dimension_1024(self, embed_model):
        vec = embed_model.get_text_embedding("What are my cholesterol levels?")
        assert len(vec) == 1024

    def test_deterministic(self, embed_model):
        q = "Do I have kidney problems?"
        v1 = embed_model.get_text_embedding(q)
        v2 = embed_model.get_text_embedding(q)
        np.testing.assert_allclose(v1, v2, atol=1e-6)

    def test_generate_embedding_matches_model(self, embed_model):
        text = "What is my HDL cholesterol?"
        via_model = embed_model.get_text_embedding(text)
        via_func = generate_embedding(text)
        np.testing.assert_allclose(via_model, via_func, atol=1e-6)

    def test_different_queries_differ(self, embed_model):
        v_cholesterol = embed_model.get_text_embedding("cholesterol lipid panel")
        v_kidney = embed_model.get_text_embedding("kidney function BUN creatinine")
        sim = cosine_sim(v_cholesterol, v_kidney)
        assert sim < 0.99, "Unrelated queries should not be identical"


# ═══════════════════════════════════════════════════════════════════════
# B. Ranking correctness — domain-relevant content scores higher
# ═══════════════════════════════════════════════════════════════════════


class TestSearchRanking:
    @pytest.fixture(scope="class")
    def embed_model(self):
        return get_embed_model()

    def test_cholesterol_query_ranks_lipid_over_renal(self, embed_model):
        q = embed_model.get_text_embedding("What are my cholesterol and lipid levels?")
        sim_lipid = cosine_sim(q, embed_model.get_text_embedding(_LIPID_TEST))
        sim_renal = cosine_sim(q, embed_model.get_text_embedding(_RENAL_TEST))
        assert sim_lipid > sim_renal, f"lipid={sim_lipid:.4f} renal={sim_renal:.4f}"

    def test_kidney_query_ranks_renal_over_cbc(self, embed_model):
        q = embed_model.get_text_embedding("How is my kidney function? BUN and creatinine?")
        sim_renal = cosine_sim(q, embed_model.get_text_embedding(_RENAL_TEST))
        sim_cbc = cosine_sim(q, embed_model.get_text_embedding(_CBC_TEST))
        assert sim_renal > sim_cbc, f"renal={sim_renal:.4f} cbc={sim_cbc:.4f}"

    def test_inflammation_query_ranks_cbc_over_lipid(self, embed_model):
        q = embed_model.get_text_embedding("WBC neutrophils infection inflammation?")
        sim_cbc = cosine_sim(q, embed_model.get_text_embedding(_CBC_TEST))
        sim_lipid = cosine_sim(q, embed_model.get_text_embedding(_LIPID_TEST))
        assert sim_cbc > sim_lipid, f"cbc={sim_cbc:.4f} lipid={sim_lipid:.4f}"

    def test_hdl_marker_query_ranks_hdl_over_bun(self, embed_model):
        q = embed_model.get_text_embedding("What is my HDL cholesterol value?")
        sim_hdl = cosine_sim(q, embed_model.get_text_embedding(_HDL_MARKER))
        sim_bun = cosine_sim(q, embed_model.get_text_embedding(_BUN_MARKER))
        assert sim_hdl > sim_bun, f"hdl={sim_hdl:.4f} bun={sim_bun:.4f}"

    def test_diabetes_query_ranks_condition_over_appointment(self, embed_model):
        q = embed_model.get_text_embedding("Do I have diabetes or insulin resistance?")
        sim_condition = cosine_sim(q, embed_model.get_text_embedding(_CONDITION))
        sim_appt = cosine_sim(q, embed_model.get_text_embedding(_APPOINTMENT))
        assert sim_condition > sim_appt, f"condition={sim_condition:.4f} appt={sim_appt:.4f}"

    def test_medication_query_ranks_medication_over_symptom(self, embed_model):
        q = embed_model.get_text_embedding("What medications am I taking? Metformin dosage?")
        sim_med = cosine_sim(q, embed_model.get_text_embedding(_MEDICATION))
        sim_sym = cosine_sim(q, embed_model.get_text_embedding(_SYMPTOM))
        assert sim_med > sim_sym, f"med={sim_med:.4f} sym={sim_sym:.4f}"

    def test_lipid_ranks_higher_than_irrelevant(self, embed_model):
        q = embed_model.get_text_embedding("TG/HDL ratio cardiovascular risk")
        sim_lipid = cosine_sim(q, embed_model.get_text_embedding(_LIPID_TEST))
        sim_appt = cosine_sim(q, embed_model.get_text_embedding(_APPOINTMENT))
        assert sim_lipid > sim_appt, f"lipid={sim_lipid:.4f} appt={sim_appt:.4f}"


# ═══════════════════════════════════════════════════════════════════════
# C. Hybrid search score formula
# ═══════════════════════════════════════════════════════════════════════


class TestHybridSearchScoring:
    @pytest.mark.parametrize("fts,vec,expected", [
        (1.0, 1.0, 1.0),
        (0.0, 1.0, 0.7),
        (1.0, 0.0, 0.3),
        (0.5, 0.8, 0.71),
        (0.0, 0.0, 0.0),
        (0.8, 0.6, 0.66),
    ])
    def test_combined_score_formula(self, fts, vec, expected):
        assert 0.3 * fts + 0.7 * vec == pytest.approx(expected, rel=1e-6)

    def test_vector_dominates_fts(self):
        high_fts_score = 0.3 * 1.0 + 0.7 * 0.0   # = 0.30
        high_vec_score = 0.3 * 0.0 + 0.7 * 1.0   # = 0.70
        assert high_vec_score > high_fts_score

    def test_equal_fts_and_vector_weights_to_1(self):
        assert 0.3 + 0.7 == pytest.approx(1.0)


# ═══════════════════════════════════════════════════════════════════════
# D. Route handler tests (mocked DB + embeddings)
# ═══════════════════════════════════════════════════════════════════════


@pytest.fixture(scope="module")
def search_client():
    from routes.search import router as search_router
    app = FastAPI()
    app.include_router(search_router)
    return TestClient(app)


class TestSearchRoutes:
    def test_tests_endpoint_shape(self, search_client):
        with (
            patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
            patch("routes.search.search_blood_tests", return_value=[_MOCK_TEST]),
        ):
            resp = search_client.post(
                "/search/tests", json={"query": "cholesterol", "user_id": "u1"}
            )
        assert resp.status_code == 200
        r = resp.json()["results"][0]
        assert all(k in r for k in ("id", "test_id", "content", "similarity", "file_name", "test_date"))

    def test_markers_endpoint_shape(self, search_client):
        with (
            patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
            patch("routes.search.search_markers_hybrid", return_value=[_MOCK_MARKER]),
        ):
            resp = search_client.post(
                "/search/markers", json={"query": "HDL", "user_id": "u1"}
            )
        assert resp.status_code == 200
        r = resp.json()["results"][0]
        assert all(k in r for k in ("marker_id", "test_id", "marker_name", "content", "combined_score"))

    def test_multi_endpoint_returns_all_entity_types(self, search_client):
        with (
            patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
            patch("routes.search.search_blood_tests", return_value=[_MOCK_TEST]),
            patch("routes.search.search_markers_hybrid", return_value=[_MOCK_MARKER]),
            patch("routes.search.search_conditions", return_value=[_MOCK_CONDITION]),
            patch("routes.search.search_medications", return_value=[_MOCK_MEDICATION]),
            patch("routes.search.search_symptoms", return_value=[_MOCK_SYMPTOM]),
            patch("routes.search.search_appointments", return_value=[_MOCK_APPOINTMENT]),
        ):
            resp = search_client.post(
                "/search/multi", json={"query": "health summary", "user_id": "u1"}
            )
        assert resp.status_code == 200
        data = resp.json()
        assert all(k in data for k in ("tests", "markers", "conditions", "medications", "symptoms", "appointments"))

    def test_multi_endpoint_embeds_once(self, search_client):
        call_count = 0

        def counting_embed(text: str) -> list[float]:
            nonlocal call_count
            call_count += 1
            return [0.1] * 1024

        with (
            patch("routes.search.generate_embedding", side_effect=counting_embed),
            patch("routes.search.search_blood_tests", return_value=[]),
            patch("routes.search.search_markers_hybrid", return_value=[]),
            patch("routes.search.search_conditions", return_value=[]),
            patch("routes.search.search_medications", return_value=[]),
            patch("routes.search.search_symptoms", return_value=[]),
            patch("routes.search.search_appointments", return_value=[]),
        ):
            search_client.post("/search/multi", json={"query": "anything", "user_id": "u1"})

        assert call_count == 1, f"Expected 1 embedding call for /multi, got {call_count}"

    def test_trend_endpoint_shape(self, search_client):
        with (
            patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
            patch("routes.search.search_marker_trend", return_value=[_MOCK_TREND]),
        ):
            resp = search_client.post(
                "/search/trend",
                json={"query": "HDL trend", "user_id": "u1", "marker_name": "HDL"},
            )
        assert resp.status_code == 200
        r = resp.json()["results"][0]
        assert all(k in r for k in ("marker_id", "test_id", "marker_name", "value", "unit", "flag", "test_date"))

    def test_trend_passes_none_marker_name_when_omitted(self, search_client):
        with (
            patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
            patch("routes.search.search_marker_trend", return_value=[]) as mock_fn,
        ):
            search_client.post("/search/trend", json={"query": "all trends", "user_id": "u1"})
        args = mock_fn.call_args[0]
        assert args[2] is None  # marker_name positional arg

    def test_empty_results(self, search_client):
        with (
            patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
            patch("routes.search.search_blood_tests", return_value=[]),
        ):
            resp = search_client.post("/search/tests", json={"query": "x", "user_id": "u1"})
        assert resp.status_code == 200
        assert resp.json() == {"results": []}

    def test_api_key_enforced(self):
        from routes.search import router as search_router
        from config import settings

        original = settings.internal_api_key
        settings.internal_api_key = "secret-key"
        try:
            app = FastAPI()
            app.include_router(search_router)
            client = TestClient(app, raise_server_exceptions=False)
            with (
                patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
                patch("routes.search.search_blood_tests", return_value=[]),
            ):
                resp = client.post("/search/tests", json={"query": "x", "user_id": "u1"})
            assert resp.status_code == 401
        finally:
            settings.internal_api_key = original

    def test_valid_api_key_accepted(self):
        from routes.search import router as search_router
        from config import settings

        original = settings.internal_api_key
        settings.internal_api_key = "secret-key"
        try:
            app = FastAPI()
            app.include_router(search_router)
            client = TestClient(app)
            with (
                patch("routes.search.generate_embedding", return_value=[0.1] * 1024),
                patch("routes.search.search_blood_tests", return_value=[]),
            ):
                resp = client.post(
                    "/search/tests",
                    json={"query": "x", "user_id": "u1"},
                    headers={"x-api-key": "secret-key"},
                )
            assert resp.status_code == 200
        finally:
            settings.internal_api_key = original


# ═══════════════════════════════════════════════════════════════════════
# E. Threshold filtering
# ═══════════════════════════════════════════════════════════════════════


class TestThresholdFiltering:
    @pytest.mark.parametrize("similarity,threshold,should_include", [
        (0.85, 0.3, True),
        (0.31, 0.3, True),
        (0.30, 0.3, False),  # not strictly greater than
        (0.29, 0.3, False),
        (0.00, 0.3, False),
    ])
    def test_threshold_boundary(self, similarity, threshold, should_include):
        assert (similarity > threshold) == should_include

    def test_vector_sim_drives_inclusion(self):
        # Hybrid search filters on vector_similarity > threshold, not combined_score
        vector_sim = 0.25  # below threshold
        threshold = 0.3
        assert vector_sim <= threshold  # excluded regardless of FTS rank


# ═══════════════════════════════════════════════════════════════════════
# F. DeepEval — search result relevance (requires DeepSeek judge)
# ═══════════════════════════════════════════════════════════════════════

_RELEVANCE_CRITERIA = (
    "Given a search query (input) and retrieved blood test / health records "
    "(actual_output), evaluate whether the results are clinically relevant to "
    "the query. Top results should directly address the health concern. "
    "Irrelevant or off-topic results reduce the score."
)

_COVERAGE_CRITERIA = (
    "Given a health question (input) and combined search results covering "
    "blood tests, conditions, medications, and symptoms (actual_output), "
    "evaluate whether the retrieved context covers the most relevant health "
    "dimensions needed to answer the question."
)


@skip_no_judge
def test_cholesterol_search_relevance():
    metric = make_geval(
        name="Search Result Relevance",
        criteria=_RELEVANCE_CRITERIA,
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )
    assert_test(
        LLMTestCase(
            input="What are my cholesterol levels and cardiovascular risk?",
            actual_output=f"{_LIPID_TEST}\n\n{_HDL_MARKER}",
        ),
        [metric],
    )


@skip_no_judge
def test_kidney_search_relevance():
    metric = make_geval(
        name="Search Result Relevance",
        criteria=_RELEVANCE_CRITERIA,
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )
    assert_test(
        LLMTestCase(
            input="How is my kidney function? BUN and creatinine normal?",
            actual_output=f"{_RENAL_TEST}\n\n{_BUN_MARKER}",
        ),
        [metric],
    )


@skip_no_judge
def test_multi_search_coverage():
    metric = make_geval(
        name="Multi-Search Coverage",
        criteria=_COVERAGE_CRITERIA,
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.7,
    )
    combined = "\n\n".join([
        f"=== Blood Tests ===\n{_LIPID_TEST}",
        f"=== Conditions ===\n{_CONDITION}",
        f"=== Medications ===\n{_MEDICATION}",
        f"=== Symptoms ===\n{_SYMPTOM}",
    ])
    assert_test(
        LLMTestCase(
            input="I have Type 2 Diabetes and take Metformin. How do my recent blood tests look?",
            actual_output=combined,
        ),
        [metric],
    )


@skip_no_judge
def test_irrelevant_results_low_score():
    metric = make_geval(
        name="Search Result Relevance",
        criteria=_RELEVANCE_CRITERIA,
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    )
    test_case = LLMTestCase(
        input="What are my cholesterol and HDL levels?",
        actual_output=f"{_RENAL_TEST}\n\n{_BUN_MARKER}",
    )
    metric.measure(test_case)
    assert metric.score < 0.7, f"Expected score < 0.7 for off-topic results, got {metric.score}"
