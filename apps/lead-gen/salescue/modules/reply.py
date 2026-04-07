"""salescue/modules/reply.py — Constrained CRF for Structured Reply Classification

Research contribution: Multi-label classification treats labels independently. But reply
labels have structural constraints: `unsubscribe` and `genuinely_interested` are mutually
exclusive. `referral` implies `not_now`. We enforce these via a *constrained conditional
random field* where the transition matrix encodes label co-occurrence rules.
"""

import torch
import torch.nn as nn

from ..base import BaseModule
from ..backbone import SharedEncoder

LABELS = [
    "genuinely_interested", "politely_acknowledging", "objection",
    "not_now", "unsubscribe", "out_of_office", "bounce",
    "meeting_request", "referral", "negative_sentiment",
]

# label co-occurrence constraints
# -inf = impossible, 0 = neutral, +float = encouraged
CONSTRAINT_MATRIX = {
    ("unsubscribe", "genuinely_interested"): -float("inf"),
    ("unsubscribe", "meeting_request"): -float("inf"),
    ("bounce", "genuinely_interested"): -float("inf"),
    ("bounce", "meeting_request"): -float("inf"),
    ("bounce", "referral"): -float("inf"),
    ("out_of_office", "genuinely_interested"): -float("inf"),
    ("referral", "not_now"): 2.0,
    ("objection", "genuinely_interested"): 1.0,
    ("meeting_request", "genuinely_interested"): 3.0,
}


class ConstrainedMultiLabelCRF(nn.Module):
    """
    A CRF-like model for multi-label classification with structural constraints.

    Standard multi-label: P(y1, y2, ..., yk) = prod P(yi)
    Our model: P(y1, ..., yk) = (1/Z) exp(sum psi_i(yi) + sum psi_ij(yi, yj))

    psi_i = unary potential (how likely is label i given text)
    psi_ij = pairwise potential (how compatible are labels i and j)
    """

    def __init__(self, n_labels=10):
        super().__init__()

        # pairwise compatibility: learned soft preferences
        self.pairwise = nn.Parameter(torch.zeros(n_labels, n_labels))

        # hard constraints as non-learnable buffer (gradient cannot override)
        hard_constraints = torch.zeros(n_labels, n_labels)
        for (l1, l2), value in CONSTRAINT_MATRIX.items():
            i, j = LABELS.index(l1), LABELS.index(l2)
            if value == -float("inf"):
                hard_constraints[i, j] = -1e9
                hard_constraints[j, i] = -1e9
            else:
                self.pairwise.data[i, j] = value
                self.pairwise.data[j, i] = value
        self.register_buffer('hard_constraints', hard_constraints)

    def score_configuration(self, unary_logits, label_config):
        """
        Score a specific label configuration.
        label_config: binary vector (B, n_labels) — which labels are active
        """
        # unary score
        unary = (unary_logits * label_config).sum(dim=-1)

        # pairwise score: sum of pairwise potentials for all active label pairs
        active_mask = label_config.unsqueeze(-1) * label_config.unsqueeze(-2)  # (B, n, n)
        effective_pairwise = self.pairwise + self.hard_constraints
        pairwise = (effective_pairwise.unsqueeze(0) * active_mask).sum(dim=(-1, -2)) / 2

        return unary + pairwise

    def decode(self, unary_logits, top_k=5):
        """
        Find the top-k highest scoring label configurations.
        With 10 labels, 2^10 = 1024 configurations — exact enumeration is feasible.
        Uses a pre-computed binary config buffer to avoid per-iteration tensor allocation.
        """
        n = unary_logits.shape[-1]

        if n <= 12:
            n_configs = 2 ** n
            # pre-compute all binary configurations as a single (n_configs, n) tensor
            arange = torch.arange(n_configs, device=unary_logits.device)
            bits = torch.arange(n, device=unary_logits.device)
            all_configs = ((arange.unsqueeze(1) >> bits.unsqueeze(0)) & 1).float()  # (2^n, n)

            # vectorized scoring: unary component
            unary_scores = (unary_logits * all_configs).sum(dim=-1)  # (2^n,)

            # pairwise component
            effective_pairwise = self.pairwise + self.hard_constraints
            active_masks = all_configs.unsqueeze(-1) * all_configs.unsqueeze(-2)  # (2^n, n, n)
            pairwise_scores = (effective_pairwise.unsqueeze(0) * active_masks).sum(dim=(-1, -2)) / 2

            total_scores = unary_scores + pairwise_scores  # (2^n,)

            k = min(top_k, n_configs)
            top_indices = total_scores.topk(k).indices
            return [
                (total_scores[i].item(), all_configs[i].unsqueeze(0))
                for i in top_indices
            ]

        else:
            return self._greedy_decode(unary_logits)

    def _greedy_decode(self, unary_logits):
        """Greedy fallback for large label sets."""
        n = unary_logits.shape[-1]
        config = torch.zeros(1, n).to(unary_logits.device)

        # greedily add labels that improve the score
        for _ in range(n):
            best_gain = 0
            best_idx = -1
            current_score = self.score_configuration(unary_logits, config)

            for j in range(n):
                if config[0, j] > 0:
                    continue
                trial = config.clone()
                trial[0, j] = 1.0
                trial_score = self.score_configuration(unary_logits, trial)
                gain = trial_score - current_score
                if gain > best_gain:
                    best_gain = gain
                    best_idx = j

            if best_idx < 0:
                break
            config[0, best_idx] = 1.0

        return [(self.score_configuration(unary_logits, config).item(), config)]


