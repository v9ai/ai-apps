// Country allowlist + parser for the sales-tech tab geo gate.
//
// Mirror of `src/lib/country-codes.ts` — keep both files in sync when
// editing the allowlist.
//
// Codes are ISO 3166-1 alpha-2. Allowlist = US + EU-27 + GB + EEA/EFTA.

export const US_EU_EEA_CODES = [
  "US",
  // EU-27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // UK + EEA/EFTA
  "GB", "CH", "NO", "IS", "LI",
] as const;

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  "united states": "US",
  "united states of america": "US",
  "usa": "US",
  "u.s.a.": "US",
  "u.s.": "US",
  "us": "US",
  "austria": "AT",
  "belgium": "BE",
  "bulgaria": "BG",
  "croatia": "HR",
  "cyprus": "CY",
  "czechia": "CZ",
  "czech republic": "CZ",
  "denmark": "DK",
  "estonia": "EE",
  "finland": "FI",
  "france": "FR",
  "germany": "DE",
  "deutschland": "DE",
  "greece": "GR",
  "hungary": "HU",
  "ireland": "IE",
  "italy": "IT",
  "latvia": "LV",
  "lithuania": "LT",
  "luxembourg": "LU",
  "malta": "MT",
  "netherlands": "NL",
  "the netherlands": "NL",
  "holland": "NL",
  "poland": "PL",
  "portugal": "PT",
  "romania": "RO",
  "slovakia": "SK",
  "slovenia": "SI",
  "spain": "ES",
  "sweden": "SE",
  "united kingdom": "GB",
  "uk": "GB",
  "u.k.": "GB",
  "great britain": "GB",
  "england": "GB",
  "scotland": "GB",
  "wales": "GB",
  "northern ireland": "GB",
  "switzerland": "CH",
  "norway": "NO",
  "iceland": "IS",
  "liechtenstein": "LI",
};

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
]);

// LinkedIn HQ strings: "City, State, Country" or "City, Country" or
// "City, ST" (US-only abbreviation). Walk segments right-to-left so the
// trailing token is preferred — that's where the country usually sits.
export function parseCountryCode(location: string | null | undefined): string | undefined {
  if (!location) return undefined;
  const segments = location
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return undefined;

  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i].toLowerCase();
    if (COUNTRY_NAME_TO_CODE[seg]) return COUNTRY_NAME_TO_CODE[seg];
  }

  // Fallback: bare US-state suffix ("San Francisco, CA")
  const last = segments[segments.length - 1].toUpperCase();
  if (US_STATE_CODES.has(last)) return "US";

  return undefined;
}
