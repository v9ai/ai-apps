"""salescue/modules/company_classifier.py — Staffing/Recruitment Firm Detector

Embedding-based company classifier using the shared DeBERTa backbone.
Six scoring signals — semantic embeddings, keywords, name patterns,
URL signals, industry heuristics, and sigmoid calibration — combined
into a weighted composite.

Composite weights:
  semantic  50%  |  keywords  18%  |  name  10%
  url        7%  |  industry  15%  |  total 100%
"""

from __future__ import annotations

import math
import re
from typing import Any
from urllib.parse import urlparse

import torch
import torch.nn.functional as F

from ..backbone import SharedEncoder

# ── Staffing prototype sentences (20) ──────────────────────────────────────
# Encoded once and cached. Cosine similarity against company text gives
# a semantic staffing score. Covers: traditional staffing, RPO, exec search,
# temp agencies, IT/healthcare/contract staffing, nearshore, embedded, etc.

STAFFING_PROTOTYPES = [
    "We are a staffing and recruitment agency that places candidates in roles",
    "Our recruiting firm connects talent with employers across industries",
    "Temporary and permanent staffing solutions for businesses",
    "Executive headhunting and talent acquisition services",
    "We provide contract staffing, temp-to-hire, and direct placement",
    "Workforce solutions including payroll, compliance, and employee leasing",
    "Recruitment process outsourcing and managed staffing services",
    "Body leasing and IT staff augmentation for technology companies",
    "Connecting top talent with leading employers worldwide",
    "We specialize in IT staff augmentation and technology talent placement",
    # 11-20: new coverage
    "End-to-end recruitment process outsourcing handling everything from sourcing to onboarding",
    "Retained executive search firm specializing in C-suite and board-level placements",
    "Temporary employment agency providing short-term workers for seasonal and project-based demand",
    "IT staffing company providing software developers, data engineers, and cloud architects on contract",
    "Healthcare staffing agency supplying travel nurses, locum tenens physicians, and allied health professionals",
    "Contract staffing firm providing skilled professionals for fixed-term project engagements",
    "Nearshore staffing partner delivering Latin American software engineering talent to US companies",
    "On-demand talent marketplace matching vetted freelancers with enterprise project needs",
    "Embedded recruiting team that operates as an extension of your in-house talent acquisition function",
    "Industrial staffing provider placing warehouse, manufacturing, and logistics workers on demand",
]

# ── Non-staffing prototype sentences (15) ──────────────────────────────────
# High false-positive risk: these companies share vocabulary with staffing
# (candidates, talent, hiring, workforce) but are products/platforms/services.

NON_STAFFING_PROTOTYPES = [
    "We build AI-powered software products for enterprise customers",
    "Our SaaS platform helps companies manage their operations",
    "We provide custom software development and consulting services",
    "Open source developer tools and infrastructure platform",
    "Cloud computing and data analytics solutions provider",
    # 6-15: new coverage
    "Our HR technology platform automates employee onboarding, performance reviews, and benefits administration",
    "Applicant tracking system that helps hiring teams manage candidates through customizable recruitment pipelines",
    "Online job board where employers post openings and candidates search and apply for positions",
    "Career coaching and resume writing services helping professionals land their dream jobs",
    "Recruitment marketing platform that helps employers build talent pipelines through programmatic job advertising",
    "Employer branding agency helping companies attract top talent through compelling career stories and EVP development",
    "Human resources consultancy advising on organizational design, compensation strategy, and workforce planning",
    "Payroll processing and human resource information system for mid-market companies",
    "Employee background screening and identity verification platform for enterprise hiring compliance",
    "Corporate training and professional development platform delivering upskilling courses to employees",
]

# ── Keyword signals (4 tiers) ──────────────────────────────────────────────

VERY_STRONG_STAFFING_KEYWORDS = [
    "staffing agency", "recruitment agency", "temp agency", "employment agency",
    "staffing firm", "recruiting agency", "placement firm", "temporary staffing",
]

