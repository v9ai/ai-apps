//! Hotel discovery: web scraping + Candle semantic passage retrieval.
//!
//! Pipeline: scrape travel sources → chunk into passages → embed with Candle →
//! rank by cosine similarity to a discovery query → extract hotel data.

use anyhow::{Context, Result};
use regex::Regex;
use scraper::{Html, Selector};
use tracing::{info, warn};

use crate::constants::{DISCOVERY_YEAR, DISCOVERY_YEAR_STR, NEW_HOTEL_MIN_YEAR};
use crate::embeddings::EmbeddingEngine;
use crate::hotel::Hotel;

/// A text passage extracted from a scraped web page.
#[derive(Debug, Clone)]
pub struct ScrapedPassage {
    pub text: String,
    pub source_url: String,
    pub heading: Option<String>,
}

/// A passage with its Candle-computed relevance score.
#[derive(Debug, Clone)]
pub struct RankedPassage {
    pub passage: ScrapedPassage,
    pub score: f32,
}

/// Known Greek destinations with approximate coordinates.
pub fn greece_locations() -> Vec<(&'static str, &'static str, f64, f64)> {
    vec![
        // Crete
        ("Chania", "Crete", 35.5138, 24.0180),
        ("Heraklion", "Crete", 35.3387, 25.1442),
        ("Rethymno", "Crete", 35.3693, 24.4737),
        ("Agios Nikolaos", "Crete", 35.1896, 25.7174),
        ("Elounda", "Crete", 35.2543, 25.7284),
        ("Hersonissos", "Crete", 35.3141, 25.3868),
        ("Ierapetra", "Crete", 35.0075, 25.7374),
        ("Agia Pelagia", "Crete", 35.4095, 24.9895),
        // Cyclades
        ("Santorini", "Cyclades", 36.3932, 25.4615),
        ("Mykonos", "Cyclades", 37.4467, 25.3289),
        ("Paros", "Cyclades", 37.0853, 25.1522),
        ("Naxos", "Cyclades", 37.1036, 25.3763),
        ("Milos", "Cyclades", 36.7446, 24.4271),
        ("Ios", "Cyclades", 36.7231, 25.2813),
        // Dodecanese
        ("Rhodes", "Dodecanese", 36.4349, 28.2176),
        ("Kos", "Dodecanese", 36.8933, 26.9881),
        ("Karpathos", "Dodecanese", 35.5078, 27.1290),
        // Ionian
        ("Corfu", "Ionian Islands", 39.6243, 19.9217),
        ("Zakynthos", "Ionian Islands", 37.7870, 20.8979),
        ("Kefalonia", "Ionian Islands", 38.1794, 20.4893),
        ("Lefkada", "Ionian Islands", 38.7074, 20.6449),
        // Sporades / NE Aegean
        ("Skiathos", "Sporades", 39.1620, 23.4905),
        ("Lesbos", "NE Aegean", 39.1663, 26.3346),
        // Mainland
        ("Athens", "Attica", 37.9838, 23.7275),
        ("Athens Riviera", "Attica", 37.8236, 23.7641),
        ("Thessaloniki", "Central Macedonia", 40.6401, 22.9444),
        ("Nafplio", "Peloponnese", 37.5673, 22.8016),
        ("Halkidiki", "Central Macedonia", 40.2977, 23.4435),
        ("Costa Navarino", "Peloponnese", 36.9600, 21.6500),
        ("Olympia Riviera", "Peloponnese", 37.6386, 21.4960),
        ("Meteora", "Thessaly", 39.7217, 21.6306),
        ("Pelion", "Thessaly", 39.3963, 23.0471),
    ]
}

/// Curated source URLs for discovering new Greek hotels.
pub fn discovery_urls() -> Vec<&'static str> {
    vec![
        "https://www.cntraveller.com/topic/greece",
        "https://www.cntraveller.com/topic/crete",
        "https://www.cntraveller.com/topic/greek-islands",
        "https://www.travelandleisure.com/best-hotels/greece",
        "https://www.thehotelguru.com/best-hotels-in/greece/new",
        "https://www.timeout.com/greece/hotels/best-new-hotels-in-greece",
        "https://www.booking.com/newhotellist/gr.html",
        "https://www.tripadvisor.com/Hotels-g189398-Greece-Hotels.html",
        "https://www.greece-is.com/new-hotels-greece-2026/",
        "https://www.lonelyplanet.com/greece/hotels",
        "https://www.visitgreece.gr/where-to-stay/",
        "https://greekhotel.com/new-hotels",
    ]
}

