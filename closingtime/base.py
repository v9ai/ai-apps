"""closingtime/base.py — Abstract base class for all modules.

Every ClosingTime module inherits from BaseModule and implements
the `forward` method. Provides consistent interface for the pipe
operator, display rendering, and module registration.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .backbone import SharedEncoder
from .display import CardRenderer


class BaseModule(ABC):
    """Abstract base class for ClosingTime modules.

    Subclasses must set `name` and `description` class attributes
    and implement the `forward` method.
    """

    name: str = "unnamed"
    description: str = ""

    @abstractmethod
    def forward(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Run the module on input text. Returns a result dict."""
        ...

    def __call__(self, text: str, **kwargs: Any) -> dict[str, Any]:
        """Validate input and delegate to forward."""
        from .validation import validate_text
        text = validate_text(text)
        return self.forward(text, **kwargs)

    def display(self, result: dict[str, Any], mode: str = "rich") -> str | None:
        """Render the result as a visual card."""
        if mode == "rich":
            CardRenderer.render_rich(self.name, result)
            return None
        elif mode == "html":
            return CardRenderer.render_html(self.name, result)
        else:
            return CardRenderer.render_terminal(self.name, result)

    def encode(self, text: str, max_length: int = 512) -> dict:
        """Encode text using the shared backbone."""
        return SharedEncoder.encode(text, max_length=max_length)

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name!r}>"
