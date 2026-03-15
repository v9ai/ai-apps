"""PGVector retrieval client for evaluation.

Connects to Neon PostgreSQL, encodes queries with OpenAI embeddings,
and retrieves research chunks via cosine similarity — mirroring the
production retrieveGoalContext() function in src/tools/rag.tools.ts.
"""

import os
from pathlib import Path
from typing import Optional

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from openai import OpenAI

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_NEON_URL = os.getenv("NEON_DATABASE_URL", "")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

openai_client = OpenAI(api_key=_OPENAI_KEY)


def embed(text: str, model: str = "text-embedding-3-small") -> list[float]:
    """Encode text to embedding vector using the specified OpenAI model."""
    res = openai_client.embeddings.create(model=model, input=text)
    return res.data[0].embedding


def search(
    query: str,
    top_k: int = 10,
    goal_id: Optional[int] = None,
    embedding_model: str = "text-embedding-3-small",
) -> list[dict]:
    """Retrieve top-k research chunks from Neon PGVector via cosine similarity.

    Mirrors retrieveGoalContext() from src/tools/rag.tools.ts.
    """
    if not _NEON_URL:
        raise RuntimeError("NEON_DATABASE_URL not set — cannot run retrieval evals")

    query_embedding = embed(query, model=embedding_model)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    conn = psycopg2.connect(_NEON_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if goal_id is not None:
                cur.execute(
                    """
                    SELECT entity_type, entity_id, title, content, metadata,
                           1 - (embedding <-> %s::vector) AS similarity
                    FROM research_embeddings
                    WHERE goal_id = %s
                    ORDER BY embedding <-> %s::vector
                    LIMIT %s
                    """,
                    (embedding_str, goal_id, embedding_str, top_k),
                )
            else:
                cur.execute(
                    """
                    SELECT entity_type, entity_id, title, content, metadata,
                           1 - (embedding <-> %s::vector) AS similarity
                    FROM research_embeddings
                    ORDER BY embedding <-> %s::vector
                    LIMIT %s
                    """,
                    (embedding_str, embedding_str, top_k),
                )
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def generate_response(query: str, chunks: list[dict], model: str = "deepseek-chat") -> str:
    """Generate a therapeutic response grounded in retrieved chunks."""
    if not chunks:
        return "No relevant research context available."

    context_text = "\n\n".join(
        f"[{c['title']}] (similarity: {c['similarity']:.3f})\n{c['content']}"
        for c in chunks
    )

    client = OpenAI(
        api_key=os.getenv("DEEPSEEK_API_KEY", ""),
        base_url="https://api.deepseek.com",
    )
    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a therapeutic content specialist. Use the provided research "
                    "context to answer questions about evidence-based therapeutic interventions "
                    "for children and families."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Using the following research context, answer the question.\n\n"
                    f"Context:\n{context_text}\n\n"
                    f"Question: {query}\n\nAnswer:"
                ),
            },
        ],
        temperature=0,
    )
    return response.choices[0].message.content or ""
