//! Semantic search over a Lance course store using a local Candle embedding.
//!
//! Usage:
//!   cargo run --bin search-courses -- "docker kubernetes deployment"
//!   cargo run --bin search-courses -- --db ./lance-db --top 5 "machine learning AWS"

use candle::{best_device, EmbeddingModel};
use clap::Parser;
use knowledge_ml::CourseStore;

const MODEL: &str = "BAAI/bge-large-en-v1.5";

#[derive(Parser)]
#[command(about = "Semantic search over embedded Udemy courses")]
struct Args {
    /// The search query
    query: String,

    /// Lance database path (must have been populated by scrape-courses first)
    #[arg(long, default_value = "./lance-db")]
    db: String,

    /// Number of results to return
    #[arg(long, short, default_value_t = 5)]
    top: usize,

    /// Embedding model — must match the one used during indexing
    #[arg(long, default_value = MODEL)]
    model: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    // ── Embed the query ───────────────────────────────────────────────────────
    let device = best_device()?;
    let model = EmbeddingModel::from_hf(&args.model, &device)?;
    let vec = model.embed_one(&args.query)?;

    // ── Search ────────────────────────────────────────────────────────────────
    let store = CourseStore::connect(&args.db).await?;
    let results = store.search(vec, args.top).await?;

    if results.is_empty() {
        eprintln!("No results — is the store populated? Run scrape-courses first.");
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
        println!(
            "     {}",
            truncate(&c.description, 85)
        );
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
