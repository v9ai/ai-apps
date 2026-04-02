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

/**
 * Keywords that indicate a hotel is seaside / coastal.
 *
 * A hotel passes the seaside filter if ANY keyword appears (case-insensitive)
 * in its description, location, or amenities.
 *
 * Rust mirror: `SEASIDE_KEYWORDS` in `crates/travel-ml/src/constants.rs`
 */
export const SEASIDE_KEYWORDS = [
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
] as const;

/**
 * Greek island regions — every hotel on a Greek island is inherently seaside.
 *
 * Rust mirror: `ISLAND_REGIONS` in `crates/travel-ml/src/constants.rs`
 */
export const ISLAND_REGIONS = [
  "Crete",
  "Cyclades",
  "Dodecanese",
  "Ionian Islands",
  "Sporades",
  "NE Aegean",
  "Saronic Islands",
] as const;

/**
 * Maximum review count plausible for a genuinely new hotel.
 *
 * If a hotel has `opened_year >= DISCOVERY_YEAR` but more reviews than this,
 * it was misidentified as new. The Rust pipeline clears `opened_year` to
 * null before export, so this constant is informational on the TS side.
 *
 * Rust mirror: `MAX_REVIEWS_NEW_HOTEL` in `crates/travel-ml/src/constants.rs`
 */
export const MAX_REVIEWS_NEW_HOTEL = 50;

// ═══════════════════════════════════════════════════════════════════════════
// LONG-STAY RENTAL CONSTANTS
// Rust mirror: crates/travel-ml/src/constants.rs
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum nights for a long-stay rental. Rust mirror: LONG_STAY_MIN_NIGHTS */
export const LONG_STAY_MIN_NIGHTS = 28;

/** Hard budget cap in EUR/month. Rust mirror: LONG_STAY_MAX_MONTHLY_EUR */
export const LONG_STAY_MAX_MONTHLY_EUR = 1_500;

/** Maximum beach distance in km. Rust mirror: LONG_STAY_MAX_BEACH_KM */
export const LONG_STAY_MAX_BEACH_KM = 2.0;
