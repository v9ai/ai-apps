"""closingtime/modules/call.py — Conditional Neural Process for Conversation Scoring

Research contribution: Call scoring has a fundamental data scarcity problem (~500 annotated
calls). We treat each call as a *task* in a meta-learning framework. The model learns a
scoring function that adapts to new call patterns from just a few examples. This is a
*conditional neural process* (Garnelo et al., 2018) adapted for conversation scoring.
"""

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule
from ..backbone import SharedEncoder, get_device


class CommitmentDetector:
    """Rule-based commitment extraction from conversation turns."""

    COMMITMENT_PATTERNS = {
        "verbal_agreement": ["yes", "absolutely", "definitely", "let's do it", "sounds good",
                             "i agree", "that works", "we're in"],
        "next_step": ["send me", "send over", "set up", "schedule", "book", "arrange",
                      "follow up", "next step"],
        "timeline": ["by monday", "this week", "next week", "end of month", "by friday",
                     "tomorrow", "asap"],
        "stakeholder": ["talk to my", "check with", "run it by", "get approval",
                        "bring in", "loop in"],
    }

    def process(self, transcript):
        commitments = []
        for turn_idx, turn in enumerate(transcript):
            text_lower = turn["text"].lower()
            for ctype, patterns in self.COMMITMENT_PATTERNS.items():
                for p in patterns:
                    if p in text_lower:
                        commitments.append({
                            "type": ctype,
                            "turn": turn_idx,
                            "speaker": turn["speaker"],
                            "pattern": p,
                        })
                        break  # one match per type per turn
        return commitments


