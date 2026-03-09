#!/usr/bin/env python3
"""Synthesis completeness grader for Harbor eval framework.

Reads synthesis.md and checks:
  1. References to findings from each agent file (agent-01 through agent-06)
  2. Presence of key structural sections
  3. Cross-referencing depth between agent findings

Usage:
    OUTPUT_DIR=research-output/therapeutic python3 synthesis_completeness.py

Output (stdout): JSON  {"score": 0-1, "details": {...}}
"""

import json
import os
import re
import sys
from pathlib import Path

# Expected sections in a high-quality synthesis
EXPECTED_SECTIONS = [
    {
        "name": "executive_summary",
        "patterns": [
            r"(?i)executive\s+summary",
            r"(?i)key\s+insights",
            r"(?i)overview",
        ],
    },
    {
        "name": "cross_cutting_themes",
        "patterns": [
            r"(?i)cross[- ]cutting\s+themes?",
            r"(?i)common\s+themes?",
            r"(?i)recurring\s+patterns?",
        ],
    },
    {
        "name": "convergent_evidence",
        "patterns": [
            r"(?i)convergen(?:t|ce)\s+(?:evidence|findings?)",
            r"(?i)areas?\s+of\s+agreement",
            r"(?i)shared\s+findings?",
        ],
    },
    {
        "name": "tensions_tradeoffs",
        "patterns": [
            r"(?i)tensions?\s+(?:&|and)\s+trade[- ]?offs?",
            r"(?i)contradictions?",
            r"(?i)conflicts?\s+(?:and|or)\s+nuance",
            r"(?i)disagreements?",
        ],
    },
    {
        "name": "recommendations",
        "patterns": [
            r"(?i)recommend(?:ations?|ed)",
            r"(?i)patterns?\s+for",
            r"(?i)actionable",
            r"(?i)practical\s+(?:patterns?|implications?)",
        ],
    },
    {
        "name": "research_gaps",
        "patterns": [
            r"(?i)open\s+research\s+questions?",
            r"(?i)research\s+gaps?",
            r"(?i)future\s+(?:research|directions?|work)",
            r"(?i)unanswered\s+questions?",
        ],
    },
    {
        "name": "key_papers",
        "patterns": [
            r"(?i)must[- ]read\s+papers?",
            r"(?i)key\s+(?:papers?|references?|publications?)",
            r"(?i)recommended\s+reading",
            r"(?i)top\s+\d+\s+(?:papers?|references?)",
        ],
    },
]

# Agent subjects for reference checking
AGENT_SUBJECTS = {
    1: ["jitai", "adaptive intervention", "just-in-time", "micro-randomized"],
    2: ["n-of-1", "single-subject", "bayesian", "trial design"],
    3: ["implementation science", "feasibility", "cfir", "re-aim"],
    4: ["evidence synthesis", "meta-analysis", "grade", "systematic review"],
    5: ["digital phenotyping", "behavioral signal", "ema", "ecological momentary"],
    6: ["novel feature", "feature synthesis", "innovation", "platform design"],
}


def check_agent_references(synthesis_text: str, agent_files: list[Path]) -> dict:
    """Check if the synthesis references findings from each agent."""
    text_lower = synthesis_text.lower()
    results = {}

    for agent_id, keywords in AGENT_SUBJECTS.items():
        # Check for explicit agent references
        explicit_ref = bool(
            re.search(rf"agent\s*{agent_id}", text_lower)
            or re.search(rf"agent\s*0?{agent_id}", text_lower)
        )

        # Check for topical keywords from that agent's domain
        keyword_hits = sum(1 for kw in keywords if kw.lower() in text_lower)
        keyword_ratio = keyword_hits / len(keywords)

        # Agent is considered referenced if explicitly mentioned OR strong keyword overlap
        referenced = explicit_ref or keyword_ratio >= 0.5

        results[f"agent_{agent_id:02d}"] = {
            "explicit_reference": explicit_ref,
            "keyword_hits": keyword_hits,
            "keyword_total": len(keywords),
            "referenced": referenced,
        }

    return results


