/**
 * Parse LinkedIn "Pages people also viewed" / "Find related" modal HTML
 * and extract company cards with optional industry filtering.
 */

export interface LinkedInCompanyCard {
  name: string;
  industry: string;
  followers: number;
  linkedinUrl: string;
  linkedinSlug: string;
  logoUrl: string | null;
}

export interface ParseResult {
  companies: LinkedInCompanyCard[];
  filtered: LinkedInCompanyCard[];
  total: number;
}

/**
 * Extract company cards from LinkedIn's Ember-rendered "related companies" modal HTML.
 *
 * Each card lives inside an `org-view-entity-card__container` div with a predictable
 * structure: title → subtitle (industry) → caption (followers) → link (linkedin url).
 */
export function parseRelatedCompanies(
  html: string,
  industryFilter?: string,
): ParseResult {
  // Split by card container boundaries
  const cardChunks = html.split("org-view-entity-card__container");
  // First chunk is before the first card — skip it
  const rawCards = cardChunks.slice(1);

  const all: LinkedInCompanyCard[] = [];

  for (const chunk of rawCards) {
    const name = extractText(chunk, "org-view-entity-card__title");
    const industry = extractText(chunk, "org-view-entity-card__subtitle");
    const followersText = extractText(chunk, "org-view-entity-card__secondary-subtitle");
    const linkedinUrl = extractCompanyUrl(chunk);
    const logoUrl = extractLogoUrl(chunk);

    if (!name || !industry) continue;

    const followers = parseFollowers(followersText);
    const linkedinSlug = linkedinUrl
      ? linkedinUrl.replace(/^.*\/company\//, "").replace(/\/$/, "")
      : "";

    all.push({
      name,
      industry,
      followers,
      linkedinUrl: linkedinUrl || "",
      linkedinSlug,
      logoUrl,
    });
  }

  const normalizedFilter = industryFilter?.trim().toLowerCase();
  const filtered = normalizedFilter
    ? all.filter((c) => c.industry.toLowerCase() === normalizedFilter)
    : all;

  return { companies: filtered, filtered: all.filter((c) => !filtered.includes(c)), total: all.length };
}

function extractText(chunk: string, className: string): string {
  const idx = chunk.indexOf(className);
  if (idx === -1) return "";

  // Find the next > after the class, then grab text until next <
  const afterClass = chunk.slice(idx);
  const closeTag = afterClass.indexOf(">");
  if (closeTag === -1) return "";

  const afterTag = afterClass.slice(closeTag + 1);
  // For nested spans, look for actual text content (skip comment nodes)
  const textContent = afterTag
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .split("<")[0] || afterTag.replace(/<!--.*?-->/g, "").replace(/<[^>]+>/g, " ");

  // Clean up: take first meaningful text block
  const cleaned = textContent
    .replace(/<!--.*?-->/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

function extractCompanyUrl(chunk: string): string | null {
  const match = chunk.match(/href="(https:\/\/www\.linkedin\.com\/company\/[^"]+)"/);
  return match ? match[1] : null;
}

function extractLogoUrl(chunk: string): string | null {
  const match = chunk.match(/company-logo[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

function parseFollowers(text: string): number {
  if (!text) return 0;
  const cleaned = text.replace(/,/g, "").replace(/followers/i, "").trim();
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}
