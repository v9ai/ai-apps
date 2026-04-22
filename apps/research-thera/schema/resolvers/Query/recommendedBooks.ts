import type { QueryResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import {
  db,
  listRecommendedBooks,
  listRecommendedBooksForJournal,
} from "@/src/db";

export const recommendedBooks: NonNullable<QueryResolvers['recommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const { goalId, journalEntryId } = args;

  if (journalEntryId) {
    try {
      await db.getJournalEntry(journalEntryId, userEmail);
    } catch {
      throw new GraphQLError("Not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    return listRecommendedBooksForJournal(journalEntryId);
  }

  if (!goalId) {
    throw new GraphQLError("goalId or journalEntryId is required", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  // recommended_books has no user_id; ownership flows through goal_id.
  // goals.user_id is email-keyed (see getGoal / deleteGoal).
  try {
    await db.getGoal(goalId, userEmail);
  } catch {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  return listRecommendedBooks(goalId);
};
