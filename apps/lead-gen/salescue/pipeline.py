"""salescue/pipeline.py — HuggingFace pipeline() integration.

Registers SalesCue modules as custom pipelines so they can be used via:

    from transformers import pipeline
    scorer = pipeline("sales-scoring", model="v9ai/salescue-score-v1")
    result = scorer("interested in your enterprise plan")

Or directly:

    from salescue import pipeline as ct_pipeline
    scorer = ct_pipeline("score")
    result = scorer("interested in your enterprise plan")
"""

from __future__ import annotations

from typing import Any


# Pipeline name -> module name mapping
PIPELINE_REGISTRY = {
    "sales-scoring": "score",
    "sales-score": "score",
    "buying-intent": "intent",
    "sales-intent": "intent",
    "reply-classification": "reply",
    "sales-reply": "reply",
    "sales-ner": "entities",
    "sales-entities": "entities",
    "trigger-detection": "triggers",
    "sales-triggers": "triggers",
    "icp-matching": "icp",
    "sales-icp": "icp",
    "objection-detection": "objection",
    "sales-objection": "objection",
    "call-scoring": "call",
    "sales-call": "call",
    "spam-detection": "spam",
    "sales-spam": "spam",
    "subject-optimization": "subject",
    "sales-subject": "subject",
    "sales-sentiment": "sentiment",
}


def pipeline(
    task: str,
    model: str | None = None,
    device: str | None = None,
    **kwargs,
) -> "_SalesCuePipeline":
    """Create a SalesCue pipeline.

    Args:
        task: Pipeline task name (e.g. "score", "intent", "sales-scoring").
        model: Optional HF model ID to load specific weights.
        device: Device to run on.

    Returns:
        A callable pipeline object.

    Usage:
        pipe = pipeline("score")
        result = pipe("interested in pricing")

        pipe = pipeline("sales-scoring", model="v9ai/salescue-score-v1")
        results = pipe(["text1", "text2"])  # batch
    """
    # Resolve task name
    module_name = PIPELINE_REGISTRY.get(task, task)

    if model:
        from .hub import SalesCueModel
        wrapped = SalesCueModel.from_pretrained(model, device=device, **kwargs)
        return _SalesCuePipeline(wrapped, module_name)

    # Load from registry
    from .engine import MODULE_REGISTRY, _ensure_registry
    from .backbone import get_device, set_device
    import torch

    _ensure_registry()

    if device:
        set_device(device)

    if module_name not in MODULE_REGISTRY:
        available = list(MODULE_REGISTRY.keys()) + list(PIPELINE_REGISTRY.keys())
        raise ValueError(f"Unknown task '{task}'. Available: {sorted(set(available))}")

    cls, init_kwargs = MODULE_REGISTRY[module_name]
    module = cls(**init_kwargs)
    if isinstance(module, torch.nn.Module):
        module = module.to(get_device()).eval()

    return _SalesCuePipeline(module, module_name)


class _SalesCuePipeline:
    """Callable pipeline wrapper with batch support."""

    def __init__(self, module, name: str):
        self._module = module
        self.name = name

    def __call__(
        self,
        inputs: str | list[str],
        **kwargs,
    ) -> dict[str, Any] | list[dict[str, Any]]:
        """Run the pipeline on one or more texts.

        Args:
            inputs: Single text or list of texts.

        Returns:
            Single result dict or list of result dicts.
        """
        if isinstance(inputs, list):
            return [self._predict_one(text, **kwargs) for text in inputs]
        return self._predict_one(inputs, **kwargs)

    def _predict_one(self, text: str, **kwargs) -> dict[str, Any]:
        if hasattr(self._module, "predict"):
            return self._module.predict(text, **kwargs)
        return self._module(text, **kwargs)

    def __repr__(self) -> str:
        return f"<SalesCuePipeline task={self.name!r}>"
