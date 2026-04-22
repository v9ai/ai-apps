import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateJournalAnalysis: NonNullable<MutationResolvers['generateJournalAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { journalEntryId } = args;
  const entry = await db.getJournalEntry(journalEntryId, userEmail);
  if (!entry) throw new Error("Journal entry not found");

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "DEEP_ANALYSIS");

  const isRo = await isRoGoal({ userEmail, journalEntryId });

  runGraphAndWait("journal_analysis", {
    input: {
      journal_entry_id: journalEntryId,
      user_email: userEmail,
      language: isRo ? "ro" : "en",
    },
  }).then(async (r) => {
    const analysisId = r?.analysis_id as number | undefined;
    const error = r?.error as string | undefined;

    if (error) {
      await db.updateGenerationJob(jobId, {
        status: "FAILED",
        error: JSON.stringify({ message: error }),
      });
    } else {
      await db.updateGenerationJob(jobId, {
        status: "SUCCEEDED",
        progress: 100,
        result: JSON.stringify({ analysisId }),
      });
    }
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "Journal analysis failed";
    console.error("[generateJournalAnalysis] LangGraph error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message }),
    });
  });

  return {
    success: true,
    message: "Journal deep analysis started",
    jobId,
    analysis: null,
  };
};
