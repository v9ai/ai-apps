"""
Evals for the linkedin_contact graph.

Run:
    python -m src.graphs.linkedin_contact.evals

Three phases:
1. Hard structural assertions — required fields, types, classification correctness
2. Semantic assertions — focus areas match profile, regions detected correctly
3. deepeval GEval metrics — LLM-judged quality for analysis reasoning
"""

from __future__ import annotations

import json

from dotenv import load_dotenv

load_dotenv()

from .graph import build_linkedin_contact_graph
from .state import LinkedInContactState

# ---------------------------------------------------------------------------
# Mock LinkedIn profiles — 5 profiles covering relevant + irrelevant contacts
# ---------------------------------------------------------------------------

MOCK_PROFILES = [
    {
        "name": "AI recruiter focused on UK & EU",
        "linkedin_url": "https://www.linkedin.com/in/cosminatoderas/",
        "profile_name": "Cosmina Toderas",
        "headline": "AI, & ML hiring across the UK & EU",
        "about": (
            "I specialise in connecting top AI and Machine Learning talent with "
            "innovative companies across the UK and EU. With deep expertise in "
            "technical recruitment for ML engineers, data scientists, and AI "
            "researchers, I help startups and scale-ups build world-class AI teams. "
            "Currently focused on remote-first companies building LLMs, computer "
            "vision, and NLP products. If you're an AI engineer looking for your "
            "next role or a company looking to hire, let's connect!"
        ),
        "location": "London, UK",
        "expected_relevant": True,
        "expected_contact_type": "recruiter",
        "expected_focus_contains": ["AI", "ML"],
        "expected_regions_contains": ["UK", "EU"],
        "expected_min_score": 0.8,
    },
    {
        "name": "VP Engineering at EU AI startup",
        "linkedin_url": "https://www.linkedin.com/in/mock-vp-eng/",
        "profile_name": "Marcus Lindgren",
        "headline": "VP Engineering at Silo AI | Building Europe's largest private AI lab",
        "about": (
            "Leading engineering at Silo AI, the largest private AI lab in Europe. "
            "We build custom AI solutions and LLMs for enterprises. Our team of 300+ "
            "AI engineers works fully remotely across Finland, Sweden, and the EU. "
            "Always looking for talented ML engineers and research scientists. "
            "Previously at NVIDIA and DeepMind."
        ),
        "location": "Helsinki, Finland",
        "expected_relevant": True,
        "expected_contact_type": "hiring_manager",
        "expected_focus_contains": ["AI"],
        "expected_regions_contains": ["EU"],
        "expected_min_score": 0.7,
    },
    {
        "name": "Founder of AI recruitment agency",
        "linkedin_url": "https://www.linkedin.com/in/mock-founder-recruit/",
        "profile_name": "Sophie Chen",
        "headline": "Founder @ TalentAI | AI & Data Science Recruitment | EMEA",
        "about": (
            "Founded TalentAI to bridge the gap between exceptional AI talent and "
            "companies pushing the boundaries of machine learning. We place ML engineers, "
            "data scientists, AI researchers, and MLOps engineers across EMEA. "
            "Specialising in remote-first roles. Previously recruited for Google DeepMind "
            "and Hugging Face."
        ),
        "location": "Berlin, Germany",
        "expected_relevant": True,
        "expected_contact_type": "founder",
        "expected_focus_contains": ["AI"],
        "expected_regions_contains": ["EMEA"],
        "expected_min_score": 0.8,
    },
    {
        "name": "US-only sales recruiter (irrelevant)",
        "linkedin_url": "https://www.linkedin.com/in/mock-us-sales/",
        "profile_name": "Jake Morrison",
        "headline": "Sales Recruiter at Oracle | US West Coast",
        "about": (
            "Hiring for enterprise sales roles at Oracle across the US West Coast. "
            "Looking for Account Executives, SDRs, and Sales Engineers. "
            "All roles are hybrid based in Redwood City, CA or Austin, TX. "
            "US work authorization required."
        ),
        "location": "San Francisco, CA",
        "expected_relevant": False,
        "expected_contact_type": "other",
        "expected_focus_contains": [],
        "expected_regions_contains": [],
        "expected_min_score": 0.0,
    },
    {
        "name": "Marketing professional (irrelevant)",
        "linkedin_url": "https://www.linkedin.com/in/mock-marketing/",
        "profile_name": "Emma Watson",
        "headline": "Head of Marketing at FashionTech | B2C Growth",
        "about": (
            "Driving growth at FashionTech through performance marketing, brand "
            "strategy, and content. Previously at Zalando and ASOS. Passionate about "
            "sustainable fashion and e-commerce innovation. Based in London."
        ),
        "location": "London, UK",
        "expected_relevant": False,
        "expected_contact_type": "other",
        "expected_focus_contains": [],
        "expected_regions_contains": [],
        "expected_min_score": 0.0,
    },
]

