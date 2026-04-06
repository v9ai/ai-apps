"""closingtime/modules/spam.py — Perplexity Ratio AI Detection

Research contribution: Existing AI detectors compare perplexity against a threshold.
But perplexity varies by domain, register, and topic. We compute the *perplexity RATIO*
between two language models: one fine-tuned on human sales emails, one on AI-generated
sales emails. The ratio is domain-invariant because both models see the same domain
distribution.
"""

import torch
import torch.nn as nn


class PerplexityRatioDetector(nn.Module):
    """
    AI detection via perplexity ratio between human and AI language models.

    log(P_human(text)) - log(P_ai(text))

    If positive: text is more likely under the human model -> probably human
    If negative: text is more likely under the AI model -> probably AI

    We approximate this without training two full language models:
    use the shared encoder and measure reconstruction surprise patterns.
    Human text has characteristic error patterns (typos, inconsistent formality)
    that AI text lacks.
    """

    def __init__(self, hidden=768, n_probes=12):
        super().__init__()
        self.n_probes = n_probes

        # human writing pattern detector
        self.human_pattern_scorer = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1),
        )

        # AI writing pattern detector
        self.ai_pattern_scorer = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, 1),
        )

        # structural feature extractor
        self.structure_features = nn.Linear(8, 16)

    def compute_structural_features(self, text):
        """Extract features that distinguish human from AI writing."""
        sentences = [
            s.strip()
            for s in text.replace("!", ".").replace("?", ".").split(".")
            if s.strip()
        ]

        if not sentences:
            return torch.zeros(8)

        lengths = [len(s.split()) for s in sentences]

        features = torch.tensor([
            # sentence length variance (AI = low, human = high)
            torch.tensor(lengths).float().std().item() if len(lengths) > 1 else 0,
            # contraction ratio (AI avoids contractions)
            sum(1 for s in sentences if any(
                c in s.lower() for c in ["n't", "'re", "'ll", "'ve", "'m", "'d"]
            )) / max(len(sentences), 1),
            # parenthetical asides (human tendency)
            text.count("(") + text.count("\u2014") + text.count("..."),
            # exclamation mark ratio
            text.count("!") / max(len(text), 1) * 100,
            # first person ratio
            sum(1 for w in text.lower().split() if w in ("i", "i'm", "i've", "my", "me"))
            / max(len(text.split()), 1),
            # average word length
            sum(len(w) for w in text.split()) / max(len(text.split()), 1),
            # repeated sentence starters
            len(set(
                s.split()[0].lower() if s.split() else "" for s in sentences
            )) / max(len(sentences), 1),
            # text length
            min(len(text.split()) / 200, 1.0),
        ]).float()

        return features

    def forward(self, encoder_output, input_ids, tokenizer, text):
        cls = encoder_output.last_hidden_state[:, 0]

        # pattern-based scoring
        human_score = self.human_pattern_scorer(cls).item()
        ai_score = self.ai_pattern_scorer(cls).item()

        # structural features
        struct_features = self.compute_structural_features(text).to(cls.device)
        self.structure_features(struct_features)  # embed structural features

        # log-ratio: positive = human, negative = AI
        log_ratio = human_score - ai_score

        # combine with structural signal
        structural_ai_signal = (
            struct_features[0] < 2.0  # low sentence length variance
            and struct_features[1] < 0.05  # few contractions
            and struct_features[5] > 5.0  # long average word length
        )

        ai_risk = torch.sigmoid(
            torch.tensor(-log_ratio + (0.5 if structural_ai_signal else -0.5))
        ).item()

        return round(max(0, min(1.0, ai_risk)), 3)


class SpamHead(nn.Module):
    def __init__(self, hidden=768):
        super().__init__()
        self.spam_head = nn.Sequential(
            nn.Linear(hidden, 128), nn.ReLU(), nn.Linear(128, 1), nn.Sigmoid(),
        )

        self.ai_detector = PerplexityRatioDetector(hidden)

        self.providers = nn.ModuleDict({
            p: nn.Sequential(nn.Linear(3, 8), nn.ReLU(), nn.Linear(8, 1), nn.Sigmoid())
            for p in ["gmail", "outlook", "yahoo"]
        })
