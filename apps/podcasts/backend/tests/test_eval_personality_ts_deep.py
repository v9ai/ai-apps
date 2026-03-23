"""Deep structural validation of TypeScript personality files.

Loads all .ts files from PERSONALITIES_DIR that have matching research JSONs,
then runs pure regex-based structural assertions against each file.

Usage:
    pytest tests/test_eval_personality_ts_deep.py -v
"""

import re
from pathlib import Path

import pytest

SCRIPT_DIR = Path(__file__).resolve().parent.parent.parent
RESEARCH_DIR = SCRIPT_DIR / "src" / "lib" / "research"
PERSONALITIES_DIR = SCRIPT_DIR / "personalities"


def _load_ts_files_with_research() -> list[Path]:
    """Return .ts personality files whose stem matches a research JSON."""
    if not RESEARCH_DIR.exists() or not PERSONALITIES_DIR.exists():
        return []
    research_slugs: set[str] = set()
    for f in RESEARCH_DIR.glob("*.json"):
        if f.name.endswith("-timeline.json") or f.name.endswith(".eval.json"):
            continue
        research_slugs.add(f.stem)
    return sorted(
        ts for ts in PERSONALITIES_DIR.glob("*.ts") if ts.stem in research_slugs
    )


TS_FILES = _load_ts_files_with_research()


def _skip_if_empty():
    if not TS_FILES:
        pytest.skip("No .ts files with matching research JSONs")


# ═══════════════════════════════════════════════════════════════════════════
# 1. Valid import statement
# ═══════════════════════════════════════════════════════════════════════════


class TestTsValidImport:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_valid_import(self, ts_file: Path):
        """Assert each .ts file starts with 'import type { Personality }'."""
        content = ts_file.read_text()
        assert content.startswith(
            "import type { Personality }"
        ), f"{ts_file.name} does not start with 'import type {{ Personality }}'"


# ═══════════════════════════════════════════════════════════════════════════
# 2. const declaration
# ═══════════════════════════════════════════════════════════════════════════


class TestTsHasConstDeclaration:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_has_const_declaration(self, ts_file: Path):
        """Assert 'const personality: Personality' appears in the file."""
        content = ts_file.read_text()
        assert (
            "const personality: Personality" in content
        ), f"{ts_file.name} missing 'const personality: Personality'"


# ═══════════════════════════════════════════════════════════════════════════
# 3. name field not empty
# ═══════════════════════════════════════════════════════════════════════════


class TestTsNameNotEmpty:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_name_not_empty(self, ts_file: Path):
        """Parse name field with regex, assert non-empty."""
        content = ts_file.read_text()
        match = re.search(r'name:\s*"([^"]*)"', content)
        assert match, f"{ts_file.name} missing name field"
        assert match.group(1).strip(), f"{ts_file.name} has empty name"


# ═══════════════════════════════════════════════════════════════════════════
# 4. role field not empty
# ═══════════════════════════════════════════════════════════════════════════


class TestTsRoleNotEmpty:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_role_not_empty(self, ts_file: Path):
        """Parse role field with regex, assert non-empty."""
        content = ts_file.read_text()
        match = re.search(r'role:\s*"([^"]*)"', content)
        assert match, f"{ts_file.name} missing role field"
        assert match.group(1).strip(), f"{ts_file.name} has empty role"


# ═══════════════════════════════════════════════════════════════════════════
# 5. org field not empty
# ═══════════════════════════════════════════════════════════════════════════


class TestTsOrgNotEmpty:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_org_not_empty(self, ts_file: Path):
        """Parse org field with regex, assert non-empty."""
        content = ts_file.read_text()
        match = re.search(r'org:\s*"([^"]*)"', content)
        assert match, f"{ts_file.name} missing org field"
        assert match.group(1).strip(), f"{ts_file.name} has empty org"


# ═══════════════════════════════════════════════════════════════════════════
# 6. slug matches filename
# ═══════════════════════════════════════════════════════════════════════════


class TestTsSlugMatchesFilename:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_slug_matches_filename(self, ts_file: Path):
        """Parse slug field, assert it matches the filename stem."""
        content = ts_file.read_text()
        match = re.search(r'slug:\s*"([^"]*)"', content)
        assert match, f"{ts_file.name} missing slug field"
        slug = match.group(1)
        assert (
            slug == ts_file.stem
        ), f"{ts_file.name} slug '{slug}' != filename stem '{ts_file.stem}'"


# ═══════════════════════════════════════════════════════════════════════════
# 7. github field not empty
# ═══════════════════════════════════════════════════════════════════════════


class TestTsGithubNotEmpty:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_github_not_empty(self, ts_file: Path):
        """When github field is present, assert it is non-empty."""
        content = ts_file.read_text()
        match = re.search(r'github:\s*"([^"]*)"', content)
        if not match:
            pytest.skip(f"{ts_file.name}: no github field (acceptable for non-developers)")
        assert match.group(1).strip(), f"{ts_file.name} has empty github"


# ═══════════════════════════════════════════════════════════════════════════
# 8. no unescaped quotes inside string values
# ═══════════════════════════════════════════════════════════════════════════


class TestTsNoUnescapedQuotes:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_no_unescaped_quotes(self, ts_file: Path):
        """Assert no unescaped double quotes inside string values (would break JS).

        Looks for patterns like: "some text " broken" more" where an unescaped
        quote appears mid-string. We detect this by finding lines with an odd
        number of unescaped double quotes (excluding escaped ones).
        """
        content = ts_file.read_text()
        for i, line in enumerate(content.splitlines(), 1):
            stripped = line.strip()
            # Skip lines that are purely structural (imports, braces, etc.)
            if not stripped or stripped.startswith("//") or stripped.startswith("import"):
                continue
            # Count unescaped double quotes (not preceded by backslash)
            unescaped = re.findall(r'(?<!\\)"', stripped)
            # A well-formed line should have an even number of unescaped quotes
            assert (
                len(unescaped) % 2 == 0
            ), f"{ts_file.name}:{i} has odd number of unescaped quotes: {stripped!r}"


# ═══════════════════════════════════════════════════════════════════════════
# 9. description not truncated
# ═══════════════════════════════════════════════════════════════════════════


class TestTsDescriptionNotTruncated:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_description_not_truncated(self, ts_file: Path):
        """Parse description, assert it doesn't end with '...' (truncation artifact)."""
        content = ts_file.read_text()
        # Description may span multiple lines with string concatenation;
        # capture the full value between the outermost quotes after description:
        match = re.search(
            r'description:\s*\n?\s*"((?:[^"\\]|\\.)*)"', content, re.DOTALL
        )
        assert match, f"{ts_file.name} missing description field"
        desc = match.group(1).strip()
        assert not desc.endswith(
            "..."
        ), f"{ts_file.name} description appears truncated (ends with '...')"


# ═══════════════════════════════════════════════════════════════════════════
# 10. podcasts is array
# ═══════════════════════════════════════════════════════════════════════════


class TestTsPodcastsIsArray:
    @pytest.mark.parametrize("ts_file", TS_FILES, ids=lambda p: p.stem)
    def test_ts_podcasts_is_array(self, ts_file: Path):
        """Assert 'podcasts: []' or 'podcasts: [' exists (array declaration)."""
        content = ts_file.read_text()
        assert re.search(
            r"podcasts:\s*\[", content
        ), f"{ts_file.name} missing 'podcasts' array declaration"
