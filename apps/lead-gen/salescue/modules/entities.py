"""salescue/modules/entities.py — Regex + Pointer NER with Re-typing

Research contribution: Hybrid entity extraction combining high-precision regex
patterns for structured entities (emails, phones, URLs, money, dates) with a
pointer-network NER for unstructured entities (person, company, product, role).
A re-typing layer then reclassifies detected entities in context — e.g., "John"
becomes decision_maker vs. reference based on surrounding text.
"""

import re
from typing import Any

import torch
import torch.nn as nn

from ..base import BaseModule
from ..backbone import SharedEncoder


# --- Regex patterns for structured entities ---

REGEX_PATTERNS: dict[str, re.Pattern] = {
    "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"),
    "phone": re.compile(
        r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
    ),
    "url": re.compile(
        r"https?://[^\s<>\"']+|www\.[^\s<>\"']+"
    ),
    "money": re.compile(
        r"\$[\d,]+(?:\.\d{2})?(?:\s*(?:k|K|m|M|B|million|billion|thousand))?"
    ),
    "date": re.compile(
        r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|"
        r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s*\d{2,4}|"
        r"\d{4}-\d{2}-\d{2})\b",
        re.IGNORECASE,
    ),
    "percentage": re.compile(r"\b\d+(?:\.\d+)?%"),
}

# Entity types for the neural NER
ENTITY_TYPES = ["person", "company", "product", "role", "location", "technology"]

# Re-typing categories: context-dependent entity roles
RETYPE_CATEGORIES = [
    "decision_maker", "influencer", "end_user", "reference",
    "competitor", "partner", "prospect_company", "vendor",
]


class PointerNER(nn.Module):
    """Pointer-network NER for unstructured entity extraction.

    Uses start/end pointers per entity type to extract spans from
    the encoder output. More flexible than BIO tagging for overlapping
    entities.
    """

    def __init__(self, hidden: int = 768, n_types: int = len(ENTITY_TYPES)):
        super().__init__()
        self.n_types = n_types

        # per-type start/end pointers
        self.start_pointers = nn.Linear(hidden, n_types)
        self.end_pointers = nn.Linear(hidden, n_types)

        # entity type confidence
        self.type_confidence = nn.Sequential(
            nn.Linear(hidden, 64), nn.GELU(),
            nn.Linear(64, n_types), nn.Sigmoid(),
        )

    def forward(self, token_embeds: torch.Tensor) -> list[dict[str, Any]]:
        """Extract entities from token embeddings.

        Args:
            token_embeds: (seq_len, hidden) tensor

        Returns:
            List of entity dicts with type, start, end, confidence.
        """
        seq_len = token_embeds.shape[0]

        start_scores = self.start_pointers(token_embeds)  # (seq, n_types)
        end_scores = self.end_pointers(token_embeds)  # (seq, n_types)
        type_conf = self.type_confidence(token_embeds.mean(dim=0, keepdim=True))  # (1, n_types)

        entities = []
        for t in range(self.n_types):
            if type_conf[0, t].item() < 0.3:
                continue

            # find top start positions
            s_probs = start_scores[:, t].softmax(dim=0)
            top_starts = s_probs.topk(min(3, seq_len)).indices

            for s_idx in top_starts:
                s = s_idx.item()
                if s_probs[s].item() < 0.15:
                    continue

                # find best end position after start (within 15 tokens)
                end_range = end_scores[s:min(s + 15, seq_len), t]
                if len(end_range) == 0:
                    continue
                e_offset = end_range.argmax().item()
                e = s + e_offset

                entities.append({
                    "type": ENTITY_TYPES[t],
                    "start": s,
                    "end": e + 1,
                    "confidence": round(s_probs[s].item() * type_conf[0, t].item(), 3),
                })

        return entities


