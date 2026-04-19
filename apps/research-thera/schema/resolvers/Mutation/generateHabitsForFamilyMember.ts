import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { urlForGraph } from "@/src/lib/langgraph-client";
import { isRoGoal } from "@/src/lib/ro";

export const generateHabitsForFamilyMember: NonNullable<MutationResolvers['generateHabitsForFamilyMember']> = async (_parent, args, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const { familyMemberId, count = 5 } = args;

  const isRo = await isRoGoal({ familyMemberId });

  const response = await fetch(`${urlForGraph("habits")}/runs/wait`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(180_000),
    body: JSON.stringify({
      assistant_id: "habits",
      input: {
        family_member_id: familyMemberId,
        user_email: userEmail,
        count,
        language: isRo ? "ro" : "en",
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LangGraph habits failed (${response.status}): ${text}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  // Fetch the newly created habits for this family member
  const habits = await db.listHabits(userEmail, "active", familyMemberId);
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
    message: `Generated ${result.habits?.length ?? 0} habits for family member`,
    count: result.habits?.length ?? habitsWithLogs.length,
    habits: habitsWithLogs,
  };
};
