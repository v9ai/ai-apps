"""Structural validation tests for video data in research output.

Tests video array schema, required fields, URL validity, and duration format.

Usage:
    pytest tests/test_eval_videos.py -v
"""

import re
from typing import Any

import pytest


VIDEO_REQUIRED_KEYS = ["title", "url", "platform"]


def test_videos_is_list(sample_research: dict[str, Any]):
    """Videos field must be a list."""
    assert isinstance(sample_research.get("videos", []), list)


@pytest.mark.parametrize("key", VIDEO_REQUIRED_KEYS)
def test_video_items_have_required_keys(sample_videos: list[dict], key: str):
    """Each video item must have required keys."""
    for idx, item in enumerate(sample_videos):
        assert key in item, f"videos[{idx}] missing key '{key}'"


def test_video_item_values_are_strings(sample_videos: list[dict]):
    """Required fields must be strings."""
    for idx, item in enumerate(sample_videos):
        for key in VIDEO_REQUIRED_KEYS:
            assert isinstance(item[key], str), (
                f"videos[{idx}]['{key}'] should be str, got {type(item[key])}"
            )


def test_video_urls_are_valid(sample_videos: list[dict]):
    """Video URLs must start with http(s)://."""
    for idx, item in enumerate(sample_videos):
        url = item.get("url", "")
        assert url.startswith("http://") or url.startswith("https://"), (
            f"videos[{idx}]['url'] should start with http(s):// — got '{url}'"
        )


def test_video_titles_not_empty(sample_videos: list[dict]):
    """Video titles must not be empty."""
    for idx, item in enumerate(sample_videos):
        assert item.get("title", "").strip(), (
            f"videos[{idx}]['title'] is empty"
        )


def test_video_durations_format(sample_videos: list[dict]):
    """Video durations should match MM:SS or H:MM:SS format if present."""
    duration_re = re.compile(r"^\d{1,2}:\d{2}(:\d{2})?$")
    for idx, item in enumerate(sample_videos):
        dur = item.get("duration", "")
        if dur:
            assert duration_re.match(dur), (
                f"videos[{idx}]['duration'] should be MM:SS or H:MM:SS — got '{dur}'"
            )


def test_no_duplicate_video_urls(sample_videos: list[dict]):
    """No duplicate video URLs."""
    urls = [v.get("url", "") for v in sample_videos if v.get("url")]
    assert len(urls) == len(set(urls)), "Duplicate video URLs found"
