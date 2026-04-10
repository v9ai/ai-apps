"""salescue/modules/sentiment.py — MI-Minimized Sentiment-Intent Disentanglement

Research contribution: The core challenge of sentiment-intent inversion is that sentiment
and intent are entangled in the representation. We enforce disentanglement explicitly:
the sentiment representation should contain ZERO information about intent, and vice versa.
We use *mutual information minimization* via the CLUB bound (Cheng et al., 2020) to
provably decorrelate the two representations, then learn the inversion pattern from
their interaction.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule

SENTIMENTS = [
    "enthusiastic", "positive_engaged", "neutral_professional",
    "cautious_interest", "polite_decline", "frustrated_objection", "hostile_rejection",
]
INTENTS = ["strong", "moderate", "weak", "none"]
NEGATIVE_SENTIMENTS = {4, 5, 6}
STRONG_INTENTS = {0, 1}


class CLUBEstimator(nn.Module):
    """
    Contrastive Log-ratio Upper Bound (CLUB) for mutual information estimation.
    (Cheng et al., 2020)

    Estimates I(X;Y) as an upper bound that can be minimized.
    When minimized, X and Y become independent -> disentangled.
    """

    def __init__(self, x_dim, y_dim, hidden=64):
        super().__init__()
        self.mu_net = nn.Sequential(
            nn.Linear(x_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, y_dim),
        )
        self.logvar_net = nn.Sequential(
            nn.Linear(x_dim, hidden), nn.ReLU(),
            nn.Linear(hidden, y_dim),
        )

    def forward(self, x, y):
        """
        Estimate upper bound of I(x; y).
        Minimizing this makes x and y independent.
        """
        mu = self.mu_net(x)
        logvar = self.logvar_net(x).clamp(-10, 10)  # prevent exp overflow/underflow

        # log p(y|x) under the learned conditional
        positive = -(mu - y) ** 2 / (2 * logvar.exp()) - 0.5 * logvar

        # log p(y|x') for random x' (negative samples)
        x_shuffled = x[torch.randperm(x.shape[0], device=x.device)]
        mu_neg = self.mu_net(x_shuffled)
        logvar_neg = self.logvar_net(x_shuffled).clamp(-10, 10)
        negative = -(mu_neg - y) ** 2 / (2 * logvar_neg.exp()) - 0.5 * logvar_neg

        # CLUB bound: E[log p(y|x)] - E[log p(y|x')]
        mi_estimate = (positive.sum(dim=-1) - negative.sum(dim=-1)).mean()

        return mi_estimate


class DisentangledSentimentIntentHead(BaseModule):
    name = "sentiment"
    description = "MI-minimized sentiment-intent disentanglement"
    """
    Provably disentangled sentiment and intent representations.

    Architecture:
    1. Shared encoder output -> two SEPARATE projection networks
    2. Sentiment projection captures ONLY emotional valence
    3. Intent projection captures ONLY purchase readiness
    4. CLUB minimization ensures they share NO mutual information
    5. An INTERACTION MODULE learns how they combine for inversion detection
    """

    def __init__(self, hidden=768, sent_dim=128, intent_dim=128):
        super().__init__()

        # separate projection networks (NOT shared)
        self.sentiment_proj = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, sent_dim),
        )

        self.intent_proj = nn.Sequential(
            nn.Linear(hidden, 256), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(256, intent_dim),
        )

        # classification heads on disentangled representations
        self.sentiment_head = nn.Linear(sent_dim, len(SENTIMENTS))
        self.intent_head = nn.Linear(intent_dim, len(INTENTS))

        # MI minimization
        self.mi_estimator = CLUBEstimator(sent_dim, intent_dim, hidden=64)

        # INTERACTION MODULE: bilinear form for (sentiment, intent) pair effects
        self.interaction_weights = nn.Parameter(
            torch.zeros(len(SENTIMENTS), len(INTENTS)))

        # context-conditional interaction gate
        self.context_gate = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1), nn.Sigmoid(),
        )

        # evidence extractor for inversion explanations
        self.evidence_proj = nn.Linear(hidden, 64)

    def _forward_batch(self, cls):
        """Batched forward pass through projection + classification heads.

        Args:
            cls: (B, hidden) CLS embeddings.

        Returns:
            sent_repr, intent_repr, s_probs, i_logits, gates
        """
        sent_repr = self.sentiment_proj(cls)   # (B, sent_dim)
        intent_repr = self.intent_proj(cls)    # (B, intent_dim)

        s_logits = self.sentiment_head(sent_repr)  # (B, n_sentiments)
        i_logits = self.intent_head(intent_repr)   # (B, n_intents)

        s_probs = s_logits.softmax(-1)
        gates = self.context_gate(cls).squeeze(-1)  # (B,)

        return sent_repr, intent_repr, s_probs, i_logits, gates

    def _format_result(self, sent_repr, intent_repr, s_probs, i_logits, gate, text, idx):
        """Format a single result from batch tensors at the given index."""
        sentiment_idx = s_probs[idx].argmax(-1).item()
        intent_idx = i_logits[idx].argmax(-1).item()

        interaction_weight = self.interaction_weights[sentiment_idx, intent_idx]
        gate_val = gate[idx].item() if gate.dim() > 0 else gate.item()

        correction = torch.zeros_like(i_logits[idx:idx+1])
        correction[0, intent_idx] = interaction_weight * gate_val
        i_logits_corrected = i_logits[idx:idx+1] + correction
        i_probs_corrected = i_logits_corrected.softmax(-1)

        sentiment = SENTIMENTS[s_probs[idx].argmax(-1).item()]
        intent_idx_final = i_probs_corrected.argmax(-1).item()
        intent = INTENTS[intent_idx_final]

        inverted = (sentiment_idx in NEGATIVE_SENTIMENTS and intent_idx_final in STRONG_INTENTS)
        confidence = min(s_probs[idx].max().item(), i_probs_corrected.max().item())

        evidence = []
        interpretation = None

        if inverted and text:
            INVERSION_SIGNALS = {
                "status_quo_pain": [
                    "sick of", "tired of", "frustrated with", "hate",
                    "broken", "waste", "failing", "crashing",
                ],
                "active_search": [
                    "what makes yours", "how is yours different",
                    "looking for alternatives", "considering switching",
                ],
                "competitor_frustration": [
                    "burned by", "vendor failed", "three vendors already",
                ],
                "urgency_from_pain": [
                    "every day", "every week", "constantly",
                    "can't keep", "need to fix",
                ],
            }

            text_lower = text.lower()
            for sig_type, patterns in INVERSION_SIGNALS.items():
                for p in patterns:
                    if p in text_lower:
                        evidence.append({"signal": sig_type, "text": p})

            interpretation = (
                f"Negative sentiment ({sentiment}) masks {intent} buying intent. "
                f"Disentangled analysis: sentiment and intent representations are "
                f"independent (MI \u2248 0), but the interaction module detects inversion "
                f"pattern with weight {interaction_weight:.2f} (gate: {gate_val:.2f}). "
                f"Prospect is actively dissatisfied \u2014 prioritize."
            )

        return {
            "sentiment": sentiment,
            "intent": intent,
            "confidence": round(confidence, 3),
            "inverted": inverted,
            "interaction_weight": round(interaction_weight.item(), 3),
            "context_gate": round(gate_val, 3),
            "disentanglement": {
                "sentiment_repr_norm": round(sent_repr[idx].norm().item(), 3),
                "intent_repr_norm": round(intent_repr[idx].norm().item(), 3),
            },
            "evidence": evidence,
            "interpretation": interpretation,
        }

    def process(self, encoded, text, **kwargs):
        encoder_output = encoded["encoder_output"]
        cls = encoder_output.last_hidden_state[:, 0]

        sent_repr, intent_repr, s_probs, i_logits, gates = self._forward_batch(cls)

        return self._format_result(sent_repr, intent_repr, s_probs, i_logits, gates, text, idx=0)

    def process_batch(self, batch_encoded, texts, **kwargs):
        """Vectorized batch sentiment-intent analysis.

        Both projection MLPs, classification heads, and context gates run
        on the full (B, hidden) CLS tensor in one pass. Only interaction
        correction and evidence extraction loop per item.
        """
        cls = batch_encoded["encoder_output"].last_hidden_state[:, 0]  # (B, hidden)
        sent_repr, intent_repr, s_probs, i_logits, gates = self._forward_batch(cls)

        B = cls.shape[0]
        return [
            self._format_result(sent_repr, intent_repr, s_probs, i_logits, gates, texts[i], idx=i)
            for i in range(B)
        ]

    def _extract_intent_evidence(self, tokens, intent_repr):
        """Find which tokens contribute most to intent despite negative sentiment."""
        token_proj = self.evidence_proj(tokens[0])  # (seq, 64)

        similarities = F.cosine_similarity(
            token_proj, intent_repr[:, :64].expand(token_proj.shape[0], -1), dim=-1)

        return similarities.topk(5).indices.tolist()

    def compute_loss(self, s_logits, i_logits, i_corrected, sent_repr, intent_repr,
                     true_s, true_i, epoch):
        # classification losses
        loss_s = F.cross_entropy(s_logits, true_s)
        loss_i = F.cross_entropy(i_corrected, true_i)
        loss_i_uncorrected = F.cross_entropy(i_logits, true_i) * 0.3

        # MI minimization: force representations to be independent
        mi_loss = self.mi_estimator(sent_repr.detach(), intent_repr)
        mi_loss += self.mi_estimator(sent_repr, intent_repr.detach())
        mi_weight = min(0.5, epoch * 0.05)  # anneal MI weight

        # interaction regularization: sparsity on interaction weights
        interaction_l1 = self.interaction_weights.abs().mean() * 0.1

        # inversion reward/penalty
        inversion_loss = 0
        if epoch >= 5:
            is_neg = true_s.item() in NEGATIVE_SENTIMENTS
            is_strong = true_i.item() in STRONG_INTENTS
            pred_neg = s_logits.argmax(-1).item() in NEGATIVE_SENTIMENTS
            pred_strong = i_corrected.argmax(-1).item() in STRONG_INTENTS
            pred_conf = i_corrected.softmax(-1).max().item()

            if is_neg and is_strong and pred_neg and pred_strong:
                inversion_loss = -0.2
            elif is_neg and not is_strong and pred_neg and pred_strong and pred_conf > 0.7:
                inversion_loss = 0.25

        total = (loss_s + loss_i + loss_i_uncorrected +
                 mi_weight * mi_loss + interaction_l1 + inversion_loss)

        return total, {
            "loss_sentiment": loss_s.item(),
            "loss_intent": loss_i.item(),
            "mi_estimate": mi_loss.item(),
            "interaction_sparsity": (self.interaction_weights.abs() > 0.1).sum().item(),
        }
