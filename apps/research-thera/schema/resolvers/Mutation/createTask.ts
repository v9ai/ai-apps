import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const createTask: NonNullable<MutationResolvers['createTask']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const { input } = args;
  const row = await db.createTask({
    userId: userEmail,
    title: input.title,
    description: input.description ?? null,
    status: input.status ?? undefined,
    priorityManual: input.priorityManual ?? null,
    dueDate: input.dueDate ?? null,
    estimatedMinutes: input.estimatedMinutes ?? null,
    energyPreference: input.energyPreference ?? null,
    parentTaskId: input.parentTaskId ?? null,
  });
  return row as any;
};
