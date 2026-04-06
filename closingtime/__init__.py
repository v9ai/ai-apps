"""ClosingTime — Sales intelligence library with 12 ML modules.

Three entry points:
    1. `from closingtime import ai` — namespace for ai.score(text), ai.intent(text), etc.
    2. `Engine(modules=[...])` — batch processing with preload
    3. `Document(text) | module1 | module2` — Unix pipe composition

All modules share a single DeBERTa-v3-base encoder backbone.
"""

from .document import Document
from .chain import Chain
from .engine import Engine
from .backbone import SharedEncoder, get_device, set_device
from .validation import ClosingTimeValidationError
from .reproducibility import set_deterministic, set_seed


class _AINamespace:
    """Lazy namespace providing `ai.score(text)`, `ai.intent(text)`, etc.

    Modules are loaded on first access to avoid importing torch at package
    import time.
    """

    def __getattr__(self, name: str):
        from .engine import MODULE_REGISTRY, _ensure_registry
        _ensure_registry()

        if name in MODULE_REGISTRY:
            cls, kwargs = MODULE_REGISTRY[name]
            device = get_device()
            import torch
            module = cls(**kwargs).to(device).eval()
            # cache for future calls
            setattr(self, name, module)
            return module

        raise AttributeError(f"No module named '{name}'. Available: {list(MODULE_REGISTRY.keys())}")


ai = _AINamespace()

__all__ = [
    "ai",
    "Document",
    "Chain",
    "Engine",
    "SharedEncoder",
    "get_device",
    "set_device",
    "ClosingTimeValidationError",
    "set_deterministic",
    "set_seed",
]

__version__ = "0.2.0"
