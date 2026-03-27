//! Hotel existence verification.
//!
//! Validates that a hotel name corresponds to a real property before it enters
//! the ML pipeline. Three independent signals are checked:
//!
//! 1. **Source URL** — generic search URLs (e.g. booking.com/searchresults)
//!    indicate the hotel was never linked to an actual listing.
//! 2. **Scraped reviews** — if Google Maps, Google Search, and Booking.com all
//!    return zero reviews/rating, the property almost certainly doesn't exist.
//! 3. **Pre-scraped data** — cross-reference against the Playwright JSON export
//!    (scraped_reviews.json) for an independent existence signal.
//!
//! Each check produces a [`VerifySignal`]; the final [`Verdict`] combines them.

use tracing::{info, warn};

use crate::hotel::Hotel;
use crate::reviews::ScrapedReviewData;

// ── Types ───────────────────────────────────────────────────────────────

/// Outcome of a single verification check.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VerifySignal {
    /// Evidence that the hotel exists.
    Pass,
    /// No evidence either way — inconclusive.
    Weak,
    /// Evidence that the hotel does NOT exist.
    Fail,
}

/// Combined verification verdict for a hotel.
#[derive(Debug, Clone)]
pub struct Verdict {
    pub hotel_name: String,
    pub url_signal: VerifySignal,
    pub review_signal: VerifySignal,
    pub prescraped_signal: VerifySignal,
    pub passed: bool,
}

impl std::fmt::Display for Verdict {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let icon = if self.passed { "✓" } else { "✗" };
        write!(
            f,
            "{icon} {} — url:{:?} reviews:{:?} prescraped:{:?}",
            self.hotel_name, self.url_signal, self.review_signal, self.prescraped_signal,
        )
    }
}

// ── Individual checks ───────────────────────────────────────────────────

/// Check whether `source_url` points to a real property page.
///
/// Generic search URLs (booking.com/searchresults, google.com/search) indicate
/// the author never found an actual listing for this hotel.
pub fn check_source_url(hotel: &Hotel) -> VerifySignal {
    let url = hotel.source_url.to_lowercase();

    if url.is_empty() {
        return VerifySignal::Weak;
    }

    // Generic search pages — no property-level listing exists
    let generic_patterns = [
        "booking.com/searchresults",
        "google.com/search",
        "google.com/maps/search",
        "tripadvisor.com/Hotels-g",
        "hotels.com/search",
    ];
    if generic_patterns.iter().any(|p| url.contains(p)) {
        return VerifySignal::Fail;
    }

    // Brand domain without property path (e.g. "marriott.com/w-hotels" with no
    // specific property slug) is ambiguous — treat as Weak, not Pass.
    // A real property page typically has ≥2 non-empty path segments after the domain.
    let path_segments: Vec<&str> = url
        .split("://")
        .nth(1)
        .map(|after_scheme| {
            after_scheme
                .splitn(2, '/')
                .nth(1)
                .unwrap_or("")
        })
        .unwrap_or("")
        .split('/')
        .filter(|s| !s.is_empty())
        .collect();
    if path_segments.len() < 2 {
        return VerifySignal::Weak;
    }

    VerifySignal::Pass
}

/// Check scraped review data from Google/Booking for evidence of existence.
pub fn check_scraped_reviews(scraped: &ScrapedReviewData) -> VerifySignal {
    if scraped.review_count > 0 || scraped.review_rating > 0.0 {
        return VerifySignal::Pass;
    }
    if !scraped.review_texts.is_empty() {
        return VerifySignal::Pass;
    }
    if !scraped.sources.is_empty() {
        // Sources were hit but returned no data — inconclusive
        return VerifySignal::Weak;
    }
    VerifySignal::Fail
}

/// Check whether the hotel appears in the pre-scraped Playwright JSON.
pub fn check_prescraped(hotel_id: &str, prescraped_path: Option<&str>) -> VerifySignal {
    let path = match prescraped_path {
        Some(p) if std::path::Path::new(p).exists() => p,
        _ => return VerifySignal::Weak,
    };

    let content = match std::fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return VerifySignal::Weak,
    };
    let data: serde_json::Value = match serde_json::from_str(&content) {
        Ok(d) => d,
        Err(_) => return VerifySignal::Weak,
    };

    match data.get(hotel_id) {
        Some(entry) => {
            let rating = entry
                .get("review_rating")
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            let count = entry
                .get("review_count")
                .and_then(|v| v.as_u64())
                .unwrap_or(0);
            if rating > 0.0 || count > 0 {
                VerifySignal::Pass
            } else {
                VerifySignal::Fail
            }
        }
        None => VerifySignal::Weak,
    }
}

