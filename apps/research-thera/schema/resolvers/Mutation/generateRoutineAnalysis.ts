import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateRoutineAnalysis: NonNullable<MutationResolvers['generateRoutineAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { familyMemberId } = args;
  await db.assertOwnsFamilyMember(familyMemberId, userEmail);

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "ROUTINE_ANALYSIS");

  const isRo = await isRoGoal({ userEmail, familyMemberId });

  runGraphAndWait("routine_analysis", {
    input: {
      family_member_id: familyMemberId,
      user_email: userEmail,
      language: isRo ? "ro" : "en",
    },
  })
    .then(async (r) => {
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
    })
    .catch(async (err) => {
      const message = err instanceof Error ? err.message : "Routine analysis failed";
      console.error("[generateRoutineAnalysis] LangGraph error:", message);
      await db.updateGenerationJob(jobId, {
        status: "FAILED",
        error: JSON.stringify({ message }),
      });
    });

  return {
    success: true,
    message: "Routine analysis started",
    jobId,
  };
};
