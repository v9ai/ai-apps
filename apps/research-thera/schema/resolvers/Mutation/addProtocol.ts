import type { MutationResolvers } from "./../../types.generated";
import { db } from "@/src/db";

export const addProtocol: NonNullable<MutationResolvers['addProtocol']> = async (
  _parent,
  args,
  ctx,
) => {
  const userEmail = ctx.userEmail;
  if (!userEmail) throw new Error("Authentication required");

  const name = args.input.name.trim();
  if (!name) throw new Error("Protocol name is required");

  return db.createProtocol({
    userId: userEmail,
    name,
    notes: args.input.notes?.trim() || null,
    targetAreas: args.input.targetAreas ?? [],
    startDate: args.input.startDate || null,
  });
};
