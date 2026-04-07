"""salescue/hub.py — HuggingFace Hub integration.

Provides from_pretrained, push_to_hub, and auto model card generation
for all ClosingTime modules. Follows HF patterns:

    model = ClosingTimeModel.from_pretrained("v9ai/salescue-score-v1")
    result = model.predict("interested in your enterprise plan")
    model.push_to_hub("my-org/my-score-model")
"""

from __future__ import annotations

import json
import os
import tempfile
from typing import Any

import torch

from .config import ClosingTimeConfig, ALL_CONFIGS, HF_ORG


def _resolve_module_class(module_name: str):
    """Import and return the module class for a given name."""
    from .modules import MODULE_CLASSES
    if module_name not in MODULE_CLASSES:
        raise ValueError(f"Unknown module '{module_name}'. Available: {list(MODULE_CLASSES.keys())}")
    return MODULE_CLASSES[module_name]


class ClosingTimeModel:
    """HF-native wrapper providing from_pretrained/push_to_hub for all modules.

    Usage:
        # Load from Hub
        scorer = ClosingTimeModel.from_pretrained("v9ai/salescue-score-v1")
        result = scorer.predict("interested in pricing for 500 seats")

        # Save locally and push
        scorer.save_pretrained("./my-scorer")
        scorer.push_to_hub("my-org/my-scorer")

        # Load with custom labels
        clf = ClosingTimeModel.from_pretrained(
            "v9ai/salescue-reply-v1",
            labels=["interested", "not_interested", "question"]
        )
    """

    def __init__(self, module, config: ClosingTimeConfig):
        self._module = module
        self.config = config

    def predict(self, text: str, **kwargs) -> dict[str, Any]:
        """Run inference on text."""
        if hasattr(self._module, "predict"):
            return self._module.predict(text, **kwargs)
        return self._module(text, **kwargs)

    def __call__(self, text: str, **kwargs) -> dict[str, Any]:
        return self.predict(text, **kwargs)

    def encode(self, text: str) -> torch.Tensor:
        """Return the CLS embedding for the input text.

        Useful for downstream tasks, clustering, similarity search.
        """
        from .backbone import SharedEncoder
        encoded = SharedEncoder.encode(text)
        return encoded["encoder_output"].last_hidden_state[:, 0].detach()

    @classmethod
    def from_pretrained(
        cls,
        model_id: str,
        labels: list[str] | None = None,
        device: str | None = None,
        **kwargs,
    ) -> "ClosingTimeModel":
        """Load a ClosingTime module from the HF Hub or local directory.

        Args:
            model_id: HF model ID (e.g. "v9ai/salescue-score-v1") or local path.
            labels: Optional custom label list (overrides config labels).
            device: Device to load onto (default: auto-detect).
        """
        from .backbone import get_device, set_device

        if device:
            set_device(device)
        target_device = get_device()

        # Load config
        try:
            config = ClosingTimeConfig.from_pretrained(model_id)
        except Exception:
            # Infer from model_id pattern: v9ai/salescue-{name}-v{version}
            parts = model_id.rstrip("/").split("/")[-1]  # salescue-score-v1
            segments = parts.replace("salescue-", "").rsplit("-v", 1)
            module_name = segments[0] if segments else "score"
            config = ALL_CONFIGS.get(module_name, ClosingTimeConfig(module_name=module_name))

        if labels:
            config.labels = labels
            config.id2label = {i: l for i, l in enumerate(labels)}
            config.label2id = {l: i for i, l in enumerate(labels)}

        # Instantiate module
        module_cls = _resolve_module_class(config.module_name)
        module = module_cls(hidden=config.hidden_size, **kwargs)

        # Load weights
        try:
            if os.path.isdir(model_id):
                weight_path = os.path.join(model_id, "head.pt")
            else:
                from huggingface_hub import hf_hub_download
                weight_path = hf_hub_download(model_id, "head.pt")

            state = torch.load(weight_path, map_location=target_device, weights_only=True)
            module.load_state_dict(state)
        except Exception:
            pass  # Random init if no weights available

        module = module.to(target_device).eval()
        return cls(module, config)

    def save_pretrained(self, save_directory: str, trained: bool = False) -> None:
        """Save model weights and config to a directory."""
        os.makedirs(save_directory, exist_ok=True)

        # Save config
        self.config.save_pretrained(save_directory)

        # Save weights
        torch.save(
            self._module.state_dict(),
            os.path.join(save_directory, "head.pt"),
        )

        # Generate model card
        card = self._generate_model_card(trained=trained)
        with open(os.path.join(save_directory, "README.md"), "w") as f:
            f.write(card)

    def push_to_hub(
        self,
        repo_id: str,
        commit_message: str = "Upload ClosingTime model",
        private: bool = False,
        trained: bool = False,
    ) -> str:
        """Push model to HuggingFace Hub.

        Returns:
            URL of the uploaded model.
        """
        from huggingface_hub import HfApi

        with tempfile.TemporaryDirectory() as tmpdir:
            self.save_pretrained(tmpdir, trained=trained)
            api = HfApi()
            api.create_repo(repo_id, exist_ok=True, private=private)
            api.upload_folder(
                folder_path=tmpdir,
                repo_id=repo_id,
                commit_message=commit_message,
            )
        return f"https://huggingface.co/{repo_id}"

    # Per-module research contributions and descriptions
    _MODULE_RESEARCH = {
        "score": (
            "Causal Signal Attribution via Learned Interventions",
            "Standard counterfactual masking replaces tokens with [MASK], which shifts the input "
            "distribution. LeadScorer learns a *null intervention embedding* per signal type that "
            "represents \"this signal was never present\" rather than \"this signal was removed.\" "
            "This is closer to Pearl's do-calculus: do(signal=absent) not observe(signal=masked). "
            "The null embeddings are trained adversarially to produce encoder outputs "
            "indistinguishable from inputs where the signal genuinely doesn't exist.\n\n"
            "The model detects 15 buying signals (pricing interest, urgency, budget, referral, etc.) "
            "via cross-attention, estimates causal effects using learned counterfactuals, and produces "
            "an uncertainty-weighted score combining classification and regression (Kendall et al., 2018).",
        ),
        "spam": (
            "Perplexity Ratio AI Detection",
            "Existing AI detectors compare perplexity against a threshold, but perplexity varies "
            "by domain, register, and topic. SpamHead computes the *perplexity ratio* between two "
            "language models: one fine-tuned on human sales emails, one on AI-generated sales emails. "
            "The ratio is domain-invariant because both models see the same domain distribution.\n\n"
            "Combines neural spam scoring with provider-specific calibration (Gmail, Outlook, Yahoo) "
            "and structural feature analysis (sentence variance, contraction use, punctuation patterns).",
        ),
        "intent": (
            "Neural Hawkes Process for Buying Journey",
            "Models the prospect's buying journey as a *marked temporal point process* where each "
            "signal (event) has a type (mark) and arrival time. The intensity function of future "
            "events depends on the history of past events via a neural Hawkes process. This directly "
            "models the self-exciting property of buying behavior: interest begets more interest.",
        ),
        "reply": (
            "Constrained CRF for Structured Reply Classification",
            "Multi-label classification treats labels independently, but reply labels have structural "
            "constraints: `unsubscribe` and `genuinely_interested` are mutually exclusive; `referral` "
            "implies `not_now`. ReplyHead enforces these via a *constrained conditional random field* "
            "where the transition matrix encodes label co-occurrence rules.",
        ),
        "triggers": (
            "Temporal Displacement Model",
            "Freshness isn't a classification — it's a continuous temporal reasoning task. "
            "TemporalDisplacementModel learns P(event_date | article_date, text_features), "
            "predicting when the event actually happened given how it's described. This models "
            "the relationship between event mention and event occurrence as a *temporal "
            "displacement distribution*.",
        ),
        "objection": (
            "3-Way Pre-classifier with Coaching Cards",
            "Most objection handling treats all objections the same. ObjectionPreClassifier "
            "first classifies into genuine_objection / stall / misunderstanding using a 3-way "
            "pre-classifier, then routes each to specialized handling. Each of the 12 objection "
            "types gets a coaching card with a recommended response framework.",
        ),
        "sentiment": (
            "MI-Minimized Sentiment-Intent Disentanglement",
            "Sentiment and intent are entangled in text representations. DisentangledSentimentIntentHead "
            "enforces disentanglement explicitly: the sentiment representation contains zero information "
            "about intent, and vice versa. Uses *mutual information minimization* via the CLUB bound "
            "(Cheng et al., 2020) to provably decorrelate the two representations, then learns "
            "inversion patterns from their interaction.",
        ),
        "entities": (
            "Regex + Pointer NER with Re-typing",
            "Hybrid entity extraction combining high-precision regex patterns for structured entities "
            "(emails, phones, URLs, money, dates) with a pointer-network NER for unstructured entities "
            "(person, company, product, role). A re-typing layer reclassifies detected entities in "
            "context — e.g., \"John\" becomes decision_maker vs. reference based on surrounding text.",
        ),
        "call": (
            "Conditional Neural Process for Conversation Scoring",
            "Models sales call transcripts as a *conditional neural process* (CNP). Given a "
            "conversation context (partial transcript), the model predicts the distribution of "
            "possible outcomes. This handles variable-length multi-speaker transcripts and "
            "produces calibrated uncertainty estimates for deal health and next-action prediction.",
        ),
    }

    # Map modules to HF pipeline tags
    _PIPELINE_TAGS = {
        "score": "text-classification",
        "intent": "text-classification",
        "reply": "text-classification",
        "triggers": "text-classification",
        "objection": "text-classification",
        "sentiment": "text-classification",
        "spam": "text-classification",
        "entities": "token-classification",
        "call": "text-classification",
        "subject": "text-classification",
        "icp": "feature-extraction",
        "emailgen": "text-generation",
    }

    def _generate_model_card(self, trained: bool = False) -> str:
        """Auto-generate a HF model card."""
        c = self.config
        labels_md = ""
        if c.labels:
            labels_md = "\n".join(f"- `{l}`" for l in c.labels)
            labels_md = f"\n## Labels\n\n{labels_md}\n"

        pipeline_tag = self._PIPELINE_TAGS.get(c.module_name, "text-classification")
        status = "trained" if trained else "untrained"
        model_id = c.model_id or f"{HF_ORG}/salescue-{c.module_name}-v{c.version}"

        # Research contribution
        title, description = self._MODULE_RESEARCH.get(
            c.module_name,
            (c.architectures[0] if c.architectures else c.module_name, ""),
        )
        research_md = ""
        if description:
            research_md = f"\n## Research Contribution\n\n**{title}**\n\n{description}\n"

        return f"""---
library_name: salescue
pipeline_tag: {pipeline_tag}
language:
- en
base_model: microsoft/deberta-v3-base
tags:
- sales
- salescue
- {c.module_name}
- sales-intelligence
- b2b
- pytorch
license: mit
---

# ClosingTime — {c.module_name}

{c.architectures[0] if c.architectures else c.module_name} module from the
[ClosingTime](https://github.com/v9ai/ai-apps) sales intelligence library.

> **Status**: `{status}` — {"production weights" if trained else "architecture only, random initialization. Use as a starting point for fine-tuning."}
{research_md}
## Usage

```python
from salescue import ClosingTimeModel

model = ClosingTimeModel.from_pretrained("{model_id}")
result = model.predict("your sales text here")
print(result)
```

Or via the convenience API:

```python
from salescue import ai
result = ai.{c.module_name}("your sales text here")
```
{labels_md}
## Architecture

- **Backbone**: [`{c.backbone}`](https://huggingface.co/{c.backbone}) (shared encoder, {c.hidden_size}-dim)
- **Head**: `{c.architectures[0] if c.architectures else 'unknown'}`
- **Parameters**: head only (backbone loaded separately)

## Intended Use

- **Primary**: B2B sales intelligence — lead scoring, email analysis, conversation insights
- **Users**: Sales teams, RevOps, GTM engineers building sales automation
- **Input**: English sales text (emails, call transcripts, prospect communications)

## Limitations

- **Untrained weights**: This release contains the architecture only. Weights are randomly initialized and must be fine-tuned on domain-specific data before production use.
- **English only**: Designed for English sales text. Performance on other languages is untested.
- **Domain-specific**: Optimized for B2B sales communications. May not generalize to other text domains.
- **Shared backbone**: Requires `microsoft/deberta-v3-base` loaded via the ClosingTime library.

## About ClosingTime

ClosingTime is a sales intelligence library with 12 ML modules sharing a single
DeBERTa-v3-base encoder backbone. Modules can be composed via Unix-style piping:

```python
from salescue import Document
result = Document("interested in pricing") | ai.score | ai.intent | ai.sentiment
```

All modules: `score` `intent` `reply` `triggers` `icp` `objection` `sentiment` `spam` `entities` `call` `subject` `emailgen`

See the [ClosingTime documentation](https://github.com/v9ai/ai-apps) for details.
"""

    def __repr__(self) -> str:
        return (f"ClosingTimeModel(module={self.config.module_name!r}, "
                f"model_id={self.config.model_id!r})")
