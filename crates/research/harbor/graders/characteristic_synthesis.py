#!/usr/bin/env python3
"""Characteristic synthesis completeness grader for Harbor eval framework.

Adapted from synthesis_completeness.py for characteristic research output.
Characteristic research produces 4 research tasks + 1 synthesis (not 6).

For CONCERN/NEED categories:
  Subjects: evidence-based-interventions, assessment-monitoring,
            family-strategies, developmental-trajectory

For STRENGTH category:
  Subjects: strength-leveraging, protective-factors,
            strength-development, cross-domain-transfer

Reads synthesis.md and checks:
  1. References to findings from each agent file (agent-01 through agent-04)
  2. Presence of key structural sections (category-dependent)
  3. Cross-referencing depth between agent findings

Usage:
    OUTPUT_DIR=research-output/characteristics/emotional-dysregulation \
        python3 characteristic_synthesis.py

Output (stdout): JSON  {"score": 0-1, "details": {...}}
"""

import json
import os
import re
import sys
from pathlib import Path

# --- Category detection ---

CONCERN_KEYWORDS = [
    "intervention",
    "evidence-based",
    "assessment",
    "monitoring",
    "family-strategies",
    "developmental-trajectory",
    "treatment",
    "clinical practice",
    "psychometric",
    "referral",
]

STRENGTH_KEYWORDS = [
    "strength leveraging",
    "strength-leveraging",
    "protective-factors",
    "protective factors",
    "strength-development",
    "strength development",
    "cross-domain-transfer",
    "cross-domain transfer",
    "broaden-and-build",
    "amplification",
]


def detect_category(text: str) -> str:
    """Auto-detect category from synthesis content.

    Returns 'concern' or 'strength' based on keyword density.
    """
    text_lower = text.lower()
    concern_hits = sum(1 for kw in CONCERN_KEYWORDS if kw in text_lower)
    strength_hits = sum(1 for kw in STRENGTH_KEYWORDS if kw in text_lower)

    if strength_hits > concern_hits:
        return "strength"
    return "concern"


# --- Expected sections by category ---

CONCERN_SECTIONS = [
    {
        "name": "bottom_line",
        "patterns": [
            r"(?i)bottom\s+line",
            r"(?i)key\s+takeaway",
            r"(?i)summary\s+for\s+(?:caregivers?|families)",
            r"(?i)at\s+a\s+glance",
        ],
    },
    {
        "name": "what_works",
        "patterns": [
            r"(?i)what\s+works",
            r"(?i)evidence[- ]based\s+interventions?",
            r"(?i)recommended\s+(?:treatments?|interventions?)",
            r"(?i)treatment\s+approaches?",
        ],
    },
    {
        "name": "how_to_track_progress",
        "patterns": [
            r"(?i)how\s+to\s+track\s+progress",
            r"(?i)progress\s+monitoring",
            r"(?i)assessment\s+(?:tools?|protocol)",
            r"(?i)measurement",
        ],
    },
    {
        "name": "family_action_plan",
        "patterns": [
            r"(?i)family\s+action\s+plan",
            r"(?i)action\s+(?:plan|steps?)",
            r"(?i)(?:concrete|practical)\s+steps?",
            r"(?i)(?:things?\s+to|steps?\s+to)\s+(?:start|do)\s+(?:this|now)",
        ],
    },
    {
        "name": "when_to_seek_help",
        "patterns": [
            r"(?i)when\s+to\s+seek\s+help",
            r"(?i)referral\s+triggers?",
            r"(?i)red\s+flags?",
            r"(?i)warning\s+signs?",
            r"(?i)professional\s+referral",
        ],
    },
    {
        "name": "key_papers",
        "patterns": [
            r"(?i)key\s+papers?",
            r"(?i)top\s+\d+\s+papers?",
            r"(?i)essential\s+(?:reading|references?)",
            r"(?i)recommended\s+reading",
            r"(?i)key\s+references?",
        ],
    },
]

