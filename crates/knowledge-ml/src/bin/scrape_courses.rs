//! Ingest Udemy courses into a Lance vector store.
//!
//! Usage:
//!   cargo run --bin scrape-courses -- --json ./data/courses.json [--db ./lance-db]
//!
//! Requires the Candle embed server running on localhost:9999:
//!   cargo run -p candle --bin embed-server --features server
//!
//! The JSON file is produced by scripts/scrape-udemy.ts (Playwright).

use std::path::PathBuf;

use anyhow::{Context, Result};
use clap::Parser;
use knowledge_ml::scraper::load_courses_json;
use knowledge_ml::{Course, CourseStore};
use serde::Deserialize;
use tracing::info;

#[derive(Parser)]
#[command(about = "Embed Udemy courses into a Lance vector store")]
struct Args {
    /// Path to a JSON file with course data (from scrape-udemy.ts)
    #[arg(long)]
    json: PathBuf,

    /// Where to create / open the Lance database
    #[arg(long, default_value = "./lance-db")]
    db: String,

    /// Candle embed server URL
    #[arg(long, default_value = "http://localhost:9999")]
    embed_url: String,

    /// How many courses to embed per batch
    #[arg(long, default_value_t = 8)]
    batch: usize,
}

#[derive(Deserialize)]
struct EmbedResponse {
    data: Vec<EmbedData>,
}

#[derive(Deserialize)]
struct EmbedData {
    embedding: Vec<f32>,
}

/// Call the Candle embed server to get embeddings for a batch of texts.
async fn embed_batch(client: &reqwest::Client, url: &str, texts: &[String]) -> Result<Vec<Vec<f32>>> {
    let resp: EmbedResponse = client
        .post(format!("{url}/embed"))
        .json(&serde_json::json!({ "input": texts }))
        .send()
        .await
        .context("calling embed server")?
        .json()
        .await
        .context("parsing embed response")?;

    let vecs: Vec<Vec<f32>> = resp.data.into_iter().map(|d| d.embedding).collect();
    assert_eq!(vecs.len(), texts.len(), "embed server returned wrong number of vectors");
    Ok(vecs)
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    let args = Args::parse();

    // ── Load courses ─────────────────────────────────────────────────────────
    let courses: Vec<Course> = load_courses_json(&args.json)?;
    if courses.is_empty() {
        eprintln!("No courses found in {}", args.json.display());
        return Ok(());
    }
    eprintln!("Loaded {} courses from {}", courses.len(), args.json.display());

    // ── Check embed server ───────────────────────────────────────────────────
    let client = reqwest::Client::new();
    client
        .get(format!("{}/health", args.embed_url))
        .send()
        .await
        .context("embed server not reachable — start it with: cargo run -p candle --bin embed-server --features server")?;
    eprintln!("Embed server OK at {}", args.embed_url);

    // ── Open store ───────────────────────────────────────────────────────────
    let mut store = CourseStore::connect(&args.db).await?;
    let already = store.count().await?;
    info!("{already} courses already in store");

    // ── Embed in batches ─────────────────────────────────────────────────────
    let total = courses.len();
    let mut done = 0usize;

    for chunk in courses.chunks(args.batch) {
        let texts: Vec<String> = chunk.iter().map(|c| c.embed_text()).collect();
        let vecs = embed_batch(&client, &args.embed_url, &texts).await?;

        store.add(chunk, &vecs).await?;

        done += chunk.len();
        eprintln!("  {done}/{total} embedded");
    }

    eprintln!(
        "\nDone — {done} courses indexed into {} ({} total rows)",
        args.db,
        already + done
    );
    Ok(())
}
