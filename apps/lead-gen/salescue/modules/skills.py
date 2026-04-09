"""salescue/modules/skills.py — Semantic skill extraction via cosine similarity.

Embeds post content using the shared DeBERTa-v3-base backbone and compares
against pre-computed embeddings of the canonical skill taxonomy (161 skills).
Returns top-K skills ranked by cosine similarity above a confidence threshold.

Skill taxonomy source of truth: src/schema/contracts/skill-taxonomy.ts,
exported to salescue/data/skill_taxonomy.json.
"""

import json
from pathlib import Path
from typing import Any

import torch
import torch.nn.functional as F

from ..base import BaseModule
from ..backbone import SharedEncoder, get_device


_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


class SkillExtractor(BaseModule):
    """Semantic skill extraction against the canonical taxonomy."""

    name = "skills"
    description = "Extract skills from text via cosine similarity against skill taxonomy"

    def __init__(self):
        super().__init__()

        # Load taxonomy
        taxonomy_path = _DATA_DIR / "skill_taxonomy.json"
        with open(taxonomy_path) as f:
            self._taxonomy: dict[str, str] = json.load(f)

        self._tags = list(self._taxonomy.keys())
        self._labels = list(self._taxonomy.values())

        # Pre-computed skill embeddings — lazily initialized on first call
        self._skill_embeds: torch.Tensor | None = None

    def _ensure_skill_embeds(self) -> torch.Tensor:
        """Pre-compute DeBERTa embeddings for all skill labels. Cached after first call."""
        if self._skill_embeds is not None:
            return self._skill_embeds

        device = get_device()
        encoded = SharedEncoder.encode_batch(self._labels, max_length=32)
        output = encoded["encoder_output"]

        # Mean pooling over token dimension with attention mask
        mask = encoded["attention_mask"]  # (n_skills, seq_len)
        last_hidden = output.last_hidden_state  # (n_skills, seq_len, hidden)

        mask_expanded = mask.unsqueeze(-1).float()  # (n_skills, seq_len, 1)
        summed = (last_hidden * mask_expanded).sum(dim=1)  # (n_skills, hidden)
        counts = mask_expanded.sum(dim=1).clamp(min=1e-9)  # (n_skills, 1)
        pooled = summed / counts  # (n_skills, hidden)

        # Restore original order if encode_batch sorted by length
        if "_original_order" in encoded:
            inv = encoded["_original_order"]
            pooled = pooled[inv]

        self._skill_embeds = F.normalize(pooled, p=2, dim=1).to(device)
        return self._skill_embeds

    def process(
        self,
        encoded: dict,
        text: str,
        top_k: int = 10,
        threshold: float = 0.35,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Extract skills from pre-encoded text.

        Args:
            encoded: Output from SharedEncoder.encode().
            text: Original text (unused, present for interface compliance).
            top_k: Maximum number of skills to return.
            threshold: Minimum cosine similarity to include.

        Returns:
            Dict with 'skills' list and 'skill_count'.
        """
        skill_embeds = self._ensure_skill_embeds()
        output = encoded["encoder_output"]
        mask = encoded["attention_mask"]

        # Mean-pool the post embedding
        last_hidden = output.last_hidden_state  # (1, seq_len, hidden)
        mask_expanded = mask.unsqueeze(-1).float()
        summed = (last_hidden * mask_expanded).sum(dim=1)
        counts = mask_expanded.sum(dim=1).clamp(min=1e-9)
        post_embed = F.normalize(summed / counts, p=2, dim=1)  # (1, hidden)

        # Cosine similarity against all skills
        sims = (post_embed @ skill_embeds.T).squeeze(0)  # (n_skills,)

        # Filter and sort
        above = (sims >= threshold).nonzero(as_tuple=True)[0]
        if len(above) == 0:
            return {"skills": [], "skill_count": 0}

        scores = sims[above]
        sorted_idx = scores.argsort(descending=True)[:top_k]
        selected = above[sorted_idx]

        skills = []
        for idx in selected.tolist():
            skills.append({
                "tag": self._tags[idx],
                "label": self._labels[idx],
                "confidence": round(sims[idx].item(), 4),
            })

        return {"skills": skills, "skill_count": len(skills)}
