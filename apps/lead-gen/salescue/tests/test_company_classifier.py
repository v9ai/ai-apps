"""Tests for salescue company classifier — staffing detection, size parsing, geo filtering.

Covers:
- Semantic staffing classification (requires encoder)
- Employee count parsing (_parse_size)
- Irrelevant geo detection
- is_target composite logic
- /classify-company endpoint integration
"""

import re

import pytest

from salescue.modules.company_classifier import classify_company
from salescue.server import _parse_size, app


# ── 1. Clear staffing companies ─────────────────────────────────────────────


class TestStaffingDetection:
    """Verify is_staffing=True for obvious staffing/recruiting firms."""

    @pytest.mark.parametrize(
        "name,description",
        [
            (
                "TechRecruit",
                "Staffing and Recruiting agency",
            ),
            (
                "ManpowerGroup",
                "Global workforce solutions",
            ),
            (
                "Robert Half",
                "Temporary and permanent staffing",
            ),
        ],
        ids=["tech-recruit", "manpower-group", "robert-half"],
    )
    def test_staffing_companies(self, encoder_loaded, name, description):
        result = classify_company(name=name, description=description)
        assert result["is_staffing"] is True, (
            f"{name} should be classified as staffing. "
            f"confidence={result['confidence']}, reasons={result['reasons']}"
        )
        assert result["confidence"] > 0.3


# ── 2. Clear non-staffing companies ─────────────────────────────────────────


class TestNonStaffingDetection:
    """Verify is_staffing=False for obvious product/tech companies."""

    @pytest.mark.parametrize(
        "name,description",
        [
            (
                "Stripe",
                "Payment processing API platform",
            ),
            (
                "Datadog",
                "Cloud monitoring and analytics SaaS",
            ),
            (
                "OpenAI",
                "AI research laboratory",
            ),
        ],
        ids=["stripe", "datadog", "openai"],
    )
    def test_non_staffing_companies(self, encoder_loaded, name, description):
        result = classify_company(name=name, description=description)
        assert result["is_staffing"] is False, (
            f"{name} should NOT be classified as staffing. "
            f"confidence={result['confidence']}, reasons={result['reasons']}"
        )


# ── 3. Employee count parsing ───────────────────────────────────────────────


class TestParseSize:
    """Test _parse_size() extracts upper-bound employee counts."""

    @pytest.mark.parametrize(
        "input_str,expected",
        [
            ("51-200 employees", 200),
            ("1-10", 10),
            ("10,001+", 10001),
            ("", 999999),
        ],
        ids=["range-with-label", "small-range", "large-with-comma-plus", "empty"],
    )
    def test_parse_size(self, input_str, expected):
        assert _parse_size(input_str) == expected

    def test_single_number(self):
        assert _parse_size("500") == 500

    def test_large_range(self):
        assert _parse_size("1,001-5,000") == 5000

    def test_whitespace_only(self):
        assert _parse_size("   ") == 999999

    def test_no_digits(self):
        assert _parse_size("unknown") == 999999


# ── 4. Geo detection ───────────────────────────────────────────────────────


# Replicate the regex from server.py so we test the same pattern
_IRRELEVANT_GEO_RE = re.compile(
    r"\b(latam|latin america|africa|apac|asia|india|middle east|mena|philippines|nigeria|pakistan|south asia|southeast asia|eastern europe)\b",
    re.IGNORECASE,
)


class TestGeoDetection:
    """Test irrelevant-geo regex filtering."""

    @pytest.mark.parametrize(
        "text",
        [
            "Mumbai, India",
            "LATAM staffing solutions",
            "Offices in Philippines and Nigeria",
            "Southeast Asia talent network",
            "Middle East recruitment firm",
            "Eastern Europe outsourcing",
        ],
        ids=[
            "india",
            "latam",
            "philippines-nigeria",
            "southeast-asia",
            "middle-east",
            "eastern-europe",
        ],
    )
    def test_irrelevant_geo_detected(self, text):
        assert _IRRELEVANT_GEO_RE.search(text) is not None, (
            f"Expected irrelevant geo match for: {text}"
        )

    @pytest.mark.parametrize(
        "text",
        [
            "San Francisco, CA",
            "London, United Kingdom",
            "Berlin, Germany",
            "Toronto, Canada",
            "Amsterdam, Netherlands",
        ],
        ids=["sf", "london", "berlin", "toronto", "amsterdam"],
    )
    def test_relevant_geo_not_flagged(self, text):
        assert _IRRELEVANT_GEO_RE.search(text) is None, (
            f"Should NOT flag as irrelevant geo: {text}"
        )


