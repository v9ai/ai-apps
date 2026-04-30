"""State for the theme MOC discovery pipeline."""

from typing import Optional, TypedDict


class ThemeMocsState(TypedDict, total=False):
    theme_name: str
    theme_slug: Optional[str]
    # Populated by identify_theme
    theme_summary: Optional[str]
    related_keywords: Optional[list[str]]
    # Populated by generate_mocs
    mocs: Optional[list[dict]]
    # Populated by rank_mocs
    ranked_mocs: Optional[list[dict]]
    ranking_summary: Optional[str]
    source: Optional[str]
    error: Optional[str]
