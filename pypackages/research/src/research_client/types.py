"""Normalized paper type — mirrors crates/research/src/paper.rs ResearchPaper."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class Paper:
    """Unified paper representation across all academic sources.

    Matches the Rust ``ResearchPaper`` struct field-for-field so that
    both Python and Rust pipelines produce interchangeable results.
    """

    title: str
    authors: list[str] = field(default_factory=list)
    year: Optional[int] = None
    abstract_text: Optional[str] = None
    doi: Optional[str] = None
    citation_count: Optional[int] = None
    url: Optional[str] = None
    pdf_url: Optional[str] = None
    source: Optional[str] = None  # "openalex", "crossref", "semantic_scholar"
    source_id: Optional[str] = None
    fields_of_study: Optional[list[str]] = None
    published_date: Optional[str] = None
    venue: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to the legacy 7-field dict format for backwards compat."""
        return {
            "title": self.title,
            "authors": self.authors,
            "year": self.year,
            "abstract": self.abstract_text,
            "doi": self.doi,
            "url": self.url or self.pdf_url,
            "citation_count": self.citation_count,
        }