def check_sections(synthesis_text: str) -> dict:
    """Check for presence of expected structural sections."""
    results = {}
    for section in EXPECTED_SECTIONS:
        found = any(
            re.search(pattern, synthesis_text) for pattern in section["patterns"]
        )
        results[section["name"]] = found
    return results


def check_cross_references(synthesis_text: str) -> dict:
    """Check for cross-referencing between agent findings (integration depth)."""
    # Look for phrases that indicate cross-agent synthesis
    cross_ref_patterns = [
        r"(?i)agents?\s+\d+\s+(?:and|&)\s+\d+",
        r"(?i)(?:both|all|multiple)\s+agents?",
        r"(?i)converge(?:s|d|nt)?",
        r"(?i)complementary",
        r"(?i)(?:in\s+)?contrast(?:\s+to)?",
        r"(?i)building\s+on",
        r"(?i)(?:consistent|inconsistent)\s+with",
        r"(?i)reinforced?\s+by",
        r"(?i)tensions?\s+between",
    ]

    hits = {}
    for pattern in cross_ref_patterns:
        matches = re.findall(pattern, synthesis_text)
        if matches:
            hits[pattern] = len(matches)

    return {
        "cross_reference_types": len(hits),
        "total_cross_references": sum(hits.values()),
        "patterns_found": list(hits.keys()),
    }


def main():
    output_dir = Path(os.environ.get("OUTPUT_DIR", "research-output/therapeutic"))

    synthesis_path = output_dir / "synthesis.md"
    if not synthesis_path.exists():
        print(
            json.dumps(
                {
                    "score": 0,
                    "details": {"error": f"synthesis.md not found in {output_dir}"},
                }
            )
        )
        sys.exit(0)

    synthesis_text = synthesis_path.read_text(encoding="utf-8", errors="replace")
    word_count = len(synthesis_text.split())

    agent_files = sorted(output_dir.glob("agent-*.md"))

    # 1. Agent reference coverage
    agent_refs = check_agent_references(synthesis_text, agent_files)
    agents_referenced = sum(1 for v in agent_refs.values() if v["referenced"])
    total_agents = len(AGENT_SUBJECTS)
    agent_coverage_score = agents_referenced / max(total_agents, 1)

    # 2. Section completeness
    sections = check_sections(synthesis_text)
    sections_found = sum(1 for v in sections.values() if v)
    total_sections = len(EXPECTED_SECTIONS)
    section_score = sections_found / max(total_sections, 1)

    # 3. Cross-referencing depth
    cross_refs = check_cross_references(synthesis_text)
    # Target: >=5 cross-reference types, >=10 total cross-references
    type_score = min(cross_refs["cross_reference_types"] / 5, 1.0)
    count_score = min(cross_refs["total_cross_references"] / 10, 1.0)
    cross_ref_score = (type_score + count_score) / 2

    # 4. Length adequacy: synthesis should be substantive (>= 500 words)
    length_score = min(word_count / 500, 1.0)

    # Weighted composite
    composite = (
        agent_coverage_score * 0.35
        + section_score * 0.30
        + cross_ref_score * 0.20
        + length_score * 0.15
    )

    result = {
        "score": round(composite, 4),
        "details": {
            "word_count": word_count,
            "agents_referenced": agents_referenced,
            "total_agents": total_agents,
            "sections_found": sections_found,
            "total_sections": total_sections,
            "sub_scores": {
                "agent_coverage": round(agent_coverage_score, 4),
                "section_completeness": round(section_score, 4),
                "cross_reference_depth": round(cross_ref_score, 4),
                "length_adequacy": round(length_score, 4),
            },
            "agent_references": agent_refs,
            "sections": sections,
            "cross_references": cross_refs,
        },
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
