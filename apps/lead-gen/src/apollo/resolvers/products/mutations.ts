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

    // The pricing graph writes its own pricing_analysis row via asyncpg inside
    // the `write_rationale` node, but we also persist here so the GraphQL
    // response always carries the latest value (write_rationale + our UPDATE
    // race is harmless — same value).
    const { pricing } = await analyzeProductPricing({ productId: args.id });
    const now = new Date().toISOString();

    const [row] = await db
      .update(products)
      .set({
        pricing_analysis: pricing as unknown as Record<string, unknown>,
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

  async analyzeProductGTM(
    _parent: unknown,
    args: MutationAnalyzeProductGtmArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    const { gtm } = await analyzeProductGTM({ productId: args.id });
    const now = new Date().toISOString();

    const [row] = await db
      .update(products)
      .set({
        gtm_analysis: gtm as unknown as Record<string, unknown>,
        gtm_analyzed_at: now,
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

  async runFullProductIntel(
    _parent: unknown,
    args: MutationRunFullProductIntelArgs,
    context: GraphQLContext,
  ) {
    requireAdmin(context);

    // Supervisor persists pricing/gtm/intel_report internally. We still re-read
    // the row so the resolver returns the latest state.
    const { report } = await runFullProductIntel({ productId: args.id });
    const now = new Date().toISOString();

    const [row] = await db
      .update(products)
      .set({
        intel_report: report as unknown as Record<string, unknown>,
        intel_report_at: now,
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
