"""Text-to-SQL node — generates a PostgreSQL query from natural language."""

import json
import logging

from src.config import get_llm

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert PostgreSQL query generator for the lead-gen database (Neon PostgreSQL).
Generate queries that answer user questions about jobs, companies, and related data.
When the user asks general questions, prioritise queries that surface fully-remote AI/React engineering roles in the EU or worldwide.

QUERY GUIDELINES (PostgreSQL):
- Only retrieval queries are allowed (SELECT, WITH, EXPLAIN)
- Booleans are stored as BOOLEAN
- JSON fields are stored as JSONB — use ->, ->>, jsonb_array_elements() to query
- Date fields are TIMESTAMP or TEXT in ISO 8601 format
- Use ILIKE for case-insensitive text matching
- Use LIMIT when appropriate to prevent overly large result sets

Respond with a JSON object containing:
- "sql": the generated SQL query
- "explanation": explanation of what the query does
- "confidence": confidence level 0.0-1.0
- "tables_used": list of table names used"""


def generate_sql_node(state: dict) -> dict:
    """Generate SQL from natural language question."""
    question = state["question"]
    schema = state.get("database_schema", "")

    system = SYSTEM_PROMPT
    if schema:
        system += f"\n\nDATABASE SCHEMA:\n{schema}"

    llm = get_llm()
    response = llm.invoke(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": f'Generate a SQL query for: "{question}"'},
        ]
    )

    try:
        result = json.loads(response.content)
    except (json.JSONDecodeError, TypeError):
        # Fallback: extract SQL from response text
        content = str(response.content)
        result = {
            "sql": content,
            "explanation": "Generated from natural language query",
            "confidence": 0.5,
            "tables_used": [],
        }

    log.info("text-to-sql: %s → %s", question[:80], result.get("sql", "")[:80])

    return {
        "sql": result.get("sql", ""),
        "explanation": result.get("explanation", ""),
        "confidence": result.get("confidence", 0.5),
        "tables_used": result.get("tables_used", []),
    }
