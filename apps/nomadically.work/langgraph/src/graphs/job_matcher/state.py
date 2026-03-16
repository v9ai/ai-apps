from typing import TypedDict


class JobMatcherState(TypedDict):
    user_skills: list[str]
    limit: int
    candidates: list[dict]
    role_scores: dict  # title -> score
    ranked: list[dict]
