import type { QueryResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const routineAnalyses: NonNullable<QueryResolvers['routineAnalyses']> = async (
  _parent,
  { familyMemberId },
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");
  await db.assertOwnsFamilyMember(familyMemberId, userEmail);
  const rows = await db.getRoutineAnalysesByFamilyMember(familyMemberId, userEmail);
  return rows.map((r) => ({ ...r, createdBy: r.userId })) as any;
};
