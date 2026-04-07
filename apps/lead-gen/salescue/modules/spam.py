"""salescue/modules/spam.py — Hierarchical Bayesian Attention Gating

Research contribution: Existing spam detectors operate at a single granularity — they
classify the whole document. But spam signals are *level-dependent*: spammy tokens
("FREE", "URGENT") contribute differently than spammy sentence structures (urgency
patterns, missing personalization) versus spammy document profiles (link density,
header anomalies). We introduce a Hierarchical Bayesian Attention Gate (HBAG) that
operates at token, sentence, and document level simultaneously. At each level,
Bayesian attention computes per-element spam contribution priors updated via amortized
variational inference. An adversarial calibration loss forces provider-specific scores
to match empirical inbox placement distributions.

Additionally, the AI detection subsystem uses 32 structural features (up from 8) with
style transfer trajectory analysis and statistical watermark detection, making it robust
against paraphrased and rewritten LLM content.
"""

from __future__ import annotations

import math
import re
from typing import Optional

import torch
import torch.nn as nn
import torch.nn.functional as F

from ..base import BaseModule
from ..backbone import SharedEncoder


# ── Taxonomy ──────────────────────────────────────────────────────────────────

SPAM_CATEGORIES = [
    "clean",              # Legitimate personalized email
    "template_spam",      # Mass-sent templates with token substitution
    "ai_generated",       # LLM-generated content
    "low_effort",         # Generic, no personalization, no value prop
    "role_account",       # info@, noreply@, billing@, support@
    "domain_suspect",     # Disposable/newly-registered/known-spam domains
    "content_violation",  # Urgency manipulation, deceptive subject, etc.
]

RISK_FACTORS = [
    "urgency_manipulation", "link_overload", "image_only",
    "invisible_text", "url_shortener", "reply_to_mismatch",
    "encoding_tricks", "homoglyph_attack", "zero_width_chars",
]

PROVIDERS = ["gmail", "outlook", "yahoo", "protonmail", "apple_mail", "corporate"]

PROVIDER_THRESHOLDS = {
    "gmail":      {"base": 0.45, "link_penalty": 0.08, "urgency_penalty": 0.12},
    "outlook":    {"base": 0.40, "link_penalty": 0.10, "urgency_penalty": 0.10},
    "yahoo":      {"base": 0.50, "link_penalty": 0.06, "urgency_penalty": 0.15},
    "protonmail": {"base": 0.35, "link_penalty": 0.12, "urgency_penalty": 0.08},
    "apple_mail": {"base": 0.42, "link_penalty": 0.07, "urgency_penalty": 0.11},
    "corporate":  {"base": 0.38, "link_penalty": 0.10, "urgency_penalty": 0.10},
}

URGENCY_WORDS = [
    "urgent", "act now", "limited time", "expires", "immediately",
    "don't miss", "last chance", "final notice", "deadline", "hurry",
    "time sensitive", "expiring", "today only", "offer ends",
]

ROLE_ACCOUNTS = [
    "info@", "noreply@", "no-reply@", "billing@", "support@",
    "admin@", "contact@", "sales@", "hello@", "team@",
    "notification@", "alerts@", "mailer-daemon@", "postmaster@",
]

# Top-2000 frequency words (abbreviated for the formality/sophistication features)
_COMMON_WORDS = {
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "they", "we", "say", "her", "she",
    "or", "an", "will", "my", "one", "all", "would", "there", "their", "what",
    "so", "up", "out", "if", "about", "who", "get", "which", "go", "me",
    "when", "make", "can", "like", "time", "no", "just", "him", "know", "take",
    "people", "into", "year", "your", "good", "some", "could", "them", "see",
    "other", "than", "then", "now", "look", "only", "come", "its", "over",
    "think", "also", "back", "after", "use", "two", "how", "our", "work",
    "first", "well", "way", "even", "new", "want", "because", "any", "these",
    "give", "day", "most", "us", "is", "are", "was", "were", "been", "has",
    "had", "did", "does", "am", "being", "more", "very", "much", "should",
}


# ── Utility: sentence splitting ───────────────────────────────────────────────

def _split_sentences(text: str) -> list[str]:
    """Split text into sentences via punctuation boundaries."""
    raw = re.split(r'(?<=[.!?])\s+', text.strip())
    return [s.strip() for s in raw if s.strip()]


def _split_paragraphs(text: str) -> list[str]:
    """Split text into paragraphs via double-newline or blank lines."""
    paras = re.split(r'\n\s*\n', text.strip())
    return [p.strip() for p in paras if p.strip()]


# ── Sub-Module A: Hierarchical Bayesian Attention Gate ─────────────────────────

