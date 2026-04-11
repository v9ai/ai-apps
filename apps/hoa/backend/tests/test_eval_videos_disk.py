"""Validate video data in on-disk research JSON files.

Tests video array quality across all research profiles that have videos.

Usage:
    pytest tests/test_eval_videos_disk.py -v
"""

import json
import re
from pathlib import Path

import pytest

RESEARCH_DIR = Path(__file__).resolve().parent.parent.parent / "src" / "lib" / "research"


def _load_profiles_with_videos() -> list[dict]:
    """Load all research profiles that contain a non-empty videos array."""
    profiles = []
    if not RESEARCH_DIR.exists():
        return profiles
    for path in sorted(RESEARCH_DIR.glob("*.json")):
        if path.name.endswith(".eval.json") or path.name.endswith("-timeline.json"):
            continue
        try:
            data = json.loads(path.read_text())
            if data.get("videos") and len(data["videos"]) > 0:
                profiles.append(data)
        except Exception:
            pass
    return profiles


@pytest.fixture
def profiles_with_videos():
    profiles = _load_profiles_with_videos()
    if not profiles:
        pytest.skip("No profiles with videos — run research_pipeline.py first")
    return profiles


def test_all_videos_have_titles(profiles_with_videos):
    """Every video across all profiles must have a non-empty title."""
    for profile in profiles_with_videos:
        for i, v in enumerate(profile["videos"]):
            assert v.get("title", "").strip(), (
                f"{profile['slug']} videos[{i}] has empty title"
            )


def test_all_videos_have_valid_urls(profiles_with_videos):
    """Every video must have a URL starting with http(s)://."""
    for profile in profiles_with_videos:
        for i, v in enumerate(profile["videos"]):
            url = v.get("url", "")
            assert url.startswith("http://") or url.startswith("https://"), (
                f"{profile['slug']} videos[{i}] invalid URL: '{url}'"
            )


def test_all_videos_have_platform(profiles_with_videos):
    """Every video must specify a platform."""
    for profile in profiles_with_videos:
        for i, v in enumerate(profile["videos"]):
            assert v.get("platform", "").strip(), (
                f"{profile['slug']} videos[{i}] missing platform"
            )


def test_no_duplicate_urls_per_profile(profiles_with_videos):
    """No profile should have duplicate video URLs."""
    for profile in profiles_with_videos:
        urls = [v.get("url", "") for v in profile["videos"] if v.get("url")]
        dupes = [u for u in urls if urls.count(u) > 1]
        assert not dupes, (
            f"{profile['slug']} has duplicate video URLs: {set(dupes)}"
        )


def test_youtube_urls_have_video_id(profiles_with_videos):
    """YouTube URLs should contain a valid 11-char video ID."""
    yt_re = re.compile(
        r"(?:youtu\.be/|youtube\.com/(?:watch\?v=|embed/|v/|shorts/))([a-zA-Z0-9_-]{11})"
    )
    for profile in profiles_with_videos:
        for i, v in enumerate(profile["videos"]):
            url = v.get("url", "")
            if "youtube.com" in url or "youtu.be" in url:
                assert yt_re.search(url), (
                    f"{profile['slug']} videos[{i}] YouTube URL missing video ID: '{url}'"
                )


def test_video_count_reasonable(profiles_with_videos):
    """Each profile should have between 1 and 20 videos."""
    for profile in profiles_with_videos:
        count = len(profile["videos"])
        assert 1 <= count <= 20, (
            f"{profile['slug']} has {count} videos — expected 1-20"
        )


def test_videos_mention_person_name(profiles_with_videos):
    """Each video's title, channel, or description should mention the person's name.

    This is a heuristic to catch obviously irrelevant videos — if the person's
    name (first, last, or full) doesn't appear anywhere in the video metadata,
    the video is likely not about them.
    """
    for profile in profiles_with_videos:
        name = profile.get("name", "")
        if not name:
            continue
        parts = name.lower().split()
        # Accept if any name part (first or last) appears in combined text
        for i, v in enumerate(profile["videos"]):
            combined = " ".join([
                v.get("title", ""),
                v.get("channel", ""),
                v.get("description", ""),
            ]).lower()
            found = any(part in combined for part in parts if len(part) > 2)
            assert found, (
                f"{profile['slug']} videos[{i}] ('{v.get('title', '')}') "
                f"does not mention '{name}' in title, channel, or description — "
                f"likely not relevant"
            )
