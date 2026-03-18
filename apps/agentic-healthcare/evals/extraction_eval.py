"""
DeepEval + LlamaIndex evaluation suite for blood-test marker extraction quality.

Tests the full 3-tier parser (HTML table → FormKeysValues → free-text),
flag computation, derived metric accuracy, and end-to-end ingestion
via a LlamaIndex IngestionPipeline.

Run:
  cd apps/agentic-healthcare
  uv run --project langgraph pytest evals/extraction_eval.py -v
"""

from __future__ import annotations

import pytest
from deepeval import assert_test
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

from conftest import make_geval, skip_no_judge, HAS_JUDGE

from parsers import (
    Marker,
    compute_flag,
    parse_form_key_values,
    parse_html_table,
    parse_markers,
    parse_text_markers,
)


# ═══════════════════════════════════════════════════════════════════════
# A. compute_flag — exhaustive edge cases
# ═══════════════════════════════════════════════════════════════════════


class TestComputeFlag:
    # ── Standard range ──
    def test_normal_in_range(self):
        assert compute_flag("5.0", "3.0 - 8.0") == "normal"

    def test_high_above_range(self):
        assert compute_flag("10.0", "3.0 - 8.0") == "high"

    def test_low_below_range(self):
        assert compute_flag("1.0", "3.0 - 8.0") == "low"

    def test_exact_lower_bound(self):
        assert compute_flag("3.0", "3.0 - 8.0") == "normal"

    def test_exact_upper_bound(self):
        assert compute_flag("8.0", "3.0 - 8.0") == "normal"

    def test_just_above_upper_bound(self):
        assert compute_flag("8.01", "3.0 - 8.0") == "high"

    def test_just_below_lower_bound(self):
        assert compute_flag("2.99", "3.0 - 8.0") == "low"

    # ── Comma decimals (European format) ──
    def test_comma_decimal_normal(self):
        assert compute_flag("5,5", "3,0 - 8,0") == "normal"

    def test_comma_decimal_high(self):
        assert compute_flag("9,2", "3,0 - 8,0") == "high"

    def test_comma_decimal_low(self):
        assert compute_flag("1,8", "3,0 - 8,0") == "low"

    # ── Less-than thresholds ──
    def test_lt_normal(self):
        assert compute_flag("1.5", "< 2.0") == "normal"

    def test_lt_high(self):
        assert compute_flag("3.0", "< 2.0") == "high"

    def test_lt_exact(self):
        assert compute_flag("2.0", "< 2.0") == "high"

    def test_leq_unicode(self):
        assert compute_flag("2.0", "≤ 2.0") == "high"

    def test_lt_fullwidth(self):
        assert compute_flag("0.5", "＜ 1.0") == "normal"

    # ── Greater-than thresholds ──
    def test_gt_normal(self):
        assert compute_flag("5.0", "> 3.0") == "normal"

    def test_gt_low(self):
        assert compute_flag("1.0", "> 3.0") == "low"

    def test_gt_exact(self):
        assert compute_flag("3.0", "> 3.0") == "low"

    def test_geq_unicode(self):
        assert compute_flag("3.0", "≥ 3.0") == "low"

    # ── Undetectable / negative ──
    def test_undetectable_zero(self):
        assert compute_flag("0", "Nedetectabil") == "normal"

    def test_undetectable_positive(self):
        assert compute_flag("1.5", "Nedetectabil") == "high"

    def test_undetectable_english(self):
        assert compute_flag("0.1", "undetectable") == "high"

    def test_negative_reference(self):
        assert compute_flag("0", "negative") == "normal"

    def test_negative_reference_positive_value(self):
        assert compute_flag("5", "Negative") == "high"

    # ── Non-numeric values ──
    def test_non_numeric_value(self):
        assert compute_flag("negative", "0 - 1.0") == "normal"

    def test_text_value(self):
        assert compute_flag("Pozitiv", "Negativ") == "normal"

    # ── En-dash range ──
    def test_en_dash_range(self):
        assert compute_flag("5.0", "3.0–8.0") == "normal"

    def test_en_dash_high(self):
        assert compute_flag("9.0", "3.0–8.0") == "high"

    # ── Large numbers ──
    def test_large_values(self):
        assert compute_flag("250", "150 - 400") == "normal"
        assert compute_flag("450", "150 - 400") == "high"
        assert compute_flag("100", "150 - 400") == "low"

    # ── Empty / missing reference ──
    def test_empty_reference(self):
        assert compute_flag("5.0", "") == "normal"


