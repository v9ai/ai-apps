//! Semantic search over a Lance course store.
//!
//! Usage:
//!   cargo run --bin search-udemy -- "docker kubernetes deployment"
//!   cargo run --bin search-udemy -- --db ./lance-db --top 5 "machine learning AWS"
//!
//! Requires the Candle embed server running on localhost:9999.

use anyhow::{Context, Result};
use clap::Parser;
use serde::Deserialize;
use udemy::CourseStore;

#[derive(Parser)]
#[command(about = "Semantic search over embedded Udemy courses")]
struct Args {
    /// The search query
    query: String,

    /// Lance database path (must have been populated by scrape-udemy first)
    #[arg(long, default_value = "./lance-db")]
    db: String,

    /// Number of results to return
    #[arg(long, short, default_value_t = 5)]
    top: usize,

    /// Candle embed server URL
    #[arg(long, default_value = "http://localhost:9999")]
    embed_url: String,
}

#[derive(Deserialize)]
struct EmbedResponse {
    data: Vec<EmbedData>,
}

#[derive(Deserialize)]
struct EmbedData {
    embedding: Vec<f32>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();

    // ── Embed the query ───────────────────────────────────────────────────────
    let client = reqwest::Client::new();
    let resp: EmbedResponse = client
        .post(format!("{}/embed", args.embed_url))
        .json(&serde_json::json!({ "input": args.query }))
        .send()
        .await
        .context("embed server not reachable — start it with: cargo run -p candle --bin embed-server --features server")?
        .json()
        .await
        .context("parsing embed response")?;

    let vec = resp
        .data
        .into_iter()
        .next()
        .context("empty embed response")?
        .embedding;

    // ── Search ────────────────────────────────────────────────────────────────
    let store = CourseStore::connect(&args.db).await?;
    let results = store.search(vec, args.top).await?;

    if results.is_empty() {
        eprintln!("No results — is the store populated? Run scrape-udemy first.");
        return Ok(());
    }

    println!("\nQuery: \"{}\"\n", args.query);
    println!(
        "{:<4} {:<6} {:<45} {:<6} {}",
        "Rank", "Score", "Title", "Rating", "Instructor"
    );
    println!("{}", "-".repeat(90));

    for (i, r) in results.iter().enumerate() {
        let c = &r.course;
        println!(
            "{:<4} {:<6.3} {:<45} {:<6.1} {}",
            i + 1,
            r.score,
            truncate(&c.title, 44),
            c.rating,
            truncate(&c.instructor, 25),
        );
        println!("     {} | {} | {}", c.level, c.price, c.url);
        println!("     {}", truncate(&c.description, 85));
        println!();
    }

    Ok(())
}

fn truncate(s: &str, max: usize) -> String {
    if s.len() <= max {
        s.to_string()
    } else {
        format!("{}…", &s[..max.saturating_sub(1)])
    }
}
