//! jeka.ro hotel page scraper.

use anyhow::{Context, Result};
use scraper::{Html, Selector};
use tracing::{info, warn};

use crate::hotel::Hotel;

/// Known hotel coordinates (not available on jeka.ro pages).
fn known_coords(url: &str) -> Option<(f64, f64)> {
    if url.contains("kiani-beach-resort") {
        Some((35.466257, 24.155082))
    } else if url.contains("neptuno-beach") {
        Some((35.336906, 25.087903))
    } else if url.contains("glaros-beach") {
        Some((35.512772, 23.976490))
    } else if url.contains("alexander-house") {
        Some((35.4095, 24.9895))
    } else {
        None
    }
}

/// Derive a hotel_id slug from the URL.
fn slug_from_url(url: &str) -> String {
    url.rsplit('/')
        .next()
        .unwrap_or("unknown")
        .trim_end_matches(".aspx")
        .split('_')
        .next()
        .unwrap_or("unknown")
        .to_string()
}

/// Scrape a single jeka.ro hotel page into a `Hotel`.
pub async fn scrape_hotel(url: &str) -> Result<Hotel> {
    info!("Scraping {url}");

    let body = reqwest::get(url)
        .await
        .context("fetching hotel page")?
        .text()
        .await
        .context("reading response body")?;

    let doc = Html::parse_document(&body);

    // Hotel name — try <h1> first, then og:title meta
    let name = extract_h1(&doc)
        .or_else(|| extract_meta(&doc, "og:title"))
        .unwrap_or_else(|| slug_from_url(url).replace('-', " "));

    // Description — try meta description
    let description = extract_meta(&doc, "description")
        .or_else(|| extract_meta(&doc, "og:description"))
        .unwrap_or_default();

    // Star rating — look for common patterns
    let star_rating = extract_star_rating(&doc, &body);

    // Price — look for price patterns in the page
    let price_eur = extract_price(&body);

    // Coordinates from known list
    let (lat, lng) = known_coords(url).unwrap_or((0.0, 0.0));

    // Region detection from URL or content
    let region = if body.to_lowercase().contains("creta")
        || body.to_lowercase().contains("crete")
    {
        "Crete".to_string()
    } else {
        "Greece".to_string()
    };

    // Location — try to extract from page, fall back to region
    let location = extract_location(&doc).unwrap_or_else(|| format!("{region}, Greece"));

    // Board type
    let board_type = if body.to_lowercase().contains("all inclusive") {
        "All-Inclusive".to_string()
    } else {
        "Standard".to_string()
    };

    let hotel = Hotel {
        hotel_id: slug_from_url(url),
        name,
        description,
        star_rating,
        board_type,
        price_eur,
        location,
        region,
        lat,
        lng,
        source_url: url.to_string(),
        amenities: Vec::new(), // jeka.ro amenities are JS-rendered, hard to scrape
        image_url: extract_meta(&doc, "og:image"),
        gallery: vec![],
        opened_year: None,
    };

    info!("Scraped: {} ({}*)", hotel.name, hotel.star_rating);
    Ok(hotel)
}

/// Try scraping, fall back to seed data for known URLs.
pub async fn scrape_or_seed(url: &str) -> Result<Hotel> {
    match scrape_hotel(url).await {
        Ok(h) if !h.name.is_empty() && h.star_rating > 0 => Ok(h),
        Ok(h) => {
            warn!("Scrape incomplete for {}, merging with seed data", url);
            merge_with_seed(h, url)
        }
        Err(e) => {
            warn!("Scrape failed for {}: {e:#}, using seed data", url);
            seed_for_url(url)
        }
    }
}

fn merge_with_seed(mut scraped: Hotel, url: &str) -> Result<Hotel> {
    let seeds = crate::hotel::seed_hotels();
    if let Some(seed) = seeds.iter().find(|s| s.source_url == url) {
        if scraped.name.is_empty() {
            scraped.name = seed.name.clone();
        }
        if scraped.description.is_empty() {
            scraped.description = seed.description.clone();
        }
        if scraped.star_rating == 0 {
            scraped.star_rating = seed.star_rating;
        }
        if scraped.price_eur == 0.0 {
            scraped.price_eur = seed.price_eur;
        }
        if scraped.amenities.is_empty() {
            scraped.amenities = seed.amenities.clone();
        }
        if scraped.lat == 0.0 {
            scraped.lat = seed.lat;
            scraped.lng = seed.lng;
        }
    }
    Ok(scraped)
}

fn seed_for_url(url: &str) -> Result<Hotel> {
    let seeds = crate::hotel::seed_hotels();
    seeds
        .into_iter()
        .find(|s| s.source_url == url)
        .context("no seed data for this URL")
}

// ── HTML extraction helpers ──────────────────────────────────────────

fn extract_h1(doc: &Html) -> Option<String> {
    let sel = Selector::parse("h1").ok()?;
    doc.select(&sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|s| !s.is_empty())
}

fn extract_meta(doc: &Html, name: &str) -> Option<String> {
    // Try property= first (Open Graph), then name=
    for attr in ["property", "name"] {
        let selector_str = format!("meta[{attr}=\"{name}\"]");
        let sel = match Selector::parse(&selector_str) {
            Ok(s) => s,
            Err(_) => continue,
        };
        if let Some(el) = doc.select(&sel).next() {
            if let Some(content) = el.value().attr("content") {
                let trimmed = content.trim().to_string();
                if !trimmed.is_empty() {
                    return Some(trimmed);
                }
            }
        }
    }
    None
}

fn extract_location(doc: &Html) -> Option<String> {
    // Look for address-like elements
    for selector_str in [".hotel-address", ".address", "[itemprop=\"address\"]"] {
        if let Ok(sel) = Selector::parse(selector_str) {
            if let Some(el) = doc.select(&sel).next() {
                let text = el.text().collect::<String>().trim().to_string();
                if !text.is_empty() {
                    return Some(text);
                }
            }
        }
    }
    None
}

fn extract_star_rating(doc: &Html, body: &str) -> u8 {
    // Try structured data
    if let Ok(sel) = Selector::parse("[itemprop=\"starRating\"]") {
        if let Some(el) = doc.select(&sel).next() {
            let text = el.text().collect::<String>();
            if let Some(n) = text.chars().find(|c| c.is_ascii_digit()) {
                return n.to_digit(10).unwrap_or(0) as u8;
            }
        }
    }
    // Regex-like scan for "N stele" (Romanian) or "N star"
    for pattern in ["5 stele", "5-star", "5 star"] {
        if body.to_lowercase().contains(pattern) {
            return 5;
        }
    }
    for pattern in ["4 stele", "4-star", "4 star"] {
        if body.to_lowercase().contains(pattern) {
            return 4;
        }
    }
    for pattern in ["3 stele", "3-star", "3 star"] {
        if body.to_lowercase().contains(pattern) {
            return 3;
        }
    }
    0
}

fn extract_price(body: &str) -> f32 {
    // Look for price patterns like "224 €" or "€224" or "198 EUR"
    let lower = body.to_lowercase();
    for window in lower.as_bytes().windows(20) {
        let s = String::from_utf8_lossy(window);
        // Simple numeric extraction near currency symbols
        if s.contains('€') || s.contains("eur") {
            let digits: String = s.chars().filter(|c| c.is_ascii_digit() || *c == '.').collect();
            if let Ok(price) = digits.parse::<f32>() {
                if price > 10.0 && price < 10000.0 {
                    return price;
                }
            }
        }
    }
    0.0
}
