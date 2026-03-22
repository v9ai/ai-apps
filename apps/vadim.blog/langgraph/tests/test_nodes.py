"""Tests for shared node logic — routing, helpers, content resolution, editor input assembly."""

import asyncio
from pathlib import Path
from unittest.mock import AsyncMock, patch

from press.graphs.nodes import (
    _topic_key,
    _save_draft,
    is_approved,
    should_revise_simple,
    should_revise_with_linkedin,
    build_editor_input,
    resolve_published_content,
    make_write_node,
    make_edit_node,
    make_revise_node,
    make_linkedin_node,
)


# ── Pure helpers ──────────────────────────────────────────────────────────────


class TestTopicKey:

    def test_prefers_title(self):
        assert _topic_key({"title": "My Title", "topic": "fallback"}) == "My Title"

    def test_falls_back_to_topic(self):
        assert _topic_key({"topic": "The Topic"}) == "The Topic"

    def test_empty_state(self):
        assert _topic_key({}) == ""

    def test_title_empty_falls_back(self):
        assert _topic_key({"title": "", "topic": "Fallback"}) == "Fallback"


class TestIsApproved:

    def test_approve_keyword(self):
        assert is_approved("APPROVE — the draft is ready.")

    def test_status_published(self):
        assert is_approved("---\nstatus: published\n---\n\n# Title")

    def test_revision_needed(self):
        assert not is_approved("REVISE: fix the citations in section 3.")

    def test_empty_string(self):
        assert not is_approved("")


# ── Routing ───────────────────────────────────────────────────────────────────


class TestRoutingSimple:

    def test_approved_routes_to_publish(self):
        assert should_revise_simple({"approved": True}) == "publish"

    def test_max_revisions_routes_to_save_final(self):
        assert should_revise_simple({"approved": False, "revision_rounds": 1}) == "save_final"

    def test_under_max_routes_to_revise(self):
        assert should_revise_simple({"approved": False, "revision_rounds": 0}) == "revise"

    def test_no_rounds_key_defaults_zero(self):
        assert should_revise_simple({"approved": False}) == "revise"


class TestRoutingWithLinkedin:

    def test_approved_routes_to_linkedin_approved(self):
        assert should_revise_with_linkedin({"approved": True}) == "linkedin_approved"

    def test_max_revisions_routes_to_linkedin_final(self):
        assert should_revise_with_linkedin({"approved": False, "revision_rounds": 1}) == "linkedin_final"

    def test_under_max_routes_to_revise(self):
        assert should_revise_with_linkedin({"approved": False, "revision_rounds": 0}) == "revise"


# ── build_editor_input ────────────────────────────────────────────────────────


class TestBuildEditorInput:

    def _base_state(self, **overrides):
        state = {
            "draft": "# Draft\n\nSome content.",
            "research_output": "## Research\n\nFindings.",
            "seo_output": "## SEO\n\nKeywords.",
        }
        state.update(overrides)
        return state

    def test_basic_sections(self):
        result = build_editor_input(self._base_state())
        assert "## Draft" in result
        assert "## Research Brief" in result
        assert "## SEO Strategy" in result
        assert "Reference Quality" not in result
        assert "Source Article" not in result

    def test_reference_report_with_issues(self):
        state = self._base_state(
            reference_report="Score: 0.42",
            reference_issues=["broken_links(2): [url1, url2]"],
        )
        result = build_editor_input(state)
        assert "MUST ADDRESS BEFORE APPROVING" in result
        assert "broken_links" in result
        assert "Score: 0.42" in result

    def test_reference_report_no_issues(self):
        state = self._base_state(
            reference_report="Score: 0.95",
            reference_issues=[],
        )
        result = build_editor_input(state)
        assert "No critical issues" in result
        assert "Score: 0.95" in result
        assert "MUST ADDRESS" not in result

    def test_source_content_included(self):
        state = self._base_state(source_content="Original article text.")
        result = build_editor_input(state)
        assert "Source Article (ground truth)" in result
        assert "Original article text." in result

    def test_all_sections_separated_by_dividers(self):
        state = self._base_state(
            reference_report="report",
            reference_issues=[],
            source_content="source",
        )
        result = build_editor_input(state)
        assert result.count("---") >= 4  # dividers between 5 sections


# ── resolve_published_content ────────────────────────────────────────────────


class TestResolvePublishedContent:

    def test_extracts_from_editor_output(self):
        state = {
            "editor_output": "---\nstatus: published\n---\n\n# Title\n\nBody.",
            "draft": "# Draft\n\nOld body.",
            "topic": "test",
        }
        content = resolve_published_content(state)
        assert "---\nstatus: published" in content

    def test_falls_back_to_draft_when_editor_returns_notes(self):
        state = {
            "editor_output": "**DECISION: REVISE** fix everything",
            "draft": "# The Real Draft\n\nGood content.",
            "topic": "test",
        }
        content = resolve_published_content(state)
        assert content == "# The Real Draft\n\nGood content."

    def test_uses_disk_draft_when_extraction_returns_notes(self, tmp_path):
        """When extract_published_content returns the draft (no frontmatter in editor
        output) but the draft itself starts with editor notes, fall back to disk."""
        drafts_dir = tmp_path / "drafts"
        drafts_dir.mkdir()
        (drafts_dir / "test-topic.md").write_text("# Disk Draft\n\nFrom disk.")

        # draft starts with editor-note pattern — triggers the guard
        state = {
            "editor_output": "REVISE: fix section 2",
            "draft": "**DECISION: REVISE** rewrite the conclusion",
            "topic": "test topic",
            "output_dir": str(tmp_path),
        }
        content = resolve_published_content(state)
        assert "Disk Draft" in content


