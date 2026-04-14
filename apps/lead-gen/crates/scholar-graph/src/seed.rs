use anyhow::Result;
use tokio_postgres::Client;

use crate::store;
use crate::types::ImportResult;

/// Seed the first paper directly (arXiv 2602.15189) when arXiv API is unavailable.
pub async fn seed_scrapegraphai(client: &Client) -> Result<ImportResult> {
    let paper_id = store::upsert_paper(
        client,
        Some("2602.15189"),
        "ScrapeGraphAI-100k: A Large-Scale Dataset for LLM-Based Web Information Extraction",
        Some("We present a substantial dataset containing real-world LLM extraction events, collected via opt-in ScrapeGraphAI telemetry during Q2 and Q3 of 2025. Starting from 9 million events, we refined the data to 93,695 examples covering varied domains and languages. Each example includes Markdown content, prompts, JSON schemas, LLM responses, and metadata. We demonstrate that a small language model (1.7B) trained on a subset narrows the gap to larger baselines (30B), indicating the dataset's value for developing efficient extraction systems."),
        Some(r#"["cs.IR","cs.AI","cs.CL"]"#),
        Some("2026-02-16"),
        Some("https://arxiv.org/pdf/2602.15189"),
        Some("https://arxiv.org/abs/2602.15189"),
        None,
        "arxiv",
        Some("2602.15189"),
    )
    .await?;

    let authors = [
        "William Brach",
        "Francesco Zuppichini",
        "Marco Vinciguerra",
        "Lorenzo Padoan",
    ];

    let mut linked = 0;
    for (i, name) in authors.iter().enumerate() {
        let author_id = store::upsert_author(client, name).await?;
        store::link_paper_author(client, paper_id, author_id, (i + 1) as i32).await?;
        linked += 1;
    }

    Ok(ImportResult {
        paper_id,
        title: "ScrapeGraphAI-100k: A Large-Scale Dataset for LLM-Based Web Information Extraction".into(),
        authors_created: linked,
        authors_linked: linked,
    })
}
