import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const generateRecommendedBooks: NonNullable<MutationResolvers['generateRecommendedBooks']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { goalId, journalEntryId } = args;
  if (!goalId && !journalEntryId) {
    return {
      success: false,
      message: "goalId or journalEntryId is required",
      jobId: null,
      books: [],
    };
  }

  if (goalId) {
    try {
      await db.getGoal(goalId, userEmail);
    } catch {
      throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
    }
  }
  if (journalEntryId) {
    try {
      await db.getJournalEntry(journalEntryId, userEmail);
    } catch {
      throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
    }
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(
    jobId,
    userEmail,
    "RECOMMENDED_BOOKS",
    goalId ?? null,
  );

  const input: Record<string, unknown> = { user_email: userEmail };
  if (goalId) input.goal_id = goalId;
  if (journalEntryId) input.journal_entry_id = journalEntryId;

  runGraphAndWait("books", { input })
    .then(async (r) => {
      const success = Boolean(r?.success);
      const message = (r?.message as string | undefined) ?? "";
      const books = (r?.books as unknown[] | undefined) ?? [];
      const errorText = r?.error as string | undefined;

      if (errorText || (!success && !books.length)) {
        await db.updateGenerationJob(jobId, {
          status: "FAILED",
          error: JSON.stringify({ message: errorText || message || "Books generation failed" }),
        });
        return;
      }

      await db.updateGenerationJob(jobId, {
        status: "SUCCEEDED",
        progress: 100,
        result: JSON.stringify({ message, count: books.length }),
      });
    })
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : "Books generation failed";
      console.error("[generateRecommendedBooks] LangGraph error:", message);
      await db.updateGenerationJob(jobId, {
        status: "FAILED",
        error: JSON.stringify({ message }),
      });
    });

  return {
    success: true,
    message: "Books generation started",
    jobId,
    books: [],
  };
};
