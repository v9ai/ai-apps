//! Candle embedding-based review analysis with web scraping.
//!
//! Uses all-MiniLM-L6-v2 embeddings for:
//! - Sentiment scoring (cosine similarity to positive/negative anchor phrases)
//! - Aspect extraction (cosine similarity to aspect anchor phrases)
//! - Representative review selection (centroid proximity)
//! - Pros/cons extraction (sentence-level sentiment partitioning)
//! - Value-for-money scoring (price-normalized sentiment × quality)
//! - Discovery scoring (cheap × reviewed × best)
//!
//! Web scraping:
//! - Google search snippets for hotel reviews
//! - Extract review ratings (N/10) and review counts from search results
//! - Parse actual review text from scraped pages

use std::collections::HashMap;

use anyhow::{Context, Result};
use futures::stream::{self, StreamExt};
use regex::Regex;
use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};
use tracing::{info, warn};

use crate::embeddings::EmbeddingEngine;
use crate::hotel::Hotel;

// ── Data structures ──────────────────────────────────────────────────

/// A single review (scraped or synthesized from description).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Review {
    pub text: String,
    pub source: String,
    pub sentiment: f32,
    pub aspects: Vec<String>,
    pub is_representative: bool,
}

/// Full ML analysis for a hotel.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewAnalysis {
    pub reviews: Vec<Review>,
    pub sentiment_score: f32,
    pub aspect_scores: HashMap<String, f32>,
    pub review_summary: String,
    pub pros: Vec<String>,
    pub cons: Vec<String>,
    pub review_count: u32,
    pub review_rating: f32,
    pub value_score: f32,
    pub discovery_score: f32,
}

/// Enriched hotel with review analysis (wraps Hotel via flatten).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnrichedHotel {
    #[serde(flatten)]
    pub hotel: Hotel,
    #[serde(flatten)]
    pub analysis: ReviewAnalysis,
}

/// Search result with enriched hotel data.
#[derive(Debug, Clone, Serialize)]
pub struct EnrichedSearchResult {
    pub hotel: EnrichedHotel,
    pub score: f32,
}

/// Raw scraped review data before ML analysis.
#[derive(Debug, Clone)]
pub struct ScrapedReviewData {
    pub review_texts: Vec<String>,
    pub review_count: u32,
    pub review_rating: f32,
    pub sources: Vec<String>,
}

// ── Sentiment anchors ────────────────────────────────────────────────

const POSITIVE_ANCHOR: &str =
    "excellent amazing wonderful perfect outstanding beautiful luxurious \
     pristine immaculate friendly welcoming relaxing paradise stunning \
     exceptional superb delightful comfortable fabulous";

const NEGATIVE_ANCHOR: &str =
    "terrible awful dirty disappointing poor worst avoid horrible \
     noisy cramped overpriced rude broken old damaged smelly \
     uncomfortable mediocre underwhelming";

// ── Aspect definitions ───────────────────────────────────────────────

fn aspect_anchors() -> Vec<(&'static str, &'static str)> {
    vec![
        ("Food", "food dining restaurant meals breakfast dinner cuisine chef menu buffet"),
        ("Cleanliness", "clean room tidy housekeeping hygiene spotless fresh modern maintained"),
        ("Location", "location convenient central beach close walking distance view panoramic seaside"),
        ("Service", "staff friendly helpful service reception concierge attentive professional welcoming"),
        ("Value", "value money price cheap worth affordable budget reasonable deal bargain"),
        ("Beach", "beach sea pool swimming water sand shore coast waves snorkeling"),
        ("Spa", "spa wellness massage sauna hammam relaxation treatment therapy yoga"),
        ("Family", "family kids children playground animation club babysitting waterslide activities"),
    ]
}

// ── Review scraping ──────────────────────────────────────────────────

/// Load pre-scraped review data from a JSON file (produced by Playwright scraper).
///
/// File format: `{ "hotel-id": { "review_rating": 8.7, "review_count": 1234, "review_texts": [...], "sources": [...] } }`
///
/// Returns None if the file doesn't exist or the hotel isn't found.
pub fn load_prescraped_reviews(hotel_id: &str, path: &str) -> Option<ScrapedReviewData> {
    let content = std::fs::read_to_string(path).ok()?;
    let data: serde_json::Value = serde_json::from_str(&content).ok()?;
    let entry = data.get(hotel_id)?;

    let review_rating = entry.get("review_rating")?.as_f64()? as f32;
    let review_count = entry.get("review_count")?.as_u64()? as u32;
    let review_texts: Vec<String> = entry
        .get("review_texts")?
        .as_array()?
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect();
    let sources: Vec<String> = entry
        .get("sources")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
        .unwrap_or_default();

    if review_rating > 0.0 || review_count > 0 || !review_texts.is_empty() {
        Some(ScrapedReviewData {
            review_texts,
            review_count,
            review_rating,
            sources,
        })
    } else {
        None
    }
}

/// Load pre-scraped gallery images for a hotel from Playwright JSON output.
///
/// File format: `{ "hotel-id": { ..., "gallery": ["url1", "url2", ...] } }`
///
/// Returns None if the file doesn't exist, the hotel isn't found, or gallery is empty.
pub fn load_prescraped_gallery(hotel_id: &str, path: &str) -> Option<Vec<String>> {
    let content = std::fs::read_to_string(path).ok()?;
    let data: serde_json::Value = serde_json::from_str(&content).ok()?;
    let gallery: Vec<String> = data
        .get(hotel_id)?
        .get("gallery")?
        .as_array()?
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect();
    if gallery.is_empty() {
        None
    } else {
        Some(gallery)
    }
}

/// Scrape review data for a hotel from Google Maps and Booking.com.
///
/// Sources (in priority order):
/// 1. Google Maps search — embedded JSON with ratings + review snippets
/// 2. Google search knowledge panel — aggregateRating, review snippets
/// 3. Booking.com search results — review scores and text
///
/// All ratings and review counts come exclusively from scraped data.
/// If no data is found, returns zeros — never fabricated.
pub async fn scrape_hotel_reviews(hotel: &Hotel) -> ScrapedReviewData {
    let mut all_texts = Vec::new();
    let mut best_rating: f32 = 0.0;
    let mut best_count: u32 = 0;
    let mut sources = Vec::new();

    let search_name = hotel.name.replace('&', "and");
    let region = &hotel.region;

    // Source 1: Google Maps search — most reliable for real review data
    let maps_url = format!(
        "https://www.google.com/maps/search/{}+{}/",
        urlencoded(&search_name),
        urlencoded(region),
    );
    if let Some(data) = fetch_review_page(&maps_url).await {
        let (texts, rating, count) = parse_google_maps_results(&data);
        if rating > best_rating { best_rating = rating; }
        if count > best_count { best_count = count; }
        if !texts.is_empty() || rating > 0.0 {
            sources.push("google_maps".to_string());
        }
        all_texts.extend(texts);
    }

    // Source 2: Google search with review query — knowledge panel + snippets
    let google_url = format!(
        "https://www.google.com/search?q={}+{}+hotel+reviews+rating&num=10&hl=en",
        urlencoded(&search_name),
        urlencoded(region),
    );
    if let Some(data) = fetch_review_page(&google_url).await {
        let (texts, rating, count) = parse_google_results(&data);
        // Also try schema.org JSON-LD extraction
        let (ld_rating, ld_count) = extract_jsonld_rating(&data);
        let rating = if ld_rating > rating { ld_rating } else { rating };
        let count = if ld_count > count { ld_count } else { count };
        if rating > best_rating { best_rating = rating; }
        if count > best_count { best_count = count; }
        if !texts.is_empty() || rating > 0.0 {
            sources.push("google".to_string());
        }
        all_texts.extend(texts);
    }

    // Source 3: Booking.com search — review scores + snippets
    let booking_url = format!(
        "https://www.booking.com/searchresults.html?ss={}+{}&lang=en-us&selected_currency=EUR",
        urlencoded(&search_name),
        urlencoded(region),
    );
    if let Some(data) = fetch_review_page(&booking_url).await {
        let (texts, rating, count) = parse_booking_results(&data);
        let (ld_rating, ld_count) = extract_jsonld_rating(&data);
        let rating = if ld_rating > rating { ld_rating } else { rating };
        let count = if ld_count > count { ld_count } else { count };
        if rating > best_rating { best_rating = rating; }
        if count > best_count { best_count = count; }
        if !texts.is_empty() || rating > 0.0 {
            sources.push("booking".to_string());
        }
        all_texts.extend(texts);
    }

    // Source 4: Google search for Booking.com page specifically
    // (Google caches Booking.com data in knowledge panel)
    if best_count == 0 {
        let booking_google_url = format!(
            "https://www.google.com/search?q=site%3Abooking.com+{}+{}+hotel&hl=en",
            urlencoded(&search_name),
            urlencoded(region),
        );
        if let Some(data) = fetch_review_page(&booking_google_url).await {
            let (texts, rating, count) = parse_google_results(&data);
            if rating > best_rating { best_rating = rating; }
            if count > best_count { best_count = count; }
            if !texts.is_empty() {
                sources.push("google_booking".to_string());
            }
            all_texts.extend(texts);
        }
    }

    // Deduplicate review texts
    all_texts.sort();
    all_texts.dedup();

    if best_count > 0 || !all_texts.is_empty() {
        info!(
            "Scraped reviews for '{}': {} texts, rating {:.1}, {} reviews from [{}]",
            hotel.name, all_texts.len(), best_rating, best_count, sources.join(", "),
        );
    } else {
        info!("No real reviews found for '{}' — all sources returned empty", hotel.name);
    }

    ScrapedReviewData {
        review_texts: all_texts,
        review_count: best_count,
        review_rating: best_rating,
        sources,
    }
}

