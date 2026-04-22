import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { listAllRecommendedBooks } from "@/src/db";

export const allRecommendedBooks: NonNullable<QueryResolvers['allRecommendedBooks']> = async (
  _parent,
  args,
  ctx,
) => {
  if (!ctx.userId) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return listAllRecommendedBooks({ category: args.category ?? undefined });
};