VALID_CONTACT_TYPES = {"recruiter", "hiring_manager", "founder", "talent_partner", "other"}


# ---------------------------------------------------------------------------
# Hard assertions
# ---------------------------------------------------------------------------

def _assert_analysis(analysis: dict, profile: dict) -> None:
    """Structural and semantic assertions on analyze_profile output."""
    assert isinstance(analysis.get("is_relevant"), bool), "is_relevant must be a bool"
    assert analysis.get("contact_type") in VALID_CONTACT_TYPES, (
        f"{profile['name']}: invalid contact_type '{analysis.get('contact_type')}'"
    )
    assert isinstance(analysis.get("focus_areas"), list), "focus_areas must be a list"
    assert isinstance(analysis.get("regions"), list), "regions must be a list"
    assert isinstance(analysis.get("relevance_score"), (int, float)), "relevance_score must be numeric"
    assert 0.0 <= analysis["relevance_score"] <= 1.0, (
        f"{profile['name']}: relevance_score {analysis['relevance_score']} out of range"
    )
    assert isinstance(analysis.get("reason"), str) and len(analysis["reason"]) > 10, (
        f"{profile['name']}: reason must be a non-trivial string"
    )

    # Classification correctness
    assert analysis["is_relevant"] == profile["expected_relevant"], (
        f"{profile['name']}: expected is_relevant={profile['expected_relevant']}, "
        f"got {analysis['is_relevant']} — {analysis['reason']}"
    )

    # Score threshold
    if profile["expected_relevant"]:
        assert analysis["relevance_score"] >= profile["expected_min_score"], (
            f"{profile['name']}: expected score >= {profile['expected_min_score']}, "
            f"got {analysis['relevance_score']}"
        )

    # Focus areas for relevant contacts
    if profile["expected_focus_contains"]:
        captured_lower = {a.lower() for a in analysis["focus_areas"]}
        for area in profile["expected_focus_contains"]:
            assert any(area.lower() in a for a in captured_lower), (
                f"{profile['name']}: expected '{area}' in focus_areas, "
                f"got {analysis['focus_areas']}"
            )

    # Regions for relevant contacts
    if profile["expected_regions_contains"]:
        captured_lower = {r.lower() for r in analysis["regions"]}
        for region in profile["expected_regions_contains"]:
            assert any(region.lower() in r for r in captured_lower), (
                f"{profile['name']}: expected '{region}' in regions, "
                f"got {analysis['regions']}"
            )


def _assert_routing(result: dict, profile: dict) -> None:
    """Assert routing decision matches expected relevance."""
    if profile["expected_relevant"]:
        assert result.get("skipped") is False, (
            f"{profile['name']}: expected to save contact, but was skipped"
        )
    else:
        assert result.get("skipped") is True, (
            f"{profile['name']}: expected to skip, but was not skipped"
        )


# ---------------------------------------------------------------------------
# Build test cases
# ---------------------------------------------------------------------------

