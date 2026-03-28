// ═══════════════════════════════════════════════════════════════════════════
// YEAR CONSTANTS — SINGLE SOURCE OF TRUTH
//
// To change the target year window (e.g. when rolling to 2027):
//   1. Update DISCOVERY_YEAR and DISCOVERY_YEAR_STR below.
//   2. Update NEW_HOTEL_MIN_YEAR to (DISCOVERY_YEAR - 1).
//   3. Update the mirror in apps/travel/src/lib/constants.ts to match.
//   4. Run `cargo test` — the enforcement tests in this file will catch
//      any missed usages.
//
// DO NOT hardcode 2026 or 2025 anywhere else in this crate. Every year
// value in production code must reference one of these three constants.
// ═══════════════════════════════════════════════════════════════════════════

/// Target year for this dataset.
///
/// Used as:
/// - The fallback `opened_year` when a scraped passage mentions the year
///   in text but no parseable year token is found.
/// - The `opened_year` value assigned to all synthetic curated hotels.
/// - Embedded into discovery query strings sent to the Candle embedding engine.
/// - Embedded into the optional DeepSeek extraction prompt.
///
/// Mirror: `DISCOVERY_YEAR` in `apps/travel/src/lib/constants.ts`.
pub const DISCOVERY_YEAR: u16 = 2026;

/// String form of [`DISCOVERY_YEAR`] for `str::contains` checks on scraped text.
///
/// Kept as a separate `&str` constant because Rust `concat!` does not accept
/// non-literal constants, and calling `.to_string()` at each call site would
/// allocate unnecessarily inside tight scraping loops.
///
/// Must always equal `DISCOVERY_YEAR.to_string()` — enforced by
/// `constants::tests::discovery_year_str_matches_discovery_year`.
pub const DISCOVERY_YEAR_STR: &str = "2026";

/// Minimum opening year for a hotel to qualify as "new" in the current window.
///
/// Used as:
/// - The lower bound in `extract_hotels` year filter (`y >= NEW_HOTEL_MIN_YEAR`).
/// - The badge display threshold in both `GreeceHotels.tsx` and
///   `HotelDetailContent.tsx` (`opened_year >= NEW_HOTEL_MIN_YEAR`).
///
/// Must satisfy `NEW_HOTEL_MIN_YEAR >= DISCOVERY_YEAR - 1` — enforced by
/// `constants::tests::new_hotel_min_year_within_discovery_window`.
///
/// Mirror: `NEW_HOTEL_MIN_YEAR` in `apps/travel/src/lib/constants.ts`.
pub const NEW_HOTEL_MIN_YEAR: u16 = 2025;

/// Keywords that indicate a hotel is seaside / coastal.
///
/// Used by `discover::is_seaside_hotel` to gate non-island hotels.
/// A hotel passes if ANY keyword appears (case-insensitive) in its
/// `description`, `location`, or any `amenities` entry.
///
/// Mirror: `SEASIDE_KEYWORDS` in `apps/travel/src/lib/constants.ts`.
pub const SEASIDE_KEYWORDS: &[&str] = &[
    "beach",
    "beachfront",
    "seaside",
    "seafront",
    "oceanfront",
    "coastal",
    "waterfront",
    "bay",
    "cove",
    "shore",
    "marina",
    "harbour",
    "harbor",
    "sea view",
    "sea-view",
    "water sports",
    "aegean",
    "mediterranean",
];

/// Greek island regions — every hotel on a Greek island is inherently seaside.
///
/// Used by `discover::is_seaside_hotel` to short-circuit the keyword check.
///
/// Mirror: `ISLAND_REGIONS` in `apps/travel/src/lib/constants.ts`.
pub const ISLAND_REGIONS: &[&str] = &[
    "Crete",
    "Cyclades",
    "Dodecanese",
    "Ionian Islands",
    "Sporades",
    "NE Aegean",
    "Saronic Islands",
];

/// Maximum review count plausible for a genuinely new hotel.
///
/// A hotel with `opened_year >= DISCOVERY_YEAR` and `review_count` above this
/// threshold is almost certainly an established hotel misidentified as new
/// (scraped articles say "best hotels to visit in 2026", not "opened in 2026").
/// When this fires, the pipeline clears `opened_year` to `None`, which:
/// - Preserves the accurate scraped review data.
/// - Removes the false "NEW" badge in the UI.
///
/// Mirror: `MAX_REVIEWS_NEW_HOTEL` in `apps/travel/src/lib/constants.ts`.
pub const MAX_REVIEWS_NEW_HOTEL: u32 = 50;

/// Family group size for Napoli itinerary planning.
pub const FAMILY_ADULTS: u8 = 2;
pub const FAMILY_KIDS: u8 = 1;
pub const FAMILY_TOTAL: u8 = FAMILY_ADULTS + FAMILY_KIDS;

/// Kid energy budget per day (sum of PlaceNode.energy_cost).
pub const KID_ENERGY_LIMIT: f32 = 3.0;

/// Cosine similarity threshold for "kid-friendly" classification.
pub const KID_FRIENDLY_THRESHOLD: f32 = 0.65;

/// Family ML anchor queries used for embedding-based scoring.
pub const FAMILY_ANCHORS: [&str; 3] = [
    "family-friendly activities for children and kids in the city",
    "outdoor open space suitable for young children and toddlers",
    "educational interactive experience for kids and families",
];

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn discovery_year_str_matches_discovery_year() {
        assert_eq!(
            DISCOVERY_YEAR_STR,
            DISCOVERY_YEAR.to_string().as_str(),
            "DISCOVERY_YEAR_STR must equal DISCOVERY_YEAR as a string"
        );
    }

    #[test]
    fn new_hotel_min_year_within_discovery_window() {
        assert!(
            NEW_HOTEL_MIN_YEAR <= DISCOVERY_YEAR,
            "NEW_HOTEL_MIN_YEAR ({NEW_HOTEL_MIN_YEAR}) must not exceed DISCOVERY_YEAR ({DISCOVERY_YEAR})"
        );
        assert!(
            NEW_HOTEL_MIN_YEAR >= DISCOVERY_YEAR - 1,
            "NEW_HOTEL_MIN_YEAR ({NEW_HOTEL_MIN_YEAR}) must be within 1 year of DISCOVERY_YEAR ({DISCOVERY_YEAR})"
        );
    }

    #[test]
    fn max_reviews_new_hotel_is_reasonable() {
        assert!(
            MAX_REVIEWS_NEW_HOTEL > 0,
            "MAX_REVIEWS_NEW_HOTEL must be positive"
        );
        assert!(
            MAX_REVIEWS_NEW_HOTEL <= 200,
            "MAX_REVIEWS_NEW_HOTEL ({MAX_REVIEWS_NEW_HOTEL}) seems too high — \
             a genuinely new hotel cannot have hundreds of reviews"
        );
    }
}