class RetypingLayer(nn.Module):
    """Context-dependent entity re-classification.

    After detecting "John" as a person entity, this layer determines
    if John is a decision_maker, influencer, end_user, or reference
    based on the surrounding text context.
    """

    def __init__(self, hidden: int = 768, n_categories: int = len(RETYPE_CATEGORIES)):
        super().__init__()

        # entity representation + context -> retype category
        self.retype_head = nn.Sequential(
            nn.Linear(hidden * 2, 128), nn.GELU(), nn.Dropout(0.1),
            nn.Linear(128, n_categories),
        )

    def forward(
        self,
        entity_embed: torch.Tensor,
        context_embed: torch.Tensor,
    ) -> dict[str, float]:
        """Classify entity role given its embedding and surrounding context.

        Args:
            entity_embed: (hidden,) embedding of the entity span
            context_embed: (hidden,) CLS or context embedding

        Returns:
            Dict mapping retype categories to probabilities.
        """
        combined = torch.cat([entity_embed, context_embed], dim=-1)
        logits = self.retype_head(combined.unsqueeze(0))
        probs = logits.softmax(dim=-1).squeeze(0)

        return {
            cat: round(probs[i].item(), 3)
            for i, cat in enumerate(RETYPE_CATEGORIES)
        }


class EntityExtractor(BaseModule):
    name = "entities"
    description = "Hybrid regex + pointer NER with context-dependent re-typing"
    """Combined regex + neural NER with re-typing.

    Pipeline:
    1. Regex extraction for structured entities (email, phone, etc.)
    2. Pointer NER for unstructured entities (person, company, etc.)
    3. Re-typing layer classifies entity roles in context
    """

    def __init__(self, hidden: int = 768):
        super().__init__()
        self.pointer_ner = PointerNER(hidden)
        self.retyping = RetypingLayer(hidden)

    def extract_regex(self, text: str) -> list[dict[str, Any]]:
        """Extract structured entities via regex patterns."""
        entities = []
        for etype, pattern in REGEX_PATTERNS.items():
            for match in pattern.finditer(text):
                entities.append({
                    "type": etype,
                    "text": match.group(),
                    "start_char": match.start(),
                    "end_char": match.end(),
                    "source": "regex",
                })
        return self._deduplicate_entities(entities)

    @staticmethod
    def _deduplicate_entities(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Remove overlapping regex matches, keeping the longest span."""
        if not entities:
            return entities
        # sort by start ascending, then by span length descending
        entities.sort(key=lambda e: (e["start_char"], -(e["end_char"] - e["start_char"])))
        deduped = [entities[0]]
        for ent in entities[1:]:
            prev = deduped[-1]
            if ent["start_char"] < prev["end_char"]:
                # overlapping — keep the longer span
                if (ent["end_char"] - ent["start_char"]) > (prev["end_char"] - prev["start_char"]):
                    deduped[-1] = ent
            else:
                deduped.append(ent)
        return deduped

    def process(self, encoded, text, **kwargs):
        encoder_output = encoded["encoder_output"]
        input_ids = encoded["input_ids"]
        _, tokenizer = SharedEncoder.load()
        tokens = encoder_output.last_hidden_state[0]  # (seq, hidden)
        cls = tokens[0]

        # 1. Regex entities
        regex_entities = self.extract_regex(text)

        # 2. Neural NER entities
        neural_entities = self.pointer_ner(tokens[1:-1])  # skip CLS/SEP

        # 3. Decode neural entities and re-type
        decoded_entities = []
        for ent in neural_entities:
            span_ids = input_ids[0, ent["start"] + 1 : ent["end"] + 1]
            span_text = tokenizer.decode(span_ids, skip_special_tokens=True).strip()
            if not span_text:
                continue

            # entity embedding = mean of span tokens
            span_embed = tokens[ent["start"] + 1 : ent["end"] + 1].mean(dim=0)

            # re-type in context
            role = self.retyping(span_embed, cls)
            primary_role = max(role, key=role.get)

            decoded_entities.append({
                "type": ent["type"],
                "text": span_text,
                "confidence": ent["confidence"],
                "role": primary_role,
                "role_scores": role,
                "source": "neural",
            })

        all_entities = regex_entities + decoded_entities
        all_entities.sort(key=lambda e: -e.get("confidence", 1.0))

        return {
            "entities": all_entities,
            "regex_count": len(regex_entities),
            "neural_count": len(decoded_entities),
            "types_found": list(set(e["type"] for e in all_entities)),
        }
