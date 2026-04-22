import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import {
  deleteRecommendedBooks as deleteBooks,
  deleteRecommendedBooksForJournal,
  getGoal,
  getJournalEntry,
} from "@/src/db";

export const deleteRecommendedBooks: NonNullable<MutationResolvers['deleteRecommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const { goalId, journalEntryId } = args;

  if (journalEntryId) {
    try {
      await getJournalEntry(journalEntryId, userEmail);
    } catch {
      throw new GraphQLError("Not found", {
        extensions: { code: "NOT_FOUND" },
      });
    }
    const deletedCount = await deleteRecommendedBooksForJournal(journalEntryId);
    return {
      success: true,
      message: `Deleted ${deletedCount} book recommendation${deletedCount === 1 ? "" : "s"}.`,
      deletedCount,
    };
  }

  if (!goalId) {
    return {
      success: false,
      message: "goalId or journalEntryId is required",
      deletedCount: 0,
    };
  }

  try {
    await getGoal(goalId, userEmail);
  } catch {
    throw new GraphQLError("Not found", {
      extensions: { code: "NOT_FOUND" },
    });
  }

  const deletedCount = await deleteBooks(goalId);

  return {
    success: true,
    message: `Deleted ${deletedCount} book recommendation${deletedCount === 1 ? "" : "s"}.`,
    deletedCount,
  };
};
