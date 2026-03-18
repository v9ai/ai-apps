"""Pydantic models for the How It Works pipeline."""

from __future__ import annotations

from pydantic import BaseModel, Field


class _CamelModel(BaseModel):
    """Base model that accepts both camelCase (from JSON) and snake_case."""

    model_config = {"populate_by_name": True}


class AppInfo(_CamelModel):
    name: str
    path: str  # absolute path to the app directory
    app_dir: str = Field(alias="appDir", default="")
    has_how_it_works: bool = Field(alias="hasHowItWorks", default=False)
    framework: str = "unknown"  # "nextjs" | "docusaurus" | "unknown"
    # Feature detection (set by Scanner classify node)
    has_db: bool = False
    has_auth: bool = False
    has_ai: bool = False


class FileContent(_CamelModel):
    relative_path: str = Field(alias="relativePath", default="")
    content: str = ""


class PaperData(_CamelModel):
    slug: str
    number: int
    title: str
    category: str
    word_count: int = Field(0, alias="wordCount")
    reading_time_min: int = Field(2, alias="readingTimeMin")
    authors: str | None = None
    year: int | None = None
    venue: str | None = None
    finding: str | None = None
    relevance: str | None = None
    url: str | None = None
    category_color: str | None = Field(None, alias="categoryColor")


class AgentData(_CamelModel):
    name: str
    description: str
    research_basis: str | None = Field(None, alias="researchBasis")
    paper_indices: list[int] | None = Field(None, alias="paperIndices")


class StatData(_CamelModel):
    number: str
    label: str
    source: str | None = None
    paper_index: int | None = Field(None, alias="paperIndex")


class ExtraSection(_CamelModel):
    heading: str
    content: str


class HowItWorksData(_CamelModel):
    title: str
    subtitle: str
    story: str
    papers: list[PaperData]
    agents: list[AgentData] = Field(default_factory=list)
    stats: list[StatData] = Field(default_factory=list)
    extra_sections: list[ExtraSection] = Field(
        default_factory=list, alias="extraSections"
    )


class ProcessResult(_CamelModel):
    app_name: str = Field(alias="appName", default="")
    status: str = ""  # "written" | "updated" | "skipped" | "error"
    files: list[str] | None = None
    error: str | None = None
