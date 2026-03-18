import operator
from typing import Annotated, TypedDict


class IngestJobsState(TypedDict):
    limit: int
    sources: list[dict]
    results: Annotated[list[dict], operator.add]
    stats: dict