// ── Combined verdict ────────────────────────────────────────────────────

/// Combine all signals into a pass/fail verdict.
///
/// Policy: a hotel passes if **at least one signal is Pass** and **no two
/// signals are Fail**. This means:
/// - A single strong positive (real reviews found) overrides weak negatives.
/// - Two independent failures (generic URL + zero reviews) trigger rejection.
fn combine(url: VerifySignal, reviews: VerifySignal, prescraped: VerifySignal) -> bool {
    let pass_count = [url, reviews, prescraped]
        .iter()
        .filter(|s| **s == VerifySignal::Pass)
        .count();
    let fail_count = [url, reviews, prescraped]
        .iter()
        .filter(|s| **s == VerifySignal::Fail)
        .count();

    if pass_count > 0 {
        return true;
    }
    // No passes — fail if we have any hard failures
    fail_count == 0
}

/// Run all verification checks on a single hotel.
pub fn verify_hotel(
    hotel: &Hotel,
    scraped: &ScrapedReviewData,
    prescraped_path: Option<&str>,
) -> Verdict {
    let url_signal = check_source_url(hotel);
    let review_signal = check_scraped_reviews(scraped);
    let prescraped_signal = check_prescraped(&hotel.hotel_id, prescraped_path);
    let passed = combine(url_signal, review_signal, prescraped_signal);

    Verdict {
        hotel_name: hotel.name.clone(),
        url_signal,
        review_signal,
        prescraped_signal,
        passed,
    }
}

