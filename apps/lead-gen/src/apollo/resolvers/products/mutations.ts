import { GraphQLError } from "graphql";
import { eq } from "drizzle-orm";
import { products } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import { isAdminEmail } from "@/lib/admin";
import { analyzeProductICP } from "@/lib/langgraph-client";
import type {
  MutationUpsertProductArgs,
  MutationDeleteProductArgs,
  MutationAnalyzeProductIcpArgs,
} from "@/__generated__/resolvers-types";

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

    const [row] = await context.db
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
    await context.db.delete(products).where(eq(products.id, args.id));
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

    const [row] = await context.db
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
};
