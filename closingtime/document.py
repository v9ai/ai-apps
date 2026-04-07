"""closingtime/document.py — Document dataclass with pipe/getattr support.

Wraps text + accumulated module results. Supports the | operator for
Unix-style composition: `Document(text) | score | intent | reply`.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from .base import BaseModule


@dataclass
class Document:
    """A document flowing through the ClosingTime pipeline.

    Accumulates results from each module it passes through.
    Supports pipe composition via the | operator.
    """

    text: str
    results: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
    errors: list[dict[str, str]] = field(default_factory=list)

    def __or__(self, module: "BaseModule") -> "Document":
        """Pipe operator: doc | module runs the module and stores results."""
        name = getattr(module, 'name', type(module).__name__)
        try:
            result = module(self.text)
            self.results[name] = result
        except Exception as e:
            self.errors.append({"module": name, "error": str(e)})
        return self

    def __getattr__(self, name: str) -> Any:
        """Delegate attribute access to results dict for convenience.

        Allows `doc.score` instead of `doc.results["score"]`.
        """
        if name in ("text", "results", "metadata", "errors"):
            raise AttributeError(name)
        results = object.__getattribute__(self, "results")
        if name in results:
            return results[name]
        raise AttributeError(f"No result for module '{name}'. Available: {list(results.keys())}")

    def __repr__(self) -> str:
        modules = list(self.results.keys())
        return f"Document(text={self.text[:50]!r}..., modules={modules})"

    def to_dict(self) -> dict[str, Any]:
        """Serialize the document and all results."""
        return {
            "text": self.text,
            "results": self.results,
            "metadata": self.metadata,
            "errors": self.errors,
        }
