import operator
from typing import Annotated, TypedDict


class BoardCrawlerState(TypedDict):
    provider: str  # "ashby" | "greenhouse" | "workable" | "lever"
    pages_per_run: int
    discovered: Annotated[list[dict], operator.add]
    stats: dict