# ═══════════════════════════════════════════════════════════════════════
# B. HTML table parser
# ═══════════════════════════════════════════════════════════════════════


class TestParseHtmlTable:
    def test_standard_lab_table(self):
        html = """
        <table>
            <tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr>
            <tr><td>Glucose</td><td>95</td><td>mg/dL</td><td>70 - 100</td></tr>
            <tr><td>HDL</td><td>55</td><td>mg/dL</td><td>40 - 60</td></tr>
            <tr><td>LDL</td><td>130</td><td>mg/dL</td><td>0 - 100</td></tr>
        </table>
        """
        markers = parse_html_table(html)
        assert len(markers) == 3
        assert markers[0].name == "Glucose"
        assert markers[0].flag == "normal"
        assert markers[2].name == "LDL"
        assert markers[2].flag == "high"

    def test_two_column_minimal(self):
        html = "<table><tr><td>AST</td><td>45</td></tr></table>"
        markers = parse_html_table(html)
        assert len(markers) == 1
        assert markers[0].name == "AST"
        assert markers[0].value == "45"

    def test_skips_header_row(self):
        html = """
        <table>
            <tr><th>Test Name</th><th>Value</th><th>Unit</th><th>Ref</th></tr>
            <tr><td>Creatinine</td><td>1.2</td><td>mg/dL</td><td>0.7 - 1.3</td></tr>
        </table>
        """
        markers = parse_html_table(html)
        # "Test Name" doesn't contain digits in value column, so it should be skipped
        assert len(markers) == 1
        assert markers[0].name == "Creatinine"

    def test_skips_numeric_names(self):
        """Names starting with a digit should be skipped."""
        html = "<table><tr><td>123</td><td>45</td></tr></table>"
        markers = parse_html_table(html)
        assert len(markers) == 0

    def test_full_lipid_panel(self):
        html = """
        <table>
            <tr><td>Total Cholesterol</td><td>220</td><td>mg/dL</td><td>0 - 200</td></tr>
            <tr><td>Triglycerides</td><td>180</td><td>mg/dL</td><td>0 - 150</td></tr>
            <tr><td>HDL Cholesterol</td><td>42</td><td>mg/dL</td><td>40 - 60</td></tr>
            <tr><td>LDL Cholesterol</td><td>145</td><td>mg/dL</td><td>0 - 100</td></tr>
        </table>
        """
        markers = parse_html_table(html)
        assert len(markers) == 4
        flags = {m.name: m.flag for m in markers}
        assert flags["Total Cholesterol"] == "high"
        assert flags["Triglycerides"] == "high"
        assert flags["HDL Cholesterol"] == "normal"
        assert flags["LDL Cholesterol"] == "high"

    def test_cbc_panel(self):
        html = """
        <table>
            <tr><td>WBC</td><td>7.5</td><td>K/uL</td><td>4.0 - 11.0</td></tr>
            <tr><td>RBC</td><td>4.8</td><td>M/uL</td><td>4.2 - 5.4</td></tr>
            <tr><td>Hemoglobin</td><td>14.2</td><td>g/dL</td><td>12.0 - 16.0</td></tr>
            <tr><td>Hematocrit</td><td>42.5</td><td>%</td><td>36 - 46</td></tr>
            <tr><td>Platelets</td><td>280</td><td>K/uL</td><td>150 - 400</td></tr>
            <tr><td>Neutrophils</td><td>4.2</td><td>K/uL</td><td>1.5 - 7.0</td></tr>
            <tr><td>Lymphocytes</td><td>2.1</td><td>K/uL</td><td>1.0 - 3.5</td></tr>
        </table>
        """
        markers = parse_html_table(html)
        assert len(markers) == 7
        assert all(m.flag == "normal" for m in markers)

    def test_html_entities_stripped(self):
        html = "<table><tr><td>AST&nbsp;(SGOT)</td><td>35</td><td>U/L</td><td>10 - 40</td></tr></table>"
        markers = parse_html_table(html)
        assert len(markers) == 1
        assert "AST" in markers[0].name

    def test_br_tags_in_cells(self):
        html = "<table><tr><td>ALT<br/>(SGPT)</td><td>28</td><td>U/L</td><td>7 - 56</td></tr></table>"
        markers = parse_html_table(html)
        assert len(markers) == 1


