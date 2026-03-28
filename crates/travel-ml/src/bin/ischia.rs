//! travel-ischia: scrape Bay of Naples sources → Candle semantic filter →
//! extract → deduplicate → review analysis → index in LanceDB → export JSON.

use anyhow::{Context, Result};
use candle_core::Device;
use clap::Parser;
use tracing::info;

use travel_ml::constants::DISCOVERY_YEAR_STR;
use travel_ml::dedup::deduplicate;
use travel_ml::embeddings::EmbeddingEngine;
use travel_ml::hotel::{Hotel, HotelSearchResult};
use travel_ml::ischia_discover::{
    curated_ischia_hotels, extract_ischia_hotels, ischia_seed_hotels,
    rank_ischia_passages, scrape_ischia_sources, validate_ischia_hotel,
};
use travel_ml::reviews::{self, EnrichedSearchResult};
use travel_ml::store::HotelStore;

#[derive(Parser)]
#[command(
    name = "travel-ischia",
    about = "Discover new Ischia & Bay of Naples hotels via web scraping + Candle ML"
)]
struct Args {
    /// Path to LanceDB database directory
    #[arg(long, default_value = "data/ischia.lance")]
    db: String,

    /// Output JSON file path
    #[arg(long, default_value = "../../apps/travel/src/data/ischia_hotels.json")]
    out: String,

    /// Cosine similarity threshold for passage relevance (0.0–1.0)
    #[arg(long, default_value_t = 0.30)]
    relevance_threshold: f32,

    /// Cosine similarity threshold for deduplication (0.0–1.0)
    #[arg(long, default_value_t = 0.92)]
    dedup_threshold: f32,

    /// Also index into LanceDB (not just JSON export)
    #[arg(long)]
    index: bool,

    /// Skip review analysis (faster, no sentiment/aspect scores)
    #[arg(long)]
    skip_reviews: bool,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let args = Args::parse();

    // ── Stage 1: Init Candle embedding engine ──
    info!("Loading Candle embedding model (all-MiniLM-L6-v2)...");
    let device = Device::Cpu;
    let engine = EmbeddingEngine::new(device).context("loading embedding model")?;

    // ── Stage 2: Scrape Ischia & Bay of Naples sources ──
    info!("Scraping travel sources for new Ischia hotels...");
    let passages = scrape_ischia_sources().await;

    if passages.is_empty() {
        info!("No passages scraped — falling back to curated dataset");
        return run_seed_fallback(&engine, &args).await;
    }

    // ── Stage 3: Candle semantic passage retrieval ──
    info!("Running Candle semantic filtering...");
    let ranked = rank_ischia_passages(&engine, &passages, args.relevance_threshold)
        .context("ranking passages")?;

    info!(
        "Top {} relevant passages (of {})",
        ranked.len(),
        passages.len()
    );
    for (i, rp) in ranked.iter().take(5).enumerate() {
        info!(
            "  #{} score={:.3} src={} text={}...",
            i + 1,
            rp.score,
            rp.passage.source_url,
            &rp.passage.text[..rp.passage.text.len().min(80)],
        );
    }

    // ── Stage 4: Extract hotel data ──
    info!("Extracting hotel data from relevant passages...");
    let mut scraped_candidates = extract_ischia_hotels(&ranked);
    let before = scraped_candidates.len();
    scraped_candidates.retain(validate_ischia_hotel);
    if scraped_candidates.len() < before {
        info!(
            "Validation: dropped {} invalid candidates",
            before - scraped_candidates.len()
        );
    }
    info!("Valid scraped candidates: {}", scraped_candidates.len());

    // ── Stage 5: Merge scraped + curated hotels ──
    let curated = curated_ischia_hotels();
    info!("Curated {DISCOVERY_YEAR_STR} dataset: {} hotels", curated.len());
    let mut candidates = curated;
    candidates.extend(scraped_candidates);

    // ── Stage 6: Deduplicate with Candle embeddings ──
    info!("Deduplicating with Candle cosine similarity...");
    let existing = ischia_seed_hotels();
    let unique = deduplicate(&engine, &candidates, &existing, args.dedup_threshold)
        .context("deduplicating hotels")?;

    // ── Stage 7: Export ──
    export_results(&unique, &engine, &args).await
}

/// Fallback: generate discovery results from curated Ischia hotel data.
async fn run_seed_fallback(engine: &EmbeddingEngine, args: &Args) -> Result<()> {
    info!("Using curated {DISCOVERY_YEAR_STR} Ischia hotel dataset...");

    let hotels = curated_ischia_hotels();
    info!("Curated dataset: {} hotels", hotels.len());

    let existing = ischia_seed_hotels();
    let unique = deduplicate(engine, &hotels, &existing, args.dedup_threshold)
        .context("deduplicating curated hotels")?;

    export_results(&unique, engine, args).await
}

