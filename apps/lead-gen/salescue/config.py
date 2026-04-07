"""salescue/config.py — HuggingFace-native configuration classes.

Each module gets a config that extends PretrainedConfig so it can be
saved/loaded via from_pretrained/push_to_hub on the HF Hub.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


# Lightweight config that doesn't require transformers at import time.
# Maps to PretrainedConfig when saving/loading via HF Hub.

HF_ORG = "v9ai"
BACKBONE_MODEL = "microsoft/deberta-v3-base"


@dataclass
class SalesCueConfig:
    """Base config for all SalesCue modules.

    Mirrors the fields HF PretrainedConfig expects, plus module-specific ones.
    Can be serialized to/from config.json for HF Hub compatibility.
    """
    model_type: str = "salescue"
    module_name: str = ""
    hidden_size: int = 768
    backbone: str = BACKBONE_MODEL
    version: str = "1"

    # Module-specific
    labels: list[str] = field(default_factory=list)
    id2label: dict[int, str] = field(default_factory=dict)
    label2id: dict[str, int] = field(default_factory=dict)

    # HF metadata
    architectures: list[str] = field(default_factory=list)
    model_id: str = ""

    def __post_init__(self):
        if self.labels and not self.id2label:
            self.id2label = {i: l for i, l in enumerate(self.labels)}
            self.label2id = {l: i for i, l in enumerate(self.labels)}
        if not self.model_id and self.module_name:
            self.model_id = f"{HF_ORG}/salescue-{self.module_name}-v{self.version}"

    def to_dict(self) -> dict[str, Any]:
        return {
            "model_type": self.model_type,
            "module_name": self.module_name,
            "hidden_size": self.hidden_size,
            "backbone": self.backbone,
            "version": self.version,
            "labels": self.labels,
            "id2label": {str(k): v for k, v in self.id2label.items()},
            "label2id": self.label2id,
            "architectures": self.architectures,
        }

    def save_pretrained(self, save_directory: str) -> None:
        import json, os
        os.makedirs(save_directory, exist_ok=True)
        with open(os.path.join(save_directory, "config.json"), "w") as f:
            json.dump(self.to_dict(), f, indent=2)

    @classmethod
    def from_pretrained(cls, path_or_id: str) -> "SalesCueConfig":
        import json, os
        if os.path.isdir(path_or_id):
            config_path = os.path.join(path_or_id, "config.json")
        elif os.path.isfile(path_or_id):
            config_path = path_or_id
        else:
            from huggingface_hub import hf_hub_download
            config_path = hf_hub_download(path_or_id, "config.json")
        with open(config_path) as f:
            d = json.load(f)
        return cls(**{k: v for k, v in d.items() if k in cls.__dataclass_fields__})


# Per-module configs with their label sets

SCORE_CONFIG = SalesCueConfig(
    module_name="score",
    labels=["hot", "warm", "cold", "disqualified"],
    architectures=["LeadScorer", "MultiScaleSignalDetector", "SignalInteractionGraph", "LearnedInterventionAttribution", "CategoryHead"],
)

INTENT_CONFIG = SalesCueConfig(
    module_name="intent",
    labels=["unaware", "aware", "researching", "evaluating", "committed", "purchasing"],
    architectures=["NeuralHawkesIntentPredictor"],
)

REPLY_CONFIG = SalesCueConfig(
    module_name="reply",
    labels=[
        "genuinely_interested", "politely_acknowledging", "objection",
        "not_now", "unsubscribe", "out_of_office", "bounce",
        "meeting_request", "referral", "negative_sentiment",
    ],
    architectures=["ReplyHead"],
)

TRIGGERS_CONFIG = SalesCueConfig(
    module_name="triggers",
    labels=[
        "new_funding", "job_change", "expansion", "layoff_restructure",
        "acquisition_merger", "new_product_launch", "leadership_change",
        "hiring_surge", "technology_adoption", "active_vendor_evaluation",
    ],
    architectures=["TemporalDisplacementModel"],
)

ICP_CONFIG = SalesCueConfig(
    module_name="icp",
    labels=["industry", "size", "tech", "role", "signal"],
    architectures=["WassersteinICPMatcher"],
)

OBJECTION_CONFIG = SalesCueConfig(
    module_name="objection",
    labels=[
        "price_too_high", "no_budget", "not_the_right_time",
        "need_to_think", "happy_with_current", "no_authority",
        "too_complex", "dont_see_value", "bad_experience",
        "need_more_info", "feature_missing", "contract_locked",
    ],
    architectures=["ObjectionPreClassifier"],
)

SENTIMENT_CONFIG = SalesCueConfig(
    module_name="sentiment",
    labels=[
        "enthusiastic", "positive_engaged", "neutral_professional",
        "cautious_interest", "polite_decline", "frustrated_objection", "hostile_rejection",
    ],
    architectures=["DisentangledSentimentIntentHead"],
)

SPAM_CONFIG = SalesCueConfig(
    module_name="spam",
    labels=[
        "clean", "template_spam", "ai_generated", "low_effort",
        "role_account", "domain_suspect", "content_violation",
    ],
    architectures=["SpamHead"],
)

ENTITIES_CONFIG = SalesCueConfig(
    module_name="entities",
    labels=["person", "company", "product", "role", "location", "technology"],
    architectures=["EntityExtractor"],
)

CALL_CONFIG = SalesCueConfig(
    module_name="call",
    labels=["follow_up", "send_proposal", "escalate", "nurture", "close"],
    architectures=["ConversationNeuralProcess"],
)

SUBJECT_CONFIG = SalesCueConfig(
    module_name="subject",
    architectures=["ContextualBradleyTerry"],
)

EMAILGEN_CONFIG = SalesCueConfig(
    module_name="emailgen",
    architectures=["EmailGenerator"],
    backbone="Qwen/Qwen2.5-3B-Instruct",
)

ALL_CONFIGS = {
    "score": SCORE_CONFIG,
    "intent": INTENT_CONFIG,
    "reply": REPLY_CONFIG,
    "triggers": TRIGGERS_CONFIG,
    "icp": ICP_CONFIG,
    "objection": OBJECTION_CONFIG,
    "sentiment": SENTIMENT_CONFIG,
    "spam": SPAM_CONFIG,
    "entities": ENTITIES_CONFIG,
    "call": CALL_CONFIG,
    "subject": SUBJECT_CONFIG,
    "emailgen": EMAILGEN_CONFIG,
}