# ═══════════════════════════════════════════════════════════════════════
# C. FormKeysValues parser (Romanian/European lab format)
# ═══════════════════════════════════════════════════════════════════════


class TestParseFormKeyValues:
    def test_romanian_format(self):
        elements = [
            {"type": "Title", "text": "Hemoglobina"},
            {"type": "FormKeysValues", "text": "14.5 g/dL (12.0 - 16.0)"},
            {"type": "Title", "text": "Leucocite"},
            {"type": "FormKeysValues", "text": "11.5 mii/µL (4.0 - 10.0)"},
        ]
        markers = parse_form_key_values(elements)
        assert len(markers) == 2
        assert markers[0].name == "Hemoglobina"
        assert markers[0].flag == "normal"
        assert markers[1].name == "Leucocite"
        assert markers[1].flag == "high"

    def test_skips_admin_fields(self):
        elements = [
            {"type": "Title", "text": "Info"},
            {"type": "FormKeysValues", "text": "RECOLTAT 2024-01-01"},
            {"type": "Title", "text": "Glucoza"},
            {"type": "FormKeysValues", "text": "95 mg/dL (70 - 100)"},
        ]
        markers = parse_form_key_values(elements)
        assert len(markers) == 1
        assert markers[0].name == "Glucoza"

    def test_skips_non_numeric_values(self):
        elements = [
            {"type": "Title", "text": "Observatii"},
            {"type": "FormKeysValues", "text": "Fara probleme deosebite"},
        ]
        markers = parse_form_key_values(elements)
        assert len(markers) == 0

    def test_narrative_text_as_name(self):
        elements = [
            {"type": "NarrativeText", "text": "Bilirubina totala"},
            {"type": "FormKeysValues", "text": "0.8 mg/dL (0.1 - 1.2)"},
        ]
        markers = parse_form_key_values(elements)
        assert len(markers) == 1
        assert markers[0].name == "Bilirubina totala"
        assert markers[0].flag == "normal"

    def test_multiple_parenthetical_refs(self):
        elements = [
            {"type": "Title", "text": "Creatinina"},
            {"type": "FormKeysValues", "text": "1.1 mg/dL (metoda enzimatica) (0.7 - 1.3)"},
        ]
        markers = parse_form_key_values(elements)
        assert len(markers) == 1
        # Should pick the last parenthetical as the reference range
        assert markers[0].reference_range == "0.7 - 1.3"

    def test_skips_cnp_and_address(self):
        elements = [
            {"type": "Title", "text": "Patient"},
            {"type": "FormKeysValues", "text": "CNP 1234567890123"},
            {"type": "Title", "text": "Uree"},
            {"type": "FormKeysValues", "text": "35 mg/dL (15 - 45)"},
        ]
        markers = parse_form_key_values(elements)
        assert len(markers) == 1
        assert markers[0].name == "Uree"

    def test_full_romanian_panel(self):
        elements = [
            {"type": "Title", "text": "Glicemie"},
            {"type": "FormKeysValues", "text": "105 mg/dL (70 - 100)"},
            {"type": "Title", "text": "Colesterol total"},
            {"type": "FormKeysValues", "text": "245 mg/dL (0 - 200)"},
            {"type": "Title", "text": "Trigliceride"},
            {"type": "FormKeysValues", "text": "195 mg/dL (0 - 150)"},
            {"type": "Title", "text": "HDL"},
            {"type": "FormKeysValues", "text": "38 mg/dL (40 - 60)"},
            {"type": "Title", "text": "LDL"},
            {"type": "FormKeysValues", "text": "165 mg/dL (0 - 100)"},
        ]
        markers = parse_form_key_values(elements)
        assert len(markers) == 5
        flags = {m.name: m.flag for m in markers}
        assert flags["Glicemie"] == "high"
        assert flags["Colesterol total"] == "high"
        assert flags["Trigliceride"] == "high"
        assert flags["HDL"] == "low"
        assert flags["LDL"] == "high"


