"""State definition for the topic-based MOC research pipeline."""

from typing import Optional, TypedDict


class TopicState(TypedDict, total=False):
    topic_name: str
    moc_urls: list[str]
    # Populated by parse_mocs
    mocs: Optional[list[dict]]  # [{moc_id, designer, name, url}]
    # Populated by analyze_topic
    analysis: Optional[dict]  # {mechanism_description, technique_categories: [{name, description, moc_ids}], key_parts: [{name, part_number, role}]}
    # Populated by synthesize_topic
    synthesis: Optional[dict]  # {summary, difficulty_range, recommended_start_moc, common_techniques: [str], unique_approaches: [{moc_id, approach}]}
    # Error handling
    error: Optional[str]
