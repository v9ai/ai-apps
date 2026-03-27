//! travel-search: embed query → vector search LanceDB → output JSON.

use anyhow::{Context, Result};
use candle_core::Device;
use clap::Parser;
use tracing::info;

use travel_ml::embeddings::EmbeddingEngine;
use travel_ml::store::HotelStore;

#[derive(Parser)]
#[command(name = "travel-search", about = "Semantic hotel search via LanceDB")]
struct Args {
    /// Search query
    #[arg(long)]
    query: String,

    /// Path to LanceDB database directory
    #[arg(long, default_value = "data/hotels.lance")]
    db: String,

    /// Number of results to return
    #[arg(long, default_value_t = 5)]
    top_k: usize,

    /// Output file path (writes JSON). If omitted, prints to stdout.
    #[arg(long)]
    out: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    info!("Loading embedding model...");
    let device = Device::Cpu;
    let engine = EmbeddingEngine::new(device).context("loading embedding model")?;

    info!("Connecting to LanceDB at {}", args.db);
    let store = HotelStore::connect(&args.db, engine)
        .await
        .context("connecting to LanceDB")?;

    info!("Searching for: \"{}\" (top {})", args.query, args.top_k);
    let results = store
        .search(&args.query, args.top_k)
        .await
        .context("searching hotels")?;

    info!("Found {} results", results.len());
    for (i, r) in results.iter().enumerate() {
        info!(
            "  #{} {} ({}*, €{}/night) — score: {:.4}",
            i + 1,
            r.hotel.name,
            r.hotel.star_rating,
            r.hotel.price_eur,
            r.score,
        );
    }

    let json = serde_json::to_string_pretty(&results).context("serializing results")?;

    if let Some(out_path) = &args.out {
        std::fs::write(out_path, &json).context("writing output file")?;
        info!("Wrote results to {out_path}");
    } else {
        println!("{json}");
    }

    Ok(())
}
