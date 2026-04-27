import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { startGraphRun } from "@/src/lib/langgraph-client";

function normalizeSlug(raw: string): string {
  // Mirror app/medications/[slug]/page.tsx slugify: first word, lowercased.
  const match = raw.trim().toLowerCase().match(/^[a-z0-9]+/);
  return match ? match[0] : "";
}

export const generateMedicationDeepResearch: NonNullable<
  MutationResolvers["generateMedicationDeepResearch"]
> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const slug = normalizeSlug(args.slug || "");
  if (!slug) {
    throw new Error("slug is required");
  }

  await db.cleanupStaleJobs(15);

  const jobId = crypto.randomUUID();
  await db.createGenerationJob(jobId, userEmail, "MEDICATION_DEEP_RESEARCH");

  try {
    const { threadId, runId } = await startGraphRun(
      "medication_deep_research",
      {
        input: {
          user_email: userEmail,
          slug,
          job_id: jobId,
        },
      },
      undefined,
      userEmail,
    );
    await db.setGenerationJobLangGraphIds(jobId, threadId, runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "LangGraph dispatch failed";
    console.error("[generateMedicationDeepResearch] dispatch error:", message);
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
    message: `Deep research started for '${slug}'`,
    jobId,
  };
};