// ── Phase A: Web Scraping ──────────────────────────────────────────────

/// Fetch and extract text passages from a URL.
pub async fn scrape_passages(url: &str) -> Result<Vec<ScrapedPassage>> {
    info!("Scraping {url}");

    let client = reqwest::Client::builder()
        .user_agent(
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
             AppleWebKit/537.36 (KHTML, like Gecko) \
             Chrome/131.0.0.0 Safari/537.36",
        )
        .default_headers({
            let mut h = reqwest::header::HeaderMap::new();
            h.insert("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8".parse().unwrap());
            h.insert("Accept-Language", "en-US,en;q=0.9".parse().unwrap());
            h.insert("Accept-Encoding", "gzip, deflate, br".parse().unwrap());
            h.insert("Sec-Fetch-Dest", "document".parse().unwrap());
            h.insert("Sec-Fetch-Mode", "navigate".parse().unwrap());
            h.insert("Sec-Fetch-Site", "none".parse().unwrap());
            h
        })
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

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

    // Extract paragraphs
    if let Ok(p_sel) = Selector::parse("p") {
        for el in doc.select(&p_sel) {
            let text: String = el.text().collect::<String>().trim().to_string();
            if text.len() > 50 {
                let heading = find_nearest_heading(&doc, &el);
                passages.push(ScrapedPassage {
                    text,
                    source_url: url.to_string(),
                    heading,
                });
            }
        }
    }

    // Extract article content blocks
    for selector_str in ["article", ".hotel-card", ".property-card", ".listing-item"] {
        if let Ok(sel) = Selector::parse(selector_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>();
                let cleaned = text.split_whitespace().collect::<Vec<_>>().join(" ");
                if cleaned.len() > 80 && !passages.iter().any(|p| p.text.contains(&cleaned[..40])) {
                    let heading = find_nearest_heading(&doc, &el);
                    passages.push(ScrapedPassage {
                        text: cleaned,
                        source_url: url.to_string(),
                        heading,
                    });
                }
            }
        }
    }

    info!("Extracted {} passages from {url}", passages.len());
    Ok(passages)
}

/// Scrape all discovery URLs, collecting passages.
pub async fn scrape_all_sources() -> Vec<ScrapedPassage> {
    let urls = discovery_urls();
    let mut all_passages = Vec::new();

    for url in urls {
        match scrape_passages(url).await {
            Ok(passages) => all_passages.extend(passages),
            Err(e) => warn!("Error scraping {url}: {e}"),
        }
    }

    info!("Total passages scraped: {}", all_passages.len());
    all_passages
}

fn find_nearest_heading(doc: &Html, _el: &scraper::ElementRef) -> Option<String> {
    // Try to find an h1-h3 heading in the document
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

// ── Phase B: Candle Semantic Passage Retrieval ─────────────────────────

/// Discovery queries that capture different aspects of new 2026 Greek hotels.
fn discovery_queries() -> Vec<&'static str> {
    vec![
        "new hotel resort Greece opened 2026 affordable budget",
        "brand new beachfront hotel Greek islands opening 2026",
        "newly built boutique hotel Santorini Mykonos Crete Rhodes 2026",
        "Greece hotel grand opening 2026 cheap value all inclusive",
        "new budget hotel Athens Thessaloniki Corfu 2026",
    ]
}