# ── _save_draft ───────────────────────────────────────────────────────────────


class TestSaveDraft:

    def test_creates_draft_file(self, tmp_path):
        state = {"topic": "My Topic", "output_dir": str(tmp_path)}
        _save_draft(state, "# Draft content")
        draft_path = tmp_path / "drafts" / "my-topic.md"
        assert draft_path.exists()
        assert draft_path.read_text() == "# Draft content"

    def test_saves_revisions(self, tmp_path):
        state = {"topic": "My Topic", "output_dir": str(tmp_path)}
        _save_draft(state, "# Draft", revisions="Fix section 2")
        assert (tmp_path / "drafts" / "my-topic-revisions.md").read_text() == "Fix section 2"

    def test_no_revisions_file_when_none(self, tmp_path):
        state = {"topic": "My Topic", "output_dir": str(tmp_path)}
        _save_draft(state, "# Draft")
        assert not (tmp_path / "drafts" / "my-topic-revisions.md").exists()


# ── Factory nodes with mocked Agent ──────────────────────────────────────────


class TestMakeWriteNode:

    def test_returns_draft(self):
        mock_model = AsyncMock()
        mock_pool = AsyncMock()
        mock_pool.for_role.return_value = mock_model

        with patch("press.graphs.nodes.Agent") as MockAgent:
            instance = AsyncMock()
            instance.run.return_value = "# Generated Draft"
            MockAgent.return_value = instance

            node = make_write_node(
                mock_pool,
                "test-writer",
                lambda s: "system prompt",
                lambda s: "input text",
            )
            result = asyncio.run(node({"topic": "test", "output_dir": "/tmp/test-write"}))

        assert result["draft"] == "# Generated Draft"
        MockAgent.assert_called_once()
        instance.run.assert_called_once_with("input text")


class TestMakeEditNode:

    def test_approved_output(self):
        mock_pool = AsyncMock()
        mock_pool.for_role.return_value = AsyncMock()

        with patch("press.graphs.nodes.Agent") as MockAgent:
            instance = AsyncMock()
            instance.run.return_value = "APPROVE — looks great"
            MockAgent.return_value = instance

            node = make_edit_node(mock_pool, "test-editor", lambda s: "editor prompt")
            state = {
                "draft": "# Draft",
                "research_output": "research",
                "seo_output": "seo",
                "revision_rounds": 0,
            }
            result = asyncio.run(node(state))

        assert result["approved"] is True
        assert result["editor_output"] == "APPROVE — looks great"

    def test_revision_output(self):
        mock_pool = AsyncMock()
        mock_pool.for_role.return_value = AsyncMock()

        with patch("press.graphs.nodes.Agent") as MockAgent:
            instance = AsyncMock()
            instance.run.return_value = "REVISE: fix section 2"
            MockAgent.return_value = instance

            node = make_edit_node(mock_pool, "test-editor", lambda s: "prompt")
            state = {
                "draft": "# Draft",
                "research_output": "research",
                "seo_output": "seo",
                "revision_rounds": 0,
            }
            result = asyncio.run(node(state))

        assert result["approved"] is False


class TestMakeReviseNode:

    def test_increments_revision_rounds(self):
        mock_pool = AsyncMock()
        mock_pool.for_role.return_value = AsyncMock()

        with patch("press.graphs.nodes.Agent") as MockAgent:
            instance = AsyncMock()
            instance.run.return_value = "# Revised Draft"
            MockAgent.return_value = instance

            node = make_revise_node(
                mock_pool,
                "test-writer",
                lambda s: "prompt",
                lambda s: "## Context",
            )
            state = {
                "topic": "test",
                "editor_output": "Fix it",
                "draft": "# Old Draft",
                "revision_rounds": 0,
                "output_dir": "/tmp/test-revise",
            }
            result = asyncio.run(node(state))

        assert result["draft"] == "# Revised Draft"
        assert result["revision_rounds"] == 1


class TestMakeLinkedinNode:

    def test_generates_linkedin_post(self):
        mock_pool = AsyncMock()
        mock_pool.for_role.return_value = AsyncMock()

        with patch("press.graphs.nodes.Agent") as MockAgent:
            instance = AsyncMock()
            instance.run.return_value = "LinkedIn post content"
            MockAgent.return_value = instance

            node = make_linkedin_node(mock_pool, "test-linkedin")
            state = {
                "draft": "# Draft",
                "editor_output": "APPROVE",
                "approved": True,
                "topic": "test",
                "output_dir": "/tmp/test-linkedin",
            }
            result = asyncio.run(node(state))

        assert result["linkedin"] == "LinkedIn post content"
