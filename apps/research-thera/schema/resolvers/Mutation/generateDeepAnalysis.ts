import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateDeepAnalysis: NonNullable<MutationResolvers['generateDeepAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { subjectType, subjectId, triggerType, triggerId } = args;

  // Ownership check — dispatch by subject type. Each helper throws NOT_FOUND on mismatch.
  switch (subjectType) {
    case "GOAL":
      await db.assertOwnsGoal(subjectId, userEmail);
      break;
    case "NOTE":
      await db.assertOwnsNote(subjectId, userEmail);
      break;
    case "JOURNAL_ENTRY":
      await db.assertOwnsJournalEntry(subjectId, userEmail);
      break;
    case "FAMILY_MEMBER":
      await db.assertOwnsFamilyMember(subjectId, userEmail);
      break;
    default:
      throw new Error(`Unsupported subjectType: ${subjectType}`);
  }

  // Optional trigger validation — only ISSUE is meaningful right now.
  if (triggerType === "ISSUE" && triggerId) {
    const issue = await db.getIssue(triggerId, userEmail);
    if (!issue) throw new Error("Trigger issue not found");
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "DEEP_ANALYSIS");

  // Language detection — re-use the existing per-entity Romanian probe. isRoGoal
  // accepts goalId / issueId / journalEntryId / familyMemberId and returns true
  // if the relevant context looks Romanian.
  const langProbe: {
    userEmail: string;
    goalId?: number;
    journalEntryId?: number;
    familyMemberId?: number;
    issueId?: number;
  } = { userEmail };
  if (subjectType === "GOAL") langProbe.goalId = subjectId;
  else if (subjectType === "JOURNAL_ENTRY") langProbe.journalEntryId = subjectId;
  else if (subjectType === "FAMILY_MEMBER") langProbe.familyMemberId = subjectId;
  if (triggerType === "ISSUE" && triggerId) langProbe.issueId = triggerId;
  const isRo = await isRoGoal(langProbe);

  const graphSubjectType: Record<string, string> = {
    GOAL: "goal",
    NOTE: "note",
    JOURNAL_ENTRY: "journal_entry",
    FAMILY_MEMBER: "family_member",
  };
  const graphTriggerType: Record<string, string> = {
    ISSUE: "issue",
    OBSERVATION: "observation",
    FEEDBACK: "feedback",
  };

  runGraphAndWait("deep_analysis_v2", {
    input: {
      subject_type: graphSubjectType[subjectType],
      subject_id: subjectId,
      trigger_type: triggerType ? graphTriggerType[triggerType] ?? null : null,
      trigger_id: triggerId ?? null,
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
    const message = err instanceof Error ? err.message : "Deep analysis failed";
    console.error("[generateDeepAnalysis] LangGraph error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message }),
    });
  });

  return {
    success: true,
    message: "Deep analysis started",
    jobId,
  };
};