async fn fetch_review_page(url: &str) -> Option<String> {
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
            h.insert("DNT", "1".parse().unwrap());
            h.insert("Sec-Fetch-Dest", "document".parse().unwrap());
            h.insert("Sec-Fetch-Mode", "navigate".parse().unwrap());
            h.insert("Sec-Fetch-Site", "none".parse().unwrap());
            h.insert("Sec-Fetch-User", "?1".parse().unwrap());
            h.insert("Upgrade-Insecure-Requests", "1".parse().unwrap());
            h
        })
        .redirect(reqwest::redirect::Policy::limited(5))
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .ok()?;

    match client.get(url).send().await {
        Ok(resp) if resp.status().is_success() => resp.text().await.ok(),
        Ok(resp) => {
            warn!("Review scrape HTTP {} for {}", resp.status(), url);
            None
        }
        Err(e) => {
            warn!("Review scrape failed for {}: {}", url, e);
            None
        }
    }
}

/// Parse Google Maps search results for review data.
///
/// Google Maps embeds review data in the page HTML as:
/// - Star ratings in aria-label attributes ("4.5 stars")
/// - Review counts in text ("1,234 reviews")
/// - Review snippet text in specific divs
fn parse_google_maps_results(html: &str) -> (Vec<String>, f32, u32) {
    let doc = Html::parse_document(html);
    let mut texts = Vec::new();
    let mut rating: f32 = 0.0;
    let mut count: u32 = 0;

    // Extract star rating from aria-label attributes ("4.5 stars", "4,5 étoiles")
    let re_stars = Regex::new(r"(\d+[.,]\d+)\s+stars?").ok();
    if let Ok(sel) = Selector::parse("[aria-label]") {
        for el in doc.select(&sel) {
            if let Some(label) = el.value().attr("aria-label") {
                if let Some(ref re) = re_stars {
                    if let Some(cap) = re.captures(label) {
                        if let Ok(r) = cap[1].replace(',', ".").parse::<f32>() {
                            // Google Maps uses /5, convert to /10
                            let r10 = r * 2.0;
                            if r10 > rating && r10 <= 10.0 { rating = r10; }
                        }
                    }
                }
                // Also extract review count from labels like "4.5 stars 1,234 reviews"
                if let Some(c) = extract_review_count(label) {
                    if c > count { count = c; }
                }
            }
        }
    }

    // Extract review snippets from Maps page
    for sel_str in [".section-review-text", ".MyEned", ".wiI7pd", "[data-review-id] span", ".rsqaWe"] {
        if let Ok(sel) = Selector::parse(sel_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>().trim().to_string();
                if text.len() > 20 && text.len() < 500 {
                    texts.push(text);
                }
            }
        }
    }

    // Fallback: extract from embedded JSON in script tags
    if let Ok(sel) = Selector::parse("script") {
        for el in doc.select(&sel) {
            let script_text: String = el.text().collect();
            // Google Maps often embeds rating as "rating":4.5 or [null,4.5,...]
            if script_text.contains("\"rating\"") || script_text.contains("ratingValue") {
                if let Ok(re) = Regex::new(r#""rating"\s*:\s*(\d+\.?\d*)"#) {
                    if let Some(cap) = re.captures(&script_text) {
                        if let Ok(r) = cap[1].parse::<f32>() {
                            let r10 = if r <= 5.0 { r * 2.0 } else { r };
                            if r10 > rating && r10 <= 10.0 { rating = r10; }
                        }
                    }
                }
                if let Ok(re) = Regex::new(r#""userRatingCount"\s*:\s*(\d+)"#) {
                    if let Some(cap) = re.captures(&script_text) {
                        if let Ok(c) = cap[1].parse::<u32>() {
                            if c > count { count = c; }
                        }
                    }
                }
            }
        }
    }

    // Fallback: text-level extraction for review count
    if count == 0 {
        let full_text: String = doc.root_element().text().collect();
        if let Some(c) = extract_review_count(&full_text) {
            count = c;
        }
    }

    (texts.into_iter().take(10).collect(), rating, count)
}

/// Parse Google search results for review snippets, rating, count.
///
/// Extracts from: knowledge panel, search snippets, and embedded structured data.
fn parse_google_results(html: &str) -> (Vec<String>, f32, u32) {
    let doc = Html::parse_document(html);
    let mut texts = Vec::new();
    let mut rating: f32 = 0.0;
    let mut count: u32 = 0;

    // Knowledge panel star rating from aria-label ("Rated 4.5 out of 5")
    if let Ok(sel) = Selector::parse("[aria-label]") {
        let re = Regex::new(r"[Rr]ated\s+(\d+\.?\d*)\s+out\s+of\s+5").ok();
        for el in doc.select(&sel) {
            if let Some(label) = el.value().attr("aria-label") {
                if let Some(ref re) = re {
                    if let Some(cap) = re.captures(label) {
                        if let Ok(r) = cap[1].parse::<f32>() {
                            let r10 = r * 2.0;
                            if r10 > rating && r10 <= 10.0 { rating = r10; }
                        }
                    }
                }
            }
        }
    }

    // Extract text snippets from search results (various Google CSS classes)
    for sel_str in [
        ".BNeawe", ".VwiC3b", ".lEBKkf", "span.aCOpRe", "div.IsZvec",
        "[data-attrid] span", ".hgKElc", ".ILfuVd", ".yDYNvb",
    ] {
        if let Ok(sel) = Selector::parse(sel_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>().trim().to_string();
                if text.len() > 30 && text.len() < 500 {
                    texts.push(text);
                }
            }
        }
    }

    // Extract rating from full text: "X/10", "X out of 10"
    let full_text: String = doc.root_element().text().collect();
    if let Some((r, c)) = extract_rating_count(&full_text) {
        if r > rating { rating = r; }
        if c > count { count = c; }
    }

    // Also try Google's "N stars" pattern in full text (out of 5)
    if rating == 0.0 {
        if let Ok(re) = Regex::new(r"(\d+\.?\d*)\s+out\s+of\s+5\s+stars?") {
            if let Some(cap) = re.captures(&full_text) {
                if let Ok(r) = cap[1].parse::<f32>() {
                    let r10 = r * 2.0;
                    if r10 <= 10.0 { rating = r10; }
                }
            }
        }
    }

    // Extract review count from text like "(1,234)" near rating
    if count == 0 {
        if let Ok(re) = Regex::new(r"\((\d[\d,]*)\)") {
            for cap in re.captures_iter(&full_text) {
                if let Ok(c) = cap[1].replace(',', "").parse::<u32>() {
                    if c > 10 && c > count { count = c; }  // >10 to avoid false positives
                }
            }
        }
    }

    (texts.into_iter().take(10).collect(), rating, count)
}

/// Extract rating and review count from schema.org JSON-LD embedded in HTML.
///
/// Many sites (Google, Booking, Hotels.com) embed structured data like:
/// ```json
/// {"@type": "Hotel", "aggregateRating": {"ratingValue": "8.7", "reviewCount": "1234"}}
/// ```
fn extract_jsonld_rating(html: &str) -> (f32, u32) {
    let doc = Html::parse_document(html);
    let mut rating: f32 = 0.0;
    let mut count: u32 = 0;

    if let Ok(sel) = Selector::parse("script[type='application/ld+json']") {
        for el in doc.select(&sel) {
            let json_text: String = el.text().collect();

            // Extract ratingValue (could be "8.7" or 8.7)
            if let Ok(re) = Regex::new(r#""ratingValue"\s*:\s*"?(\d+\.?\d*)"?"#) {
                if let Some(cap) = re.captures(&json_text) {
                    if let Ok(r) = cap[1].parse::<f32>() {
                        // Determine scale: if <=5, it's /5; if <=10, it's /10
                        let r10 = if r <= 5.0 { r * 2.0 } else { r };
                        if r10 > rating && r10 <= 10.0 { rating = r10; }
                    }
                }
            }

            // Extract reviewCount
            if let Ok(re) = Regex::new(r#""reviewCount"\s*:\s*"?(\d+)"?"#) {
                if let Some(cap) = re.captures(&json_text) {
                    if let Ok(c) = cap[1].parse::<u32>() {
                        if c > count { count = c; }
                    }
                }
            }

            // Also try "bestRating" to confirm scale
            if let Ok(re) = Regex::new(r#""bestRating"\s*:\s*"?(\d+)"?"#) {
                if let Some(cap) = re.captures(&json_text) {
                    if let Ok(best) = cap[1].parse::<f32>() {
                        // Re-normalize if bestRating is 5
                        if best <= 5.0 && rating <= 5.0 {
                            rating *= 2.0;
                        }
                    }
                }
            }
        }
    }

    (rating, count)
}

