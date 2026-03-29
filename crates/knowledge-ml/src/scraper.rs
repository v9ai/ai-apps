//! Udemy course page scraper.
//!
//! Extracts structured data from Udemy course pages using JSON-LD (schema.org)
//! and HTML meta tags / content as fallback.

use anyhow::{Context, Result};
use scraper::{Html, Selector};
use serde::Deserialize;
use tracing::{info, warn};

use crate::course::Course;

/// JSON-LD schema.org Course object embedded in Udemy pages.
#[derive(Debug, Deserialize)]
struct JsonLdCourse {
    name: Option<String>,
    description: Option<String>,
    image: Option<String>,
    #[serde(rename = "inLanguage")]
    in_language: Option<String>,
    #[serde(rename = "aggregateRating")]
    aggregate_rating: Option<JsonLdRating>,
    provider: Option<JsonLdProvider>,
}

#[derive(Debug, Deserialize)]
struct JsonLdRating {
    #[serde(rename = "ratingValue")]
    rating_value: Option<f64>,
    #[serde(rename = "ratingCount")]
    rating_count: Option<u64>,
    #[serde(rename = "reviewCount")]
    review_count: Option<u64>,
}

#[derive(Debug, Deserialize)]
struct JsonLdProvider {
    name: Option<String>,
}

