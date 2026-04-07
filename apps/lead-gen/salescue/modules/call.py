"""salescue/modules/call.py — Conditional Neural Process for Conversation Scoring

Fixes:
- tokens/speakers moved to correct device
- Deduplicated decoder call
- n_context clamped to transcript length
- CommitmentDetector now checks negation before the verb
"""

import re
import torch
import torch.nn as nn
import torch.nn.functional as F


_NEGATION_WORDS = frozenset({
    "not", "no", "never", "don't", "doesn't", "didn't", "won't",
    "wouldn't", "can't", "cannot", "couldn't", "shouldn't", "isn't",
    "aren't", "wasn't", "weren't", "nothing", "neither",
})


class CommitmentDetector:
    """Rule-based commitment extraction with negation awareness.

    Per design spec: checks negation BEFORE the verb to distinguish
    "I will send the proposal" from "I won't send the proposal".
    """

    COMMITMENT_PATTERNS = {
        "verbal_agreement": re.compile(
            r"\b(yes|absolutely|definitely|let'?s do it|sounds good|i agree|that works|we'?re in)\b", re.I),
        "next_step": re.compile(
            r"\b(send me|send over|set up|schedule|book|arrange|follow up|next steps?)\b", re.I),
        "timeline": re.compile(
            r"\b(by monday|this week|next week|end of month|by friday|tomorrow|asap)\b", re.I),
        "stakeholder": re.compile(
            r"\b(talk to my|check with|run it by|get approval|bring in|loop in)\b", re.I),
    }

    def process(self, transcript):
        commitments = []
        for turn_idx, turn in enumerate(transcript):
            text = turn["text"]
            words = text.lower().split()
            for ctype, pattern in self.COMMITMENT_PATTERNS.items():
                match = pattern.search(text)
                if match:
                    # Check for negation in 3-word window before match
                    match_word_pos = len(text[:match.start()].split())
                    window_start = max(0, match_word_pos - 3)
                    pre_words = words[window_start:match_word_pos]
                    negated = bool(_NEGATION_WORDS & set(pre_words))

                    commitments.append({
                        "type": ctype,
                        "turn": turn_idx,
                        "speaker": turn["speaker"],
                        "pattern": match.group(),
                        "negated": negated,
                    })
        return commitments


