from typing import TypedDict


class EUClassifierState(TypedDict):
    job: dict
    signals: dict | None
    classification: dict | None
    source: str  # "heuristic" | "deepseek"
