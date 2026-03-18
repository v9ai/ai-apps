"""Tech Knowledge Workflow — LlamaIndex Workflows equivalent of the LangGraph StateGraph."""

import json
import os

from llama_index.core.llms import ChatMessage
from llama_index.core.workflow import (
    Context,
    StartEvent,
    StopEvent,
    Workflow,
    step,
)

from src.config import get_llm_json, get_llm_text
from .events import (
    ContentGeneratedEvent,
    GenerateContentEvent,
    HierarchyOrganizedEvent,
    SourceFetchedEvent,
    TechnologiesExtractedEvent,
)
from .prompts import EXTRACT_TECHNOLOGIES_SYSTEM, GENERATE_CONTENT_SYSTEM
from .taxonomy import get_category_for_tag, get_label_for_tag, make_cat_slug, make_lesson_slug, normalize_tag


class TechKnowledgeWorkflow(Workflow):
    """Extract technologies from a JD and generate study material for each."""

    @step
    async def fetch_source(self, ctx: Context, ev: StartEvent) -> SourceFetchedEvent:
        """Fetch the job description text (already passed via StartEvent)."""
        jd = ev.job_description
        application_id = ev.application_id
        job_title = ev.job_title
        company_name = ev.company_name
        dry_run = ev.get("dry_run", False)
        exclude_tags = ev.get("exclude_tags", [])

        # Store for later steps
        await ctx.store.set("application_id", application_id)
        await ctx.store.set("job_title", job_title)
        await ctx.store.set("company_name", company_name)
        await ctx.store.set("dry_run", dry_run)
        await ctx.store.set("exclude_tags", exclude_tags)

        print(f"  Source: {len(jd)} chars from application #{application_id}")
        return SourceFetchedEvent(source_text=jd)

    @step
    async def extract_technologies(self, ctx: Context, ev: SourceFetchedEvent) -> TechnologiesExtractedEvent:
        """Use LLM to extract technologies from the job description."""
        job_title = await ctx.store.get("job_title")
        company_name = await ctx.store.get("company_name")
        application_id = await ctx.store.get("application_id")

        llm = get_llm_json()
        messages = [
            ChatMessage(role="system", content=EXTRACT_TECHNOLOGIES_SYSTEM),
            ChatMessage(
                role="user",
                content=(
                    f"Job title: {job_title}\n"
                    f"Company: {company_name}\n\n"
                    f"{ev.source_text[:4000]}"
                ),
            ),
        ]

        response = await llm.achat(messages)
        try:
            raw = json.loads(response.message.content)
            raw_techs = raw.get("technologies", [])
        except (json.JSONDecodeError, KeyError):
            raw_techs = []

        # Normalize to canonical tags
        technologies = []
        seen_tags: set[str] = set()
        for item in raw_techs:
            name = item.get("name", "") if isinstance(item, dict) else str(item)
            relevance = item.get("relevance", "secondary") if isinstance(item, dict) else "secondary"

            tag = normalize_tag(name)
            if tag and tag not in seen_tags:
                seen_tags.add(tag)
                technologies.append({
                    "tag": tag,
                    "label": get_label_for_tag(tag),
                    "category": get_category_for_tag(tag),
                    "relevance": relevance,
                })

        print(f"  Extracted {len(technologies)} technologies: {', '.join(t['label'] for t in technologies)}")

        # Save extracted tech list back to the application
        _save_tech_stack_to_app(application_id, technologies)

        # Store for stats
        await ctx.store.set("technologies", technologies)

        return TechnologiesExtractedEvent(technologies=technologies)

    @step
    async def organize_hierarchy(self, ctx: Context, ev: TechnologiesExtractedEvent) -> HierarchyOrganizedEvent:
        """Deduplicate, filter excluded tags, organize by category.

        All DB writes use upserts, so we never skip existing lessons —
        re-running the workflow refreshes content for the new job context.
        """
        technologies = ev.technologies
        exclude_tags = set(await ctx.store.get("exclude_tags") or [])

        # Filter out explicitly excluded tags
        if exclude_tags:
            excluded = [t["label"] for t in technologies if t["tag"] in exclude_tags]
            technologies = [t for t in technologies if t["tag"] not in exclude_tags]
            if excluded:
                print(f"  Excluded by user: {', '.join(excluded)}")

        print(f"  Will generate content for {len(technologies)} technologies")

        technologies.sort(key=lambda t: (0 if t["relevance"] == "primary" else 1, t["category"], t["tag"]))

        return HierarchyOrganizedEvent(organized=technologies)

    @step
    async def fan_out_technologies(self, ctx: Context, ev: HierarchyOrganizedEvent) -> GenerateContentEvent | ContentGeneratedEvent | None:
        """Fan out content generation, one per technology."""
        organized = ev.organized
        job_title = await ctx.store.get("job_title")
        company_name = await ctx.store.get("company_name")

        if not organized:
            # No new techs to generate — skip straight to persist
            await ctx.store.set("num_techs", 0)
            return ContentGeneratedEvent(
                tag="__skip__", label="", category="", slug="",
                title="", content="", word_count=0, subtopics=[],
            )

        await ctx.store.set("num_techs", len(organized))
        all_labels = [t["label"] for t in organized]

        for tech in organized:
            ctx.send_event(GenerateContentEvent(
                tech=tech,
                job_title=job_title,
                company_name=company_name,
                job_description="",
                all_techs=all_labels,
            ))
        return None

    @step(num_workers=4)
    async def generate_content(self, ctx: Context, ev: GenerateContentEvent) -> ContentGeneratedEvent:
        """Generate a study lesson for one technology — runs in parallel."""
        tech = ev.tech
        job_title = ev.job_title
        company_name = ev.company_name
        all_techs = ev.all_techs

        related_str = ", ".join(t for t in all_techs if t != tech["label"])

        llm = get_llm_text()
        messages = [
            ChatMessage(role="system", content=GENERATE_CONTENT_SYSTEM),
            ChatMessage(
                role="user",
                content=(
                    f"Technology: {tech['label']}\n"
                    f"Category: {tech['category']}\n"
                    f"Interview for: {job_title} at {company_name}\n"
                    f"Other technologies in this role's stack: {related_str}\n\n"
                    f"Job description:\n{ev.job_description[:2000]}"
                ),
            ),
        ]

        response = await llm.achat(messages)
        content = response.message.content.strip()
        word_count = len(content.split())

        subtopics = []
        for line in content.split("\n"):
            if line.startswith("## "):
                subtopics.append(line[3:].strip())

        print(f"  [{tech['tag']}] Generated {word_count} words, {len(subtopics)} sections")

        return ContentGeneratedEvent(
            tag=tech["tag"],
            label=tech["label"],
            category=tech["category"],
            slug=make_lesson_slug(tech["tag"]),
            title=tech["label"],
            content=content,
            word_count=word_count,
            subtopics=subtopics,
        )

    @step
    async def persist_to_knowledge(self, ctx: Context, ev: ContentGeneratedEvent) -> StopEvent | None:
        """Collect all generated content and persist to knowledge DB."""
        num_techs = await ctx.store.get("num_techs")

        # Skip sentinel — no techs to generate
        if num_techs == 0:
            technologies = await ctx.store.get("technologies") or []
            return StopEvent(result={
                "technologies_extracted": len(technologies),
                "content_generated": 0,
                "lessons_persisted": 0,
                "concepts_created": 0,
                "edges_created": 0,
                "technologies": technologies,
                "generated": [],
            })

        results = ctx.collect_events(ev, [ContentGeneratedEvent] * num_techs)
        if results is None:
            return None

        # Filter out skip sentinels
        generated = [
            r for r in results if r.tag != "__skip__"
        ]

        dry_run = await ctx.store.get("dry_run")
        application_id = await ctx.store.get("application_id")
        job_title = await ctx.store.get("job_title")
        technologies = await ctx.store.get("technologies") or []

        stats = {
            "technologies_extracted": len(technologies),
            "content_generated": len(generated),
            "lessons_persisted": 0,
            "concepts_created": 0,
            "edges_created": 0,
            "technologies": technologies,
            "generated": [
                {"tag": g.tag, "label": g.label, "category": g.category,
                 "slug": g.slug, "title": g.title, "content": g.content,
                 "word_count": g.word_count, "subtopics": g.subtopics}
                for g in generated
            ],
        }

        if not generated:
            print("  No new content to persist.")
            return StopEvent(result=stats)

        if dry_run:
            print(f"\n  [DRY RUN] Would persist {len(generated)} lessons:")
            for g in generated:
                print(f"    - {g.label} ({g.category}) — {g.word_count} words")
            return StopEvent(result=stats)

        try:
            from .knowledge_db import (
                get_knowledge_connection,
                get_max_lesson_number,
                get_max_sort_order,
                upsert_category,
                upsert_concept,
                upsert_concept_edge,
                upsert_lesson,
                upsert_lesson_concept,
            )
            from .taxonomy import TECH_CATEGORIES

            conn = get_knowledge_connection()
        except Exception as e:
            print(f"  Error connecting to knowledge DB: {e}")
            return StopEvent(result=stats)

        try:
            next_lesson_num = get_max_lesson_number(conn) + 1
            next_sort_order = get_max_sort_order(conn) + 1

            category_ids: dict[str, int] = {}
            category_lesson_ranges: dict[str, list[int]] = {}
            category_concept_ids: dict[str, str] = {}

            # Ensure all needed categories exist
            for g in generated:
                cat_name = g.category
                if cat_name not in category_ids:
                    cat_meta = TECH_CATEGORIES.get(cat_name, {})
                    cat_slug = make_cat_slug(cat_name)
                    cat_id = upsert_category(
                        conn, name=cat_name, slug=cat_slug,
                        icon=cat_meta.get("icon", "&#x1f4da;"),
                        description=cat_meta.get("description", f"Technologies in {cat_name}"),
                        gradient_from=cat_meta.get("gradient_from", "#6366f1"),
                        gradient_to=cat_meta.get("gradient_to", "#818cf8"),
                        sort_order=next_sort_order,
                        lesson_range_lo=next_lesson_num,
                        lesson_range_hi=next_lesson_num,
                    )
                    category_ids[cat_name] = cat_id
                    category_lesson_ranges[cat_name] = []
                    next_sort_order += 1

                    concept_id = upsert_concept(
                        conn, name=cat_name,
                        description=TECH_CATEGORIES.get(cat_name, {}).get("description"),
                        concept_type="topic",
                        metadata={"source": "nomadically", "level": "category"},
                    )
                    category_concept_ids[cat_name] = concept_id
                    stats["concepts_created"] += 1

            # Process each generated lesson
            for g in generated:
                lesson_num = next_lesson_num
                next_lesson_num += 1
                category_lesson_ranges.setdefault(g.category, []).append(lesson_num)

                lesson_id = upsert_lesson(
                    conn, slug=g.slug, number=lesson_num, title=g.title,
                    category_id=category_ids[g.category], content=g.content,
                    word_count=g.word_count,
                    summary=f"Study guide for {g.label} — extracted from {job_title}",
                )
                stats["lessons_persisted"] += 1

                tech_concept_id = upsert_concept(
                    conn, name=g.label,
                    description=f"{g.label} — {g.category}",
                    concept_type="tool",
                    metadata={
                        "source": "nomadically",
                        "application_id": application_id,
                        "tag": g.tag,
                        "slug": g.slug,
                    },
                )
                stats["concepts_created"] += 1

                if g.category in category_concept_ids:
                    upsert_concept_edge(
                        conn, source_id=tech_concept_id,
                        target_id=category_concept_ids[g.category],
                        edge_type="part_of",
                    )
                    stats["edges_created"] += 1

                upsert_lesson_concept(conn, lesson_id, tech_concept_id, relevance=1.0)

                for subtopic in g.subtopics[:5]:
                    sub_name = f"{g.label}: {subtopic}"
                    sub_id = upsert_concept(
                        conn, name=sub_name,
                        description=f"{subtopic} in the context of {g.label}",
                        concept_type="topic",
                        metadata={"source": "nomadically", "parent_tag": g.tag},
                    )
                    stats["concepts_created"] += 1

                    upsert_concept_edge(conn, source_id=sub_id, target_id=tech_concept_id, edge_type="part_of")
                    stats["edges_created"] += 1

                    upsert_lesson_concept(conn, lesson_id, sub_id, relevance=0.8)

                _write_content_file(g.slug, g.content)
                print(f"  Persisted: {g.label} (lesson #{lesson_num})")

            # Update category lesson ranges
            for cat_name, nums in category_lesson_ranges.items():
                if nums:
                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            UPDATE categories
                            SET lesson_range_lo = LEAST(lesson_range_lo, %s),
                                lesson_range_hi = GREATEST(lesson_range_hi, %s)
                            WHERE id = %s
                            """,
                            [min(nums), max(nums), category_ids[cat_name]],
                        )
                    conn.commit()

            conn.close()

        except Exception as e:
            print(f"  Error persisting to knowledge DB: {e}")
            import traceback
            traceback.print_exc()

        print(f"\n  --- Persistence Summary ---")
        print(f"  Lessons persisted: {stats['lessons_persisted']}")
        print(f"  Concepts created:  {stats['concepts_created']}")
        print(f"  Edges created:     {stats['edges_created']}")

        # Persist to local filesystem
        try:
            from src.storage import store_tech_knowledge
            company_name = await ctx.store.get("company_name")
            store_tech_knowledge(
                application_id=application_id,
                job_title=job_title,
                company_name=company_name,
                technologies=technologies,
                generated=stats["generated"],
            )
        except Exception as e:
            print(f"  Warning: local storage failed — {e}")

        return StopEvent(result=stats)


def _save_tech_stack_to_app(application_id: int, technologies: list) -> None:
    if not application_id or not technologies:
        return
    try:
        from src.db.connection import get_connection
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE applications SET ai_tech_stack = %s, updated_at = now()::text WHERE id = %s",
                [json.dumps(technologies), application_id],
            )
        conn.commit()
        conn.close()
        print(f"  Saved {len(technologies)} techs to applications.ai_tech_stack")
    except Exception as e:
        print(f"  Warning: could not save tech stack to app — {e}")


def _write_content_file(slug: str, content: str) -> None:
    content_dir = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "..", "..",
        "knowledge", "content",
    )
    content_dir = os.path.normpath(content_dir)
    if os.path.isdir(content_dir):
        filepath = os.path.join(content_dir, f"{slug}.md")
        with open(filepath, "w") as f:
            f.write(content)
        print(f"    Wrote {filepath}")
