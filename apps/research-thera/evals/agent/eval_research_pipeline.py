"""DeepEval evaluation of the therapy research pipeline via a LangGraph ReAct agent.

Creates a Python LangGraph ReAct agent wrapping a PGVector search tool, then
evaluates task completion using DeepEval's CallbackHandler integration.
"""

import os
from pathlib import Path

import psycopg2
import psycopg2.extras
from deepeval.dataset import EvaluationDataset, Golden
from deepeval.integrations.langchain import CallbackHandler
from deepeval.metrics import TaskCompletionMetric
from dotenv import load_dotenv
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from langgraph.prebuilt import create_react_agent
from openai import OpenAI

from deepseek_model import DeepSeekModel

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_NEON_URL = os.getenv("NEON_DATABASE_URL", "")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

openai_client = OpenAI(api_key=_OPENAI_KEY)
judge = DeepSeekModel()


def _embed(text: str) -> list[float]:
    res = openai_client.embeddings.create(
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


def build_agent():
    """Build a LangGraph ReAct agent with the PGVector search tool."""
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        api_key=_OPENAI_KEY,
        temperature=0,
    )
    return create_react_agent(llm, tools=[search_therapy_research])


def main():
    goldens = [
        Golden(
            input="Find evidence-based techniques for reducing selective mutism in a 7-year-old"
        ),
        Golden(
            input="What interventions support social skills development for adolescents?"
        ),
        Golden(
            input="Retrieve MBSR techniques appropriate for adult sleep anxiety"
        ),
    ]

    dataset = EvaluationDataset(goldens=goldens)
    agent = build_agent()

    task_metric = TaskCompletionMetric(model=judge)

    for golden in dataset.goldens:
        handler = CallbackHandler(metrics=[task_metric])
        agent.invoke(
            {"messages": [{"role": "user", "content": golden.input}]},
            config={"callbacks": [handler]},
        )

    print("LangGraph research pipeline evaluation complete.")
    print(f"Task completion metric threshold: {task_metric.threshold}")


if __name__ == "__main__":
    main()
