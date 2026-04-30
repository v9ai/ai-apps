export function coerceExternalUrl(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, "")}`;
}

export function prettyUrl(raw?: string | null): string {
  if (!raw) return "";
  return raw.trim().replace(/^https?:\/\//i, "").replace(/\/+$/g, "");
}

export function extractCompetitors(markdown?: string | null): string[] {
  if (!markdown) return [];
  const match = markdown.match(/\*\*Competitors:\*\*\s*([^\n]+)/i);
  if (!match) return [];
  return match[1]
    .split(/[,;]/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

export function extractCrawlMeta(
  markdown?: string | null,
): { pages: number; date: string } | null {
  if (!markdown) return null;
  const match = markdown.match(
    /Enriched via Crawl4AI deep crawl \((\d+) pages?\) on (\d{4}-\d{2}-\d{2})/i,
  );
  if (!match) return null;
  return { pages: Number(match[1]), date: match[2] };
}

export const CATEGORY_COLORS: Record<string, string> = {
  PRODUCT: "blue",
  CONSULTANCY: "violet",
  AGENCY: "amber",
  STAFFING: "green",
  DIRECTORY: "cyan",
  OTHER: "gray",
  UNKNOWN: "gray",
};

export function scoreColor(score?: number | null): "green" | "amber" | "red" | "gray" {
  if (score == null || !Number.isFinite(score)) return "gray";
  if (score >= 0.7) return "green";
  if (score >= 0.4) return "amber";
  return "red";
}

const META_TAG_PREFIXES = ["leadgen-", "pricing:", "market:", "funding:", "remote:"];

export function cleanCompanyTags(tags: string[] | null | undefined, industries: string[] = []): string[] {
  return (tags ?? []).filter((t) => {
    if (!t || META_TAG_PREFIXES.some((p) => t.startsWith(p))) return false;
    if (t.length > 28) return false;
    return !industries.includes(t);
  });
}
