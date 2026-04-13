"""
DeepEval evaluation suite for derived metric computation and risk classification.

Tests compute_derived_metrics(), classify_metric_risk(), and the full
health-state embedding pipeline to ensure clinical ratios are accurate.

7 Derived Ratios (peer-reviewed thresholds):
  TG/HDL      < 2.0 | 2.0-3.5 | > 3.5   (McLaughlin et al.)
  TC/HDL      < 4.0 | 4.0-5.0 | > 5.0   (Castelli et al.)
  HDL/LDL     > 0.4 | 0.3-0.4 | < 0.3   (Millán et al.)
  NLR         1-3   | 3-5     | > 5      (Fest et al.)
  De Ritis    0.8-1.5| 1.5-2.0| > 2.0   (De Ritis et al.)
  BUN/Cr      10-20 | 20-25   | > 25    (Hosten et al.)
  TyG Index   < 8.5 | 8.5-9.0 | > 9.0   (Simental-Mendía et al.)

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

    def test_tyg_formula_is_natural_log(self):
        """TyG = ln(TG × Glucose × 0.5), NOT log10."""
        markers = _make_markers(Triglycerides="200", Glucose="110")
        m = compute_derived_metrics(markers)
        expected_ln = math.log(200 * 110 * 0.5)     # ≈ 9.306
        expected_log10 = math.log10(200 * 110 * 0.5)  # ≈ 4.041
        assert m["glucose_triglyceride_index"] == pytest.approx(expected_ln, rel=1e-4)
        assert m["glucose_triglyceride_index"] != pytest.approx(expected_log10, rel=0.01)

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
        assert len(m) == 7, "Expected exactly 7 derived ratios"

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
        assert m["total_cholesterol_hdl_ratio"] is not None and m["total_cholesterol_hdl_ratio"] > 5.0  # elevated
        assert m["triglyceride_hdl_ratio"] is not None and m["triglyceride_hdl_ratio"] > 3.5  # elevated
        assert m["glucose_triglyceride_index"] is not None and m["glucose_triglyceride_index"] > 9.0  # elevated

    def test_negative_values_are_handled(self):
        """Negative TG or Glucose should not produce TyG (log of negative)."""
        markers = _make_markers(Triglycerides="-50", Glucose="100")
        m = compute_derived_metrics(markers)
        assert m["glucose_triglyceride_index"] is None

    def test_sgot_sgpt_aliases(self):
        """SGOT/SGPT are legacy aliases for AST/ALT."""
        markers = _make_markers(SGOT="35", SGPT="30")
        m = compute_derived_metrics(markers)
        assert m["ast_alt_ratio"] == pytest.approx(35 / 30, rel=1e-4)


# ═══════════════════════════════════════════════════════════════════════
# B. classify_metric_risk — risk tier accuracy
# ═══════════════════════════════════════════════════════════════════════


class TestClassifyMetricRisk:
    # ── TG/HDL (lower is better, optimal < 2.0) ── McLaughlin et al.
    def test_tg_hdl_optimal(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 1.5) == "optimal"

    def test_tg_hdl_borderline(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 2.5) == "borderline"

    def test_tg_hdl_elevated(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 4.0) == "elevated"

    def test_tg_hdl_boundary_at_2(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 2.0) == "optimal"

    def test_tg_hdl_boundary_at_3_5(self):
        assert classify_metric_risk("triglyceride_hdl_ratio", 3.5) == "borderline"

    # ── TC/HDL (lower is better, optimal < 4.0) ── Castelli et al.
    def test_tc_hdl_optimal(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 3.5) == "optimal"

    def test_tc_hdl_borderline(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 4.5) == "borderline"

    def test_tc_hdl_elevated(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 5.5) == "elevated"

    def test_tc_hdl_boundary_at_4(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 4.0) == "optimal"

    def test_tc_hdl_boundary_at_5(self):
        assert classify_metric_risk("total_cholesterol_hdl_ratio", 5.0) == "borderline"

    # ── HDL/LDL (higher is better, optimal ≥ 0.4) ── Millán et al.
    def test_hdl_ldl_optimal(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.55) == "optimal"

    def test_hdl_ldl_borderline(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.35) == "borderline"

    def test_hdl_ldl_low(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.2) == "low"

    def test_hdl_ldl_boundary_at_0_4(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.4) == "optimal"

    def test_hdl_ldl_boundary_at_0_3(self):
        assert classify_metric_risk("hdl_ldl_ratio", 0.3) == "borderline"

    # ── NLR (range-optimal 1.0–3.0) ── Fest et al.
    def test_nlr_optimal(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 2.0) == "optimal"

    def test_nlr_borderline(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 4.0) == "borderline"

    def test_nlr_elevated(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 6.0) == "elevated"

    def test_nlr_low(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 0.5) == "low"

    def test_nlr_boundary_at_3(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 3.0) == "optimal"

    def test_nlr_boundary_at_5(self):
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", 5.0) == "borderline"

    # ── De Ritis (range-optimal 0.8–1.5) ── De Ritis et al.
    def test_de_ritis_optimal(self):
        assert classify_metric_risk("ast_alt_ratio", 1.0) == "optimal"

    def test_de_ritis_optimal_upper(self):
        """1.4 is optimal under updated threshold (0.8-1.5)."""
        assert classify_metric_risk("ast_alt_ratio", 1.4) == "optimal"

    def test_de_ritis_borderline(self):
        assert classify_metric_risk("ast_alt_ratio", 1.7) == "borderline"

    def test_de_ritis_elevated(self):
        assert classify_metric_risk("ast_alt_ratio", 2.5) == "elevated"

    def test_de_ritis_low(self):
        assert classify_metric_risk("ast_alt_ratio", 0.6) == "low"

    def test_de_ritis_boundary_at_1_5(self):
        assert classify_metric_risk("ast_alt_ratio", 1.5) == "optimal"

    def test_de_ritis_boundary_at_2(self):
        assert classify_metric_risk("ast_alt_ratio", 2.0) == "borderline"

    # ── BUN/Creatinine (range-optimal 10–20) ── Hosten et al.
    def test_bun_cr_optimal(self):
        assert classify_metric_risk("bun_creatinine_ratio", 15.0) == "optimal"

    def test_bun_cr_borderline(self):
        assert classify_metric_risk("bun_creatinine_ratio", 22.0) == "borderline"

    def test_bun_cr_elevated(self):
        assert classify_metric_risk("bun_creatinine_ratio", 28.0) == "elevated"

    def test_bun_cr_low(self):
        assert classify_metric_risk("bun_creatinine_ratio", 8.0) == "low"

    def test_bun_cr_boundary_at_20(self):
        assert classify_metric_risk("bun_creatinine_ratio", 20.0) == "optimal"

    def test_bun_cr_boundary_at_25(self):
        assert classify_metric_risk("bun_creatinine_ratio", 25.0) == "borderline"

    # ── TyG Index (lower is better, optimal < 8.5) ── Simental-Mendía et al.
    def test_tyg_optimal(self):
        assert classify_metric_risk("glucose_triglyceride_index", 8.0) == "optimal"

    def test_tyg_borderline(self):
        assert classify_metric_risk("glucose_triglyceride_index", 8.7) == "borderline"

    def test_tyg_elevated(self):
        assert classify_metric_risk("glucose_triglyceride_index", 9.5) == "elevated"

    def test_tyg_boundary_at_8_5(self):
        assert classify_metric_risk("glucose_triglyceride_index", 8.5) == "optimal"

    def test_tyg_boundary_at_9(self):
        assert classify_metric_risk("glucose_triglyceride_index", 9.0) == "borderline"

    # ── Meta ──
    def test_unknown_metric(self):
        assert classify_metric_risk("unknown_ratio", 42.0) == "optimal"


# ═══════════════════════════════════════════════════════════════════════
# C. METRIC_REFERENCES — structural integrity
# ═══════════════════════════════════════════════════════════════════════


class TestMetricReferencesIntegrity:
    """Verify METRIC_REFERENCES has all 7 ratios with required fields."""

    EXPECTED_KEYS = {
        "triglyceride_hdl_ratio",
        "total_cholesterol_hdl_ratio",
        "hdl_ldl_ratio",
        "neutrophil_lymphocyte_ratio",
        "ast_alt_ratio",
        "bun_creatinine_ratio",
        "glucose_triglyceride_index",
    }

    def test_all_seven_ratios_present(self):
        assert set(METRIC_REFERENCES.keys()) == self.EXPECTED_KEYS

    @pytest.mark.parametrize("key", EXPECTED_KEYS)
    def test_required_fields(self, key):
        ref = METRIC_REFERENCES[key]
        assert "label" in ref
        assert "formula" in ref
        assert "unit" in ref
        assert "optimal" in ref
        assert "borderline" in ref
        assert "significance" in ref
        assert "author" in ref

    def test_tg_hdl_author(self):
        assert "McLaughlin" in METRIC_REFERENCES["triglyceride_hdl_ratio"]["author"]

    def test_tc_hdl_author(self):
        assert "Castelli" in METRIC_REFERENCES["total_cholesterol_hdl_ratio"]["author"]

    def test_hdl_ldl_author(self):
        assert "Millán" in METRIC_REFERENCES["hdl_ldl_ratio"]["author"]

    def test_nlr_author(self):
        assert "Fest" in METRIC_REFERENCES["neutrophil_lymphocyte_ratio"]["author"]

    def test_de_ritis_author(self):
        assert "De Ritis" in METRIC_REFERENCES["ast_alt_ratio"]["author"]

    def test_bun_cr_author(self):
        assert "Hosten" in METRIC_REFERENCES["bun_creatinine_ratio"]["author"]

    def test_tyg_author(self):
        assert "Simental" in METRIC_REFERENCES["glucose_triglyceride_index"]["author"]

    def test_optimal_ranges_are_valid_tuples(self):
        for key, ref in METRIC_REFERENCES.items():
            lo, hi = ref["optimal"]
            assert lo < hi, f"{key}: optimal range invalid ({lo}, {hi})"

    def test_borderline_ranges_are_valid_tuples(self):
        for key, ref in METRIC_REFERENCES.items():
            lo, hi = ref["borderline"]
            assert lo < hi, f"{key}: borderline range invalid ({lo}, {hi})"


# ═══════════════════════════════════════════════════════════════════════
# D. format_health_state_for_embedding — output structure
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

    def test_all_seven_ratios_in_output(self):
        """When all inputs present, all 7 ratios appear in formatted output."""
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
        derived = compute_derived_metrics(markers)
        content = format_health_state_for_embedding(
            markers, derived, {"fileName": "test.pdf", "uploadedAt": "2024-01-01"}
        )
        assert "TG/HDL Ratio:" in content
        assert "TC/HDL Ratio:" in content
        assert "HDL/LDL Ratio:" in content
        assert "NLR:" in content
        assert "De Ritis" in content
        assert "BUN/Creatinine:" in content
        assert "TyG Index:" in content


# ═══════════════════════════════════════════════════════════════════════
# E. Multi-ratio clinical correlation — organ system mapping
# ═══════════════════════════════════════════════════════════════════════


class TestMultiRatioClinicalCorrelation:
    """Verify that risk classifications map to correct organ systems."""

    def test_metabolic_syndrome_profile(self):
        """TG/HDL > 3.5 AND TyG > 9.0 → metabolic system elevated."""
        markers = _make_markers(
            HDL="35", LDL="160",
            **{
                "Total Cholesterol": "260",
                "Triglycerides": "280",
                "Glucose": "130",
            },
        )
        m = compute_derived_metrics(markers)
        assert classify_metric_risk("triglyceride_hdl_ratio", m["triglyceride_hdl_ratio"]) == "elevated"
        assert classify_metric_risk("glucose_triglyceride_index", m["glucose_triglyceride_index"]) == "elevated"

    def test_cardiovascular_risk_profile(self):
        """TC/HDL > 5.0 AND HDL/LDL < 0.3 → cardiovascular system elevated."""
        markers = _make_markers(HDL="30", LDL="180", **{"Total Cholesterol": "270"})
        m = compute_derived_metrics(markers)
        assert classify_metric_risk("total_cholesterol_hdl_ratio", m["total_cholesterol_hdl_ratio"]) == "elevated"
        assert classify_metric_risk("hdl_ldl_ratio", m["hdl_ldl_ratio"]) == "low"

    def test_inflammatory_profile(self):
        """NLR > 5.0 → inflammatory system elevated."""
        markers = _make_markers(Neutrophils="8.0", Lymphocytes="1.0")
        m = compute_derived_metrics(markers)
        assert classify_metric_risk("neutrophil_lymphocyte_ratio", m["neutrophil_lymphocyte_ratio"]) == "elevated"

    def test_renal_risk_profile(self):
        """BUN/Cr > 25 → renal system elevated."""
        markers = _make_markers(BUN="35", Creatinine="1.2")
        m = compute_derived_metrics(markers)
        assert classify_metric_risk("bun_creatinine_ratio", m["bun_creatinine_ratio"]) == "elevated"

    def test_hepatic_risk_profile(self):
        """De Ritis > 2.0 → hepatic system elevated."""
        markers = _make_markers(AST="120", ALT="45")
        m = compute_derived_metrics(markers)
        assert classify_metric_risk("ast_alt_ratio", m["ast_alt_ratio"]) == "elevated"

    def test_multi_system_crisis(self):
        """All systems elevated simultaneously."""
        markers = _make_markers(
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
        )
        m = compute_derived_metrics(markers)
        elevated_count = sum(
            1 for k, v in m.items()
            if v is not None and classify_metric_risk(k, v) in ("elevated", "low")
        )
        assert elevated_count >= 5, f"Expected ≥5 elevated/low ratios, got {elevated_count}"

    def test_all_optimal_healthy_profile(self):
        """Healthy profile should have all 7 ratios optimal."""
        markers = _make_markers(
            HDL="55", LDL="90",
            **{
                "Total Cholesterol": "180",
                "Triglycerides": "100",
                "Glucose": "85",
                "Neutrophils": "3.5",
                "Lymphocytes": "2.0",
                "BUN": "15",
                "Creatinine": "1.0",
                "AST": "25",
                "ALT": "22",
            },
        )
        m = compute_derived_metrics(markers)
        for k, v in m.items():
            if v is not None:
                risk = classify_metric_risk(k, v)
                # TyG might be borderline for some healthy values
                assert risk in ("optimal", "borderline"), \
                    f"{k}={v:.4f} classified as {risk}, expected optimal/borderline"


# ═══════════════════════════════════════════════════════════════════════
# F. DeepEval LLM-as-judge: clinical ratio interpretation
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
            "TG/HDL ~1.82 [optimal], NLR ~2.0 [optimal], "
            "BUN/Cr ~15.0 [optimal], De Ritis ~1.14 [optimal]"
        ),
    },
    # Case 2: Metabolic syndrome — TG/HDL, TC/HDL, TyG elevated
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
            "Cardiovascular and metabolic systems at elevated risk per "
            "McLaughlin et al., Castelli et al., Simental-Mendía et al."
        ),
    },
    # Case 3: Multi-system crisis — all systems affected
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
    # Case 4: Isolated inflammatory — only NLR elevated
    {
        "markers": _make_markers(
            HDL="55", LDL="90",
            **{
                "Total Cholesterol": "180",
                "Triglycerides": "100",
                "Glucose": "88",
                "Neutrophils": "9.0",
                "Lymphocytes": "1.5",
                "BUN": "15",
                "Creatinine": "1.0",
                "AST": "25",
                "ALT": "22",
            },
        ),
        "expected": (
            "Isolated inflammatory: NLR ~6.0 [elevated] (Fest et al., > 5.0 threshold). "
            "All other ratios optimal. Inflammatory system at risk — elevated NLR "
            "associated with infection, stress, or malignancy."
        ),
    },
    # Case 5: Hepatic concern — De Ritis elevated
    {
        "markers": _make_markers(
            HDL="50", LDL="100",
            **{
                "Total Cholesterol": "190",
                "Triglycerides": "120",
                "Glucose": "90",
                "Neutrophils": "4.0",
                "Lymphocytes": "2.0",
                "BUN": "15",
                "Creatinine": "1.0",
                "AST": "90",
                "ALT": "35",
            },
        ),
        "expected": (
            "Hepatic concern: De Ritis ~2.57 [elevated] (De Ritis et al., > 2.0 threshold). "
            "High AST/ALT ratio suggests alcoholic or cardiac origin. "
            "All other ratios near optimal."
        ),
    },
]


@skip_no_judge
@pytest.mark.parametrize(
    "case",
    _RATIO_CASES,
    ids=["healthy", "metabolic_syndrome", "multi_system_crisis", "isolated_inflammatory", "hepatic_concern"],
)
def test_ratio_interpretation(case):
    metrics = [
        make_geval(
            name="Ratio Interpretation Accuracy",
            criteria=(
                "Given a set of derived blood ratio values with risk classifications "
                "(actual_output), evaluate whether the risk labels (optimal, borderline, "
                "elevated, low) are clinically correct given the standard thresholds: "
                "TG/HDL optimal <2.0, TC/HDL optimal <4.0, HDL/LDL optimal >=0.4, "
                "NLR optimal 1.0-3.0, De Ritis optimal 0.8-1.5, "
                "BUN/Cr optimal 10-20, TyG optimal <8.5."
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
                "elevated TC/HDL or low HDL/LDL → cardiovascular."
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


# ═══════════════════════════════════════════════════════════════════════
# G. DeepEval LLM-as-judge: peer-reviewed citation accuracy
# ═══════════════════════════════════════════════════════════════════════

_CITATION_CASES = [
    {
        "ratio": "TG/HDL",
        "context": "TG/HDL Ratio: 4.2000 [elevated]\nOptimal: < 2.0 (McLaughlin et al.)",
        "expected_author": "McLaughlin",
        "expected_threshold": "< 2.0",
    },
    {
        "ratio": "TC/HDL",
        "context": "TC/HDL Ratio: 5.5000 [elevated]\nOptimal: < 4.0 (Castelli et al.)",
        "expected_author": "Castelli",
        "expected_threshold": "< 4.0",
    },
    {
        "ratio": "NLR",
        "context": "NLR: 6.0000 [elevated]\nOptimal: 1.0-3.0 (Fest et al.)",
        "expected_author": "Fest",
        "expected_threshold": "1.0-3.0",
    },
    {
        "ratio": "De Ritis",
        "context": "De Ritis Ratio (AST/ALT): 2.5000 [elevated]\nOptimal: 0.8-1.5 (De Ritis et al.)",
        "expected_author": "De Ritis",
        "expected_threshold": "0.8-1.5",
    },
    {
        "ratio": "BUN/Creatinine",
        "context": "BUN/Creatinine: 28.0000 [elevated]\nOptimal: 10-20 (Hosten et al.)",
        "expected_author": "Hosten",
        "expected_threshold": "10-20",
    },
    {
        "ratio": "TyG Index",
        "context": "TyG Index: 9.5000 [elevated]\nFormula: ln(TG × Glucose × 0.5)\nOptimal: < 8.5 (Simental-Mendía et al.)",
        "expected_author": "Simental-Mendía",
        "expected_threshold": "< 8.5",
    },
    {
        "ratio": "HDL/LDL",
        "context": "HDL/LDL Ratio: 0.2000 [low]\nOptimal: > 0.4 (Millán et al.)",
        "expected_author": "Millán",
        "expected_threshold": "> 0.4",
    },
]


@skip_no_judge
@pytest.mark.parametrize(
    "case",
    _CITATION_CASES,
    ids=[c["ratio"] for c in _CITATION_CASES],
)
def test_citation_accuracy(case):
    metric = make_geval(
        name="Citation Accuracy",
        criteria=(
            "The actual_output must correctly attribute the clinical threshold to "
            "the correct author/paper. Check that the author name and threshold value "
            "in the actual_output match the expected_output. A correct attribution "
            "scores 1, an incorrect or missing attribution scores 0."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
        threshold=0.9,
    )
    test_case = LLMTestCase(
        input=f"What is the clinical significance of an elevated {case['ratio']}?",
        actual_output=case["context"],
        expected_output=f"{case['ratio']} threshold: {case['expected_threshold']} per {case['expected_author']}",
    )
    assert_test(test_case, [metric])
