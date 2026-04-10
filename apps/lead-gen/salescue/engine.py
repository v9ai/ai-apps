"""salescue/engine.py — Unified Engine with preload and true batch inference.

Batch processing with module preloading. Manages the shared encoder
lifecycle and provides a simple API for running multiple modules.

run_batch() encodes all texts through the shared DeBERTa backbone in a
single forward pass, then dispatches the full batch tensor to each module's
process_batch() method — avoiding the N separate encode() calls that
dominated latency in the previous implementation.

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


def list_modules() -> list[str]:
    """Return a list of all available module names."""
    _ensure_registry()
    return list(MODULE_REGISTRY.keys())


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
    from .modules.emailgen import EmailGenerator
    from .modules.survival import DeepSurvivalMachine
    from .modules.anomaly import SignalAnomalyDetector
    from .modules.bandit import OutreachBandit
    from .modules.graph import CompanyGraphScorer

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
    register_module("emailgen", EmailGenerator)
    register_module("survival", DeepSurvivalMachine)
    register_module("anomaly", SignalAnomalyDetector)
    register_module("bandit", OutreachBandit)
    register_module("graph", CompanyGraphScorer)


class Engine:
    """Unified inference engine for SalesCue modules.

    Preloads specified modules and the shared encoder backbone,
    then provides .run() for single texts and .run_batch() for lists.
    """

    # Maximum texts per backbone forward pass. Larger batches are chunked
    # to avoid OOM on GPU/MPS while still getting the batching benefit.
    MAX_BATCH_CHUNK = 32

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
            module = cls(**kwargs)
            if isinstance(module, torch.nn.Module):
                module = module.to(device).eval()
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
                results[name] = module.process(encoded, text)
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
        """Run all modules on a batch of texts with true batched inference.

        Optimizations over the naive per-item loop:
        1. Single backbone forward pass — DeBERTa encodes all texts at once
           (or in MAX_BATCH_CHUNK-sized chunks) instead of N separate calls.
        2. Module-level batching — each module's process_batch() receives the
           full batch tensor. Modules that override process_batch() (e.g.
           LeadScorer, NeuralHawkesIntentPredictor) can do vectorized
           forward passes; others fall back to slicing + per-item process().

        Returns:
            List of result dicts (same format as run()), one per input text.
        """
        if not texts:
            return []

        if not self._loaded:
            self.preload()

        # Validate all texts upfront
        validated = [validate_text(t) for t in texts]
        n = len(validated)

        # ── Phase 1: Batch encode through the shared backbone ──
        # SharedEncoder.encode_batch handles length-sorting for minimal padding.
        # For very large batches, chunk to avoid OOM.
        t_encode_start = time.perf_counter()

        if n <= self.MAX_BATCH_CHUNK:
            batch_encoded = SharedEncoder.encode_batch(validated)
        else:
            # Chunk into sub-batches, encode each, then concatenate
            import torch
            chunk_results = []
            for start in range(0, n, self.MAX_BATCH_CHUNK):
                chunk = validated[start : start + self.MAX_BATCH_CHUNK]
                chunk_results.append(
                    SharedEncoder.encode_batch(chunk, sort_by_length=False)
                )
            batch_encoded = _concat_encoded(chunk_results)

        # If encode_batch sorted by length, restore original order
        original_order = batch_encoded.pop("_original_order", None)

        encode_time = round(time.perf_counter() - t_encode_start, 4)

        # ── Phase 2: Run each module on the full batch ──
        # Initialize per-item result accumulators
        all_results: list[dict[str, Any]] = [
            {"results": {}, "timings": {}, "errors": []} for _ in range(n)
        ]

        # Determine text order (sorted or original) for module dispatch
        if original_order is not None:
            # batch_encoded is in sorted order; we need texts in same order
            inv_order = [0] * n
            for sorted_pos, orig_pos in enumerate(original_order):
                inv_order[orig_pos] = sorted_pos
            sorted_texts = [validated[original_order[i]] for i in range(n)]
        else:
            sorted_texts = validated
            inv_order = None

        for mod_name, module in self._modules.items():
            t0 = time.perf_counter()
            try:
                # Dispatch to module's batch processor
                batch_module_results = module.process_batch(
                    batch_encoded, sorted_texts
                )
                elapsed = round(time.perf_counter() - t0, 4)

                # Distribute results to per-item accumulators
                for sorted_idx in range(n):
                    orig_idx = (
                        original_order[sorted_idx]
                        if original_order is not None
                        else sorted_idx
                    )
                    all_results[orig_idx]["results"][mod_name] = batch_module_results[sorted_idx]
                    all_results[orig_idx]["timings"][mod_name] = round(elapsed / n, 4)

            except Exception as e:
                elapsed = round(time.perf_counter() - t0, 4)
                for i in range(n):
                    all_results[i]["errors"].append(
                        {"module": mod_name, "error": str(e)}
                    )
                    all_results[i]["timings"][mod_name] = round(elapsed / n, 4)

        # Compute totals
        for item in all_results:
            item["total_time"] = round(
                sum(item["timings"].values()) + encode_time / n, 4
            )
            item["timings"]["_encode"] = round(encode_time / n, 4)

        return all_results

    def unload(self) -> None:
        """Release all modules and the shared encoder."""
        self._modules.clear()
        self._loaded = False
        SharedEncoder.unload()

    def __repr__(self) -> str:
        status = "loaded" if self._loaded else "not loaded"
        return f"Engine(modules={self.module_names}, {status})"


def _concat_encoded(chunks: list[dict]) -> dict:
    """Concatenate multiple batch-encoded dicts along the batch dimension."""
    import torch

    # Stack encoder outputs
    all_hidden = torch.cat(
        [c["encoder_output"].last_hidden_state for c in chunks], dim=0
    )

    # Build a lightweight output wrapper
    class _ConcatOutput:
        def __init__(self, hidden_states_cat):
            self.last_hidden_state = hidden_states_cat
            self.attentions = None
            self.hidden_states = None

    all_input_ids = torch.cat([c["input_ids"] for c in chunks], dim=0)
    all_masks = (
        torch.cat([c["attention_mask"] for c in chunks], dim=0)
        if chunks[0].get("attention_mask") is not None
        else None
    )

    result = {
        "encoder_output": _ConcatOutput(all_hidden),
        "input_ids": all_input_ids,
        "attention_mask": all_masks,
    }

    # Concat tokens dict if present
    if chunks[0].get("tokens") is not None:
        result["tokens"] = {
            k: torch.cat([c["tokens"][k] for c in chunks], dim=0)
            for k in chunks[0]["tokens"]
        }

    return result
