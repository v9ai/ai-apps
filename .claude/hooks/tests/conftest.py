"""Shared pytest fixtures for iteration_memory tests."""

import os
import sys

import pytest

# Ensure the hooks directory is on sys.path so iteration_memory is importable.
HOOKS_DIR = os.path.dirname(os.path.dirname(__file__))
if HOOKS_DIR not in sys.path:
    sys.path.insert(0, HOOKS_DIR)


@pytest.fixture(autouse=True)
def isolate_chroma(tmp_path, monkeypatch):
    """Give each test its own ChromaDB directory by patching _get_db_path."""
    chroma_path = str(tmp_path / "chroma_memory")
    os.makedirs(chroma_path, exist_ok=True)

    import iteration_memory

    monkeypatch.setattr(iteration_memory, "_get_db_path", lambda: chroma_path)
    yield chroma_path