STRENGTH_SECTIONS = [
    {
        "name": "amplification_plan",
        "patterns": [
            r"(?i)amplification\s+plan",
            r"(?i)strength\s+amplification",
            r"(?i)(?:concrete\s+)?activities?",
            r"(?i)leveraging\s+(?:plan|strategies?)",
            r"(?i)how\s+to\s+(?:leverage|amplify)",
        ],
    },
    {
        "name": "cross_domain_applications",
        "patterns": [
            r"(?i)cross[- ]domain\s+(?:applications?|transfer)",
            r"(?i)transfer\s+(?:across|to\s+other)\s+(?:domains?|areas?)",
            r"(?i)areas?\s+of\s+challenge",
            r"(?i)generalization",
        ],
    },
    {
        "name": "caregiver_actions",
        "patterns": [
            r"(?i)caregiver\s+actions?",
            r"(?i)things?\s+caregivers?\s+can\s+do",
            r"(?i)nurtur(?:e|ing)\s+this\s+strength",
            r"(?i)family\s+(?:actions?|strategies?|steps?)",
            r"(?i)parent(?:ing)?\s+(?:actions?|strategies?|steps?)",
        ],
    },
    {
        "name": "developmental_considerations",
        "patterns": [
            r"(?i)developmental\s+considerations?",
            r"(?i)sustaining\s+(?:through|across)\s+transitions?",
            r"(?i)age[- ](?:appropriate|related)",
            r"(?i)developmental\s+(?:stages?|transitions?)",
        ],
    },
]

# --- Agent subjects by category ---

CONCERN_AGENT_SUBJECTS = {
    1: [
        "intervention",
        "evidence-based",
        "systematic review",
        "meta-analysis",
        "treatment",
        "rct",
        "randomized",
        "clinical practice guideline",
    ],
    2: [
        "assessment",
        "monitoring",
        "psychometric",
        "screening",
        "measurement",
        "instrument",
        "validated",
        "observation protocol",
    ],
    3: [
        "family",
        "parent",
        "caregiver",
        "routine",
        "de-escalation",
        "communication",
        "parent management training",
        "burnout",
    ],
    4: [
        "trajectory",
        "developmental",
        "prognosis",
        "protective factor",
        "risk factor",
        "comorbidity",
        "longitudinal",
        "natural course",
    ],
}

STRENGTH_AGENT_SUBJECTS = {
    1: [
        "strength leveraging",
        "strength-based",
        "positive psychology",
        "solution-focused",
        "broaden-and-build",
        "therapeutic resource",
        "buffer",
    ],
    2: [
        "protective factor",
        "resilience",
        "adversity",
        "longitudinal",
        "risk factor",
        "cultivate",
        "interaction effect",
    ],
    3: [
        "enrichment",
        "deliberate practice",
        "scaffolding",
        "zone of proximal development",
        "talent development",
        "nurture",
    ],
    4: [
        "transfer",
        "cross-domain",
        "generalization",
        "self-efficacy",
        "mastery",
        "confidence",
        "identity",
    ],
}


def check_agent_references(synthesis_text: str, agent_subjects: dict) -> dict:
    """Check if the synthesis references findings from each agent."""
    text_lower = synthesis_text.lower()
    results = {}

    for agent_id, keywords in agent_subjects.items():
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


def check_sections(synthesis_text: str, expected_sections: list) -> dict:
    """Check for presence of expected structural sections."""
    results = {}
    for section in expected_sections:
        found = any(
            re.search(pattern, synthesis_text) for pattern in section["patterns"]
        )
        results[section["name"]] = found
    return results


def check_cross_references(synthesis_text: str) -> dict:
    """Check for cross-referencing between agent findings (integration depth)."""
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
        r"(?i)across\s+(?:all|the)\s+(?:research|findings?|agents?)",
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
    output_dir = Path(
        os.environ.get("OUTPUT_DIR", "research-output/characteristics")
    )

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

    # Auto-detect category from synthesis content
    category = detect_category(synthesis_text)

    # Select category-specific configuration
    if category == "strength":
        agent_subjects = STRENGTH_AGENT_SUBJECTS
        expected_sections = STRENGTH_SECTIONS
    else:
        agent_subjects = CONCERN_AGENT_SUBJECTS
        expected_sections = CONCERN_SECTIONS

    # 1. Agent reference coverage
    agent_refs = check_agent_references(synthesis_text, agent_subjects)
    agents_referenced = sum(1 for v in agent_refs.values() if v["referenced"])
    total_agents = len(agent_subjects)
    agent_coverage_score = agents_referenced / max(total_agents, 1)

    # 2. Section completeness
    sections = check_sections(synthesis_text, expected_sections)
    sections_found = sum(1 for v in sections.values() if v)
    total_sections = len(expected_sections)
    section_score = sections_found / max(total_sections, 1)

    # 3. Cross-referencing depth
    cross_refs = check_cross_references(synthesis_text)
    # Target: >=4 cross-reference types, >=8 total cross-references
    # (lower than therapeutic because 4 agents instead of 6)
    type_score = min(cross_refs["cross_reference_types"] / 4, 1.0)
    count_score = min(cross_refs["total_cross_references"] / 8, 1.0)
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
            "detected_category": category,
            "word_count": word_count,
            "agent_files_found": len(agent_files),
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
