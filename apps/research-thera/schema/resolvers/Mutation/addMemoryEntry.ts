import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addMemoryEntry: NonNullable<MutationResolvers['addMemoryEntry']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  return db.createMemoryEntry({
    userId: userEmail,
    category: args.input.category.trim() || "observation",
    description: args.input.description?.trim() || null,
    context: args.input.context?.trim() || null,
    protocolId: args.input.protocolId || null,
    overallScore: args.input.overallScore ?? null,
    shortTermScore: args.input.shortTermScore ?? null,
    longTermScore: args.input.longTermScore ?? null,
    workingMemoryScore: args.input.workingMemoryScore ?? null,
    recallSpeed: args.input.recallSpeed ?? null,
  });
};
