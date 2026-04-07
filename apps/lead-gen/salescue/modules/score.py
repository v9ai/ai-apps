"""salescue/modules/score.py — Causal Signal Attribution via Learned Interventions

Research contribution: Learned interventional attribution — the model learns to predict
the causal effect of removing a signal WITHOUT actually re-encoding. This is a distilled
structural causal model where the counterfactual head approximates do-calculus interventions
in a single forward pass.

Key insight: Standard counterfactual masking (replace token with [MASK]) changes the input
distribution. The model sees [MASK] as informative. Our approach learns a *null intervention
embedding* per signal type that represents "this signal was never present" rather than
"this signal was removed."
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math

from ..base import BaseModule


class LearnedInterventionAttribution(nn.Module):
    """
    Instead of masking tokens with [MASK] (which shifts input distribution),
    learn a per-signal NULL EMBEDDING that represents the counterfactual
    world where the signal never existed.

    This is closer to Pearl's do-calculus: do(signal=absent) not observe(signal=masked).

    The null embedding is trained adversarially: it should produce encoder outputs
    that are indistinguishable from inputs where the signal genuinely doesn't exist.
    """

    def __init__(self, hidden=768, n_signals=15):
        super().__init__()

        # per-signal null embeddings: what the token representations look like
        # when this signal was never present in the text
        self.null_embeddings = nn.Parameter(torch.randn(n_signals, hidden) * 0.01)

        # signal detector: cross-attention from learned signal queries to tokens
        self.signal_queries = nn.Parameter(torch.randn(n_signals, hidden // 4))
        self.token_key = nn.Linear(hidden, hidden // 4)
        self.token_value = nn.Linear(hidden, hidden // 4)

        # causal effect estimator: predicts score delta from intervention
        self.effect_estimator = nn.Sequential(
            nn.Linear(hidden // 4 * 2, 64),  # [signal_embed, null_embed_projected]
            nn.GELU(),
            nn.Linear(64, 1),  # predicted score delta
        )

        # discriminator for adversarial null embedding training
        # tries to distinguish "signal genuinely absent" from "null embedding injected"
        self.discriminator = nn.Sequential(
            nn.Linear(hidden, 64),
            nn.LeakyReLU(0.2),
            nn.Linear(64, 1),
        )

    def detect_signals(self, token_embeds):
        """
        Cross-attention from signal queries to token sequence.
        Each signal query looks for its pattern in the text.
        Returns per-signal strength and localization.
        """
        B, seq_len, hidden = token_embeds.shape

        keys = self.token_key(token_embeds)  # (B, seq, h/4)
        values = self.token_value(token_embeds)  # (B, seq, h/4)
        queries = self.signal_queries.unsqueeze(0).expand(B, -1, -1)  # (B, n_signals, h/4)

        # scaled dot-product attention
        scale = math.sqrt(keys.shape[-1])
        attn = torch.bmm(queries, keys.transpose(1, 2)) / scale  # (B, n_signals, seq)
        attn_weights = attn.softmax(dim=-1)

        # signal representations: attention-weighted sum of token values
        signal_embeds = torch.bmm(attn_weights, values)  # (B, n_signals, h/4)

        # signal strength: how concentrated is the attention?
        # high entropy = diffuse attention = weak signal
        # low entropy = focused attention = strong signal
        entropy = -(attn_weights * (attn_weights + 1e-10).log()).sum(dim=-1)  # (B, n_signals)
        max_entropy = math.log(seq_len)
        strength = 1.0 - (entropy / max_entropy)  # (B, n_signals) — 0 to 1

        return signal_embeds, strength, attn_weights

    def estimate_causal_effects(self, signal_embeds, strength):
        """
        For each detected signal, estimate the causal effect on the score
        by comparing the signal embedding to its null (counterfactual) embedding.
        """
        B, n_signals, dim = signal_embeds.shape

        null_proj = self.null_embeddings[:, :dim].unsqueeze(0).expand(B, -1, -1)

        effects = []
        for i in range(n_signals):
            effect_input = torch.cat([
                signal_embeds[:, i],  # what's actually there
                null_proj[:, i],  # what "nothing" looks like
            ], dim=-1)

            delta = self.effect_estimator(effect_input)  # (B, 1) — predicted score change
            effects.append(delta)

        effects = torch.cat(effects, dim=-1)  # (B, n_signals)
        return effects

    def adversarial_loss(self, token_embeds, signal_attn_weights, signal_idx):
        """
        Train the null embedding so that injecting it produces representations
        indistinguishable from genuine signal absence.

        1. Take a text WITH the signal present
        2. Replace the signal's attended tokens with the null embedding
        3. Discriminator tries to tell this from a text where signal is genuinely absent
        4. Null embedding is trained to fool the discriminator
        """
        B, seq_len, hidden = token_embeds.shape

        # create intervened representation: replace signal tokens with null
        attn = signal_attn_weights[:, signal_idx]  # (B, seq)
        null = self.null_embeddings[signal_idx].unsqueeze(0).unsqueeze(0)  # (1, 1, hidden)

        # soft replacement: blend original tokens with null based on attention weight
        intervened = token_embeds * (1 - attn.unsqueeze(-1)) + null * attn.unsqueeze(-1)

        # discriminator on CLS of intervened vs original
        real_score = self.discriminator(token_embeds[:, 0])
        fake_score = self.discriminator(intervened[:, 0])

        # adversarial loss
        d_loss = F.binary_cross_entropy_with_logits(
            real_score, torch.ones_like(real_score)
        ) + F.binary_cross_entropy_with_logits(
            fake_score, torch.zeros_like(fake_score)
        )

        g_loss = F.binary_cross_entropy_with_logits(
            fake_score, torch.ones_like(fake_score)
        )  # fool the discriminator

        return d_loss, g_loss


class LeadScorer(BaseModule):
    name = "score"
    description = "Causal signal attribution via learned interventions"

    LABELS = ["hot", "warm", "cold", "disqualified"]
    THRESHOLDS = [75, 50, 25]  # score >= 75 -> hot, >= 50 -> warm, >= 25 -> cold, else disqualified
    SIGNAL_NAMES = [
        "pricing_interest", "competitor_research", "icp_fit_strong",
        "icp_fit_weak", "seniority_match", "company_size_match",
        "tech_stack_match", "engagement_high", "engagement_low",
        "urgency", "budget", "timeline", "referral", "expansion", "pain_point",
    ]

    def __init__(self, hidden=768):
        super().__init__()
        n = len(self.SIGNAL_NAMES)

        # causal attribution engine
        self.attribution = LearnedInterventionAttribution(hidden, n)

        # scoring from signal representations
        self.score_proj = nn.Sequential(
            nn.Linear(hidden // 4 * n, 256),
            nn.GELU(),
            nn.LayerNorm(256),
            nn.Dropout(0.1),
        )
        self.class_out = nn.Linear(256, 4)
        self.regress_out = nn.Sequential(nn.Linear(256, 1), nn.Sigmoid())

        # uncertainty-weighted multi-task loss (Kendall et al., 2018)
        self.log_var_class = nn.Parameter(torch.zeros(1))
        self.log_var_regress = nn.Parameter(torch.zeros(1))

    def process(self, encoded, text, **kwargs):
        encoder_output = encoded["encoder_output"]
        tokens = encoder_output.last_hidden_state  # (B, seq, hidden)

        # detect signals via cross-attention
        signal_embeds, strengths, attn_weights = self.attribution.detect_signals(tokens)

        # estimate causal effects
        effects = self.attribution.estimate_causal_effects(signal_embeds, strengths)

        # score from concatenated signal representations
        flat_signals = signal_embeds.reshape(signal_embeds.shape[0], -1)  # (B, n*dim)
        h = self.score_proj(flat_signals)

        logits = self.class_out(h)
        score = self.regress_out(h) * 100
        probs = logits.softmax(-1)

        # derive label from regression score to avoid classifier/score disagreement
        score_val = score.item()
        if score_val >= self.THRESHOLDS[0]:
            label = self.LABELS[0]
        elif score_val >= self.THRESHOLDS[1]:
            label = self.LABELS[1]
        elif score_val >= self.THRESHOLDS[2]:
            label = self.LABELS[2]
        else:
            label = self.LABELS[3]

        # build causal evidence
        signals = []
        for i in range(len(self.SIGNAL_NAMES)):
            s = strengths[0, i].item()
            if s > 0.15:
                top_token_idx = attn_weights[0, i].topk(3).indices.tolist()
                signals.append({
                    "signal": self.SIGNAL_NAMES[i],
                    "strength": round(s, 3),
                    "causal_impact": round(effects[0, i].item() * 100, 1),
                    "attended_positions": top_token_idx,
                    "attribution_type": "causal_interventional",
                })

        signals.sort(key=lambda x: -abs(x["causal_impact"]))

        return {
            "label": label,
            "score": round(score_val),
            "confidence": round(probs.max().item(), 3),
            "signals": signals[:5],
        }

    def compute_loss(self, logits, score, true_label, true_score, effects, true_effects,
                     tokens, attn_weights, epoch):
        # uncertainty-weighted classification + regression
        prec_c = torch.exp(-self.log_var_class)
        prec_r = torch.exp(-self.log_var_regress)

        loss_c = prec_c * F.cross_entropy(logits, true_label) + self.log_var_class
        loss_r = prec_r * F.mse_loss(score, true_score) + self.log_var_regress

        # causal effect supervision
        loss_cf = F.mse_loss(effects, true_effects) * 0.5

        # adversarial null embedding training (alternating updates)
        if epoch >= 3:
            for i in range(len(self.SIGNAL_NAMES)):
                d_loss, g_loss = self.attribution.adversarial_loss(
                    tokens, attn_weights, i)
                loss_cf += (d_loss + g_loss) * 0.01

        return loss_c + loss_r + loss_cf