/// Embed passages and rank by cosine similarity to discovery queries.
///
/// Returns passages above `threshold` (0.0–1.0), sorted by best score.
pub fn rank_passages(
    engine: &EmbeddingEngine,
    passages: &[ScrapedPassage],
    threshold: f32,
) -> Result<Vec<RankedPassage>> {
    if passages.is_empty() {
        return Ok(vec![]);
    }

    // Embed discovery queries
    let queries = discovery_queries();
    let query_refs: Vec<&str> = queries.to_vec();
    let query_vecs = engine
        .embed_batch(&query_refs)
        .context("embedding discovery queries")?;

    // Embed passages in batches to avoid OOM on large sets
    let batch_size = 32;
    let passage_texts: Vec<&str> = passages.iter().map(|p| p.text.as_str()).collect();
    let mut passage_vecs = Vec::with_capacity(passages.len());

    for chunk in passage_texts.chunks(batch_size) {
        let vecs = engine.embed_batch(chunk).context("embedding passage batch")?;
        passage_vecs.extend(vecs);
    }

    // Score each passage against all queries, keep max score
    let mut ranked = Vec::new();
    for (i, passage) in passages.iter().enumerate() {
        let pvec = &passage_vecs[i];
        let best_score = query_vecs
            .iter()
            .map(|qvec| dot_product(qvec, pvec))
            .fold(0.0f32, f32::max);

        if best_score >= threshold {
            ranked.push(RankedPassage {
                passage: passage.clone(),
                score: best_score,
            });
        }
    }

    ranked.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    info!(
        "Semantic filter: {}/{} passages above {:.2} threshold",
        ranked.len(),
        passages.len(),
        threshold,
    );
    Ok(ranked)
}

/// Dot product of two L2-normalized vectors (= cosine similarity).
fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

// ── Phase C: Hotel Extraction (regex + heuristics) ─────────────────────

/// Extract hotel candidates from ranked passages using regex and heuristics.
pub fn extract_hotels(ranked: &[RankedPassage]) -> Vec<Hotel> {
    let name_re =
        Regex::new(r"(?i)\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\s+(?:Hotel|Resort|Suites|Villas|Beach|Palace|Bay|Club)")
            .unwrap();
    let star_re = Regex::new(r"(\d)\s*[-–]?\s*star").unwrap();
    let price_re = Regex::new(r"(?:€|EUR?\s*)(\d{2,4})").unwrap();
    let year_re = Regex::new(r"\b(202[4-7])\b").unwrap();
    let board_re =
        Regex::new(r"(?i)(all[- ]inclusive|half[- ]board|bed\s*&?\s*breakfast|full board|room only)")
            .unwrap();

    let locations = greece_locations();
    let mut hotels: Vec<Hotel> = Vec::new();
    let mut seen_names: Vec<String> = Vec::new();

    for rp in ranked {
        let text = &rp.passage.text;

        // Try to extract hotel name
        let name = if let Some(m) = name_re.find(text) {
            m.as_str().trim().to_string()
        } else if let Some(heading) = &rp.passage.heading {
            // Fall back to heading if it looks like a hotel name
            if heading.to_lowercase().contains("hotel")
                || heading.to_lowercase().contains("resort")
            {
                heading.clone()
            } else {
                continue;
            }
        } else {
            continue;
        };

        // Deduplicate by name within this extraction pass
        let name_lower = name.to_lowercase();
        if seen_names.iter().any(|s| s == &name_lower) {
            continue;
        }
        seen_names.push(name_lower.clone());

        // Extract star rating
        let star_rating = star_re
            .captures(text)
            .and_then(|c| c[1].parse::<u8>().ok())
            .unwrap_or(4); // default 4-star for Crete resorts

        // Extract price
        let price_eur = price_re
            .captures(text)
            .and_then(|c| c[1].parse::<f32>().ok())
            .unwrap_or(0.0);

        // Detect year — keep only 2025–2026 window
        let opened_year = year_re.captures(text).and_then(|c| {
            let y: u16 = c[1].parse().ok()?;
            if y >= NEW_HOTEL_MIN_YEAR { Some(y) } else { None }
        });
        // If no year in the new-hotel window, skip
        if opened_year.is_none() && !text.to_lowercase().contains(DISCOVERY_YEAR_STR) {
            continue;
        }
        // Use the parsed year; fall back to DISCOVERY_YEAR when the text mentions it without a parseable year
        let opened_year = opened_year.or(Some(DISCOVERY_YEAR));

        // Detect location
        let text_lower = text.to_lowercase();
        let (location, region, lat, lng) = locations
            .iter()
            .find(|(loc, _, _, _)| text_lower.contains(&loc.to_lowercase()))
            .map(|(loc, reg, lat, lng)| (format!("{loc}, {reg}, Greece"), reg.to_string(), *lat, *lng))
            .unwrap_or_else(|| ("Greece".to_string(), "Greece".to_string(), 38.0, 24.0));

        // Detect board type
        let board_type = board_re
            .captures(text)
            .map(|c| normalize_board_type(&c[1]))
            .unwrap_or_else(|| "Standard".to_string());

        // Build hotel_id from name
        let hotel_id = slug_from_name(&name);

        let description = build_description(text, &name);

        hotels.push(Hotel {
            hotel_id,
            name,
            description,
            star_rating,
            board_type,
            price_eur,
            location,
            region,
            lat,
            lng,
            source_url: rp.passage.source_url.clone(),
            amenities: extract_amenities(text),
            image_url: None,
            gallery: vec![],
            opened_year,
        });
    }

    info!("Extracted {} hotel candidates from passages", hotels.len());
    hotels
}

