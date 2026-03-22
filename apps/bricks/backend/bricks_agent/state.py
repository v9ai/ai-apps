"""State definition for the LEGO video analysis pipeline."""

from typing import Optional, TypedDict


class BricksState(TypedDict, total=False):
    youtube_url: str
    # Populated by fetch_video_info
    video_info: Optional[dict]       # {video_id, title, author, thumbnail_url}
    transcript: Optional[str]        # raw transcript text
    # Populated by analyze_transcript
    analysis: Optional[dict]         # {model_name, model_type, raw_steps: list[str]}
    # Populated by extract_parts
    parts_list: Optional[list]       # [{name, quantity, color, part_number}]
    # Populated by structure_steps
    building_steps: Optional[list]   # [{step_number, description, parts_used, notes}]
    # Populated by generate_scheme
    scheme: Optional[dict]           # {phases: [...], summary: str}
    # Error handling
    error: Optional[str]