# ═══════════════════════════════════════════════════════════════════════
# D. Free-text parser
# ═══════════════════════════════════════════════════════════════════════


class TestParseTextMarkers:
    def test_tab_separated(self):
        text = "Glucose          95    mg/dL   70 - 100\nHDL Cholesterol  55    mg/dL   40 - 60"
        markers = parse_text_markers(text)
        assert len(markers) == 2
        assert markers[0].name == "Glucose"
        assert markers[1].name == "HDL Cholesterol"

    def test_metabolic_panel(self):
        text = (
            "Glucose          126   mg/dL   70 - 100\n"
            "BUN              22    mg/dL   7 - 20\n"
            "Creatinine       1.1   mg/dL   0.7 - 1.3\n"
            "Sodium           140   mEq/L   136 - 145\n"
            "Potassium        4.2   mEq/L   3.5 - 5.0\n"
        )
        markers = parse_text_markers(text)
        assert len(markers) == 5
        flags = {m.name: m.flag for m in markers}
        assert flags["Glucose"] == "high"
        assert flags["BUN"] == "high"
        assert flags["Creatinine"] == "normal"

    def test_less_than_reference(self):
        text = "CRP              0.5   mg/L    < 5.0"
        markers = parse_text_markers(text)
        assert len(markers) == 1
        assert markers[0].flag == "normal"

    def test_liver_panel(self):
        text = (
            "AST              85    U/L     10 - 40\n"
            "ALT              45    U/L     7 - 56\n"
            "ALP              95    U/L     44 - 147\n"
            "GGT              120   U/L     0 - 51\n"
        )
        markers = parse_text_markers(text)
        assert len(markers) == 4
        flags = {m.name: m.flag for m in markers}
        assert flags["AST"] == "high"
        assert flags["ALT"] == "normal"
        assert flags["ALP"] == "normal"
        assert flags["GGT"] == "high"


# ═══════════════════════════════════════════════════════════════════════
# E. Orchestrator — tier priority
# ═══════════════════════════════════════════════════════════════════════


class TestParseMarkersOrchestrator:
    def test_prefers_html_table(self):
        elements = [
            {
                "type": "Table",
                "text": "",
                "metadata": {
                    "text_as_html": "<table><tr><td>Glucose</td><td>95</td><td>mg/dL</td><td>70 - 100</td></tr></table>"
                },
            },
            {"type": "Title", "text": "Glucose"},
            {"type": "FormKeysValues", "text": "95 mg/dL (70 - 100)"},
        ]
        markers = parse_markers(elements)
        assert len(markers) == 1
        assert markers[0].name == "Glucose"

    def test_falls_back_to_fkv(self):
        elements = [
            {"type": "Title", "text": "Glucoza"},
            {"type": "FormKeysValues", "text": "95 mg/dL (70 - 100)"},
        ]
        markers = parse_markers(elements)
        assert len(markers) == 1
        assert markers[0].name == "Glucoza"

    def test_falls_back_to_text(self):
        elements = [
            {"type": "NarrativeText", "text": "Glucose          95    mg/dL   70 - 100"},
        ]
        markers = parse_markers(elements)
        assert len(markers) == 1
        assert markers[0].name == "Glucose"

    def test_deduplicates_by_name(self):
        elements = [
            {
                "type": "Table",
                "text": "",
                "metadata": {
                    "text_as_html": (
                        "<table>"
                        "<tr><td>Glucose</td><td>95</td><td>mg/dL</td><td>70 - 100</td></tr>"
                        "<tr><td>Glucose</td><td>96</td><td>mg/dL</td><td>70 - 100</td></tr>"
                        "</table>"
                    )
                },
            },
        ]
        markers = parse_markers(elements)
        assert len(markers) == 1

    def test_empty_elements(self):
        markers = parse_markers([])
        assert len(markers) == 0

    def test_no_parseable_content(self):
        elements = [
            {"type": "NarrativeText", "text": "Patient was seen on 2024-01-15 for routine checkup."},
        ]
        markers = parse_markers(elements)
        assert len(markers) == 0

    def test_mixed_table_types(self):
        """Table with no text_as_html should be ignored, falling through."""
        elements = [
            {"type": "Table", "text": "some table text", "metadata": {}},
            {"type": "Title", "text": "Iron"},
            {"type": "FormKeysValues", "text": "85 ug/dL (60 - 170)"},
        ]
        markers = parse_markers(elements)
        assert len(markers) == 1
        assert markers[0].name == "Iron"


