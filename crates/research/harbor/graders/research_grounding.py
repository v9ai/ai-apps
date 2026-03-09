#!/usr/bin/env python3
"""Research grounding grader for Harbor eval framework.

Reads agent output files and evaluates how well claims are grounded:
  1. Claims near supporting citations (claim-to-citation proximity)
  2. Hedging language on uncertain claims
  3. Evidence-vs-opinion balance

Usage:
    OUTPUT_DIR=research-output/therapeutic python3 research_grounding.py

Output (stdout): JSON  {"score": 0-1, "details": {...}}
"""

import json
import os
import re
import sys
from pathlib import Path

# Patterns indicating a factual claim
CLAIM_INDICATORS = [
    r"(?i)(?:research|studies|evidence)\s+(?:shows?|suggests?|indicates?|demonstrates?|reveals?)",
    r"(?i)(?:findings?|results?|data)\s+(?:shows?|suggests?|indicates?|demonstrates?)",
    r"(?i)(?:has\s+been|was|were)\s+(?:shown|demonstrated|found|established|reported)",
    r"(?i)(?:according\s+to|based\s+on)\s+(?:research|studies|evidence|findings?)",
    r"(?i)\d+%\s+(?:of|increase|decrease|improvement|reduction)",
    r"(?i)(?:significant(?:ly)?|substantial(?:ly)?)\s+(?:improve|increase|decrease|reduce|effect)",
    r"(?i)(?:meta-analysis|systematic\s+review|randomized|RCT|trial)\s+(?:found|showed|demonstrated)",
]

# Citation markers (broad: author-year, DOI, numbers in brackets, etc.)
CITATION_MARKERS = [
    r"\([A-Z][a-z]+(?:\s+et\s+al\.?)?,?\s*\d{4}\)",  # (Author et al., 2024)
    r"\([A-Z][a-z]+\s+&\s+[A-Z][a-z]+,?\s*\d{4}\)",  # (Author & Author, 2024)
    r"\[\d+\]",  # [1], [23]
    r"(?:doi|DOI)[:\s]*10\.\d+",  # doi:10.xxxx
    r"(?:PMID|PubMed)[:\s]*\d+",  # PMID:12345
    r"arXiv[:\s]*\d{4}\.\d+",  # arXiv:2401.12345
]

# Hedging language for uncertain claims
HEDGING_PATTERNS = [
    r"(?i)\b(?:may|might|could|possibly|potentially|likely|unlikely)\b",
    r"(?i)\b(?:suggests?|appears?|seems?)\s+(?:to|that)",
    r"(?i)\b(?:preliminary|tentative|emerging|promising)\b",
    r"(?i)\b(?:further\s+research|more\s+research|needs?\s+(?:further\s+)?(?:investigation|study|research))\b",
    r"(?i)\b(?:limited\s+evidence|insufficient\s+data|inconclusive)\b",
    r"(?i)\b(?:it\s+is\s+(?:possible|plausible|conceivable)\s+that)\b",
    r"(?i)\b(?:one\s+(?:possible|potential)\s+(?:explanation|interpretation))\b",
]

# Unqualified strong claims (anti-pattern: claims without hedging or citation)
STRONG_CLAIM_PATTERNS = [
    r"(?i)\b(?:proves?|proven|definitively|unquestionably|undeniably|always|never)\b",
    r"(?i)\b(?:is\s+(?:the\s+)?(?:best|worst|only|most\s+effective))\b",
    r"(?i)\b(?:all\s+(?:research|studies|evidence)\s+(?:shows?|confirms?))\b",
]


def analyze_paragraph_grounding(paragraph: str) -> dict:
    """Analyze a paragraph for claim-citation proximity and hedging."""
    sentences = re.split(r"(?<=[.!?])\s+", paragraph)

    claim_count = 0
    citation_count = 0
    hedged_count = 0
    strong_claim_count = 0
    grounded_claims = 0  # claims with citation in same or adjacent sentence

    for i, sentence in enumerate(sentences):
        has_claim = any(re.search(p, sentence) for p in CLAIM_INDICATORS)
        has_citation = any(re.search(p, sentence) for p in CITATION_MARKERS)
        has_hedging = any(re.search(p, sentence) for p in HEDGING_PATTERNS)
        has_strong = any(re.search(p, sentence) for p in STRONG_CLAIM_PATTERNS)

        if has_claim:
            claim_count += 1
            # Check this sentence and neighbors for citations
            window = [sentence]
            if i > 0:
                window.append(sentences[i - 1])
            if i < len(sentences) - 1:
                window.append(sentences[i + 1])

            nearby_citation = any(
                re.search(p, s) for s in window for p in CITATION_MARKERS
            )
            if nearby_citation:
                grounded_claims += 1

        if has_citation:
            citation_count += 1
        if has_hedging:
            hedged_count += 1
        if has_strong:
            strong_claim_count += 1

    return {
        "sentences": len(sentences),
        "claims": claim_count,
        "citations": citation_count,
        "hedged_sentences": hedged_count,
        "strong_claims": strong_claim_count,
        "grounded_claims": grounded_claims,
    }


