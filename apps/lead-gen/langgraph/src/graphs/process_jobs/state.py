import operator
from typing import Annotated, TypedDict


class ProcessJobsState(TypedDict):
    limit: int
    phase_results: Annotated[list[dict], operator.add]
    stats: dict