/// Parse Booking.com search results.
fn parse_booking_results(html: &str) -> (Vec<String>, f32, u32) {
    let doc = Html::parse_document(html);
    let mut texts = Vec::new();
    let mut rating: f32 = 0.0;
    let mut count: u32 = 0;

    // Review score badges
    for sel_str in [".bui-review-score__badge", ".d10a6220b4", "[data-testid='review-score']"] {
        if let Ok(sel) = Selector::parse(sel_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>().trim().to_string();
                if let Ok(r) = text.parse::<f32>() {
                    if r > rating && r <= 10.0 { rating = r; }
                }
            }
        }
    }

    // Review count
    for sel_str in [".bui-review-score__text", "[data-testid='review-score-component']"] {
        if let Ok(sel) = Selector::parse(sel_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>();
                if let Some(c) = extract_review_count(&text) {
                    if c > count { count = c; }
                }
            }
        }
    }

    // Review text snippets
    for sel_str in [".c-review__body", ".review_item_review_content", ".db29ecfbe2"] {
        if let Ok(sel) = Selector::parse(sel_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>().trim().to_string();
                if text.len() > 20 && text.len() < 500 {
                    texts.push(text);
                }
            }
        }
    }

    let full_text: String = doc.root_element().text().collect();
    if rating == 0.0 || count == 0 {
        if let Some((r, c)) = extract_rating_count(&full_text) {
            if r > rating { rating = r; }
            if c > count { count = c; }
        }
    }

    (texts.into_iter().take(10).collect(), rating, count)
}

/// Parse TripAdvisor search results.
#[allow(dead_code)]
fn parse_tripadvisor_results(html: &str) -> (Vec<String>, f32, u32) {
    let doc = Html::parse_document(html);
    let mut texts = Vec::new();
    let mut rating: f32 = 0.0;
    let mut count: u32 = 0;

    // Rating bubbles (out of 5, convert to 10)
    if let Ok(sel) = Selector::parse("[class*='bubble_rating']") {
        for el in doc.select(&sel) {
            if let Some(class) = el.value().attr("class") {
                if let Some(cap) = Regex::new(r"bubble_(\d)0").ok().and_then(|re| re.captures(class)) {
                    if let Ok(r) = cap[1].parse::<f32>() {
                        let converted = r * 2.0;
                        if converted > rating { rating = converted; }
                    }
                }
            }
        }
    }

    // Review text
    for sel_str in [".review-container", ".partial_entry", ".prw_reviews_text_summary_hsx"] {
        if let Ok(sel) = Selector::parse(sel_str) {
            for el in doc.select(&sel) {
                let text: String = el.text().collect::<String>().trim().to_string();
                if text.len() > 20 && text.len() < 500 {
                    texts.push(text);
                }
            }
        }
    }

    let full_text: String = doc.root_element().text().collect();
    if count == 0 {
        if let Some(c) = extract_review_count(&full_text) {
            count = c;
        }
    }

    (texts.into_iter().take(10).collect(), rating, count)
}

/// Extract rating (N/10 or N out of 10) and review count from text.
fn extract_rating_count(text: &str) -> Option<(f32, u32)> {
    let mut rating: f32 = 0.0;
    let mut count: u32 = 0;

    // Rating: "8.7/10" or "8.7 out of 10" or "Rating: 8.7"
    if let Ok(re) = Regex::new(r"(\d+\.?\d*)\s*/\s*10") {
        if let Some(cap) = re.captures(text) {
            if let Ok(r) = cap[1].parse::<f32>() {
                if r <= 10.0 && r > 0.0 { rating = r; }
            }
        }
    }
    if rating == 0.0 {
        if let Ok(re) = Regex::new(r"(\d+\.?\d*)\s+out\s+of\s+10") {
            if let Some(cap) = re.captures(text) {
                if let Ok(r) = cap[1].parse::<f32>() {
                    if r <= 10.0 && r > 0.0 { rating = r; }
                }
            }
        }
    }

    // Count: "123 reviews" or "Based on 456 reviews"
    if let Some(c) = extract_review_count(text) {
        count = c;
    }

    if rating > 0.0 || count > 0 {
        Some((rating, count))
    } else {
        None
    }
}

/// Extract review count from text like "123 reviews" or "1,234 reviews".
fn extract_review_count(text: &str) -> Option<u32> {
    let re = Regex::new(r"([\d,]+)\s+reviews?").ok()?;
    let cap = re.captures(text)?;
    let num_str = cap[1].replace(',', "");
    num_str.parse().ok()
}

