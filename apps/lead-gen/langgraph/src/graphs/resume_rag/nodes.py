"""Resume RAG graph nodes — upload, search, and chat with resumes.

Ported from workers/resume-rag. Uses pgvector for vector storage,
OpenAI for embeddings, and DeepSeek for chat generation.
"""

from __future__ import annotations

import json
import logging
import os
import uuid

import httpx
from psycopg.rows import dict_row

from src.config import get_llm_no_json
from src.db.connection import get_connection

from .embeddings import chunk_text, generate_embedding, generate_embeddings_batch
from .state import ResumeRAGState

logger = logging.getLogger(__name__)


def _submit_pdf_to_llamaparse(pdf_base64: str, filename: str) -> str:
    """Submit PDF to LlamaParse v2 API, return job_id."""
    api_key = os.environ.get("LLAMA_CLOUD_API_KEY")
    if not api_key:
        raise RuntimeError("LLAMA_CLOUD_API_KEY not set")

    import base64
    pdf_bytes = base64.b64decode(pdf_base64)

    client = httpx.Client(timeout=120.0)
    resp = client.post(
        "https://api.cloud.llamaindex.ai/api/v2/parse/upload",
        headers={"Authorization": f"Bearer {api_key}"},
        files={"file": (filename, pdf_bytes, "application/pdf")},
        data={"output_format": "markdown"},
    )
    resp.raise_for_status()
    return resp.json()["id"]


def _poll_llamaparse(job_id: str) -> str:
    """Poll LlamaParse for completion and return parsed text."""
    import time

    api_key = os.environ["LLAMA_CLOUD_API_KEY"]
    client = httpx.Client(timeout=60.0)
    headers = {"Authorization": f"Bearer {api_key}"}

    for _ in range(30):  # Max 5 minutes
        resp = client.get(
            f"https://api.cloud.llamaindex.ai/api/v2/parse/{job_id}",
            headers=headers,
        )
        resp.raise_for_status()
        data = resp.json()

        if data["status"] == "COMPLETED":
            # Fetch markdown result
            result_resp = client.get(
                f"https://api.cloud.llamaindex.ai/api/v2/parse/{job_id}/result/markdown",
                headers=headers,
            )
            result_resp.raise_for_status()
            result_data = result_resp.json()
            return result_data.get("markdown", result_data.get("text", ""))

        if data["status"] == "FAILED":
            raise RuntimeError(f"LlamaParse failed: {data.get('error', 'unknown')}")

        time.sleep(10)

    raise TimeoutError("LlamaParse polling timed out")


def route_action(state: ResumeRAGState) -> str:
    """Route to the appropriate node based on action."""
    action = state.get("action", "")
    if action == "upload":
        return "upload_resume"
    elif action == "search":
        return "search_resume"
    elif action == "chat":
        return "chat_resume"
    raise ValueError(f"Unknown action: {action}")


def upload_resume_node(state: ResumeRAGState) -> dict:
    """Upload, parse, chunk, embed, and store a resume."""
    user_id = state["user_id"]
    resume_id = state.get("resume_id") or str(uuid.uuid4())
    namespace = f"resumes:{user_id}:{resume_id}"

    # Get resume text — either from PDF or direct text
    resume_text = state.get("resume_text", "")
    if not resume_text and state.get("pdf_base64"):
        logger.info("Submitting PDF to LlamaParse...")
        job_id = _submit_pdf_to_llamaparse(state["pdf_base64"], state.get("filename", "resume.pdf"))
        logger.info(f"LlamaParse job: {job_id}, polling...")
        resume_text = _poll_llamaparse(job_id)

    if not resume_text:
        return {"chunks_stored": 0, "stats": {"error": "No resume text provided"}}

    # Chunk the text
    chunks = chunk_text(resume_text)
    logger.info(f"Split resume into {len(chunks)} chunks")

    # Generate embeddings
    embeddings = generate_embeddings_batch(chunks)

    # Store in pgvector
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Clear existing chunks for this resume
            cur.execute(
                "DELETE FROM resume_chunks WHERE user_id = %s AND resume_id = %s",
                [user_id, resume_id],
            )

            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                cur.execute(
                    """INSERT INTO resume_chunks
                       (user_id, resume_id, chunk_index, total_chunks, text, embedding, metadata, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s::vector, %s, now())""",
                    [
                        user_id,
                        resume_id,
                        i,
                        len(chunks),
                        chunk,
                        str(embedding),
                        json.dumps({
                            "filename": state.get("filename", ""),
                            "namespace": namespace,
                        }),
                    ],
                )
        conn.commit()
        return {
            "resume_id": resume_id,
            "chunks_stored": len(chunks),
            "stats": {"chunks": len(chunks), "namespace": namespace},
        }
    finally:
        conn.close()


