"""closingtime/modules/subject.py — Contextual Bradley-Terry

Research contribution: Static pairwise comparison assumes fixed preference. But subject
line effectiveness depends on context: who you're sending to, what industry, what stage
of the relationship. We extend Bradley-Terry with *contextual features* — the comparison
model takes (subject_A, subject_B, context) and predicts the winner conditioned on the
prospect.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


class ContextualBradleyTerry(nn.Module):
    """
    Standard Bradley-Terry: P(A > B) = sigma(score(A) - score(B))
    Our extension: P(A > B | context) = sigma(score(A, context) - score(B, context))

    The context includes: prospect industry, company size,
    relationship stage (cold/warm/existing), previous open rates.

    This means the model can learn:
    - "Quick question" beats "Detailed analysis" for cold outreach
    - But "Detailed analysis" beats "Quick question" for existing customers
    """

    def __init__(self, hidden=768, context_dim=32):
        super().__init__()

        self.subject_proj = nn.Sequential(
            nn.Linear(hidden, 128), nn.GELU(), nn.Linear(128, 64),
        )

        # context encoder
        self.context_proj = nn.Linear(context_dim, 32)

        # contextual scoring: subject representation modulated by context
        self.scorer = nn.Sequential(
            nn.Linear(64 + 32, 32), nn.GELU(),
            nn.Linear(32, 1),
        )

        # context-free scorer (fallback)
        self.scorer_no_ctx = nn.Sequential(
            nn.Linear(64, 32), nn.GELU(), nn.Linear(32, 1),
        )

    def score(self, subject_embed, context=None):
        s = self.subject_proj(subject_embed)

        if context is not None:
            c = self.context_proj(context)
            return self.scorer(torch.cat([s, c], dim=-1))
        else:
            return self.scorer_no_ctx(s)

    def compare(self, embed_a, embed_b, context=None):
        score_a = self.score(embed_a, context)
        score_b = self.score(embed_b, context)
        return torch.sigmoid(score_a - score_b).item()

    def rank(self, embeds, subjects, context=None):
        scores = [self.score(e, context).item() for e in embeds]

        indexed = sorted(enumerate(scores), key=lambda x: -x[1])

        ranking = [
            {"rank": r + 1, "subject": subjects[idx], "score": round(score * 100)}
            for r, (idx, score) in enumerate(indexed)
        ]

        return {
            "ranking": ranking,
            "best": subjects[indexed[0][0]],
            "worst": subjects[indexed[-1][0]],
        }

    def compute_loss(self, embed_winner, embed_loser, context=None, margin=0.1):
        """
        Bradley-Terry loss: winner should score higher than loser with margin.
        """
        s_win = self.score(embed_winner, context)
        s_lose = self.score(embed_loser, context)

        loss = F.relu(margin - (s_win - s_lose)).mean()

        return loss
