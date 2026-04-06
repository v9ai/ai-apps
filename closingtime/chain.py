"""closingtime/chain.py — Composition with error handling and timing.

Chain multiple modules together with per-module latency tracking
and graceful error handling.
"""

from __future__ import annotations

import time
from typing import Any, TYPE_CHECKING

from .document import Document

if TYPE_CHECKING:
    from .base import BaseModule


class Chain:
    """Compose modules into a sequential pipeline with error handling.

    Usage:
        chain = Chain([score, intent, reply])
        result = chain.run("some email text")
    """

    def __init__(self, modules: list["BaseModule"]):
        self.modules = modules

    def run(self, text: str) -> dict[str, Any]:
        """Run all modules sequentially, collecting results and timing."""
        doc = Document(text=text)
        timings: dict[str, float] = {}

        for module in self.modules:
            t0 = time.perf_counter()
            doc = doc | module
            timings[module.name] = round(time.perf_counter() - t0, 4)

        return {
            "results": doc.results,
            "errors": doc.errors,
            "timings": timings,
            "total_time": round(sum(timings.values()), 4),
        }

    def __repr__(self) -> str:
        names = " | ".join(m.name for m in self.modules)
        return f"Chain({names})"