def search_resume_node(state: ResumeRAGState) -> dict:
    """Semantic search across resume chunks using pgvector."""
    user_id = state["user_id"]
    query = state["query"]
    limit = state.get("limit", 5)
    resume_id = state.get("resume_id", "")

    # Generate query embedding
    emb = str(generate_embedding(query))

    conn = get_connection()
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            if resume_id:
                cur.execute(
                    """SELECT id, chunk_index, text, metadata,
                              1 - (embedding <=> %s::vector) AS score
                       FROM resume_chunks
                       WHERE user_id = %s AND resume_id = %s
                       ORDER BY embedding <=> %s::vector
                       LIMIT %s""",
                    [emb, user_id, resume_id, emb, limit],
                )
            else:
                cur.execute(
                    """SELECT id, chunk_index, text, metadata,
                              1 - (embedding <=> %s::vector) AS score
                       FROM resume_chunks
                       WHERE user_id = %s
                       ORDER BY embedding <=> %s::vector
                       LIMIT %s""",
                    [emb, user_id, emb, limit],
                )
            results = [dict(r) for r in cur.fetchall()]

        return {"search_results": results}
    finally:
        conn.close()


def chat_resume_node(state: ResumeRAGState) -> dict:
    """RAG-powered chat about a resume."""
    user_id = state["user_id"]
    message = state["query"]
    resume_id = state.get("resume_id", "")

    # Search for relevant context
    emb = str(generate_embedding(message))

    conn = get_connection()
    try:
        with conn.cursor(row_factory=dict_row) as cur:
            if resume_id:
                cur.execute(
                    """SELECT text, 1 - (embedding <=> %s::vector) AS score
                       FROM resume_chunks
                       WHERE user_id = %s AND resume_id = %s
                       ORDER BY embedding <=> %s::vector
                       LIMIT 5""",
                    [emb, user_id, resume_id, emb],
                )
            else:
                cur.execute(
                    """SELECT text, 1 - (embedding <=> %s::vector) AS score
                       FROM resume_chunks
                       WHERE user_id = %s
                       ORDER BY embedding <=> %s::vector
                       LIMIT 5""",
                    [emb, user_id, emb],
                )
            context_chunks = cur.fetchall()
    finally:
        conn.close()

    if not context_chunks:
        return {"chat_response": "No resume data found. Please upload a resume first."}

    # Build context
    context = "\n\n---\n\n".join(r["text"] for r in context_chunks)

    # Generate response with LLM
    llm = get_llm_no_json()
    from langchain_core.messages import HumanMessage, SystemMessage

    response = llm.invoke([
        SystemMessage(content=(
            "You are a helpful career assistant. Answer questions about the user's resume "
            "based on the following resume excerpts. Be specific and reference actual content "
            "from the resume. If the information isn't in the provided context, say so.\n\n"
            f"Resume context:\n{context}"
        )),
        HumanMessage(content=message),
    ])

    return {
        "chat_response": response.content,
        "stats": {"context_chunks_used": len(context_chunks)},
    }
