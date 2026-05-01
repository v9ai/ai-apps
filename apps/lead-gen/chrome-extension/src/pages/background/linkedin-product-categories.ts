// LinkedIn product-search category IDs we care about, mapped to the
// service_taxonomy values that drive the /companies?tab=sales-tech filter.
//
// Source URL shape:
//   https://www.linkedin.com/search/results/products/?productCategory=%5B%221270%22%5D&page=...
// Decoded productCategory is a JSON array of stringified numeric IDs.
//
// Add new IDs here when expanding the sales-tech tab (or other tabs that
// filter on service_taxonomy via CompaniesList).

export const LINKEDIN_PRODUCT_CATEGORY_TO_TAXONOMY: Record<string, string[]> = {
  "1270": ["Sales Engagement Platform"],
  "1181": ["Lead Generation Software"],
};

export function parseProductCategoriesFromUrl(rawUrl: string | undefined): string[] {
  if (!rawUrl) return [];
  try {
    const u = new URL(rawUrl);
    const raw = u.searchParams.get("productCategory");
    if (!raw) return [];
    // Param value is a JSON-array string: ["1270"] or ["1270","1181"]
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v)).filter((v) => v.length > 0);
  } catch {
    return [];
  }
}

export function taxonomyForCategoryIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const labels = LINKEDIN_PRODUCT_CATEGORY_TO_TAXONOMY[id];
    if (!labels) continue;
    for (const label of labels) {
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(label);
    }
  }
  return out;
}
