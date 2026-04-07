//! Spain coastal new-build discovery pipeline.
//!
//! Scrapes Idealista, Kyero, ThinkSpain, SpainHouses for obra nueva
//! apartments near the sea, scores them, and exports JSON.
//!
//! Usage:
//!   cargo run --bin spain-discover
//!   cargo run --bin spain-discover -- --out custom-path.json

use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .with_timer(tracing_subscriber::fmt::time::uptime())
        .init();

    let out = std::env::args()
        .skip_while(|a| a != "--out")
        .nth(1)
        .unwrap_or_else(|| "data/spain-newbuild-coastal.json".into());

    if let Err(e) = std::fs::create_dir_all("data") {
        eprintln!("Could not create data/: {e}");
    }

    airbnb::discover::run_discover_pipeline(&out).await
}
