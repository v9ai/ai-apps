//! Scrape reviews for all hotels in hotels_2026.json

use anyhow::{Context, Result};
use candle_core::Device;
use std::collections::HashMap;
use tracing::info;

use travel_ml::embeddings::EmbeddingEngine;
use travel_ml::reviews::{self, Review};
use travel_ml::review_store::{ReviewStore, StoredReview};
use travel_ml::hotel::Hotel;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    info!("=== Full Review Scraper for All Hotels ===");

    // Load existing hotels
    let hotels_path = "../../src/data/hotels_2026.json";
    let raw = std::fs::read_to_string(hotels_path)
        .with_context(|| format!("reading {hotels_path}"))?;
    
    let results: Vec<serde_json::Value> = serde_json::from_str(&raw)
        .with_context(|| format!("parsing {hotels_path}"))?;

    let mut hotels: Vec<Hotel> = Vec::new();
    for entry in &results {
        if let Some(hotel_val) = entry.get("hotel") {
            let hotel: Hotel = serde_json::from_value(hotel_val.clone())
                .context("deserializing hotel")?;
            hotels.push(hotel);
        }
    }

    info!("Loaded {} hotels", hotels.len());

    // Load pre-scraped reviews if available
    let prescraped_paths = [
        "../../data/scraped_reviews.json",
        "data/scraped_reviews.json",
    ];
    let prescraped_path = prescraped_paths.iter()
        .find(|p| std::path::Path::new(p).exists())
        .map(|s| s.to_string());

    info!("Pre-scraped path: {:?}", prescraped_path);

    // Scrape reviews for all hotels concurrently
    info!("Scraping reviews for {} hotels...", hotels.len());
    let scraped_data = reviews::scrape_reviews_batch(&hotels, prescraped_path.as_deref()).await;

    // Save scraped data to JSON
    let mut scraped_json: HashMap<String, HashMap<String, serde_json::Value>> = HashMap::new();
    
    for (hotel, data) in hotels.iter().zip(scraped_data.iter()) {
        let mut entry = HashMap::new();
        entry.insert("review_rating".to_string(), serde_json::Value::from(data.review_rating));
        entry.insert("review_count".to_string(), serde_json::Value::from(data.review_count));
        entry.insert("review_texts".to_string(), serde_json::to_value(&data.review_texts)?);
        entry.insert("sources".to_string(), serde_json::to_value(&data.sources)?);
        scraped_json.insert(hotel.hotel_id.clone(), entry);
    }

    let output_path = "../../data/scraped_reviews_full.json";
    let json = serde_json::to_string_pretty(&scraped_json)?;
    std::fs::write(output_path, &json)?;
    info!("Saved scraped data to {}", output_path);

    // Load embedding engine
    info!("Loading Candle embedding model...");
    let engine = EmbeddingEngine::new(Device::Cpu)?;

    // Run ML review analysis
    info!("Running Candle ML review analysis...");
    let analyses = reviews::analyze_from_scraped(&engine, &hotels, &scraped_data)?;

    // Build enriched results
    let mut enriched_results: Vec<serde_json::Value> = Vec::new();
    
    for (hotel, analysis) in hotels.iter().zip(analyses.iter()) {
        let result = serde_json::json!({
            "hotel": hotel,
            "analysis": analysis,
            "score": 0.5
        });
        enriched_results.push(result);
    }

    // Save enriched data
    let enriched_path = "../../src/data/hotels_2026_enriched.json";
    let json = serde_json::to_string_pretty(&enriched_results)?;
    std::fs::write(enriched_path, &json)?;
    info!("Saved enriched data to {}", enriched_path);

    // Store in LanceDB
    info!("Storing reviews in LanceDB...");
    let db_path = "data/reviews.lance";
    let store = ReviewStore::connect(db_path, engine).await?;

    let mut total_reviews = 0;
    for (hotel, analysis) in hotels.iter().zip(analyses.iter()) {
        let stored_reviews: Vec<StoredReview> = analysis.reviews
            .iter()
            .enumerate()
            .map(|(i, r)| ReviewStore::review_to_stored(r, &hotel.hotel_id, i))
            .collect();

        if !stored_reviews.is_empty() {
            let count = store.add_reviews(&stored_reviews).await?;
            total_reviews += count;
            info!("  {} — {} reviews stored (sentiment: {:.2}, value: {:.0})", 
                hotel.hotel_id, count, analysis.sentiment_score, analysis.value_score);
        }
    }

    info!("\n✅ Stored {} total reviews in {}", total_reviews, db_path);
    info!("📊 Review summary:");
    for (hotel, analysis) in hotels.iter().zip(analyses.iter()) {
        info!("  {}: rating {:.1}/10, {} reviews, sentiment {:.2}", 
            hotel.hotel_id, analysis.review_rating, analysis.review_count, analysis.sentiment_score);
    }

    Ok(())
}
