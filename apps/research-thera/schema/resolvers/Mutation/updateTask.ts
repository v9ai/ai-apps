import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";
import { evaluateStreak } from "@/src/lib/algorithms/streaks";

export const updateTask: NonNullable<MutationResolvers['updateTask']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const { id, input } = args;

  const before = await db.getTask(id, userEmail);
  if (!before) throw new Error("Task not found");

  const row = await db.updateTask(id, userEmail, {
    title: input.title ?? undefined,
    description: input.description ?? undefined,
    status: input.status ?? undefined,
    priorityManual: input.priorityManual ?? undefined,
    priorityScore: input.priorityScore ?? undefined,
    dueDate: input.dueDate ?? undefined,
    estimatedMinutes: input.estimatedMinutes ?? undefined,
    actualMinutes: input.actualMinutes ?? undefined,
    energyPreference: input.energyPreference ?? undefined,
    position: input.position ?? undefined,
    completedAt: input.completedAt ?? undefined,
  });
  if (!row) throw new Error("Task not found");

  // Update streak if this update transitioned the task into "completed"
  if (before.status !== "completed" && row.status === "completed") {
    const streak = await db.getUserStreak(userEmail);
    if (streak.streakOptIn) {
      const evaluated = evaluateStreak(
        {
          currentStreak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          lastCompletedDate: streak.lastCompletedDate
            ? new Date(streak.lastCompletedDate)
            : null,
          freezeAvailable: streak.freezeAvailable,
        },
        new Date(),
      );
      await db.persistStreak(userEmail, {
        currentStreak: evaluated.currentStreak,
        longestStreak: evaluated.longestStreak,
        lastCompletedDate:
          evaluated.lastCompletedDate?.toISOString() ?? null,
        freezeAvailable: evaluated.freezeAvailable,
        streakOptIn: streak.streakOptIn,
      });
    }
  }

  return row as any;
};
