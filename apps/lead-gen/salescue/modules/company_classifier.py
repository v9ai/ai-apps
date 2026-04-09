"""salescue/modules/company_classifier.py — Staffing/Recruitment Firm Detector

Embedding-based company classifier using the shared DeBERTa backbone.
Computes cosine similarity between company text and staffing/recruitment
prototype embeddings to detect recruitment agencies, staffing firms, and
body-leasing operations.

Unlike the TS keyword matcher, this uses contextual embeddings that capture
semantic similarity — "talent solutions" and "workforce management" score
high even without exact keyword matches.
"""

from __future__ import annotations

import os
import re
from typing import Any

import torch
import torch.nn.functional as F

from ..backbone import SharedEncoder

# ── Staffing prototype sentences ────────────────────────────────────────────
# These are encoded once and cached. Cosine similarity against company text
# embedding gives a semantic staffing score.

STAFFING_PROTOTYPES = [
    "We are a staffing and recruitment agency that places candidates in roles",
    "Our recruiting firm connects talent with employers across industries",
    "Temporary and permanent staffing solutions for businesses",
    "Executive headhunting and talent acquisition services",
    "We provide contract staffing, temp-to-hire, and direct placement",
    "Workforce solutions including payroll, compliance, and employee leasing",
    "Our job board connects job seekers with hiring companies",
    "Recruitment process outsourcing and managed staffing services",
    "Body leasing and IT staff augmentation for technology companies",
    "Connecting top talent with leading employers worldwide",
    "We specialize in IT staff augmentation and technology talent placement",
    "Global outsourcing and managed workforce solutions for enterprises",
    "Our agency provides temporary workers, seasonal employees, and on-demand labor",
    "Professional recruiting services for healthcare, finance, and engineering sectors",
    "Employer of record and payroll outsourcing for international hiring",
    "We match skilled contractors with project-based opportunities worldwide",
    "Talent acquisition as a service — embedded recruiters in your hiring team",
    "On-demand staffing platform connecting businesses with pre-vetted freelancers",
]

NON_STAFFING_PROTOTYPES = [
    "We build AI-powered software products for enterprise customers",
    "Our SaaS platform helps companies manage their operations",
    "We provide custom software development and consulting services",
    "Open source developer tools and infrastructure platform",
    "Cloud computing and data analytics solutions provider",
    "We develop machine learning infrastructure and AI deployment tools",
    "Our cybersecurity platform protects enterprise networks from threats",
    "Fintech company building payment processing and banking APIs",
    "Healthcare technology company with electronic medical records platform",
    "E-commerce platform helping merchants sell products online",
    "Developer tools company building CI/CD pipelines and DevOps automation",
    "EdTech platform offering online courses and learning management",
]

# ── Keyword signals (boost/penalize the embedding score) ────────────────────

STRONG_STAFFING_KEYWORDS = [
    "staffing", "recruitment agency", "recruiting firm", "headhunting",
    "talent acquisition firm", "employment agency", "temp agency",
    "body leasing", "staff augmentation provider", "placement agency",
    "job board", "hiring platform", "recruitment consultancy",
    "talent agency", "manpower", "workforce", "outsourcing agency",
    "personnel agency", "BPO staffing", "contingent workforce",
    "managed services provider MSP", "vendor management",
    "employer of record", "EOR", "PEO", "professional employer organization",
    "outplacement", "onshore staffing", "offshore staffing",
    "nearshore staffing", "IT outsourcing", "resourcing",
]

MODERATE_STAFFING_KEYWORDS = [
    "recruiting", "recruiters", "talent solutions", "workforce solutions",
    "contract staffing", "temp-to-hire", "direct placement", "RPO",
    "managed staffing", "talent pool", "candidate sourcing",
    "executive search", "career services",
    "talent marketplace", "talent network", "hiring solutions",
    "job matching", "freelance marketplace", "gig platform",
    "on-demand talent", "flexible workforce", "skill-based hiring",
    "recruitment technology", "applicant tracking",
    "HR tech for staffing", "people operations outsourcing",
]

ANTI_STAFFING_KEYWORDS = [
    "our product", "our platform", "we build", "our software",
    "saas", "open source", "developer tools", "AI-powered",
    "machine learning platform", "founded by engineers",
    "our API", "our SDK", "infrastructure", "data platform",
    "analytics platform", "cloud platform", "developer experience",
    "engineering team", "R&D", "research lab", "open-source",
    "self-hosted", "on-premise", "our customers use",
    "built for developers", "ML platform", "AI research",
]

# ── Cached prototype embeddings ─────────────────────────────────────────────
# Embeddings are produced via backbone.encode_embeddings() which applies
# centering + L2 normalization to break DeBERTa's anisotropy problem.
# The centering vector is computed once from ALL prototypes (staffing +
# non-staffing combined) so that the "common direction" is removed.

_staffing_embeds: torch.Tensor | None = None
_non_staffing_embeds: torch.Tensor | None = None
_center: torch.Tensor | None = None


