"""ReAct agent with PGVector therapy research search tool."""

import os

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from openai import OpenAI

load_dotenv()

_NEON_URL = os.getenv("NEON_DATABASE_URL", "")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

_openai_client = OpenAI(api_key=_OPENAI_KEY)


def _embed(text: str) -> list[float]:
    res = _openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return res.data[0].embedding


@tool
def search_therapy_research(query: str) -> str:
    """Search the Neon PGVector store for therapy research relevant to the query.

    Returns the top 5 most relevant research chunks as formatted text.
    """
    if not _NEON_URL:
        return "No research database configured (NEON_DATABASE_URL not set)."

    query_embedding = _embed(query)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    conn = psycopg2.connect(_NEON_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT title, content,
                       1 - (embedding <-> %s::vector) AS similarity
                FROM research_embeddings
                ORDER BY embedding <-> %s::vector
                LIMIT 5
                """,
                (embedding_str, embedding_str),
            )
            rows = cur.fetchall()
    finally:
        conn.close()

    if not rows:
        return "No relevant research found in the database."

    return "\n\n---\n\n".join(
        f"**{row['title']}** (similarity: {row['similarity']:.3f})\n{row['content']}"
        for row in rows
    )


graph = create_react_agent(model="openai:gpt-4o-mini", tools=[search_therapy_research])
