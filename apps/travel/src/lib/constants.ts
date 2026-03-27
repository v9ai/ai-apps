// ═══════════════════════════════════════════════════════════════════════════
// YEAR CONSTANTS — SINGLE SOURCE OF TRUTH (TypeScript mirror)
//
// These mirror crates/travel-ml/src/constants.rs exactly.
// To change the target year window (e.g. when rolling to 2027):
//   1. Update both constants here AND in constants.rs.
//   2. DISCOVERY_YEAR drives all page titles and dataset metadata.
//   3. NEW_HOTEL_MIN_YEAR drives the "NEW {year}" badge threshold in
//      GreeceHotels.tsx and HotelDetailContent.tsx.
//
// DO NOT hardcode 2026 or 2025 in any .ts / .tsx file. Import from here.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Target year for this dataset.
 *
 * Used in:
 * - Page titles: "Greece Hotels — New in {DISCOVERY_YEAR}"
 * - Hotel detail metadata: "Greece Hotels {DISCOVERY_YEAR}"
 * - GreecePageContent.tsx section headings (RO + EN)
 *
 * Rust mirror: `DISCOVERY_YEAR` in `crates/travel-ml/src/constants.rs`
 */
export const DISCOVERY_YEAR = 2026;

/**
 * Minimum opening year for the "NEW {year}" badge.
 *
 * A hotel renders the badge when `hotel.opened_year >= NEW_HOTEL_MIN_YEAR`.
 * This covers both the current year and the previous year (2025–2026 window).
 *
 * Used in:
 * - GreeceHotels.tsx: card-level badge
 * - HotelDetailContent.tsx: hero-level badge
 *
 * Rust mirror: `NEW_HOTEL_MIN_YEAR` in `crates/travel-ml/src/constants.rs`
 */
export const NEW_HOTEL_MIN_YEAR = 2025;
