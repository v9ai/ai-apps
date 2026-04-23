import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const deleteRoutineAnalysis: NonNullable<MutationResolvers['deleteRoutineAnalysis']> = async (_parent, { id }, ctx) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const existing = await db.getRoutineAnalysis(id, userEmail);
  if (!existing) {
    return { success: false, message: "Routine analysis not found" };
  }

  await db.deleteRoutineAnalysis(id, userEmail);
  return { success: true, message: null };
};
