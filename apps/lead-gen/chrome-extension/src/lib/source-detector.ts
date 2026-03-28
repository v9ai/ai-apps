/**
 * Detects the job board source type and associated tags from a URL.
 */
export interface SourceInfo {
  sourceType: string;
  tags: string[];
}

export function detectSourceFromUrl(url: string): SourceInfo {
  if (url.includes("linkedin.com")) {
    return { sourceType: "linkedin", tags: ["linkedin"] };
  }
  if (url.includes("indeed.com")) {
    return { sourceType: "indeed", tags: ["indeed"] };
  }
  if (url.includes("glassdoor.com")) {
    return { sourceType: "glassdoor", tags: ["glassdoor"] };
  }
  if (url.includes("workable.com") || url.includes("site%3Aworkable")) {
    return { sourceType: "workable", tags: ["workable"] };
  }
  if (url.includes("google.com/search")) {
    const tags = ["google_search"];
    if (url.includes("workable")) tags.push("workable");
    return { sourceType: "google_search", tags };
  }
  return { sourceType: "other", tags: [] };
}

/**
 * Returns true if the URL points to a Google search page.
 */
export function isGoogleSearchUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const h = urlObj.hostname;
    const isGoogleDomain =
      h === "google.com" ||
      h.endsWith(".google.com") ||
      h.startsWith("google.") ||
      h.includes(".google.");
    return isGoogleDomain && urlObj.pathname === "/search";
  } catch {
    return false;
  }
}
