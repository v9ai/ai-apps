import { desc, eq } from "drizzle-orm";
import { products } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import type {
  QueryProductArgs,
  QueryProductBySlugArgs,
  QueryProductsArgs,
} from "@/__generated__/resolvers-types";
import { slugify } from "@/lib/slug";

export const productQueries = {
  async product(
    _parent: unknown,
    args: QueryProductArgs,
    context: GraphQLContext,
  ) {
    const [row] = await context.db
      .select()
      .from(products)
      .where(eq(products.id, args.id));
    return row ?? null;
  },

  async productBySlug(
    _parent: unknown,
    args: QueryProductBySlugArgs,
    context: GraphQLContext,
  ) {
    const slug = args.slug.toLowerCase();
    // Slug is derived from name; no DB index, so scan within the tenant-scoped
    // set (RLS narrows it) and match in JS. Product counts per tenant are small.
    const rows = await context.db.select().from(products);
    return rows.find((p) => slugify(p.name) === slug) ?? null;
  },

  async products(
    _parent: unknown,
    args: QueryProductsArgs,
    context: GraphQLContext,
  ) {
    const limit = Math.min(args.limit ?? 200, 500);
    const offset = args.offset ?? 0;
    return context.db
      .select()
      .from(products)
      .orderBy(desc(products.created_at))
      .limit(limit)
      .offset(offset);
  },
};
