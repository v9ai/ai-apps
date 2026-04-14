use anyhow::{Context, Result};
use tokio_postgres::Client;
use unicode_normalization::UnicodeNormalization;

/// Normalize a name for deduplication: NFKD → strip combining marks → lowercase.
pub fn normalize_name(name: &str) -> String {
    name.nfkd()
        .filter(|c| !unicode_normalization::char::is_combining_mark(*c))
        .collect::<String>()
        .to_lowercase()
        .trim()
        .to_string()
}

/// Upsert a paper. Returns the paper ID.
pub async fn upsert_paper(
    client: &Client,
    arxiv_id: Option<&str>,
    title: &str,
    abstract_text: Option<&str>,
    categories: Option<&str>,
    published_at: Option<&str>,
    pdf_url: Option<&str>,
    abs_url: Option<&str>,
    doi: Option<&str>,
    source: &str,
    source_id: Option<&str>,
) -> Result<i32> {
    let row = client
        .query_one(
            "INSERT INTO research_papers
                (arxiv_id, title, abstract_text, categories, published_at, pdf_url, abs_url, doi, source, source_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             ON CONFLICT (arxiv_id) DO UPDATE SET
                title = EXCLUDED.title,
                abstract_text = EXCLUDED.abstract_text,
                categories = EXCLUDED.categories,
                published_at = EXCLUDED.published_at,
                pdf_url = EXCLUDED.pdf_url,
                abs_url = EXCLUDED.abs_url,
                doi = EXCLUDED.doi,
                source_id = EXCLUDED.source_id
             RETURNING id",
            &[
                &arxiv_id,
                &title,
                &abstract_text,
                &categories,
                &published_at,
                &pdf_url,
                &abs_url,
                &doi,
                &source,
                &source_id,
            ],
        )
        .await
        .context("Failed to upsert paper")?;

    Ok(row.get(0))
}

/// Upsert an author by normalized name. Returns the author ID.
pub async fn upsert_author(client: &Client, name: &str) -> Result<i32> {
    let normalized = normalize_name(name);

    // Try to find existing author by normalized name
    let existing = client
        .query_opt(
            "SELECT id FROM research_authors WHERE name_normalized = $1",
            &[&normalized],
        )
        .await
        .context("Failed to query author")?;

    if let Some(row) = existing {
        return Ok(row.get(0));
    }

    // Insert new author
    let row = client
        .query_one(
            "INSERT INTO research_authors (name, name_normalized)
             VALUES ($1, $2)
             RETURNING id",
            &[&name, &normalized],
        )
        .await
        .context("Failed to insert author")?;

    Ok(row.get(0))
}

/// Link an author to a paper at a given position.
pub async fn link_paper_author(
    client: &Client,
    paper_id: i32,
    author_id: i32,
    position: i32,
) -> Result<()> {
    client
        .execute(
            "INSERT INTO paper_authors (paper_id, author_id, position)
             VALUES ($1, $2, $3)
             ON CONFLICT (paper_id, author_id) DO UPDATE SET position = EXCLUDED.position",
            &[&paper_id, &author_id, &position],
        )
        .await
        .context("Failed to link paper author")?;

    Ok(())
}
