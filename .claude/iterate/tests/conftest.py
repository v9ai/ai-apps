"""Shared pytest fixtures for the iterate pipeline tests."""

import os
import sys

import pytest

# Ensure the iterate directory is on sys.path so all modules are importable.
ITERATE_DIR = os.path.dirname(os.path.dirname(__file__))
if ITERATE_DIR not in sys.path:
    sys.path.insert(0, ITERATE_DIR)


@pytest.fixture(autouse=True)
def isolate_chroma(tmp_path, monkeypatch):
    """Give each test its own ChromaDB directory and reset embedding cache."""
    chroma_path = str(tmp_path / "chroma")
    monkeypatch.setenv("CLAUDE_ITERATE_CHROMA_PATH", chroma_path)

    # Patch module-level constants that were already evaluated at import time
    import store_context
    import retrieve_context
    monkeypatch.setattr(store_context, "CHROMA_PATH", chroma_path)
    monkeypatch.setattr(retrieve_context, "CHROMA_PATH", chroma_path)

    # Reset the embedding cache between tests so monkeypatching fastembed works
    import embeddings
    embeddings._reset_cache()

    yield chroma_path

    embeddings._reset_cache()


@pytest.fixture
def git_cwd(tmp_path, monkeypatch):
    """Provide a temporary git repo and set CLAUDE_ITERATE_CWD."""
    repo = tmp_path / "repo"
    repo.mkdir()
    os.system(f"git init -q {repo} && git -C {repo} commit --allow-empty -m 'init' -q")
    monkeypatch.setenv("CLAUDE_ITERATE_CWD", str(repo))
    chroma_path = str(tmp_path / "chroma")
    monkeypatch.setattr("store_context.CHROMA_PATH", chroma_path)
    monkeypatch.setattr("retrieve_context.CHROMA_PATH", chroma_path)
    return str(repo)


@pytest.fixture
def sample_output():
    return "Iteration 0: added login endpoint and JWT middleware."


@pytest.fixture
def sample_task():
    return "build auth system"
