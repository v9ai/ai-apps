/**
 * Canonical text builder for company embedding.
 *
 * Combines name, description, services, industries, tags, industry, and
 * location into a single string optimised for BGE-small-en-v1.5 encoding.
 */

function parseJsonArray(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Filter out structured tags that contain a colon (e.g. "source:crawl").
 * These are internal metadata, not meaningful for embedding.
 */
function filterHumanTags(tags: string[]): string[] {
  return tags.filter((t) => !t.includes(":"));
}

export interface CompanyTextInput {
  name: string;
  description?: string | null;
  services?: string | null;
  industries?: string | null;
  tags?: string | null;
  industry?: string | null;
  location?: string | null;
}

/**
 * Build a canonical embedding text for a company record.
 *
 * Concatenates available fields into a single passage. Structured tags
 * (containing ":") are filtered out.
 *
 * @example
 * ```ts
 * const text = companyToEmbeddingText(company);
 * const vec = await embedDocument(text);
 * ```
 */
export function companyToEmbeddingText(company: CompanyTextInput): string {
  const parts: string[] = [];

  parts.push(company.name);

  if (company.description) {
    parts.push(company.description);
  }

  const services = parseJsonArray(company.services);
  if (services.length > 0) {
    parts.push(`Services: ${services.join(", ")}`);
  }

  const industries = parseJsonArray(company.industries);
  if (industries.length > 0) {
    parts.push(`Industries: ${industries.join(", ")}`);
  }

  if (company.industry) {
    parts.push(`Industry: ${company.industry}`);
  }

  const tags = filterHumanTags(parseJsonArray(company.tags));
  if (tags.length > 0) {
    parts.push(`Tags: ${tags.join(", ")}`);
  }

  if (company.location) {
    parts.push(`Location: ${company.location}`);
  }

  return parts.join(". ");
}