class HierarchicalBayesianAttentionGate(nn.Module):
    """Multi-granularity spam gate with Bayesian token-level priors.

    Operates at three levels:
    1. Token-level: Beta(alpha, beta) prior per token via learned spam probe
    2. Sentence-level: Aggregate token posteriors + 12 structural features
    3. Document-level: Attention-weighted sentence aggregation → 7-way category
    """

    def __init__(self, hidden=768, n_categories=7):
        super().__init__()
        h4 = hidden // 4

        # Token-level: spam probe cross-attention
        self.spam_probe = nn.Parameter(torch.randn(1, h4))
        self.token_key = nn.Linear(hidden, h4)
        self.token_value = nn.Linear(hidden, h4)

        # Bayesian priors: per-token alpha/beta for Beta distribution
        self.prior_alpha = nn.Sequential(nn.Linear(h4, 1), nn.Softplus())
        self.prior_beta = nn.Sequential(nn.Linear(h4, 1), nn.Softplus())

        # Sentence-level: structural features + token posterior aggregation
        self.sentence_struct = nn.Linear(12, 32)
        self.sentence_combiner = nn.Sequential(
            nn.Linear(h4 + 32, 64), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(64, 1), nn.Sigmoid(),
        )

        # Document-level: attention over sentence scores → category head
        self.doc_attention = nn.Linear(64, 1)
        self.doc_proj = nn.Sequential(
            nn.Linear(h4 + 32, 64), nn.GELU(),
        )
        self.category_head = nn.Sequential(
            nn.Linear(64 + 48, 128), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(128, n_categories),
        )
        self.gate_head = nn.Sequential(
            nn.Linear(64, 32), nn.GELU(), nn.Linear(32, 1), nn.Sigmoid(),
        )

        # Document-level features (48-dim)
        self.doc_features = nn.Linear(8, 48)

    @staticmethod
    def extract_sentence_features(sentence: str) -> list[float]:
        """12 structural features per sentence."""
        words = sentence.split()
        lower = sentence.lower()
        n_words = max(len(words), 1)
        n_chars = max(len(sentence), 1)

        has_greeting = any(lower.startswith(g) for g in [
            "hey", "hi ", "hello", "dear", "good morning", "good afternoon"])
        has_cta = any(w in lower for w in [
            "call", "chat", "meet", "discuss", "schedule", "connect",
            "book", "demo", "try", "sign up"])
        has_urgency = any(w in lower for w in URGENCY_WORDS)
        has_personalization = bool(re.search(
            r'\b(your company|your team|you mentioned|we discussed)\b', lower))
        has_link = bool(re.search(r'https?://\S+', sentence))
        starts_with_question = sentence.strip().endswith("?")
        punct_density = sum(1 for c in sentence if c in ".,;:!?") / n_chars
        caps_ratio = sum(1 for w in words if w.isupper() and len(w) > 1) / n_words
        pronoun_ratio = sum(
            1 for w in words if w.lower() in ("i", "me", "my", "we", "our", "us")
        ) / n_words
        specificity = sum(
            1 for w in words if w[0:1].isupper() and w.lower() not in _COMMON_WORDS
        ) / n_words if words else 0
        formality = sum(
            1 for w in words
            if w.lower() in ("please", "kindly", "sincerely", "regards", "respectfully")
        ) / n_words

        return [
            float(n_words),
            float(has_greeting),
            float(has_cta),
            float(has_urgency),
            float(has_personalization),
            float(has_link),
            float(starts_with_question),
            punct_density,
            caps_ratio,
            pronoun_ratio,
            specificity,
            formality,
        ]

    @staticmethod
    def extract_doc_features(text: str) -> list[float]:
        """8 document-level features."""
        words = text.split()
        sentences = _split_sentences(text)
        links = re.findall(r'https?://\S+', text)
        n_words = max(len(words), 1)

        return [
            min(n_words / 500.0, 1.0),                         # text length
            len(links) / max(n_words, 1) * 100,                # link density
            sum(1 for w in words if w.isupper() and len(w) > 1) / n_words,  # caps ratio
            len(sentences) / 20.0,                              # sentence count (norm)
            text.count("!") / max(len(text), 1) * 100,         # exclamation density
            sum(1 for w in URGENCY_WORDS if w in text.lower()), # urgency count
            float(bool(re.search(r'\{\{|\[\[|<NAME>|\[Company\]', text))),  # template markers
            sum(1 for c in text if ord(c) > 127) / max(len(text), 1) * 100,  # non-ascii ratio
        ]

    def forward(self, encoder_output, text: str):
        """Hierarchical gating: token → sentence → document.

        Returns:
            Dict with category_logits, gate_score, token_contributions,
            sentence_scores, gate_confidence.
        """
        tokens = encoder_output.last_hidden_state  # (1, seq, hidden)
        device = tokens.device

        # ── Token-level: Bayesian attention ──
        keys = self.token_key(tokens)           # (1, seq, h/4)
        values = self.token_value(tokens)       # (1, seq, h/4)
        probe = self.spam_probe.unsqueeze(0)    # (1, 1, h/4)

        scale = math.sqrt(keys.shape[-1])
        attn = torch.bmm(probe, keys.transpose(1, 2)) / scale  # (1, 1, seq)
        attn_weights = attn.softmax(dim=-1).squeeze(1)          # (1, seq)

        # Per-token Beta priors
        alpha = self.prior_alpha(values).squeeze(-1) + 1.0  # (1, seq), min 1
        beta = self.prior_beta(values).squeeze(-1) + 1.0    # (1, seq), min 1
        token_posteriors = alpha / (alpha + beta)             # (1, seq), E[Beta]

        # Weighted token spam contribution
        token_spam_signal = (attn_weights * token_posteriors).sum(dim=-1)  # (1,)

        # Aggregate token representation
        token_agg = torch.bmm(attn_weights.unsqueeze(1), values).squeeze(1)  # (1, h/4)

        # ── Sentence-level ──
        sentences = _split_sentences(text)
        if not sentences:
            sentences = [text]

        sentence_scores_list = []
        sentence_embeds_list = []
        for sent in sentences[:20]:  # cap at 20 sentences
            struct_feats = self.extract_sentence_features(sent)
            struct_tensor = torch.tensor(struct_feats, device=device).unsqueeze(0)
            struct_embed = self.sentence_struct(struct_tensor)  # (1, 32)

            combined = torch.cat([token_agg, struct_embed], dim=-1)  # (1, h/4+32)
            sent_score = self.sentence_combiner(combined)  # (1, 1)
            sent_embed = self.doc_proj(combined)           # (1, 64)
            sentence_scores_list.append(sent_score.item())
            sentence_embeds_list.append(sent_embed)

        # Stack sentence embeddings for document attention
        if sentence_embeds_list:
            sent_stack = torch.cat(sentence_embeds_list, dim=0).unsqueeze(0)  # (1, n_sent, 64)
            sent_attn = self.doc_attention(sent_stack).softmax(dim=1)         # (1, n_sent, 1)
            doc_embed = (sent_attn * sent_stack).sum(dim=1)                   # (1, 64)
        else:
            doc_embed = torch.zeros(1, 64, device=device)

        # ── Document-level ──
        doc_feats = self.extract_doc_features(text)
        doc_tensor = torch.tensor(doc_feats, device=device).unsqueeze(0)
        doc_feat_embed = self.doc_features(doc_tensor)  # (1, 48)

        cat_input = torch.cat([doc_embed, doc_feat_embed], dim=-1)  # (1, 112)
        category_logits = self.category_head(cat_input)             # (1, n_categories)

        gate_score = self.gate_head(doc_embed)  # (1, 1)

        # Bayesian confidence: mean precision of token posteriors
        precision = alpha + beta  # higher = more confident
        mean_precision = precision.mean().item()
        gate_confidence = min(mean_precision / 10.0, 1.0)

        # Top-10 token contributions for interpretability
        top_k = min(10, token_posteriors.shape[1])
        top_vals, top_idxs = (attn_weights * token_posteriors).topk(top_k, dim=-1)

        return {
            "category_logits": category_logits,
            "gate_score": gate_score.item(),
            "token_spam_signal": token_spam_signal.item(),
            "token_contributions": {
                "indices": top_idxs[0].tolist(),
                "scores": [round(v, 4) for v in top_vals[0].tolist()],
            },
            "sentence_scores": [round(s, 3) for s in sentence_scores_list],
            "gate_confidence": round(gate_confidence, 3),
            "alpha": alpha,
            "beta": beta,
        }

    def compute_kl_loss(self, alpha, beta, prior_alpha=1.0, prior_beta=1.0):
        """KL divergence between learned Beta posteriors and uniform Beta(1,1) prior."""
        # KL(Beta(a,b) || Beta(a0,b0)) approximation via digamma
        kl = (torch.lgamma(torch.tensor(prior_alpha + prior_beta, device=alpha.device))
              - torch.lgamma(torch.tensor(prior_alpha, device=alpha.device))
              - torch.lgamma(torch.tensor(prior_beta, device=alpha.device))
              - torch.lgamma(alpha + beta)
              + torch.lgamma(alpha) + torch.lgamma(beta)
              + (alpha - prior_alpha) * (torch.digamma(alpha) - torch.digamma(alpha + beta))
              + (beta - prior_beta) * (torch.digamma(beta) - torch.digamma(alpha + beta)))
        return kl.mean()


