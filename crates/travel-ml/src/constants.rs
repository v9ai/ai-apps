/// The year this dataset targets — used as fallback when no year can be extracted
/// from a scraped passage.
pub const DISCOVERY_YEAR: u16 = 2026;

/// String form of DISCOVERY_YEAR for text-based matching in scraped content.
pub const DISCOVERY_YEAR_STR: &str = "2026";

/// Minimum opening year for a hotel to qualify as "new" (2025–2026 window).
/// Used for badge display and scraping filters.
pub const NEW_HOTEL_MIN_YEAR: u16 = 2025;

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
}
