"""DeepEval eval fixtures and model setup."""

from __future__ import annotations

from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def research_brief() -> str:
    return (FIXTURES_DIR / "research-brief.md").read_text()


@pytest.fixture
def seo_strategy() -> str:
    return (FIXTURES_DIR / "seo-strategy.md").read_text()


@pytest.fixture
def source_article() -> str:
    return (FIXTURES_DIR / "source-article.md").read_text()


@pytest.fixture
def draft_approvable() -> str:
    return (FIXTURES_DIR / "draft-approvable.md").read_text()


@pytest.fixture
def draft_needs_revision() -> str:
    return (FIXTURES_DIR / "draft-needs-revision.md").read_text()


@pytest.fixture
def editor_input_approvable() -> str:
    return (FIXTURES_DIR / "editor-input-approvable.md").read_text()


@pytest.fixture
def editor_input_needs_revision() -> str:
    return (FIXTURES_DIR / "editor-input-needs-revision.md").read_text()
