//! Semantic search over a Lance lesson store using a local Candle embedding.
//!
//! Usage:
//!   cargo run --bin search -- "how does self-attention work"
//!   cargo run --bin search -- --db ./lance-db --top 5 "RAG chunking strategies"

use candle::{best_device, EmbeddingModel};
use clap::Parser;
use knowledge_ml::LessonStore;

const MODEL: &str = "BAAI/bge-large-en-v1.5";

#[derive(Parser)]
#[command(about = "Semantic search over embedded knowledge-app lessons")]
struct Args {
    /// The search query
    query: String,

    /// Lance database path (must have been populated by embed-lessons first)
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
    let model  = EmbeddingModel::from_hf(&args.model, &device)?;
    let vec    = model.embed_one(&args.query)?;

    // ── Search ────────────────────────────────────────────────────────────────
    let store   = LessonStore::connect(&args.db).await?;
    let results = store.search(vec, args.top).await?;

    if results.is_empty() {
        eprintln!("No results — is the store populated? Run embed-lessons first.");
        return Ok(());
    }

    println!("\nQuery: \"{}\"\n", args.query);
    println!("{:<4} {:<6} {:<40} {}", "Rank", "Score", "Title", "Category");
    println!("{}", "-".repeat(80));

    for (i, r) in results.iter().enumerate() {
        println!(
            "{:<4} {:<6.3} {:<40} {}",
            i + 1,
            r.score,
            truncate(&r.title, 39),
            r.category,
        );
        println!("     /{}", r.slug);
        println!("     {}", truncate(&r.excerpt, 78));
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