# ── 5. is_target composite logic ───────────────────────────────────────────


class TestIsTargetLogic:
    """is_target = is_staffing AND employee_count <= 200 AND NOT is_irrelevant_geo.

    Tests the /classify-company endpoint which combines classifier + size + geo.
    """

    @pytest.fixture
    def client(self):
        from fastapi.testclient import TestClient

        return TestClient(app)

    def test_staffing_small_relevant_geo_is_target(self, encoder_loaded, client):
        """Staffing + <=200 employees + relevant geo => is_target=True."""
        resp = client.post(
            "/classify-company",
            json={
                "company_id": 1,
                "name": "TechRecruit",
                "description": "Staffing and Recruiting agency",
                "location": "New York, NY",
                "size": "51-200 employees",
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        result = data["result"]
        assert result["is_staffing"] is True
        assert result["employee_count"] == 200
        assert result["is_irrelevant_geo"] is False
        assert result["is_target"] is True

    def test_staffing_large_is_not_target(self, encoder_loaded, client):
        """Staffing + >200 employees => is_target=False."""
        resp = client.post(
            "/classify-company",
            json={
                "company_id": 2,
                "name": "ManpowerGroup",
                "description": "Global workforce solutions",
                "location": "Milwaukee, WI",
                "size": "10,001+",
            },
        )
        assert resp.status_code == 200
        result = resp.json()["result"]
        assert result["is_staffing"] is True
        assert result["employee_count"] == 10001
        assert result["is_target"] is False

    def test_staffing_irrelevant_geo_is_not_target(self, encoder_loaded, client):
        """Staffing + <=200 + irrelevant geo => is_target=False."""
        resp = client.post(
            "/classify-company",
            json={
                "company_id": 3,
                "name": "LATAM Staffing Solutions",
                "description": "Recruitment agency for Latin America",
                "location": "Bogota, Colombia",
                "size": "11-50 employees",
            },
        )
        assert resp.status_code == 200
        result = resp.json()["result"]
        assert result["is_staffing"] is True
        assert result["is_irrelevant_geo"] is True
        assert result["is_target"] is False

    def test_non_staffing_is_not_target(self, encoder_loaded, client):
        """Non-staffing company => is_target=False regardless of size/geo."""
        resp = client.post(
            "/classify-company",
            json={
                "company_id": 4,
                "name": "Stripe",
                "description": "Payment processing API platform",
                "location": "San Francisco, CA",
                "size": "1-10",
            },
        )
        assert resp.status_code == 200
        result = resp.json()["result"]
        assert result["is_staffing"] is False
        assert result["is_target"] is False

    def test_size_parsed_from_description(self, encoder_loaded, client):
        """Size field empty but description contains 'Size: ...' line."""
        resp = client.post(
            "/classify-company",
            json={
                "company_id": 5,
                "name": "SmallRecruit",
                "description": "Staffing and Recruiting agency\nSize: 11-50 employees",
                "location": "Austin, TX",
                "size": "",
            },
        )
        assert resp.status_code == 200
        result = resp.json()["result"]
        assert result["employee_count"] == 50

    def test_unknown_size_defaults_large(self, encoder_loaded, client):
        """Empty size + no size in description => 999999 (don't flag)."""
        resp = client.post(
            "/classify-company",
            json={
                "company_id": 6,
                "name": "MysteryRecruit",
                "description": "Staffing firm",
                "location": "Denver, CO",
                "size": "",
            },
        )
        assert resp.status_code == 200
        result = resp.json()["result"]
        assert result["employee_count"] == 999999


# ── 6. Classifier output structure ─────────────────────────────────────────


class TestClassifierOutputShape:
    """Verify classify_company returns all expected keys with correct types."""

    def test_output_keys(self, encoder_loaded):
        result = classify_company(name="Acme Corp", description="We build software")
        assert "is_staffing" in result
        assert "confidence" in result
        assert "reasons" in result
        assert "semantic_score" in result
        assert "keyword_score" in result

    def test_output_types(self, encoder_loaded):
        result = classify_company(name="Acme Corp", description="We build software")
        assert isinstance(result["is_staffing"], bool)
        assert isinstance(result["confidence"], float)
        assert isinstance(result["reasons"], list)
        assert isinstance(result["semantic_score"], float)
        assert isinstance(result["keyword_score"], float)

    def test_confidence_range(self, encoder_loaded):
        result = classify_company(name="Acme Corp", description="Staffing agency")
        assert 0.0 <= result["confidence"] <= 1.0
        assert 0.0 <= result["semantic_score"] <= 1.0
        assert 0.0 <= result["keyword_score"] <= 1.0
