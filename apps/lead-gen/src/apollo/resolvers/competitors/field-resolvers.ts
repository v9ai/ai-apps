import type {
  CompetitorAnalysis as DbCompetitorAnalysis,
  Competitor as DbCompetitor,
  CompetitorPricingTier as DbPricingTier,
  CompetitorFeature as DbFeature,
  CompetitorIntegration as DbIntegration,
} from "@/db/schema";
import type { GraphQLContext } from "../../context";

export const CompetitorAnalysisField = {
  createdBy: (p: DbCompetitorAnalysis) => p.created_by ?? null,
  createdAt: (p: DbCompetitorAnalysis) => p.created_at,
  updatedAt: (p: DbCompetitorAnalysis) => p.updated_at,
  async product(p: DbCompetitorAnalysis, _a: unknown, ctx: GraphQLContext) {
    return ctx.loaders.productsById.load(p.product_id);
  },
  async competitors(p: DbCompetitorAnalysis, _a: unknown, ctx: GraphQLContext) {
    return ctx.loaders.competitorsByAnalysis.load(p.id);
  },
};

export const CompetitorField = {
  analysisId: (p: DbCompetitor) => p.analysis_id,
  logoUrl: (p: DbCompetitor) => p.logo_url ?? null,
  positioningHeadline: (p: DbCompetitor) => p.positioning_headline ?? null,
  positioningTagline: (p: DbCompetitor) => p.positioning_tagline ?? null,
  targetAudience: (p: DbCompetitor) => p.target_audience ?? null,
  scrapedAt: (p: DbCompetitor) => p.scraped_at ?? null,
  scrapeError: (p: DbCompetitor) => p.scrape_error ?? null,
  createdAt: (p: DbCompetitor) => p.created_at,
  async pricingTiers(p: DbCompetitor, _a: unknown, ctx: GraphQLContext) {
    return ctx.loaders.competitorPricingTiersByCompetitor.load(p.id);
  },
  async features(p: DbCompetitor, _a: unknown, ctx: GraphQLContext) {
    return ctx.loaders.competitorFeaturesByCompetitor.load(p.id);
  },
  async integrations(p: DbCompetitor, _a: unknown, ctx: GraphQLContext) {
    return ctx.loaders.competitorIntegrationsByCompetitor.load(p.id);
  },
};

export const PricingTierField = {
  tierName: (p: DbPricingTier) => p.tier_name,
  monthlyPriceUsd: (p: DbPricingTier) => p.monthly_price_usd ?? null,
  annualPriceUsd: (p: DbPricingTier) => p.annual_price_usd ?? null,
  seatPriceUsd: (p: DbPricingTier) => p.seat_price_usd ?? null,
  includedLimits: (p: DbPricingTier) => p.included_limits ?? null,
  isCustomQuote: (p: DbPricingTier) => p.is_custom_quote,
  sortOrder: (p: DbPricingTier) => p.sort_order,
};

export const CompetitorFeatureField = {
  tierName: (p: DbFeature) => p.tier_name ?? null,
  featureText: (p: DbFeature) => p.feature_text,
};

export const CompetitorIntegrationField = {
  integrationName: (p: DbIntegration) => p.integration_name,
  integrationUrl: (p: DbIntegration) => p.integration_url ?? null,
};
