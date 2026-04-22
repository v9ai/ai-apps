import type { QueryResolvers } from "./../../types.generated";
import { listAllRecommendedBooks } from "@/src/db";

export const allRecommendedBooks: NonNullable<QueryResolvers['allRecommendedBooks']> = async (
  _parent,
  args,
  _ctx,
) => {
  return listAllRecommendedBooks({ category: args.category ?? undefined });
};
