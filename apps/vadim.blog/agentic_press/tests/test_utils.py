"""Tests for utility functions — port of lib.rs tests."""

from agentic_press import extract_published_content, slugify, strip_fences


# ── slugify tests ────────────────────────────────────────────────────────────


def test_slugify_basic():
    assert slugify("Hello World") == "hello-world"


def test_slugify_special_chars():
    assert slugify("Rust 2024: What's New?") == "rust-2024-what-s-new"


def test_slugify_consecutive_dashes():
    assert slugify("a--b") == "a-b"


def test_slugify_empty_string():
    assert slugify("") == ""


def test_slugify_all_special_chars():
    assert slugify("!@#$%^&*()") == ""


def test_slugify_leading_trailing_whitespace():
    assert slugify("  Hello World  ") == "hello-world"


def test_slugify_numbers_only():
    assert slugify("2024") == "2024"


# ── strip_fences tests ──────────────────────────────────────────────────────


def test_strip_fences_json():
    assert strip_fences('```json\n[{"topic":"test"}]\n```') == '[{"topic":"test"}]'


def test_strip_fences_no_fences():
    inp = '[{"topic":"test"}]'
    assert strip_fences(inp) == inp


def test_strip_fences_markdown():
    assert strip_fences("```markdown\n# Hello\n```") == "# Hello"


def test_strip_fences_md():
    assert strip_fences("```md\n# Hello\n```") == "# Hello"


def test_strip_fences_text():
    assert strip_fences("```text\nHello world\n```") == "Hello world"


def test_strip_fences_bare():
    assert strip_fences("```\nHello world\n```") == "Hello world"


def test_strip_fences_empty_string():
    assert strip_fences("") == ""


def test_strip_fences_whitespace_only():
    assert strip_fences("   \n  ") == ""


def test_strip_fences_no_closing():
    assert strip_fences('```json\n{"key": "value"}') == '{"key": "value"}'


def test_strip_fences_surrounding_whitespace():
    assert strip_fences("  \n```json\n[1,2,3]\n```\n  ") == "[1,2,3]"


def test_strip_fences_multiline_body():
    inp = '```json\n{\n  "a": 1,\n  "b": 2\n}\n```'
    assert strip_fences(inp) == '{\n  "a": 1,\n  "b": 2\n}'


def test_strip_fences_rust():
    assert strip_fences("```rust\nfn main() {}\n```") == "fn main() {}"


# ── extract_published_content tests ──────────────────────────────────────────


def test_extract_with_frontmatter():
    editor = (
        "DECISION: APPROVE\n\nMinor edits applied.\n\n"
        "---\ntitle: \"Test\"\nstatus: published\n---\n\n# Article\n\nBody text."
    )
    draft = "# Old Draft\n\nOld body."
    result = extract_published_content(editor, draft)
    assert result.startswith("---\n")
    assert "status: published" in result
    assert "# Article" in result


def test_extract_no_frontmatter():
    editor = "DECISION: APPROVE\n\nLooks good, no changes needed."
    draft = "# My Draft\n\nDraft body."
    assert extract_published_content(editor, draft) == draft
