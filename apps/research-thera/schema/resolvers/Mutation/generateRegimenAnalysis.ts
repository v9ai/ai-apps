import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";

const ALLOWED_SLUGS = new Set(["me", "bogdan"]);

export const generateRegimenAnalysis: NonNullable<MutationResolvers['generateRegimenAnalysis']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const slug = (args.slug || "").trim().toLowerCase();
  if (!ALLOWED_SLUGS.has(slug)) {
    throw new Error("slug must be 'me' or 'bogdan'");
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "REGIMEN_INTERACTION_SCREEN");

  const language = (args.language ?? undefined)?.trim().toLowerCase() || undefined;

  try {
    const { threadId, runId } = await startGraphRun(
      "me_regimen",
      {
        input: {
          user_email: userEmail,
          slug,
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
    console.error("[generateRegimenAnalysis] dispatch error:", message);
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
    message: `Regimen analysis started for '${slug}'`,
    jobId,
  };
};