def score_file(filepath: Path) -> dict:
    """Score a single agent file for research grounding."""
    text = filepath.read_text(encoding="utf-8", errors="replace")

    # Split into paragraphs (skip code blocks)
    # Remove code blocks first
    text_no_code = re.sub(r"```[\s\S]*?```", "", text)
    paragraphs = [p.strip() for p in text_no_code.split("\n\n") if len(p.strip()) > 50]

    totals = {
        "sentences": 0,
        "claims": 0,
        "citations": 0,
        "hedged_sentences": 0,
        "strong_claims": 0,
        "grounded_claims": 0,
    }

    for para in paragraphs:
        analysis = analyze_paragraph_grounding(para)
        for key in totals:
            totals[key] += analysis[key]

    # Claim-to-citation grounding ratio
    grounding_ratio = (
        totals["grounded_claims"] / max(totals["claims"], 1)
        if totals["claims"] > 0
        else 1.0
    )

    # Hedging ratio: proportion of sentences with hedging (should be moderate, 10-40%)
    hedging_ratio = totals["hedged_sentences"] / max(totals["sentences"], 1)
    # Optimal hedging: 10-40% of sentences. Score drops if too little or too much.
    if hedging_ratio < 0.05:
        hedging_score = hedging_ratio / 0.05 * 0.5  # very little hedging
    elif hedging_ratio <= 0.40:
        hedging_score = 1.0  # ideal range
    else:
        hedging_score = max(0.5, 1.0 - (hedging_ratio - 0.40))  # too much hedging

    # Strong claim penalty: unqualified strong claims reduce score
    strong_penalty = min(totals["strong_claims"] * 0.05, 0.3)

    return {
        "file": filepath.name,
        "total_sentences": totals["sentences"],
        "total_claims": totals["claims"],
        "total_citations": totals["citations"],
        "grounded_claims": totals["grounded_claims"],
        "grounding_ratio": round(grounding_ratio, 4),
        "hedging_ratio": round(hedging_ratio, 4),
        "hedging_score": round(hedging_score, 4),
        "strong_claims": totals["strong_claims"],
        "strong_penalty": round(strong_penalty, 4),
    }


def main():
    output_dir = Path(os.environ.get("OUTPUT_DIR", "research-output/therapeutic"))

    if not output_dir.is_dir():
        print(
            json.dumps(
                {
                    "score": 0,
                    "details": {"error": f"Output directory not found: {output_dir}"},
                }
            )
        )
        sys.exit(0)

    agent_files = sorted(output_dir.glob("agent-*.md"))

    if not agent_files:
        print(
            json.dumps(
                {
                    "score": 0,
                    "details": {"error": "No agent output files found"},
                }
            )
        )
        sys.exit(0)

    file_scores = [score_file(f) for f in agent_files]

    # Aggregate
    avg_grounding = sum(fs["grounding_ratio"] for fs in file_scores) / len(file_scores)
    avg_hedging = sum(fs["hedging_score"] for fs in file_scores) / len(file_scores)
    total_strong_penalty = sum(fs["strong_penalty"] for fs in file_scores) / len(
        file_scores
    )

    # Files with at least some grounded claims
    files_with_claims = sum(1 for fs in file_scores if fs["total_claims"] > 0)
    claim_coverage = files_with_claims / len(file_scores)

    # Composite: grounding ratio is primary, hedging and penalty are modifiers
    raw_score = (
        avg_grounding * 0.50
        + avg_hedging * 0.25
        + claim_coverage * 0.25
    )
    composite = max(0.0, min(1.0, raw_score - total_strong_penalty))

    result = {
        "score": round(composite, 4),
        "details": {
            "avg_grounding_ratio": round(avg_grounding, 4),
            "avg_hedging_score": round(avg_hedging, 4),
            "avg_strong_penalty": round(total_strong_penalty, 4),
            "claim_coverage": round(claim_coverage, 4),
            "files_analyzed": len(file_scores),
            "sub_scores": {
                "grounding": round(avg_grounding, 4),
                "hedging": round(avg_hedging, 4),
                "coverage": round(claim_coverage, 4),
            },
            "per_file": file_scores,
        },
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
