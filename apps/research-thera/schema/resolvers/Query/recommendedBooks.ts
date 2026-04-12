import type { QueryResolvers } from "./../../types.generated";
import { listRecommendedBooks } from "@/src/db";

export const recommendedBooks: NonNullable<QueryResolvers['recommendedBooks']> = async (_parent, args, _ctx) => {
  return listRecommendedBooks(args.goalId);
};
