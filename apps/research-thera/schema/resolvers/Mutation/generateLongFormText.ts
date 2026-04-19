import type { MutationResolvers } from "./../../types.generated";
import { getGoal, getIssue, getContactFeedback, createGenerationJob, updateGenerationJob } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateLongFormText: NonNullable<MutationResolvers['generateLongFormText']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  const userName = ctx.userName;
  if (!userEmail) {
    throw new Error("Authentication required");
  }

  const goalId = args.goalId ?? undefined;
  const issueId = args.issueId ?? undefined;
  const feedbackId = args.feedbackId ?? undefined;
  const journalEntryId = args.journalEntryId ?? undefined;
  const familyMemberId = args.familyMemberId ?? undefined;
  const userContext = args.userContext ?? undefined;

  if (!goalId && !issueId && !feedbackId && !journalEntryId && !familyMemberId && !userContext) {
    throw new Error("At least one of goalId, issueId, feedbackId, journalEntryId, familyMemberId, or userContext is required");
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

  const isRo = await isRoGoal({ userEmail, goalId, issueId, journalEntryId, familyMemberId });
  const resolvedLanguage = isRo ? "Romanian" : (args.language ?? "English");

  // Fire-and-forget — update the job when done
  runGraphAndWait("story", {
    input: {
      goal_id: goalId ?? null,
      issue_id: issueId ?? null,
      feedback_id: feedbackId ?? null,
      journal_entry_id: journalEntryId ?? null,
      family_member_id: familyMemberId ?? null,
      user_context: userContext ?? null,
      language: resolvedLanguage,
      minutes: args.minutes ?? 10,
      user_email: userEmail,
      user_name: userName ?? null,
    },
  }).then(async (r) => {
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