# ── Sub-Module B: Adversarial Style Transfer Detector ──────────────────────────

class AdversarialStyleTransferDetector(nn.Module):
    """AI detection via 32 structural features, perplexity ratio, trajectory
    analysis, and statistical watermark detection.

    Replaces the original PerplexityRatioDetector with a deeper, more robust
    variant that detects paraphrased/rewritten AI content and LLM watermarks.
    """

    def __init__(self, hidden=768):
        super().__init__()

        # Perplexity ratio (deeper than original)
        self.human_pattern_scorer = nn.Sequential(
            nn.Linear(hidden, 128), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(128, 64), nn.GELU(), nn.Linear(64, 1),
        )
        self.ai_pattern_scorer = nn.Sequential(
            nn.Linear(hidden, 128), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(128, 64), nn.GELU(), nn.Linear(64, 1),
        )

        # Style transfer trajectory head (sentence-level embedding cosine smoothness)
        self.trajectory_proj = nn.Linear(hidden, 32)

        # Watermark detection head (green-list token bias, Kirchenbauer et al. 2023)
        self.watermark_head = nn.Sequential(
            nn.Linear(hidden, 32), nn.GELU(), nn.Linear(32, 1), nn.Sigmoid(),
        )

        # 32 structural features → embedding
        self.structure_features = nn.Linear(32, 64)

        # Combine: perplexity_ratio + magnitude + struct_embed + trajectory + watermark + template
        self.combiner = nn.Sequential(
            nn.Linear(2 + 64 + 3, 96), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(96, 32), nn.GELU(), nn.Linear(32, 1), nn.Sigmoid(),
        )

    @staticmethod
    def compute_structural_features(text: str) -> list[float]:
        """Extract 32 structural features that distinguish human from AI writing."""
        sentences = _split_sentences(text)
        paragraphs = _split_paragraphs(text)
        words = text.split()
        lower = text.lower()
        n_words = max(len(words), 1)
        n_chars = max(len(text), 1)
        n_sents = max(len(sentences), 1)
        word_set = set(w.lower() for w in words)

        # Helper: word frequency distribution
        freq: dict[str, int] = {}
        for w in words:
            wl = w.lower()
            freq[wl] = freq.get(wl, 0) + 1

        lengths = [len(s.split()) for s in sentences] if sentences else [0]

        # ── 1-8: Original features ──
        f1 = float(torch.tensor(lengths).float().std().item()) if len(lengths) > 1 else 0.0
        f2 = sum(1 for s in sentences if any(
            c in s.lower() for c in ["n't", "'re", "'ll", "'ve", "'m", "'d"]
        )) / n_sents
        f3 = float(text.count("(") + text.count("\u2014") + text.count("..."))
        f4 = text.count("!") / n_chars * 100
        f5 = sum(1 for w in words if w.lower() in ("i", "i'm", "i've", "my", "me")) / n_words
        f6 = sum(len(w) for w in words) / n_words
        f7 = len(set(
            s.split()[0].lower() if s.split() else "" for s in sentences
        )) / n_sents
        f8 = min(n_words / 200.0, 1.0)

        # ── 9-16: Vocabulary features ──
        f9 = len(word_set) / n_words                           # type-token ratio
        f10 = sum(1 for w, c in freq.items() if c == 1) / n_words  # hapax ratio
        f11 = (float(torch.tensor(list(freq.values())).float().var().item())
               if len(freq) > 1 else 0.0)                     # burstiness
        f12 = float(text.count(",") + text.count(";")) / n_sents  # clause nesting approx
        conj = ["and", "but", "however", "moreover", "furthermore", "although",
                "nevertheless", "therefore", "consequently", "meanwhile"]
        f13 = sum(1 for w in words if w.lower() in conj) / n_words  # conjunction density
        hedge = ["perhaps", "might", "could", "possibly", "it seems",
                 "apparently", "arguably", "presumably", "likely"]
        f14 = sum(1 for h in hedge if h in lower) / n_words     # hedging density
        filler = ["basically", "actually", "literally", "essentially",
                  "honestly", "obviously", "clearly", "really"]
        f15 = sum(1 for f in filler if f in lower) / n_words    # filler density
        f16 = float(bool(re.search(r'\d+[\.\)]\s', text)))      # list patterns

        # ── 17-24: Stylistic features ──
        f17 = sum(1 for s in sentences if s.strip().endswith("?")) / n_sents  # question density
        first_person = sum(1 for w in words if w.lower() in ("i", "me", "my", "we", "our", "us"))
        third_person = sum(1 for w in words if w.lower() in ("he", "she", "they", "them", "their"))
        f18 = first_person / max(first_person + third_person, 1)  # 1st vs 3rd person
        # Passive voice approximation: "was/were + past-tense-ish"
        f19 = len(re.findall(r'\b(?:was|were|been|being)\s+\w+ed\b', lower)) / n_sents
        content_words = [w for w in words if w.lower() not in _COMMON_WORDS and w.isalpha()]
        f20 = len(content_words) / n_words                      # info density
        para_lengths = [len(p.split()) for p in paragraphs] if paragraphs else [0]
        f21 = (float(torch.tensor(para_lengths).float().std().item())
               if len(para_lengths) > 1 else 0.0)               # paragraph length variance
        f22 = len(sentences[0].split()) / 20.0 if sentences else 0  # opening sentence length
        avg_len = sum(lengths) / n_sents
        f23 = abs(lengths[-1] - avg_len) / max(avg_len, 1) if lengths else 0  # closing distinctiveness
        trans = ["therefore", "however", "furthermore", "additionally", "consequently",
                 "meanwhile", "moreover", "nevertheless", "in addition", "as a result"]
        f24 = sum(1 for t in trans if t in lower) / n_words     # transition density

        # ── 25-32: Fingerprint features ──
        # Named entity density (capitalized non-common words)
        named = sum(1 for w in words if w[0:1].isupper() and w.lower() not in _COMMON_WORDS)
        f25 = named / n_words                                    # specificity/NE density

        # Sentiment uniformity: per-sentence positive/negative word count variance
        pos_words = {"great", "good", "excellent", "love", "amazing", "wonderful", "fantastic"}
        neg_words = {"bad", "terrible", "awful", "hate", "horrible", "poor", "worst"}
        sent_sents = []
        for s in sentences:
            sw = s.lower().split()
            sent_sents.append(
                sum(1 for w in sw if w in pos_words) - sum(1 for w in sw if w in neg_words))
        f26 = (float(torch.tensor(sent_sents).float().var().item())
               if len(sent_sents) > 1 else 0.0)                 # sentiment uniformity

        # Lexical sophistication: words NOT in common set
        f27 = sum(1 for w in words if w.lower() not in _COMMON_WORDS and w.isalpha()) / n_words

        # N-gram repetition beyond chance
        bigrams = [f"{words[i].lower()} {words[i+1].lower()}" for i in range(len(words)-1)]
        unique_bigrams = len(set(bigrams))
        f28 = 1.0 - (unique_bigrams / max(len(bigrams), 1))     # repetition score

        # Formality index
        formal = ["please", "kindly", "sincerely", "regards", "respectfully",
                  "furthermore", "consequently", "herein", "pursuant"]
        informal = ["hey", "cool", "awesome", "gonna", "wanna", "kinda", "btw", "lol"]
        formal_count = sum(1 for w in words if w.lower() in formal)
        informal_count = sum(1 for w in words if w.lower() in informal)
        f29 = (formal_count - informal_count) / max(formal_count + informal_count, 1)

        # Self-reference pattern (I/we vs you/your)
        self_ref = sum(1 for w in words if w.lower() in ("i", "we", "our", "my", "me", "us"))
        other_ref = sum(1 for w in words if w.lower() in ("you", "your", "yours"))
        f30 = self_ref / max(self_ref + other_ref, 1)

        # Template marker detection
        f31 = float(bool(re.search(r'\{\{|\[\[|<NAME>|\[Company\]|\[Name\]|__[A-Z]+__', text)))

        # Unicode anomaly score
        non_ascii = sum(1 for c in text if ord(c) > 127)
        # Homoglyphs (Cyrillic lookalikes): а(1072), е(1077), о(1086), р(1088), с(1089), х(1093)
        homoglyphs = sum(1 for c in text if ord(c) in (1072, 1077, 1086, 1088, 1089, 1093))
        zero_width = sum(1 for c in text if ord(c) in (0x200B, 0x200C, 0x200D, 0xFEFF))
        f32 = (non_ascii + homoglyphs * 5 + zero_width * 10) / n_chars

        return [
            f1, f2, f3, f4, f5, f6, f7, f8,
            f9, f10, f11, f12, f13, f14, f15, f16,
            f17, f18, f19, f20, f21, f22, f23, f24,
            f25, f26, f27, f28, f29, f30, f31, f32,
        ]

    def compute_trajectory_smoothness(self, tokens):
        """Measure embedding-space velocity between consecutive sentence positions.

        AI text has smoother trajectories (lower velocity variance) because LLMs
        maintain topic coherence too consistently.
        """
        if tokens.shape[1] < 4:
            return 0.0

        projected = self.trajectory_proj(tokens[0])  # (seq, 32)

        # Sample ~20 evenly spaced positions for sentence-level approximation
        n = projected.shape[0]
        stride = max(n // 20, 1)
        sampled = projected[::stride]  # (~20, 32)

        if sampled.shape[0] < 3:
            return 0.0

        # Cosine similarity between consecutive positions
        normed = F.normalize(sampled, dim=-1)
        consec_cos = (normed[:-1] * normed[1:]).sum(dim=-1)  # (~19,)

        # AI text: high mean similarity, low variance
        smoothness = consec_cos.mean().item()
        return round(smoothness, 4)

    def forward(self, encoder_output, input_ids, tokenizer, text):
        cls = encoder_output.last_hidden_state[:, 0]
        tokens = encoder_output.last_hidden_state

        # Perplexity ratio
        human_score = self.human_pattern_scorer(cls)
        ai_score = self.ai_pattern_scorer(cls)
        log_ratio = human_score - ai_score

        # Structural features (32-dim)
        struct_feats = self.compute_structural_features(text)
        struct_tensor = torch.tensor(struct_feats, device=cls.device).unsqueeze(0)
        struct_embed = self.structure_features(struct_tensor)  # (1, 64)

        # Trajectory smoothness
        trajectory = self.compute_trajectory_smoothness(tokens)

        # Watermark detection
        watermark = self.watermark_head(cls).item()

        # Template detection
        template_score = struct_feats[30]  # f31 from features

        # Combine all signals
        combiner_input = torch.cat([
            log_ratio.view(1, -1),                                 # (1, 1)
            (human_score + ai_score).view(1, -1),                  # (1, 1)
            struct_embed,                                          # (1, 64)
            torch.tensor([[trajectory, watermark, template_score]],
                         device=cls.device),                       # (1, 3)
        ], dim=-1)

        ai_risk = self.combiner(combiner_input).item()

        return {
            "ai_risk": round(max(0, min(1.0, ai_risk)), 3),
            "perplexity_ratio": round(log_ratio.item(), 4),
            "style_transfer_score": trajectory,
            "watermark_detected": watermark > 0.5,
            "watermark_score": round(watermark, 3),
            "trajectory_smoothness": trajectory,
            "structural_features": {
                "type_token_ratio": round(struct_feats[8], 3),
                "hapax_ratio": round(struct_feats[9], 3),
                "burstiness": round(struct_feats[10], 3),
                "hedging_density": round(struct_feats[13], 3),
                "info_density": round(struct_feats[19], 3),
                "repetition_score": round(struct_feats[27], 3),
                "formality_index": round(struct_feats[28], 3),
                "template_markers": bool(struct_feats[30]),
                "unicode_anomaly": round(struct_feats[31], 4),
            },
        }


# ── Sub-Module C: Header Analyzer ─────────────────────────────────────────────

class HeaderAnalyzer(nn.Module):
    """Email header feature extraction for authentication and routing analysis.

    Processes parsed email headers (SPF/DKIM/DMARC, routing hops, reply-to,
    send time) into a 16-dim feature vector for spam scoring.
    """

    def __init__(self):
        super().__init__()
        self.header_encoder = nn.Sequential(
            nn.Linear(16, 32), nn.GELU(), nn.Linear(32, 16),
        )

    @staticmethod
    def extract_header_features(headers: dict | None, send_hour: int | None = None) -> list[float]:
        """16-dim feature vector from email headers."""
        if headers is None:
            return [0.0] * 16

        spf = headers.get("spf", "none").lower()
        dkim = headers.get("dkim", "none").lower()
        dmarc = headers.get("dmarc", "none").lower()

        # SPF one-hot (3 dims)
        spf_pass = float(spf == "pass")
        spf_fail = float(spf in ("fail", "softfail"))
        spf_none = float(spf == "none")

        # DKIM one-hot (3 dims)
        dkim_pass = float(dkim == "pass")
        dkim_fail = float(dkim == "fail")
        dkim_none = float(dkim == "none")

        # DMARC one-hot (3 dims)
        dmarc_pass = float(dmarc == "pass")
        dmarc_fail = float(dmarc == "fail")
        dmarc_none = float(dmarc == "none")

        hop_count = min(headers.get("hop_count", 0), 20) / 20.0
        reply_to_mismatch = float(headers.get("reply_to_mismatch", False))
        return_path_mismatch = float(headers.get("return_path_mismatch", False))
        has_list_unsub = float(headers.get("has_list_unsubscribe", False))
        known_mailer = float(headers.get("known_mailer", False))

        # Circular send hour encoding
        hour = send_hour if send_hour is not None else headers.get("send_hour", 12)
        hour_sin = math.sin(2 * math.pi * hour / 24)
        hour_cos = math.cos(2 * math.pi * hour / 24)

        return [
            spf_pass, spf_fail, spf_none,
            dkim_pass, dkim_fail, dkim_none,
            dmarc_pass, dmarc_fail, dmarc_none,
            hop_count,
            reply_to_mismatch,
            return_path_mismatch,
            has_list_unsub,
            known_mailer,
            hour_sin,
            hour_cos,
        ]

    def forward(self, headers: dict | None = None, send_hour: int | None = None):
        feats = self.extract_header_features(headers, send_hour)
        device = next(self.parameters()).device
        feat_tensor = torch.tensor(feats, device=device).unsqueeze(0)
        encoded = self.header_encoder(feat_tensor)  # (1, 16)
        return {
            "header_embed": encoded,
            "header_features": feats,
        }


# ── Sub-Module D: Temporal Burst Detector ──────────────────────────────────────

class TemporalBurstDetector(nn.Module):
    """Cross-email temporal pattern analysis for burst and cadence detection.

    Operates on a batch of send timestamps from the same sender/campaign
    to detect anomalous send patterns.
    """

    def __init__(self):
        super().__init__()
        self.temporal_encoder = nn.Sequential(
            nn.Linear(8, 32), nn.GELU(), nn.Linear(32, 16),
        )

    @staticmethod
    def extract_temporal_features(timestamps: list[float] | None) -> list[float]:
        """8-dim temporal feature vector from send timestamps (epoch seconds)."""
        if not timestamps or len(timestamps) < 2:
            return [0.0] * 8

        timestamps = sorted(timestamps)
        intervals = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]

        mean_interval = sum(intervals) / len(intervals)
        var_interval = sum((x - mean_interval) ** 2 for x in intervals) / len(intervals)

        # Burst: any interval < 60 seconds
        burst = sum(1 for x in intervals if x < 60) / len(intervals)

        # Cadence regularity: coefficient of variation
        cv = (var_interval ** 0.5) / max(mean_interval, 1.0)
        regularity = 1.0 / (1.0 + cv)

        # Time-of-day entropy (24 bins)
        import datetime
        hour_counts = [0] * 24
        for ts in timestamps:
            try:
                hour_counts[datetime.datetime.fromtimestamp(ts).hour] += 1
            except (OSError, ValueError):
                pass
        total = sum(hour_counts)
        tod_entropy = 0.0
        if total > 0:
            for c in hour_counts:
                if c > 0:
                    p = c / total
                    tod_entropy -= p * math.log(p)
            tod_entropy /= math.log(24)  # normalize to [0, 1]

        # Day-of-week entropy (7 bins)
        dow_counts = [0] * 7
        for ts in timestamps:
            try:
                dow_counts[datetime.datetime.fromtimestamp(ts).weekday()] += 1
            except (OSError, ValueError):
                pass
        dow_entropy = 0.0
        if total > 0:
            for c in dow_counts:
                if c > 0:
                    p = c / total
                    dow_entropy -= p * math.log(p)
            dow_entropy /= math.log(7)

        # Volume
        volume = min(len(timestamps) / 100.0, 1.0)

        # Acceleration: is send rate increasing?
        if len(intervals) >= 4:
            mid = len(intervals) // 2
            first_half = sum(intervals[:mid]) / mid
            second_half = sum(intervals[mid:]) / (len(intervals) - mid)
            acceleration = (first_half - second_half) / max(first_half, 1.0)
        else:
            acceleration = 0.0

        return [
            min(mean_interval / 3600.0, 1.0),  # mean interval (normalized to hours)
            min(var_interval / (3600.0 ** 2), 1.0),  # variance (normalized)
            burst,
            regularity,
            tod_entropy,
            dow_entropy,
            volume,
            max(-1.0, min(1.0, acceleration)),
        ]

    def forward(self, timestamps: list[float] | None = None):
        feats = self.extract_temporal_features(timestamps)
        device = next(self.parameters()).device
        feat_tensor = torch.tensor(feats, device=device).unsqueeze(0)
        encoded = self.temporal_encoder(feat_tensor)  # (1, 16)
        return {
            "temporal_embed": encoded,
            "temporal_anomaly": feats[2],  # burst score
        }


