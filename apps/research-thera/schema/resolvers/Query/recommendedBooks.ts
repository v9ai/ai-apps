import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db, listRecommendedBooks } from "@/src/db";

export const recommendedBooks: NonNullable<QueryResolvers['recommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  // recommended_books has no user_id; ownership flows through goal_id.
  // goals.user_id is email-keyed (see getGoal / deleteGoal).
  try {
    await db.getGoal(args.goalId, userEmail);
  } catch {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  return listRecommendedBooks(args.goalId);
};