/// URL-encode a string for search queries.
fn urlencoded(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            ' ' => '+'.to_string(),
            c if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' => c.to_string(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}

/// Scrape hotel images from Google Maps and Google Images search.
/// Returns a vector of image URLs (up to 6).
pub async fn scrape_hotel_images(hotel: &Hotel) -> Vec<String> {
    let mut images = Vec::new();
    let search_name = hotel.name.replace('&', "and");
    let region = &hotel.region;

    // Source 1: Google Images search
    let url = format!(
        "https://www.google.com/search?q={}+{}+hotel&tbm=isch&tbs=isz:l",
        urlencoded(&search_name),
        urlencoded(region),
    );
    if let Some(html) = fetch_review_page(&url).await {
        let doc = Html::parse_document(&html);
        // Extract image URLs from Google Image search results
        if let Ok(sel) = Selector::parse("img") {
            for el in doc.select(&sel) {
                if let Some(src) = el.value().attr("src").or_else(|| el.value().attr("data-src")) {
                    if src.starts_with("http") && !src.contains("gstatic.com/images") && !src.contains("google.com/images") {
                        if src.contains(".jpg") || src.contains(".jpeg") || src.contains(".png") || src.contains(".webp")
                            || src.contains("encrypted-tbn") {
                            images.push(src.to_string());
                        }
                    }
                }
            }
        }
    }

    // Source 2: Google Maps search for the hotel
    let maps_url = format!(
        "https://www.google.com/maps/search/{}+{}",
        urlencoded(&search_name),
        urlencoded(region),
    );
    if let Some(html) = fetch_review_page(&maps_url).await {
        let doc = Html::parse_document(&html);
        if let Ok(sel) = Selector::parse("img[src*='googleusercontent'], img[src*='lh3.'], img[src*='lh5.']") {
            for el in doc.select(&sel) {
                if let Some(src) = el.value().attr("src") {
                    if src.starts_with("http") && !images.contains(&src.to_string()) {
                        images.push(src.to_string());
                    }
                }
            }
        }
    }

    // Deduplicate and limit
    images.dedup();
    images.truncate(6);

    if images.is_empty() {
        info!("No images found for '{}' — will use Google Maps satellite view", hotel.name);
    } else {
        info!("Found {} images for '{}'", images.len(), hotel.name);
    }

    images
}

// ── Core ML functions ────────────────────────────────────────────────

/// Pre-computed anchor embeddings — constant across all hotels.
/// Build once with `AnchorVecs::new()`, reuse for every hotel.
pub struct AnchorVecs {
    pub positive: Vec<f32>,
    pub negative: Vec<f32>,
    pub aspect_names: Vec<&'static str>,
    pub aspect_vecs: Vec<Vec<f32>>,
}

impl AnchorVecs {
    pub fn new(engine: &EmbeddingEngine) -> Result<Self> {
        let positive = engine.embed_one(POSITIVE_ANCHOR).context("embedding positive anchor")?;
        let negative = engine.embed_one(NEGATIVE_ANCHOR).context("embedding negative anchor")?;
        let anchors = aspect_anchors();
        let anchor_texts: Vec<&str> = anchors.iter().map(|(_, text)| *text).collect();
        let aspect_vecs = engine.embed_batch(&anchor_texts).context("embedding aspect anchors")?;
        let aspect_names: Vec<&'static str> = anchors.iter().map(|(name, _)| *name).collect();
        Ok(Self { positive, negative, aspect_names, aspect_vecs })
    }
}

// ── Vec-only helpers (no embedding calls) ────────────────────────────

fn sentiment_from_vecs(text_vecs: &[Vec<f32>], pos: &[f32], neg: &[f32]) -> Vec<f32> {
    text_vecs.iter().map(|tvec| {
        let pos_sim = dot_product(tvec, pos);
        let neg_sim = dot_product(tvec, neg);
        let denom = pos_sim.abs() + neg_sim.abs();
        if denom < 1e-8 { 0.0 } else { ((pos_sim - neg_sim) / denom).clamp(-1.0, 1.0) }
    }).collect()
}

fn aspects_from_vecs(text_vecs: &[Vec<f32>], sentiments: &[f32], a: &AnchorVecs) -> HashMap<String, f32> {
    let mut sums: HashMap<String, (f32, u32)> = HashMap::new();
    for (ti, tvec) in text_vecs.iter().enumerate() {
        for (ai, name) in a.aspect_names.iter().enumerate() {
            let sim = dot_product(tvec, &a.aspect_vecs[ai]);
            if sim >= 0.25 {
                let e = sums.entry(name.to_string()).or_insert((0.0, 0));
                e.0 += (sentiments.get(ti).copied().unwrap_or(0.0) + 1.0) / 2.0 * sim;
                e.1 += 1;
            }
        }
    }
    sums.into_iter().map(|(n, (s, c))| {
        (n, if c > 0 { (s / c as f32).clamp(0.0, 1.0) } else { 0.5 })
    }).collect()
}

fn representative_from_vecs(vecs: &[Vec<f32>], k: usize) -> Vec<usize> {
    if vecs.is_empty() || k == 0 { return vec![]; }
    let dim = vecs[0].len();
    let mut centroid = vec![0.0f32; dim];
    for v in vecs { for (i, val) in v.iter().enumerate() { centroid[i] += val; } }
    let n = vecs.len() as f32;
    for val in &mut centroid { *val /= n; }
    let norm: f32 = centroid.iter().map(|x| x * x).sum::<f32>().sqrt();
    if norm > 1e-8 { for val in &mut centroid { *val /= norm; } }
    let mut scored: Vec<(usize, f32)> = vecs.iter().enumerate()
        .map(|(i, v)| (i, dot_product(v, &centroid))).collect();
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    scored.into_iter().take(k).map(|(i, _)| i).collect()
}

fn pros_cons_from_sentiments(sentences: &[&str], sentiments: &[f32]) -> (Vec<String>, Vec<String>) {
    let mut scored: Vec<(usize, f32)> = sentiments.iter().enumerate().map(|(i, &s)| (i, s)).collect();
    scored.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let pros = scored.iter().filter(|(_, s)| *s > 0.05).take(5)
        .map(|(i, _)| sentences[*i].to_string()).collect();
    let cons = scored.iter().rev().filter(|(_, s)| *s < 0.0).take(3)
        .map(|(i, _)| sentences[*i].to_string()).collect();
    (pros, cons)
}

// ── Public API (used by tests that call functions individually) ───────

/// Compute sentiment for text passages using Candle embedding cosine similarity.
pub fn analyze_sentiment(engine: &EmbeddingEngine, texts: &[&str]) -> Result<Vec<f32>> {
    if texts.is_empty() { return Ok(vec![]); }
    let pos = engine.embed_one(POSITIVE_ANCHOR).context("embedding positive anchor")?;
    let neg = engine.embed_one(NEGATIVE_ANCHOR).context("embedding negative anchor")?;
    let vecs = embed_in_batches(engine, texts)?;
    Ok(sentiment_from_vecs(&vecs, &pos, &neg))
}

/// Extract aspect scores from text passages.
pub fn extract_aspects(engine: &EmbeddingEngine, texts: &[&str], sentiments: &[f32]) -> Result<HashMap<String, f32>> {
    if texts.is_empty() { return Ok(HashMap::new()); }
    let a = AnchorVecs::new(engine)?;
    let vecs = embed_in_batches(engine, texts)?;
    Ok(aspects_from_vecs(&vecs, sentiments, &a))
}

/// Select the k most representative texts (closest to embedding centroid).
pub fn select_representative(engine: &EmbeddingEngine, texts: &[&str], k: usize) -> Result<Vec<usize>> {
    if texts.is_empty() || k == 0 { return Ok(vec![]); }
    let vecs = embed_in_batches(engine, texts)?;
    Ok(representative_from_vecs(&vecs, k))
}

/// Extract pros and cons from sentences using sentiment analysis.
pub fn extract_pros_cons(engine: &EmbeddingEngine, sentences: &[&str]) -> Result<(Vec<String>, Vec<String>)> {
    if sentences.is_empty() { return Ok((vec![], vec![])); }
    let sentiments = analyze_sentiment(engine, sentences)?;
    Ok(pros_cons_from_sentiments(sentences, &sentiments))
}

/// Compute value-for-money score (0–100, higher = better value).
pub fn compute_value_score(
    price_eur: f32,
    sentiment_score: f32,
    star_rating: u8,
    amenity_count: usize,
    review_count: u32,
    review_rating: f32,
) -> f32 {
    if price_eur <= 0.0 {
        return 50.0;
    }

    let sentiment = ((sentiment_score + 1.0) / 2.0).clamp(0.1, 1.0);
    let review_boost = (review_count as f32).max(1.0).ln().clamp(0.5, 3.0);
    let rating_factor = if review_rating > 0.0 { review_rating / 10.0 } else { 0.7 };
    let quality = sentiment
        * star_rating as f32
        * (amenity_count as f32).max(1.0).sqrt()
        * review_boost
        * rating_factor;

    let raw_value = (quality / price_eur) * 300.0;
    raw_value.clamp(0.0, 100.0)
}

/// Compute discovery score: cheapest × most reviewed × best reviewed.
///
/// Higher = better discovery pick. Factors:
/// - Price rank (cheaper is better, log-scaled)
/// - Review volume (more reviews = more trusted)
/// - Review quality (higher sentiment + rating)
pub fn compute_discovery_score(
    price_eur: f32,
    sentiment_score: f32,
    review_count: u32,
    review_rating: f32,
    max_price: f32,
) -> f32 {
    // Price factor: inverse of normalized price (0-1, higher = cheaper)
    let price_factor = if max_price > 0.0 {
        1.0 - (price_eur / max_price).clamp(0.0, 1.0)
    } else {
        0.5
    };

    // Review volume factor: log-scaled count (0-1)
    let volume_factor = ((review_count as f32 + 1.0).ln() / 10.0).clamp(0.0, 1.0);

    // Quality factor: combine sentiment + rating
    let quality = if review_rating > 0.0 {
        sentiment_score * 0.4 + (review_rating / 10.0) * 0.6
    } else {
        sentiment_score
    };

    // Weighted composite: price 35%, volume 30%, quality 35%
    let raw = price_factor * 0.35 + volume_factor * 0.30 + quality * 0.35;
    (raw * 100.0).clamp(0.0, 100.0)
}

// ── Hotel analysis orchestrator ──────────────────────────────────────

/// Run full Candle ML analysis on a hotel using scraped + description reviews.
///
/// If `scraped` is provided, those review texts are analyzed alongside
/// the hotel description. The scraped review_count and review_rating
/// are used directly (they come from real sources like Booking.com).
pub fn analyze_hotel(
    engine: &EmbeddingEngine,
    hotel: &Hotel,
    scraped: Option<&ScrapedReviewData>,
) -> Result<ReviewAnalysis> {
    let anchors = AnchorVecs::new(engine)?;
    analyze_hotel_with_anchors(engine, hotel, scraped, &anchors)
}

/// Like [`analyze_hotel`] but reuses pre-built anchor embeddings.
/// The batch pipeline builds anchors once and calls this per hotel,
/// eliminating redundant anchor embedding (positive, negative, 8 aspects)
/// on every iteration.
pub fn analyze_hotel_with_anchors(
    engine: &EmbeddingEngine,
    hotel: &Hotel,
    scraped: Option<&ScrapedReviewData>,
    anchors: &AnchorVecs,
) -> Result<ReviewAnalysis> {
    let sentences = split_sentences(&hotel.description);
    let mut review_texts: Vec<String> = sentences.clone();
    let mut sources: Vec<String> = vec!["description".to_string()];

    let (scraped_count, scraped_rating) = if let Some(data) = scraped {
        for text in &data.review_texts { review_texts.push(text.clone()); }
        sources.extend(data.sources.clone());
        (data.review_count, data.review_rating)
    } else {
        (0, 0.0)
    };

    for a in &hotel.amenities { review_texts.push(format!("This hotel offers {a}.")); }
    review_texts.push(format!("{}-star {} in {}.", hotel.star_rating, hotel.board_type, hotel.location));
    if let Some(year) = hotel.opened_year { review_texts.push(format!("Brand new hotel opened in {year}.")); }

    let text_refs: Vec<&str> = review_texts.iter().map(|s| s.as_str()).collect();

    // ── Single embed call per hotel — reuse vecs for all steps ──
    let text_vecs = embed_in_batches(engine, &text_refs).context("embedding review texts")?;

    let sentiments = sentiment_from_vecs(&text_vecs, &anchors.positive, &anchors.negative);
    let overall_sentiment = if sentiments.is_empty() {
        0.0
    } else {
        sentiments.iter().sum::<f32>() / sentiments.len() as f32
    };

    let aspect_scores = aspects_from_vecs(&text_vecs, &sentiments, &anchors);
    let rep_indices = representative_from_vecs(&text_vecs, 3);
    let (pros, cons) = pros_cons_from_sentiments(&text_refs, &sentiments);

    let cons = if cons.is_empty() {
        infer_missing_aspects(hotel, &aspect_scores)
    } else {
        cons
    };

    // Build review summary
    let review_summary = rep_indices
        .iter()
        .filter_map(|&i| review_texts.get(i))
        .cloned()
        .collect::<Vec<_>>()
        .join(" ");

    // Build Review objects
    let mut reviews: Vec<Review> = review_texts
        .iter()
        .enumerate()
        .map(|(i, text)| {
            let sentiment = sentiments.get(i).copied().unwrap_or(0.0);
            let aspects: Vec<String> = detect_text_aspects(text);
            let source = if i < sentences.len() {
                "description"
            } else if scraped.is_some() && i < sentences.len() + scraped.map_or(0, |s| s.review_texts.len()) {
                sources.get(1).map_or("scraped", |s| s.as_str())
            } else {
                "ml-analysis"
            };
            Review {
                text: text.clone(),
                source: source.to_string(),
                sentiment,
                aspects,
                is_representative: rep_indices.contains(&i),
            }
        })
        .collect();

    // Keep the most interesting reviews
    reviews.sort_by(|a, b| b.sentiment.partial_cmp(&a.sentiment).unwrap_or(std::cmp::Ordering::Equal));
    reviews.truncate(8);

    // Only use real scraped review count — never fake it from description sentences
    let total_count = scraped_count;

    // Only use real scraped rating — 0.0 means "no rating data available"
    let review_rating = scraped_rating;

    // ── Value score ──
    let value_score = compute_value_score(
        hotel.price_eur,
        overall_sentiment,
        hotel.star_rating,
        hotel.amenities.len(),
        total_count,
        review_rating,
    );

    let sentiment_score = ((overall_sentiment + 1.0) / 2.0).clamp(0.0, 1.0);

    Ok(ReviewAnalysis {
        reviews,
        sentiment_score,
        aspect_scores,
        review_summary,
        pros,
        cons,
        review_count: total_count,
        review_rating,
        value_score,
        discovery_score: 0.0, // computed later with global context
    })
}

// ── Helpers ──────────────────────────────────────────────────────────

fn embed_in_batches(engine: &EmbeddingEngine, texts: &[&str]) -> Result<Vec<Vec<f32>>> {
    let mut all_vecs = Vec::with_capacity(texts.len());
    for chunk in texts.chunks(32) {
        let batch_vecs = engine.embed_batch(chunk).context("batch embedding")?;
        all_vecs.extend(batch_vecs);
    }
    Ok(all_vecs)
}

fn dot_product(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b.iter()).map(|(x, y)| x * y).sum()
}