/// Scrape a single Udemy course page into a `Course`.
pub async fn scrape_course(url: &str) -> Result<Course> {
    info!("Scraping {url}");

    let client = reqwest::Client::new();
    let body = client
        .get(url)
        .header(
            "User-Agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 \
             (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        .header("Accept-Language", "en-US,en;q=0.9")
        .send()
        .await
        .context("fetching Udemy course page")?
        .text()
        .await
        .context("reading response body")?;

    let doc = Html::parse_document(&body);

    // ── JSON-LD extraction (primary source) ─────────────────────────────
    let jsonld = extract_jsonld_course(&doc);

    // ── Title ───────────────────────────────────────────────────────────
    let title = jsonld
        .as_ref()
        .and_then(|j| j.name.clone())
        .or_else(|| extract_meta(&doc, "og:title"))
        .or_else(|| extract_h1(&doc))
        .unwrap_or_else(|| slug_from_url(url).replace('-', " "));

    // ── Description ─────────────────────────────────────────────────────
    let description = jsonld
        .as_ref()
        .and_then(|j| j.description.clone())
        .or_else(|| extract_meta(&doc, "og:description"))
        .or_else(|| extract_meta(&doc, "description"))
        .unwrap_or_default();

    // ── Rating & reviews ────────────────────────────────────────────────
    let (rating, review_count) = jsonld
        .as_ref()
        .and_then(|j| j.aggregate_rating.as_ref())
        .map(|r| {
            (
                r.rating_value.unwrap_or(0.0) as f32,
                r.review_count
                    .or(r.rating_count)
                    .unwrap_or(0) as u32,
            )
        })
        .unwrap_or((0.0, 0));

    // ── Image ───────────────────────────────────────────────────────────
    let image_url = jsonld
        .as_ref()
        .and_then(|j| j.image.clone())
        .or_else(|| extract_meta(&doc, "og:image"))
        .unwrap_or_default();

    // ── Language ─────────────────────────────────────────────────────────
    let language = jsonld
        .as_ref()
        .and_then(|j| j.in_language.clone())
        .unwrap_or_else(|| "English".to_string());

    // ── Instructor ──────────────────────────────────────────────────────
    let instructor = extract_instructor(&doc, &body);

    // ── Level ───────────────────────────────────────────────────────────
    let level = extract_level(&body);

    // ── Duration ────────────────────────────────────────────────────────
    let duration_hours = extract_duration(&body);

    // ── Price ───────────────────────────────────────────────────────────
    let price = extract_price(&doc, &body);

    // ── Number of students ──────────────────────────────────────────────
    let num_students = extract_num_students(&body);

    // ── Category ────────────────────────────────────────────────────────
    let category = extract_category(&doc)
        .or_else(|| {
            jsonld
                .as_ref()
                .and_then(|j| j.provider.as_ref())
                .and_then(|p| p.name.clone())
        })
        .unwrap_or_default();

    // ── Topics ("What you'll learn") ────────────────────────────────────
    let topics = extract_topics(&doc);
    let topics_json = serde_json::to_string(&topics).unwrap_or_else(|_| "[]".to_string());

    let course = Course {
        course_id: slug_from_url(url),
        title,
        url: url.to_string(),
        description,
        instructor,
        level,
        rating,
        review_count,
        num_students,
        duration_hours,
        price,
        language,
        category,
        image_url,
        topics_json,
    };

    info!(
        "Scraped: {} — {:.1}★ ({} reviews)",
        course.title, course.rating, course.review_count
    );
    Ok(course)
}

// ── Helpers ─────────────────────────────────────────────────────────────

/// Derive a slug from a Udemy course URL.
/// e.g. "https://www.udemy.com/course/docker-and-kubernetes/" → "docker-and-kubernetes"
fn slug_from_url(url: &str) -> String {
    url.trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or("unknown")
        .to_string()
}

/// Extract the first JSON-LD block that looks like a Course.
fn extract_jsonld_course(doc: &Html) -> Option<JsonLdCourse> {
    let sel = Selector::parse("script[type=\"application/ld+json\"]").ok()?;
    for el in doc.select(&sel) {
        let text = el.text().collect::<String>();
        // Try parsing as a single Course object
        if let Ok(course) = serde_json::from_str::<JsonLdCourse>(&text) {
            if course.name.is_some() {
                return Some(course);
            }
        }
        // Try parsing as a JSON array and find a Course-like object
        if let Ok(arr) = serde_json::from_str::<Vec<serde_json::Value>>(&text) {
            for item in arr {
                if let Some(t) = item.get("@type").and_then(|v| v.as_str()) {
                    if t == "Course" {
                        if let Ok(course) = serde_json::from_value::<JsonLdCourse>(item) {
                            return Some(course);
                        }
                    }
                }
            }
        }
    }
    None
}

fn extract_meta(doc: &Html, name: &str) -> Option<String> {
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

fn extract_h1(doc: &Html) -> Option<String> {
    let sel = Selector::parse("h1").ok()?;
    doc.select(&sel)
        .next()
        .map(|el| el.text().collect::<String>().trim().to_string())
        .filter(|s| !s.is_empty())
}

fn extract_instructor(doc: &Html, body: &str) -> String {
    // Try schema.org Person in JSON-LD
    if let Ok(sel) = Selector::parse("script[type=\"application/ld+json\"]") {
        for el in doc.select(&sel) {
            let text = el.text().collect::<String>();
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&text) {
                // Check for instructor array or single object
                if let Some(instructors) = v.get("instructor") {
                    if let Some(arr) = instructors.as_array() {
                        let names: Vec<String> = arr
                            .iter()
                            .filter_map(|i| i.get("name").and_then(|n| n.as_str()))
                            .map(|s| s.to_string())
                            .collect();
                        if !names.is_empty() {
                            return names.join(", ");
                        }
                    }
                    if let Some(name) = instructors.get("name").and_then(|n| n.as_str()) {
                        return name.to_string();
                    }
                }
            }
        }
    }

    // Fallback: look for instructor link/span patterns
    for selector_str in [
        "a[data-purpose=\"instructor-url\"]",
        ".instructor-links a",
        "[class*=\"instructor\"] a",
    ] {
        if let Ok(sel) = Selector::parse(selector_str) {
            if let Some(el) = doc.select(&sel).next() {
                let text = el.text().collect::<String>().trim().to_string();
                if !text.is_empty() {
                    return text;
                }
            }
        }
    }

    // Last resort: regex-like scan for "Created by ..."
    if let Some(idx) = body.find("Created by") {
        let after = &body[idx + 10..];
        let end = after.find('<').unwrap_or(80).min(80);
        let name = after[..end].trim().to_string();
        if !name.is_empty() {
            return name;
        }
    }

    String::new()
}

fn extract_level(body: &str) -> String {
    let lower = body.to_lowercase();
    if lower.contains("all levels") {
        "All Levels".to_string()
    } else if lower.contains("beginner") && lower.contains("level") {
        "Beginner".to_string()
    } else if lower.contains("intermediate") && lower.contains("level") {
        "Intermediate".to_string()
    } else if lower.contains("advanced") && lower.contains("level") {
        "Advanced".to_string()
    } else if lower.contains("beginner") {
        "Beginner".to_string()
    } else if lower.contains("intermediate") {
        "Intermediate".to_string()
    } else if lower.contains("advanced") {
        "Advanced".to_string()
    } else {
        "All Levels".to_string()
    }
}

fn extract_duration(body: &str) -> f32 {
    // Look for patterns like "22 total hours" or "15.5 hours"
    let lower = body.to_lowercase();
    for pattern in ["total hours", "hours of video", "hours on-demand"] {
        if let Some(idx) = lower.find(pattern) {
            // Walk backwards to find the number
            let before = &lower[..idx];
            let num_str: String = before
                .chars()
                .rev()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect::<String>()
                .chars()
                .rev()
                .collect();
            if let Ok(hours) = num_str.parse::<f32>() {
                if hours > 0.0 && hours < 500.0 {
                    return hours;
                }
            }
        }
    }
    0.0
}

fn extract_price(doc: &Html, body: &str) -> String {
    // Try meta tag
    if let Some(price) = extract_meta(doc, "udemy_com:price") {
        return price;
    }
    if let Some(price) = extract_meta(doc, "product:price:amount") {
        let currency = extract_meta(doc, "product:price:currency").unwrap_or_default();
        return if currency.is_empty() {
            format!("${price}")
        } else {
            format!("{price} {currency}")
        };
    }
    // Scan for price patterns
    let lower = body.to_lowercase();
    if lower.contains("free") && lower.contains("enroll") {
        return "Free".to_string();
    }
    String::new()
}

fn extract_num_students(body: &str) -> u32 {
    // Look for "123,456 students" pattern
    let lower = body.to_lowercase();
    if let Some(idx) = lower.find(" students") {
        let before = &lower[..idx];
        let num_str: String = before
            .chars()
            .rev()
            .take_while(|c| c.is_ascii_digit() || *c == ',')
            .collect::<String>()
            .chars()
            .rev()
            .collect();
        let cleaned: String = num_str.chars().filter(|c| c.is_ascii_digit()).collect();
        if let Ok(n) = cleaned.parse::<u32>() {
            return n;
        }
    }
    0
}

fn extract_category(doc: &Html) -> Option<String> {
    // Breadcrumb or category meta
    if let Some(cat) = extract_meta(doc, "udemy_com:category") {
        return Some(cat);
    }
    // Try breadcrumb links
    for selector_str in [
        "nav[aria-label=\"Breadcrumb\"] a",
        "[data-purpose=\"breadcrumb\"] a",
    ] {
        if let Ok(sel) = Selector::parse(selector_str) {
            let links: Vec<String> = doc
                .select(&sel)
                .map(|el| el.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty() && s != "Udemy")
                .collect();
            if let Some(last) = links.last() {
                return Some(last.clone());
            }
        }
    }
    None
}

fn extract_topics(doc: &Html) -> Vec<String> {
    // "What you'll learn" section — list items
    for selector_str in [
        "[data-purpose=\"course-objectives\"] li",
        "[class*=\"what-you-will-learn\"] li",
        ".what-you-will-learn--objective-item li",
    ] {
        if let Ok(sel) = Selector::parse(selector_str) {
            let items: Vec<String> = doc
                .select(&sel)
                .map(|el| el.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty())
                .collect();
            if !items.is_empty() {
                return items;
            }
        }
    }

    // Fallback: try span elements within objectives
    if let Ok(sel) = Selector::parse("[data-purpose=\"objective\"] span") {
        let items: Vec<String> = doc
            .select(&sel)
            .map(|el| el.text().collect::<String>().trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !items.is_empty() {
            return items;
        }
    }

    if items_empty_log() {
        warn!("Could not extract 'What you'll learn' topics");
    }

    Vec::new()
}

fn items_empty_log() -> bool {
    true
}
