"""
DeepEval evaluation suite for derived metric computation and risk classification.

Tests compute_derived_metrics(), classify_metric_risk(), and the full
health-state embedding pipeline to ensure clinical ratios are accurate.

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/derived_metrics_eval.py -v
"""

from __future__ import annotations

import math

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import make_geval, skip_no_judge

from embeddings import (
    METRIC_REFERENCES,
    classify_metric_risk,
    compute_derived_metrics,
    format_health_state_for_embedding,
)
from parsers import Marker


# ═══════════════════════════════════════════════════════════════════════
# A. compute_derived_metrics — ratio calculations
# ═══════════════════════════════════════════════════════════════════════


def _make_markers(**kwargs: str) -> list[Marker]:
    return [Marker(name=k, value=v, unit="", reference_range="", flag="normal") for k, v in kwargs.items()]


class TestComputeDerivedMetrics:
    def test_hdl_ldl_ratio(self):
        markers = _make_markers(HDL="50", LDL="100")
        m = compute_derived_metrics(markers)
        assert m["hdl_ldl_ratio"] == pytest.approx(0.5)

    def test_tc_hdl_ratio(self):
        markers = _make_markers(**{"Total Cholesterol": "200", "HDL": "50"})
        m = compute_derived_metrics(markers)
        assert m["total_cholesterol_hdl_ratio"] == pytest.approx(4.0)

    def test_tg_hdl_ratio(self):
        markers = _make_markers(Triglycerides="150", HDL="50")
        m = compute_derived_metrics(markers)
        assert m["triglyceride_hdl_ratio"] == pytest.approx(3.0)

    def test_tyg_index(self):
        markers = _make_markers(Triglycerides="150", Glucose="100")
        m = compute_derived_metrics(markers)
        expected = math.log(150 * 100 * 0.5)  # natural log, per TyG formula
        assert m["glucose_triglyceride_index"] == pytest.approx(expected, rel=1e-4)

    def test_nlr(self):
        markers = _make_markers(Neutrophils="6.0", Lymphocytes="2.0")
        m = compute_derived_metrics(markers)
        assert m["neutrophil_lymphocyte_ratio"] == pytest.approx(3.0)

    def test_bun_creatinine(self):
        markers = _make_markers(BUN="20", Creatinine="1.0")
        m = compute_derived_metrics(markers)
        assert m["bun_creatinine_ratio"] == pytest.approx(20.0)

    def test_de_ritis(self):
        markers = _make_markers(AST="40", ALT="20")
        m = compute_derived_metrics(markers)
        assert m["ast_alt_ratio"] == pytest.approx(2.0)

    def test_missing_markers_return_none(self):
        markers = _make_markers(Glucose="100")
        m = compute_derived_metrics(markers)
        assert m["hdl_ldl_ratio"] is None
        assert m["neutrophil_lymphocyte_ratio"] is None

    def test_zero_denominator_returns_none(self):
        markers = _make_markers(HDL="0", LDL="100")
        m = compute_derived_metrics(markers)
        assert m["total_cholesterol_hdl_ratio"] is None

    def test_alias_resolution(self):
        """HDL Cholesterol should resolve to hdl alias."""
        markers = _make_markers(**{"HDL Cholesterol": "50", "LDL Cholesterol": "100"})
        m = compute_derived_metrics(markers)
        assert m["hdl_ldl_ratio"] == pytest.approx(0.5)

    def test_case_insensitive(self):
        markers = _make_markers(hdl="50", ldl="100")
        m = compute_derived_metrics(markers)
        assert m["hdl_ldl_ratio"] == pytest.approx(0.5)

    def test_comma_decimals(self):
        markers = _make_markers(HDL="50,5", LDL="100,0")
        m = compute_derived_metrics(markers)
        assert m["hdl_ldl_ratio"] == pytest.approx(50.5 / 100.0, rel=1e-4)

    def test_all_ratios_computable(self):
        markers = _make_markers(
            HDL="50", LDL="100",
            **{
                "Total Cholesterol": "200",
                "Triglycerides": "150",
                "Glucose": "100",
                "Neutrophils": "4.0",
                "Lymphocytes": "2.0",
                "BUN": "15",
                "Creatinine": "1.0",
                "AST": "30",
                "ALT": "25",
            },
        )
        m = compute_derived_metrics(markers)
        assert all(v is not None for v in m.values())

    def test_full_metabolic_syndrome_profile(self):
        """Verify a metabolic syndrome profile computes correct elevated ratios."""
        markers = _make_markers(
            HDL="35", LDL="160",
            **{
                "Total Cholesterol": "260",
                "Triglycerides": "280",
                "Glucose": "130",
            },
        )
        m = compute_derived_metrics(markers)
        assert m["hdl_ldl_ratio"] is not None and m["hdl_ldl_ratio"] < 0.3  # low
        assert m["total_cholesterol_hdl_ratio"] is not None and m["total_cholesterol_hdl_ratio"] > 5.5  # elevated
        assert m["triglyceride_hdl_ratio"] is not None and m["triglyceride_hdl_ratio"] > 3.5  # elevated
        assert m["glucose_triglyceride_index"] is not None and m["glucose_triglyceride_index"] > 9.0  # elevated