fn split_sentences(text: &str) -> Vec<String> {
    text.split(|c: char| c == '.' || c == '!' || c == '?')
        .map(|s| s.trim().to_string())
        .filter(|s| s.len() > 10)
        .collect()
}

fn detect_text_aspects(text: &str) -> Vec<String> {
    let lower = text.to_lowercase();
    let mut aspects = vec![];

    if lower.contains("food") || lower.contains("restaurant") || lower.contains("dining")
        || lower.contains("breakfast") || lower.contains("cuisine") || lower.contains("chef") {
        aspects.push("Food".to_string());
    }
    if lower.contains("clean") || lower.contains("tidy") || lower.contains("housekeep")
        || lower.contains("hygiene") || lower.contains("immaculate") {
        aspects.push("Cleanliness".to_string());
    }
    if lower.contains("location") || lower.contains("view") || lower.contains("central")
        || lower.contains("walking") || lower.contains("overlooking") {
        aspects.push("Location".to_string());
    }
    if lower.contains("staff") || lower.contains("service") || lower.contains("friendly")
        || lower.contains("helpful") || lower.contains("concierge") || lower.contains("butler") {
        aspects.push("Service".to_string());
    }
    if lower.contains("value") || lower.contains("affordable") || lower.contains("budget")
        || lower.contains("cheap") || lower.contains("worth") {
        aspects.push("Value".to_string());
    }
    if lower.contains("beach") || lower.contains("pool") || lower.contains("sea")
        || lower.contains("swimming") || lower.contains("water") || lower.contains("coast") {
        aspects.push("Beach".to_string());
    }
    if lower.contains("spa") || lower.contains("wellness") || lower.contains("massage")
        || lower.contains("hammam") || lower.contains("yoga") || lower.contains("sauna") {
        aspects.push("Spa".to_string());
    }
    if lower.contains("family") || lower.contains("kids") || lower.contains("children")
        || lower.contains("playground") || lower.contains("club") {
        aspects.push("Family".to_string());
    }

    aspects
}

fn infer_missing_aspects(hotel: &Hotel, aspect_scores: &HashMap<String, f32>) -> Vec<String> {
    let mut cons = vec![];
    let text = format!("{} {}", hotel.description, hotel.amenities.join(" ")).to_lowercase();

    if !text.contains("spa") && !text.contains("wellness") && !text.contains("massage") {
        if !aspect_scores.contains_key("Spa") || aspect_scores.get("Spa").copied().unwrap_or(0.0) < 0.3 {
            cons.push("No spa or wellness facilities mentioned".to_string());
        }
    }
    if !text.contains("pool") && !text.contains("swimming") {
        cons.push("No swimming pool mentioned".to_string());
    }
    if !text.contains("gym") && !text.contains("fitness") {
        cons.push("No fitness center mentioned".to_string());
    }
    if hotel.price_eur > 300.0 {
        cons.push("Premium pricing".to_string());
    }

    cons.into_iter().take(3).collect()
}

/// Batch-analyze all hotels with review scraping, logging progress.
///
/// First checks for pre-scraped review data at `prescraped_path` (produced by
/// Playwright headless browser, which can handle JS-rendered sites like Google Maps
/// and Booking.com). Falls back to HTTP scraping via reqwest if no pre-scraped data.
/// Clear `opened_year` on hotels whose review counts prove they are not new.
///
/// A hotel claiming `opened_year >= DISCOVERY_YEAR` with more than
/// [`MAX_REVIEWS_NEW_HOTEL`] reviews is an established property misidentified
/// by the year-mention heuristic in `extract_hotels`. Clearing to `None`
/// preserves review data while removing the false "NEW" badge.
pub fn clear_misidentified_new_hotels(hotels: &mut [Hotel], analyses: &[ReviewAnalysis]) {
    use crate::constants::{DISCOVERY_YEAR, MAX_REVIEWS_NEW_HOTEL};

    for (hotel, analysis) in hotels.iter_mut().zip(analyses.iter()) {
        if let Some(year) = hotel.opened_year {
            if year >= DISCOVERY_YEAR && analysis.review_count > MAX_REVIEWS_NEW_HOTEL {
                info!(
                    "De-classifying '{}': opened_year={} but review_count={} > {} (MAX_REVIEWS_NEW_HOTEL)",
                    hotel.name, year, analysis.review_count, MAX_REVIEWS_NEW_HOTEL
                );
                hotel.opened_year = None;
            }
        }
    }
}

pub async fn analyze_all_hotels_with_reviews(
    engine: &EmbeddingEngine,
    hotels: &[Hotel],
) -> Result<Vec<ReviewAnalysis>> {
    analyze_all_hotels_with_reviews_from(engine, hotels, None).await
}

