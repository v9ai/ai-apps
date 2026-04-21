import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import type {
  QueryProductArgs,
  QueryProductBySlugArgs,
  QueryProductsArgs,
} from "@/__generated__/resolvers-types";
import { slugify } from "@/lib/slug";

// Products are the SaaS's own catalog (see /products) — not per-tenant data.
// Use the unscoped http db so the catalog is visible regardless of the
// caller's tenant cookie. Write-side guard is isAdminEmail() in mutations.ts.

export const productQueries = {
  async product(_parent: unknown, args: QueryProductArgs) {
    const [row] = await db
      .select()
      .from(products)
      .where(eq(products.id, args.id));
    return row ?? null;
  },

  async productBySlug(_parent: unknown, args: QueryProductBySlugArgs) {
    const slug = args.slug.toLowerCase();
    const rows = await db.select().from(products);
    return rows.find((p) => slugify(p.name) === slug) ?? null;
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
