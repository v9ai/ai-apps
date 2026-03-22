"""Video content data quality evaluation using deepeval's GEval metric.

Tests five dimensions of video data quality from LangGraph research output:
1. Titles — each video has a meaningful title
2. URLs — each video has a valid URL
3. Platform — each video specifies the platform
4. Descriptions — each video has a meaningful description
5. Relevance — each video actually features the person as speaker/guest

Usage:
    pytest tests/test_metric_geval_videos.py -v
    deepeval test run tests/test_metric_geval_videos.py
"""

import json
import os

import pytest
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

pytestmark = pytest.mark.deepeval
skip_no_key = pytest.mark.skipif(
    not os.getenv("DEEPSEEK_API_KEY"), reason="No DEEPSEEK_API_KEY"
)

THRESHOLD = 0.5
MODEL = "deepseek/deepseek-chat"


# -- Test 1: Videos have meaningful titles -------------------------------------


@skip_no_key
def test_videos_have_titles(sample_videos):
    """Each video must have a meaningful title."""
    test_case = LLMTestCase(
        input="Collect video appearances with titles for Harrison Chase",
        actual_output=json.dumps(sample_videos),
    )
    metric = GEval(
        name="Video Titles",
        criteria=(
            "Every video in the output must include a 'title' field "
            "that contains a meaningful, descriptive title for the video content. "
            "The title should sound like a real video title (e.g., 'Building AI Agents "
            "with LangGraph', 'Keynote: The Future of LLMs'). Generic labels like "
            "'untitled', 'video', or empty strings are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Video title score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 2: Videos have valid URLs --------------------------------------------


@skip_no_key
def test_videos_have_valid_urls(sample_videos):
    """Each video must have a valid URL."""
    test_case = LLMTestCase(
        input="Collect video appearances with URLs for Harrison Chase",
        actual_output=json.dumps(sample_videos),
    )
    metric = GEval(
        name="Video URLs",
        criteria=(
            "Every video in the output must include a 'url' field "
            "containing a valid-looking URL (starting with http:// or https://) "
            "that points to a video page, preferably on YouTube, Vimeo, or a "
            "conference site. Missing or empty URLs are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Video URL score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 3: Videos have platform specified ------------------------------------


@skip_no_key
def test_videos_have_platform(sample_videos):
    """Each video must specify the platform."""
    test_case = LLMTestCase(
        input="Collect video appearances with platform info for Harrison Chase",
        actual_output=json.dumps(sample_videos),
    )
    metric = GEval(
        name="Video Platform",
        criteria=(
            "Every video in the output must include a 'platform' field "
            "containing the name of the video platform (e.g., 'YouTube', 'Vimeo', "
            "'conference recording'). Empty strings or missing platform fields are "
            "not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Video platform score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 4: Videos have descriptions -----------------------------------------


@skip_no_key
def test_videos_have_descriptions(sample_videos):
    """Each video should have a meaningful description."""
    test_case = LLMTestCase(
        input="Collect video appearances with descriptions for Harrison Chase",
        actual_output=json.dumps(sample_videos),
    )
    metric = GEval(
        name="Video Descriptions",
        criteria=(
            "Every video in the output must include a 'description' field "
            "containing a meaningful description of the video content. The description "
            "should give context about what was discussed or presented. Empty strings "
            "or generic filler like 'a video' are not acceptable."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Video description score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )


# -- Test 5: Videos actually feature the person --------------------------------


@skip_no_key
def test_videos_feature_the_person(sample_videos, sample_research):
    """Each video must feature the person as speaker, guest, or presenter."""
    person_name = sample_research.get("name", "Harrison Chase")
    test_case = LLMTestCase(
        input=f"Collect videos where {person_name} is a speaker, guest, or presenter",
        actual_output=json.dumps(sample_videos),
    )
    metric = GEval(
        name="Video Person Relevance",
        criteria=(
            f"Every video in the output must feature '{person_name}' as a speaker, "
            f"guest, presenter, or interviewee — they must actually appear in the video. "
            f"Videos that merely mention, credit, or reference '{person_name}' in passing "
            f"are NOT acceptable. Third-party tutorials about the person's tools or "
            f"projects where the person does not appear are NOT acceptable. "
            f"The video title, channel, or description should make it clear that "
            f"'{person_name}' is a participant, not just a topic of discussion."
        ),
        evaluation_params=[LLMTestCaseParams.ACTUAL_OUTPUT],
        threshold=THRESHOLD,
        model=MODEL,
    )
    metric.measure(test_case)
    assert metric.score >= THRESHOLD, (
        f"Video relevance score {metric.score:.2f} < {THRESHOLD}. "
        f"Reason: {metric.reason}"
    )
