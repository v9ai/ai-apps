//! travel-sanitize: read hotels JSON, drop non-seaside entries, write back.
//!
//! Zero flags. Hardcodes the canonical output path relative to the crate root.
//! Usage: `cargo run --bin travel-sanitize`  (or `make sanitize` from apps/travel)

use anyhow::{Context, Result};
use tracing::info;

use travel_ml::discover::is_seaside_hotel;
use travel_ml::hotel::Hotel;

/// Canonical JSON path relative to crates/travel-ml/
const JSON_PATH: &str = "../../apps/travel/src/data/hotels_2026.json";

fn main() -> Result<()> {
    tracing_subscriber::fmt::init();

    let raw = std::fs::read_to_string(JSON_PATH)
        .with_context(|| format!("reading {JSON_PATH}"))?;
    let entries: Vec<serde_json::Value> =
        serde_json::from_str(&raw).context("parsing JSON array")?;
    let before = entries.len();

    let kept: Vec<serde_json::Value> = entries
        .into_iter()
        .filter(|entry| {
            let hotel_obj = entry
                .get("hotel")
                .and_then(|h| {
                    if h.get("hotel_id").is_some() { Some(h) } else { h.get("hotel") }
                })
                .unwrap_or(entry);

            let region = hotel_obj.get("region").and_then(|v| v.as_str()).unwrap_or("");
            let description = hotel_obj.get("description").and_then(|v| v.as_str()).unwrap_or("");
            let location = hotel_obj.get("location").and_then(|v| v.as_str()).unwrap_or("");
            let amenities: Vec<String> = hotel_obj
                .get("amenities")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|a| a.as_str().map(String::from)).collect())
                .unwrap_or_default();

            let probe = Hotel {
                hotel_id: String::new(),
                name: String::new(),
                description: description.to_string(),
                star_rating: 0,
                board_type: String::new(),
                price_eur: 0.0,
                location: location.to_string(),
                region: region.to_string(),
                lat: 0.0, lng: 0.0,
                source_url: String::new(),
                amenities,
                image_url: None,
                gallery: vec![],
                opened_year: None,
            };

            let pass = is_seaside_hotel(&probe);
            if !pass {
                let name = hotel_obj.get("name").and_then(|v| v.as_str()).unwrap_or("?");
                info!("Dropping inland hotel: {name} (region={region})");
            }
            pass
        })
        .collect();

    let removed = before - kept.len();
    let json = serde_json::to_string_pretty(&kept).context("serializing")?;
    std::fs::write(JSON_PATH, json.as_bytes()).with_context(|| format!("writing {JSON_PATH}"))?;
    info!("Sanitized: removed {removed} inland, {len} seaside remain", len = kept.len());
    Ok(())
}