# ═══════════════════════════════════════════════════════════════════════
# B. classify_metric_risk — risk tier accuracy
# ═══════════════════════════════════════════════════════════════════════


class TestClassifyMetricRisk:
    # ── HDL/LDL (higher is better, optimal ≥ 0.4) ──
    def test_hdl_ldl_optimal(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.55) == "optimal"

    def test_hdl_ldl_borderline(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.35) == "borderline"

    def test_hdl_ldl_low(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.2) == "low"

    # ── TC/HDL (lower is better, optimal < 4.5) ──
    def test_tc_hdl_optimal(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 3.5) == "optimal"

    def test_tc_hdl_borderline(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 5.0) == "borderline"

    def test_tc_hdl_elevated(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 6.0) == "elevated"

    # ── TG/HDL ──
    def test_tg_hdl_optimal(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 1.5) == "optimal"

    def test_tg_hdl_borderline(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 2.5) == "borderline"

    def test_tg_hdl_elevated(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 4.0) == "elevated"

    # ── TyG Index ──
    def test_tyg_optimal(self):
        assert classify_metric_risk("glucose_triglyceride_index", 8.0) == "optimal"

    def test_tyg_borderline(self):
        assert classify_metric_risk("glucose_triglyceride_index", 8.7) == "borderline"

    def test_tyg_elevated(self):
        assert classify_metric_risk("glucose_triglyceride_index", 9.5) == "elevated"

    # ── NLR (range-optimal 1.0–3.0) ──
    def test_nlr_optimal(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 2.0) == "optimal"

    def test_nlr_borderline(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 4.0) == "borderline"

    def test_nlr_elevated(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 6.0) == "elevated"

    def test_nlr_low(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 0.5) == "low"

    # ── BUN/Creatinine (range-optimal 10–20) ──
    def test_bun_cr_optimal(self):
        assert classify_metric_risk("bun_creatinine_ratio", 15.0) == "optimal"

    def test_bun_cr_borderline(self):
        assert classify_metric_risk("bun_creatinine_ratio", 22.0) == "borderline"

    def test_bun_cr_elevated(self):
        assert classify_metric_risk("bun_creatinine_ratio", 28.0) == "elevated"

    def test_bun_cr_low(self):
        assert classify_metric_risk("bun_creatinine_ratio", 8.0) == "low"

    # ── De Ritis (range-optimal 0.8–1.2) ──
    def test_de_ritis_optimal(self):
        assert classify_metric_risk("ast_alt_ratio", 1.0) == "optimal"

    def test_de_ritis_borderline(self):
        assert classify_metric_risk("ast_alt_ratio", 1.5) == "borderline"

    def test_de_ritis_elevated(self):
        assert classify_metric_risk("ast_alt_ratio", 2.5) == "elevated"

    def test_de_ritis_low(self):
        assert classify_metric_risk("ast_alt_ratio", 0.6) == "low"

    # ── Exact boundary values ──
    def test_exact_optimal_upper(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 3.0) == "optimal"

    def test_exact_borderline_upper(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 5.0) == "borderline"

    def test_unknown_metric(self):
        assert classify_metric_risk("unknown_ratio", 42.0) == "optimal"


# ═══════════════════════════════════════════════════════════════════════
# C. format_health_state_for_embedding — output structure
# ═══════════════════════════════════════════════════════════════════════


class TestHealthStateFormatting:
    def test_all_normal_summary(self):
        markers = _make_markers(HDL="50", LDL="90", Glucose="88")
        derived = compute_derived_metrics(markers)
        content = format_health_state_for_embedding(
            markers, derived, {"fileName": "test.pdf", "uploadedAt": "2024-01-01"}
        )
        assert "All markers within normal range" in content

    def test_abnormal_summary(self):
        markers = [
            Marker(name="Glucose", value="250", unit="mg/dL", reference_range="70 - 100", flag="high"),
            Marker(name="HDL", value="35", unit="mg/dL", reference_range="40 - 60", flag="low"),
        ]
        derived = compute_derived_metrics(markers)
        content = format_health_state_for_embedding(
            markers, derived, {"fileName": "test.pdf", "uploadedAt": "2024-01-01"}
        )
        assert "2 abnormal marker(s)" in content
        assert "Glucose (high)" in content
        assert "HDL (low)" in content

    def test_derived_metrics_section(self):
        markers = _make_markers(
            HDL="50", LDL="100",
            Neutrophils="4.0", Lymphocytes="2.0",
        )
        derived = compute_derived_metrics(markers)
        content = format_health_state_for_embedding(
            markers, derived, {"fileName": "test.pdf", "uploadedAt": "2024-01-01"}
        )
        assert "HDL/LDL Ratio:" in content
        assert "NLR:" in content
        assert "[optimal]" in content

    def test_no_derived_metrics(self):
        markers = _make_markers(Glucose="88")
        derived = compute_derived_metrics(markers)
        content = format_health_state_for_embedding(
            markers, derived, {"fileName": "test.pdf", "uploadedAt": "2024-01-01"}
        )
        assert "none computed" in content


