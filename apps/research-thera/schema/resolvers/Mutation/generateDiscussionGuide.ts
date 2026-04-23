import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateDiscussionGuide: NonNullable<MutationResolvers['generateDiscussionGuide']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { journalEntryId } = args;
  const entry = await db.getJournalEntry(journalEntryId, userEmail);
  if (!entry) throw new Error("Journal entry not found");

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "DISCUSSION_GUIDE");

  // Clear any stale guide so the frontend's polling refetch doesn't return old content.
  await db.deleteDiscussionGuide(journalEntryId, userEmail);

  const isRo = await isRoGoal({ userEmail, journalEntryId });

  try {
    const { threadId, runId } = await startGraphRun("discussion_guide", {
      input: {
        journal_entry_id: journalEntryId,
        user_email: userEmail,
        job_id: jobId,
        is_ro: isRo,
      },
    });
    await db.setGenerationJobLangGraphIds(jobId, threadId, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateDiscussionGuide] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
  }

  return {
    success: true,
    message: "Discussion guide generation started",
    jobId,
  };
};