def _get_prototype_embeds() -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Encode prototype sentences once with centering, cache for reuse.

    Returns:
        (staffing_embeds, non_staffing_embeds, center) — staffing/non-staffing
        are L2-normalized on the unit sphere; center is the raw centroid for
        reuse when encoding new company texts.
    """
    global _staffing_embeds, _non_staffing_embeds, _center
    if _staffing_embeds is None:
        # Compute centering vector from ALL prototypes combined
        all_protos = STAFFING_PROTOTYPES + NON_STAFFING_PROTOTYPES
        _center = SharedEncoder.compute_center(all_protos, max_length=256)

        # Encode each set with the shared center
        _staffing_embeds = SharedEncoder.encode_embeddings(
            STAFFING_PROTOTYPES, center=_center, max_length=256,
        )
        _non_staffing_embeds = SharedEncoder.encode_embeddings(
            NON_STAFFING_PROTOTYPES, center=_center, max_length=256,
        )

    return _staffing_embeds, _non_staffing_embeds, _center


def classify_company(
    name: str,
    description: str = "",
    website: str = "",
    location: str = "",
) -> dict[str, Any]:
    """Classify whether a company is a staffing/recruitment firm.

    Returns:
        {
            "is_staffing": bool,
            "confidence": float (0-1),
            "reasons": list[str],
            "semantic_score": float,
            "keyword_score": float,
        }
    """
    # Build input text
    parts = [name]
    if description:
        parts.append(description)
    if website:
        # Extract domain for context
        domain = re.sub(r"https?://", "", website).split("/")[0]
        parts.append(f"Website: {domain}")
    text = " ".join(parts)
    text_lower = text.lower()

    reasons: list[str] = []

    # ── 1. Embedding-based semantic score ───────────────────────────────────
    # Uses centered + L2-normalized embeddings from the backbone to get
    # discriminative cosine similarities (not the ~0.95 anisotropic mush).
    staffing_embeds, non_staffing_embeds, center = _get_prototype_embeds()
    company_embed = SharedEncoder.encode_embeddings(
        text, center=center, max_length=256,
    )  # [1, hidden], L2-normalized

    # Cosine similarity against staffing and non-staffing prototypes
    # Since both sides are L2-normalized, this is just a dot product.
    staffing_sims = F.cosine_similarity(company_embed, staffing_embeds)  # [N]
    non_staffing_sims = F.cosine_similarity(company_embed, non_staffing_embeds)  # [M]

    # Use top-3 average for robustness
    top_staffing = staffing_sims.topk(min(3, len(staffing_sims))).values.mean().item()
    top_non_staffing = non_staffing_sims.topk(min(3, len(non_staffing_sims))).values.mean().item()

    # Semantic score: how much more staffing-like than non-staffing
    semantic_score = (top_staffing - top_non_staffing + 1) / 2  # normalize to 0-1
    semantic_score = max(0.0, min(1.0, semantic_score))

    if top_staffing > 0.7:
        reasons.append(f"High semantic similarity to staffing prototypes ({top_staffing:.2f})")
    elif top_staffing > 0.5:
        reasons.append(f"Moderate semantic similarity to staffing ({top_staffing:.2f})")

    # ── 2. Keyword boost/penalty ────────────────────────────────────────────
    keyword_score = 0.0

    strong_hits = [kw for kw in STRONG_STAFFING_KEYWORDS if kw in text_lower]
    moderate_hits = [kw for kw in MODERATE_STAFFING_KEYWORDS if kw in text_lower]
    anti_hits = [kw for kw in ANTI_STAFFING_KEYWORDS if kw in text_lower]

    keyword_score += len(strong_hits) * 0.15
    keyword_score += len(moderate_hits) * 0.08
    keyword_score -= len(anti_hits) * 0.10
    keyword_score = max(0.0, min(1.0, keyword_score))

    if strong_hits:
        reasons.append(f"Strong staffing keywords: {', '.join(strong_hits[:3])}")
    if moderate_hits:
        reasons.append(f"Moderate staffing signals: {', '.join(moderate_hits[:3])}")
    if anti_hits:
        reasons.append(f"Non-staffing signals: {', '.join(anti_hits[:3])}")

    # ── 3. Industry name heuristic ──────────────────────────────────────────
    industry_boost = 0.0
    staffing_industries = [
        "staffing and recruiting", "human resources", "employment services",
        "temporary help services", "personnel services",
    ]
    for ind in staffing_industries:
        if ind in text_lower:
            industry_boost = 0.20
            reasons.append(f"Industry match: {ind}")
            break

    # ── 4. Composite score ──────────────────────────────────────────────────
    # Weighted combination: embeddings (60%) + keywords (25%) + industry (15%)
    composite = (semantic_score * 0.60) + (keyword_score * 0.25) + (industry_boost * 0.15)
    composite = max(0.0, min(1.0, composite))

    is_staffing = composite >= 0.38

    if not reasons:
        reasons.append("No significant staffing signals detected")

    return {
        "is_staffing": is_staffing,
        "confidence": round(composite, 3),
        "reasons": reasons,
        "semantic_score": round(semantic_score, 3),
        "keyword_score": round(keyword_score, 3),
    }
