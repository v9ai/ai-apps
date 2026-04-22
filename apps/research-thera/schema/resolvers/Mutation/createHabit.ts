import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const createHabit: NonNullable<MutationResolvers['createHabit']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  // Cross-user write guard: if a family member is referenced, caller must own it.
  const userId = ctx.userId;
  if (!userId) throw new Error("Authentication required");
  if (args.input.familyMemberId != null) {
    await db.assertOwnsFamilyMember(args.input.familyMemberId, userId);
  }

  const { input } = args;
  const id = await db.createHabit({
    userId: userEmail,
    goalId: input.goalId ?? null,
    familyMemberId: input.familyMemberId ?? null,
    title: input.title,
    description: input.description ?? null,
    frequency: input.frequency?.toLowerCase() ?? "daily",
    targetCount: input.targetCount ?? 1,
  });

  const habit = await db.getHabit(id, userEmail);
  if (!habit) throw new Error("Habit not found after creation");

  return {
    ...habit,
    frequency: habit.frequency.toUpperCase() as any,
    status: habit.status.toUpperCase() as any,
    logs: [],
    todayLog: null,
  };
};
