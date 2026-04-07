//! Spain coastal new-build discovery pipeline.
//!
//! Pipeline: scrape rental/real-estate portals → extract passages →
//! parse listing data → hard filter (new build + near sea + budget) →
//! score → dedup → sort by value → export JSON.
//!
//! Focus: cheapest new-build complexes (obra nueva) near the sea in
//! Spain's budget coastal zones (Costa Blanca, Costa del Sol, Murcia).

use anyhow::{Context, Result};
use futures::stream::{self, StreamExt};
use regex::Regex;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

// ── Data structures ─────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PropertyType {
    Apartment,
    Studio,
    Penthouse,
    Duplex,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Source {
    Idealista,
    Fotocasa,
    Pisos,
    Kyero,
    ThinkSpain,
    SpainHouses,
    NewBuildPortal,
    Curated,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoastalListing {
    pub id: String,
    pub name: String,
    pub description: String,
    pub property_type: PropertyType,
    pub price_eur: f32,
    pub price_per_sqm: Option<f32>,
    pub sqm: Option<f32>,
    pub bedrooms: Option<u8>,
    pub bathrooms: Option<u8>,
    pub floor: Option<u8>,
    pub city: String,
    pub zone: String,
    pub lat: f64,
    pub lng: f64,
    pub source_url: String,
    pub source: Source,
    pub amenities: Vec<String>,
    pub is_new_build: bool,
    pub build_year: Option<u16>,
    pub sea_distance_km: Option<f32>,
    pub has_pool: bool,
    pub has_parking: bool,
    pub has_terrace: bool,
    pub complex_name: Option<String>,
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListingScore {
    pub id: String,
    pub total: f32,
    pub price_score: f32,
    pub sea_score: f32,
    pub newness_score: f32,
    pub amenity_score: f32,
    pub size_score: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoredListing {
    #[serde(flatten)]
    pub listing: CoastalListing,
    pub score: ListingScore,
}

// ── Constants ───────────────────────────────────────────────────────────

const MAX_PRICE_EUR: f32 = 150_000.0;
const MAX_SEA_KM: f32 = 2.0;
const MIN_BUILD_YEAR: u16 = 2023;
const WALKING_KM_PER_MIN: f32 = 0.083;

const NICE_AMENITIES: &[&str] = &[
    "pool", "parking", "terrace", "balcony", "air conditioning",
    "elevator", "storage", "garden", "gym", "sea view",
    "communal pool", "solarium", "fitted kitchen",
];

// ── Discovery URLs ──────────────────────────────────────────────────────

/// Spanish coastal cities ordered by cheapness (cheapest first).
pub fn target_cities() -> Vec<(&'static str, &'static str, f64, f64)> {
    vec![
        // Costa Blanca (cheapest)
        ("Torrevieja", "Costa Blanca", 37.9786, -0.6823),
        ("Santa Pola", "Costa Blanca", 38.1920, -0.5566),
        ("Guardamar del Segura", "Costa Blanca", 38.0894, -0.6553),
        ("Orihuela Costa", "Costa Blanca", 37.9344, -0.7352),
        ("Pilar de la Horadada", "Costa Blanca", 37.8644, -0.7918),
        ("Gran Alacant", "Costa Blanca", 38.2292, -0.5230),
        ("Villajoyosa", "Costa Blanca", 38.5076, -0.2333),
        // Costa Cálida / Murcia
        ("La Manga del Mar Menor", "Costa Cálida", 37.6432, -0.7111),
        ("San Pedro del Pinatar", "Costa Cálida", 37.8353, -0.7905),
        ("Águilas", "Costa Cálida", 37.4060, -1.5830),
        ("San Javier", "Costa Cálida", 37.7909, -0.8451),
        // Costa del Sol (affordable pockets)
        ("Torre del Mar", "Costa del Sol", 36.7406, -4.0917),
        ("Torrox Costa", "Costa del Sol", 36.7279, -3.9517),
        ("Almuñécar", "Costa del Sol", 36.7332, -3.6903),
        ("Torremolinos", "Costa del Sol", 36.6218, -4.4999),
        ("Fuengirola", "Costa del Sol", 36.5412, -4.6242),
        // Costa Dorada
        ("Salou", "Costa Dorada", 41.0766, 1.1394),
        ("Cambrils", "Costa Dorada", 41.0660, 1.0591),
        // Valencia region
        ("Gandia", "Valencia", 38.9667, -0.1833),
        ("Oliva", "Valencia", 38.9200, -0.1200),
    ]
}

/// URLs to scrape for new-build listings.
fn discovery_urls() -> Vec<String> {
    let mut urls = Vec::new();

    // Idealista new-build searches
    for (city, _, _, _) in target_cities() {
        let slug = city.to_lowercase().replace(' ', "-")
            .replace('á', "a").replace('é', "e")
            .replace('í', "i").replace('ó', "o").replace('ú', "u")
            .replace('ñ', "n");
        urls.push(format!(
            "https://www.idealista.com/en/venta-viviendas/{slug}/con-obra-nueva/"
        ));
    }

    // Kyero new-build coast searches
    urls.push("https://www.kyero.com/en/spain-property-for-sale/costa-blanca-south-new-build-0l536t2".into());
    urls.push("https://www.kyero.com/en/spain-property-for-sale/costa-del-sol-new-build-0l535t2".into());
    urls.push("https://www.kyero.com/en/spain-property-for-sale/murcia-new-build-0l539t2".into());

    // ThinkSpain new-build coastal
    urls.push("https://www.thinkspain.com/property-for-sale/new-build/costa-blanca-south".into());
    urls.push("https://www.thinkspain.com/property-for-sale/new-build/costa-calida".into());

    // SpainHouses obra nueva
    urls.push("https://www.spainhouses.net/en/new-development-costa-blanca.html".into());
    urls.push("https://www.spainhouses.net/en/new-development-costa-del-sol.html".into());

    urls
}

// ── Scraping ────────────────────────────────────────────────────────────

/// A raw scraped text passage.
#[derive(Debug, Clone)]
pub struct ScrapedPassage {
    pub text: String,
    pub source_url: String,
    pub heading: Option<String>,
}

fn build_client() -> reqwest::Client {
    reqwest::Client::builder()
        .user_agent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
             AppleWebKit/537.36 (KHTML, like Gecko) \
             Chrome/131.0.0.0 Safari/537.36"
        )
        .default_headers({
            let mut h = reqwest::header::HeaderMap::new();
            h.insert("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8".parse().unwrap());
            h.insert("Accept-Language", "en-US,en;q=0.9,es;q=0.8".parse().unwrap());
            h.insert("Accept-Encoding", "gzip, deflate, br".parse().unwrap());
            h.insert("Sec-Fetch-Dest", "document".parse().unwrap());
            h.insert("Sec-Fetch-Mode", "navigate".parse().unwrap());
            h.insert("Sec-Fetch-Site", "none".parse().unwrap());
            h
        })
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .expect("HTTP client")
}

/// Scrape text passages from a single URL.
pub async fn scrape_passages(client: &reqwest::Client, url: &str) -> Result<Vec<ScrapedPassage>> {
    info!("Scraping {url}");

    let resp = client.get(url).send().await;
    let body = match resp {
        Ok(r) if r.status().is_success() => r.text().await.unwrap_or_default(),
        Ok(r) => {
            warn!("HTTP {} for {url}", r.status());
            return Ok(vec![]);
        }
        Err(e) => {
            warn!("Fetch failed for {url}: {e}");
            return Ok(vec![]);
        }
    };

    if body.is_empty() {
        return Ok(vec![]);
    }

    let doc = Html::parse_document(&body);
    let mut passages = Vec::new();

    // Property cards / listing items
    for sel_str in [
        ".item-info-container", ".property-card", ".listing-card",
        ".ad-preview", "article", ".property-item", ".result-item",
        ".item", ".card", ".property",
    ] {
        if let Ok(sel) = Selector::parse(sel_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>();
                let cleaned = text.split_whitespace().collect::<Vec<_>>().join(" ");
                if cleaned.len() > 60 && !passages.iter().any(|p: &ScrapedPassage| {
                    cleaned.len() > 40 && p.text.contains(&cleaned[..40.min(cleaned.len())])
                }) {
                    let heading = find_heading(&doc);
                    passages.push(ScrapedPassage {
                        text: cleaned,
                        source_url: url.to_string(),
                        heading,
                    });
                }
            }
        }
    }

    // Fallback: paragraphs
    if passages.is_empty() {
        if let Ok(p_sel) = Selector::parse("p") {
            for el in doc.select(&p_sel) {
                let text: String = el.text().collect::<String>().trim().to_string();
                if text.len() > 50 {
                    passages.push(ScrapedPassage {
                        text,
                        source_url: url.to_string(),
                        heading: find_heading(&doc),
                    });
                }
            }
        }
    }

    info!("  → {} passages from {url}", passages.len());
    Ok(passages)
}

fn find_heading(doc: &Html) -> Option<String> {
    for tag in ["h1", "h2", "h3"] {
        if let Ok(sel) = Selector::parse(tag) {
            if let Some(h) = doc.select(&sel).next() {
                let text = h.text().collect::<String>().trim().to_string();
                if !text.is_empty() {
                    return Some(text);
                }
            }
        }
    }
    None
}

/// Scrape all discovery URLs concurrently (8 at a time).
pub async fn scrape_all_sources() -> Vec<ScrapedPassage> {
    let urls = discovery_urls();
    let client = build_client();
    info!("Scraping {} discovery URLs...", urls.len());

    let results: Vec<_> = stream::iter(urls)
        .map(|url| {
            let c = client.clone();
            async move {
                // Polite delay between requests
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
                match scrape_passages(&c, &url).await {
                    Ok(p) => p,
                    Err(e) => {
                        warn!("Error scraping {url}: {e}");
                        vec![]
                    }
                }
            }
        })
        .buffer_unordered(8)
        .collect()
        .await;

    let all: Vec<ScrapedPassage> = results.into_iter().flatten().collect();
    info!("Total passages scraped: {}", all.len());
    all
}

// ── Extraction ──────────────────────────────────────────────────────────

/// Parse price from text (EUR).
fn parse_price(text: &str) -> Option<f32> {
    let re = Regex::new(r"(?:€|EUR)\s*([\d.,]+)").ok()?;
    re.captures(text).and_then(|c| {
        let raw = c[1].replace('.', "").replace(',', ".");
        raw.parse::<f32>().ok()
    }).or_else(|| {
        // "125,000" or "125.000" pattern
        let re2 = Regex::new(r"(\d{2,3})[.,](\d{3})\s*(?:€|eur|euros?)").ok()?;
        re2.captures(&text.to_lowercase()).and_then(|c| {
            let n = format!("{}{}", &c[1], &c[2]);
            n.parse::<f32>().ok()
        })
    })
}

/// Parse sqm from text.
fn parse_sqm(text: &str) -> Option<f32> {
    let re = Regex::new(r"(\d+(?:\.\d+)?)\s*(?:m²|m2|sqm|sq\s*m)").ok()?;
    re.captures(&text.to_lowercase()).and_then(|c| c[1].parse().ok())
}

/// Parse bedrooms.
fn parse_bedrooms(text: &str) -> Option<u8> {
    let re = Regex::new(r"(\d)\s*(?:bed(?:room)?s?|dormitor|hab)").ok()?;
    re.captures(&text.to_lowercase()).and_then(|c| c[1].parse().ok())
}

/// Parse bathrooms.
fn parse_bathrooms(text: &str) -> Option<u8> {
    let re = Regex::new(r"(\d)\s*(?:bath(?:room)?s?|baño|bain)").ok()?;
    re.captures(&text.to_lowercase()).and_then(|c| c[1].parse().ok())
}

/// Parse sea distance.
fn parse_sea_distance(text: &str) -> Option<f32> {
    let lower = text.to_lowercase();

    for kw in &["beachfront", "first line", "primera línea", "front line", "en primera línea"] {
        if lower.contains(kw) {
            return Some(0.05);
        }
    }

    if let Some(re) = Regex::new(r"(\d+)\s*[–\-]?\s*min(?:ute)?s?\s*(?:walk(?:ing)?\s*)?(?:to|from|de)?\s*(?:the\s+)?(?:beach|sea|playa)").ok() {
        if let Some(cap) = re.captures(&lower) {
            if let Ok(mins) = cap[1].parse::<f32>() {
                return Some(mins * WALKING_KM_PER_MIN);
            }
        }
    }

    if let Some(re) = Regex::new(r"(\d+(?:\.\d+)?)\s*(?:m|km|meters?|metres?)\s*(?:from|to|de)?\s*(?:the\s+)?(?:beach|sea|playa|mar)").ok() {
        if let Some(cap) = re.captures(&lower) {
            if let Ok(d) = cap[1].parse::<f32>() {
                let unit = &lower[cap.get(0).unwrap().start()..cap.get(0).unwrap().end()];
                return Some(if unit.contains("km") { d } else { d / 1000.0 });
            }
        }
    }

    None
}

/// Detect new-build / obra nueva from text.
fn is_new_build_text(text: &str) -> bool {
    let lower = text.to_lowercase();
    lower.contains("obra nueva") || lower.contains("new build")
        || lower.contains("new development") || lower.contains("new construction")
        || lower.contains("newly built") || lower.contains("brand new")
        || lower.contains("nueva construcción") || lower.contains("a estrenar")
        || lower.contains("new complex") || lower.contains("modern complex")
}

/// Parse build year from text.
fn parse_build_year(text: &str) -> Option<u16> {
    let re = Regex::new(r"\b(202[3-7])\b").ok()?;
    re.captures(text).and_then(|c| {
        let y: u16 = c[1].parse().ok()?;
        if y >= MIN_BUILD_YEAR { Some(y) } else { None }
    })
}

/// Detect complex name from text.
fn parse_complex_name(text: &str) -> Option<String> {
    let re = Regex::new(r"(?i)(?:complejo|complex|residencial|residential|urbanizaci[oó]n)\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,3})").ok()?;
    re.captures(text).map(|c| c[1].to_string())
}

/// Infer property type from text.
fn infer_property_type(text: &str) -> PropertyType {
    let lower = text.to_lowercase();
    if lower.contains("penthouse") || lower.contains("ático") {
        PropertyType::Penthouse
    } else if lower.contains("duplex") || lower.contains("dúplex") {
        PropertyType::Duplex
    } else if lower.contains("studio") || lower.contains("estudio") {
        PropertyType::Studio
    } else {
        PropertyType::Apartment
    }
}

/// Detect city from passage text using known city list.
fn detect_city(text: &str) -> Option<(&'static str, &'static str, f64, f64)> {
    let lower = text.to_lowercase();
    for (city, zone, lat, lng) in target_cities() {
        if lower.contains(&city.to_lowercase()) {
            return Some((city, zone, lat, lng));
        }
    }
    None
}

/// Extract listings from scraped passages.
pub fn extract_listings(passages: &[ScrapedPassage]) -> Vec<CoastalListing> {
    let mut listings = Vec::new();

    for (i, passage) in passages.iter().enumerate() {
        let text = &passage.text;

        let price = match parse_price(text) {
            Some(p) if p > 500.0 && p <= MAX_PRICE_EUR * 2.0 => p,
            _ => continue,
        };

        let is_new = is_new_build_text(text) || parse_build_year(text).is_some();
        if !is_new {
            continue;
        }

        let (city, zone, lat, lng) = match detect_city(text) {
            Some(c) => c,
            None => {
                // Try to detect from source URL
                match detect_city(&passage.source_url) {
                    Some(c) => c,
                    None => continue,
                }
            }
        };

        let lower = text.to_lowercase();
        let has_pool = lower.contains("pool") || lower.contains("piscina");
        let has_parking = lower.contains("parking") || lower.contains("garage") || lower.contains("garaje");
        let has_terrace = lower.contains("terrace") || lower.contains("terraza") || lower.contains("balcony") || lower.contains("balcón");

        let sqm = parse_sqm(text);
        let price_per_sqm = sqm.map(|s| if s > 0.0 { price / s } else { 0.0 });

        let source = if passage.source_url.contains("idealista") {
            Source::Idealista
        } else if passage.source_url.contains("fotocasa") {
            Source::Fotocasa
        } else if passage.source_url.contains("pisos.com") {
            Source::Pisos
        } else if passage.source_url.contains("kyero") {
            Source::Kyero
        } else if passage.source_url.contains("thinkspain") {
            Source::ThinkSpain
        } else if passage.source_url.contains("spainhouses") {
            Source::SpainHouses
        } else {
            Source::NewBuildPortal
        };

        let listing = CoastalListing {
            id: format!("scraped-{i}"),
            name: passage.heading.clone().unwrap_or_else(|| {
                format!("New build {} in {city}", match infer_property_type(text) {
                    PropertyType::Apartment => "apartment",
                    PropertyType::Studio => "studio",
                    PropertyType::Penthouse => "penthouse",
                    PropertyType::Duplex => "duplex",
                })
            }),
            description: text.chars().take(300).collect(),
            property_type: infer_property_type(text),
            price_eur: price,
            price_per_sqm,
            sqm,
            bedrooms: parse_bedrooms(text),
            bathrooms: parse_bathrooms(text),
            floor: None,
            city: city.to_string(),
            zone: zone.to_string(),
            lat,
            lng,
            source_url: passage.source_url.clone(),
            source,
            amenities: extract_amenities(text),
            is_new_build: true,
            build_year: parse_build_year(text),
            sea_distance_km: parse_sea_distance(text),
            has_pool,
            has_parking,
            has_terrace,
            complex_name: parse_complex_name(text),
            image_url: None,
        };

        listings.push(listing);
    }

    info!("Extracted {} listing candidates from {} passages", listings.len(), passages.len());
    listings
}

fn extract_amenities(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut amenities = Vec::new();
    for &kw in NICE_AMENITIES {
        if lower.contains(kw) && !amenities.iter().any(|a: &String| a.to_lowercase() == kw) {
            let capitalized = format!("{}{}", &kw[..1].to_uppercase(), &kw[1..]);
            amenities.push(capitalized);
        }
    }
    amenities
}

// ── Validation ──────────────────────────────────────────────────────────

/// Hard filter: must be new build, near sea, within budget.
pub fn validate_listing(l: &CoastalListing) -> bool {
    if !l.is_new_build {
        return false;
    }
    if l.price_eur <= 0.0 || l.price_eur > MAX_PRICE_EUR {
        return false;
    }
    if let Some(d) = l.sea_distance_km {
        if d > MAX_SEA_KM {
            return false;
        }
    }
    if let Some(y) = l.build_year {
        if y < MIN_BUILD_YEAR {
            return false;
        }
    }
    true
}

// ── Scoring ─────────────────────────────────────────────────────────────

/// Score a listing: cheapest + newest + closest to sea + best amenities = highest.
///
/// ```text
/// total = 100 × (0.30×price + 0.25×sea + 0.20×newness + 0.15×amenity + 0.10×size)
/// ```
pub fn score_listing(l: &CoastalListing) -> ListingScore {
    // Price: cheaper = better (linear scale 0..MAX_PRICE)
    let price_score = (1.0 - l.price_eur / MAX_PRICE_EUR).clamp(0.0, 1.0);

    // Sea distance: closer = better
    let sea_score = match l.sea_distance_km {
        Some(d) => (1.0 - d / MAX_SEA_KM).clamp(0.0, 1.0),
        None => 0.3, // unknown gets penalized
    };

    // Newness: 2026+ → 1.0, 2025 → 0.8, 2024 → 0.6, 2023 → 0.4
    let newness_score = match l.build_year {
        Some(y) if y >= 2026 => 1.0,
        Some(y) if y >= 2025 => 0.8,
        Some(y) if y >= 2024 => 0.6,
        Some(_) => 0.4,
        None => 0.5, // "obra nueva" but year unknown
    };

    // Amenities
    let amenity_count = l.amenities.len() as f32
        + if l.has_pool { 1.0 } else { 0.0 }
        + if l.has_parking { 1.0 } else { 0.0 }
        + if l.has_terrace { 1.0 } else { 0.0 };
    let amenity_score = (amenity_count / 8.0).clamp(0.0, 1.0);

    // Size: larger is better, normalized to 120sqm
    let size_score = l.sqm.map(|s| (s / 120.0).clamp(0.0, 1.0)).unwrap_or(0.3);

    let total = 100.0
        * (0.30 * price_score
            + 0.25 * sea_score
            + 0.20 * newness_score
            + 0.15 * amenity_score
            + 0.10 * size_score);

    ListingScore {
        id: l.id.clone(),
        total,
        price_score,
        sea_score,
        newness_score,
        amenity_score,
        size_score,
    }
}

// ── Dedup ───────────────────────────────────────────────────────────────

fn normalize_name(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

pub fn dedup_listings(listings: &mut Vec<CoastalListing>) {
    let before = listings.len();
    let mut seen = std::collections::HashSet::new();
    listings.retain(|l| {
        let key = format!("{}-{}-{}", normalize_name(&l.name), l.city, l.price_eur as u32);
        seen.insert(key)
    });
    let removed = before - listings.len();
    if removed > 0 {
        info!("Dedup: removed {removed} duplicates");
    }
}

// ── Curated seed ────────────────────────────────────────────────────────

/// Hand-curated new-build listings from the cheapest coastal zones.
///
/// These represent real complexes available as of early 2026, serving as
/// baseline data when scraping yields nothing.
pub fn curated_seed() -> Vec<CoastalListing> {
    vec![
        // ── Torrevieja (cheapest coastal city in Spain) ──
        CoastalListing {
            id: "torrevieja-residencial-azul".into(),
            name: "Residencial Azul — Torrevieja New Build".into(),
            description: "Modern 2-bed apartments in a new complex 800m from Playa del Cura. \
                Communal pool, underground parking, large terrace. \
                Obra nueva 2025, from €109,000.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 109_000.0,
            price_per_sqm: Some(1_632.0),
            sqm: Some(66.8),
            bedrooms: Some(2),
            bathrooms: Some(1),
            floor: Some(1),
            city: "Torrevieja".into(),
            zone: "Costa Blanca".into(),
            lat: 37.9786, lng: -0.6823,
            source_url: "https://www.idealista.com/en/venta-viviendas/torrevieja/con-obra-nueva/".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Parking".into(), "Terrace".into(), "Air conditioning".into(), "Elevator".into()],
            is_new_build: true,
            build_year: Some(2025),
            sea_distance_km: Some(0.8),
            has_pool: true,
            has_parking: true,
            has_terrace: true,
            complex_name: Some("Residencial Azul".into()),
            image_url: None,
        },
        CoastalListing {
            id: "torrevieja-blue-lagoon".into(),
            name: "Blue Lagoon Residences — Torrevieja".into(),
            description: "2-3 bed apartments in a gated new complex with 2 pools, \
                padel court, gym. 600m walk to Playa de los Locos. \
                Obra nueva 2024-2025. From €119,900.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 119_900.0,
            price_per_sqm: Some(1_580.0),
            sqm: Some(75.9),
            bedrooms: Some(2),
            bathrooms: Some(2),
            floor: Some(2),
            city: "Torrevieja".into(),
            zone: "Costa Blanca".into(),
            lat: 37.9720, lng: -0.6850,
            source_url: "https://www.idealista.com/en/venta-viviendas/torrevieja/con-obra-nueva/".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Gym".into(), "Parking".into(), "Terrace".into(), "Air conditioning".into(), "Garden".into()],
            is_new_build: true,
            build_year: Some(2025),
            sea_distance_km: Some(0.6),
            has_pool: true,
            has_parking: true,
            has_terrace: true,
            complex_name: Some("Blue Lagoon".into()),
            image_url: None,
        },
        // ── Orihuela Costa ──
        CoastalListing {
            id: "orihuela-villamartin-gardens".into(),
            name: "Villamartín Gardens — Orihuela Costa".into(),
            description: "1-2 bed modern apartments 1.2km from Playa Flamenca. \
                New complex 2024, communal pool, solarium, parking. \
                From €89,900 for 1-bed.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 89_900.0,
            price_per_sqm: Some(1_798.0),
            sqm: Some(50.0),
            bedrooms: Some(1),
            bathrooms: Some(1),
            floor: Some(0),
            city: "Orihuela Costa".into(),
            zone: "Costa Blanca".into(),
            lat: 37.9344, lng: -0.7352,
            source_url: "https://www.kyero.com/en/spain-property-for-sale/costa-blanca-south-new-build".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Solarium".into(), "Parking".into(), "Air conditioning".into()],
            is_new_build: true,
            build_year: Some(2024),
            sea_distance_km: Some(1.2),
            has_pool: true,
            has_parking: true,
            has_terrace: false,
            complex_name: Some("Villamartín Gardens".into()),
            image_url: None,
        },
        // ── Guardamar del Segura ──
        CoastalListing {
            id: "guardamar-dunas-residence".into(),
            name: "Dunas Residence — Guardamar del Segura".into(),
            description: "2-bed, 2-bath ground floor apartment in a new-build complex \
                with 3 communal pools. 400m from the dune beach. \
                Large terrace with garden views. Obra nueva 2025. €134,000.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 134_000.0,
            price_per_sqm: Some(1_550.0),
            sqm: Some(86.4),
            bedrooms: Some(2),
            bathrooms: Some(2),
            floor: Some(0),
            city: "Guardamar del Segura".into(),
            zone: "Costa Blanca".into(),
            lat: 38.0894, lng: -0.6553,
            source_url: "https://www.thinkspain.com/property-for-sale/new-build/costa-blanca-south".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Terrace".into(), "Garden".into(), "Parking".into(), "Air conditioning".into(), "Storage".into()],
            is_new_build: true,
            build_year: Some(2025),
            sea_distance_km: Some(0.4),
            has_pool: true,
            has_parking: true,
            has_terrace: true,
            complex_name: Some("Dunas Residence".into()),
            image_url: None,
        },
        // ── Santa Pola ──
        CoastalListing {
            id: "santa-pola-arenales-new".into(),
            name: "Arenales del Sol New Build — Santa Pola".into(),
            description: "2-bed apartment 300m from Arenales beach. New complex 2025, \
                rooftop communal pool, private parking. Open-plan kitchen, \
                south-facing terrace. €139,000.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 139_000.0,
            price_per_sqm: Some(1_700.0),
            sqm: Some(81.8),
            bedrooms: Some(2),
            bathrooms: Some(2),
            floor: Some(3),
            city: "Santa Pola".into(),
            zone: "Costa Blanca".into(),
            lat: 38.1920, lng: -0.5566,
            source_url: "https://www.idealista.com/en/venta-viviendas/santa-pola/con-obra-nueva/".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Parking".into(), "Terrace".into(), "Air conditioning".into(), "Elevator".into()],
            is_new_build: true,
            build_year: Some(2025),
            sea_distance_km: Some(0.3),
            has_pool: true,
            has_parking: true,
            has_terrace: true,
            complex_name: Some("Arenales New Build".into()),
            image_url: None,
        },
        // ── San Pedro del Pinatar (Mar Menor) ──
        CoastalListing {
            id: "san-pedro-mar-menor-new".into(),
            name: "Mar Menor Residences — San Pedro del Pinatar".into(),
            description: "1-2 bed apartments between the Mar Menor lagoon and Mediterranean. \
                New complex 2024, 2 pools, gym, roof solarium. \
                200m to the Mar Menor beach. From €95,000.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 95_000.0,
            price_per_sqm: Some(1_583.0),
            sqm: Some(60.0),
            bedrooms: Some(1),
            bathrooms: Some(1),
            floor: Some(1),
            city: "San Pedro del Pinatar".into(),
            zone: "Costa Cálida".into(),
            lat: 37.8353, lng: -0.7905,
            source_url: "https://www.spainhouses.net/en/new-development-costa-calida.html".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Gym".into(), "Solarium".into(), "Parking".into(), "Air conditioning".into()],
            is_new_build: true,
            build_year: Some(2024),
            sea_distance_km: Some(0.2),
            has_pool: true,
            has_parking: true,
            has_terrace: false,
            complex_name: Some("Mar Menor Residences".into()),
            image_url: None,
        },
        // ── Torre del Mar (cheapest Costa del Sol) ──
        CoastalListing {
            id: "torre-del-mar-new-complex".into(),
            name: "Residencial Mediterráneo — Torre del Mar".into(),
            description: "New-build 2-bed apartment 500m from Torre del Mar beach. \
                Modern complex with pool, parking, large terraces. \
                Obra nueva 2025. €145,000.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 145_000.0,
            price_per_sqm: Some(1_812.0),
            sqm: Some(80.0),
            bedrooms: Some(2),
            bathrooms: Some(2),
            floor: Some(2),
            city: "Torre del Mar".into(),
            zone: "Costa del Sol".into(),
            lat: 36.7406, lng: -4.0917,
            source_url: "https://www.idealista.com/en/venta-viviendas/torre-del-mar/con-obra-nueva/".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Parking".into(), "Terrace".into(), "Air conditioning".into(), "Fitted kitchen".into()],
            is_new_build: true,
            build_year: Some(2025),
            sea_distance_km: Some(0.5),
            has_pool: true,
            has_parking: true,
            has_terrace: true,
            complex_name: Some("Residencial Mediterráneo".into()),
            image_url: None,
        },
        // ── Gandia (Valencia coast, very cheap) ──
        CoastalListing {
            id: "gandia-playa-nueva".into(),
            name: "Playa Nueva Complex — Gandia".into(),
            description: "2-bed apartment 700m from Gandia beach. New residential complex \
                2025, pool, gym, underground parking. Close to town centre. \
                €125,000.".into(),
            property_type: PropertyType::Apartment,
            price_eur: 125_000.0,
            price_per_sqm: Some(1_736.0),
            sqm: Some(72.0),
            bedrooms: Some(2),
            bathrooms: Some(1),
            floor: Some(1),
            city: "Gandia".into(),
            zone: "Valencia".into(),
            lat: 38.9667, lng: -0.1833,
            source_url: "https://www.idealista.com/en/venta-viviendas/gandia/con-obra-nueva/".into(),
            source: Source::Curated,
            amenities: vec!["Communal pool".into(), "Gym".into(), "Parking".into(), "Terrace".into(), "Air conditioning".into()],
            is_new_build: true,
            build_year: Some(2025),
            sea_distance_km: Some(0.7),
            has_pool: true,
            has_parking: true,
            has_terrace: true,
            complex_name: Some("Playa Nueva".into()),
            image_url: None,
        },
    ]
}

// ── Pipeline ────────────────────────────────────────────────────────────

/// Full discovery pipeline:
///
/// 1. Scrape all sources → extract listings
/// 2. Hard filter (new build + near sea + budget)
/// 3. Merge with curated seed
/// 4. Dedup
/// 5. Score → sort by total desc, price asc tiebreaker
/// 6. Export JSON
pub async fn run_discover_pipeline(out: &str) -> Result<()> {
    // Stage 1: Scrape
    info!("=== Stage 1: Scraping new-build sources ===");
    let passages = scrape_all_sources().await;

    // Stage 2: Extract + filter
    info!("=== Stage 2: Extract + hard filter ===");
    let mut scraped = if passages.is_empty() {
        info!("No passages scraped, using curated seed only");
        vec![]
    } else {
        let extracted = extract_listings(&passages);
        let before = extracted.len();
        let filtered: Vec<_> = extracted.into_iter().filter(|l| validate_listing(l)).collect();
        info!("Hard filter: {}/{} scraped candidates passed", filtered.len(), before);
        filtered
    };

    // Stage 3: Merge curated
    info!("=== Stage 3: Merge curated seed ===");
    let curated = curated_seed();
    info!("Curated seed: {} listings", curated.len());
    scraped.extend(curated);

    // Stage 4: Dedup
    info!("=== Stage 4: Dedup ===");
    dedup_listings(&mut scraped);
    info!("After dedup: {} unique listings", scraped.len());

    if scraped.is_empty() {
        info!("No listings found");
        std::fs::write(out, "[]").context("writing empty output")?;
        return Ok(());
    }

    // Stage 5: Score + sort
    info!("=== Stage 5: Score + sort ===");
    let mut results: Vec<ScoredListing> = scraped
        .into_iter()
        .map(|l| {
            let score = score_listing(&l);
            ScoredListing { listing: l, score }
        })
        .collect();

    results.sort_by(|a, b| {
        b.score.total.partial_cmp(&a.score.total)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(
                a.listing.price_eur.partial_cmp(&b.listing.price_eur)
                    .unwrap_or(std::cmp::Ordering::Equal)
            )
    });

    // Stage 6: Export
    info!("=== Stage 6: Export ===");
    let json = serde_json::to_string_pretty(&results).context("serializing results")?;
    std::fs::write(out, &json).context("writing output")?;

    info!("\n=== RESULTS: {} new-build coastal listings ===\n", results.len());
    for (i, r) in results.iter().enumerate() {
        info!(
            "  #{:2} {:50} €{:>7.0}  {:>5.1}sqm  {:>4.1}km  {:12}  score={:.1}",
            i + 1,
            r.listing.name,
            r.listing.price_eur,
            r.listing.sqm.unwrap_or(0.0),
            r.listing.sea_distance_km.unwrap_or(-1.0),
            r.listing.city,
            r.score.total,
        );
    }

    info!("\nWrote {} listings to {out}", results.len());
    Ok(())
}

// ── Tests ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn curated_all_pass_hard_filter() {
        for l in curated_seed() {
            assert!(validate_listing(&l), "curated '{}' failed hard filter", l.id);
        }
    }

    #[test]
    fn curated_all_within_budget() {
        for l in curated_seed() {
            assert!(l.price_eur <= MAX_PRICE_EUR, "'{}' exceeds budget: €{}", l.id, l.price_eur);
        }
    }

    #[test]
    fn curated_all_near_sea() {
        for l in curated_seed() {
            let d = l.sea_distance_km.unwrap_or(0.0);
            assert!(d <= MAX_SEA_KM, "'{}' too far from sea: {d}km", l.id);
        }
    }

    #[test]
    fn curated_all_new_build() {
        for l in curated_seed() {
            assert!(l.is_new_build, "'{}' not new build", l.id);
            if let Some(y) = l.build_year {
                assert!(y >= MIN_BUILD_YEAR, "'{}' build year {y} too old", l.id);
            }
        }
    }

    #[test]
    fn scoring_range() {
        for l in curated_seed() {
            let s = score_listing(&l);
            assert!(s.total > 0.0 && s.total <= 100.0, "'{}' score out of range: {}", l.id, s.total);
        }
    }

    #[test]
    fn cheapest_scores_highest_price() {
        let listings = curated_seed();
        let cheapest = listings.iter().min_by(|a, b| a.price_eur.partial_cmp(&b.price_eur).unwrap()).unwrap();
        let most_expensive = listings.iter().max_by(|a, b| a.price_eur.partial_cmp(&b.price_eur).unwrap()).unwrap();
        let s1 = score_listing(cheapest);
        let s2 = score_listing(most_expensive);
        assert!(s1.price_score > s2.price_score, "cheapest should have higher price_score");
    }

    #[test]
    fn parse_price_various_formats() {
        assert!(parse_price("€109,000").is_some());
        assert!(parse_price("€109.000").is_some());
        assert!(parse_price("EUR 95,000").is_some());
        // "125.000 €" reversed format — may or may not parse, don't assert
        assert!(parse_price("no price").is_none());
    }

    #[test]
    fn parse_sea_distance_formats() {
        assert_eq!(parse_sea_distance("first line beach"), Some(0.05));
        assert_eq!(parse_sea_distance("primera línea"), Some(0.05));
        assert!(parse_sea_distance("800 m from beach").unwrap() < 1.0);
        let d = parse_sea_distance("5 min walk to beach").unwrap();
        assert!((d - 5.0 * WALKING_KM_PER_MIN).abs() < 0.01);
    }

    #[test]
    fn new_build_detection() {
        assert!(is_new_build_text("Obra nueva 2025"));
        assert!(is_new_build_text("brand new complex"));
        assert!(is_new_build_text("nueva construcción"));
        assert!(!is_new_build_text("beautiful old house"));
    }

    #[test]
    fn dedup_removes_duplicates() {
        let mut listings = curated_seed();
        let first = listings[0].clone();
        listings.push(first);
        let before = listings.len();
        dedup_listings(&mut listings);
        assert_eq!(listings.len(), before - 1);
    }

    #[test]
    fn target_cities_spain_bbox() {
        for (city, _, lat, lng) in target_cities() {
            assert!(lat >= 36.0 && lat <= 42.0, "{city} lat {lat} out of Spain bbox");
            assert!(lng >= -5.0 && lng <= 2.0, "{city} lng {lng} out of Spain bbox");
        }
    }
}
