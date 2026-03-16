from typing import TypedDict


class CleanupState(TypedDict):
    dry_run: bool
    cutoff_days: int
    stale_ids: list[int]
    stats: dict
