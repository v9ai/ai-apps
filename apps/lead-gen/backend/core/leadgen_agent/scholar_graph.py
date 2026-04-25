"""Academic paper storage + co-authorship graph.

Native Python port of the former Rust ``scholar-graph`` crate. Imports
papers from arXiv and stores them in Neon along with a deduplicated
author table and a paper↔author join. Provides the same CLI surface:
``migrate``, ``import arxiv <id>``, ``coauthors <author_id>``, ``authors``,
``papers``, ``seed``.

Tables: ``research_papers``, ``research_authors``, ``paper_authors``.
Author dedup uses NFKD-normalized lowercase names.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import unicodedata
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Any

import httpx
import psycopg

log = logging.getLogger(__name__)

ARXIV_API = "http://export.arxiv.org/api/query"
ATOM_NS = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS research_papers (
    id SERIAL PRIMARY KEY,
    arxiv_id TEXT UNIQUE,
    title TEXT NOT NULL,
    abstract_text TEXT,
    categories TEXT,
    published_at TEXT,
    pdf_url TEXT,
    abs_url TEXT,
    doi TEXT,
    source TEXT NOT NULL DEFAULT 'arxiv',
    source_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_papers_arxiv_id ON research_papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_research_papers_source ON research_papers(source);

CREATE TABLE IF NOT EXISTS research_authors (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_normalized TEXT,
    semantic_scholar_id TEXT,
    orcid TEXT,
    affiliation TEXT,
    homepage_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_authors_name_norm
    ON research_authors(name_normalized)
    WHERE name_normalized IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_research_authors_name ON research_authors(name);

CREATE TABLE IF NOT EXISTS paper_authors (
    id SERIAL PRIMARY KEY,
    paper_id INTEGER NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES research_authors(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    UNIQUE(paper_id, author_id)
);
CREATE INDEX IF NOT EXISTS idx_paper_authors_author ON paper_authors(author_id);
"""


def _dsn() -> str:
    dsn = os.environ.get("NEON_DATABASE_URL", "").strip()
    if not dsn:
        raise RuntimeError("NEON_DATABASE_URL not set")
    return dsn


def normalize_name(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name)
    stripped = "".join(c for c in decomposed if not unicodedata.combining(c))
    return stripped.strip().lower()


@dataclass
class ArxivPaper:
    arxiv_id: str
    title: str
    abstract: str
    categories: list[str]
    published: str
    pdf_url: str
    abs_url: str
    doi: str | None
    authors: list[str]


def fetch_arxiv(arxiv_id: str) -> ArxivPaper:
    resp = httpx.get(ARXIV_API, params={"id_list": arxiv_id}, timeout=30.0)
    resp.raise_for_status()
    root = ET.fromstring(resp.text)
    entry = root.find("a:entry", ATOM_NS)
    if entry is None:
        raise RuntimeError(f"No arXiv entry for {arxiv_id}")

    title = (entry.findtext("a:title", default="", namespaces=ATOM_NS) or "").strip()
    summary = (entry.findtext("a:summary", default="", namespaces=ATOM_NS) or "").strip()
    published = (entry.findtext("a:published", default="", namespaces=ATOM_NS) or "")[:10]
    doi = entry.findtext("arxiv:doi", default=None, namespaces=ATOM_NS)

    categories = [
        c.attrib.get("term", "")
        for c in entry.findall("a:category", ATOM_NS)
        if c.attrib.get("term")
    ]
    authors = [
        (a.findtext("a:name", default="", namespaces=ATOM_NS) or "").strip()
        for a in entry.findall("a:author", ATOM_NS)
    ]
    authors = [a for a in authors if a]

    pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"
    abs_url = f"https://arxiv.org/abs/{arxiv_id}"
    return ArxivPaper(
        arxiv_id=arxiv_id,
        title=title,
        abstract=summary,
        categories=categories,
        published=published,
        pdf_url=pdf_url,
        abs_url=abs_url,
        doi=doi,
        authors=authors,
    )


