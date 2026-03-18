"""Events for the tech knowledge extraction workflow."""

from llama_index.core.workflow import Event


class SourceFetchedEvent(Event):
    """Emitted after the job description source is fetched."""
    source_text: str


class TechnologiesExtractedEvent(Event):
    """Emitted after technologies are extracted from the JD."""
    technologies: list[dict]  # [{"tag", "label", "category", "relevance"}, ...]


class HierarchyOrganizedEvent(Event):
    """Emitted after dedup and exclusion filtering."""
    organized: list[dict]


class GenerateContentEvent(Event):
    """Fan-out event — one per technology to generate study material."""
    tech: dict  # {"tag", "label", "category", "relevance"}
    job_title: str
    company_name: str
    job_description: str
    all_techs: list[str]  # labels of all techs for cross-referencing


class ContentGeneratedEvent(Event):
    """Emitted when one technology's study lesson is generated."""
    tag: str
    label: str
    category: str
    slug: str
    title: str
    content: str
    word_count: int
    subtopics: list[str]
