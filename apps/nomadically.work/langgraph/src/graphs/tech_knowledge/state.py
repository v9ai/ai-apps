"""State definitions for the tech knowledge extraction pipeline."""

import operator
from typing import Annotated, TypedDict


class ExtractedTech(TypedDict):
    tag: str           # canonical skill tag (e.g. "postgresql")
    label: str         # human label (e.g. "PostgreSQL")
    category: str      # tech category (e.g. "Databases & Storage")
    relevance: str     # "primary" | "secondary"


class GeneratedContent(TypedDict):
    tag: str
    label: str
    category: str
    slug: str
    title: str
    content: str       # markdown lesson content
    word_count: int
    subtopics: list[str]


class TechKnowledgeState(TypedDict):
    # Input
    application_id: int
    job_title: str
    company_name: str
    job_description: str

    # After fetch_source
    source_text: str

    # After extract_technologies
    technologies: list[ExtractedTech]

    # After organize_hierarchy
    organized: list[ExtractedTech]  # deduplicated + categorized
    existing_slugs: list[str]       # already in knowledge DB

    # Parallel fan-out results
    generated: Annotated[list[GeneratedContent], operator.add]

    # Control
    dry_run: bool
    exclude_tags: list[str]
    stats: dict
