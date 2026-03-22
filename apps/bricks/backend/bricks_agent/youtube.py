"""YouTube video metadata and transcript extraction."""

import re

import httpx
from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url: str) -> str:
    """Extract the 11-character video ID from various YouTube URL formats."""
    patterns = [
        r"(?:v=|/v/|youtu\.be/)([a-zA-Z0-9_-]{11})",
        r"(?:embed/)([a-zA-Z0-9_-]{11})",
        r"(?:shorts/)([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    raise ValueError(f"Cannot extract video ID from: {url}")


async def fetch_video_metadata(url: str) -> dict:
    """Fetch video metadata via YouTube oEmbed API."""
    video_id = extract_video_id(url)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://www.youtube.com/oembed",
            params={"url": f"https://www.youtube.com/watch?v={video_id}", "format": "json"},
        )
        resp.raise_for_status()
        data = resp.json()
    return {
        "video_id": video_id,
        "title": data.get("title", ""),
        "author": data.get("author_name", ""),
        "thumbnail_url": data.get("thumbnail_url", ""),
    }


def fetch_transcript(video_id: str) -> str:
    """Fetch and concatenate video transcript/captions."""
    ytt_api = YouTubeTranscriptApi()
    transcript = ytt_api.fetch(video_id)
    return " ".join(snippet.text for snippet in transcript)
