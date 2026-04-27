import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const setMemoryBaseline: NonNullable<MutationResolvers['setMemoryBaseline']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  return db.upsertMemoryBaseline({
    userId: userEmail,
    overallScore: args.input.overallScore ?? null,
    shortTermScore: args.input.shortTermScore ?? null,
    longTermScore: args.input.longTermScore ?? null,
    workingMemoryScore: args.input.workingMemoryScore ?? null,
    recallSpeed: args.input.recallSpeed ?? null,
  });
};