STRONG_STAFFING_KEYWORDS = [
    "staffing", "headhunting", "talent acquisition firm", "body leasing",
    "staff augmentation provider", "placement agency", "hiring platform",
    "recruitment consultancy", "talent agency", "manpower", "workforce",
    "outsourcing agency", "personnel agency", "BPO staffing",
    "contingent workforce", "managed services provider MSP",
    "vendor management", "employer of record", "EOR", "PEO",
    "professional employer organization", "outplacement",
    "onshore staffing", "offshore staffing", "nearshore staffing",
    "IT outsourcing", "resourcing", "talent pipeline",
    "permanent placement", "direct hire", "workforce solutions",
    "contract staffing",
]

MODERATE_STAFFING_KEYWORDS = [
    "recruiting", "recruiters", "talent solutions", "temp-to-hire",
    "direct placement", "RPO", "managed staffing", "talent pool",
    "candidate sourcing", "executive search", "career services",
    "talent marketplace", "talent network", "hiring solutions",
    "job matching", "freelance marketplace", "gig platform",
    "on-demand talent", "flexible workforce", "skill-based hiring",
    "people operations outsourcing", "human capital", "BPO",
    "talent management", "outsourcing",
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
    "HR software", "HRIS", "payroll software", "learning management",
    "employee engagement", "performance management",
    "talent analytics platform", "recruitment CRM",
    "job board", "applicant tracking",
]

# ── Industry lists (for dedicated industry field) ──────────────────────────

STAFFING_INDUSTRIES = {
    "staffing and recruiting", "human resources services",
    "employment services", "temporary help services", "personnel services",
}

ADJACENT_STAFFING_INDUSTRIES = {
    "human resources", "professional training & coaching",
    "outsourcing/offshoring", "management consulting",
}

ANTI_STAFFING_INDUSTRIES = {
    "computer software", "internet", "information technology and services",
    "financial services", "marketing and advertising", "e-learning",
    "computer hardware", "computer networking", "telecommunications",
    "computer games", "semiconductors",
}

# ── Name pattern lists ─────────────────────────────────────────────────────

NAME_DIRECT_PATTERNS = [
    "staffing", "recruiting", "recruitment", "personnel",
    "manpower", "temps", "workforce",
]
NAME_INDIRECT_PATTERNS = [
    "talent", "hire", "hiring", "placement", "search",
]
NAME_ANTI_PATTERNS = [
    "software", "tech", "labs", "ai", "platform", "cloud", "analytics",
]

# ── URL signal lists ───────────────────────────────────────────────────────

URL_STAFFING_INDICATORS = [
    "staffing", "recruit", "talent", "hire", "placement",
    "workforce", "manpower", "temps",
]
URL_ANTI_STAFFING_INDICATORS = [
    "software", "tech", "cloud", "app", "platform",
    "ai", "data", "analytics",
]

# ── Cached prototype embeddings ────────────────────────────────────────────

_staffing_embeds: torch.Tensor | None = None
_non_staffing_embeds: torch.Tensor | None = None
_center: torch.Tensor | None = None


