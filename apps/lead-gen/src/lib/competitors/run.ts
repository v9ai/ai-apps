import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  competitorAnalyses,
  competitors,
  competitorPricingTiers,
  competitorFeatures,
  competitorIntegrations,
} from "@/db/schema";
import { scrapeCompetitor } from "./scrape";
import type { ScrapedCompetitor } from "./schemas";

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function persistScraped(competitorId: number, scraped: ScrapedCompetitor): Promise<void> {
  await db.delete(competitorPricingTiers).where(eq(competitorPricingTiers.competitor_id, competitorId));
  await db.delete(competitorFeatures).where(eq(competitorFeatures.competitor_id, competitorId));
  await db.delete(competitorIntegrations).where(eq(competitorIntegrations.competitor_id, competitorId));

  if (scraped.pricingTiers.length > 0) {
    await db.insert(competitorPricingTiers).values(
      scraped.pricingTiers.map((tier, idx) => ({
        competitor_id: competitorId,
        tier_name: tier.tierName,
        monthly_price_usd: tier.monthlyPriceUsd ?? null,
        annual_price_usd: tier.annualPriceUsd ?? null,
        seat_price_usd: tier.seatPriceUsd ?? null,
        currency: tier.currency ?? "USD",
        included_limits: tier.includedLimits ?? null,
        is_custom_quote: tier.isCustomQuote ?? false,
        sort_order: idx,
      })),
    );
  }

  if (scraped.features.length > 0) {
    await db.insert(competitorFeatures).values(
      scraped.features.map((f) => ({
        competitor_id: competitorId,
        tier_name: f.tierName ?? null,
        feature_text: f.featureText,
        category: f.category ?? null,
      })),
    );
  }

  if (scraped.integrations.length > 0) {
    await db.insert(competitorIntegrations).values(
      scraped.integrations.map((i) => ({
        competitor_id: competitorId,
        integration_name: i.integrationName,
        integration_url: i.integrationUrl ?? null,
        category: i.category ?? null,
      })),
    );
  }
}

export async function runCompetitorScrape(competitorId: number): Promise<void> {
  const [row] = await db.select().from(competitors).where(eq(competitors.id, competitorId));
  if (!row) return;

  await db
    .update(competitors)
    .set({ status: "scraping", scrape_error: null, updated_at: new Date().toISOString() })
    .where(eq(competitors.id, competitorId));

  try {
    const scraped = await scrapeCompetitor(row.url);
    await persistScraped(competitorId, scraped);
    await db
      .update(competitors)
      .set({
        status: "done",
        domain: row.domain ?? extractDomain(row.url),
        description: scraped.description ?? row.description,
        logo_url: scraped.logoUrl ?? row.logo_url,
        positioning_headline: scraped.positioningHeadline ?? row.positioning_headline,
        positioning_tagline: scraped.positioningTagline ?? row.positioning_tagline,
        target_audience: scraped.targetAudience ?? row.target_audience,
        scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(competitors.id, competitorId));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(competitors)
      .set({
        status: "failed",
        scrape_error: message,
        updated_at: new Date().toISOString(),
      })
      .where(eq(competitors.id, competitorId));
  }
}

export async function runAnalysis(analysisId: number): Promise<void> {
  await db
    .update(competitorAnalyses)
    .set({ status: "scraping", error: null, updated_at: new Date().toISOString() })
    .where(eq(competitorAnalyses.id, analysisId));

  const rows = await db
    .select()
    .from(competitors)
    .where(eq(competitors.analysis_id, analysisId));
  const approved = rows.filter((r) => r.status === "approved" || r.status === "failed");

  for (const row of approved) {
    await runCompetitorScrape(row.id);
  }

  const final = await db.select().from(competitors).where(eq(competitors.analysis_id, analysisId));
  const anyFailed = final.some((r) => r.status === "failed");
  const allDone = final.every((r) => r.status === "done" || r.status === "failed");

  await db
    .update(competitorAnalyses)
    .set({
      status: allDone ? (anyFailed && final.every((r) => r.status === "failed") ? "failed" : "done") : "scraping",
      updated_at: new Date().toISOString(),
    })
    .where(eq(competitorAnalyses.id, analysisId));
}
