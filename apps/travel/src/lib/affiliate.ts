/**
 * TripAdvisor affiliate link configuration.
 *
 * Once approved on CJ (Commission Junction), set your publisher ID and
 * the TripAdvisor advertiser ID here. All TripAdvisor links on the site
 * will automatically be wrapped with affiliate tracking.
 *
 * Sign up: https://www.tripadvisor.com/affiliates
 * Network: CJ Affiliate (https://www.cj.com)
 */

// Set these after CJ approval — leave empty to use plain TripAdvisor links
const CJ_PUBLISHER_ID = "";
const CJ_ADVERTISER_ID = "";

export function buildTripadvisorAffiliateUrl(plainUrl: string): string {
  if (!CJ_PUBLISHER_ID || !CJ_ADVERTISER_ID) {
    return plainUrl;
  }

  const encoded = encodeURIComponent(plainUrl);
  return `https://www.anrdoezrs.net/click-${CJ_PUBLISHER_ID}-${CJ_ADVERTISER_ID}?url=${encoded}`;
}
