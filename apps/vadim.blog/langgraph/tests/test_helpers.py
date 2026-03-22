"""Text manipulation helpers — zero LLM calls."""

from press import strip_frontmatter
from press.evals import extract_lead, word_count


class TestHelpers:

    def test_strip_frontmatter_removes_yaml_block(self):
        md = "---\ntitle: Test\n---\n\n# Hello\n\nBody text."
        body = strip_frontmatter(md)
        assert body.startswith("# Hello")
        assert "title: Test" not in body

    def test_strip_frontmatter_passthrough_no_frontmatter(self):
        md = "# Hello\n\nBody text."
        assert strip_frontmatter(md) == md.strip()

    def test_extract_lead_stops_at_h2(self):
        md = "---\ntitle: T\n---\n# H1\n\nLead paragraph.\n\n## Section\n\nBody."
        lead = extract_lead(md)
        assert "Lead paragraph." in lead
        assert "## Section" not in lead
        assert "Body." not in lead

    def test_extract_lead_skips_h1(self):
        md = "---\ntitle: T\n---\n# The Title\n\nFirst para.\n\n## Next\n\nMore."
        lead = extract_lead(md)
        assert "# The Title" not in lead
        assert "First para." in lead

    def test_extract_lead_respects_max_chars(self):
        body = "x " * 1000
        md = f"---\ntitle: T\n---\n# H1\n\n{body}"
        lead = extract_lead(md, max_chars=100)
        assert len(lead) <= 100

    def test_word_count_basic(self):
        assert word_count("one two three") == 3

    def test_word_count_empty(self):
        assert word_count("") == 0
