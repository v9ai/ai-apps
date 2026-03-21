import type { MutationResolvers } from "./../../types.generated";
import { getGoal, getIssue, getContactFeedback, createGenerationJob, updateGenerationJob } from "@/src/db";
import { Client } from "@langchain/langgraph-sdk";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:2024";

export const generateLongFormText: NonNullable<MutationResolvers['generateLongFormText']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  const userName = ctx.userName;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const feedbackId = args.feedbackId ?? undefined;
  const familyMemberId = args.familyMemberId ?? undefined;
  const userContext = args.userContext ?? undefined;

  if (!goalId && !issueId && !feedbackId && !familyMemberId && !userContext) {
    throw new Error("At least one of goalId, issueId, feedbackId, familyMemberId, or userContext is required");
  }

  if (goalId) {
    await getGoal(goalId, userEmail);
  }
  if (issueId) {
    const issue = await getIssue(issueId, userEmail);
    if (!issue) throw new Error("Issue not found");
  }
  if (feedbackId) {
    const fb = await getContactFeedback(feedbackId, userEmail);
    if (!fb) throw new Error("Feedback not found");
  }

  const jobId = crypto.randomUUID();
  await createGenerationJob(jobId, userEmail, "LONGFORM", goalId ?? null);

  const client = new Client({ apiUrl: LANGGRAPH_URL });

  // Fire-and-forget — update the job when done
  client.runs.wait(null, "story", {
    input: {
      goal_id: goalId ?? null,
      issue_id: issueId ?? null,
      feedback_id: feedbackId ?? null,
      family_member_id: familyMemberId ?? null,
      user_context: userContext ?? null,
      language: args.language ?? "English",
      minutes: args.minutes ?? 10,
      user_email: userEmail,
      user_name: userName ?? null,
    },
  }).then(async (result) => {
    const r = result as Record<string, unknown>;
    const storyId = r?.story_id as number | undefined;
    const text = r?.story_text as string | undefined;
    const evals = r?.evals as string | undefined;
    await updateGenerationJob(jobId, {
      status: "SUCCEEDED",
      progress: 100,
      storyId,
      result: JSON.stringify({ storyId, text, evals }),
    });
  }).catch(async (err) => {
    const message = err instanceof Error ? err.message : "Story generation failed";
    await updateGenerationJob(jobId, {
      status: "FAILED",
      error: JSON.stringify({ message }),
    });
  });

  return {
    success: true,
    message: "Story generation started",
    jobId,
  };
};