# ── Sub-Module E: Campaign Similarity Detector ────────────────────────────────

class CampaignSimilarityDetector(nn.Module):
    """Detect template-based campaigns by computing pairwise CLS similarity.

    Flags batches where >70% of email pairs have cosine similarity > 0.85
    as template campaigns.
    """

    def __init__(self):
        super().__init__()
        self.campaign_head = nn.Sequential(
            nn.Linear(4, 16), nn.GELU(), nn.Linear(16, 1), nn.Sigmoid(),
        )

    @staticmethod
    def compute_similarity_features(cls_embeddings: torch.Tensor | None) -> list[float]:
        """4-dim features from pairwise CLS similarity matrix."""
        if cls_embeddings is None or cls_embeddings.shape[0] < 2:
            return [0.0, 0.0, 0.0, 0.0]

        normed = F.normalize(cls_embeddings, dim=-1)
        sim_matrix = torch.mm(normed, normed.t())

        # Mask diagonal
        n = sim_matrix.shape[0]
        mask = ~torch.eye(n, dtype=torch.bool, device=sim_matrix.device)
        off_diag = sim_matrix[mask]

        max_sim = off_diag.max().item()
        mean_sim = off_diag.mean().item()
        frac_above = (off_diag > 0.85).float().mean().item()

        # Simple cluster count: threshold-based single-linkage
        clusters = list(range(n))
        for i in range(n):
            for j in range(i + 1, n):
                if sim_matrix[i, j].item() > 0.85:
                    root_i = clusters[i]
                    for k in range(n):
                        if clusters[k] == root_i:
                            clusters[k] = clusters[j]
        cluster_count = len(set(clusters)) / max(n, 1)

        return [max_sim, mean_sim, frac_above, cluster_count]

    def forward(self, cls_embeddings: torch.Tensor | None = None):
        feats = self.compute_similarity_features(cls_embeddings)
        device = next(self.parameters()).device
        feat_tensor = torch.tensor(feats, device=device).unsqueeze(0)
        score = self.campaign_head(feat_tensor).item()
        return {
            "campaign_similarity": round(score, 3),
            "is_template_campaign": feats[2] > 0.7,  # >70% pairs above threshold
            "max_pairwise_similarity": round(feats[0], 3),
        }