# ═══════════════════════════════════════════════════════════════════════
# D. DeepEval LLM-as-judge: clinical ratio interpretation
# ═══════════════════════════════════════════════════════════════════════

_RATIO_CASES = [
    # Case 1: Healthy profile — all optimal
    {
        "markers": _make_markers(
            HDL="55", LDL="90",
            **{
                "Total Cholesterol": "180",
                "Triglycerides": "100",
                "Glucose": "88",
                "Neutrophils": "4.0",
                "Lymphocytes": "2.0",
                "BUN": "15",
                "Creatinine": "1.0",
                "AST": "25",
                "ALT": "22",
            },
        ),
        "expected": (
            "All ratios optimal: HDL/LDL ~0.61 [optimal], TC/HDL ~3.27 [optimal], "
            "TG/HDL ~1.82 [optimal], TyG ~8.64 [borderline], NLR ~2.0 [optimal], "
            "BUN/Cr ~15.0 [optimal], De Ritis ~1.14 [optimal]"
        ),
    },
    # Case 2: Metabolic syndrome
    {
        "markers": _make_markers(
            HDL="35", LDL="160",
            **{
                "Total Cholesterol": "260",
                "Triglycerides": "280",
                "Glucose": "130",
                "Neutrophils": "5.0",
                "Lymphocytes": "2.0",
                "BUN": "18",
                "Creatinine": "1.0",
                "AST": "30",
                "ALT": "28",
            },
        ),
        "expected": (
            "Metabolic crisis: HDL/LDL ~0.22 [low], TC/HDL ~7.43 [elevated], "
            "TG/HDL ~8.0 [elevated], TyG ~9.76 [elevated], NLR ~2.5 [optimal], "
            "BUN/Cr ~18.0 [optimal], De Ritis ~1.07 [optimal]. "
            "Cardiovascular and metabolic systems at elevated risk."
        ),
    },
    # Case 3: Multi-system crisis
    {
        "markers": _make_markers(
            HDL="30", LDL="180",
            **{
                "Total Cholesterol": "280",
                "Triglycerides": "350",
                "Glucose": "200",
                "Neutrophils": "8.0",
                "Lymphocytes": "1.0",
                "BUN": "35",
                "Creatinine": "1.2",
                "AST": "120",
                "ALT": "45",
            },
        ),
        "expected": (
            "Multi-system crisis: HDL/LDL ~0.17 [low], TC/HDL ~9.33 [elevated], "
            "TG/HDL ~11.67 [elevated], NLR ~8.0 [elevated], BUN/Cr ~29.2 [elevated], "
            "De Ritis ~2.67 [elevated]. Cardiovascular, metabolic, inflammatory, "
            "renal, and hepatic systems all at elevated risk."
        ),
    },
]


@skip_no_judge
@pytest.mark.parametrize("case", _RATIO_CASES, ids=["healthy", "metabolic_syndrome", "multi_system_crisis"])
def test_ratio_interpretation(case):
    metrics = [
        make_geval(
            name="Ratio Interpretation Accuracy",
            criteria=(
                "Given a set of derived blood ratio values with risk classifications "
                "(actual_output), evaluate whether the risk labels (optimal, borderline, "
                "elevated, low) are clinically correct given the standard thresholds: "
                "TG/HDL optimal <2.0, NLR optimal 1.0-3.0, De Ritis optimal 0.8-1.2, "
                "BUN/Cr optimal 10-20, TC/HDL optimal <4.5, HDL/LDL optimal >=0.4, "
                "TyG optimal <8.5."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.8,
        ),
        make_geval(
            name="Multi-System Risk Assessment",
            criteria=(
                "Given a health state summary with multiple derived ratios (actual_output), "
                "evaluate whether the overall risk assessment correctly identifies which "
                "organ systems are affected. Elevated NLR → inflammatory, elevated BUN/Cr → "
                "renal, elevated De Ritis → hepatic, elevated TG/HDL or TyG → metabolic, "
                "elevated TC/HDL or HDL/LDL → cardiovascular."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.7,
        ),
    ]

    markers = case["markers"]
    derived = compute_derived_metrics(markers)
    content = format_health_state_for_embedding(
        markers, derived, {"fileName": "test.pdf", "uploadedAt": "2024-01-01"},
    )
    test_case = LLMTestCase(
        input="Evaluate derived blood ratios and risk classification",
        actual_output=content,
        expected_output=case["expected"],
    )
    assert_test(test_case, metrics)
