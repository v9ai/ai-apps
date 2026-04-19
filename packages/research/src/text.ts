/** Normalize a DOI to canonical lowercase form, stripped of URL prefixes. */
export function normalizeDoi(doi?: string): string | undefined {
  if (!doi) return undefined;
  const d = doi.trim().toLowerCase();
  const stripped = d
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, "")
    .replace(/^doi:\s*/i, "")
    .trim();
  return stripped || undefined;
}

/** Strip JATS/XML/HTML tags and decode common entities. */
export function stripJats(input?: string): string | undefined {
  if (!input) return undefined;
  const noTags = input.replace(/<\/?[^>]+>/g, " ");
  const decoded = noTags
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.replace(/\s+/g, " ").trim();
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "into", "over", "under", "after", "before",
]);

/** Canonical title fingerprint for dedup / fuzzy matching. */
export function titleFingerprint(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 2)
    .filter((t) => !STOP_WORDS.has(t))
    .sort()
    .join(" ");
}