# ═══════════════════════════════════════════════════════════════════════
# F. Full lab report extraction (multi-marker realistic scenarios)
# ═══════════════════════════════════════════════════════════════════════


class TestRealisticLabReports:
    def test_complete_metabolic_panel_html(self):
        html = """
        <table>
            <tr><td>Glucose</td><td>126</td><td>mg/dL</td><td>70 - 100</td></tr>
            <tr><td>BUN</td><td>22</td><td>mg/dL</td><td>7 - 20</td></tr>
            <tr><td>Creatinine</td><td>1.1</td><td>mg/dL</td><td>0.7 - 1.3</td></tr>
            <tr><td>Total Cholesterol</td><td>245</td><td>mg/dL</td><td>0 - 200</td></tr>
            <tr><td>Triglycerides</td><td>210</td><td>mg/dL</td><td>0 - 150</td></tr>
            <tr><td>HDL</td><td>38</td><td>mg/dL</td><td>40 - 60</td></tr>
            <tr><td>LDL</td><td>155</td><td>mg/dL</td><td>0 - 100</td></tr>
            <tr><td>AST</td><td>85</td><td>U/L</td><td>10 - 40</td></tr>
            <tr><td>ALT</td><td>42</td><td>U/L</td><td>7 - 56</td></tr>
            <tr><td>Neutrophils</td><td>7.2</td><td>K/uL</td><td>1.5 - 7.0</td></tr>
            <tr><td>Lymphocytes</td><td>1.1</td><td>K/uL</td><td>1.0 - 3.5</td></tr>
        </table>
        """
        elements = [{"type": "Table", "text": "", "metadata": {"text_as_html": html}}]
        markers = parse_markers(elements)
        assert len(markers) == 11

        flags = {m.name: m.flag for m in markers}
        assert flags["Glucose"] == "high"
        assert flags["BUN"] == "high"
        assert flags["Creatinine"] == "normal"
        assert flags["Total Cholesterol"] == "high"
        assert flags["Triglycerides"] == "high"
        assert flags["HDL"] == "low"
        assert flags["LDL"] == "high"
        assert flags["AST"] == "high"
        assert flags["ALT"] == "normal"
        assert flags["Neutrophils"] == "high"
        assert flags["Lymphocytes"] == "normal"

    def test_all_normal_panel(self):
        html = """
        <table>
            <tr><td>Glucose</td><td>88</td><td>mg/dL</td><td>70 - 100</td></tr>
            <tr><td>HDL</td><td>55</td><td>mg/dL</td><td>40 - 60</td></tr>
            <tr><td>LDL</td><td>90</td><td>mg/dL</td><td>0 - 100</td></tr>
            <tr><td>Creatinine</td><td>0.9</td><td>mg/dL</td><td>0.7 - 1.3</td></tr>
        </table>
        """
        elements = [{"type": "Table", "text": "", "metadata": {"text_as_html": html}}]
        markers = parse_markers(elements)
        assert all(m.flag == "normal" for m in markers)


# ═══════════════════════════════════════════════════════════════════════
# G. DeepEval LLM-as-judge metrics (require DeepSeek judge)
# ═══════════════════════════════════════════════════════════════════════