def upsert_paper(
    cur: psycopg.Cursor[Any],
    *,
    arxiv_id: str | None,
    title: str,
    abstract: str | None,
    categories: str | None,
    published_at: str | None,
    pdf_url: str | None,
    abs_url: str | None,
    doi: str | None,
    source: str,
    source_id: str | None,
) -> int:
    cur.execute(
        """
        INSERT INTO research_papers
            (arxiv_id, title, abstract_text, categories, published_at,
             pdf_url, abs_url, doi, source, source_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (arxiv_id) DO UPDATE SET
            title = EXCLUDED.title,
            abstract_text = EXCLUDED.abstract_text,
            categories = EXCLUDED.categories,
            published_at = EXCLUDED.published_at,
            pdf_url = EXCLUDED.pdf_url,
            abs_url = EXCLUDED.abs_url,
            doi = EXCLUDED.doi,
            source_id = EXCLUDED.source_id
        RETURNING id
        """,
        (arxiv_id, title, abstract, categories, published_at, pdf_url, abs_url, doi, source, source_id),
    )
    row = cur.fetchone()
    assert row is not None
    return int(row[0])


def upsert_author(cur: psycopg.Cursor[Any], name: str) -> int:
    normalized = normalize_name(name)
    cur.execute("SELECT id FROM research_authors WHERE name_normalized = %s", (normalized,))
    row = cur.fetchone()
    if row is not None:
        return int(row[0])
    cur.execute(
        "INSERT INTO research_authors (name, name_normalized) VALUES (%s, %s) RETURNING id",
        (name, normalized),
    )
    row = cur.fetchone()
    assert row is not None
    return int(row[0])


def link_paper_author(cur: psycopg.Cursor[Any], paper_id: int, author_id: int, position: int) -> None:
    cur.execute(
        """
        INSERT INTO paper_authors (paper_id, author_id, position)
        VALUES (%s, %s, %s)
        ON CONFLICT (paper_id, author_id) DO UPDATE SET position = EXCLUDED.position
        """,
        (paper_id, author_id, position),
    )


@dataclass
class ImportResult:
    paper_id: int
    title: str
    authors_linked: int


def import_arxiv(arxiv_id: str) -> ImportResult:
    paper = fetch_arxiv(arxiv_id)
    categories_json = json.dumps(paper.categories) if paper.categories else None
    with psycopg.connect(_dsn(), autocommit=True) as conn, conn.cursor() as cur:
        paper_id = upsert_paper(
            cur,
            arxiv_id=paper.arxiv_id,
            title=paper.title,
            abstract=paper.abstract or None,
            categories=categories_json,
            published_at=paper.published or None,
            pdf_url=paper.pdf_url,
            abs_url=paper.abs_url,
            doi=paper.doi,
            source="arxiv",
            source_id=paper.arxiv_id,
        )
        linked = 0
        for i, name in enumerate(paper.authors, start=1):
            author_id = upsert_author(cur, name)
            link_paper_author(cur, paper_id, author_id, i)
            linked += 1
    return ImportResult(paper_id=paper_id, title=paper.title, authors_linked=linked)


def seed_scrapegraphai() -> ImportResult:
    title = "ScrapeGraphAI-100k: A Large-Scale Dataset for LLM-Based Web Information Extraction"
    abstract = (
        "We present a substantial dataset containing real-world LLM extraction events, "
        "collected via opt-in ScrapeGraphAI telemetry during Q2 and Q3 of 2025. "
        "Starting from 9 million events, we refined the data to 93,695 examples covering "
        "varied domains and languages. Each example includes Markdown content, prompts, "
        "JSON schemas, LLM responses, and metadata. We demonstrate that a small language "
        "model (1.7B) trained on a subset narrows the gap to larger baselines (30B), "
        "indicating the dataset's value for developing efficient extraction systems."
    )
    authors = [
        "William Brach",
        "Francesco Zuppichini",
        "Marco Vinciguerra",
        "Lorenzo Padoan",
    ]
    with psycopg.connect(_dsn(), autocommit=True) as conn, conn.cursor() as cur:
        paper_id = upsert_paper(
            cur,
            arxiv_id="2602.15189",
            title=title,
            abstract=abstract,
            categories=json.dumps(["cs.IR", "cs.AI", "cs.CL"]),
            published_at="2026-02-16",
            pdf_url="https://arxiv.org/pdf/2602.15189",
            abs_url="https://arxiv.org/abs/2602.15189",
            doi=None,
            source="arxiv",
            source_id="2602.15189",
        )
        linked = 0
        for i, name in enumerate(authors, start=1):
            author_id = upsert_author(cur, name)
            link_paper_author(cur, paper_id, author_id, i)
            linked += 1
    return ImportResult(paper_id=paper_id, title=title, authors_linked=linked)


def migrate() -> None:
    with psycopg.connect(_dsn(), autocommit=True) as conn, conn.cursor() as cur:
        cur.execute(SCHEMA_SQL)
    print("Tables created: research_papers, research_authors, paper_authors")


