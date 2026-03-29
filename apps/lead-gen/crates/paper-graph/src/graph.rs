use anyhow::{Context, Result};
use tokio_postgres::Client;

use crate::types::{AuthorRow, CoAuthorEdge, PaperRow};

/// List all papers.
pub async fn list_papers(client: &Client) -> Result<Vec<PaperRow>> {
    let rows = client
        .query(
            "SELECT id, arxiv_id, title, abstract_text, categories, published_at,
                    pdf_url, abs_url, doi, source, source_id
             FROM research_papers ORDER BY id",
            &[],
        )
        .await
        .context("Failed to list papers")?;

    Ok(rows
        .iter()
        .map(|r| PaperRow {
            id: r.get("id"),
            arxiv_id: r.get("arxiv_id"),
            title: r.get("title"),
            abstract_text: r.get("abstract_text"),
            categories: r.get("categories"),
            published_at: r.get("published_at"),
            pdf_url: r.get("pdf_url"),
            abs_url: r.get("abs_url"),
            doi: r.get("doi"),
            source: r.get("source"),
            source_id: r.get("source_id"),
        })
        .collect())
}

/// List all authors with their paper counts.
pub async fn list_authors(client: &Client) -> Result<Vec<(AuthorRow, i64)>> {
    let rows = client
        .query(
            "SELECT a.id, a.name, a.name_normalized, a.semantic_scholar_id,
                    a.orcid, a.affiliation, a.homepage_url,
                    COUNT(pa.paper_id) as paper_count
             FROM research_authors a
             LEFT JOIN paper_authors pa ON pa.author_id = a.id
             GROUP BY a.id
             ORDER BY paper_count DESC, a.name",
            &[],
        )
        .await
        .context("Failed to list authors")?;

    Ok(rows
        .iter()
        .map(|r| {
            (
                AuthorRow {
                    id: r.get("id"),
                    name: r.get("name"),
                    name_normalized: r.get("name_normalized"),
                    semantic_scholar_id: r.get("semantic_scholar_id"),
                    orcid: r.get("orcid"),
                    affiliation: r.get("affiliation"),
                    homepage_url: r.get("homepage_url"),
                },
                r.get::<_, i64>("paper_count"),
            )
        })
        .collect())
}

/// Find co-authors for a given author via self-join on paper_authors.
pub async fn coauthors(client: &Client, author_id: i32) -> Result<Vec<CoAuthorEdge>> {
    let rows = client
        .query(
            "SELECT a2.id, a2.name, COUNT(DISTINCT pa2.paper_id) as shared_papers
             FROM paper_authors pa1
             JOIN paper_authors pa2 ON pa2.paper_id = pa1.paper_id AND pa2.author_id != pa1.author_id
             JOIN research_authors a2 ON a2.id = pa2.author_id
             WHERE pa1.author_id = $1
             GROUP BY a2.id, a2.name
             ORDER BY shared_papers DESC, a2.name",
            &[&author_id],
        )
        .await
        .context("Failed to query co-authors")?;

    Ok(rows
        .iter()
        .map(|r| CoAuthorEdge {
            author_id: r.get("id"),
            author_name: r.get("name"),
            shared_papers: r.get("shared_papers"),
        })
        .collect())
}
