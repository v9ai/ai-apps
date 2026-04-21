"""Admin chat graph: prompt-driven tool router over read-only DB tools.

Input: {prompt, system}. Output: {response}.

Why not `create_react_agent`: local `mlx_lm.server` (default target per
`project_mlx_local_inference.md`) lacks vLLM's `--tool-call-parser hermes`
equivalent, so native tool calls degrade to plain text. Instead, each step
asks the LLM to emit `{"tool": ..., "args": ...}` or `{"answer": ...}` JSON,
which `ainvoke_json()` parses reliably even when the model wraps output in
code fences or `<think>` tags.

Tools (all read-only): count_rows(table), inspect_schema(table), query_db(sql).
"""

from __future__ import annotations

import os
from typing import Any

import psycopg
from langgraph.graph import END, START, StateGraph

from .llm import ainvoke_json, make_llm
from .state import AdminChatState

DEFAULT_SYSTEM = (
    "You are the lead-gen ops assistant. Answer database questions using the available tools. "
    "Prefer count_rows and inspect_schema for simple questions; use query_db only when a "
    "specific SELECT is needed. Be concise."
)

MAX_ROWS = 50
MAX_STEPS = 6

TOOLS_DOC = (
    "Available tools (call one per step):\n"
    "- count_rows(table: str) — approximate row count. Use for 'how many X' questions.\n"
    "- inspect_schema(table: str) — column names and types. Use to discover schema.\n"
    "- query_db(sql: str) — execute a SELECT (max 50 rows). Rejects non-SELECT.\n"
)

STEP_INSTRUCTION = (
    "Return JSON only, one of two shapes:\n"
    '  {"tool": "count_rows"|"inspect_schema"|"query_db", "args": {"table": "..."} or {"sql": "..."}}\n'
    '  {"answer": "<final response to the user>"}\n'
    "Emit `answer` as soon as you have enough evidence — don't call more tools than needed."
)


def _dsn() -> str:
    return os.environ.get("NEON_DATABASE_URL", "").strip()


def _count_rows(table: str) -> str:
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


def _inspect_schema(table: str) -> str:
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


def _query_db(sql: str) -> str:
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


def _dispatch(tool: str, args: dict[str, Any]) -> str:
    if tool == "count_rows":
        return _count_rows(str(args.get("table", "")))
    if tool == "inspect_schema":
        return _inspect_schema(str(args.get("table", "")))
    if tool == "query_db":
        return _query_db(str(args.get("sql", "")))
    return f"Error: unknown tool '{tool}'."


async def chat(state: AdminChatState) -> dict:
    system = (state.get("system") or "").strip() or DEFAULT_SYSTEM
    prompt = (state.get("prompt") or "").strip()
    if not prompt:
        return {"response": ""}

    llm = make_llm()
    transcript: list[str] = [f"User question: {prompt}"]

    for _ in range(MAX_STEPS):
        result = await ainvoke_json(
            llm,
            [
                {"role": "system", "content": f"{system}\n\n{TOOLS_DOC}\n{STEP_INSTRUCTION}"},
                {"role": "user", "content": "\n\n".join(transcript)},
            ],
        )
        if not isinstance(result, dict):
            return {"response": str(result)}
        if "answer" in result:
            return {"response": str(result["answer"])}
        tool = str(result.get("tool", ""))
        args = result.get("args", {}) or {}
        if not isinstance(args, dict):
            args = {}
        observation = _dispatch(tool, args)
        transcript.append(f"Tool {tool}({args}) returned:\n{observation}")

    # Ran out of steps — return the last observation as a best-effort answer.
    return {"response": transcript[-1] if transcript else ""}


def _build() -> Any:
    builder = StateGraph(AdminChatState)
    builder.add_node("chat", chat)
    builder.add_edge(START, "chat")
    builder.add_edge("chat", END)
    return builder.compile()


graph = _build()