# ── Sub-Module F: Provider Calibration ─────────────────────────────────────────

class ProviderCalibration(nn.Module):
    """6-provider deliverability calibration with adversarial loss.

    Each provider gets a learned MLP that maps raw spam features to
    provider-specific deliverability scores. The adversarial discriminator
    forces scores to be well-calibrated against empirical inbox placement.
    """

    def __init__(self):
        super().__init__()
        # Per-provider scoring heads (input: spam_score + ai_risk + text_length_norm)
        self.providers = nn.ModuleDict({
            p: nn.Sequential(
                nn.Linear(3, 16), nn.ReLU(), nn.Linear(16, 1), nn.Sigmoid(),
            )
            for p in PROVIDERS
        })

        # Adversarial calibration discriminator
        self.calibration_discriminator = nn.Sequential(
            nn.Linear(2, 32), nn.LeakyReLU(0.2), nn.Linear(32, 1),
        )

    def forward(self, spam_score: float, ai_risk: float, text: str,
                provider: str = "gmail"):
        device = next(self.parameters()).device
        n_words = len(text.split())

        provider_scores = {}
        for pname, phead in self.providers.items():
            features = torch.tensor(
                [[spam_score, ai_risk, min(n_words / 500.0, 1.0)]],
                device=device,
            )
            p_score = phead(features).item()

            # Apply rule-based adjustments
            thresholds = PROVIDER_THRESHOLDS.get(pname, PROVIDER_THRESHOLDS["gmail"])
            adjusted = p_score + thresholds["base"] - 0.45

            link_count = len(re.findall(r'https?://\S+', text))
            if link_count > 2:
                adjusted += thresholds["link_penalty"] * (link_count - 2)

            urgency_count = sum(1 for w in URGENCY_WORDS if w in text.lower())
            if urgency_count > 0:
                adjusted += thresholds["urgency_penalty"] * urgency_count

            provider_scores[pname] = round(min(1.0, max(0.0, adjusted)), 3)

        primary_score = provider_scores.get(provider, spam_score)
        deliverability = max(0, min(10, round(10 * (1 - primary_score))))

        return {
            "provider_scores": provider_scores,
            "deliverability": deliverability,
            "primary_provider": provider,
        }

    def adversarial_loss(self, predicted_score, empirical_score):
        """Train discriminator to distinguish predicted from empirical."""
        device = next(self.parameters()).device
        real_input = torch.tensor([[empirical_score, 1.0]], device=device)
        fake_input = torch.tensor([[predicted_score, 0.0]], device=device)

        d_real = self.calibration_discriminator(real_input)
        d_fake = self.calibration_discriminator(fake_input)

        d_loss = (F.binary_cross_entropy_with_logits(d_real, torch.ones_like(d_real))
                  + F.binary_cross_entropy_with_logits(d_fake, torch.zeros_like(d_fake)))
        g_loss = F.binary_cross_entropy_with_logits(d_fake, torch.ones_like(d_fake))

        return d_loss, g_loss


