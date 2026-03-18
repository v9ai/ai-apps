"""Root conftest — ensure src/ is on sys.path for pytest runs from langgraph/."""
import sys
from pathlib import Path

import pytest

_src = str(Path(__file__).parent / "src")
if _src not in sys.path:
    sys.path.insert(0, _src)

try:
    import deepeval  # noqa: F401
    _DEEPEVAL_AVAILABLE = True
except ImportError:
    _DEEPEVAL_AVAILABLE = False


def pytest_runtest_setup(item):
    """Auto-skip @pytest.mark.eval tests when deepeval is not installed."""
    if item.get_closest_marker("eval") and not _DEEPEVAL_AVAILABLE:
        pytest.skip("deepeval not installed — uv add deepeval or run: uv run pytest -m eval")
