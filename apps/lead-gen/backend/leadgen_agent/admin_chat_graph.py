"""Admin chat graph: ReAct agent with read-only DB tools.

Input: {prompt, system}. Output: {response}.

Tools run SELECT-only queries against NEON_DATABASE_URL. Tool calls are safe by
construction: `count_rows` and `inspect_schema` don't take free-form SQL, and
`query_db` enforces a `SELECT` prefix + LIMIT cap.
"""

from __future__ import annotations

import os
from typing import Any

import psycopg
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import END, START, StateGraph
from langgraph.prebuilt import create_react_agent

from .llm import make_llm
from .state import AdminChatState

DEFAULT_SYSTEM = (
    "You are the lead-gen ops assistant. Answer questions about the database using "
    "the provided tools. Prefer count_rows and inspect_schema for simple questions; "
    "use query_db only when a specific SELECT is needed. Be concise."
)

MAX_ROWS = 50


def _dsn() -> str:
    return os.environ.get("NEON_DATABASE_URL", "").strip()


@tool
def count_rows(table: str) -> str:
    """Return the approximate row count for a table. Use for 'how many X' questions."""
    if not table.replace("_", "").isalnum():
        return "Error: invalid table name."
    dsn = _dsn()
    if not dsn:
        return "Error: NEON_DATABASE_URL not configured."
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(f"SELECT count(*) FROM {table}")
                return f"{table}: {cur.fetchone()[0]} rows"
    except Exception as exc:
        return f"Error: {exc}"


@tool
def inspect_schema(table: str) -> str:
    """Return column names and types for a table. Use to discover schema before writing a query."""
    if not table.replace("_", "").isalnum():
        return "Error: invalid table name."
    dsn = _dsn()
    if not dsn:
        return "Error: NEON_DATABASE_URL not configured."
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT column_name, data_type FROM information_schema.columns "
                    "WHERE table_name = %s ORDER BY ordinal_position",
                    (table,),
                )
                rows = cur.fetchall()
                if not rows:
                    return f"Table '{table}' not found or has no columns."
                return "\n".join(f"{name}: {dtype}" for name, dtype in rows)
    except Exception as exc:
        return f"Error: {exc}"


@tool
def query_db(sql: str) -> str:
    """Execute a read-only SELECT query. Rejects anything that isn't a SELECT. Results capped at 50 rows."""
    lowered = sql.strip().lower()
    if not lowered.startswith("select"):
        return "Error: only SELECT queries are allowed."
    forbidden = ("insert", "update", "delete", "drop", "alter", "truncate", "grant", "revoke", ";--")
    if any(tok in lowered for tok in forbidden):
        return "Error: query contains a forbidden token."
    dsn = _dsn()
    if not dsn:
        return "Error: NEON_DATABASE_URL not configured."
    try:
        with psycopg.connect(dsn, autocommit=True, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                rows = cur.fetchmany(MAX_ROWS)
                cols = [desc[0] for desc in cur.description or []]
                if not rows:
                    return "(no rows)"
                header = " | ".join(cols)
                body = "\n".join(" | ".join(str(v) for v in row) for row in rows)
                return f"{header}\n{body}"
    except Exception as exc:
        return f"Error: {exc}"


TOOLS = [count_rows, inspect_schema, query_db]


def _react():
    # Built once at module import so `langgraph dev` picks up the compiled agent.
    return create_react_agent(make_llm(), TOOLS)


REACT_AGENT = _react()


async def chat(state: AdminChatState) -> dict:
    system = (state.get("system") or "").strip() or DEFAULT_SYSTEM
    prompt = (state.get("prompt") or "").strip()
    if not prompt:
        return {"response": ""}
    messages: list[Any] = [SystemMessage(content=system), HumanMessage(content=prompt)]
    result = await REACT_AGENT.ainvoke({"messages": messages})
    out_messages = result.get("messages", []) if isinstance(result, dict) else []
    # Last AIMessage content is the final answer.
    for msg in reversed(out_messages):
        if isinstance(msg, AIMessage) and msg.content:
            return {"response": str(msg.content)}
    return {"response": ""}


def _build() -> Any:
    builder = StateGraph(AdminChatState)
    builder.add_node("chat", chat)
    builder.add_edge(START, "chat")
    builder.add_edge("chat", END)
    return builder.compile()


graph = _build()
