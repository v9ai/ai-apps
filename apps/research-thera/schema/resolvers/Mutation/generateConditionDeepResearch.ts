import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";

function normSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const generateConditionDeepResearch: NonNullable<MutationResolvers['generateConditionDeepResearch']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const conditionSlug = normSlug(args.slug || "");
  const memberSlug = normSlug(args.memberSlug || "");
  if (!conditionSlug) throw new Error("slug is required");
  if (!memberSlug) throw new Error("memberSlug is required");

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "CONDITION_DEEP_RESEARCH");

  const language = (args.language ?? undefined)?.trim().toLowerCase() || undefined;

  try {
    const { threadId, runId } = await startGraphRun(
      "condition_deep_research",
      {
        input: {
          user_email: userEmail,
          condition_slug: conditionSlug,
          member_slug: memberSlug,
          job_id: jobId,
          language,
        },
      },
      undefined,
      userEmail,
    );
    await db.setGenerationJobLangGraphIds(jobId, threadId, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateConditionDeepResearch] dispatch error:", message);
    await db.updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message, code: "DISPATCH_FAILED" }),
    });
    return {
      success: false,
      message,
      jobId,
    };
  }

  return {
    success: true,
    message: `Deep research started for '${conditionSlug}' (${memberSlug})`,
    jobId,
  };
};