fn slug_from_name(name: &str) -> String {
    name.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

fn normalize_board_type(raw: &str) -> String {
    let lower = raw.to_lowercase().replace('-', " ").replace('&', "and");
    if lower.contains("all inclusive") {
        "All-Inclusive".to_string()
    } else if lower.contains("half board") {
        "Half Board".to_string()
    } else if lower.contains("bed") && lower.contains("breakfast") {
        "Bed & Breakfast".to_string()
    } else if lower.contains("full board") {
        "Full Board".to_string()
    } else if lower.contains("room only") {
        "Room Only".to_string()
    } else {
        "Standard".to_string()
    }
}

fn build_description(passage_text: &str, hotel_name: &str) -> String {
    // Extract sentences mentioning the hotel name or key attributes
    let sentences: Vec<&str> = passage_text
        .split(['.', '!', '?'])
        .map(|s| s.trim())
        .filter(|s| s.len() > 20)
        .collect();

    let relevant: Vec<&str> = sentences
        .iter()
        .filter(|s| {
            let lower = s.to_lowercase();
            lower.contains(&hotel_name.to_lowercase())
                || lower.contains("hotel")
                || lower.contains("resort")
                || lower.contains("room")
                || lower.contains("pool")
                || lower.contains("beach")
                || lower.contains("spa")
        })
        .take(3)
        .copied()
        .collect();

    if relevant.is_empty() {
        sentences.into_iter().take(2).collect::<Vec<_>>().join(". ") + "."
    } else {
        relevant.join(". ") + "."
    }
}

fn extract_amenities(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut amenities = Vec::new();

    let keywords = [
        ("pool", "Swimming pool"),
        ("spa", "Spa"),
        ("beach", "Beach access"),
        ("restaurant", "Restaurant"),
        ("bar", "Bar"),
        ("gym", "Fitness center"),
        ("fitness", "Fitness center"),
        ("wi-fi", "Wi-Fi"),
        ("wifi", "Wi-Fi"),
        ("kids", "Kids club"),
        ("children", "Kids club"),
        ("parking", "Parking"),
        ("tennis", "Tennis court"),
        ("golf", "Golf course"),
        ("water sport", "Water sports"),
        ("dive", "Diving center"),
        ("yoga", "Yoga"),
        ("rooftop", "Rooftop terrace"),
        ("infinity pool", "Infinity pool"),
        ("private beach", "Private beach"),
        ("butler", "Butler service"),
        ("concierge", "Concierge"),
        ("sauna", "Sauna"),
    ];

    for (kw, label) in &keywords {
        if lower.contains(kw) && !amenities.contains(&label.to_string()) {
            amenities.push(label.to_string());
        }
    }

    amenities
}

// ── Phase D: DeepSeek fallback structuring ──────────────────────────────

/// Structure a text cluster into a Hotel using DeepSeek (fallback).
/// Only called when regex extraction fails on a high-relevance passage.
#[cfg(feature = "deepseek-fallback")]
pub async fn structure_with_deepseek(text: &str) -> Result<Hotel> {
    use deepseek::{build_request, client_from_env, ChatMessage, DeepSeekModel, EffortLevel};

    let client = client_from_env()?;
    let messages = vec![
        ChatMessage::system(
            "You are a travel data extractor. Return ONLY valid JSON matching this schema: \
             {\"name\": str, \"description\": str, \"star_rating\": int, \"board_type\": str, \
             \"price_eur\": float, \"location\": str, \"lat\": float, \"lng\": float, \
             \"amenities\": [str]}. No markdown fences.",
        ),
        ChatMessage::user(format!(
            "Extract hotel data from this text about a new 2026 Crete hotel:\n\n{text}"
        )),
    ];
    let req = build_request(&DeepSeekModel::Chat, messages, None, &EffortLevel::Low);
    let resp = client.chat(req).await?;
    let content = resp
        .choices
        .first()
        .and_then(|c| c.message.content.as_text())
        .context("no response content")?;

    // Strip markdown fences if present
    let json_str = content
        .trim()
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();

    #[derive(serde::Deserialize)]
    struct Extracted {
        name: String,
        description: String,
        star_rating: u8,
        board_type: String,
        price_eur: f32,
        location: String,
        lat: f64,
        lng: f64,
        amenities: Vec<String>,
    }

    let ex: Extracted = serde_json::from_str(json_str).context("parsing DeepSeek JSON")?;

    Ok(Hotel {
        hotel_id: slug_from_name(&ex.name),
        name: ex.name,
        description: ex.description,
        star_rating: ex.star_rating,
        board_type: ex.board_type,
        price_eur: ex.price_eur,
        location: ex.location,
        region: "Crete".to_string(),
        lat: ex.lat,
        lng: ex.lng,
        source_url: String::new(),
        amenities: ex.amenities,
        image_url: None,
        gallery: vec![],
        opened_year: Some(DISCOVERY_YEAR),
    })
}

// ── Validation ─────────────────────────────────────────────────────────

/// Cosine similarity between two L2-normalized vectors (public for tests).
pub fn cosine_sim(a: &[f32], b: &[f32]) -> f32 {
    dot_product(a, b)
}

/// Validate a hotel candidate is plausible for Crete.
pub fn validate_hotel(hotel: &Hotel) -> bool {
    if hotel.name.is_empty() || hotel.name.len() < 4 {
        return false;
    }
    // Must look like a hotel name (not a generic phrase)
    let lower = hotel.name.to_lowercase();
    if lower.starts_with("the best") || lower.starts_with("top ") {
        return false;
    }
    if hotel.star_rating < 1 || hotel.star_rating > 5 {
        return false;
    }
    // Require a nonzero price for scraped entries (curated have real prices)
    if hotel.price_eur > 0.0 && (hotel.price_eur < 30.0 || hotel.price_eur > 3000.0) {
        return false;
    }
    // Greece bounding box
    if hotel.lat != 0.0 && (hotel.lat < 34.5 || hotel.lat > 41.8) {
        return false;
    }
    if hotel.lng != 0.0 && (hotel.lng < 19.3 || hotel.lng > 29.7) {
        return false;
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::DISCOVERY_YEAR;
    use crate::hotel::test_hotel;

    // ── slug_from_name ─────────────────────────────────────────────

    #[test]
    fn slug_basic() {
        assert_eq!(slug_from_name("W Crete"), "w-crete");
    }

    #[test]
    fn slug_strips_special_chars() {
        assert_eq!(
            slug_from_name("One&Only Agioi Theodoroi"),
            "one-only-agioi-theodoroi"
        );
    }

    #[test]
    fn slug_collapses_dashes() {
        assert_eq!(slug_from_name("Aman   Elounda"), "aman-elounda");
    }

    // ── normalize_board_type ───────────────────────────────────────

    #[test]
    fn board_all_inclusive() {
        assert_eq!(normalize_board_type("all-inclusive"), "All-Inclusive");
        assert_eq!(normalize_board_type("All Inclusive"), "All-Inclusive");
    }

    #[test]
    fn board_half_board() {
        assert_eq!(normalize_board_type("half-board"), "Half Board");
    }

    #[test]
    fn board_bb() {
        assert_eq!(normalize_board_type("bed & breakfast"), "Bed & Breakfast");
    }

    #[test]
    fn board_unknown_returns_standard() {
        assert_eq!(normalize_board_type("something else"), "Standard");
    }

    // ── extract_amenities ──────────────────────────────────────────

    #[test]
    fn amenities_from_text() {
        let text = "The resort has a large pool, spa, and private beach. \
                    Free wifi is available. There is a kids club and yoga studio.";
        let amenities = extract_amenities(text);
        assert!(amenities.contains(&"Swimming pool".to_string()));
        assert!(amenities.contains(&"Spa".to_string()));
        assert!(amenities.contains(&"Private beach".to_string()));
        assert!(amenities.contains(&"Wi-Fi".to_string()));
        assert!(amenities.contains(&"Kids club".to_string()));
        assert!(amenities.contains(&"Yoga".to_string()));
    }

    #[test]
    fn amenities_no_duplicates() {
        let text = "Pool and pool and pool. Fitness gym and gym equipment.";
        let amenities = extract_amenities(text);
        let pool_count = amenities.iter().filter(|a| *a == "Swimming pool").count();
        assert_eq!(pool_count, 1);
    }

    #[test]
    fn amenities_empty_on_irrelevant_text() {
        let text = "The weather in Crete is warm and sunny during summer.";
        let amenities = extract_amenities(text);
        assert!(amenities.is_empty());
    }

    // ── build_description ──────────────────────────────────────────

    #[test]
    fn description_extracts_relevant_sentences() {
        let text = "The city of Chania is beautiful. \
                    W Crete Hotel opens in 2026 with a stunning pool complex. \
                    The resort features 200 rooms and a world-class spa. \
                    Weather is typically warm.";
        let desc = build_description(text, "W Crete");
        assert!(desc.contains("W Crete"));
        assert!(desc.contains("pool") || desc.contains("resort") || desc.contains("spa"));
    }

    #[test]
    fn description_falls_back_to_first_sentences() {
        let text = "Crete is the largest Greek island with diverse landscapes. \
                    It has a rich cultural heritage spanning millennia.";
        let desc = build_description(text, "NonexistentHotel");
        assert!(!desc.is_empty());
    }

    // ── validate_hotel ─────────────────────────────────────────────

    #[test]
    fn validate_rejects_empty_name() {
        let mut h = test_hotel("", 4, "Chania");
        h.name = String::new();
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_rejects_short_name() {
        let mut h = test_hotel("Hi", 4, "Chania");
        h.name = "Hi".into();
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_rejects_generic_phrase() {
        let h = test_hotel("The best family hotel", 4, "Chania");
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_rejects_zero_stars() {
        let mut h = test_hotel("Good Hotel", 0, "Chania");
        h.star_rating = 0;
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_rejects_six_stars() {
        let mut h = test_hotel("Good Hotel", 6, "Chania");
        h.star_rating = 6;
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_rejects_absurd_price() {
        let mut h = test_hotel("Good Hotel", 4, "Chania");
        h.price_eur = 5.0;
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_accepts_zero_price() {
        // Zero price is OK (unknown/not extracted)
        let mut h = test_hotel("Good Hotel", 4, "Chania");
        h.price_eur = 0.0;
        assert!(validate_hotel(&h));
    }

    #[test]
    fn validate_rejects_outside_greece_lat() {
        let mut h = test_hotel("Good Hotel", 4, "Istanbul");
        h.lat = 42.5; // north of Greece bbox
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_rejects_outside_greece_lng() {
        let mut h = test_hotel("Good Hotel", 4, "Somewhere");
        h.lng = 30.5; // east of Greece bbox
        assert!(!validate_hotel(&h));
    }

    #[test]
    fn validate_accepts_valid_crete_hotel() {
        let h = test_hotel("Aman Elounda", 5, "Elounda, Crete");
        assert!(validate_hotel(&h));
    }

    // ── greece_locations ────────────────────────────────────────────

    #[test]
    fn greece_locations_all_within_bbox() {
        for (name, _region, lat, lng) in greece_locations() {
            assert!(
                lat >= 34.5 && lat <= 41.8,
                "{name} lat {lat} out of Greece bbox"
            );
            assert!(
                lng >= 19.3 && lng <= 29.7,
                "{name} lng {lng} out of Greece bbox"
            );
        }
    }

    #[test]
    fn greece_locations_has_major_cities() {
        let locs = greece_locations();
        let names: Vec<&str> = locs.iter().map(|(n, _, _, _)| *n).collect();
        assert!(names.contains(&"Chania"));
        assert!(names.contains(&"Heraklion"));
        assert!(names.contains(&"Athens"));
        assert!(names.contains(&"Santorini"));
        assert!(names.contains(&"Mykonos"));
        assert!(names.contains(&"Rhodes"));
    }

    // ── extract_hotels (integration) ───────────────────────────────

    #[test]
    fn extract_hotels_from_passage_with_hotel_mention() {
        let passage = RankedPassage {
            passage: ScrapedPassage {
                text: "The stunning Domes Zeen Chania Resort is a brand-new 5-star luxury \
                       property opening in 2026. Rooms start at €340 per night. \
                       Located in Chania, it features all-inclusive dining, a pool, \
                       and spa facilities."
                    .into(),
                source_url: "https://example.com".into(),
                heading: None,
            },
            score: 0.8,
        };
        let hotels = extract_hotels(&[passage]);
        assert!(!hotels.is_empty(), "should extract at least one hotel");
        let h = &hotels[0];
        assert!(h.name.contains("Domes Zeen Chania Resort"));
        assert_eq!(h.star_rating, 5);
        assert_eq!(h.opened_year, Some(DISCOVERY_YEAR));
        assert!(h.price_eur > 300.0);
        assert_eq!(h.location, "Chania, Crete, Greece");
        assert!(h.amenities.contains(&"Swimming pool".to_string()));
        assert!(h.amenities.contains(&"Spa".to_string()));
    }

    #[test]
    fn extract_hotels_skips_passage_without_2026() {
        let passage = RankedPassage {
            passage: ScrapedPassage {
                text: "The Kiani Beach Resort is an established 5-star property in Chania. \
                       Rooms from €224 per night with all-inclusive options."
                    .into(),
                source_url: "https://example.com".into(),
                heading: None,
            },
            score: 0.5,
        };
        let hotels = extract_hotels(&[passage]);
        assert!(hotels.is_empty(), "should skip passage without 2026 mention");
    }

    #[test]
    fn extract_hotels_deduplicates_by_name() {
        let p1 = RankedPassage {
            passage: ScrapedPassage {
                text: "Aman Elounda Resort opens in 2026 as a luxury retreat.".into(),
                source_url: "https://a.com".into(),
                heading: None,
            },
            score: 0.9,
        };
        let p2 = RankedPassage {
            passage: ScrapedPassage {
                text: "Aman Elounda Resort confirmed for 2026 opening in Crete.".into(),
                source_url: "https://b.com".into(),
                heading: None,
            },
            score: 0.8,
        };
        let hotels = extract_hotels(&[p1, p2]);
        let aman_count = hotels.iter().filter(|h| h.name.contains("Aman")).count();
        assert!(aman_count <= 1, "duplicate names should be deduped");
    }

    // ── cosine_sim ─────────────────────────────────────────────────

    #[test]
    fn cosine_sim_identical_vectors() {
        let v = vec![0.5, 0.5, 0.5, 0.5];
        let norm = (v.iter().map(|x| x * x).sum::<f32>()).sqrt();
        let normalized: Vec<f32> = v.iter().map(|x| x / norm).collect();
        let sim = cosine_sim(&normalized, &normalized);
        assert!((sim - 1.0).abs() < 1e-5);
    }

    #[test]
    fn cosine_sim_orthogonal_vectors() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![0.0, 1.0, 0.0];
        let sim = cosine_sim(&a, &b);
        assert!(sim.abs() < 1e-5);
    }
}
