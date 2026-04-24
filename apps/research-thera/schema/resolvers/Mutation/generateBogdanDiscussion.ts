import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";

export const generateBogdanDiscussion: NonNullable<MutationResolvers['generateBogdanDiscussion']> = async (
  _parent,
  _args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const bogdan = await db.findFamilyMemberByFirstName(userEmail, "bogdan");
  if (!bogdan) {
    throw new Error("No family member named 'Bogdan' found for this user");
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "BOGDAN_DISCUSSION");

  try {
    const { threadId, runId } = await startGraphRun("bogdan_discussion", {
      input: {
        user_email: userEmail,
        family_member_id: bogdan.id,
        job_id: jobId,
        is_ro: true,
      },
    });
    await db.setGenerationJobLangGraphIds(jobId, threadId, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateBogdanDiscussion] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
  }

  return {
    success: true,
    message: "Bogdan discussion guide generation started",
    jobId,
  };
};
