import type { Product as DbProduct } from "@/db/schema";
import { slugify } from "@/lib/slug";

export const ProductField = {
  // Prefer the generated DB column (populated by migration 0059); fall back to
  // slugify(name) for rows created before the column existed or in tests that
  // build Product objects by hand.
  slug: (p: DbProduct) => p.slug ?? slugify(p.name),
  createdBy: (p: DbProduct) => p.created_by ?? null,
  createdAt: (p: DbProduct) => p.created_at,
  updatedAt: (p: DbProduct) => p.updated_at,
  domain: (p: DbProduct) => p.domain ?? null,
  description: (p: DbProduct) => p.description ?? null,
  highlights: (p: DbProduct) => p.highlights ?? null,
  icpAnalysis: (p: DbProduct) => p.icp_analysis ?? null,
  icpAnalyzedAt: (p: DbProduct) => p.icp_analyzed_at ?? null,
  pricingAnalysis: (p: DbProduct) => p.pricing_analysis ?? null,
  pricingAnalyzedAt: (p: DbProduct) => p.pricing_analyzed_at ?? null,
  gtmAnalysis: (p: DbProduct) => p.gtm_analysis ?? null,
  gtmAnalyzedAt: (p: DbProduct) => p.gtm_analyzed_at ?? null,
  intelReport: (p: DbProduct) => p.intel_report ?? null,
  intelReportAt: (p: DbProduct) => p.intel_report_at ?? null,
};
