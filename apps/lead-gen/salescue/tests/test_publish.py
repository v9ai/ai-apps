"""Tests for salescue.publish — HF publishing script."""

from salescue.publish import PUBLISHABLE_MODULES, SKIPPED_MODULES, publish_module


class TestPublishableModules:
    def test_publishable_list(self):
        expected = {"spam", "score", "intent", "reply", "triggers",
                    "objection", "sentiment", "entities", "call",
                    "icp", "subject"}
        assert set(PUBLISHABLE_MODULES) == expected

    def test_skipped_modules(self):
        assert "emailgen" in SKIPPED_MODULES

    def test_icp_and_subject_publishable(self):
        assert "icp" in PUBLISHABLE_MODULES
        assert "subject" in PUBLISHABLE_MODULES
        assert "icp" not in SKIPPED_MODULES
        assert "subject" not in SKIPPED_MODULES

    def test_no_overlap(self):
        assert not set(PUBLISHABLE_MODULES) & set(SKIPPED_MODULES)


class TestPublishModuleDryRun:
    def test_dry_run_spam(self, capsys):
        result = publish_module("spam", dry_run=True)
        assert result is None
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out
        assert "VERIFY" in captured.out

    def test_dry_run_score(self, capsys):
        result = publish_module("score", dry_run=True)
        assert result is None
        captured = capsys.readouterr()
        assert "DRY RUN" in captured.out

    def test_skipped_module(self, capsys):
        result = publish_module("emailgen", dry_run=True)
        assert result is None
        captured = capsys.readouterr()
        assert "SKIP" in captured.out

    def test_unknown_module(self, capsys):
        result = publish_module("nonexistent", dry_run=True)
        assert result is None
        captured = capsys.readouterr()
        assert "ERROR" in captured.out
