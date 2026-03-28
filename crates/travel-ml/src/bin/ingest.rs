//! travel-ingest: scrape hotel pages → embed with Candle → store in LanceDB.

use anyhow::{Context, Result};
use candle_core::Device;
use clap::Parser;
use tracing::info;

use travel_ml::embeddings::EmbeddingEngine;
use travel_ml::hotel::seed_hotels;
use travel_ml::scraper::scrape_or_seed;
use travel_ml::store::HotelStore;

#[derive(Parser)]
#[command(name = "travel-ingest", about = "Ingest hotel data into LanceDB")]
struct Args {
    /// Comma-separated jeka.ro hotel URLs to scrape
    #[arg(long, value_delimiter = ',')]
    urls: Vec<String>,

    /// Path to LanceDB database directory
    #[arg(long, default_value = "data/hotels.lance")]
    db: String,

    /// Use seed data only (skip scraping)
    #[arg(long)]
    seed_only: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    // Resolve hotels: either scrape URLs or use seed data
    let hotels = if args.seed_only {
        info!("Using seed data (--seed-only)");
        seed_hotels()
    } else if args.urls.is_empty() {
        info!("No URLs provided, using seed data");
        seed_hotels()
    } else {
        let mut hotels = Vec::new();
        for url in &args.urls {
            match scrape_or_seed(url).await {
                Ok(h) => {
                    info!("  {} — {}* {} €{}/night", h.name, h.star_rating, h.board_type, h.price_eur);
                    hotels.push(h);
                }
                Err(e) => {
                    tracing::error!("Failed to get hotel for {url}: {e:#}");
                }
            }
        }
        hotels
    };

    if hotels.is_empty() {
        anyhow::bail!("No hotels to ingest");
    }

    info!("Loading embedding model...");
    let device = Device::Cpu;
    let engine = EmbeddingEngine::new(device).context("loading embedding model")?;

    info!("Connecting to LanceDB at {}", args.db);
    let store = HotelStore::connect(&args.db, engine)
        .await
        .context("connecting to LanceDB")?;

    let count = store
        .add_hotels(&hotels)
        .await
        .context("ingesting hotels")?;

    info!("Done. Indexed {count} hotels into {}", args.db);
    Ok(())
}
