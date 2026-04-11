"""GEval-based social profile quality tests using custom criteria metrics.

Each test defines a distinct GEval criterion and evaluates the sample social
profile from conftest against it. Uses deepseek/deepseek-chat as the judge model.
"""

import json, os, pytest
from deepeval.test_case import LLMTestCase
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY")


# ── 1. Valid URLs ─────────────────────────────────────────────────────

@skip_no_key
def test_social_urls_valid(sample_social, deepeval_model):
    """All social URLs start with https://."""
    metric = GEval(
        name="Social URLs Valid",
        criteria=(
            "Every URL in the social profile must start with 'https://'. "
            "No URL should use plain 'http://' or omit the protocol entirely. "
            "Each value in the provided JSON object should be a fully qualified "
            "HTTPS URL. Score 1.0 only if every single URL begins with 'https://'."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Provide social media profile URLs for this person.",
        actual_output=json.dumps(sample_social, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Social URLs Valid score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 2. Covers major platforms ────────────────────────────────────────

@skip_no_key
def test_social_covers_major_platforms(sample_social, deepeval_model):
    """Social profile includes github, twitter, and linkedin at minimum."""
    metric = GEval(
        name="Social Major Platforms",
        criteria=(
            "The social profile JSON object must include keys for at least three "
            "major platforms: 'github', 'twitter', and 'linkedin'. Each of these "
            "keys must be present and have a non-empty URL value. Additional "
            "platforms (e.g. 'website', 'youtube') are welcome but not required. "
            "Score 1.0 if all three required platforms are present with valid URLs."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Provide social media profile URLs covering all major platforms for this person.",
        actual_output=json.dumps(sample_social, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Social Major Platforms score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 3. No placeholder URLs ──────────────────────────────────────────

@skip_no_key
def test_social_no_placeholder_urls(sample_social, deepeval_model):
    """No social URLs use placeholder or example.com domains."""
    metric = GEval(
        name="Social No Placeholders",
        criteria=(
            "None of the URLs in the social profile should be placeholder or "
            "dummy URLs. Specifically, no URL should contain 'example.com', "
            "'example.org', 'placeholder', 'test.com', 'yourname', 'username', "
            "or any domain that is clearly not a real social media profile. "
            "Every URL must point to a real, plausible social media domain such "
            "as github.com, x.com, twitter.com, linkedin.com, or a legitimate "
            "personal/company website. Score 1.0 only if all URLs use real domains."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Provide real social media profile URLs for this person, no placeholders.",
        actual_output=json.dumps(sample_social, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Social No Placeholders score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 4. Standard platform names ──────────────────────────────────────

@skip_no_key
def test_social_platform_names_standard(sample_social, deepeval_model):
    """Social profile keys use standard, recognized platform names."""
    metric = GEval(
        name="Social Standard Names",
        criteria=(
            "The keys in the social profile JSON object must use standard, "
            "widely recognized platform names. Acceptable key names include: "
            "'github', 'twitter', 'linkedin', 'website', 'youtube', 'mastodon', "
            "'bluesky', 'scholar', 'orcid', 'substack', and 'blog'. Keys should "
            "be lowercase, use no special characters, and not use non-standard "
            "abbreviations or misspellings (e.g. 'gh' instead of 'github', "
            "'li' instead of 'linkedin', 'tw' instead of 'twitter'). "
            "Score 1.0 if all keys follow standard naming conventions."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input="Provide social media profile URLs using standard platform key names.",
        actual_output=json.dumps(sample_social, indent=2),
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Social Standard Names score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )


# ── 5. URLs match person ────────────────────────────────────────────

@skip_no_key
def test_social_urls_match_person(sample_social, sample_person, deepeval_model):
    """Social URLs contain the person's name or username."""
    context = (
        f"Person: {sample_person['name']} (slug: {sample_person['slug']}, "
        f"github: {sample_person['github']})\n\n"
        f"Social profile:\n{json.dumps(sample_social, indent=2)}"
    )
    metric = GEval(
        name="Social URLs Match Person",
        criteria=(
            "The social profile URLs should plausibly belong to the person identified "
            "in the input. At least some of the URLs should contain the person's name, "
            "username, GitHub handle, or a recognizable variation thereof in the URL "
            "path. For example, a GitHub URL should include their GitHub username, a "
            "LinkedIn URL should include a slug resembling their name, and a website "
            "URL should relate to their known projects or company. URLs that are "
            "completely generic or clearly belong to a different person should score "
            "poorly. Score 1.0 if the URLs convincingly belong to the named person."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=0.5,
        model=deepeval_model,
    )
    test_case = LLMTestCase(
        input=f"Provide social media profile URLs for {sample_person['name']}.",
        actual_output=context,
    )
    metric.measure(test_case)
    assert metric.score >= metric.threshold, (
        f"Social URLs Match Person score {metric.score:.2f} below threshold {metric.threshold} — {metric.reason}"
    )
