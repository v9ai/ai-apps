import { z } from "zod";

export const SuggestedCompetitorSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

export const SuggestedCompetitorsSchema = z.object({
  competitors: z.array(SuggestedCompetitorSchema).min(1).max(10),
});

export type SuggestedCompetitor = z.infer<typeof SuggestedCompetitorSchema>;

export const PricingTierSchema = z.object({
  tierName: z.string().min(1),
  monthlyPriceUsd: z.number().nullable().optional(),
  annualPriceUsd: z.number().nullable().optional(),
  seatPriceUsd: z.number().nullable().optional(),
  currency: z.string().default("USD"),
  includedLimits: z.record(z.union([z.string(), z.number(), z.boolean()])).nullable().optional(),
  isCustomQuote: z.boolean().default(false),
});

export const FeatureSchema = z.object({
  tierName: z.string().nullable().optional(),
  featureText: z.string().min(1),
  category: z.string().nullable().optional(),
});

export const IntegrationSchema = z.object({
  integrationName: z.string().min(1),
  integrationUrl: z.string().url().nullable().optional(),
  category: z.string().nullable().optional(),
});

export const ScrapedCompetitorSchema = z.object({
  description: z.string().nullable().optional(),
  positioningHeadline: z.string().nullable().optional(),
  positioningTagline: z.string().nullable().optional(),
  targetAudience: z.string().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  pricingTiers: z.array(PricingTierSchema).default([]),
  features: z.array(FeatureSchema).default([]),
  integrations: z.array(IntegrationSchema).default([]),
});

export type ScrapedCompetitor = z.infer<typeof ScrapedCompetitorSchema>;