def _get_prototype_embeds() -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Encode prototype sentences once with centering, cache for reuse."""
    global _staffing_embeds, _non_staffing_embeds, _center
    if _staffing_embeds is None:
        all_protos = STAFFING_PROTOTYPES + NON_STAFFING_PROTOTYPES
        _center = SharedEncoder.compute_center(all_protos, max_length=256)
        _staffing_embeds = SharedEncoder.encode_embeddings(
            STAFFING_PROTOTYPES, center=_center, max_length=256,
        )
        _non_staffing_embeds = SharedEncoder.encode_embeddings(
            NON_STAFFING_PROTOTYPES, center=_center, max_length=256,
        )
    return _staffing_embeds, _non_staffing_embeds, _center


# ── Scoring helpers ────────────────────────────────────────────────────────


def _calibrate_score(raw: float, k: float = 12.0, midpoint: float = 0.33) -> float:
    """Sigmoid calibration: maps clustered raw scores to spread-out probabilities."""
    return 1.0 / (1.0 + math.exp(-k * (raw - midpoint)))


def _compute_name_score(name: str) -> float:
    """Score based on company name patterns (higher signal density than description)."""
    name_lower = name.lower()
    direct_hits = [p for p in NAME_DIRECT_PATTERNS if re.search(rf"\b{p}\b", name_lower)]
    indirect_hits = [p for p in NAME_INDIRECT_PATTERNS if re.search(rf"\b{p}\b", name_lower)]
    anti_hits = [p for p in NAME_ANTI_PATTERNS if re.search(rf"\b{p}\b", name_lower)]

    score = 0.0
    if direct_hits:
        score = 0.8 + min(len(direct_hits) - 1, 2) * 0.1
        if indirect_hits:
            score += 0.05
    elif indirect_hits:
        score = 0.4 + min(len(indirect_hits) - 1, 2) * 0.1

    score -= len(anti_hits) * 0.3
    return max(0.0, min(1.0, score))


def _compute_url_score(website: str) -> float:
    """Score based on website domain patterns."""
    if not website:
        return 0.0
    try:
        domain = urlparse(website if "://" in website else f"https://{website}").hostname or ""
    except Exception:
        return 0.0

    domain_lower = domain.lower()
    score = 0.0
    for indicator in URL_STAFFING_INDICATORS:
        if indicator in domain_lower:
            score += 0.15
    for indicator in URL_ANTI_STAFFING_INDICATORS:
        if indicator in domain_lower:
            score -= 0.12
    return max(0.0, min(1.0, score))


def _compute_industry_score(industry: str, text_lower: str) -> tuple[float, list[str]]:
    """Tiered industry scoring. Returns (score, reasons)."""
    reasons: list[str] = []
    if not industry:
        return 0.0, reasons

    ind_lower = industry.lower().strip()

    if ind_lower in STAFFING_INDUSTRIES:
        reasons.append(f"Staffing industry: {industry}")
        return 1.0, reasons
    if ind_lower in ADJACENT_STAFFING_INDUSTRIES:
        reasons.append(f"Adjacent industry: {industry}")
        return 0.5, reasons
    if ind_lower in ANTI_STAFFING_INDUSTRIES:
        reasons.append(f"Non-staffing industry: {industry}")
        return -0.3, reasons

    return 0.0, reasons


# ── Main classifier ────────────────────────────────────────────────────────


def classify_company(
    name: str,
    description: str = "",
    website: str = "",
    location: str = "",
    industry: str = "",
) -> dict[str, Any]:
    """Classify whether a company is a staffing/recruitment firm.

    Six signals combined:
      semantic (50%) + keywords (18%) + name (10%) + url (7%) + industry (15%)
    Then sigmoid-calibrated for well-spread confidence values.

    Returns:
        {
            "is_staffing": bool,
            "confidence": float (calibrated, 0-1),
            "raw_score": float (pre-calibration composite),
            "reasons": list[str],
            "semantic_score": float,
            "keyword_score": float,
            "name_score": float,
            "url_score": float,
            "industry_score": float,
        }
    """
    # Build input text
    parts = [name]
    if description:
        parts.append(description)
    if website:
        domain = re.sub(r"https?://", "", website).split("/")[0]
        parts.append(f"Website: {domain}")
    text = " ".join(parts)
    text_lower = text.lower()

    reasons: list[str] = []

    # ── 1. Embedding-based semantic score (50%) ────────────────────────────
    staffing_embeds, non_staffing_embeds, center = _get_prototype_embeds()
    company_embed = SharedEncoder.encode_embeddings(
        text, center=center, max_length=256,
    )

    staffing_sims = F.cosine_similarity(company_embed, staffing_embeds)
    non_staffing_sims = F.cosine_similarity(company_embed, non_staffing_embeds)

    top_staffing = staffing_sims.topk(min(3, len(staffing_sims))).values.mean().item()
    top_non_staffing = non_staffing_sims.topk(min(3, len(non_staffing_sims))).values.mean().item()

    semantic_score = (top_staffing - top_non_staffing + 1) / 2
    semantic_score = max(0.0, min(1.0, semantic_score))

    if top_staffing > 0.7:
        reasons.append(f"High semantic similarity to staffing prototypes ({top_staffing:.2f})")
    elif top_staffing > 0.5:
        reasons.append(f"Moderate semantic similarity to staffing ({top_staffing:.2f})")

    # ── 2. Keyword score (18%) ─────────────────────────────────────────────
    keyword_score = 0.0

    very_strong_hits = [kw for kw in VERY_STRONG_STAFFING_KEYWORDS if kw in text_lower]
    strong_hits = [kw for kw in STRONG_STAFFING_KEYWORDS if kw in text_lower]
    moderate_hits = [kw for kw in MODERATE_STAFFING_KEYWORDS if kw in text_lower]
    anti_hits = [kw for kw in ANTI_STAFFING_KEYWORDS if kw in text_lower]

    keyword_score += len(very_strong_hits) * 0.25
    keyword_score += len(strong_hits) * 0.15
    keyword_score += len(moderate_hits) * 0.08
    keyword_score -= len(anti_hits) * 0.10
    keyword_score = max(0.0, min(1.0, keyword_score))

    if very_strong_hits:
        reasons.append(f"Very strong staffing keywords: {', '.join(very_strong_hits[:3])}")
    if strong_hits:
        reasons.append(f"Strong staffing keywords: {', '.join(strong_hits[:3])}")
    if moderate_hits:
        reasons.append(f"Moderate staffing signals: {', '.join(moderate_hits[:3])}")
    if anti_hits:
        reasons.append(f"Non-staffing signals: {', '.join(anti_hits[:3])}")

    # ── 3. Name pattern score (10%) ────────────────────────────────────────
    name_score = _compute_name_score(name)
    if name_score > 0.5:
        reasons.append(f"Company name contains staffing patterns (score={name_score:.2f})")
    elif name_score == 0.0 and any(re.search(rf"\b{p}\b", name.lower()) for p in NAME_ANTI_PATTERNS):
        reasons.append("Company name suggests non-staffing (tech/software)")

    # ── 4. URL signal score (7%) ───────────────────────────────────────────
    url_score = _compute_url_score(website)
    if url_score > 0:
        reasons.append(f"Website domain contains staffing indicators (score={url_score:.2f})")

    # ── 5. Industry score (15%) ────────────────────────────────────────────
    industry_score, industry_reasons = _compute_industry_score(industry, text_lower)
    # Normalize industry_score from [-0.3, 1.0] to [0, 1] for composite
    industry_normalized = max(0.0, min(1.0, (industry_score + 0.3) / 1.3))
    reasons.extend(industry_reasons)

    # ── 6. Composite + calibration ─────────────────────────────────────────
    composite = (
        semantic_score * 0.50
        + keyword_score * 0.18
        + name_score * 0.10
        + url_score * 0.07
        + industry_normalized * 0.15
    )
    composite = max(0.0, min(1.0, composite))

    calibrated = _calibrate_score(composite)
    is_staffing = calibrated >= 0.5

    if not reasons:
        reasons.append("No significant staffing signals detected")

    return {
        "is_staffing": is_staffing,
        "confidence": round(calibrated, 3),
        "raw_score": round(composite, 3),
        "reasons": reasons,
        "semantic_score": round(semantic_score, 3),
        "keyword_score": round(keyword_score, 3),
        "name_score": round(name_score, 3),
        "url_score": round(url_score, 3),
        "industry_score": round(industry_score, 3),
    }
