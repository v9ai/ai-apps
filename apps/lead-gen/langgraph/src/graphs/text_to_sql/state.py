from typing import TypedDict


class TextToSqlState(TypedDict):
    question: str
    database_schema: str  # pre-formatted schema description (optional)
    sql: str
    explanation: str
    confidence: float
    tables_used: list[str]