class ConversationNeuralProcess(BaseModule):
    """
    A Conditional Neural Process (CNP) for call scoring.

    Key insight: instead of learning ONE scoring function from 500 calls,
    learn a META scoring function that adapts to each call type.

    At training: see many different (context, target) splits of calls.
    At inference: the "context" is the conversation so far,
                  the "target" is predicting the outcome.
    """
    name = "call"
    description = "Conditional neural process for conversation scoring"

    def __init__(self, hidden=768, latent_dim=128, local_window=8):
        super().__init__()
        self.local_window = local_window

        # turn encoder
        self.speaker_embed = nn.Embedding(2, 32)
        self.turn_proj = nn.Linear(hidden + 32, hidden)

        # ENCODER: map observed (turn, outcome_signal) pairs to latent representation
        self.encoder_xy = nn.Sequential(
            nn.Linear(hidden + 1, 256),
            nn.GELU(),
            nn.Linear(256, latent_dim),
        )

        # AGGREGATOR: permutation-invariant aggregation via multi-head attention
        self.aggregator = nn.MultiheadAttention(
            embed_dim=latent_dim, num_heads=4, batch_first=True)

        # DECODER: predict outcome for target turns given latent representation
        self.decoder = nn.Sequential(
            nn.Linear(hidden + latent_dim, 256),
            nn.GELU(),
            nn.Linear(256, 128),
            nn.GELU(),
        )

        # output heads
        self.conversion_mu = nn.Linear(128, 1)
        self.conversion_sigma = nn.Linear(128, 1)
        self.momentum_head = nn.Linear(128, 3)
        self.turning_point_head = nn.Linear(256, 1)  # from consecutive pairs
        self.action_head = nn.Linear(128, 5)

        self.commitment_detector = CommitmentDetector()

        self.actions = ["follow_up", "send_proposal", "escalate", "nurture", "close"]

    def encode_context(self, turn_embeds, conversion_signals):
        """
        Encode observed (turn, signal) pairs into a latent representation.

        turn_embeds: (n_context, hidden)
        conversion_signals: (n_context, 1)
        """
        xy = torch.cat([turn_embeds, conversion_signals], dim=-1)
        encoded = self.encoder_xy(xy)  # (n_context, latent_dim)

        encoded = encoded.unsqueeze(0)  # (1, n_context, latent_dim)
        aggregated, _ = self.aggregator(encoded, encoded, encoded)

        r = aggregated.mean(dim=1)  # (1, latent_dim)
        return r

    def decode_target(self, target_embeds, context_repr):
        """
        Predict outcomes for target turns given the latent context.
        """
        context_expanded = context_repr.expand(target_embeds.shape[0], -1)

        decoder_input = torch.cat([target_embeds, context_expanded], dim=-1)
        h = self.decoder(decoder_input)

        mu = self.conversion_mu(h).sigmoid()
        sigma = F.softplus(self.conversion_sigma(h)) + 0.01

        return mu, sigma

    def forward(self, transcript, **kwargs):
        """Accept a transcript (list of turn dicts with 'text' and 'speaker')."""
        from ..validation import validate_transcript
        transcript = validate_transcript(transcript)
        return self.analyze(transcript)

    def process(self, encoded, text, **kwargs):
        raise NotImplementedError(
            "ConversationNeuralProcess requires a transcript. "
            "Use module(transcript) directly."
        )

    def analyze(self, transcript):
        encoder, tokenizer = SharedEncoder.load()
        device = get_device()

        # encode all turns
        tokens = tokenizer(
            [t["text"] for t in transcript],
            return_tensors="pt",
            truncation=True,
            max_length=128,
            padding=True,
        ).to(device)
        speakers = torch.tensor(
            [0 if t["speaker"] == "customer" else 1 for t in transcript]
        ).to(device)

        with torch.no_grad():
            enc = encoder(**tokens)

        cls = enc.last_hidden_state[:, 0]
        s_emb = self.speaker_embed(speakers)
        turn_embeds = self.turn_proj(torch.cat([cls, s_emb], dim=-1))

        n = len(transcript)

        # use first 80% as context, predict on all turns
        n_context = max(2, int(n * 0.8))
        context_turns = turn_embeds[:n_context]

        # heuristic conversion signals for context turns
        context_signals = torch.zeros(n_context, 1).to(turn_embeds.device)
        for i in range(n_context):
            text = transcript[i]["text"].lower()
            positive_words = sum(
                1 for w in ["great", "interesting", "yes", "absolutely",
                            "definitely", "love", "perfect", "agree"]
                if w in text
            )
            negative_words = sum(
                1 for w in ["no", "not", "can't", "don't", "won't",
                            "concerned", "worried", "expensive"]
                if w in text
            )
            context_signals[i] = 1.0 if positive_words > negative_words else 0.0

        context_repr = self.encode_context(context_turns, context_signals)

        mu, sigma = self.decode_target(turn_embeds, context_repr)

        turn_scores = mu.squeeze(-1)
        uncertainties = sigma.squeeze(-1)

        # turning points
        turning_points = []
        for i in range(1, n):
            pair = torch.cat([turn_embeds[i - 1], turn_embeds[i]])
            tp_score = self.turning_point_head(pair.unsqueeze(0)).sigmoid().item()

            if tp_score > 0.5:
                delta = turn_scores[i] - turn_scores[i - 1]
                turning_points.append({
                    "turn": i,
                    "probability": round(tp_score, 3),
                    "direction": "positive" if delta > 0 else "negative",
                    "delta": round(delta.item(), 3),
                    "uncertainty": round(uncertainties[i].item(), 3),
                    "speaker": transcript[i]["speaker"],
                })

        # compute final hidden state once
        h_final = self.decoder(torch.cat([
            turn_embeds[-1], context_repr.squeeze(0)]))

        # momentum
        if n > 2:
            mom = self.momentum_head(h_final.unsqueeze(0))
            momentum = ["accelerating", "stable", "decelerating"][mom.argmax(-1).item()]
        else:
            momentum = "stable"

        commitments = self.commitment_detector.process(transcript)

        # action
        action = self.actions[self.action_head(h_final.unsqueeze(0)).argmax(-1).item()]

        return {
            "deal_health": round(turn_scores[-1].item() * 100),
            "turn_scores": [round(s.item(), 3) for s in turn_scores],
            "turn_uncertainties": [round(u.item(), 3) for u in uncertainties],
            "momentum": momentum,
            "turning_points": sorted(turning_points, key=lambda x: -x["probability"])[:3],
            "commitments": commitments,
            "action": action,
            "model_confidence": round(1.0 - uncertainties[-1].item(), 3),
        }

    def compute_loss(self, context_turns, context_signals, target_turns, target_outcomes):
        """
        Meta-learning training: sample different context/target splits per call.
        Loss is NLL of the predicted distribution at target turns.
        """
        context_repr = self.encode_context(context_turns, context_signals)
        mu, sigma = self.decode_target(target_turns, context_repr)

        # Gaussian NLL
        nll = 0.5 * ((target_outcomes - mu) / sigma) ** 2 + sigma.log()

        return nll.mean()