class ReplyHead(BaseModule):
    name = "reply"
    description = "Constrained CRF for structured reply classification"
    def __init__(self, hidden=768, n_labels=10):
        super().__init__()

        # token-level label relevance
        self.token_scorer = nn.Sequential(
            nn.Linear(hidden + 8, 256), nn.GELU(), nn.Dropout(0.15),
            nn.Linear(256, n_labels),
        )

        # span pointer per label
        self.start_pointer = nn.Linear(hidden, n_labels)
        self.end_pointer = nn.Linear(hidden, n_labels)

        # constrained CRF for label combination
        self.crf = ConstrainedMultiLabelCRF(n_labels)

        # position encoding for touchpoint context
        self.position_embed = nn.Embedding(10, 8)

    def process(self, encoded, text, **kwargs):
        encoder_output = encoded["encoder_output"]
        input_ids = encoded["input_ids"]
        _, tokenizer = SharedEncoder.load()
        touchpoint = kwargs.get("touchpoint", 0)
        tokens = encoder_output.last_hidden_state
        seq_len = tokens.shape[1]

        pos = self.position_embed(
            torch.tensor([min(touchpoint, 9)]).to(tokens.device)
        ).unsqueeze(1).expand(-1, seq_len, -1)

        # unary label scores from token relevance
        relevance = self.token_scorer(torch.cat([tokens, pos], dim=-1)).sigmoid()
        unary_logits = relevance.max(dim=1).values  # (B, n_labels) — max pool per label

        # CRF decoding: find best label configuration respecting constraints
        top_configs = self.crf.decode(unary_logits)
        best_config = top_configs[0][1]

        active = {}
        evidence = []
        for i, label in enumerate(LABELS):
            is_active = best_config[0, i].item() > 0.5
            active[label] = is_active

            if is_active:
                s_scores = self.start_pointer(tokens[0, :, :])[:, i]
                e_scores = self.end_pointer(tokens[0, :, :])[:, i]

                best_start = s_scores[1:-1].argmax().item() + 1
                valid_ends = e_scores[best_start:min(best_start + 30, seq_len - 1)]
                if len(valid_ends) > 0:
                    best_end = best_start + valid_ends.argmax().item() + 1
                    span_text = tokenizer.decode(
                        input_ids[0, best_start:best_end], skip_special_tokens=True
                    ).strip()
                    if span_text:
                        evidence.append({"label": label, "text": span_text})

        primary = max(
            [(l, unary_logits[0, i].item()) for i, l in enumerate(LABELS) if active.get(l)],
            key=lambda x: x[1],
            default=("none", 0),
        )[0]

        return {
            "active": active,
            "scores": {l: round(unary_logits[0, i].item(), 3) for i, l in enumerate(LABELS)},
            "evidence": evidence,
            "primary": primary,
            "configuration_score": round(top_configs[0][0], 3),
            "alternative_configs": len([c for c in top_configs if c[0] > top_configs[0][0] - 1.0]),
        }
