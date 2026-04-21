import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";
import {
  competitorAnalyses,
  competitors,
  products,
  type NewCompetitor,
} from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import type {
  MutationCreateCompetitorAnalysisArgs,
  MutationApproveCompetitorsArgs,
  MutationRescrapeCompetitorArgs,
  MutationDeleteCompetitorAnalysisArgs,
} from "@/__generated__/resolvers-types";
import { suggestCompetitors } from "@/lib/competitors/discover";

function requireAdmin(context: GraphQLContext): void {
  if (!context.userId) {
    throw new GraphQLError("Authentication required", { extensions: { code: "UNAUTHENTICATED" } });
  }
  if (!isAdminEmail(context.userEmail)) {
    throw new GraphQLError("Admin access required", { extensions: { code: "FORBIDDEN" } });
  }
}

function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

async function kickoffScrapeInBackground(analysisId: number, origin: string): Promise<void> {
  const secret = process.env.INTERNAL_WORKER_SECRET ?? "";
  try {
    await fetch(`${origin}/api/competitors/scrape`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-internal-secret": secret,
      },
      body: JSON.stringify({ analysisId }),
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[competitors] failed to kickoff scrape", err);
  }
}

export const competitorMutations = {
  async createCompetitorAnalysis(
    _parent: unknown,
    args: MutationCreateCompetitorAnalysisArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const [product] = await context.db
      .select()
      .from(products)
      .where(eq(products.id, args.productId));
    if (!product) {
      throw new GraphQLError("Product not found", { extensions: { code: "NOT_FOUND" } });
    }

    const now = new Date().toISOString();
    const [analysis] = await context.db
      .insert(competitorAnalyses)
      .values({
        product_id: product.id,
        status: "pending_approval",
        created_by: context.userEmail ?? null,
        created_at: now,
        updated_at: now,
      })
      .returning();

    try {
      const suggestions = await suggestCompetitors(product.name, product.url);
      if (suggestions.length > 0) {
        await context.db.insert(competitors).values(
          suggestions.map<NewCompetitor>((s) => ({
            analysis_id: analysis.id,
            name: s.name,
            url: s.url,
            domain: extractDomain(s.url),
            status: "suggested",
          })),
        );
      }
      return analysis;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await context.db
        .update(competitorAnalyses)
        .set({ status: "failed", error: `Discovery failed: ${message}`, updated_at: new Date().toISOString() })
        .where(eq(competitorAnalyses.id, analysis.id));
      throw new GraphQLError(`Failed to suggest competitors: ${message}`, {
        extensions: { code: "LLM_ERROR" },
      });
    }
  },

  async approveCompetitors(
    _parent: unknown,
    args: MutationApproveCompetitorsArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const [analysis] = await context.db
      .select()
      .from(competitorAnalyses)
      .where(eq(competitorAnalyses.id, args.analysisId));
    if (!analysis) {
      throw new GraphQLError("Analysis not found", { extensions: { code: "NOT_FOUND" } });
    }

    await context.db.delete(competitors).where(eq(competitors.analysis_id, args.analysisId));

    if (args.competitors.length > 0) {
      await context.db.insert(competitors).values(
        args.competitors.map<NewCompetitor>((c) => ({
          analysis_id: args.analysisId,
          name: c.name,
          url: c.url,
          domain: extractDomain(c.url),
          status: "approved",
        })),
      );
    }

    const now = new Date().toISOString();
    const [updated] = await context.db
      .update(competitorAnalyses)
      .set({ status: "scraping", error: null, updated_at: now })
      .where(eq(competitorAnalyses.id, args.analysisId))
      .returning();

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      "http://localhost:3000";
    kickoffScrapeInBackground(args.analysisId, origin);

    return updated;
  },

  async rescrapeCompetitor(
    _parent: unknown,
    args: MutationRescrapeCompetitorArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const [row] = await context.db
      .select()
      .from(competitors)
      .where(eq(competitors.id, args.competitorId));
    if (!row) {
      throw new GraphQLError("Competitor not found", { extensions: { code: "NOT_FOUND" } });
    }

    const now = new Date().toISOString();
    const [updated] = await context.db
      .update(competitors)
      .set({ status: "approved", scrape_error: null, updated_at: now })
      .where(eq(competitors.id, args.competitorId))
      .returning();

    await context.db
      .update(competitorAnalyses)
      .set({ status: "scraping", updated_at: now })
      .where(eq(competitorAnalyses.id, row.analysis_id));

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.APP_URL ??
      "http://localhost:3000";
    kickoffScrapeInBackground(row.analysis_id, origin);

    return updated;
  },

  async deleteCompetitorAnalysis(
    _parent: unknown,
    args: MutationDeleteCompetitorAnalysisArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    await context.db.delete(competitorAnalyses).where(eq(competitorAnalyses.id, args.id));
    return true;
  },
};