/// Verify a batch of hotels, returning only those that pass existence checks.
///
/// Logs each verdict and a summary line. Designed to slot into the pipeline
/// between review scraping (IO phase) and Candle ML analysis (CPU phase),
/// so rejected hotels never waste embedding compute.
pub fn verify_batch(
    hotels: &[Hotel],
    scraped_data: &[ScrapedReviewData],
    prescraped_path: Option<&str>,
) -> Vec<usize> {
    assert_eq!(hotels.len(), scraped_data.len());

    let mut keep = Vec::new();
    let mut dropped = Vec::new();

    for (i, (hotel, scraped)) in hotels.iter().zip(scraped_data.iter()).enumerate() {
        let verdict = verify_hotel(hotel, scraped, prescraped_path);
        if verdict.passed {
            keep.push(i);
        } else {
            warn!("Dropping unverifiable hotel: {verdict}");
            dropped.push(verdict.hotel_name.clone());
        }
    }

    if !dropped.is_empty() {
        info!(
            "Existence check: dropped {} unverifiable hotels ({} remain): [{}]",
            dropped.len(),
            keep.len(),
            dropped.join(", "),
        );
    } else {
        info!("Existence check: all {} hotels verified", keep.len());
    }

    keep
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hotel::test_hotel;

    fn empty_scraped() -> ScrapedReviewData {
        ScrapedReviewData {
            review_texts: vec![],
            review_count: 0,
            review_rating: 0.0,
            sources: vec![],
        }
    }

    fn real_scraped() -> ScrapedReviewData {
        ScrapedReviewData {
            review_texts: vec!["Great hotel!".into()],
            review_count: 342,
            review_rating: 8.7,
            sources: vec!["google_maps".into(), "booking".into()],
        }
    }

    // ── check_source_url ──────────────────────────────────────────────

    #[test]
    fn url_generic_booking_search_fails() {
        let mut h = test_hotel("Fake Hotel", 3, "Naxos");
        h.source_url = "https://www.booking.com/searchresults.html?ss=Naxos+Town".into();
        assert_eq!(check_source_url(&h), VerifySignal::Fail);
    }

    #[test]
    fn url_generic_google_search_fails() {
        let mut h = test_hotel("Fake Hotel", 3, "Naxos");
        h.source_url = "https://www.google.com/search?q=hotel+naxos".into();
        assert_eq!(check_source_url(&h), VerifySignal::Fail);
    }

    #[test]
    fn url_brand_homepage_is_weak() {
        let mut h = test_hotel("W Crete", 5, "Chania");
        h.source_url = "https://www.marriott.com/w-hotels".into();
        assert_eq!(check_source_url(&h), VerifySignal::Weak);
    }

    #[test]
    fn url_empty_is_weak() {
        let h = test_hotel("Test", 4, "Crete");
        assert_eq!(check_source_url(&h), VerifySignal::Weak);
    }

    #[test]
    fn url_specific_property_page_passes() {
        let mut h = test_hotel("Canaves Oia", 5, "Santorini");
        h.source_url = "https://www.canaves.com/canaves-oia-epitome/rooms".into();
        assert_eq!(check_source_url(&h), VerifySignal::Pass);
    }

    // ── check_scraped_reviews ─────────────────────────────────────────

    #[test]
    fn reviews_with_data_passes() {
        assert_eq!(check_scraped_reviews(&real_scraped()), VerifySignal::Pass);
    }

    #[test]
    fn reviews_rating_only_passes() {
        let s = ScrapedReviewData {
            review_texts: vec![],
            review_count: 0,
            review_rating: 7.5,
            sources: vec!["google".into()],
        };
        assert_eq!(check_scraped_reviews(&s), VerifySignal::Pass);
    }

    #[test]
    fn reviews_count_only_passes() {
        let s = ScrapedReviewData {
            review_texts: vec![],
            review_count: 50,
            review_rating: 0.0,
            sources: vec!["booking".into()],
        };
        assert_eq!(check_scraped_reviews(&s), VerifySignal::Pass);
    }

    #[test]
    fn reviews_texts_only_passes() {
        let s = ScrapedReviewData {
            review_texts: vec!["Nice place!".into()],
            review_count: 0,
            review_rating: 0.0,
            sources: vec![],
        };
        assert_eq!(check_scraped_reviews(&s), VerifySignal::Pass);
    }

    #[test]
    fn reviews_empty_with_sources_is_weak() {
        let s = ScrapedReviewData {
            review_texts: vec![],
            review_count: 0,
            review_rating: 0.0,
            sources: vec!["google_maps".into()],
        };
        assert_eq!(check_scraped_reviews(&s), VerifySignal::Weak);
    }

    #[test]
    fn reviews_totally_empty_fails() {
        assert_eq!(check_scraped_reviews(&empty_scraped()), VerifySignal::Fail);
    }

    // ── combine ──────────────────────────────────────────────────────

    #[test]
    fn one_pass_overrides_fails() {
        assert!(combine(VerifySignal::Fail, VerifySignal::Pass, VerifySignal::Fail));
    }

    #[test]
    fn all_weak_passes() {
        assert!(combine(VerifySignal::Weak, VerifySignal::Weak, VerifySignal::Weak));
    }

    #[test]
    fn fail_plus_weak_rejects() {
        assert!(!combine(VerifySignal::Fail, VerifySignal::Weak, VerifySignal::Weak));
    }

    #[test]
    fn two_fails_rejects() {
        assert!(!combine(VerifySignal::Fail, VerifySignal::Fail, VerifySignal::Weak));
    }

    #[test]
    fn all_pass_passes() {
        assert!(combine(VerifySignal::Pass, VerifySignal::Pass, VerifySignal::Pass));
    }

    // ── verify_hotel (integration) ────────────────────────────────────

    #[test]
    fn fictional_hotel_with_generic_url_rejected() {
        let mut h = test_hotel("Selini Suites Naxos", 3, "Naxos, Cyclades");
        h.source_url = "https://www.booking.com/searchresults.html?ss=Naxos+Town+Greece+hotel".into();
        let verdict = verify_hotel(&h, &empty_scraped(), None);
        assert!(!verdict.passed, "fictional hotel should be rejected: {verdict}");
    }

    #[test]
    fn real_hotel_with_reviews_accepted() {
        let mut h = test_hotel("Canaves Oia Epitome", 5, "Santorini, Cyclades");
        h.source_url = "https://www.canaves.com".into();
        let verdict = verify_hotel(&h, &real_scraped(), None);
        assert!(verdict.passed, "real hotel should be accepted: {verdict}");
    }

    #[test]
    fn hotel_with_weak_url_but_real_reviews_accepted() {
        let mut h = test_hotel("Numo Ierapetra", 5, "Ierapetra, Crete");
        h.source_url = "https://numohotels.com".into();
        let verdict = verify_hotel(&h, &real_scraped(), None);
        assert!(verdict.passed, "hotel with real reviews should pass: {verdict}");
    }

    // ── verify_batch ─────────────────────────────────────────────────

    #[test]
    fn batch_filters_fictional() {
        let hotels = vec![
            {
                let mut h = test_hotel("Fake Beach Hotel", 3, "Kos");
                h.source_url = "https://www.booking.com/searchresults.html?ss=Kos".into();
                h
            },
            {
                let mut h = test_hotel("Real Resort", 4, "Crete");
                h.source_url = "https://realresort.com/property/crete-main".into();
                h
            },
        ];
        let scraped = vec![empty_scraped(), real_scraped()];
        let kept = verify_batch(&hotels, &scraped, None);
        assert_eq!(kept, vec![1], "only the real hotel should survive");
    }
}
