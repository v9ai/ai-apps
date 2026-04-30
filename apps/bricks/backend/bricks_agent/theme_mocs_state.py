"""State for the theme MOC discovery pipeline."""

from typing import Optional, TypedDict


class ThemeMocsState(TypedDict, total=False):
    theme_name: str
    theme_slug: Optional[str]
    # Populated by identify_theme
    theme_summary: Optional[str]
    related_keywords: Optional[list[str]]
    anchor_sets: Optional[list[str]]
    # Populated by fetch_alternates
    mocs: Optional[list[dict]]
    # Populated by rank_by_complexity
    ranked_mocs: Optional[list[dict]]
    ranking_summary: Optional[str]
    source: Optional[str]
    error: Optional[str]
