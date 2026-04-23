import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const routineAnalysis: NonNullable<QueryResolvers["routineAnalysis"]> = async (
  _parent,
  { id },
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  const row = await db.getRoutineAnalysis(id, userEmail);
  if (!row) return null;
  return { ...row, createdBy: row.userId } as any;
};
