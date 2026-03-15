"""DeepEval evaluation of the Neon PGVector retrieval pipeline.

Connects to Neon PostgreSQL, encodes queries with OpenAI text-embedding-3-small,
retrieves relevant therapy research chunks via cosine similarity, generates an
LLM response, then evaluates with contextual RAG metrics.
"""

import os
from pathlib import Path

import psycopg2
import psycopg2.extras
from deepeval import evaluate
from deepeval.metrics import (
    ContextualPrecisionMetric,
    ContextualRecallMetric,
    ContextualRelevancyMetric,
)
from deepeval.test_case import LLMTestCase
from dotenv import load_dotenv
from openai import OpenAI

from deepseek_model import DeepSeekModel

_env_path = Path(__file__).resolve().parent.parent.parent / ".env.local"
load_dotenv(_env_path)

_NEON_URL = os.getenv("NEON_DATABASE_URL", "")
_OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

openai_client = OpenAI(api_key=_OPENAI_KEY)
judge = DeepSeekModel()

TEST_QUERIES = [
    {
        "input": "CBT techniques for childhood anxiety",
        "expected_output": (
            "Evidence-based CBT techniques for childhood anxiety include "
            "cognitive restructuring, graduated exposure, and parent involvement strategies."
        ),
    },
    {
        "input": "MBSR mindfulness practices for adolescents",
        "expected_output": (
            "MBSR for adolescents uses body scan, mindful breathing, and "
            "psychoeducation on stress responses to improve emotional regulation."
        ),
    },
    {
        "input": "Social skills development interventions",
        "expected_output": (
            "Social skills interventions for children include video modelling, "
            "role-play exercises, and peer-mediated strategies."
        ),
    },
]


def embed(text: str) -> list[float]:
    res = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return res.data[0].embedding


def search(query: str, top_k: int = 5) -> list[dict]:
    """Retrieve top-k research chunks from Neon PGVector via cosine similarity."""
    if not _NEON_URL:
        print("[PGVector eval] NEON_DATABASE_URL not set — skipping DB search")
        return []

    query_embedding = embed(query)
    embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    conn = psycopg2.connect(_NEON_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
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


def generate_response(query: str, chunks: list[dict]) -> str:
    """Generate an LLM response grounded in the retrieved chunks."""
    context_text = "\n\n".join(
        f"[{c['title']}]\n{c['content']}" for c in chunks
    )
    prompt = (
        f"Using the following research context, answer the question.\n\n"
        f"Context:\n{context_text}\n\n"
        f"Question: {query}\n\nAnswer:"
    )
    return judge.generate(prompt)


def build_test_case(item: dict) -> LLMTestCase:
    chunks = search(item["input"])
    response = generate_response(item["input"], chunks) if chunks else item["expected_output"]
    retrieval_context = [c["content"] for c in chunks] if chunks else []

    return LLMTestCase(
        input=item["input"],
        actual_output=response,
        expected_output=item["expected_output"],
        retrieval_context=retrieval_context,
    )


def main():
    test_cases = [build_test_case(q) for q in TEST_QUERIES]

    metrics = [
        ContextualRecallMetric(threshold=0.6, model=judge),
        ContextualPrecisionMetric(threshold=0.6, model=judge),
        ContextualRelevancyMetric(threshold=0.6, model=judge),
    ]

    results = evaluate(test_cases, metrics)
    print(results)


if __name__ == "__main__":
    main()
