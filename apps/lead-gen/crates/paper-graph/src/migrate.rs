use anyhow::{Context, Result};
use tokio_postgres::Client;

pub async fn run(client: &Client) -> Result<()> {
    client
        .batch_execute(
            "
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

            CREATE INDEX IF NOT EXISTS idx_research_papers_arxiv_id
                ON research_papers(arxiv_id);
            CREATE INDEX IF NOT EXISTS idx_research_papers_source
                ON research_papers(source);

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
            CREATE INDEX IF NOT EXISTS idx_research_authors_name
                ON research_authors(name);

            CREATE TABLE IF NOT EXISTS paper_authors (
                id SERIAL PRIMARY KEY,
                paper_id INTEGER NOT NULL REFERENCES research_papers(id) ON DELETE CASCADE,
                author_id INTEGER NOT NULL REFERENCES research_authors(id) ON DELETE CASCADE,
                position INTEGER NOT NULL,
                UNIQUE(paper_id, author_id)
            );

            CREATE INDEX IF NOT EXISTS idx_paper_authors_author
                ON paper_authors(author_id);
            ",
        )
        .await
        .context("Failed to run migrations")?;

    println!("Tables created: research_papers, research_authors, paper_authors");
    Ok(())
}
