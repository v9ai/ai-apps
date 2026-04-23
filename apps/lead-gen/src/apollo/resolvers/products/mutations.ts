import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import {
  analyzeProductGTM,
  analyzeProductICP,
  analyzeProductPricing,
  enhanceProductIcpTeam,
  runFullProductIntel,
} from "@/lib/langgraph-client";
import type {
  MutationUpsertProductArgs,
  MutationDeleteProductArgs,
  MutationAnalyzeProductIcpArgs,
  MutationEnhanceProductIcpArgs,
  MutationAnalyzeProductPricingArgs,
  MutationAnalyzeProductGtmArgs,
  MutationRunFullProductIntelArgs,
  MutationSetProductPublishedArgs,
  MutationSetProductPositioningArgs,
  MutationSetProductPricingAnalysisArgs,
} from "@/__generated__/resolvers-types";

// Products are a global SaaS catalog (see queries.ts). Writes use the
// unscoped http db so admins can mutate rows regardless of tenant cookie.
// Access is gated by isAdminEmail() — same guard as before.

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

export const productMutations = {
  async upsertProduct(
    _parent: unknown,
    args: MutationUpsertProductArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const now = new Date().toISOString();
    const domain = extractDomain(args.input.url);

    const [row] = await db
      .insert(products)
      .values({
        name: args.input.name,
        url: args.input.url,
        domain,
        description: args.input.description ?? null,
        created_by: context.userEmail ?? null,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [products.tenant_id, products.url],
        set: {
          name: args.input.name,
          domain,
          description: args.input.description ?? null,
          updated_at: now,
        },
      })
      .returning();

    return row;
  },

  async deleteProduct(
    _parent: unknown,
    args: MutationDeleteProductArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);
    await db.delete(products).where(eq(products.id, args.id));
    return true;
  },

  async analyzeProductICP(
    _parent: unknown,
    args: MutationAnalyzeProductIcpArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const result = await analyzeProductICP({ productId: args.id });
    const now = new Date().toISOString();

    const [row] = await db
      .update(products)
      .set({
        icp_analysis: result as unknown as Record<string, unknown>,
        icp_analyzed_at: now,
        updated_at: now,
      })
      .where(eq(products.id, args.id))
      .returning();

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },

  async enhanceProductIcp(
    _parent: unknown,
    args: MutationEnhanceProductIcpArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const result = await enhanceProductIcpTeam({ productId: args.id });
    const now = new Date().toISOString();

    const [row] = await db
      .update(products)
      .set({
        icp_analysis: result as unknown as Record<string, unknown>,
        icp_analyzed_at: now,
        updated_at: now,
      })
      .where(eq(products.id, args.id))
      .returning();

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },

  async analyzeProductPricing(
    _parent: unknown,
    args: MutationAnalyzeProductPricingArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    // The pricing graph writes pricing_analysis + pricing_analyzed_at via
    // asyncpg inside its `write_rationale` node — it's the source of truth.
    // We just re-read the row so the resolver response has the latest state
    // without a second, racing UPDATE with a different timestamp.
    await analyzeProductPricing({ productId: args.id });

    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, args.id));

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },

  async analyzeProductGTM(
    _parent: unknown,
    args: MutationAnalyzeProductGtmArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    // Same pattern: gtm_graph.draft_plan is the single writer.
    await analyzeProductGTM({ productId: args.id });

    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, args.id));

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },

  async runFullProductIntel(
    _parent: unknown,
    args: MutationRunFullProductIntelArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    // product_intel_graph persists pricing/gtm/intel_report across its nodes.
    // Re-read the row instead of issuing a second UPDATE.
    await runFullProductIntel({ productId: args.id });

    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, args.id));

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },

  async setProductPublished(
    _parent: unknown,
    args: MutationSetProductPublishedArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const now = new Date().toISOString();
    const [row] = await db
      .update(products)
      .set({
        published_at: args.published ? new Date() : null,
        updated_at: now,
      })
      .where(eq(products.id, args.id))
      .returning();

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },

  async setProductPositioning(
    _parent: unknown,
    args: MutationSetProductPositioningArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const input = (args.positioning ?? {}) as Record<string, unknown>;
    const stamped = {
      ...input,
      authored_by: "claude-team",
      authored_at: new Date().toISOString(),
    };

    const [row] = await db
      .update(products)
      .set({ positioning_analysis: stamped, updated_at: new Date().toISOString() })
      .where(eq(products.id, args.id))
      .returning();

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },

  async setProductPricingAnalysis(
    _parent: unknown,
    args: MutationSetProductPricingAnalysisArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const input = (args.pricing ?? {}) as Record<string, unknown>;
    const stamped = {
      ...input,
      authored_by: "claude-team",
      authored_at: new Date().toISOString(),
    };

    const now = new Date().toISOString();
    const [row] = await db
      .update(products)
      .set({
        pricing_analysis: stamped,
        pricing_analyzed_at: now,
        updated_at: now,
      })
      .where(eq(products.id, args.id))
      .returning();

    if (!row) {
      throw new GraphQLError(`Product ${args.id} not found`, {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return row;
  },
};
