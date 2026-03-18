import operator
from typing import Annotated, TypedDict


class JanitorState(TypedDict):
    phase_results: Annotated[list[dict], operator.add]
    stats: dict
