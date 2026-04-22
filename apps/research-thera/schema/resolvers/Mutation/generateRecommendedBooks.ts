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
  await db.createGenerationJob(jobId, userEmail, "RECOMMENDED_BOOKS", goalId ?? null);

  const input: Record<string, unknown> = { user_email: userEmail, job_id: jobId };
  if (goalId) input.goal_id = goalId;
  if (journalEntryId) input.journal_entry_id = journalEntryId;

  // Fire-and-forget: Python writes progress/terminal state to generation_jobs directly,
  // so the frontend poll on /jobs/[id] sees the DB row advance.
  runGraphAndWait("books", { input }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateRecommendedBooks] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
  });

  return {
    success: true,
    message: "Books generation started",
    jobId,
    books: [],
  };
};