async fn export_results(hotels: &[Hotel], engine: &EmbeddingEngine, args: &Args) -> Result<()> {
    if hotels.is_empty() {
        info!("No hotels to export");
        return Ok(());
    }

    // Optionally index into LanceDB
    if args.index {
        info!("Indexing {} hotels into LanceDB at {}", hotels.len(), args.db);
        let store = HotelStore::connect(&args.db, EmbeddingEngine::new(Device::Cpu)?)
            .await
            .context("connecting to LanceDB")?;
        store.add_hotels(hotels).await.context("indexing hotels")?;
    }

    // Compute relevance scores via Candle embedding similarity
    let query = format!("new affordable hotel Ischia thermal spa Italy {DISCOVERY_YEAR_STR} beach resort value budget");
    let query_vec = engine.embed_one(&query).context("embedding reference query")?;

    let texts: Vec<String> = hotels.iter().map(|h| h.embed_text()).collect();
    let text_refs: Vec<&str> = texts.iter().map(|s| s.as_str()).collect();
    let hotel_vecs = engine
        .embed_batch(&text_refs)
        .context("embedding hotels for scoring")?;

    let scores: Vec<f32> = hotel_vecs
        .iter()
        .map(|hvec| {
            let score: f32 = query_vec.iter().zip(hvec.iter()).map(|(a, b)| a * b).sum();
            score.clamp(0.0, 1.0)
        })
        .collect();

    if args.skip_reviews {
        let mut results: Vec<HotelSearchResult> = hotels
            .iter()
            .zip(scores.iter())
            .map(|(hotel, &score)| HotelSearchResult {
                hotel: hotel.clone(),
                score,
            })
            .collect();
        results.sort_by(|a, b| {
            a.hotel
                .price_eur
                .partial_cmp(&b.hotel.price_eur)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let json = serde_json::to_string_pretty(&results).context("serializing results")?;
        std::fs::write(&args.out, &json).context("writing output file")?;
        info!("Wrote {} hotels to {} (no review analysis)", results.len(), args.out);
        return Ok(());
    }

    // ── Review analysis pipeline ──
    info!("Loading hotel gallery images from pre-scraped data...");
    let mut hotels_with_images: Vec<Hotel> = hotels.to_vec();
    let gallery_paths = [
        "../../apps/travel/data/ischia_scraped_reviews.json",
        "apps/travel/data/ischia_scraped_reviews.json",
        "data/ischia_scraped_reviews.json",
    ];
    let gallery_file = gallery_paths.iter().find(|p| std::path::Path::new(p).exists());
    for hotel in &mut hotels_with_images {
        if let Some(path) = gallery_file {
            if let Some(images) = reviews::load_prescraped_gallery(&hotel.hotel_id, path) {
                info!("  {} — {} gallery images from pre-scraped data", hotel.name, images.len());
                hotel.gallery = images;
                continue;
            }
        }
        let images = reviews::scrape_hotel_images(&hotel).await;
        if !images.is_empty() {
            hotel.gallery = images;
        }
    }

    let analyses = reviews::analyze_all_hotels_with_reviews(engine, &hotels_with_images)
        .await
        .context("review analysis pipeline")?;

    let mut results: Vec<EnrichedSearchResult> = hotels_with_images
        .iter()
        .zip(scores.iter())
        .zip(analyses.into_iter())
        .map(|((hotel, &score), analysis)| EnrichedSearchResult {
            hotel: reviews::EnrichedHotel {
                hotel: hotel.clone(),
                analysis,
            },
            score,
        })
        .collect();

    results.sort_by(|a, b| {
        b.hotel
            .analysis
            .discovery_score
            .partial_cmp(&a.hotel.analysis.discovery_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(
                a.hotel
                    .hotel
                    .price_eur
                    .partial_cmp(&b.hotel.hotel.price_eur)
                    .unwrap_or(std::cmp::Ordering::Equal),
            )
    });

    let json = serde_json::to_string_pretty(&results).context("serializing results")?;
    std::fs::write(&args.out, &json).context("writing output file")?;
    info!("Wrote {} hotels to {}", results.len(), args.out);

    for (i, r) in results.iter().enumerate() {
        info!(
            "  #{} {} ({}*, €{}/night, {}) — discovery: {:.1}, sentiment: {:.2}, value: {:.0}, rating: {:.1}, reviews: {}, aspects: {}",
            i + 1,
            r.hotel.hotel.name,
            r.hotel.hotel.star_rating,
            r.hotel.hotel.price_eur,
            r.hotel.hotel.location,
            r.hotel.analysis.discovery_score,
            r.hotel.analysis.sentiment_score,
            r.hotel.analysis.value_score,
            r.hotel.analysis.review_rating,
            r.hotel.analysis.review_count,
            r.hotel.analysis.aspect_scores.len(),
        );
    }

    Ok(())
}
