//! Process Katowice hotels with full ML review analysis.
//!
//! This binary loads the existing hotels_2026.json, re-runs review analysis
//! with Candle embeddings for all Katowice hotels, and exports the enriched data.

use anyhow::{Context, Result};
use candle_core::Device;
use std::path::Path;
use tracing::info;

use travel_ml::embeddings::EmbeddingEngine;
use travel_ml::reviews::{self, EnrichedSearchResult};
use travel_ml::hotel::Hotel;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    info!("=== Katowice Hotels Deep Review Analysis ===");

    // Load existing hotels
    let hotels_path = "../../src/data/hotels_2026.json";
    let raw = std::fs::read_to_string(hotels_path)
        .with_context(|| format!("reading {hotels_path}"))?;
    
    let results: Vec<serde_json::Value> = serde_json::from_str(&raw)
        .context("parsing JSON array")?;

    // Extract Katowice hotels
    let mut katowice_hotels: Vec<Hotel> = Vec::new();
    for entry in &results {
        if let Some(hotel_val) = entry.get("hotel") {
            if let Some(location) = hotel_val.get("location").and_then(|v| v.as_str()) {
                if location.contains("Katowice") || location.contains("Poland") {
                    let hotel: Hotel = serde_json::from_value(hotel_val.clone())
                        .context("deserializing hotel")?;
                    katowice_hotels.push(hotel);
                }
            }
        }
    }

    info!("Found {} Katowice hotels to process", katowice_hotels.len());

    if katowice_hotels.is_empty() {
        info!("No Katowice hotels found — nothing to process");
        return Ok(());
    }

    // Load pre-scraped reviews
    let prescraped_paths = [
        "../../data/scraped_reviews.json",
        "data/scraped_reviews.json",
        "../../../data/scraped_reviews.json",
    ];
    let prescraped_path = prescraped_paths.iter()
        .find(|p| Path::new(p).exists())
        .map(|s| s.to_string());

    info!("Loading pre-scraped reviews from: {:?}", prescraped_path);

    // Scrape review data for all hotels
    let scraped_data = reviews::scrape_reviews_batch(&katowice_hotels, prescraped_path.as_deref()).await;

    // Load embedding engine
    info!("Loading Candle embedding model (all-MiniLM-L6-v2)...");
    let engine = EmbeddingEngine::new(Device::Cpu)
        .context("loading embedding model")?;

    // Run full ML review analysis
    info!("Running Candle ML review analysis...");
    let analyses = reviews::analyze_from_scraped(&engine, &katowice_hotels, &scraped_data)
        .context("review analysis pipeline")?;

    // Load pre-scraped gallery images
    info!("Loading gallery images...");
    let mut hotels_with_images = katowice_hotels.clone();
    if let Some(path) = &prescraped_path {
        for (i, hotel) in hotels_with_images.iter_mut().enumerate() {
            if let Some(images) = reviews::load_prescraped_gallery(&hotel.hotel_id, path) {
                info!("  {} — {} gallery images", hotel.name, images.len());
                hotel.gallery = images;
            }
        }
    }

    // Get discovery scores from original data
    let mut enriched_results: Vec<EnrichedSearchResult> = katowice_hotels
        .into_iter()
        .zip(analyses.into_iter())
        .map(|(hotel, analysis)| {
            // Use existing score or default
            let score = 0.95; // Default for Katowice hotels
            EnrichedSearchResult {
                hotel: reviews::EnrichedHotel { hotel, analysis },
                score,
            }
        })
        .collect();

    // Sort by review rating descending
    enriched_results.sort_by(|a, b| {
        b.hotel.analysis.review_rating
            .partial_cmp(&a.hotel.analysis.review_rating)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Print summary
    info!("\n=== Analysis Complete ===");
    for (i, r) in enriched_results.iter().enumerate() {
        info!(
            "  #{} {} — rating: {:.1}/10, reviews: {}, sentiment: {:.2}, value: {:.0}",
            i + 1,
            r.hotel.hotel.name,
            r.hotel.analysis.review_rating,
            r.hotel.analysis.review_count,
            r.hotel.analysis.sentiment_score,
            r.hotel.analysis.value_score,
        );
        info!("      Aspects: {:?}", r.hotel.analysis.aspect_scores.keys().collect::<Vec<_>>());
    }

    // Export enriched data
    let out_path = "../../src/data/katowice_hotels_enriched.json";
    let json = serde_json::to_string_pretty(&enriched_results)
        .context("serializing results")?;
    std::fs::write(out_path, &json)
        .with_context(|| format!("writing {out_path}"))?;

    info!("\n✅ Wrote {} enriched hotels to {}", enriched_results.len(), out_path);
    info!("Ready to merge with hotels_2026.json");

    Ok(())
}
