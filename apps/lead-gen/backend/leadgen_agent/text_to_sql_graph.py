"""Text-to-SQL graph: understand_question → identify_tables → generate_sql → validate_sql.

Produces {sql, explanation, confidence, tables_used}. Read-only by convention —
the caller should execute the resulting SQL through an enforced SELECT-only path.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import TextToSqlState


async def understand_question(state: TextToSqlState) -> dict:
    llm = make_llm()
    q = (state.get("question") or "")[:4000]
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    'Restate a natural-language database question as a concise intent. '
                    'Return JSON {"understanding": "..."} — a single sentence describing what the user wants.'
                ),
            },
            {"role": "user", "content": q},
        ],
    )
    return {"understanding": (result or {}).get("understanding", "") if isinstance(result, dict) else ""}


async def identify_tables(state: TextToSqlState) -> dict:
    llm = make_llm()
    schema = (state.get("database_schema") or "")[:8000]
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Given a database schema and an intent, list the tables needed. "
                    'Return JSON {"tables_used": ["t1", "t2"]}. Use exact table names from the schema.'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Intent: {state.get('understanding', '')}\n\n"
                    f"Schema:\n{schema or '(not provided)'}"
                ),
            },
        ],
    )
    tables = (result or {}).get("tables_used", []) if isinstance(result, dict) else []
    if not isinstance(tables, list):
        tables = []
    return {"tables_used": [str(t) for t in tables]}


async def generate_sql(state: TextToSqlState) -> dict:
    llm = make_llm()
    schema = (state.get("database_schema") or "")[:8000]
    result = await ainvoke_json(
        llm,
        [
            {
                "role": "system",
                "content": (
                    "Generate a single PostgreSQL SELECT query. Read-only: no INSERT/UPDATE/DELETE/DDL. "
                    "Prefer explicit column lists over SELECT *. Add a LIMIT 100 unless the question "
                    "implies an aggregate. "
                    'Return JSON {"sql": "...", "explanation": "one sentence", "confidence": 0.0-1.0}.'
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question: {state.get('question', '')}\n"
                    f"Intent: {state.get('understanding', '')}\n"
                    f"Tables: {state.get('tables_used', [])}\n\n"
                    f"Schema:\n{schema or '(not provided)'}"
                ),
            },
        ],
    )
    if not isinstance(result, dict):
        result = {}
    return {
        "sql": str(result.get("sql", "")).strip(),
        "explanation": str(result.get("explanation", "")).strip(),
        "confidence": float(result.get("confidence", 0.0) or 0.0),
    }


async def validate_sql(state: TextToSqlState) -> dict:
    sql = (state.get("sql") or "").strip()
    lowered = sql.lower()
    forbidden = ("insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "grant ", "revoke ")
    if not sql:
        return {"sql": "", "explanation": "No SQL generated.", "confidence": 0.0}
    if any(tok in lowered for tok in forbidden):
        # Hard-block write statements.
        return {
            "sql": "",
            "explanation": "Rejected: non-SELECT statement.",
            "confidence": 0.0,
        }
    return {}


def _build() -> Any:
    builder = StateGraph(TextToSqlState)
    builder.add_node("understand_question", understand_question)
    builder.add_node("identify_tables", identify_tables)
    builder.add_node("generate_sql", generate_sql)
    builder.add_node("validate_sql", validate_sql)
    builder.add_edge(START, "understand_question")
    builder.add_edge("understand_question", "identify_tables")
    builder.add_edge("identify_tables", "generate_sql")
    builder.add_edge("generate_sql", "validate_sql")
    builder.add_edge("validate_sql", END)
    return builder.compile()


graph = _build()
