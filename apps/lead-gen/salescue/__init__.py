"""ClosingTime — Sales intelligence library with 12 ML modules.

Three entry points:
    1. `from salescue import ai` — namespace for ai.score(text), ai.intent(text), etc.
    2. `Engine(modules=[...])` — batch processing with preload
    3. `Document(text) | module1 | module2` — Unix pipe composition

All modules share a single DeBERTa-v3-base encoder backbone.
"""

from .document import Document
from .chain import Chain
from .engine import Engine, list_modules
from .backbone import SharedEncoder, get_device, set_device
from .validation import ClosingTimeValidationError
from .reproducibility import set_deterministic, set_seed
from .config import ClosingTimeConfig, ALL_CONFIGS
from .hub import ClosingTimeModel
from .pipeline import pipeline as pipeline


class _ModuleProxy:
    """Wraps a module so that calling it with text routes to .predict()."""

    __slots__ = ("_module",)

    def __init__(self, module):
        object.__setattr__(self, "_module", module)

    def __call__(self, text, **kwargs):
        mod = object.__getattribute__(self, "_module")
        if hasattr(mod, "predict"):
            return mod.predict(text, **kwargs)
        return mod(text, **kwargs)

    def __getattr__(self, name):
        return getattr(object.__getattribute__(self, "_module"), name)

    def __repr__(self):
        mod = object.__getattribute__(self, "_module")
        name = getattr(mod, "name", type(mod).__name__)
        return f"<ai.{name}>"


class _AINamespace:
    """Lazy namespace providing `ai.score(text)`, `ai.intent(text)`, etc.

    Modules are loaded on first access to avoid importing torch at package
    import time. Returns a proxy that routes text input to .predict().
    """

    def __getattr__(self, name: str):
        from .engine import MODULE_REGISTRY, _ensure_registry
        _ensure_registry()

        if name in MODULE_REGISTRY:
            cls, kwargs = MODULE_REGISTRY[name]
            device = get_device()
            import torch
            module = cls(**kwargs)
            if isinstance(module, torch.nn.Module):
                module = module.to(device).eval()
            proxy = _ModuleProxy(module)
            setattr(self, name, proxy)
            return proxy

        raise AttributeError(f"No module named '{name}'. Available: {list(MODULE_REGISTRY.keys())}")

    def __repr__(self):
        from .engine import MODULE_REGISTRY, _ensure_registry
        _ensure_registry()
        loaded = [k for k in MODULE_REGISTRY if k in self.__dict__]
        return f"<ai namespace: {len(loaded)}/{len(MODULE_REGISTRY)} loaded>"


ai = _AINamespace()

__all__ = [
    "ai",
    "Document",
    "Chain",
    "Engine",
    "list_modules",
    "SharedEncoder",
    "get_device",
    "set_device",
    "ClosingTimeValidationError",
    "set_deterministic",
    "set_seed",
    "ClosingTimeConfig",
    "ALL_CONFIGS",
    "ClosingTimeModel",
    "pipeline",
]

__version__ = "0.3.0"
