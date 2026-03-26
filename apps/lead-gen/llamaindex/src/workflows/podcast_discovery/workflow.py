"""Podcast Discovery Workflow — search Spotify for podcasts related to knowledge lessons."""

from llama_index.core.workflow import (
    Context,
    StartEvent,
    StopEvent,
    Workflow,
    step,
)

from .events import LessonsFetchedEvent, PodcastsFoundEvent, SearchPodcastEvent
from .spotify import get_access_token, search_podcasts


class PodcastDiscoveryWorkflow(Workflow):
    """Discover Spotify podcasts for each lesson in the knowledge DB."""

    @step
    async def fetch_lessons(self, ctx: Context, ev: StartEvent) -> LessonsFetchedEvent:
        """Load lessons from knowledge DB that don't have podcasts yet."""
        limit = ev.get("limit", 0)  # 0 = all lessons
        slug_filter = ev.get("slug", None)  # optional single-lesson filter

        from src.workflows.tech_knowledge.knowledge_db import get_knowledge_connection

        conn = get_knowledge_connection()
        with conn.cursor() as cur:
            if slug_filter:
                cur.execute(
                    """
                    SELECT l.id, l.slug, l.title, c.name AS category
                    FROM lessons l
                    JOIN categories c ON l.category_id = c.id
                    WHERE l.slug = %s
                    """,
                    [slug_filter],
                )
            else:
                # Find lessons that have fewer than 3 podcasts linked
                cur.execute(
                    """
                    SELECT l.id, l.slug, l.title, c.name AS category
                    FROM lessons l
                    JOIN categories c ON l.category_id = c.id
                    WHERE (
                        SELECT count(*) FROM podcasts p WHERE p.lesson_id = l.id
                    ) < 3
                    ORDER BY l.number
                    """
                    + (f" LIMIT {int(limit)}" if limit else ""),
                )
            lessons = [dict(row) for row in cur.fetchall()]
        conn.close()

        print(f"  Found {len(lessons)} lessons needing podcast discovery")
        await ctx.store.set("total_lessons", len(lessons))
        return LessonsFetchedEvent(lessons=lessons)

    @step
    async def fan_out_searches(
        self, ctx: Context, ev: LessonsFetchedEvent
    ) -> SearchPodcastEvent | PodcastsFoundEvent | None:
        """Get Spotify token and fan out one search per lesson."""
        lessons = ev.lessons
        if not lessons:
            await ctx.store.set("total_lessons", 0)
            return PodcastsFoundEvent(
                lesson_id="__skip__", lesson_slug="", podcasts=[]
            )

        print("  Authenticating with Spotify...")
        token = await get_access_token()

        for lesson in lessons:
            ctx.send_event(
                SearchPodcastEvent(lesson=lesson, access_token=token)
            )
        return None

    @step(num_workers=4)
    async def search_lesson_podcasts(
        self, ctx: Context, ev: SearchPodcastEvent
    ) -> PodcastsFoundEvent:
        """Search Spotify for podcasts related to one lesson."""
        lesson = ev.lesson
        title = lesson["title"]
        category = lesson["category"]

        # Build a targeted search query
        query = f"{title} {category} technology"
        print(f"  [{lesson['slug']}] Searching: {query}")

        try:
            results = await search_podcasts(
                query=query,
                access_token=ev.access_token,
                limit=3,
            )
        except Exception as e:
            print(f"  [{lesson['slug']}] Search failed: {e}")
            results = []

        # Score by relevance — prefer shows over individual episodes
        for r in results:
            r["relevance_score"] = 0.8 if r["type"] == "show" else 0.6

        print(f"  [{lesson['slug']}] Found {len(results)} podcasts")

        return PodcastsFoundEvent(
            lesson_id=str(lesson["id"]),
            lesson_slug=lesson["slug"],
            podcasts=results,
        )

    @step
    async def persist_podcasts(
        self, ctx: Context, ev: PodcastsFoundEvent
    ) -> StopEvent | None:
        """Collect all results and persist to knowledge DB."""
        total = await ctx.store.get("total_lessons")

        if total == 0:
            return StopEvent(
                result={
                    "lessons_processed": 0,
                    "podcasts_saved": 0,
                }
            )

        results = ctx.collect_events(ev, [PodcastsFoundEvent] * total)
        if results is None:
            return None

        # Filter skip sentinels
        valid = [r for r in results if r.lesson_id != "__skip__"]

        total_saved = 0
        try:
            from src.workflows.tech_knowledge.knowledge_db import (
                get_knowledge_connection,
            )

            conn = get_knowledge_connection()

            for result in valid:
                for podcast in result.podcasts:
                    _upsert_podcast(
                        conn,
                        lesson_id=result.lesson_id,
                        spotify_id=podcast["spotify_id"],
                        podcast_type=podcast["type"],
                        name=podcast["name"],
                        description=podcast.get("description", ""),
                        publisher=podcast.get("publisher", ""),
                        image_url=podcast.get("image_url"),
                        external_url=podcast.get("external_url", ""),
                        relevance_score=podcast.get("relevance_score", 0.5),
                    )
                    total_saved += 1

            conn.close()
        except Exception as e:
            print(f"  Error persisting podcasts: {e}")
            import traceback

            traceback.print_exc()

        print(f"\n  --- Podcast Discovery Summary ---")
        print(f"  Lessons processed: {len(valid)}")
        print(f"  Podcasts saved:    {total_saved}")

        return StopEvent(
            result={
                "lessons_processed": len(valid),
                "podcasts_saved": total_saved,
            }
        )


def _upsert_podcast(
    conn,
    lesson_id: str,
    spotify_id: str,
    podcast_type: str,
    name: str,
    description: str,
    publisher: str,
    image_url: str | None,
    external_url: str,
    relevance_score: float,
) -> None:
    """Insert or update a podcast recommendation."""
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO podcasts (
                lesson_id, spotify_id, type, name, description,
                publisher, image_url, external_url, relevance_score
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (spotify_id, lesson_id) DO UPDATE SET
                name = EXCLUDED.name,
                description = EXCLUDED.description,
                publisher = EXCLUDED.publisher,
                image_url = EXCLUDED.image_url,
                external_url = EXCLUDED.external_url,
                relevance_score = EXCLUDED.relevance_score,
                updated_at = now()
            """,
            [
                lesson_id,
                spotify_id,
                podcast_type,
                name,
                description,
                publisher,
                image_url,
                external_url,
                relevance_score,
            ],
        )
    conn.commit()
