import type { MutationResolvers } from "./../../types.generated";
import { getGoal, getIssue, getContactFeedback } from "@/src/db";
import { Client } from "@langchain/langgraph-sdk";

const LANGGRAPH_URL = process.env.LANGGRAPH_URL || "http://127.0.0.1:2024";

export const generateLongFormText: NonNullable<MutationResolvers['generateLongFormText']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const feedbackId = args.feedbackId ?? undefined;

  if (!goalId && !issueId && !feedbackId) {
    throw new Error("At least one of goalId, issueId, or feedbackId is required");
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

  const client = new Client({ apiUrl: LANGGRAPH_URL });

  const result = await client.runs.wait(null, "story", {
    input: {
      goal_id: goalId ?? null,
      issue_id: issueId ?? null,
      feedback_id: feedbackId ?? null,
      language: args.language ?? "English",
      minutes: args.minutes ?? 10,
    },
  }) as Record<string, unknown>;

  const error = result?.error as string | undefined;
  if (error) throw new Error(`Story generation failed: ${error}`);

  const text = result?.story_text as string | undefined;
  const storyId = result?.story_id as number | undefined;
  const evals = result?.evals as string | undefined;

  return {
    success: true,
    message: "Story generated successfully",
    storyId: storyId ?? null,
    text: text ?? null,
    evals: evals ?? null,
  };
};
