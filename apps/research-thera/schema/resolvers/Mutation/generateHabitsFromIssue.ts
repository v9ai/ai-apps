import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { runGraphAndWait } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateHabitsFromIssue: NonNullable<MutationResolvers['generateHabitsFromIssue']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { issueId, count = 3 } = args;

  const issue = await db.getIssue(issueId, userEmail);
  if (!issue) throw new Error("Issue not found");

  const isRo = await isRoGoal({ userEmail, issueId, familyMemberId: issue.familyMemberId });

  const result = (await runGraphAndWait("habits", {
    input: {
      family_member_id: issue.familyMemberId,
      user_email: userEmail,
      count,
      issue_id: issueId,
      language: isRo ? "ro" : "en",
    },
  })) as { error?: string; habits?: unknown[] };

  if (result.error) {
    throw new Error(result.error);
  }

  const habits = await db.listHabits(userEmail, "active", issue.familyMemberId);
  const today = new Date().toISOString().slice(0, 10);
  const habitsWithLogs = await Promise.all(
    habits.map(async (h) => {
      const todayLog = await db.getTodayLogForHabit(h.id, userEmail, today);
      return {
        ...h,
        frequency: h.frequency.toUpperCase() as any,
        status: h.status.toUpperCase() as any,
        logs: [],
        todayLog: todayLog ?? null,
      };
    }),
  );

  return {
    success: true,
    message: `Generated ${result.habits?.length ?? 0} habits from issue "${issue.title}"`,
    count: result.habits?.length ?? habitsWithLogs.length,
    habits: habitsWithLogs,
  };
};
