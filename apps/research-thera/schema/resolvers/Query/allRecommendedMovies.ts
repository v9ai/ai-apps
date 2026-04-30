import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { listAllRecommendedMovies } from "@/src/db";

export const allRecommendedMovies: NonNullable<QueryResolvers['allRecommendedMovies']> = async (
  _parent,
  args,
  ctx,
) => {
  if (!ctx.userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }
  return listAllRecommendedMovies({
    category: args.category ?? undefined,
    familyMemberId: args.familyMemberId ?? undefined,
  });
};
