"""State definition for the part MOC discovery pipeline (local-only, AI-driven)."""

from typing import Optional, TypedDict


class PartMocsState(TypedDict, total=False):
    part_num: str
    # Populated by identify_part
    part_name: Optional[str]
    part_category: Optional[str]   # e.g. "brick", "slope", "technic", "tile"
    part_description: Optional[str]
    part_image_url: Optional[str]  # Rebrickable CDN LDraw render URL
    part_url: Optional[str]        # https://rebrickable.com/parts/{part_num}/
    # Populated by generate_mocs
    mocs: Optional[list[dict]]     # [{moc_id, name, designer, year, num_parts, image_url, moc_url, description}]
    # Populated by rank_mocs
    ranked_mocs: Optional[list[dict]]   # mocs sorted/annotated by LLM with top_pick flag
    ranking_summary: Optional[str]
    # Metadata
    source: Optional[str]              # "ai" for locally generated results
    # Error handling
    error: Optional[str]
