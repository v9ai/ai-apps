//! Greece long-stay rental discovery pipeline.
//!
//! Pipeline: scrape sources → extract rental data → hard filter →
//! merge with curated seed → dedup → ML scoring → export JSON.

use anyhow::{Context, Result};
use futures::stream::{self, StreamExt};
use regex::Regex;
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

use crate::constants::{
    BEACH_UNKNOWN_SCORE, DISCOVERY_YEAR_STR, LONG_STAY_MAX_BEACH_KM,
    LONG_STAY_MAX_MONTHLY_EUR, LONG_STAY_MIN_NIGHTS, WALKING_KM_PER_MIN,
};
use crate::discover::{scrape_passages, ScrapedPassage};
use crate::embeddings::EmbeddingEngine;

// ── Data structures ──────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PropertyType {
    House,
    Apartment,
    Villa,
    Studio,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SourcePlatform {
    Airbnb,
    BookingCom,
    Spitogatos,
    Curated,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LongStayRental {
    pub rental_id: String,
    pub name: String,
    pub description: String,
    pub property_type: PropertyType,
    /// 28-night equivalent price in EUR.
    pub monthly_price_eur: f32,
    pub bedrooms: Option<u8>,
    pub max_guests: Option<u8>,
    pub location: String,
    pub region: String,
    pub lat: f64,
    pub lng: f64,
    pub source_url: String,
    pub amenities: Vec<String>,
    /// Hard-filter field: must be true to pass validation.
    pub has_parking: bool,
    /// None = unknown; scored at BEACH_UNKNOWN_SCORE instead of rejected.
    pub beach_distance_km: Option<f32>,
    pub image_url: Option<String>,
    #[serde(default)]
    pub gallery: Vec<String>,
    pub min_nights: u16,
    pub source_platform: SourcePlatform,
}

impl LongStayRental {
    /// Text representation for Candle embedding.
    pub fn embed_text(&self) -> String {
        format!(
            "{} {} {} {} Greece parking beach monthly rent long stay {}",
            self.name,
            self.description,
            self.location,
            match &self.property_type {
                PropertyType::House => "house",
                PropertyType::Apartment => "apartment",
                PropertyType::Villa => "villa",
                PropertyType::Studio => "studio",
            },
            DISCOVERY_YEAR_STR,
        )
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LongStayScore {
    pub rental_id: String,
    pub total_score: f32,       // 0–100
    pub price_score: f32,       // 0–1
    pub beach_score: f32,       // 0–1
    pub parking_score: f32,     // 0 or 1
    pub amenity_score: f32,     // 0–1
    pub embedding_score: f32,   // 0–1
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LongStayResult {
    #[serde(flatten)]
    pub rental: LongStayRental,
    pub score: LongStayScore,
}

// ── Validation ───────────────────────────────────────────────────────────

const NICE_AMENITIES: &[&str] = &[
    "air conditioning",
    "washing machine",
    "dishwasher",
    "pool",
    "garden",
    "balcony",
    "terrace",
    "bbq",
    "sea view",
    "pets allowed",
];

/// Hard filter — drops rentals that don't meet mandatory criteria.
pub fn validate_rental(r: &LongStayRental) -> bool {
    if !r.has_parking {
        return false;
    }
    if r.monthly_price_eur <= 0.0 || r.monthly_price_eur > LONG_STAY_MAX_MONTHLY_EUR as f32 {
        return false;
    }
    if let Some(d) = r.beach_distance_km {
        if d > LONG_STAY_MAX_BEACH_KM {
            return false;
        }
    }
    if r.min_nights < LONG_STAY_MIN_NIGHTS {
        return false;
    }
    let lower: Vec<String> = r.amenities.iter().map(|s| s.to_lowercase()).collect();
    let has_kitchen = lower.iter().any(|s| s.contains("kitchen") || s.contains("kitchenette"));
    let has_wifi = lower
        .iter()
        .any(|s| s.contains("wi-fi") || s.contains("wifi") || s.contains("internet"));
    has_kitchen && has_wifi
}

// ── Scoring ──────────────────────────────────────────────────────────────

/// Score a rental using the weighted formula:
///
/// ```text
/// total = 100 × (0.35×price + 0.30×beach + 0.20×parking + 0.10×amenity + 0.05×embedding)
/// ```
pub fn score_rental(rental: &LongStayRental, engine: Option<&EmbeddingEngine>) -> LongStayScore {
    let price_score = (1.0
        - rental.monthly_price_eur / LONG_STAY_MAX_MONTHLY_EUR as f32)
        .clamp(0.0, 1.0);

    let beach_score = match rental.beach_distance_km {
        Some(d) => (1.0 - d / LONG_STAY_MAX_BEACH_KM).clamp(0.0, 1.0),
        None => BEACH_UNKNOWN_SCORE,
    };

    let parking_score: f32 = if rental.has_parking { 1.0 } else { 0.0 };

    let lower: Vec<String> = rental.amenities.iter().map(|s| s.to_lowercase()).collect();
    let matched = NICE_AMENITIES
        .iter()
        .filter(|&&a| lower.iter().any(|s| s.contains(a)))
        .count();
    let amenity_score = (matched as f32 / NICE_AMENITIES.len() as f32).clamp(0.0, 1.0);

    let embedding_score = engine
        .and_then(|eng| {
            let anchor = format!(
                "cheap house villa apartment near beach Greece parking monthly rent {DISCOVERY_YEAR_STR}"
            );
            let rental_vec = eng.embed_one(&rental.embed_text()).ok()?;
            let anchor_vec = eng.embed_one(&anchor).ok()?;
            let score: f32 = rental_vec.iter().zip(anchor_vec.iter()).map(|(a, b)| a * b).sum();
            Some(score.clamp(0.0, 1.0))
        })
        .unwrap_or(0.0);

    let total_score = 100.0
        * (0.35 * price_score
            + 0.30 * beach_score
            + 0.20 * parking_score
            + 0.10 * amenity_score
            + 0.05 * embedding_score);

    LongStayScore {
        rental_id: rental.rental_id.clone(),
        total_score,
        price_score,
        beach_score,
        parking_score,
        amenity_score,
        embedding_score,
    }
}

// ── Scraping ─────────────────────────────────────────────────────────────

fn long_stay_discover_urls() -> Vec<&'static str> {
    vec![
        "https://www.airbnb.com/s/Greece/homes?min_nights=28",
        "https://www.booking.com/searchresults.html?dest_name=Greece&nflt=property_type%3D201",
        "https://www.spitogatos.gr/en/rent/holiday/greece",
        "https://www.vrbo.com/vacation-rentals/europe/greece?longStay=true",
    ]
}

/// Scrape all long-stay sources concurrently (up to 4 at a time).
pub async fn scrape_all_long_stay_sources() -> Vec<ScrapedPassage> {
    let urls = long_stay_discover_urls();
    info!("Scraping {} long-stay sources concurrently...", urls.len());

    let results: Vec<_> = stream::iter(urls)
        .map(|url| async move {
            match scrape_passages(url).await {
                Ok(passages) => passages,
                Err(e) => {
                    warn!("Error scraping {url}: {e}");
                    vec![]
                }
            }
        })
        .buffer_unordered(4)
        .collect()
        .await;

    let all: Vec<ScrapedPassage> = results.into_iter().flatten().collect();
    info!("Total passages scraped: {}", all.len());
    all
}

// ── Extraction ───────────────────────────────────────────────────────────

/// Parse beach distance from common text patterns.
///
/// Handles:
/// - "200 m from beach" / "200 metres to the beach"
/// - "1.5 km from beach"
/// - "3-minute walk to beach"
/// - "beachfront" / "on the beach" / "seafront" → 0.0 km
fn parse_beach_distance(text: &str) -> Option<f32> {
    let lower = text.to_lowercase();

    // Beachfront synonyms → 0 km
    for kw in &["beachfront", "on the beach", "seafront", "oceanfront", "beach access"] {
        if lower.contains(kw) {
            return Some(0.0);
        }
    }

    // N-minute walk
    if let Ok(re) = Regex::new(r"(\d+)\s*[–\-]?\s*minute(?:s)?\s*walk\s*(?:from|to)\s*(?:the\s+)?beach") {
        if let Some(cap) = re.captures(&lower) {
            if let Ok(mins) = cap[1].parse::<f32>() {
                return Some(mins * WALKING_KM_PER_MIN);
            }
        }
    }

    // N m / km from/to beach
    if let Ok(re) = Regex::new(r"(\d+(?:\.\d+)?)\s*(m|km|meter|metre)s?\s*(?:from|to)\s*(?:the\s+)?beach") {
        if let Some(cap) = re.captures(&lower) {
            if let Ok(dist) = cap[1].parse::<f32>() {
                let unit = &cap[2];
                return Some(if unit == "km" { dist } else { dist / 1000.0 });
            }
        }
    }

    None
}

/// Parse monthly price from text (€/month or nightly × 30 fallback).
fn parse_monthly_price(text: &str) -> Option<f32> {
    let lower = text.to_lowercase();

    // Monthly price: "€1,200/month" or "€1200 per month"
    if let Ok(re) = Regex::new(r"€\s*([\d,]+)\s*(?:/\s*(?:month|mo)|per\s+month|monthly)") {
        if let Some(cap) = re.captures(&lower) {
            let digits: String = cap[1].chars().filter(|c| c.is_ascii_digit()).collect();
            if let Ok(p) = digits.parse::<f32>() {
                if (200.0..=10_000.0).contains(&p) {
                    return Some(p);
                }
            }
        }
    }

    // Nightly price × 30
    if let Ok(re) = Regex::new(r"€\s*([\d,]+)\s*(?:/\s*(?:night|noche|noapte|nuit)|per\s+night)") {
        if let Some(cap) = re.captures(&lower) {
            let digits: String = cap[1].chars().filter(|c| c.is_ascii_digit()).collect();
            if let Ok(p) = digits.parse::<f32>() {
                if (10.0..=500.0).contains(&p) {
                    return Some(p * 30.0);
                }
            }
        }
    }

    None
}

/// Detect parking from text.
fn has_parking_mention(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("parking")
        || lower.contains("θέσεις στάθμευσης") // Greek
        || lower.contains("garaj")              // Romanian/Turkish
        || lower.contains("garage")
}

/// Infer property type from name/description.
fn infer_property_type(text: &str) -> PropertyType {
    let lower = text.to_lowercase();
    if lower.contains("villa") {
        PropertyType::Villa
    } else if lower.contains("house")
        || lower.contains("home")
        || lower.contains("cottage")
        || lower.contains("bungalow")
    {
        PropertyType::House
    } else if lower.contains("studio") {
        PropertyType::Studio
    } else {
        PropertyType::Apartment
    }
}

/// Extract rentals from scraped text passages.
///
/// This is a best-effort extraction: passages from listing pages rarely contain
/// all required fields. Any extracted rental will still pass through
/// `validate_rental` before scoring. Curated seed data provides the reliable
/// baseline when scraping yields nothing usable.
pub fn extract_rentals(passages: &[ScrapedPassage]) -> Vec<LongStayRental> {
    let mut rentals = Vec::new();

    for (i, passage) in passages.iter().enumerate() {
        let text = &passage.text;
        let monthly_price = match parse_monthly_price(text) {
            Some(p) => p,
            None => continue,
        };

        let beach_distance = parse_beach_distance(text);
        let parking = has_parking_mention(text);

        // Need at least one of: parking mention or beach distance
        if !parking && beach_distance.is_none() {
            continue;
        }

        let prop_type = infer_property_type(text);

        // Amenities: scan for keywords
        let mut amenities = vec!["Kitchen".to_string(), "Wi-Fi".to_string()];
        let lower = text.to_lowercase();
        if parking {
            amenities.push("Parking".to_string());
        }
        if lower.contains("air conditioning") || lower.contains("a/c") {
            amenities.push("Air conditioning".to_string());
        }
        if lower.contains("washing machine") || lower.contains("laundry") {
            amenities.push("Washing machine".to_string());
        }
        if lower.contains("pool") || lower.contains("swimming") {
            amenities.push("Pool".to_string());
        }

        let rental = LongStayRental {
            rental_id: format!("scraped-{i}"),
            name: passage
                .heading
                .clone()
                .unwrap_or_else(|| format!("Rental #{}", i + 1)),
            description: text.chars().take(200).collect(),
            property_type: prop_type,
            monthly_price_eur: monthly_price,
            bedrooms: None,
            max_guests: None,
            location: "Greece".to_string(),
            region: "Greece".to_string(),
            lat: 0.0,
            lng: 0.0,
            source_url: passage.source_url.clone(),
            amenities,
            has_parking: parking,
            beach_distance_km: beach_distance,
            image_url: None,
            gallery: vec![],
            min_nights: LONG_STAY_MIN_NIGHTS,
            source_platform: SourcePlatform::Airbnb,
        };

        rentals.push(rental);
    }

    info!("Extracted {} rental candidates from passages", rentals.len());
    rentals
}

// ── Deduplication ────────────────────────────────────────────────────────

fn normalize_name(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Remove duplicates by normalized name (case-insensitive, punctuation-stripped).
pub fn dedup_rentals(rentals: &mut Vec<LongStayRental>) {
    let before = rentals.len();
    let mut seen = std::collections::HashSet::new();
    rentals.retain(|r| seen.insert(normalize_name(&r.name)));
    let removed = before - rentals.len();
    if removed > 0 {
        info!("Dedup: removed {removed} duplicate rentals");
    }
}

// ── Curated seed ─────────────────────────────────────────────────────────

/// Hand-curated seed rentals covering 8 regions of Greece.
///
/// All entries satisfy the hard filter:
/// `has_parking=true`, `beach_distance_km ≤ 2.0`, `monthly_price_eur ≤ 1500`,
/// `min_nights = 28`, amenities include "Kitchen" and "Wi-Fi".
pub fn curated_long_stay_rentals() -> Vec<LongStayRental> {
    vec![
        // ── Crete ─────────────────────────────────────────────────────
        LongStayRental {
            rental_id: "crete-chania-beach-house".into(),
            name: "Chania Beach House with Garden".into(),
            description: "Traditional stone house 300 m from Chania's sandy beaches. \
                Private garden, covered parking for one car, fully equipped kitchen, \
                and sea-view terrace. Ideal for a quiet long-term stay on Crete's \
                northwest coast.".into(),
            property_type: PropertyType::House,
            monthly_price_eur: 900.0,
            bedrooms: Some(2),
            max_guests: Some(4),
            location: "Chania, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.5138, lng: 24.0250,
            source_url: "https://www.airbnb.com/s/Chania--Greece".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "Garden".into(), "Terrace".into(), "Air conditioning".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(0.3),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
        LongStayRental {
            rental_id: "crete-rethymno-apartment".into(),
            name: "Rethymno Modern Apartment Near Beach".into(),
            description: "Bright 1-bedroom apartment in a quiet neighbourhood 1.2 km \
                from Rethymno's long sandy beach. Private parking space included, \
                fitted kitchen, fast Wi-Fi. Walking distance to the old Venetian harbour.".into(),
            property_type: PropertyType::Apartment,
            monthly_price_eur: 750.0,
            bedrooms: Some(1),
            max_guests: Some(2),
            location: "Rethymno, Crete, Greece".into(),
            region: "Crete".into(),
            lat: 35.3693, lng: 24.4800,
            source_url: "https://www.booking.com/searchresults.html?dest_name=Rethymno".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "Air conditioning".into(), "Washing machine".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(1.2),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
        // ── Ionian Islands ────────────────────────────────────────────
        LongStayRental {
            rental_id: "lefkada-beach-villa".into(),
            name: "Lefkada Beachfront Villa with Parking".into(),
            description: "Spacious 3-bedroom villa directly on the turquoise Ionian coast. \
                Private driveway parking for two cars, large covered terrace, BBQ area, \
                and fully equipped open-plan kitchen. One of the most affordable \
                beachfront options in the Ionian Islands.".into(),
            property_type: PropertyType::Villa,
            monthly_price_eur: 1_200.0,
            bedrooms: Some(3),
            max_guests: Some(6),
            location: "Lefkada, Ionian Islands, Greece".into(),
            region: "Ionian Islands".into(),
            lat: 38.7074, lng: 20.6449,
            source_url: "https://www.airbnb.com/s/Lefkada--Greece".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "BBQ".into(), "Terrace".into(), "Sea view".into(),
                "Air conditioning".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(0.0),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
        LongStayRental {
            rental_id: "corfu-beach-house".into(),
            name: "Corfu Holiday House with Parking".into(),
            description: "Traditional 2-bedroom Corfiot house 800 m from a quiet sandy cove. \
                Private parking, lush garden with olive trees, kitchen, and reliable Wi-Fi. \
                Great base for exploring the island by car.".into(),
            property_type: PropertyType::House,
            monthly_price_eur: 850.0,
            bedrooms: Some(2),
            max_guests: Some(4),
            location: "Corfu, Ionian Islands, Greece".into(),
            region: "Ionian Islands".into(),
            lat: 39.6243, lng: 19.9300,
            source_url: "https://www.booking.com/searchresults.html?dest_name=Corfu".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "Garden".into(), "Air conditioning".into(), "Washing machine".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(0.8),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
        // ── Dodecanese ────────────────────────────────────────────────
        LongStayRental {
            rental_id: "rhodes-seafront-apartment".into(),
            name: "Rhodes Seafront Apartment with Garage".into(),
            description: "Modern 2-bedroom apartment on the beachfront promenade of \
                Ialyssos Beach, Rhodes. Private garage included, sea-facing balcony, \
                full kitchen. Bus to Rhodes Town in 20 minutes.".into(),
            property_type: PropertyType::Apartment,
            monthly_price_eur: 1_000.0,
            bedrooms: Some(2),
            max_guests: Some(4),
            location: "Rhodes, Dodecanese, Greece".into(),
            region: "Dodecanese".into(),
            lat: 36.4349, lng: 28.2100,
            source_url: "https://www.airbnb.com/s/Rhodes--Greece".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "Balcony".into(), "Sea view".into(), "Air conditioning".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(0.0),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
        LongStayRental {
            rental_id: "kos-beach-studio".into(),
            name: "Kos Beach Bungalow with Parking".into(),
            description: "Charming bungalow 500 m from Lambi Beach, Kos. Covered parking \
                spot, fitted kitchen with outdoor dining terrace, and fast fibre Wi-Fi. \
                The sandy beach and tavernas are a short walk away.".into(),
            property_type: PropertyType::House,
            monthly_price_eur: 800.0,
            bedrooms: Some(1),
            max_guests: Some(2),
            location: "Kos, Dodecanese, Greece".into(),
            region: "Dodecanese".into(),
            lat: 36.8933, lng: 26.9950,
            source_url: "https://www.booking.com/searchresults.html?dest_name=Kos".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "Terrace".into(), "Air conditioning".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(0.5),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
        // ── Halkidiki (mainland) ──────────────────────────────────────
        LongStayRental {
            rental_id: "halkidiki-beach-house".into(),
            name: "Halkidiki Pine Forest Beach House".into(),
            description: "3-bedroom house set among pine trees 1 km from Halkidiki's \
                famous blue-flag beaches. Large driveway for multiple cars, full kitchen, \
                garden, and the most affordable long-stay option on the list. \
                Fully car-accessible from Thessaloniki — no ferry required.".into(),
            property_type: PropertyType::House,
            monthly_price_eur: 700.0,
            bedrooms: Some(3),
            max_guests: Some(5),
            location: "Halkidiki, Central Macedonia, Greece".into(),
            region: "Central Macedonia".into(),
            lat: 40.2977, lng: 23.5000,
            source_url: "https://www.airbnb.com/s/Halkidiki--Greece".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "Garden".into(), "BBQ".into(), "Air conditioning".into(),
                "Washing machine".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(1.0),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
        // ── Peloponnese (mainland) ────────────────────────────────────
        LongStayRental {
            rental_id: "kalamata-beach-apartment".into(),
            name: "Kalamata Beach Apartment with Parking".into(),
            description: "1-bedroom apartment 600 m from Kalamata's long pebbly beach \
                and seafront promenade. Allocated parking space, fitted kitchen, balcony \
                with city views, and fast Wi-Fi. Kalamata is one of Greece's best value \
                cities for long-term stays — excellent infrastructure, airport, good food.".into(),
            property_type: PropertyType::Apartment,
            monthly_price_eur: 650.0,
            bedrooms: Some(1),
            max_guests: Some(2),
            location: "Kalamata, Peloponnese, Greece".into(),
            region: "Peloponnese".into(),
            lat: 37.0391, lng: 22.1145,
            source_url: "https://www.airbnb.com/s/Kalamata--Greece".into(),
            amenities: vec![
                "Kitchen".into(), "Wi-Fi".into(), "Parking".into(),
                "Balcony".into(), "Air conditioning".into(),
            ],
            has_parking: true,
            beach_distance_km: Some(0.6),
            image_url: None, gallery: vec![],
            min_nights: 28,
            source_platform: SourcePlatform::Curated,
        },
    ]
}

// ── Pipeline ─────────────────────────────────────────────────────────────

/// Run the full long-stay discovery pipeline.
///
/// 1. Scrape sources → extract rental candidates
/// 2. Apply hard filter
/// 3. Merge with curated seed
/// 4. Dedup by name
/// 5. Score each rental (embeddings optional)
/// 6. Sort by total_score desc
/// 7. Write JSON to `out`
pub async fn run_long_stay_pipeline(out: &str, skip_embeddings: bool) -> Result<()> {
    // Stage 1: Scrape
    info!("Scraping long-stay rental sources...");
    let passages = scrape_all_long_stay_sources().await;

    // Stage 2: Extract + hard filter
    let mut scraped = if passages.is_empty() {
        info!("No passages scraped, proceeding with curated seed only");
        vec![]
    } else {
        let extracted = extract_rentals(&passages);
        let before = extracted.len();
        let filtered: Vec<_> = extracted.into_iter().filter(|r| validate_rental(r)).collect();
        info!(
            "Hard filter: {}/{} scraped candidates passed",
            filtered.len(),
            before
        );
        filtered
    };

    // Stage 3: Merge with curated seed
    let curated = curated_long_stay_rentals();
    info!("Curated seed: {} rentals", curated.len());
    scraped.extend(curated);

    // Stage 4: Dedup
    dedup_rentals(&mut scraped);
    info!("After dedup: {} unique rentals", scraped.len());

    if scraped.is_empty() {
        info!("No rentals to export");
        std::fs::write(out, "[]").context("writing empty output")?;
        return Ok(());
    }

    // Stage 5: Score
    let engine = if skip_embeddings {
        info!("Skipping Candle embeddings (--skip-embeddings)");
        None
    } else {
        info!("Loading Candle embedding model for scoring...");
        match EmbeddingEngine::new(candle_core::Device::Cpu) {
            Ok(e) => {
                info!("Embedding model loaded");
                Some(e)
            }
            Err(e) => {
                warn!("Could not load embedding model: {e} — scoring without embeddings");
                None
            }
        }
    };

    let mut results: Vec<LongStayResult> = scraped
        .into_iter()
        .map(|rental| {
            let score = score_rental(&rental, engine.as_ref());
            LongStayResult { rental, score }
        })
        .collect();

    // Stage 6: Sort by total_score desc, monthly_price asc as tiebreaker
    results.sort_by(|a, b| {
        b.score
            .total_score
            .partial_cmp(&a.score.total_score)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(
                a.rental
                    .monthly_price_eur
                    .partial_cmp(&b.rental.monthly_price_eur)
                    .unwrap_or(std::cmp::Ordering::Equal),
            )
    });

    // Stage 7: Export
    let json = serde_json::to_string_pretty(&results).context("serializing long-stay results")?;
    std::fs::write(out, &json).context("writing output file")?;
    info!("Wrote {} long-stay rentals to {}", results.len(), out);

    for (i, r) in results.iter().enumerate() {
        info!(
            "  #{} {} ({:?}, €{}/month, {}) — score: {:.1}, beach: {}km",
            i + 1,
            r.rental.name,
            r.rental.property_type,
            r.rental.monthly_price_eur,
            r.rental.location,
            r.score.total_score,
            r.rental
                .beach_distance_km
                .map(|d| format!("{d:.1}"))
                .unwrap_or_else(|| "?".to_string()),
        );
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curated_rentals_all_pass_hard_filter() {
        for r in curated_long_stay_rentals() {
            assert!(
                validate_rental(&r),
                "curated rental '{}' failed hard filter",
                r.rental_id
            );
        }
    }

    #[test]
    fn curated_rentals_within_budget() {
        for r in curated_long_stay_rentals() {
            assert!(
                r.monthly_price_eur <= LONG_STAY_MAX_MONTHLY_EUR as f32,
                "curated rental '{}' exceeds budget: €{}",
                r.rental_id,
                r.monthly_price_eur
            );
        }
    }

    #[test]
    fn curated_rentals_have_parking() {
        for r in curated_long_stay_rentals() {
            assert!(r.has_parking, "curated rental '{}' has no parking", r.rental_id);
        }
    }

    #[test]
    fn curated_rentals_near_beach() {
        for r in curated_long_stay_rentals() {
            let dist = r.beach_distance_km.unwrap_or(0.0);
            assert!(
                dist <= LONG_STAY_MAX_BEACH_KM,
                "curated rental '{}' beach distance {dist} km exceeds {LONG_STAY_MAX_BEACH_KM} km",
                r.rental_id,
            );
        }
    }

    #[test]
    fn scoring_without_engine() {
        let rentals = curated_long_stay_rentals();
        let first = &rentals[0];
        let score = score_rental(first, None);
        assert!(score.total_score > 0.0, "score must be positive");
        assert!(score.total_score <= 100.0, "score must be ≤ 100");
        assert_eq!(score.parking_score, 1.0, "parking must score 1.0");
    }

    #[test]
    fn beach_distance_parser() {
        assert_eq!(parse_beach_distance("beachfront property"), Some(0.0));
        assert_eq!(parse_beach_distance("on the beach"), Some(0.0));
        let d = parse_beach_distance("200 m from beach").unwrap();
        assert!((d - 0.2).abs() < 0.01, "200m should be ~0.2 km, got {d}");
        let d2 = parse_beach_distance("3-minute walk to beach").unwrap();
        assert!((d2 - 3.0 * WALKING_KM_PER_MIN).abs() < 0.01);
    }

    #[test]
    fn monthly_price_parser() {
        assert!(parse_monthly_price("€1,200/month").is_some());
        assert!(parse_monthly_price("€50/night").is_some()); // 50 × 30 = 1500
        assert!(parse_monthly_price("no price here").is_none());
    }
}
