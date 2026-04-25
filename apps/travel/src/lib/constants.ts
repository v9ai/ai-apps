// Year constants — single source of truth.
// DO NOT hardcode 2026 or 2025 in any .ts / .tsx file. Import from here.

export const DISCOVERY_YEAR = 2026;

// Hotels render a "NEW {year}" badge when opened_year >= this threshold.
export const NEW_HOTEL_MIN_YEAR = 2025;

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

// Greek island regions — every hotel on a Greek island is inherently seaside.
export const ISLAND_REGIONS = [
  "Crete",
  "Cyclades",
  "Dodecanese",
  "Ionian Islands",
  "Sporades",
  "NE Aegean",
  "Saronic Islands",
] as const;

// Hotels with opened_year >= DISCOVERY_YEAR but more reviews than this were
// misidentified as new — informational only; nothing in this app enforces it.
export const MAX_REVIEWS_NEW_HOTEL = 50;

// Long-stay rental constants.
export const LONG_STAY_MIN_NIGHTS = 28;
export const LONG_STAY_MAX_MONTHLY_EUR = 1_500;
export const LONG_STAY_MAX_BEACH_KM = 2.0;
