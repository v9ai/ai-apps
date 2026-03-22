"""Validate metric spec structure — no LLM calls."""

from press.evals import _METRIC_SPECS


class TestMetricSpecs:

    def test_all_seven_metrics_defined(self):
        names = {spec[0] for spec in _METRIC_SPECS}
        expected = {
            "source_citation", "anti_hallucination", "writing_quality",
            "journalistic_standards", "seo_alignment", "structural_completeness",
            "lead_quality",
        }
        assert names == expected

    def test_thresholds_in_valid_range(self):
        for name, _, _, threshold in _METRIC_SPECS:
            assert 0.0 <= threshold <= 1.0, f"{name}: threshold {threshold} out of range"

    def test_criteria_non_empty(self):
        for name, criteria, _, _ in _METRIC_SPECS:
            assert criteria.strip(), f"{name}: empty criteria"

    def test_criteria_minimum_length(self):
        """Each criteria string should be substantive (>100 chars)."""
        for name, criteria, _, _ in _METRIC_SPECS:
            assert len(criteria) >= 100, f"{name}: criteria too short ({len(criteria)} chars)"

    def test_anti_hallucination_uses_context_param(self):
        for name, _, params, _ in _METRIC_SPECS:
            if name == "anti_hallucination":
                assert "CONTEXT" in params, "anti_hallucination must use CONTEXT param"

    def test_seo_alignment_uses_context_param(self):
        for name, _, params, _ in _METRIC_SPECS:
            if name == "seo_alignment":
                assert "CONTEXT" in params, "seo_alignment must use CONTEXT param"
