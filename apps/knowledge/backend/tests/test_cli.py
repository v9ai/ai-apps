"""Tests for CLI argument parsing."""

import argparse
from unittest.mock import AsyncMock, patch

import pytest


def _parse(args: list[str]) -> argparse.Namespace:
    """Parse CLI args without running the command."""
    from graph.cli import main
    parser = argparse.ArgumentParser()
    parser.add_argument("slug", nargs="?")
    parser.add_argument("--topic")
    parser.add_argument("--model")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--batch", action="store_true")
    parser.add_argument("--list-missing", action="store_true")
    return parser.parse_args(args)


class TestCliArgParsing:
    def test_slug_only(self):
        args = _parse(["prompt-caching"])
        assert args.slug == "prompt-caching"
        assert args.topic is None
        assert args.model is None
        assert not args.dry_run
        assert not args.batch

    def test_slug_with_topic(self):
        args = _parse(["prompt-caching", "--topic", "Prompt Caching & KV Cache"])
        assert args.slug == "prompt-caching"
        assert args.topic == "Prompt Caching & KV Cache"

    def test_slug_with_model(self):
        args = _parse(["prompt-caching", "--model", "deepseek-reasoner"])
        assert args.model == "deepseek-reasoner"

    def test_dry_run(self):
        args = _parse(["prompt-caching", "--dry-run"])
        assert args.dry_run

    def test_batch(self):
        args = _parse(["--batch"])
        assert args.batch
        assert args.slug is None

    def test_list_missing(self):
        args = _parse(["--list-missing"])
        assert args.list_missing

    def test_all_flags(self):
        args = _parse(["my-slug", "--topic", "My Topic", "--model", "deepseek-chat", "--dry-run"])
        assert args.slug == "my-slug"
        assert args.topic == "My Topic"
        assert args.model == "deepseek-chat"
        assert args.dry_run


class TestDryGraphStructure:
    def test_dry_graph_has_no_save(self):
        from graph.generate import build_dry_graph
        graph = build_dry_graph()
        node_names = set(graph.nodes.keys()) - {"__start__"}
        assert "save" not in node_names
        assert "research" in node_names
        assert "quality_check" in node_names
        assert "revise" in node_names
