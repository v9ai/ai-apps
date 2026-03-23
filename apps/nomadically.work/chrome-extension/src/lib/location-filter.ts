/**
 * Location filter for excluding non-EU/non-remote job postings.
 * Filters out jobs clearly located in South Asia regions (India, Pakistan, Sri Lanka).
 */
export const EXCLUDED_LOCATION_PATTERNS =
  /\b(india|bengaluru|bangalore|mumbai|hyderabad|delhi|chennai|pune|gurugram|gurgaon|noida|kolkata|ahmedabad|jaipur|lucknow|sri\s*lanka|colombo|pakistan|karachi|lahore|islamabad|rawalpindi|faisalabad|multan|peshawar|quetta|sialkot|gujranwala)\b/i;

export function isExcludedLocation(job: {
  location?: string;
  title?: string;
}): boolean {
  const location = job.location || "";
  const title = job.title || "";
  return (
    EXCLUDED_LOCATION_PATTERNS.test(location) ||
    EXCLUDED_LOCATION_PATTERNS.test(title)
  );
}
