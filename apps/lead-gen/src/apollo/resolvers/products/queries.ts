import { desc, eq } from "drizzle-orm";
import { products } from "@/db/schema";
import type { GraphQLContext } from "../../context";
import type {
  QueryProductArgs,
  QueryProductsArgs,
} from "@/__generated__/resolvers-types";

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