class ConversationNeuralProcess(nn.Module):
    name = "call"
    description = "Conditional Neural Process for conversation scoring"

    def __init__(self, hidden=768, latent_dim=128, local_window=8):
        super().__init__()
        self.local_window = local_window
        self.speaker_embed = nn.Embedding(2, 32)
        self.turn_proj = nn.Linear(hidden + 32, hidden)
        self.encoder_xy = nn.Sequential(
            nn.Linear(hidden + 1, 256), nn.GELU(), nn.Linear(256, latent_dim))
        self.aggregator = nn.MultiheadAttention(
            embed_dim=latent_dim, num_heads=4, batch_first=True)
        self.decoder = nn.Sequential(
            nn.Linear(hidden + latent_dim, 256), nn.GELU(),
            nn.Linear(256, 128), nn.GELU())
        self.conversion_mu = nn.Linear(128, 1)
        self.conversion_sigma = nn.Linear(128, 1)
        self.momentum_head = nn.Linear(128, 3)
        self.turning_point_head = nn.Linear(256, 1)
        self.action_head = nn.Linear(128, 5)
        self.commitment_detector = CommitmentDetector()
        self.actions = ["follow_up", "send_proposal", "escalate", "nurture", "close"]

    def encode_context(self, turn_embeds, conversion_signals):
        xy = torch.cat([turn_embeds, conversion_signals], dim=-1)
        encoded = self.encoder_xy(xy).unsqueeze(0)
        aggregated, _ = self.aggregator(encoded, encoded, encoded)
        return aggregated.mean(dim=1)

    def decode_target(self, target_embeds, context_repr):
        context_expanded = context_repr.expand(target_embeds.shape[0], -1)
        h = self.decoder(torch.cat([target_embeds, context_expanded], dim=-1))
        mu = self.conversion_mu(h).sigmoid()
        sigma = F.softplus(self.conversion_sigma(h)) + 0.01
        return mu, sigma

    def forward(self, encoder_or_transcript, tokenizer=None, transcript=None):
        if transcript is not None:
            return self._forward_transcript(encoder_or_transcript, tokenizer, transcript)
        return {"deal_health": 50, "error": "call module requires transcript input"}

    @torch.no_grad()
    def _forward_transcript(self, encoder, tokenizer, transcript):
        from ..backbone import get_device
        device = get_device()

        tokens = tokenizer(
            [t["text"] for t in transcript],
            return_tensors="pt", truncation=True, max_length=128, padding=True,
        ).to(device)

        speakers = torch.tensor(
            [0 if t["speaker"].lower() in ("customer", "prospect", "buyer") else 1
             for t in transcript],
            device=device)

        with torch.no_grad():
            enc = encoder(**tokens)

        cls = enc.last_hidden_state[:, 0]
        s_emb = self.speaker_embed(speakers)
        turn_embeds = self.turn_proj(torch.cat([cls, s_emb], dim=-1))

        n = len(transcript)
        # FIX: clamp n_context to actual transcript length
        n_context = max(1, min(n - 1, int(n * 0.8))) if n > 1 else n
        context_turns = turn_embeds[:n_context]

        context_signals = torch.zeros(n_context, 1, device=device)
        for i in range(n_context):
            text = transcript[i]["text"].lower()
            positive = sum(1 for w in ["great", "interesting", "yes", "absolutely",
                                       "definitely", "love", "perfect", "agree"] if w in text)
            negative = sum(1 for w in ["no", "not", "can't", "don't", "won't",
                                       "concerned", "worried", "expensive"] if w in text)
            context_signals[i] = 1.0 if positive > negative else 0.0

        context_repr = self.encode_context(context_turns, context_signals)
        mu, sigma = self.decode_target(turn_embeds, context_repr)
        turn_scores = mu.squeeze(-1)
        uncertainties = sigma.squeeze(-1)

        turning_points = []
        for i in range(1, n):
            pair = torch.cat([turn_embeds[i - 1], turn_embeds[i]])
            tp_score = self.turning_point_head(pair.unsqueeze(0)).sigmoid().item()
            if tp_score > 0.5:
                delta = turn_scores[i] - turn_scores[i - 1]
                turning_points.append({
                    "turn": i, "probability": round(tp_score, 3),
                    "direction": "positive" if delta > 0 else "negative",
                    "delta": round(delta.item(), 3),
                    "uncertainty": round(uncertainties[i].item(), 3),
                    "speaker": transcript[i]["speaker"]})

        h_final = self.decoder(torch.cat([
            turn_embeds[-1], context_repr.squeeze(0)]))

        if n > 2:
            mom = self.momentum_head(h_final.unsqueeze(0))
            momentum = ["accelerating", "stable", "decelerating"][mom.argmax(-1).item()]
        else:
            momentum = "stable"

        commitments = self.commitment_detector.process(transcript)
        action = self.actions[self.action_head(h_final.unsqueeze(0)).argmax(-1).item()]

        return {
            "deal_health": round(turn_scores[-1].item() * 100),
            "turn_scores": [round(s.item(), 3) for s in turn_scores],
            "turn_uncertainties": [round(u.item(), 3) for u in uncertainties],
            "momentum": momentum,
            "turning_points": sorted(turning_points, key=lambda x: -x["probability"])[:3],
            "commitments": commitments,
            "commitment_count": len([c for c in commitments if not c["negated"]]),
            "negated_commitment_count": len([c for c in commitments if c["negated"]]),
            "action": action,
            "model_confidence": round(1.0 - uncertainties[-1].item(), 3),
        }

    @torch.no_grad()
    def predict(self, text: str, **kwargs) -> dict:
        from ..backbone import SharedEncoder
        encoded = SharedEncoder.encode(text)
        return self.forward(encoded["encoder_output"])

    def compute_loss(self, context_turns, context_signals, target_turns, target_outcomes):
        context_repr = self.encode_context(context_turns, context_signals)
        mu, sigma = self.decode_target(target_turns, context_repr)
        nll = 0.5 * ((target_outcomes - mu) / sigma) ** 2 + sigma.log()
        return nll.mean()
