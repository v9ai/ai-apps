"""closingtime/engine.py — Unified Engine with preload.

Batch processing with module preloading. Manages the shared encoder
lifecycle and provides a simple API for running multiple modules.

Usage:
    engine = Engine(modules=["score", "intent", "reply"])
    results = engine.run("some email text")
    batch_results = engine.run_batch(["text1", "text2", "text3"])
"""

from __future__ import annotations

import time
from typing import Any

from .backbone import SharedEncoder, get_device
from .document import Document
from .validation import validate_text


# Registry of available module names -> class + init kwargs
MODULE_REGISTRY: dict[str, tuple[type, dict]] = {}


def register_module(name: str, cls: type, **kwargs: Any) -> None:
    """Register a module class for use with Engine."""
    MODULE_REGISTRY[name] = (cls, kwargs)


def _ensure_registry() -> None:
    """Populate the registry on first use."""
    if MODULE_REGISTRY:
        return

    from .modules.score import LeadScorer
    from .modules.intent import NeuralHawkesIntentPredictor
    from .modules.reply import ReplyHead
    from .modules.triggers import TemporalDisplacementModel
    from .modules.icp import WassersteinICPMatcher
    from .modules.call import ConversationNeuralProcess
    from .modules.spam import SpamHead
    from .modules.subject import ContextualBradleyTerry
    from .modules.sentiment import DisentangledSentimentIntentHead
    from .modules.entities import EntityExtractor
    from .modules.objection import ObjectionPreClassifier

    register_module("score", LeadScorer)
    register_module("intent", NeuralHawkesIntentPredictor)
    register_module("reply", ReplyHead)
    register_module("triggers", TemporalDisplacementModel)
    register_module("icp", WassersteinICPMatcher)
    register_module("call", ConversationNeuralProcess)
    register_module("spam", SpamHead)
    register_module("subject", ContextualBradleyTerry)
    register_module("sentiment", DisentangledSentimentIntentHead)
    register_module("entities", EntityExtractor)
    register_module("objection", ObjectionPreClassifier)


class Engine:
    """Unified inference engine for ClosingTime modules.

    Preloads specified modules and the shared encoder backbone,
    then provides .run() for single texts and .run_batch() for lists.
    """

    def __init__(self, modules: list[str] | None = None):
        """Initialize the engine with specified module names.

        Args:
            modules: List of module names to load. If None, loads all.
        """
        _ensure_registry()
        self.module_names = modules or list(MODULE_REGISTRY.keys())
        self._modules: dict[str, Any] = {}
        self._loaded = False

    def preload(self) -> "Engine":
        """Load the shared encoder and all specified modules."""
        import torch

        device = get_device()
        SharedEncoder.load()

        for name in self.module_names:
            if name not in MODULE_REGISTRY:
                raise ValueError(
                    f"Unknown module '{name}'. Available: {list(MODULE_REGISTRY.keys())}"
                )
            cls, kwargs = MODULE_REGISTRY[name]
            module = cls(**kwargs).to(device).eval()
            self._modules[name] = module

        self._loaded = True
        return self

    def run(self, text: str) -> dict[str, Any]:
        """Run all loaded modules on a single text.

        Returns dict with per-module results, timings, and any errors.
        """
        if not self._loaded:
            self.preload()

        text = validate_text(text)
        encoded = SharedEncoder.encode(text)

        results: dict[str, Any] = {}
        timings: dict[str, float] = {}
        errors: list[dict] = []

        for name, module in self._modules.items():
            t0 = time.perf_counter()
            try:
                results[name] = module(encoded["encoder_output"])
            except Exception as e:
                errors.append({"module": name, "error": str(e)})
            timings[name] = round(time.perf_counter() - t0, 4)

        return {
            "results": results,
            "timings": timings,
            "errors": errors,
            "total_time": round(sum(timings.values()), 4),
        }

    def run_batch(self, texts: list[str]) -> list[dict[str, Any]]:
        """Run all modules on a batch of texts."""
        return [self.run(text) for text in texts]

    def unload(self) -> None:
        """Release all modules and the shared encoder."""
        self._modules.clear()
        self._loaded = False
        SharedEncoder.unload()

    def __repr__(self) -> str:
        status = "loaded" if self._loaded else "not loaded"
        return f"Engine(modules={self.module_names}, {status})"
