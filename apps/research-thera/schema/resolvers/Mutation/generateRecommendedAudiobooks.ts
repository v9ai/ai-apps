import type { MutationResolvers } from "./../../types.generated";
import { GraphQLError } from "graphql";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";

export const generateRecommendedAudiobooks: NonNullable<MutationResolvers['generateRecommendedAudiobooks']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { goalId, familyMemberId } = args;
  if (!goalId && !familyMemberId) {
    return {
      success: false,
      message: "goalId or familyMemberId is required",
      jobId: null,
      audiobooks: [],
    };
  }

  if (goalId) {
    try {
      await db.getGoal(goalId, userEmail);
    } catch {
      throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
    }
  }
  if (familyMemberId) {
    const fm = await db.getFamilyMember(familyMemberId);
    if (!fm || fm.userId !== userEmail) {
      throw new GraphQLError("Not found", { extensions: { code: "NOT_FOUND" } });
    }
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "RECOMMENDED_AUDIOBOOKS", goalId ?? null);

  const input: Record<string, unknown> = { user_email: userEmail, job_id: jobId };
  if (goalId) input.goal_id = goalId;
  if (familyMemberId) input.family_member_id = familyMemberId;

  runGraphAndWait("audiobooks", { input }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateRecommendedAudiobooks] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
  });

  return {
    success: true,
    message: "Audiobooks generation started",
    jobId,
    audiobooks: [],
  };
};