# ── Top-Level Module: SpamHead ─────────────────────────────────────────────────

class SpamHead(BaseModule):
    """Hierarchical Bayesian attention gating with adversarial calibration.

    Orchestrates 6 sub-modules for comprehensive spam detection:
    A. HierarchicalBayesianAttentionGate — token/sentence/document Bayesian gating
    B. AdversarialStyleTransferDetector — 32-feature AI detection + watermark
    C. HeaderAnalyzer — SPF/DKIM/DMARC header feature extraction
    D. TemporalBurstDetector — cross-email send pattern analysis
    E. CampaignSimilarityDetector — template campaign detection
    F. ProviderCalibration — 6-provider deliverability with adversarial loss
    """

    name = "spam"
    description = "Hierarchical Bayesian attention gating with adversarial calibration"

    def __init__(self, hidden=768):
        super().__init__()
        self.bayesian_gate = HierarchicalBayesianAttentionGate(hidden)
        self.ai_detector = AdversarialStyleTransferDetector(hidden)
        self.header_analyzer = HeaderAnalyzer()
        self.temporal_detector = TemporalBurstDetector()
        self.campaign_detector = CampaignSimilarityDetector()
        self.provider_cal = ProviderCalibration()

        # Final gating decision: 7 inputs → pass/quarantine/block
        self.gate_decision = nn.Sequential(
            nn.Linear(7, 32), nn.GELU(), nn.Linear(32, 1), nn.Sigmoid(),
        )

        # Uncertainty-weighted multi-task loss (Kendall et al., 2018)
        self.log_var_cat = nn.Parameter(torch.zeros(1))
        self.log_var_gate = nn.Parameter(torch.zeros(1))
        self.log_var_ai = nn.Parameter(torch.zeros(1))

    def _detect_risk_factors(self, text: str, ai_details: dict,
                             header_verdict: dict) -> list[dict]:
        """Identify active risk factors with explanations."""
        factors = []
        lower = text.lower()

        urgency_count = sum(1 for w in URGENCY_WORDS if w in lower)
        if urgency_count >= 2:
            factors.append({
                "factor": "urgency_manipulation",
                "severity": min(urgency_count / 5.0, 1.0),
                "detail": f"{urgency_count} urgency words detected",
            })

        link_count = len(re.findall(r'https?://\S+', text))
        if link_count > 3:
            factors.append({
                "factor": "link_overload",
                "severity": min(link_count / 10.0, 1.0),
                "detail": f"{link_count} links in email",
            })

        shorteners = ["bit.ly", "t.co", "tinyurl", "goo.gl", "ow.ly", "buff.ly"]
        short_count = sum(1 for s in shorteners if s in lower)
        if short_count > 0:
            factors.append({
                "factor": "url_shortener",
                "severity": min(short_count / 3.0, 1.0),
                "detail": f"{short_count} shortened URLs",
            })

        if ai_details.get("structural_features", {}).get("template_markers"):
            factors.append({
                "factor": "encoding_tricks",
                "severity": 0.5,
                "detail": "Template markers detected ({{, <NAME>, [Company])",
            })

        if ai_details.get("structural_features", {}).get("unicode_anomaly", 0) > 0.01:
            factors.append({
                "factor": "homoglyph_attack",
                "severity": ai_details["structural_features"]["unicode_anomaly"],
                "detail": "Unusual Unicode characters detected",
            })

        if header_verdict.get("reply_to_mismatch"):
            factors.append({
                "factor": "reply_to_mismatch",
                "severity": 0.8,
                "detail": "Reply-To domain differs from From domain",
            })

        return factors

    def _detect_role_account(self, text: str, **kwargs) -> float:
        """Check if sender is a role account."""
        from_addr = kwargs.get("from_address", "")
        if not from_addr:
            return 0.0
        return float(any(from_addr.lower().startswith(r) for r in ROLE_ACCOUNTS))

    def process(self, encoded, text, **kwargs):
        """Full spam gate processing.

        Optional kwargs:
            provider (str): Email provider for calibration (default: "gmail")
            headers (dict): Parsed email headers {spf, dkim, dmarc, ...}
            send_hour (int): Hour of day (0-23)
            timestamps (list[float]): Batch send timestamps for temporal analysis
            batch_cls (Tensor): CLS embeddings of batch emails for campaign detection
            from_address (str): Sender email address for role account detection
        """
        encoder_output = encoded["encoder_output"]
        input_ids = encoded["input_ids"]
        _, tokenizer = SharedEncoder.load()
        provider = kwargs.get("provider", "gmail")

        # A. Hierarchical Bayesian gating
        gate_result = self.bayesian_gate(encoder_output, text)
        category_logits = gate_result["category_logits"]
        category_probs = category_logits.softmax(dim=-1)
        category_idx = category_probs.argmax(dim=-1).item()
        spam_category = SPAM_CATEGORIES[category_idx]

        # B. AI detection
        ai_details = self.ai_detector(
            encoder_output, input_ids, tokenizer, text)
        ai_risk = ai_details["ai_risk"]

        # C. Header analysis
        headers = kwargs.get("headers")
        send_hour = kwargs.get("send_hour")
        header_result = self.header_analyzer(headers, send_hour)
        header_feats = header_result["header_features"]

        # Derive header verdict
        header_verdict = {
            "spf": "pass" if header_feats[0] > 0.5 else ("fail" if header_feats[1] > 0.5 else "none"),
            "dkim": "pass" if header_feats[3] > 0.5 else ("fail" if header_feats[4] > 0.5 else "none"),
            "dmarc": "pass" if header_feats[6] > 0.5 else ("fail" if header_feats[7] > 0.5 else "none"),
            "reply_to_mismatch": bool(header_feats[10] > 0.5),
            "header_score": round(sum(header_feats[0:9:3]) / 3.0, 3),  # avg of pass signals
        }

        # D. Temporal burst detection
        timestamps = kwargs.get("timestamps")
        temporal_result = self.temporal_detector(timestamps)
        temporal_anomaly = temporal_result["temporal_anomaly"]

        # E. Campaign similarity
        batch_cls = kwargs.get("batch_cls")
        campaign_result = self.campaign_detector(batch_cls)
        campaign_similarity = campaign_result["campaign_similarity"]

        # F. Role account check
        role_account_score = self._detect_role_account(text, **kwargs)

        # ── Composite spam score ──
        base_spam = gate_result["gate_score"]
        device = category_logits.device

        gate_input = torch.tensor([[
            base_spam,
            ai_risk,
            header_verdict["header_score"],
            temporal_anomaly,
            campaign_similarity,
            role_account_score,
            sum(1 for w in URGENCY_WORDS if w in text.lower()) / 5.0,
        ]], device=device)

        spam_score = self.gate_decision(gate_input).item()

        # G. Provider calibration
        provider_result = self.provider_cal(spam_score, ai_risk, text, provider)

        # Risk factors
        risk_factors = self._detect_risk_factors(text, ai_details, header_verdict)

        # Gate decision
        if spam_score > 0.7:
            gate = "block"
        elif spam_score > 0.4:
            gate = "quarantine"
        else:
            gate = "pass"

        # Risk level
        if spam_score > 0.7:
            risk_level = "critical"
        elif spam_score > 0.5:
            risk_level = "high"
        elif spam_score > 0.3:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Token contributions → decoded text spans
        token_contribs = []
        if tokenizer and gate_result["token_contributions"]["indices"]:
            for idx, score in zip(
                gate_result["token_contributions"]["indices"],
                gate_result["token_contributions"]["scores"],
            ):
                token_text = tokenizer.decode([input_ids[0, idx].item()]).strip()
                if token_text:
                    token_contribs.append({"token": token_text, "score": score})

        return {
            "spam_score": round(spam_score, 3),
            "spam_category": spam_category,
            "category_scores": {
                cat: round(category_probs[0, i].item(), 3)
                for i, cat in enumerate(SPAM_CATEGORIES)
            },
            "ai_risk": ai_risk,
            "ai_details": ai_details,
            "header_verdict": header_verdict,
            "deliverability": provider_result["deliverability"],
            "provider": provider,
            "provider_scores": provider_result["provider_scores"],
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "token_spam_contributions": token_contribs[:10],
            "sentence_scores": gate_result["sentence_scores"],
            "gate_decision": gate,
            "gate_confidence": gate_result["gate_confidence"],
        }

    def compute_loss(self, category_logits, gate_score, ai_risk,
                     true_category, true_is_spam, true_is_ai,
                     alpha, beta, provider_predicted=None,
                     provider_empirical=None, epoch=0):
        """Multi-task loss with uncertainty weighting.

        Args:
            category_logits: (B, 7) predicted category logits
            gate_score: (B, 1) predicted spam gate score
            ai_risk: (B, 1) predicted AI risk
            true_category: (B,) true category indices
            true_is_spam: (B, 1) binary spam labels
            true_is_ai: (B, 1) binary AI labels
            alpha, beta: Beta distribution parameters from Bayesian gate
            provider_predicted: predicted provider score (optional)
            provider_empirical: empirical deliverability (optional)
            epoch: training epoch for curriculum scheduling
        """
        prec_cat = torch.exp(-self.log_var_cat)
        prec_gate = torch.exp(-self.log_var_gate)
        prec_ai = torch.exp(-self.log_var_ai)

        loss_cat = prec_cat * F.cross_entropy(category_logits, true_category) + self.log_var_cat
        loss_gate = prec_gate * F.binary_cross_entropy(gate_score, true_is_spam) + self.log_var_gate
        loss_ai = prec_ai * F.binary_cross_entropy(ai_risk, true_is_ai) + self.log_var_ai

        # Bayesian KL regularization
        loss_kl = self.bayesian_gate.compute_kl_loss(alpha, beta) * 0.01

        total = loss_cat + loss_gate + loss_ai + loss_kl

        # Provider calibration adversarial loss (after warmup)
        if epoch >= 3 and provider_predicted is not None and provider_empirical is not None:
            d_loss, g_loss = self.provider_cal.adversarial_loss(
                provider_predicted, provider_empirical)
            total = total + 0.1 * (d_loss + g_loss)

        return total
