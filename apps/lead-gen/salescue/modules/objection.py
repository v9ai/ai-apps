"""salescue/modules/objection.py — 3-Way Pre-classifier + Coaching Cards

Research contribution: Most objection handling treats all objections the same.
We first classify into genuine_objection / stall / misunderstanding using a
3-way pre-classifier, then route each to specialized handling. Each objection
type gets a coaching card with a recommended response framework.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Any

from ..base import BaseModule


OBJECTION_CATEGORIES = ["genuine_objection", "stall", "misunderstanding"]

OBJECTION_TYPES = [
    "price_too_high", "no_budget", "not_the_right_time",
    "need_to_think", "happy_with_current", "no_authority",
    "too_complex", "dont_see_value", "bad_experience",
    "need_more_info", "feature_missing", "contract_locked",
]

# Coaching card templates for each objection type
COACHING_CARDS: dict[str, dict[str, Any]] = {
    "price_too_high": {
        "framework": "value_reframe",
        "steps": [
            "Acknowledge the concern directly",
            "Ask what they're comparing against",
            "Quantify the cost of NOT solving their problem",
            "Break down ROI over their timeline",
        ],
        "avoid": ["Immediately offering a discount", "Being defensive about pricing"],
        "example": "I hear you on price. Out of curiosity, what's the current cost "
                   "of [problem] to your team each month?",
    },
    "no_budget": {
        "framework": "budget_creation",
        "steps": [
            "Distinguish 'no budget' from 'not a priority'",
            "Ask about their budget cycle and planning timeline",
            "Explore if there's budget in a different department",
            "Offer phased implementation to reduce initial cost",
        ],
        "avoid": ["Accepting 'no budget' at face value", "Pushing for immediate commitment"],
        "example": "When does your next budget cycle start? We could map out an "
                   "implementation that aligns with your planning.",
    },
    "not_the_right_time": {
        "framework": "urgency_creation",
        "steps": [
            "Understand what makes NOW not right",
            "Quantify the cost of delay",
            "Identify if there's a trigger event coming",
            "Propose a low-commitment next step",
        ],
        "avoid": ["Being pushy about timing", "Ignoring their timeline constraints"],
        "example": "What would need to change for the timing to feel right?",
    },
    "need_to_think": {
        "framework": "specificity",
        "steps": [
            "Ask what specifically they need to think about",
            "Identify unaddressed concerns",
            "Offer to provide additional information",
            "Set a specific follow-up time",
        ],
        "avoid": ["Saying 'take your time'", "Not setting a follow-up"],
        "example": "Absolutely. What specific aspects are you weighing? I can "
                   "send over some info that might help.",
    },
    "happy_with_current": {
        "framework": "status_quo_challenge",
        "steps": [
            "Acknowledge their current solution's strengths",
            "Ask about gaps or pain points they've accepted",
            "Share relevant competitive intelligence",
            "Offer a side-by-side comparison",
        ],
        "avoid": ["Bashing competitors", "Assuming their current solution is bad"],
        "example": "Good to hear that's working. Most of our customers felt the "
                   "same way until they realized [specific gap]. Have you run into that?",
    },
    "no_authority": {
        "framework": "champion_building",
        "steps": [
            "Ask who the decision maker is",
            "Understand the buying process and stakeholders",
            "Equip them with materials to present internally",
            "Offer to join a call with the decision maker",
        ],
        "avoid": ["Going over their head", "Dismissing their role"],
        "example": "Who else would need to weigh in? I can put together a brief "
                   "that makes it easy to share with your team.",
    },
    "too_complex": {
        "framework": "simplification",
        "steps": [
            "Ask what feels complex specifically",
            "Break the solution into phases",
            "Offer implementation support details",
            "Share a success story with a similar company",
        ],
        "avoid": ["Oversimplifying genuine concerns", "Adding more features to the pitch"],
        "example": "Fair point. Most teams start with just [core feature] and "
                   "expand from there. Our onboarding team handles the heavy lifting.",
    },
    "dont_see_value": {
        "framework": "value_quantification",
        "steps": [
            "Ask about their current process and costs",
            "Identify specific metrics they care about",
            "Map your solution to their KPIs",
            "Share quantified results from similar customers",
        ],
        "avoid": ["Listing features", "Generic ROI claims"],
        "example": "What metrics does your team track most closely? Let me show "
                   "you how we move the needle on those specifically.",
    },
    "bad_experience": {
        "framework": "empathy_rebuild",
        "steps": [
            "Acknowledge their experience without blame",
            "Ask what went wrong specifically",
            "Explain how you're different",
            "Offer a low-risk trial or pilot",
        ],
        "avoid": ["Dismissing their experience", "Blaming the previous vendor"],
        "example": "That sounds frustrating. What specifically didn't work? "
                   "I want to make sure we address those exact issues.",
    },
    "need_more_info": {
        "framework": "targeted_education",
        "steps": [
            "Ask what specific information they need",
            "Provide relevant case studies",
            "Offer a demo or trial focused on their use case",
            "Schedule a technical deep-dive if needed",
        ],
        "avoid": ["Sending a generic info dump", "Treating this as a rejection"],
        "example": "Happy to help. What specifically would be most useful — "
                   "technical specs, customer stories, or a focused demo?",
    },
    "feature_missing": {
        "framework": "roadmap_bridge",
        "steps": [
            "Understand why the feature matters to them",
            "Check if there's a workaround",
            "Share roadmap if the feature is planned",
            "Evaluate if it's a true dealbreaker vs nice-to-have",
        ],
        "avoid": ["Promising features you can't deliver", "Dismissing the need"],
        "example": "Good to know that's important. Can you walk me through how "
                   "you'd use it? There might be a way to get that result today.",
    },
    "contract_locked": {
        "framework": "future_planning",
        "steps": [
            "Ask when the contract expires",
            "Set up a reminder for renewal period",
            "Keep providing value in the meantime",
            "Understand their satisfaction with current vendor",
        ],
        "avoid": ["Suggesting they break their contract", "Disappearing until renewal"],
        "example": "When does your current agreement come up for renewal? I'd love "
                   "to have a conversation closer to that date.",
    },
}


class ObjectionPreClassifier(BaseModule):
    name = "objection"
    description = "3-way objection pre-classifier with coaching cards"
    """3-way pre-classifier: genuine objection, stall, or misunderstanding.

    This distinction is critical because each category requires a completely
    different response strategy:
    - Genuine objection: Address directly with the appropriate framework
    - Stall: Probe for the real concern underneath
    - Misunderstanding: Clarify and re-educate
    """

    def __init__(self, hidden: int = 768):
        super().__init__()

        self.category_head = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, len(OBJECTION_CATEGORIES)),
        )

        # objection type classifier (for genuine objections)
        self.type_head = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, len(OBJECTION_TYPES)),
        )

        # severity estimator
        self.severity_head = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1), nn.Sigmoid(),
        )

    def _forward_batch(self, cls):
        """Batched forward pass through all heads.

        Args:
            cls: (B, hidden) CLS embeddings.

        Returns:
            cat_probs: (B, n_categories)
            type_probs: (B, n_types)
            severities: (B, 1)
        """
        cat_logits = self.category_head(cls)       # (B, n_categories)
        cat_probs = cat_logits.softmax(dim=-1)

        type_logits = self.type_head(cls)          # (B, n_types)
        type_probs = type_logits.softmax(dim=-1)

        severities = self.severity_head(cls)       # (B, 1)

        return cat_probs, type_probs, severities

    def _format_result(self, cat_probs, type_probs, severities, idx):
        """Format a single result from batch tensors at the given index."""
        category_idx = cat_probs[idx].argmax(dim=-1).item()
        category = OBJECTION_CATEGORIES[category_idx]

        type_idx = type_probs[idx].argmax(dim=-1).item()
        objection_type = OBJECTION_TYPES[type_idx]

        severity = severities[idx].item()
        card = COACHING_CARDS.get(objection_type, {})

        return {
            "category": category,
            "category_confidence": round(cat_probs[idx, category_idx].item(), 3),
            "category_distribution": {
                c: round(cat_probs[idx, i].item(), 3)
                for i, c in enumerate(OBJECTION_CATEGORIES)
            },
            "objection_type": objection_type,
            "type_confidence": round(type_probs[idx, type_idx].item(), 3),
            "severity": round(severity, 3),
            "coaching": card,
            "top_types": [
                {"type": OBJECTION_TYPES[i], "score": round(type_probs[idx, i].item(), 3)}
                for i in type_probs[idx].topk(3).indices.tolist()
            ],
        }

    def process(self, encoded, text, **kwargs):
        encoder_output = encoded["encoder_output"]
        cls = encoder_output.last_hidden_state[:, 0]

        cat_probs, type_probs, severities = self._forward_batch(cls)

        return self._format_result(cat_probs, type_probs, severities, idx=0)

    def process_batch(self, batch_encoded, texts, **kwargs):
        """Vectorized batch objection classification.

        All three heads (category, type, severity) run on the full
        (B, hidden) CLS tensor in one pass.
        """
        cls = batch_encoded["encoder_output"].last_hidden_state[:, 0]
        cat_probs, type_probs, severities = self._forward_batch(cls)

        B = cls.shape[0]
        return [
            self._format_result(cat_probs, type_probs, severities, idx=i)
            for i in range(B)
        ]

    def compute_loss(self, cat_logits, type_logits, true_category, true_type):
        loss_cat = F.cross_entropy(cat_logits, true_category)
        loss_type = F.cross_entropy(type_logits, true_type)
        return loss_cat + loss_type