def list_papers() -> list[dict[str, Any]]:
    with psycopg.connect(_dsn(), autocommit=True) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, arxiv_id, title, abstract_text, categories, published_at,
                   pdf_url, abs_url, doi, source, source_id
            FROM research_papers ORDER BY id
            """,
        )
        cols = [d.name for d in cur.description or []]
        return [dict(zip(cols, r)) for r in cur.fetchall()]


def list_authors() -> list[tuple[dict[str, Any], int]]:
    with psycopg.connect(_dsn(), autocommit=True) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT a.id, a.name, a.name_normalized, a.semantic_scholar_id,
                   a.orcid, a.affiliation, a.homepage_url,
                   COUNT(pa.paper_id) AS paper_count
            FROM research_authors a
            LEFT JOIN paper_authors pa ON pa.author_id = a.id
            GROUP BY a.id
            ORDER BY paper_count DESC, a.name
            """,
        )
        out: list[tuple[dict[str, Any], int]] = []
        for row in cur.fetchall():
            author = {
                "id": row[0],
                "name": row[1],
                "name_normalized": row[2],
                "semantic_scholar_id": row[3],
                "orcid": row[4],
                "affiliation": row[5],
                "homepage_url": row[6],
            }
            out.append((author, int(row[7])))
        return out


@dataclass
class CoAuthorEdge:
    author_id: int
    author_name: str
    shared_papers: int


def coauthors(author_id: int) -> list[CoAuthorEdge]:
    with psycopg.connect(_dsn(), autocommit=True) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT a2.id, a2.name, COUNT(DISTINCT pa2.paper_id) AS shared_papers
            FROM paper_authors pa1
            JOIN paper_authors pa2 ON pa2.paper_id = pa1.paper_id AND pa2.author_id != pa1.author_id
            JOIN research_authors a2 ON a2.id = pa2.author_id
            WHERE pa1.author_id = %s
            GROUP BY a2.id, a2.name
            ORDER BY shared_papers DESC, a2.name
            """,
            (author_id,),
        )
        return [CoAuthorEdge(author_id=r[0], author_name=r[1], shared_papers=int(r[2])) for r in cur.fetchall()]


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="scholar-graph", description="Academic paper storage and co-authorship graph")
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("migrate", help="Create tables in Neon")
    imp = sub.add_parser("import", help="Import a paper")
    imp_sub = imp.add_subparsers(dest="source", required=True)
    arxiv = imp_sub.add_parser("arxiv", help="Import from arXiv by ID")
    arxiv.add_argument("id")
    co = sub.add_parser("coauthors", help="List co-authors for an author")
    co.add_argument("author_id", type=int)
    sub.add_parser("authors", help="List all authors")
    sub.add_parser("papers", help="List all papers")
    sub.add_parser("seed", help="Seed the first paper (arXiv 2602.15189)")
    return p


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"))
    args = _build_parser().parse_args(argv)

    if args.command == "migrate":
        migrate()
    elif args.command == "import" and args.source == "arxiv":
        r = import_arxiv(args.id)
        print(f'Imported: "{r.title}" (paper_id={r.paper_id}, authors_linked={r.authors_linked})')
    elif args.command == "coauthors":
        edges = coauthors(args.author_id)
        if not edges:
            print(f"No co-authors found for author_id={args.author_id}")
        else:
            print(f"Co-authors of author_id={args.author_id}:")
            for e in edges:
                s = "" if e.shared_papers == 1 else "s"
                print(f"  {e.author_name} (id={e.author_id}) — {e.shared_papers} shared paper{s}")
    elif args.command == "authors":
        authors = list_authors()
        if not authors:
            print("No authors yet.")
        for a, count in authors:
            s = "" if count == 1 else "s"
            print(f"  [{a['id']}] {a['name']} — {count} paper{s}")
    elif args.command == "papers":
        papers = list_papers()
        if not papers:
            print("No papers yet.")
        for p in papers:
            cats_raw = p.get("categories")
            try:
                cats = json.loads(cats_raw) if cats_raw else []
            except json.JSONDecodeError:
                cats = []
            label = ", ".join(cats) if cats else (p.get("source") or "")
            print(f"  [{p['id']}] {p['title']} ({label})")
    elif args.command == "seed":
        r = seed_scrapegraphai()
        print(f'Seeded: "{r.title}" (paper_id={r.paper_id}, authors_linked={r.authors_linked})')
    else:
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
