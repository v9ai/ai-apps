import operator
from typing import Annotated, TypedDict


class CompanyJobsState(TypedDict):
    hours_lookback: int
    limit: int
    companies: list[dict]
    results: Annotated[list[dict], operator.add]
    stats: dict
