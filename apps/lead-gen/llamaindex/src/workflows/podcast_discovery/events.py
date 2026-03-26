"""Events for the podcast discovery workflow."""

from llama_index.core.workflow import Event


class LessonsFetchedEvent(Event):
    """Emitted after lessons are loaded from knowledge DB."""
    lessons: list[dict]  # [{"id", "slug", "title", "category"}, ...]


class SearchPodcastEvent(Event):
    """Fan-out event — one per lesson to search Spotify."""
    lesson: dict  # {"id", "slug", "title", "category"}
    access_token: str


class PodcastsFoundEvent(Event):
    """Emitted when podcasts are found for one lesson."""
    lesson_id: str
    lesson_slug: str
    podcasts: list[dict]  # [{"spotify_id", "type", "name", ...}, ...]
