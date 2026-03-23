"""PGVector retriever for RAG evaluation.

Connects to Neon PostgreSQL via psycopg2 and retrieves context
using vector similarity, full-text search, or hybrid search.
"""

import os
import threading
from pathlib import Path

import psycopg2
from psycopg2.pool import ThreadedConnectionPool
from dotenv import load_dotenv
from pgvector.psycopg2 import register_vector

from fastembed_embedder import FastEmbedEmbedder

_env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(_env_path)


class PgVectorRetriever:
    """Retrieves context from Neon pgvector for RAG evaluation."""

    # Shared FastEmbedEmbedder — model load is expensive (~2 s, ~500 MB).
    # FastEmbedEmbedder is stateless so sharing across threads is safe.
    _shared_embedder: FastEmbedEmbedder | None = None
    _embedder_lock: threading.Lock = threading.Lock()

    # Shared connection pool — avoids a new TCP handshake per retriever instance.
    _pool: ThreadedConnectionPool | None = None
    _pool_lock: threading.Lock = threading.Lock()

    @classmethod
    def _get_embedder(cls) -> FastEmbedEmbedder:
        if cls._shared_embedder is None:
            with cls._embedder_lock:
                if cls._shared_embedder is None:  # double-checked locking
                    cls._shared_embedder = FastEmbedEmbedder()
        return cls._shared_embedder

    @classmethod
    def _get_pool(cls) -> ThreadedConnectionPool:
        if cls._pool is None:
            with cls._pool_lock:
                if cls._pool is None:
                    dsn = os.getenv("DATABASE_URL", "")
                    if not dsn:
                        raise ValueError("DATABASE_URL not set in .env.local")
                    cls._pool = ThreadedConnectionPool(1, 10, dsn)
        return cls._pool

    def __init__(self, connection_string: str | None = None):
        if connection_string:
            # Explicit DSN — use a standalone connection (bypasses pool).
            self._conn = psycopg2.connect(connection_string)
            self._from_pool = False
        else:
            pool = self._get_pool()
            self._conn = pool.getconn()
            self._from_pool = True
        register_vector(self._conn)
        self._embedder = self._get_embedder()

    def _embed(self, text: str) -> list[float]:
        return self._embedder.embed_text(text)

    # -- Vector similarity search ------------------------------------------------

    def find_similar_sections(
        self, query: str, top_k: int = 5, threshold: float = 0.3
    ) -> list[dict]:
        """Search section_embeddings via cosine similarity."""
        embedding = self._embed(query)
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT se.section_id, se.lesson_id, ls.heading, se.content,
                       l.slug AS lesson_slug, l.title AS lesson_title,
                       1 - (se.embedding <=> %s::vector) AS similarity
                FROM section_embeddings se
                JOIN lesson_sections ls ON ls.id = se.section_id
                JOIN lessons l ON l.id = se.lesson_id
                WHERE 1 - (se.embedding <=> %s::vector) > %s
                ORDER BY se.embedding <=> %s::vector
                LIMIT %s
                """,
                (embedding, embedding, threshold, embedding, top_k),
            )
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    def find_similar_lessons(
        self, query: str, top_k: int = 5, threshold: float = 0.3
    ) -> list[dict]:
        """Search lesson_embeddings via cosine similarity."""
        embedding = self._embed(query)
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT le.lesson_id, l.slug, l.title,
                       cat.name AS category_name,
                       1 - (le.embedding <=> %s::vector) AS similarity
                FROM lesson_embeddings le
                JOIN lessons l ON l.id = le.lesson_id
                JOIN categories cat ON cat.id = l.category_id
                WHERE 1 - (le.embedding <=> %s::vector) > %s
                ORDER BY le.embedding <=> %s::vector
                LIMIT %s
                """,
                (embedding, embedding, threshold, embedding, top_k),
            )
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    def hybrid_search(
        self,
        query: str,
        top_k: int = 10,
        fts_weight: float = 0.3,
        vector_weight: float = 0.7,
        threshold: float = 0.2,
    ) -> list[dict]:
        """Hybrid FTS + vector search via hybrid_search_lessons RPC."""
        embedding = self._embed(query)
        with self._conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM hybrid_search_lessons(%s, %s::vector, %s, %s, %s, %s)",
                (query, embedding, top_k, fts_weight, vector_weight, threshold),
            )
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    # -- Full-text search (works without embeddings) ----------------------------

    def fts_search(self, query: str, limit: int = 10) -> list[dict]:
        """Full-text search via search_content RPC."""
        with self._conn.cursor() as cur:
            cur.execute("SELECT * FROM search_content(%s, %s)", (query, limit))
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    # -- Content fetching -------------------------------------------------------

    def get_section_content(self, section_ids: list[str]) -> list[str]:
        """Fetch raw content for a list of section IDs."""
        if not section_ids:
            return []
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT ls.heading, ls.content, l.title AS lesson_title
                FROM lesson_sections ls
                JOIN lessons l ON l.id = ls.lesson_id
                WHERE ls.id = ANY(%s)
                ORDER BY l.number, ls.section_order
                """,
                (section_ids,),
            )
            return [
                f"[{row[2]} > {row[0]}]\n{row[1]}" for row in cur.fetchall()
            ]

    def get_all_sections_for_lesson(self, lesson_slug: str) -> list[dict]:
        """Fetch all sections for a lesson by slug."""
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT ls.id, ls.heading, ls.content, ls.section_order, ls.word_count
                FROM lesson_sections ls
                JOIN lessons l ON l.id = ls.lesson_id
                WHERE l.slug = %s
                ORDER BY ls.section_order
                """,
                (lesson_slug,),
            )
            cols = [d[0] for d in cur.description]
            return [dict(zip(cols, row)) for row in cur.fetchall()]

    def get_lesson_content(self, lesson_slug: str) -> dict | None:
        """Fetch full lesson content by slug."""
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT l.id, l.slug, l.title, l.content, l.word_count,
                       cat.name AS category_name
                FROM lessons l
                JOIN categories cat ON cat.id = l.category_id
                WHERE l.slug = %s
                """,
                (lesson_slug,),
            )
            row = cur.fetchone()
            if not row:
                return None
            cols = [d[0] for d in cur.description]
            return dict(zip(cols, row))

    def has_embeddings(self) -> bool:
        """Check if any embeddings are populated."""
        with self._conn.cursor() as cur:
            cur.execute("SELECT EXISTS(SELECT 1 FROM section_embeddings LIMIT 1)")
            return cur.fetchone()[0]

    def close(self):
        if not self._conn or self._conn.closed:
            return
        if self._from_pool:
            self._get_pool().putconn(self._conn)
        else:
            self._conn.close()
        self._conn = None
