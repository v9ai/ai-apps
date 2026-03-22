"""State definition for the part MOC discovery pipeline."""

from typing import Optional, TypedDict


class PartMocsState(TypedDict, total=False):
    part_num: str
    # Populated by resolve_part
    part_name: Optional[str]
    part_image_url: Optional[str]
    is_set: bool  # True if resolved as a set rather than a part
    colors: Optional[list[dict]]  # [{id, name, image_url, num_sets}]
    # Populated by find_sets
    sets: Optional[list[dict]]  # [{set_num, name, year, num_parts, image_url}]
    # Populated by find_mocs
    mocs: Optional[list[dict]]  # [{moc_id, name, year, num_parts, image_url, moc_url, designer}]
    # Populated by rank_mocs
    ranked_mocs: Optional[list[dict]]  # mocs sorted/annotated by LLM
    ranking_summary: Optional[str]
    # Error handling
    error: Optional[str]