_EXTRACTION_CASES = [
    # Case 1: Basic lipid panel
    (
        "Glucose          95    mg/dL   70 - 100\n"
        "HDL Cholesterol  55    mg/dL   40 - 60\n"
        "LDL Cholesterol  130   mg/dL   0 - 100",
        "Glucose: 95 mg/dL [normal], HDL Cholesterol: 55 mg/dL [normal], LDL Cholesterol: 130 mg/dL [high]",
    ),
    # Case 2: CBC panel
    (
        "Hemoglobin       14.5  g/dL    12.0 - 16.0\n"
        "WBC              11.5  K/uL    4.0 - 10.0\n"
        "Platelets        250   K/uL    150 - 400",
        "Hemoglobin: 14.5 g/dL [normal], WBC: 11.5 K/uL [high], Platelets: 250 K/uL [normal]",
    ),
    # Case 3: Liver function
    (
        "AST              85    U/L     10 - 40\n"
        "ALT              42    U/L     7 - 56\n"
        "ALP              95    U/L     44 - 147",
        "AST: 85 U/L [high], ALT: 42 U/L [normal], ALP: 95 U/L [normal]",
    ),
    # Case 4: Renal panel
    (
        "BUN              28    mg/dL   7 - 20\n"
        "Creatinine       1.8   mg/dL   0.7 - 1.3\n"
        "Sodium           138   mEq/L   136 - 145\n"
        "Potassium        5.5   mEq/L   3.5 - 5.0",
        "BUN: 28 mg/dL [high], Creatinine: 1.8 mg/dL [high], Sodium: 138 mEq/L [normal], Potassium: 5.5 mEq/L [high]",
    ),
    # Case 5: Inflammatory markers
    (
        "Neutrophils      7.5   K/uL    1.5 - 7.0\n"
        "Lymphocytes      1.0   K/uL    1.0 - 3.5\n"
        "CRP              12.5  mg/L    < 5.0",
        "Neutrophils: 7.5 K/uL [high], Lymphocytes: 1.0 K/uL [normal], CRP: 12.5 mg/L [high]",
    ),
    # Case 6: All normal
    (
        "Glucose          88    mg/dL   70 - 100\n"
        "Total Cholesterol  185  mg/dL   0 - 200\n"
        "Triglycerides    120   mg/dL   0 - 150",
        "Glucose: 88 mg/dL [normal], Total Cholesterol: 185 mg/dL [normal], Triglycerides: 120 mg/dL [normal]",
    ),
    # Case 7: All abnormal
    (
        "Glucose          250   mg/dL   70 - 100\n"
        "Triglycerides    450   mg/dL   0 - 150\n"
        "HDL              28    mg/dL   40 - 60",
        "Glucose: 250 mg/dL [high], Triglycerides: 450 mg/dL [high], HDL: 28 mg/dL [low]",
    ),
]


@skip_no_judge
@pytest.mark.parametrize("raw_text,expected_markers", _EXTRACTION_CASES)
def test_extraction_completeness(raw_text: str, expected_markers: str):
    metrics = [
        make_geval(
            name="Extraction Completeness",
            criteria=(
                "Given a raw lab report text (input) and the extracted markers (actual_output), "
                "evaluate whether ALL biomarkers present in the input were correctly extracted. "
                "A complete extraction captures every marker name, numeric value, unit, and "
                "reference range. Missing markers or wrong values reduce the score."
            ),
            evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
            threshold=0.7,
        ),
        make_geval(
            name="Clinical Flag Accuracy",
            criteria=(
                "Given extracted blood markers with their computed flags (actual_output), "
                "evaluate whether the flag (low/normal/high) is clinically correct based on "
                "the value and reference range. A flag of 'high' means the value exceeds the "
                "upper reference limit; 'low' means below the lower limit."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.8,
        ),
        make_geval(
            name="Value Precision",
            criteria=(
                "Given expected markers (expected_output) and extracted markers (actual_output), "
                "evaluate whether each extracted numeric value is an EXACT match to the value in "
                "the input. Transposition errors (e.g., 95 vs 59), decimal shifts (9.5 vs 95), "
                "or truncation (14 vs 14.5) should be heavily penalised."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.9,
        ),
        make_geval(
            name="Unit Consistency",
            criteria=(
                "Given expected markers (expected_output) and extracted markers (actual_output), "
                "evaluate whether the extracted units match the source. Common units include: "
                "mg/dL, g/dL, U/L, K/uL, mEq/L, mmol/L, %, mii/µL. Units should not be "
                "confused or swapped between markers."
            ),
            evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT, LLMTestCaseParams.EXPECTED_OUTPUT],
            threshold=0.9,
        ),
    ]

    markers = parse_text_markers(raw_text)
    actual = ", ".join(f"{m.name}: {m.value} {m.unit} [{m.flag}]" for m in markers)

    test_case = LLMTestCase(
        input=raw_text,
        actual_output=actual,
        expected_output=expected_markers,
    )
    assert_test(test_case, metrics)
