"""State definitions for the merged application prep pipeline."""

import operator
from typing import Annotated, TypedDict


CATEGORIES = ["technical", "behavioral", "system_design", "company_culture"]


class ParsedJD(TypedDict):
    tech_stack: list[str]
    requirements: list[str]
    role_type: str
    seniority: str


class QAPair(TypedDict):
    question: str
    answer: str


class QuestionSet(TypedDict):
    category: str
    qa_pairs: list[QAPair]


class ExtractedTech(TypedDict):
    tag: str
    label: str
    category: str
    relevance: str


class GeneratedContent(TypedDict):
    tag: str
    label: str
    category: str
    slug: str
    title: str
    content: str
    word_count: int
    subtopics: list[str]


class ApplicationPrepState(TypedDict):
    # Input
    application_id: int
    job_title: str
    company_name: str
    company_key: str
    job_description: str

    # After parse_jd
    parsed: ParsedJD | None
    company_context: str

    # After extract_technologies
    technologies: list[ExtractedTech]

    # After organize_hierarchy
    organized: list[ExtractedTech]
    existing_slugs: list[str]

    # Parallel fan-out results
    question_sets: Annotated[list[QuestionSet], operator.add]
    generated: Annotated[list[GeneratedContent], operator.add]

    # Final
    report: str

    # URL validation (from validate_urls node)
    knowledge_db_ok: bool

    # Control
    dry_run: bool
    exclude_tags: list[str]
    stats: dict