/// Like `analyze_all_hotels_with_reviews` but with explicit pre-scraped data path.
pub async fn analyze_all_hotels_with_reviews_from(
    engine: &EmbeddingEngine,
    hotels: &[Hotel],
    prescraped_path: Option<&str>,
) -> Result<Vec<ReviewAnalysis>> {
    // Check for pre-scraped review data (Playwright output)
    let default_paths = [
        "../../apps/travel/data/scraped_reviews.json",
        "data/scraped_reviews.json",
        "scraped_reviews.json",
    ];
    let prescraped_file = prescraped_path
        .map(String::from)
        .or_else(|| default_paths.iter().find(|p| std::path::Path::new(p).exists()).map(|p| p.to_string()));

    if let Some(ref path) = prescraped_file {
        info!("Found pre-scraped review data at {}", path);
    } else {
        info!("No pre-scraped review data found — will try HTTP scraping (may be blocked)");
    }

    // Phase 1: Scrape reviews in parallel (IO-bound)
    info!("Scraping reviews for {} hotels concurrently...", hotels.len());
    let prescraped_clone = prescraped_file.clone();
    let scraped_data: Vec<ScrapedReviewData> = stream::iter(hotels.iter().enumerate())
        .map(|(i, hotel)| {
            let prescraped = prescraped_clone.clone();
            let hotel = hotel.clone();
            async move {
                info!("  [{}/{}] Loading reviews for '{}'...", i + 1, hotels.len(), hotel.name);
                if let Some(ref path) = prescraped {
                    if let Some(data) = load_prescraped_reviews(&hotel.hotel_id, path) {
                        info!("    Pre-scraped: {} texts, rating {:.1}, {} reviews from [{}]",
                            data.review_texts.len(), data.review_rating, data.review_count,
                            data.sources.join(", "));
                        return data;
                    }
                    info!("    No pre-scraped data for '{}' — trying HTTP scrape", hotel.name);
                }
                scrape_hotel_reviews(&hotel).await
            }
        })
        .buffered(6)
        .collect()
        .await;

    // Phase 2: ML analysis (CPU-bound, sequential — shares EmbeddingEngine)
    // Build anchor embeddings once — reused for all 16 hotels.
    info!("Building anchor embeddings (sentiment + {} aspects)...", aspect_anchors().len());
    let anchors = AnchorVecs::new(engine).context("building anchor vecs")?;

    info!("Running Candle ML analysis on {} hotels...", hotels.len());
    let mut analyses = Vec::with_capacity(hotels.len());

    for (i, (hotel, scraped)) in hotels.iter().zip(scraped_data.iter()).enumerate() {
        let scraped_info = if scraped.review_texts.is_empty() && scraped.review_count == 0 {
            "no web reviews found".to_string()
        } else {
            format!(
                "{} texts, rating {:.1}, {} reviews from [{}]",
                scraped.review_texts.len(),
                scraped.review_rating,
                scraped.review_count,
                scraped.sources.join(", "),
            )
        };

        let analysis = analyze_hotel_with_anchors(engine, hotel, Some(scraped), &anchors)
            .with_context(|| format!("analyzing hotel '{}'", hotel.name))?;
        info!(
            "  [{}/{}] {} — sentiment: {:.2}, value: {:.0}, rating: {:.1}, reviews: {}, aspects: {} ({})",
            i + 1,
            hotels.len(),
            hotel.name,
            analysis.sentiment_score,
            analysis.value_score,
            analysis.review_rating,
            analysis.review_count,
            analysis.aspect_scores.len(),
            scraped_info,
        );
        analyses.push(analysis);
    }

    // Compute discovery scores with global context
    let max_price = hotels
        .iter()
        .map(|h| h.price_eur)
        .fold(0.0f32, f32::max);

    for (i, analysis) in analyses.iter_mut().enumerate() {
        analysis.discovery_score = compute_discovery_score(
            hotels[i].price_eur,
            analysis.sentiment_score,
            analysis.review_count,
            analysis.review_rating,
            max_price,
        );
    }

    Ok(analyses)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::DISCOVERY_YEAR;

    #[test]
    fn split_sentences_basic() {
        let sentences = split_sentences("Great hotel. Beautiful beach! Loved the food?");
        assert_eq!(sentences.len(), 3);
        assert_eq!(sentences[0], "Great hotel");
    }

    #[test]
    fn split_sentences_filters_short() {
        let sentences = split_sentences("OK. This is a longer sentence that should pass.");
        assert_eq!(sentences.len(), 1);
    }

    #[test]
    fn detect_aspects_food() {
        let aspects = detect_text_aspects("The restaurant serves excellent breakfast");
        assert!(aspects.contains(&"Food".to_string()));
    }

    #[test]
    fn detect_aspects_beach() {
        let aspects = detect_text_aspects("Direct beach access with crystal-clear sea");
        assert!(aspects.contains(&"Beach".to_string()));
    }

    #[test]
    fn detect_aspects_spa() {
        let aspects = detect_text_aspects("Full spa with hammam and yoga deck");
        assert!(aspects.contains(&"Spa".to_string()));
    }

    #[test]
    fn detect_aspects_multiple() {
        let aspects = detect_text_aspects("Beach resort with spa and kids club restaurant");
        assert!(aspects.contains(&"Beach".to_string()));
        assert!(aspects.contains(&"Spa".to_string()));
        assert!(aspects.contains(&"Family".to_string()));
        assert!(aspects.contains(&"Food".to_string()));
    }

    #[test]
    fn detect_aspects_empty() {
        let aspects = detect_text_aspects("A wonderful place to stay");
        assert!(aspects.is_empty());
    }

    #[test]
    fn value_score_cheap_hotel() {
        let score = compute_value_score(65.0, 0.5, 3, 4, 200, 8.5);
        assert!(score > 20.0, "cheap well-reviewed hotel should have good value: {score}");
    }

    #[test]
    fn value_score_expensive_hotel() {
        let score = compute_value_score(950.0, 0.5, 5, 7, 50, 8.0);
        assert!(score < 30.0, "expensive hotel should have lower value: {score}");
    }

    #[test]
    fn value_score_cheap_beats_expensive() {
        let cheap = compute_value_score(65.0, 0.5, 3, 4, 200, 8.5);
        let expensive = compute_value_score(950.0, 0.5, 5, 7, 50, 8.0);
        assert!(cheap > expensive, "cheap should beat expensive: {cheap} vs {expensive}");
    }

    #[test]
    fn value_score_more_reviews_helps() {
        let few = compute_value_score(100.0, 0.5, 4, 5, 10, 8.0);
        let many = compute_value_score(100.0, 0.5, 4, 5, 1000, 8.0);
        assert!(many > few, "more reviews should improve value: {many} vs {few}");
    }

    #[test]
    fn value_score_higher_rating_helps() {
        let low = compute_value_score(100.0, 0.5, 4, 5, 100, 6.0);
        let high = compute_value_score(100.0, 0.5, 4, 5, 100, 9.5);
        assert!(high > low, "higher rating should improve value: {high} vs {low}");
    }

    #[test]
    fn value_score_zero_price() {
        let score = compute_value_score(0.0, 0.5, 4, 5, 100, 8.0);
        assert_eq!(score, 50.0);
    }

    #[test]
    fn discovery_score_cheap_reviewed_best() {
        let best = compute_discovery_score(65.0, 0.85, 500, 9.2, 950.0);
        let worst = compute_discovery_score(950.0, 0.55, 10, 6.5, 950.0);
        assert!(best > worst, "cheap+reviewed+best should win: {best} vs {worst}");
    }

    #[test]
    fn discovery_score_balanced() {
        let score = compute_discovery_score(200.0, 0.70, 200, 8.5, 950.0);
        assert!(score > 30.0 && score < 80.0, "mid-range should be balanced: {score}");
    }

    #[test]
    fn extract_rating_from_text() {
        let (r, c) = extract_rating_count("Rated 8.7/10 based on 1,234 reviews").unwrap();
        assert!((r - 8.7).abs() < 0.01);
        assert_eq!(c, 1234);
    }

    #[test]
    fn extract_review_count_simple() {
        assert_eq!(extract_review_count("Based on 456 reviews"), Some(456));
    }

    #[test]
    fn extract_review_count_comma() {
        assert_eq!(extract_review_count("2,345 reviews"), Some(2345));
    }

    #[test]
    fn extract_review_count_none() {
        assert_eq!(extract_review_count("No rating available"), None);
    }

    #[test]
    fn urlencoded_basic() {
        assert_eq!(urlencoded("Hotel Crete"), "Hotel+Crete");
    }

    #[test]
    fn dot_product_identical() {
        let v = vec![0.6, 0.8];
        assert!((dot_product(&v, &v) - 1.0).abs() < 1e-5);
    }

    #[test]
    fn dot_product_orthogonal() {
        let a = vec![1.0, 0.0];
        let b = vec![0.0, 1.0];
        assert!(dot_product(&a, &b).abs() < 1e-5);
    }

    #[test]
    fn infer_missing_basic() {
        let hotel = crate::hotel::test_hotel("Basic Hotel", 3, "Athens");
        let aspect_scores = HashMap::new();
        let cons = infer_missing_aspects(&hotel, &aspect_scores);
        assert!(!cons.is_empty(), "should infer missing facilities");
    }

    #[test]
    fn aspect_anchors_cover_all() {
        let anchors = aspect_anchors();
        assert!(anchors.len() >= 6);
        let names: Vec<&str> = anchors.iter().map(|(n, _)| *n).collect();
        assert!(names.contains(&"Food"));
        assert!(names.contains(&"Beach"));
        assert!(names.contains(&"Service"));
        assert!(names.contains(&"Value"));
    }

    // ── Root-cause fix tests: no fake data ──────────────────────────

    #[test]
    fn no_fake_review_count_when_no_scraped_data() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let hotel = crate::hotel::test_hotel("Test Hotel", 4, "Chania");
        let scraped = ScrapedReviewData {
            review_texts: vec![],
            review_count: 0,
            review_rating: 0.0,
            sources: vec![],
        };
        let analysis = analyze_hotel(&engine, &hotel, Some(&scraped)).unwrap();
        assert_eq!(analysis.review_count, 0, "review_count must be 0 when no scraped reviews");
        assert_eq!(analysis.review_rating, 0.0, "review_rating must be 0.0 when no scraped data");
    }

    #[test]
    fn no_fake_review_count_without_scraped() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let hotel = crate::hotel::test_hotel("Test Hotel", 3, "Heraklion");
        let analysis = analyze_hotel(&engine, &hotel, None).unwrap();
        assert_eq!(analysis.review_count, 0, "review_count must be 0 when scraped=None");
        assert_eq!(analysis.review_rating, 0.0, "review_rating must be 0.0 when scraped=None");
    }

    #[test]
    fn real_scraped_data_preserved() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let hotel = crate::hotel::test_hotel("Test Hotel", 4, "Rethymno");
        let scraped = ScrapedReviewData {
            review_texts: vec!["Amazing breakfast and friendly staff".to_string()],
            review_count: 342,
            review_rating: 8.7,
            sources: vec!["booking".to_string()],
        };
        let analysis = analyze_hotel(&engine, &hotel, Some(&scraped)).unwrap();
        assert_eq!(analysis.review_count, 342);
        assert!((analysis.review_rating - 8.7).abs() < 0.01);
    }

    // ── Discovery score edge cases ──────────────────────────────────

    #[test]
    fn discovery_score_zero_reviews() {
        let score = compute_discovery_score(200.0, 0.65, 0, 0.0, 950.0);
        // volume_factor = ln(1)/10 = 0.0, so 30% weight is zero
        let expected_volume = (1.0f32.ln() / 10.0).clamp(0.0, 1.0);
        assert_eq!(expected_volume, 0.0);
        assert!(score > 0.0, "discovery score should still be positive from price+quality: {score}");
        assert!(score < 60.0, "with zero reviews score should be limited: {score}");
    }

    #[test]
    fn discovery_score_max_reviews_high_rating() {
        let score = compute_discovery_score(65.0, 0.9, 5000, 9.5, 950.0);
        assert!(score > 70.0, "cheap+massively reviewed+great should score high: {score}");
    }

    #[test]
    fn discovery_score_zero_price_range() {
        let score = compute_discovery_score(100.0, 0.5, 100, 8.0, 0.0);
        // max_price=0 → price_factor=0.5
        assert!(score > 0.0 && score < 100.0, "should handle max_price=0 gracefully: {score}");
    }

    // ── Value score edge cases ──────────────────────────────────────

    #[test]
    fn value_score_zero_reviews_zero_rating() {
        let score = compute_value_score(200.0, 0.5, 4, 5, 0, 0.0);
        // review_boost = ln(1).max(0.5) = 0.5, rating_factor = 0.7 (fallback)
        assert!(score > 0.0, "value score should still be positive: {score}");
    }

    #[test]
    fn value_score_respects_real_rating() {
        let low_rating = compute_value_score(200.0, 0.5, 4, 5, 100, 5.0);
        let high_rating = compute_value_score(200.0, 0.5, 4, 5, 100, 9.5);
        assert!(high_rating > low_rating, "higher rating should increase value: {high_rating} vs {low_rating}");
    }

    // ── HTML parser tests ───────────────────────────────────────────

    #[test]
    fn parse_google_results_extracts_rating() {
        let html = r#"<html><body>
            <div class="BNeawe">Wonderful beachfront location with crystal clear water and friendly staff</div>
            <span>Rated 8.7/10 based on 1,234 reviews</span>
        </body></html>"#;
        let (texts, rating, count) = parse_google_results(html);
        assert!(!texts.is_empty(), "should extract text snippets");
        assert!((rating - 8.7).abs() < 0.01, "should extract rating: {rating}");
        assert_eq!(count, 1234, "should extract review count: {count}");
    }

    #[test]
    fn parse_google_results_knowledge_panel_stars() {
        let html = r#"<html><body>
            <span aria-label="Rated 4.3 out of 5">(567)</span>
            <div class="VwiC3b">Beautiful beachfront resort with stunning views and great service</div>
        </body></html>"#;
        let (texts, rating, count) = parse_google_results(html);
        assert!((rating - 8.6).abs() < 0.01, "4.3/5 → 8.6/10: {rating}");
        assert_eq!(count, 567, "should extract count from parentheses: {count}");
        assert!(!texts.is_empty());
    }

    #[test]
    fn parse_google_results_empty() {
        let html = "<html><body><p>No results</p></body></html>";
        let (texts, rating, count) = parse_google_results(html);
        assert!(texts.is_empty());
        assert_eq!(rating, 0.0);
        assert_eq!(count, 0);
    }

    // ── Google Maps parser tests ────────────────────────────────────

    #[test]
    fn parse_google_maps_aria_label() {
        let html = r#"<html><body>
            <span aria-label="4.5 stars 2,345 reviews">4.5</span>
            <div class="wiI7pd">Excellent hotel right on the beach with amazing sunset views over the sea</div>
        </body></html>"#;
        let (texts, rating, count) = parse_google_maps_results(html);
        assert!((rating - 9.0).abs() < 0.01, "4.5/5 → 9.0/10: {rating}");
        assert_eq!(count, 2345, "should extract from aria-label: {count}");
        assert!(!texts.is_empty());
    }

    #[test]
    fn parse_google_maps_embedded_json() {
        let html = r#"<html><body>
            <script>var data = {"rating": 4.2, "userRatingCount": 891};</script>
        </body></html>"#;
        let (_, rating, count) = parse_google_maps_results(html);
        assert!((rating - 8.4).abs() < 0.01, "4.2/5 → 8.4/10: {rating}");
        assert_eq!(count, 891);
    }

    #[test]
    fn parse_google_maps_empty() {
        let html = "<html><body>No results</body></html>";
        let (texts, rating, count) = parse_google_maps_results(html);
        assert!(texts.is_empty());
        assert_eq!(rating, 0.0);
        assert_eq!(count, 0);
    }

    // ── JSON-LD extraction tests ────────────────────────────────────

    #[test]
    fn extract_jsonld_hotel_rating() {
        let html = r#"<html><head>
            <script type="application/ld+json">
            {"@type": "Hotel", "name": "Beach Resort", "aggregateRating": {"ratingValue": "8.7", "reviewCount": "1234", "bestRating": "10"}}
            </script>
        </head><body></body></html>"#;
        let (rating, count) = extract_jsonld_rating(html);
        assert!((rating - 8.7).abs() < 0.01, "should extract ratingValue: {rating}");
        assert_eq!(count, 1234);
    }

    #[test]
    fn extract_jsonld_five_star_scale() {
        let html = r#"<html><head>
            <script type="application/ld+json">
            {"@type": "Hotel", "aggregateRating": {"ratingValue": "4.3", "reviewCount": "567", "bestRating": "5"}}
            </script>
        </head><body></body></html>"#;
        let (rating, count) = extract_jsonld_rating(html);
        assert!((rating - 8.6).abs() < 0.01, "4.3/5 should become 8.6/10: {rating}");
        assert_eq!(count, 567);
    }

    #[test]
    fn extract_jsonld_no_structured_data() {
        let html = "<html><body><p>No JSON-LD here</p></body></html>";
        let (rating, count) = extract_jsonld_rating(html);
        assert_eq!(rating, 0.0);
        assert_eq!(count, 0);
    }

    #[test]
    fn parse_booking_results_extracts_score() {
        let html = r#"<html><body>
            <div class="bui-review-score__badge">8.9</div>
            <div class="bui-review-score__text">Based on 567 reviews</div>
            <div class="c-review__body">Great breakfast buffet and helpful reception desk</div>
        </body></html>"#;
        let (texts, rating, count) = parse_booking_results(html);
        assert!((rating - 8.9).abs() < 0.01, "should extract Booking rating: {rating}");
        assert_eq!(count, 567, "should extract Booking review count: {count}");
        assert!(!texts.is_empty(), "should extract review text");
    }

    #[test]
    fn parse_booking_results_fallback_to_text() {
        let html = r#"<html><body>
            <span>Scored 9.1/10 from 2,345 reviews</span>
        </body></html>"#;
        let (_, rating, count) = parse_booking_results(html);
        assert!((rating - 9.1).abs() < 0.01, "should fallback to text extraction: {rating}");
        assert_eq!(count, 2345, "should fallback count extraction: {count}");
    }

    #[test]
    fn parse_tripadvisor_results_bubble_rating() {
        let html = r#"<html><body>
            <span class="ui_bubble_rating bubble_40"></span>
            <div class="partial_entry">Beautiful hotel right on the beach with amazing sunset views</div>
            <span>Based on 890 reviews</span>
        </body></html>"#;
        let (texts, rating, count) = parse_tripadvisor_results(html);
        assert!((rating - 8.0).abs() < 0.01, "bubble_40 → 4*2=8.0: {rating}");
        assert_eq!(count, 890, "should extract TA review count: {count}");
        assert!(!texts.is_empty(), "should extract review text");
    }

    #[test]
    fn parse_tripadvisor_results_empty() {
        let html = "<html><body>No results found</body></html>";
        let (texts, rating, count) = parse_tripadvisor_results(html);
        assert!(texts.is_empty());
        assert_eq!(rating, 0.0);
        assert_eq!(count, 0);
    }

    // ── Candle embedding ML tests ───────────────────────────────────

    #[test]
    fn sentiment_positive_text() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let scores = analyze_sentiment(&engine, &[
            "This hotel is absolutely wonderful, amazing service and beautiful rooms",
        ]).unwrap();
        assert!(scores[0] > 0.0, "positive text should have positive sentiment: {}", scores[0]);
    }

    #[test]
    fn sentiment_negative_text() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let scores = analyze_sentiment(&engine, &[
            "Terrible dirty rooms, awful food, rude staff and broken facilities",
        ]).unwrap();
        assert!(scores[0] < 0.0, "negative text should have negative sentiment: {}", scores[0]);
    }

    #[test]
    fn sentiment_ordering() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let scores = analyze_sentiment(&engine, &[
            "Absolutely perfect luxury resort with stunning views",
            "Average hotel, nothing special",
            "Terrible dirty noisy nightmare",
        ]).unwrap();
        assert!(scores[0] > scores[1], "positive > neutral: {} vs {}", scores[0], scores[1]);
        assert!(scores[1] > scores[2], "neutral > negative: {} vs {}", scores[1], scores[2]);
    }

    #[test]
    fn sentiment_empty_input() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let scores = analyze_sentiment(&engine, &[]).unwrap();
        assert!(scores.is_empty());
    }

    #[test]
    fn aspect_extraction_detects_food() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let texts = &["The restaurant has an excellent breakfast buffet with fresh pastries"];
        let sentiments = analyze_sentiment(&engine, texts).unwrap();
        let aspects = extract_aspects(&engine, texts, &sentiments).unwrap();
        assert!(aspects.contains_key("Food"), "should detect Food aspect: {:?}", aspects.keys().collect::<Vec<_>>());
    }

    #[test]
    fn aspect_extraction_detects_beach() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let texts = &["Crystal clear water and beautiful sandy beach with swimming area"];
        let sentiments = analyze_sentiment(&engine, texts).unwrap();
        let aspects = extract_aspects(&engine, texts, &sentiments).unwrap();
        assert!(aspects.contains_key("Beach"), "should detect Beach aspect: {:?}", aspects.keys().collect::<Vec<_>>());
    }

    #[test]
    fn representative_selection_returns_indices() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let texts = &[
            "Beautiful resort on the beach",
            "Great food and excellent service",
            "Wonderful spa with massage",
            "Clean rooms and friendly staff",
            "Perfect location near the sea",
        ];
        let indices = select_representative(&engine, texts, 2).unwrap();
        assert_eq!(indices.len(), 2, "should select exactly 2 representatives");
        assert!(indices[0] < 5 && indices[1] < 5, "indices should be within range");
        assert_ne!(indices[0], indices[1], "should select different indices");
    }

    #[test]
    fn pros_cons_extraction() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let sentences = &[
            "Absolutely stunning beach with crystal clear water",
            "Wonderful friendly staff always helpful",
            "Rooms were dirty and poorly maintained",
            "Noisy construction nearby all day",
        ];
        let (pros, cons) = extract_pros_cons(&engine, sentences).unwrap();
        assert!(!pros.is_empty(), "should extract at least one pro");
        assert!(!cons.is_empty(), "should extract at least one con");
    }

    // ── Full analyze_hotel integration ──────────────────────────────

    #[test]
    fn analyze_hotel_produces_valid_output() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let mut hotel = crate::hotel::test_hotel("Crete Beach Resort", 4, "Chania");
        hotel.price_eur = 150.0;
        hotel.description = "Beautiful beachfront resort with stunning sea views. \
            Offers excellent breakfast buffet and friendly staff. \
            Spa and wellness center available. Family-friendly with kids pool.".to_string();
        hotel.amenities = vec!["pool".into(), "spa".into(), "restaurant".into()];
        hotel.opened_year = Some(DISCOVERY_YEAR);

        let analysis = analyze_hotel(&engine, &hotel, None).unwrap();

        assert!(analysis.sentiment_score > 0.0 && analysis.sentiment_score <= 1.0,
            "sentiment should be in (0,1]: {}", analysis.sentiment_score);
        assert!(analysis.value_score >= 0.0 && analysis.value_score <= 100.0,
            "value should be in [0,100]: {}", analysis.value_score);
        assert!(!analysis.aspect_scores.is_empty(),
            "should detect at least one aspect");
        assert!(!analysis.reviews.is_empty(),
            "should produce reviews from description");
        assert!(!analysis.review_summary.is_empty(),
            "should produce a summary");
        assert_eq!(analysis.review_count, 0, "no scraped data → count=0");
        assert_eq!(analysis.review_rating, 0.0, "no scraped data → rating=0.0");
    }

    #[test]
    fn analyze_hotel_with_scraped_reviews() {
        let engine = crate::embeddings::EmbeddingEngine::new(candle_core::Device::Cpu).unwrap();
        let mut hotel = crate::hotel::test_hotel("Luxury Spa Hotel", 5, "Rethymno");
        hotel.price_eur = 400.0;
        hotel.description = "Exclusive luxury resort with private beach and world-class spa.".to_string();
        hotel.amenities = vec!["spa".into(), "private beach".into(), "butler".into()];

        let scraped = ScrapedReviewData {
            review_texts: vec![
                "Absolutely incredible experience from start to finish".to_string(),
                "The spa treatments were world class and very relaxing".to_string(),
                "Overpriced for what you get, rooms need updating".to_string(),
            ],
            review_count: 789,
            review_rating: 9.1,
            sources: vec!["booking".to_string(), "tripadvisor".to_string()],
        };
        let analysis = analyze_hotel(&engine, &hotel, Some(&scraped)).unwrap();

        assert_eq!(analysis.review_count, 789, "should use scraped count");
        assert!((analysis.review_rating - 9.1).abs() < 0.01, "should use scraped rating");
        assert!(analysis.sentiment_score > 0.0, "mostly positive reviews → positive sentiment");
        assert!(!analysis.pros.is_empty(), "should extract pros from mixed reviews");
    }

    // ── Pre-scraped data loading ───────────────────────────────────

    #[test]
    fn load_prescraped_reviews_from_json() {
        let dir = std::env::temp_dir();
        let path = dir.join("test_prescraped.json");
        let json = r#"{
            "test-hotel": {
                "review_rating": 8.7,
                "review_count": 1234,
                "review_texts": ["Great beach", "Friendly staff"],
                "sources": ["google_maps", "booking"]
            },
            "empty-hotel": {
                "review_rating": 0.0,
                "review_count": 0,
                "review_texts": [],
                "sources": []
            }
        }"#;
        std::fs::write(&path, json).unwrap();

        let data = load_prescraped_reviews("test-hotel", path.to_str().unwrap()).unwrap();
        assert!((data.review_rating - 8.7).abs() < 0.01);
        assert_eq!(data.review_count, 1234);
        assert_eq!(data.review_texts.len(), 2);
        assert_eq!(data.sources, vec!["google_maps", "booking"]);

        // Empty hotel should return None (all zeros)
        let empty = load_prescraped_reviews("empty-hotel", path.to_str().unwrap());
        assert!(empty.is_none(), "all-zero entry should return None");

        // Missing hotel should return None
        let missing = load_prescraped_reviews("nonexistent", path.to_str().unwrap());
        assert!(missing.is_none());

        std::fs::remove_file(path).ok();
    }

    #[test]
    fn load_prescraped_missing_file() {
        let result = load_prescraped_reviews("test", "/tmp/nonexistent_reviews.json");
        assert!(result.is_none());
    }

    #[test]
    fn load_prescraped_gallery_from_json() {
        let dir = std::env::temp_dir();
        let path = dir.join("test_gallery.json");
        let json = r#"{
            "test-hotel": {
                "review_rating": 8.7,
                "review_count": 1234,
                "review_texts": [],
                "gallery": [
                    "https://lh5.googleusercontent.com/p/abc=w800-h600",
                    "https://cf.bstatic.com/images/hotel/max1024x768/123.jpg"
                ],
                "sources": ["google_maps", "booking"]
            },
            "no-gallery-hotel": {
                "review_rating": 7.0,
                "review_count": 100,
                "review_texts": [],
                "gallery": [],
                "sources": ["booking"]
            }
        }"#;
        std::fs::write(&path, json).unwrap();

        let gallery = load_prescraped_gallery("test-hotel", path.to_str().unwrap()).unwrap();
        assert_eq!(gallery.len(), 2);
        assert!(gallery[0].contains("googleusercontent.com"));
        assert!(gallery[1].contains("bstatic.com"));

        // Empty gallery should return None
        let empty = load_prescraped_gallery("no-gallery-hotel", path.to_str().unwrap());
        assert!(empty.is_none());

        // Missing hotel should return None
        let missing = load_prescraped_gallery("nonexistent", path.to_str().unwrap());
        assert!(missing.is_none());

        // Missing file should return None
        let no_file = load_prescraped_gallery("test", "/tmp/nonexistent_gallery.json");
        assert!(no_file.is_none());

        std::fs::remove_file(path).ok();
    }

    // ── URL encoding ────────────────────────────────────────────────

    #[test]
    fn urlencoded_special_chars() {
        assert_eq!(urlencoded("Hotel & Spa"), "Hotel+%26+Spa");
        assert_eq!(urlencoded("Grand Hotel's"), "Grand+Hotel%27s");
    }

    // ── Extract rating variations ───────────────────────────────────

    #[test]
    fn extract_rating_out_of_10() {
        let (r, c) = extract_rating_count("Scored 9.2 out of 10 from 567 reviews").unwrap();
        assert!((r - 9.2).abs() < 0.01);
        assert_eq!(c, 567);
    }

    #[test]
    fn extract_rating_slash_format() {
        let (r, _) = extract_rating_count("Rating: 7.5/10").unwrap();
        assert!((r - 7.5).abs() < 0.01);
    }

    #[test]
    fn extract_rating_count_none() {
        assert!(extract_rating_count("No ratings available here").is_none());
    }

    #[test]
    fn extract_review_count_thousands() {
        assert_eq!(extract_review_count("12,345 reviews from guests"), Some(12345));
    }

    // ── clear_misidentified_new_hotels ──────────────────────────────

    fn stub_analysis(review_count: u32) -> ReviewAnalysis {
        ReviewAnalysis {
            reviews: vec![],
            sentiment_score: 0.7,
            aspect_scores: HashMap::new(),
            review_summary: String::new(),
            pros: vec![],
            cons: vec![],
            review_count,
            review_rating: 8.5,
            value_score: 50.0,
            discovery_score: 50.0,
        }
    }

    #[test]
    fn clear_misidentified_clears_high_review_count() {
        use crate::constants::{DISCOVERY_YEAR, MAX_REVIEWS_NEW_HOTEL};

        let mut hotel = crate::hotel::test_hotel("Fake New Hotel", 4, "Athens");
        hotel.opened_year = Some(DISCOVERY_YEAR);

        let mut hotels = vec![hotel];
        let analyses = vec![stub_analysis(MAX_REVIEWS_NEW_HOTEL + 1)];
        clear_misidentified_new_hotels(&mut hotels, &analyses);

        assert_eq!(hotels[0].opened_year, None);
    }

    #[test]
    fn clear_misidentified_keeps_low_review_count() {
        use crate::constants::{DISCOVERY_YEAR, MAX_REVIEWS_NEW_HOTEL};

        let mut hotel = crate::hotel::test_hotel("Real New Hotel", 4, "Crete");
        hotel.opened_year = Some(DISCOVERY_YEAR);

        let mut hotels = vec![hotel];
        let analyses = vec![stub_analysis(MAX_REVIEWS_NEW_HOTEL - 1)];
        clear_misidentified_new_hotels(&mut hotels, &analyses);

        assert_eq!(hotels[0].opened_year, Some(DISCOVERY_YEAR));
    }

    #[test]
    fn clear_misidentified_ignores_pre_discovery_year() {
        let mut hotel = crate::hotel::test_hotel("Old Hotel", 5, "Santorini");
        hotel.opened_year = Some(2019);

        let mut hotels = vec![hotel];
        let analyses = vec![stub_analysis(5000)];
        clear_misidentified_new_hotels(&mut hotels, &analyses);

        assert_eq!(hotels[0].opened_year, Some(2019));
    }

    #[test]
    fn clear_misidentified_boundary_at_threshold() {
        use crate::constants::{DISCOVERY_YEAR, MAX_REVIEWS_NEW_HOTEL};

        let mut hotel = crate::hotel::test_hotel("Boundary Hotel", 3, "Rhodes");
        hotel.opened_year = Some(DISCOVERY_YEAR);

        let mut hotels = vec![hotel];
        let analyses = vec![stub_analysis(MAX_REVIEWS_NEW_HOTEL)]; // exactly at threshold
        clear_misidentified_new_hotels(&mut hotels, &analyses);

        assert_eq!(hotels[0].opened_year, Some(DISCOVERY_YEAR));
    }
}
