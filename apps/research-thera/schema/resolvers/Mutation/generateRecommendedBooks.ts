import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";

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
  await db.createGenerationJob(jobId, userEmail, "RECOMMENDED_BOOKS", goalId ?? null);

  const input: Record<string, unknown> = { user_email: userEmail };
  if (goalId) input.goal_id = goalId;
  if (journalEntryId) input.journal_entry_id = journalEntryId;

  try {
    const { threadId, runId } = await startGraphRun("books", { input });
    await db.setGenerationJobLangGraphIds(jobId, threadId, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start books run";
    console.error("[generateRecommendedBooks] LangGraph start error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message }),
    });
    return {
      success: false,
      message,
      jobId,
      books: [],
    };
  }

  return {
    success: true,
    message: "Books generation started",
    jobId,
    books: [],
  };
};
