"""Pydantic models for the How It Works pipeline."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AppInfo(BaseModel):
    name: str
    path: str  # absolute path to the app directory
    app_dir: str  # absolute path to Next.js app/ or src/app/
    has_how_it_works: bool
    framework: str  # "nextjs" | "docusaurus" | "unknown"
    # Feature detection (set by Scanner classify node)
    has_db: bool = False
    has_auth: bool = False
    has_ai: bool = False


class FileContent(BaseModel):
    relative_path: str
    content: str


class PaperData(BaseModel):
    slug: str
    number: int
    title: str
    category: str
    word_count: int = 0
    reading_time_min: int = 2
    authors: str | None = None
    year: int | None = None
    venue: str | None = None
    finding: str | None = None
    relevance: str | None = None
    url: str | None = None
    category_color: str | None = None


class AgentData(BaseModel):
    name: str
    description: str
    research_basis: str | None = None
    paper_indices: list[int] | None = None


class StatData(BaseModel):
    number: str
    label: str
    source: str | None = None
    paper_index: int | None = None


class ExtraSection(BaseModel):
    heading: str
    content: str


class HowItWorksData(BaseModel):
    title: str
    subtitle: str
    story: str
    papers: list[PaperData]
    agents: list[AgentData] = Field(default_factory=list)
    stats: list[StatData] = Field(default_factory=list)
    extra_sections: list[ExtraSection] = Field(
        default_factory=list, alias="extraSections"
    )

    model_config = {"populate_by_name": True}


class ProcessResult(BaseModel):
    app_name: str
    status: str  # "written" | "updated" | "skipped" | "error"
    files: list[str] | None = None
    error: str | None = None
