"""Name disambiguation tests for research outputs.

Verifies that research profiles correctly disambiguate the target person
from others who may share similar names. Tests 1-3 use GEval with
deepseek as the judge model. Tests 4-5 use simple assertions on fixture
data.

Usage:
    pytest tests/test_name_disambiguation.py -v
    deepeval test run tests/test_name_disambiguation.py
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")


# ── 1. Bio mentions the person's organization ────────────────────────────


@skip_no_key
def test_bio_mentions_org(sample_bio, sample_person, deepeval_model):
    """Bio mentions the person's organization (LangChain) to disambiguate."""
    metric = GEval(
        name="Bio Mentions Organization",
        criteria=(
            f"The bio must explicitly mention the organization '{sample_person['org']}' "
            f"that the person '{sample_person['name']}' is associated with. The organization "
            "name should appear as a clear identifier that disambiguates this person from "
            "others who may share a similar name. A bio that omits the primary organization "
            "fails to establish who this specific person is. Score 1.0 if the organization "
            "is clearly named, 0.0 if it is absent or only vaguely alluded to."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=f"Write a bio for {sample_person['name']} that clearly identifies their organization.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio Mentions Organization score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 2. Bio mentions the person's role ─────────────────────────────────────


@skip_no_key
def test_bio_mentions_role(sample_bio, sample_person, deepeval_model):
    """Bio mentions the person's role (CEO) to disambiguate."""
    metric = GEval(
        name="Bio Mentions Role",
        criteria=(
            f"The bio must explicitly state the person's role or title, which is "
            f"'{sample_person['role']}'. The role serves as a critical disambiguator: "
            "knowing that this person is the CEO (or co-founder, or similar leadership "
            "title) of their organization separates them from other employees, contributors, "
            "or unrelated people with the same name. Score 1.0 if a specific leadership "
            "role or title is clearly stated, 0.0 if no role is mentioned."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=f"Write a bio for {sample_person['name']} that includes their professional role.",
        actual_output=sample_bio,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Bio Mentions Role score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 3. Timeline events reference the correct organization ────────────────


@skip_no_key
def test_timeline_org_consistent(sample_timeline, sample_person, deepeval_model):
    """Timeline events reference the correct organization consistently."""
    context = (
        f"Person: {sample_person['name']} (org: {sample_person['org']})\n\n"
        f"Timeline:\n{json.dumps(sample_timeline, indent=2)}"
    )
    metric = GEval(
        name="Timeline Org Consistency",
        criteria=(
            f"The timeline events should reference the correct organization "
            f"'{sample_person['org']}' or its directly related projects (e.g. LangGraph, "
            "LangSmith for LangChain). Events should not describe achievements, funding "
            "rounds, or milestones belonging to a different organization or a different "
            "person with a similar name. Every event must be plausibly attributable to "
            f"'{sample_person['name']}' at '{sample_person['org']}'. Score 1.0 if all "
            "events are consistent with the correct person and organization, 0.0 if any "
            "event clearly belongs to a different entity."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=f"Build a timeline for {sample_person['name']} at {sample_person['org']}.",
        actual_output=context,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Timeline Org Consistency score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 4. Contributions are relevant to this person's actual work ────────────


def test_contributions_relevant_to_person(sample_contributions, sample_person):
    """Contributions are about this person's actual work, not someone else's."""
    name = sample_person["name"]
    org = sample_person["org"]
    slug = sample_person["slug"]

    # Each contribution should reference the person's org or related projects
    org_lower = org.lower()
    slug_parts = set(slug.split("-"))

    for contrib in sample_contributions:
        title = contrib.get("title", "").lower()
        description = contrib.get("description", "").lower()
        url = contrib.get("url", "").lower()
        combined = f"{title} {description} {url}"

        # The contribution must mention the org, a known project name derived
        # from the org, or appear at a URL associated with the org/person.
        has_org_reference = org_lower in combined
        has_org_in_url = org_lower.replace(" ", "") in url or org_lower.replace(" ", "-") in url
        has_person_in_url = any(part in url for part in slug_parts if len(part) > 2)

        assert has_org_reference or has_org_in_url or has_person_in_url, (
            f"Contribution '{contrib.get('title')}' does not appear related to "
            f"{name} / {org}. Title: {contrib.get('title')}, URL: {contrib.get('url')}"
        )


# ── 5. Social profile URLs contain the person's username ──────────────────


def test_social_profiles_match_person(sample_social, sample_person):
    """Social URLs contain the person's username or name slug."""
    name = sample_person["name"]
    github_handle = sample_person.get("github", "")
    slug = sample_person["slug"]

    # Build a set of identifiers that should appear in at least some URLs
    identifiers = {s.lower() for s in [github_handle, slug] if s}
    # Also add name parts (e.g. "harrison", "chase")
    identifiers.update(part.lower() for part in name.split() if len(part) > 2)

    matched = 0
    total = 0

    for platform, url in sample_social.items():
        if not url:
            continue
        total += 1
        url_lower = url.lower()
        if any(ident in url_lower for ident in identifiers):
            matched += 1

    assert total > 0, "Social profile has no URLs to check."
    # At least half of the social URLs should contain a recognizable identifier
    ratio = matched / total
    assert ratio >= 0.5, (
        f"Only {matched}/{total} social URLs contain a recognizable identifier "
        f"for {name}. Identifiers checked: {identifiers}. "
        f"URLs: {json.dumps(sample_social, indent=2)}"
    )
