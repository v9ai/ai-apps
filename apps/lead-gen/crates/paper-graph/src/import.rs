use anyhow::{Context, Result};
use research::arxiv::ArxivClient;
use research::paper::ResearchPaper;
use tokio_postgres::Client;

use crate::store;
use crate::types::ImportResult;

/// Fetch an arXiv paper by ID and store it with all authors.
pub async fn import_arxiv(client: &Client, arxiv_id: &str) -> Result<ImportResult> {
    let arxiv = ArxivClient::new();
    let paper = arxiv
        .get_paper(arxiv_id)
        .await
        .context("Failed to fetch paper from arXiv")?;

    let rp: ResearchPaper = paper.into();

    let categories_json = rp
        .categories
        .as_ref()
        .map(|c| serde_json::to_string(c).unwrap_or_default());

    let paper_id = store::upsert_paper(
        client,
        Some(&rp.source_id),
        &rp.title,
        rp.abstract_text.as_deref(),
        categories_json.as_deref(),
        rp.published_date.as_deref(),
        rp.pdf_url.as_deref(),
        rp.url.as_deref(),
        rp.doi.as_deref(),
        "arxiv",
        Some(&rp.source_id),
    )
    .await?;

    let mut authors_created = 0usize;
    let mut authors_linked = 0usize;

    for (i, author_name) in rp.authors.iter().enumerate() {
        let author_id = store::upsert_author(client, author_name).await?;
        store::link_paper_author(client, paper_id, author_id, (i + 1) as i32).await?;
        authors_linked += 1;
        // Count as "created" if this is a new author (approximation — upsert always succeeds)
        authors_created += 1;
    }

    Ok(ImportResult {
        paper_id,
        title: rp.title,
        authors_created,
        authors_linked,
    })
}
