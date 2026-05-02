// US + EU-27 + UK + EEA/EFTA — the geo allowlist for the sales-tech tab.
//
// Mirror of `chrome-extension/src/lib/country-codes.ts` — keep both files in
// sync when editing the allowlist. ISO 3166-1 alpha-2.

export const US_EU_EEA_CODES = [
  "US",
  // EU-27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // UK + EEA/EFTA
  "GB", "CH", "NO", "IS", "LI",
] as const;