def build_test_cases() -> list:
    """Run graph on all mock profiles, assert hard constraints, return deepeval cases."""
    from deepeval.test_case import LLMTestCase

    graph = build_linkedin_contact_graph()
    test_cases: list[LLMTestCase] = []

    for profile in MOCK_PROFILES:
        print(f"\n  Running graph: {profile['name']} ...")
        init_state: LinkedInContactState = {
            "linkedin_url": profile["linkedin_url"],
            "name": profile["profile_name"],
            "headline": profile["headline"],
            "about": profile["about"],
            "location": profile["location"],
            "profile_analysis": None,
            "contact_id": None,
            "skipped": False,
        }

        result = graph.invoke(init_state)

        analysis = result["profile_analysis"]
        print(
            f"    relevant={analysis['is_relevant']} type={analysis['contact_type']} "
            f"score={analysis['relevance_score']} regions={analysis['regions']}"
        )
        print(f"    reason: {analysis['reason']}")
        print(f"    skipped={result['skipped']} contact_id={result.get('contact_id')}")

        # Phase 1 + 2: hard structural + semantic assertions
        _assert_analysis(analysis, profile)
        _assert_routing(result, profile)

        # deepeval — analysis quality
        test_cases.append(LLMTestCase(
            name=f"{profile['name']} — Analysis",
            input=(
                f"Name: {profile['profile_name']}\n"
                f"Headline: {profile['headline']}\n"
                f"Location: {profile['location']}\n"
                f"About: {profile['about']}"
            ),
            actual_output=json.dumps(analysis, indent=2),
            expected_output=json.dumps({
                "is_relevant": profile["expected_relevant"],
                "expected_contact_type": profile["expected_contact_type"],
                "expected_focus": profile["expected_focus_contains"],
                "expected_regions": profile["expected_regions_contains"],
            }),
        ))

    return test_cases


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    total = len(MOCK_PROFILES)
    relevant_count = sum(1 for p in MOCK_PROFILES if p["expected_relevant"])
    print(
        f"Running linkedin_contact graph on {total} mock profiles "
        f"({relevant_count} relevant, {total - relevant_count} irrelevant)...\n"
    )

    test_cases = build_test_cases()

    print(
        f"\nAll hard structural + semantic assertions passed "
        f"({total} profiles verified)."
    )

    # deepeval GEval metrics — deferred to avoid import-time OpenAI key requirement
    import os
    if not os.getenv("OPENAI_API_KEY"):
        print("OPENAI_API_KEY not set — skipping deepeval LLM-judged metrics.")
        return

    from deepeval import evaluate
    from deepeval.metrics import GEval
    from deepeval.test_case import LLMTestCaseParams

    analysis_quality_metric = GEval(
        name="Profile Analysis Quality",
        criteria=(
            "The analysis must accurately assess whether this LinkedIn profile belongs to "
            "someone relevant for an AI/ML job search in EU/UK. The contact_type must match "
            "the person's actual role. focus_areas must reflect technologies/domains actually "
            "mentioned in their profile. regions must match their geographic focus. "
            "The reason must cite specific evidence from the profile."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
            LLMTestCaseParams.EXPECTED_OUTPUT,
        ],
        threshold=0.7,
    )

    relevance_reasoning_metric = GEval(
        name="Relevance Reasoning",
        criteria=(
            "The reason field must provide a clear, evidence-based explanation for the "
            "is_relevant decision. For relevant contacts, it should mention their connection "
            "to AI/ML hiring and EU/UK region. For irrelevant contacts, it should explain "
            "why they don't match (wrong domain, wrong region, not hiring-related). "
            "Generic or vague reasons are poor quality."
        ),
        evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.65,
    )

    print(f"Running deepeval metrics: {len(test_cases)} cases...\n")
    evaluate(
        test_cases=test_cases,
        metrics=[analysis_quality_metric, relevance_reasoning_metric],
        run_async=True,
    )


if __name__ == "__main__":
    main()
