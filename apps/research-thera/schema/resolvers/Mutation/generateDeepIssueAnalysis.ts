import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateDeepIssueAnalysis: NonNullable<MutationResolvers['generateDeepIssueAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { familyMemberId, triggerIssueId } = args;
  await db.assertOwnsFamilyMember(familyMemberId, userEmail);

  // If a trigger issue was supplied, it must belong to the caller AND to the
  // supplied familyMemberId — otherwise an owner of multiple family members could
  // mis-route an analysis (issue belongs to family member B, analysis filed under A).
  if (triggerIssueId) {
    const issue = await db.getIssue(triggerIssueId, userEmail);
    if (!issue) throw new Error("Issue not found");
    if (issue.familyMemberId !== familyMemberId) {
      throw new Error("Issue does not belong to the specified family member");
    }
  }

  // Clean up stale jobs
  await db.cleanupStaleJobs(15);

  // Create tracking job
  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "DEEP_ANALYSIS");

  const isRo = await isRoGoal({ userEmail, familyMemberId, issueId: triggerIssueId });

  // Fire-and-forget — call LangGraph deep_analysis graph
  runGraphAndWait("deep_analysis", {
    input: {
      family_member_id: familyMemberId,
      trigger_issue_id: triggerIssueId ?? null,
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
    console.error("[generateDeepIssueAnalysis] LangGraph error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message }),
    });
  });

  return {
    success: true,
    message: "Deep issue analysis started",
    jobId,
  };
};
