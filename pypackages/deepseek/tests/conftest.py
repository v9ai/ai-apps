import os
from pathlib import Path

import dotenvy
import pytest

# Walk up to repo root and load .env / .env.local
_repo_root = Path(__file__).resolve().parents[3]
for name in (".env", ".env.local"):
    env_file = _repo_root / name
    if env_file.exists():
        dotenvy.load_env(dotenvy.read_file(str(env_file)))


def pytest_collection_modifyitems(config, items):
    """Skip integration tests when DEEPSEEK_API_KEY is not set."""
    if os.environ.get("DEEPSEEK_API_KEY"):
        return
    skip = pytest.mark.skip(reason="DEEPSEEK_API_KEY not set")
    for item in items:
        if "integration" in item.keywords:
            item.add_marker(skip)
