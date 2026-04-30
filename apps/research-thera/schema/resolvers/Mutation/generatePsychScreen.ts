import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";

export const generatePsychScreen: NonNullable<MutationResolvers["generatePsychScreen"]> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  let familyMemberId = args.familyMemberId ?? null;
  if (!familyMemberId) {
    // Default to Bogdan when caller omits the arg — matches the existing
    // generateBogdanDiscussion convenience pattern.
    const bogdan = await db.findFamilyMemberByFirstName(userEmail, "bogdan");
    if (!bogdan) {
      throw new Error("familyMemberId is required (no 'Bogdan' family member found for this user)");
    }
    familyMemberId = bogdan.id;
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "PSYCH_SCREEN");

  const language = (args.language || "ro").toLowerCase();
  const isRo = language.startsWith("ro");

  try {
    const { threadId, runId } = await startGraphRun("psych_screen", {
      input: {
        user_email: userEmail,
        family_member_id: familyMemberId,
        job_id: jobId,
        language,
        is_ro: isRo,
      },
    });
    await db.setGenerationJobLangGraphIds(jobId, threadId, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generatePsychScreen] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
  }

  return {
    success: true,
    message: "Psych screening assessment generation started",
    jobId,
  };
};
