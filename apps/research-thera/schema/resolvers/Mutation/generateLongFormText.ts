import type { MutationResolvers } from "./../../types.generated";
import { d1Tools } from "@/src/db";

const STORY_SERVICE_URL = process.env.STORY_SERVICE_URL ?? "http://localhost:8001";

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

  // Verify the goal exists and belongs to the user
  if (goalId) {
    await d1Tools.getGoal(goalId, userEmail);
  }

  // Verify feedback exists and belongs to user
  if (feedbackId) {
    const fb = await d1Tools.getContactFeedback(feedbackId, userEmail);
    if (!fb) {
      throw new Error("Feedback not found");
    }
  }

  const resp = await fetch(`${STORY_SERVICE_URL}/generate-story`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goal_id: goalId ?? null,
      issue_id: issueId ?? null,
      feedback_id: feedbackId ?? null,
      user_email: userEmail,
      language: args.language ?? "English",
      minutes: args.minutes ?? 10,
    }),
  });
  if (!resp.ok) throw new Error(`Story service error: ${resp.status}`);
  const { story_id: storyId, text } = await resp.json();

  return {
    success: true,
    message: "Story generated successfully",
    storyId,
    text,
  };
};
