"""Tests for individual graph nodes."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from graph.nodes import research, outline, draft, review, revise, quality_check, save
from graph.state import ContentState


def _base_state(**overrides) -> ContentState:
    state: ContentState = {
        "topic": "Test Topic",
        "slug": "test-topic",
        "category": "Foundations & Architecture",
        "research": "Some research notes",
        "outline": "## Outline\n- Point 1",
        "draft": "# Draft\n\n## Section\nContent",
        "final": "",
        "revision_count": 0,
        "quality_issues": [],
        "total_tokens": 0,
    }
    state.update(overrides)
    return state


def _mock_chat(content: str, tokens: int):
    async def _chat(prompt, **kw):
        return content, tokens
    return _chat


class TestResearchNode:
    @pytest.mark.asyncio
    async def test_returns_research_and_tokens(self):
        with patch("graph.nodes.chat", new=_mock_chat("Research output", 500)):
            result = await research(_base_state())
            assert result["research"] == "Research output"
            assert result["total_tokens"] == 500


class TestOutlineNode:
    @pytest.mark.asyncio
    async def test_returns_outline_and_tokens(self):
        with patch("graph.nodes.chat", new=_mock_chat("## Outline result", 300)):
            result = await outline(_base_state())
            assert result["outline"] == "## Outline result"
            assert result["total_tokens"] == 300


class TestDraftNode:
    @pytest.mark.asyncio
    async def test_returns_draft_and_tokens(self):
        with patch("graph.nodes.chat", new=_mock_chat("# Full draft", 2000)):
            result = await draft(_base_state())
            assert result["draft"] == "# Full draft"
            assert result["total_tokens"] == 2000


class TestReviewNode:
    @pytest.mark.asyncio
    async def test_returns_final_and_tokens(self):
        with patch("graph.nodes.chat", new=_mock_chat("# Reviewed article", 1500)):
            result = await review(_base_state(draft="# Draft content"))
            assert result["final"] == "# Reviewed article"
            assert result["total_tokens"] == 1500


class TestReviseNode:
    @pytest.mark.asyncio
    async def test_increments_revision_count(self):
        state = _base_state(
            final="# Bad draft",
            quality_issues=["Too short"],
            revision_count=0,
        )
        with patch("graph.nodes.chat", new=_mock_chat("# Revised", 800)):
            result = await revise(state)
            assert result["revision_count"] == 1
            assert result["final"] == "# Revised"

    @pytest.mark.asyncio
    async def test_second_revision(self):
        state = _base_state(
            final="# Still bad",
            quality_issues=["Missing code"],
            revision_count=1,
        )
        with patch("graph.nodes.chat", new=_mock_chat("# Better", 900)):
            result = await revise(state)
            assert result["revision_count"] == 2


class TestQualityCheckNode:
    def test_passing_article(self):
        good = (
            "# Title\n\n## S1\n\n## S2\n\n## S3\n\n"
            + "word " * 2000
            + "\n```python\ncode\n```\n```python\ncode\n```\n"
            + "[A](/transformer-architecture)\n"
        )
        result = quality_check(_base_state(final=good))
        assert result["quality_issues"] == []

    def test_failing_article(self):
        result = quality_check(_base_state(final="# Short\n\n## One\nfew words"))
        assert len(result["quality_issues"]) > 0


class TestSaveNode:
    def test_writes_file(self, tmp_path):
        with patch("graph.nodes.CONTENT_DIR", tmp_path):
            save(_base_state(final="# Article content", slug="my-article"))
            written = (tmp_path / "my-article.md").read_text()
            assert written == "# Article content"
