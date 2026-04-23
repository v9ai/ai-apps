import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import type {
  QueryProductArgs,
  QueryProductBySlugArgs,
  QueryProductsArgs,
} from "@/__generated__/resolvers-types";

// Products are the SaaS's own catalog (see /products) — not per-tenant data.
// Use the unscoped http db so the catalog is visible regardless of the
// caller's tenant cookie. Write-side guard is isAdminEmail() in mutations.ts.
//
// READ ACCESS IS INTENTIONALLY PUBLIC — including the four AI-analysis jsonb
// columns (icp_analysis, pricing_analysis, gtm_analysis, intel_report). These
// power the marketing-facing /products page and case-study content, so anon
// visitors need to see them. Anything that should NOT be public must live in
// a tenant-scoped table, not on this row. Confirmed with user 2026-04-23.
//
// If this ever needs to change, the cheapest fix is a requireAuth() on each
// resolver below — the rest of the API already assumes auth.

export const productQueries = {
  async product(_parent: unknown, args: QueryProductArgs) {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, args.id));
    return row ?? null;
  },

  async productBySlug(_parent: unknown, args: QueryProductBySlugArgs) {
    // Uses the generated `slug` column + unique index (see migration 0059).
    // O(log n) instead of the previous full-table-scan + in-memory slugify.
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.slug, args.slug.toLowerCase()))
      .limit(1);
    return row ?? null;
  },

  async products(_parent: unknown, args: QueryProductsArgs) {
    const limit = Math.min(args.limit ?? 200, 500);
    const offset = args.offset ?? 0;
    return db
      .select()
      .from(products)
      .orderBy(desc(products.created_at))
      .limit(limit)
      .offset(offset);
  },
};
